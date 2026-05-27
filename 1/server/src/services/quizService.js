import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";

const ALLOWED_QUESTION_TYPES = ["mcq", "true_false", "fill_blank"];

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function assertStudySetExists(studySetId) {
  const db = getDb();
  const row = db.prepare("SELECT id, title FROM study_sets WHERE id = ?").get(studySetId);
  if (!row) {
    const error = new Error("Study set not found.");
    error.statusCode = 404;
    throw error;
  }
  return row;
}

function getQuizRowById(quizId) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(quizId);
  if (!row) {
    const error = new Error("Quiz not found.");
    error.statusCode = 404;
    throw error;
  }
  return row;
}

function listFlashcardRowsByStudySet(studySetId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT *
       FROM flashcards
       WHERE study_set_id = ?
       ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`
    )
    .all(studySetId);
}

function listQuestionRowsByQuizId(quizId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT *
       FROM quiz_questions
       WHERE quiz_id = ?
       ORDER BY sort_order ASC, datetime(created_at) ASC`
    )
    .all(quizId);
}

function listAttemptRowsByQuizId(quizId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT *
       FROM quiz_attempts
       WHERE quiz_id = ?
       ORDER BY datetime(submitted_at) DESC`
    )
    .all(quizId);
}

function mapQuizQuestion(row, options = {}) {
  const question = {
    id: row.id,
    quizId: row.quiz_id,
    sortOrder: Number(row.sort_order || 0),
    questionType: row.question_type,
    promptText: row.prompt_text,
    options: parseJson(row.options_json || "[]", []),
    asset: parseJson(row.asset_json || "{}", {}),
    explanationText: row.explanation_text || "",
    sourceFlashcardId: row.source_flashcard_id || "",
    createdAt: row.created_at
  };

  if (options.includeCorrectAnswer) {
    question.correctAnswer = parseJson(row.correct_answer_json || "{}", {});
  }

  return question;
}

function mapQuizSummary(row) {
  const db = getDb();
  const attemptCountRow = db.prepare("SELECT COUNT(*) AS count FROM quiz_attempts WHERE quiz_id = ?").get(row.id);
  return {
    id: row.id,
    studySetId: row.study_set_id,
    title: row.title,
    questionCount: Number(row.question_count || 0),
    questionTypes: parseJson(row.question_types_json || "[]", []),
    attemptCount: Number(attemptCountRow?.count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapQuizAttempt(row) {
  return {
    id: row.id,
    quizId: row.quiz_id,
    answers: parseJson(row.answers_json || "[]", []),
    results: parseJson(row.results_json || "[]", []),
    score: Number(row.score || 0),
    correctCount: Number(row.correct_count || 0),
    totalCount: Number(row.total_count || 0),
    submittedAt: row.submitted_at
  };
}

function getQuizWithQuestions(quizId, options = {}) {
  const quizRow = getQuizRowById(quizId);
  return {
    ...mapQuizSummary(quizRow),
    questions: listQuestionRowsByQuizId(quizId).map((row) => mapQuizQuestion(row, options))
  };
}

function normalizeQuestionTypes(questionTypes) {
  const normalized = Array.isArray(questionTypes)
    ? questionTypes
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item) => ALLOWED_QUESTION_TYPES.includes(item))
    : [];

  return normalized.length ? [...new Set(normalized)] : [...ALLOWED_QUESTION_TYPES];
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseFlashcardExtraData(row) {
  return parseJson(row.extra_data_json || "{}", {});
}

function buildQuestionAsset(row) {
  if (row.card_type !== "image_occlusion") {
    return {};
  }

  const extraData = parseFlashcardExtraData(row);
  return {
    type: "image_occlusion",
    imageDataUrl: String(extraData.imageDataUrl || "").trim(),
    masks: Array.isArray(extraData.masks) ? extraData.masks : []
  };
}

function extractPrimaryAnswers(row) {
  if (row.card_type === "cloze") {
    const extraData = parseFlashcardExtraData(row);
    const answers = Array.isArray(extraData.answers)
      ? extraData.answers.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    if (answers.length) {
      return answers;
    }
  }

  const answer = String(row.back_text || "").trim();
  return answer ? [answer] : [];
}

function extractPrimaryAnswer(row) {
  return extractPrimaryAnswers(row)[0] || "";
}

function buildPromptBase(row) {
  if (row.card_type === "cloze") {
    const extraData = parseFlashcardExtraData(row);
    const templateText = String(extraData.templateText || "").trim();
    if (templateText) {
      return templateText.replace(/\{\{(.*?)\}\}/g, "____");
    }
  }

  const frontText = String(row.front_text || "").trim();
  if (frontText) {
    return frontText;
  }

  return "Review the learning point and choose the best answer.";
}

function buildOptions(optionTexts) {
  return optionTexts.map((text, index) => ({
    id: `option-${index + 1}`,
    text
  }));
}

function buildMcqQuestion(row, allRows, index) {
  const correctText = extractPrimaryAnswer(row);
  if (!correctText) {
    return null;
  }

  const distractors = [...new Set(allRows.flatMap(extractPrimaryAnswers))]
    .filter((item) => normalizeText(item) && normalizeText(item) !== normalizeText(correctText))
    .slice(0, 3);

  if (distractors.length < 2) {
    return null;
  }

  const optionTexts = [correctText, ...distractors];
  const rotated = optionTexts.map((_, offset) => optionTexts[(offset + index) % optionTexts.length]);
  const options = buildOptions(rotated);
  const correctOption = options.find((item) => normalizeText(item.text) === normalizeText(correctText));

  return {
    id: createId("quizq"),
    sortOrder: index + 1,
    questionType: "mcq",
    promptText: `选择正确答案：${buildPromptBase(row)}`,
    options,
    asset: buildQuestionAsset(row),
    correctAnswer: {
      optionId: correctOption?.id || "option-1",
      text: correctText
    },
    explanationText: `正确答案：${correctText}`,
    sourceFlashcardId: row.id
  };
}

function buildTrueFalseQuestion(row, allRows, index) {
  const correctText = extractPrimaryAnswer(row);
  if (!correctText) {
    return null;
  }

  const distractor = [...new Set(allRows.flatMap(extractPrimaryAnswers))].find(
    (item) => normalizeText(item) && normalizeText(item) !== normalizeText(correctText)
  );
  const shouldBeTrue = index % 2 === 0 || !distractor;
  const statementText = shouldBeTrue ? correctText : distractor;

  return {
    id: createId("quizq"),
    sortOrder: index + 1,
    questionType: "true_false",
    promptText: `${buildPromptBase(row)}\n判断：答案是“${statementText}”。`,
    options: [
      { id: "true", text: "正确" },
      { id: "false", text: "错误" }
    ],
    asset: buildQuestionAsset(row),
    correctAnswer: {
      value: shouldBeTrue,
      text: shouldBeTrue ? "正确" : "错误"
    },
    explanationText: `正确答案：${correctText}`,
    sourceFlashcardId: row.id
  };
}

function buildFillBlankQuestion(row, index) {
  const answers = extractPrimaryAnswers(row);
  if (!answers.length) {
    return null;
  }

  return {
    id: createId("quizq"),
    sortOrder: index + 1,
    questionType: "fill_blank",
    promptText: `填写答案：${buildPromptBase(row)}`,
    options: [],
    asset: buildQuestionAsset(row),
    correctAnswer: {
      answers
    },
    explanationText: `参考答案：${answers.join(" / ")}`,
    sourceFlashcardId: row.id
  };
}

function buildQuestionByType(questionType, row, allRows, index) {
  if (questionType === "mcq") {
    return buildMcqQuestion(row, allRows, index);
  }
  if (questionType === "true_false") {
    return buildTrueFalseQuestion(row, allRows, index);
  }
  if (questionType === "fill_blank") {
    return buildFillBlankQuestion(row, index);
  }
  return null;
}

function generateQuestions(rows, questionCount, questionTypes) {
  const maxCount = Math.min(Math.max(1, Number(questionCount || 0)), rows.length);
  const questions = [];
  let cursor = 0;
  let attempts = 0;
  const maxAttempts = rows.length * questionTypes.length * 2;

  while (questions.length < maxCount && attempts < maxAttempts) {
    const row = rows[cursor % rows.length];
    const preferredType = questionTypes[questions.length % questionTypes.length];
    const candidateTypes = [preferredType, ...questionTypes.filter((item) => item !== preferredType)];
    const question = candidateTypes
      .map((type) => buildQuestionByType(type, row, rows, questions.length))
      .find(Boolean);

    if (question) {
      questions.push(question);
    }

    cursor += 1;
    attempts += 1;
  }

  if (!questions.length) {
    const error = new Error("Not enough flashcard content to generate quiz questions.");
    error.statusCode = 400;
    throw error;
  }

  return questions;
}

function serializeQuestionForInsert(quizId, question, createdAt) {
  return {
    id: question.id,
    quiz_id: quizId,
    sort_order: question.sortOrder,
    question_type: question.questionType,
    prompt_text: question.promptText,
    options_json: JSON.stringify(question.options || []),
    asset_json: JSON.stringify(question.asset || {}),
    correct_answer_json: JSON.stringify(question.correctAnswer || {}),
    explanation_text: question.explanationText || "",
    source_flashcard_id: question.sourceFlashcardId || "",
    created_at: createdAt
  };
}

function cloneQuizQuestions(targetQuizId, questionRows, createdAt) {
  const db = getDb();
  const insertQuestion = db.prepare(
    `INSERT INTO quiz_questions (
      id, quiz_id, sort_order, question_type, prompt_text, options_json,
      asset_json, correct_answer_json, explanation_text, source_flashcard_id, created_at
    ) VALUES (
      @id, @quiz_id, @sort_order, @question_type, @prompt_text, @options_json,
      @asset_json, @correct_answer_json, @explanation_text, @source_flashcard_id, @created_at
    )`
  );

  questionRows.forEach((row, index) => {
    insertQuestion.run({
      id: createId("quizq"),
      quiz_id: targetQuizId,
      sort_order: index + 1,
      question_type: row.question_type,
      prompt_text: row.prompt_text,
      options_json: row.options_json,
      asset_json: row.asset_json || "{}",
      correct_answer_json: row.correct_answer_json,
      explanation_text: row.explanation_text || "",
      source_flashcard_id: row.source_flashcard_id || "",
      created_at: createdAt
    });
  });
}

function getAnswerMap(answers) {
  return new Map(
    (Array.isArray(answers) ? answers : []).map((item) => [
      String(item?.questionId || ""),
      item?.answer || {}
    ])
  );
}

function evaluateQuestion(questionRow, userAnswer) {
  const correctAnswer = parseJson(questionRow.correct_answer_json || "{}", {});
  let isCorrect = false;

  if (questionRow.question_type === "mcq") {
    isCorrect = String(userAnswer?.optionId || "") === String(correctAnswer.optionId || "");
  } else if (questionRow.question_type === "true_false") {
    isCorrect = Boolean(userAnswer?.value) === Boolean(correctAnswer.value);
  } else if (questionRow.question_type === "fill_blank") {
    const acceptedAnswers = Array.isArray(correctAnswer.answers)
      ? correctAnswer.answers.map(normalizeText).filter(Boolean)
      : [];
    const normalizedUserAnswer = normalizeText(userAnswer?.text || "");
    isCorrect = acceptedAnswers.includes(normalizedUserAnswer);
  }

  return {
    questionId: questionRow.id,
    questionType: questionRow.question_type,
    promptText: questionRow.prompt_text,
    options: parseJson(questionRow.options_json || "[]", []),
    asset: parseJson(questionRow.asset_json || "{}", {}),
    userAnswer,
    correctAnswer,
    explanationText: questionRow.explanation_text || "",
    isCorrect
  };
}

export function generateQuiz(payload) {
  const db = getDb();
  const studySet = assertStudySetExists(payload.studySetId);
  const rows = listFlashcardRowsByStudySet(payload.studySetId);

  if (!rows.length) {
    const error = new Error("Create at least one flashcard before generating a quiz.");
    error.statusCode = 400;
    throw error;
  }

  const questionTypes = normalizeQuestionTypes(payload.questionTypes);
  const questions = generateQuestions(rows, payload.questionCount, questionTypes);
  const createdAt = nowIso();
  const quizId = createId("quiz");
  const title = String(payload.title || "").trim() || `${studySet.title} 测验 ${createdAt.slice(0, 10)}`;

  db.prepare(
    `INSERT INTO quizzes (
      id, study_set_id, title, question_count, question_types_json, created_at, updated_at
    ) VALUES (
      @id, @study_set_id, @title, @question_count, @question_types_json, @created_at, @updated_at
    )`
  ).run({
    id: quizId,
    study_set_id: payload.studySetId,
    title,
    question_count: questions.length,
    question_types_json: JSON.stringify(questionTypes),
    created_at: createdAt,
    updated_at: createdAt
  });

  const insertQuestion = db.prepare(
    `INSERT INTO quiz_questions (
      id, quiz_id, sort_order, question_type, prompt_text, options_json,
      asset_json, correct_answer_json, explanation_text, source_flashcard_id, created_at
    ) VALUES (
      @id, @quiz_id, @sort_order, @question_type, @prompt_text, @options_json,
      @asset_json, @correct_answer_json, @explanation_text, @source_flashcard_id, @created_at
    )`
  );

  for (const question of questions) {
    insertQuestion.run(serializeQuestionForInsert(quizId, question, createdAt));
  }

  return getQuizWithQuestions(quizId);
}

export function listStudySetQuizzes(studySetId) {
  assertStudySetExists(studySetId);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT *
       FROM quizzes
       WHERE study_set_id = ?
       ORDER BY datetime(created_at) DESC`
    )
    .all(studySetId);

  return rows.map(mapQuizSummary);
}

export function getQuizById(quizId) {
  return getQuizWithQuestions(quizId);
}

export function submitQuizAttempt(quizId, payload) {
  const db = getDb();
  getQuizRowById(quizId);
  const questionRows = listQuestionRowsByQuizId(quizId);
  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const answerMap = getAnswerMap(answers);
  const results = questionRows.map((questionRow) => evaluateQuestion(questionRow, answerMap.get(questionRow.id) || {}));
  const correctCount = results.filter((item) => item.isCorrect).length;
  const totalCount = results.length;
  const score = totalCount ? Number(((correctCount / totalCount) * 100).toFixed(2)) : 0;
  const submittedAt = nowIso();
  const attemptRow = {
    id: createId("attempt"),
    quiz_id: quizId,
    answers_json: JSON.stringify(answers),
    results_json: JSON.stringify(results),
    score,
    correct_count: correctCount,
    total_count: totalCount,
    submitted_at: submittedAt
  };

  db.prepare(
    `INSERT INTO quiz_attempts (
      id, quiz_id, answers_json, results_json, score, correct_count, total_count, submitted_at
    ) VALUES (
      @id, @quiz_id, @answers_json, @results_json, @score, @correct_count, @total_count, @submitted_at
    )`
  ).run(attemptRow);

  db.prepare("UPDATE quizzes SET updated_at = ? WHERE id = ?").run(submittedAt, quizId);

  return mapQuizAttempt(attemptRow);
}

export function listQuizAttempts(quizId) {
  getQuizRowById(quizId);
  return listAttemptRowsByQuizId(quizId).map(mapQuizAttempt);
}

export function retryQuiz(quizId, payload = {}) {
  const db = getDb();
  const quizRow = getQuizRowById(quizId);
  const questionRows = listQuestionRowsByQuizId(quizId);
  const mode = String(payload.mode || "all").trim().toLowerCase();
  let selectedRows = questionRows;

  if (mode === "wrong_only") {
    const latestAttempt = listAttemptRowsByQuizId(quizId)[0];
    if (!latestAttempt) {
      const error = new Error("No previous attempt found for wrong-only retry.");
      error.statusCode = 400;
      throw error;
    }

    const wrongIds = new Set(
      parseJson(latestAttempt.results_json || "[]", [])
        .filter((item) => !item.isCorrect)
        .map((item) => String(item.questionId || ""))
    );
    selectedRows = questionRows.filter((row) => wrongIds.has(row.id));
  }

  if (!selectedRows.length) {
    const error = new Error("No questions available for retry.");
    error.statusCode = 400;
    throw error;
  }

  const createdAt = nowIso();
  const retryId = createId("quiz");
  const suffix = mode === "wrong_only" ? "错题再测" : "重新作答";

  db.prepare(
    `INSERT INTO quizzes (
      id, study_set_id, title, question_count, question_types_json, created_at, updated_at
    ) VALUES (
      @id, @study_set_id, @title, @question_count, @question_types_json, @created_at, @updated_at
    )`
  ).run({
    id: retryId,
    study_set_id: quizRow.study_set_id,
    title: `${quizRow.title} · ${suffix}`,
    question_count: selectedRows.length,
    question_types_json: quizRow.question_types_json,
    created_at: createdAt,
    updated_at: createdAt
  });

  cloneQuizQuestions(retryId, selectedRows, createdAt);
  return getQuizWithQuestions(retryId);
}
