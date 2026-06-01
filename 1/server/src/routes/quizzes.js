import {
  generateQuiz,
  getQuizById,
  listQuizAttempts,
  listStudySetQuizzes,
  retryQuiz,
  submitQuizAttempt
} from "../services/quizService.js";
import {
  arrayField,
  defineObjectSchema,
  optionalNumberField,
  optionalObjectField,
  optionalStringField,
  stringArrayField,
  stringField,
  validateBody,
  validateParams
} from "../utils/schemaValidation.js";

const studySetIdParamsSchema = defineObjectSchema(
  {
    id: stringField("studySetId", { maxLength: 80 })
  },
  "route params"
);

const quizIdParamsSchema = defineObjectSchema(
  {
    id: stringField("quizId", { maxLength: 80 })
  },
  "route params"
);

const generateQuizPayloadSchema = defineObjectSchema(
  {
    studySetId: stringField("studySetId", { maxLength: 80 }),
    title: optionalStringField("title", { maxLength: 160, defaultValue: "" }),
    questionCount: optionalNumberField("questionCount", {
      integer: true,
      min: 1,
      max: 50,
      defaultValue: 10
    }),
    questionTypes: stringArrayField("questionTypes", { maxLength: 10, itemMaxLength: 20 })
  },
  "quiz payload"
);

const answerItemSchema = defineObjectSchema(
  {
    questionId: stringField("questionId", { maxLength: 80 }),
    answer: optionalObjectField("answer", { defaultValue: {} })
  },
  "answer item"
);

const submitAttemptPayloadSchema = defineObjectSchema(
  {
    answers: arrayField("answers", (value) => answerItemSchema(value), { maxLength: 200 })
  },
  "quiz attempt payload"
);

const retryQuizPayloadSchema = defineObjectSchema(
  {
    mode: optionalStringField("mode", { maxLength: 20, defaultValue: "all" })
  },
  "retry quiz payload"
);

export function registerQuizRoutes(app) {
  app.post("/api/quizzes/generate", validateBody(generateQuizPayloadSchema), (req, res) => {
    res.status(201).json(generateQuiz(req.validated.body));
  });

  app.get("/api/quizzes/study-set/:id", validateParams(studySetIdParamsSchema), (req, res) => {
    res.json(listStudySetQuizzes(req.validated.params.id));
  });

  app.get("/api/quizzes/:id", validateParams(quizIdParamsSchema), (req, res) => {
    res.json(getQuizById(req.validated.params.id));
  });

  app.post("/api/quizzes/:id/attempts", validateParams(quizIdParamsSchema), validateBody(submitAttemptPayloadSchema), (req, res) => {
    res.status(201).json(submitQuizAttempt(req.validated.params.id, req.validated.body));
  });

  app.get("/api/quizzes/:id/attempts", validateParams(quizIdParamsSchema), (req, res) => {
    res.json(listQuizAttempts(req.validated.params.id));
  });

  app.post("/api/quizzes/:id/retry", validateParams(quizIdParamsSchema), validateBody(retryQuizPayloadSchema), (req, res) => {
    res.status(201).json(retryQuiz(req.validated.params.id, req.validated.body));
  });
}
