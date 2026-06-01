import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";

function nowIso() {
  return new Date().toISOString();
}

function addDays(iso, days) {
  const base = new Date(iso);
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

function normalizeClozeExtraData(extraData = {}) {
  const templateText = String(extraData.templateText || "").trim();
  const answers = [...templateText.matchAll(/\{\{(.*?)\}\}/g)]
    .map((match) => String(match[1] || "").trim())
    .filter(Boolean);

  return {
    templateText,
    answers
  };
}

function normalizeImageOcclusionExtraData(extraData = {}) {
  const imageDataUrl = String(extraData.imageDataUrl || "").trim();
  const masks = Array.isArray(extraData.masks)
    ? extraData.masks
        .map((mask, index) => ({
          id: String(mask?.id || `mask-${index + 1}`),
          x: Number(mask?.x || 0),
          y: Number(mask?.y || 0),
          width: Number(mask?.width || 0),
          height: Number(mask?.height || 0),
          label: String(mask?.label || "").trim()
        }))
        .filter((mask) => mask.width > 0 && mask.height > 0)
    : [];

  return {
    imageDataUrl,
    masks
  };
}

function normalizeExtraData(cardType, extraData = {}) {
  if (cardType === "cloze") {
    return normalizeClozeExtraData(extraData);
  }

  if (cardType === "image_occlusion") {
    return normalizeImageOcclusionExtraData(extraData);
  }

  return {};
}

function mapFlashcard(row) {
  return {
    id: row.id,
    studySetId: row.study_set_id,
    cardType: row.card_type,
    frontText: row.front_text,
    backText: row.back_text,
    extraData: JSON.parse(row.extra_data_json || "{}"),
    tags: JSON.parse(row.tags_json || "[]"),
    status: row.status,
    dueAt: row.due_at,
    intervalDays: Number(row.interval_days || 0),
    easeFactor: Number(row.ease_factor || 2.5),
    consecutiveCorrect: Number(row.consecutive_correct || 0),
    reviewCount: Number(row.review_count || 0),
    lapseCount: Number(row.lapse_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertStudySetExists(studySetId) {
  const db = getDb();
  const found = db.prepare("SELECT 1 FROM study_sets WHERE id = ?").get(studySetId);
  if (!found) {
    const error = new Error("Study set not found.");
    error.statusCode = 404;
    throw error;
  }
}

function getFlashcardRowById(cardId) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM flashcards WHERE id = ?").get(cardId);
  if (!row) {
    const error = new Error("Flashcard not found.");
    error.statusCode = 404;
    throw error;
  }
  return row;
}

function computeSm2NextState(card, quality) {
  const prevInterval = Number(card.interval_days || 0);
  const prevEase = Number(card.ease_factor || 2.5);
  const prevConsecutive = Number(card.consecutive_correct || 0);
  const prevReviewCount = Number(card.review_count || 0);
  const prevLapseCount = Number(card.lapse_count || 0);

  const q = Math.min(5, Math.max(1, Number(quality || 0)));
  let nextEase = prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  nextEase = Math.max(1.3, Number(nextEase.toFixed(2)));

  let nextInterval = 1;
  let nextConsecutive = prevConsecutive;
  let nextLapseCount = prevLapseCount;

  if (q < 3) {
    nextConsecutive = 0;
    nextInterval = 1;
    nextLapseCount += 1;
  } else {
    nextConsecutive += 1;
    if (nextConsecutive === 1) {
      nextInterval = 1;
    } else if (nextConsecutive === 2) {
      nextInterval = 6;
    } else {
      nextInterval = Math.max(1, Math.round(prevInterval * nextEase));
    }
  }

  const nextReviewCount = prevReviewCount + 1;
  const updatedAt = nowIso();
  const nextDueAt = addDays(updatedAt, nextInterval);

  let nextStatus = "learning";
  if (nextConsecutive === 0) {
    nextStatus = "learning";
  } else if (nextConsecutive >= 8) {
    nextStatus = "mastered";
  } else if (nextConsecutive >= 3) {
    nextStatus = "review";
  }

  return {
    quality: q,
    nextEase,
    nextInterval,
    nextConsecutive,
    nextLapseCount,
    nextReviewCount,
    nextDueAt,
    nextStatus,
    updatedAt
  };
}

function buildFlashcardPersistencePayload(studySetId, payload, existingRow = null) {
  const cardType = payload.cardType || existingRow?.card_type || "standard";
  const normalizedExtraData = normalizeExtraData(cardType, payload.extraData || {});
  const now = nowIso();

  return {
    id: existingRow?.id || createId("card"),
    study_set_id: studySetId,
    card_type: cardType,
    front_text: payload.frontText,
    back_text: payload.backText,
    extra_data_json: JSON.stringify(normalizedExtraData),
    tags_json: JSON.stringify(payload.tags || []),
    status: existingRow?.status || "new",
    due_at: existingRow?.due_at || now,
    interval_days: Number(existingRow?.interval_days || 0),
    ease_factor: Number(existingRow?.ease_factor || 2.5),
    consecutive_correct: Number(existingRow?.consecutive_correct || 0),
    review_count: Number(existingRow?.review_count || 0),
    lapse_count: Number(existingRow?.lapse_count || 0),
    created_at: existingRow?.created_at || now,
    updated_at: now
  };
}

export function listFlashcardsByStudySet(studySetId, options = {}) {
  assertStudySetExists(studySetId);
  const db = getDb();

  let rows = db
    .prepare(
      `SELECT *
       FROM flashcards
       WHERE study_set_id = ?
       ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`
    )
    .all(studySetId);

  const status = String(options.status || "").trim().toLowerCase();
  const tag = String(options.tag || "").trim().toLowerCase();
  const dueOnly = String(options.dueOnly || "").trim().toLowerCase();
  const limit = Number(options.limit || 0);
  const dueOnlyEnabled = dueOnly === "1" || dueOnly === "true";
  const now = Date.now();

  if (dueOnlyEnabled) {
    rows = rows.filter((row) => new Date(row.due_at).getTime() <= now);
  }

  if (status) {
    rows = rows.filter((row) => String(row.status || "").toLowerCase() === status);
  }

  if (tag) {
    rows = rows.filter((row) => {
      const tags = JSON.parse(row.tags_json || "[]");
      return tags.some((item) => String(item || "").toLowerCase() === tag);
    });
  }

  if (Number.isFinite(limit) && limit > 0) {
    rows = rows.slice(0, limit);
  }

  return rows.map(mapFlashcard);
}

export function listDueFlashcards(options = {}) {
  const db = getDb();
  const now = nowIso();
  const limit = Math.max(1, Math.min(500, Number(options.limit || 100)));
  const rows = db
    .prepare(
      `SELECT *
       FROM flashcards
       WHERE datetime(due_at) <= datetime(?)
       ORDER BY datetime(due_at) ASC
       LIMIT ?`
    )
    .all(now, limit);
  return rows.map(mapFlashcard);
}

export function createFlashcard(studySetId, payload) {
  assertStudySetExists(studySetId);
  const db = getDb();
  const row = buildFlashcardPersistencePayload(studySetId, payload);

  db.prepare(
    `INSERT INTO flashcards (
      id, study_set_id, card_type, front_text, back_text, extra_data_json, tags_json, status, due_at,
      interval_days, ease_factor, consecutive_correct, review_count, lapse_count, created_at, updated_at
    ) VALUES (
      @id, @study_set_id, @card_type, @front_text, @back_text, @extra_data_json, @tags_json, @status, @due_at,
      @interval_days, @ease_factor, @consecutive_correct, @review_count, @lapse_count, @created_at, @updated_at
    )`
  ).run(row);

  return mapFlashcard(row);
}

export function updateFlashcard(cardId, payload) {
  const db = getDb();
  const existing = getFlashcardRowById(cardId);
  const row = buildFlashcardPersistencePayload(existing.study_set_id, payload, existing);

  db.prepare(
    `UPDATE flashcards
     SET card_type = @card_type,
         front_text = @front_text,
         back_text = @back_text,
         extra_data_json = @extra_data_json,
         tags_json = @tags_json,
         updated_at = @updated_at
     WHERE id = @id`
  ).run(row);

  return mapFlashcard(getFlashcardRowById(cardId));
}

export function deleteFlashcard(cardId) {
  const db = getDb();
  getFlashcardRowById(cardId);
  db.prepare("DELETE FROM flashcard_reviews WHERE flashcard_id = ?").run(cardId);
  db.prepare("DELETE FROM flashcards WHERE id = ?").run(cardId);
  return { id: cardId };
}

export function reviewFlashcard(cardId, payload) {
  const db = getDb();
  const card = getFlashcardRowById(cardId);
  const next = computeSm2NextState(card, payload.quality);

  db.prepare(
    `UPDATE flashcards
     SET status = @status,
         due_at = @due_at,
         interval_days = @interval_days,
         ease_factor = @ease_factor,
         consecutive_correct = @consecutive_correct,
         review_count = @review_count,
         lapse_count = @lapse_count,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id: cardId,
    status: next.nextStatus,
    due_at: next.nextDueAt,
    interval_days: next.nextInterval,
    ease_factor: next.nextEase,
    consecutive_correct: next.nextConsecutive,
    review_count: next.nextReviewCount,
    lapse_count: next.nextLapseCount,
    updated_at: next.updatedAt
  });

  const reviewRow = {
    id: createId("review"),
    flashcard_id: cardId,
    quality: next.quality,
    previous_due_at: card.due_at,
    next_due_at: next.nextDueAt,
    previous_interval_days: Number(card.interval_days || 0),
    next_interval_days: next.nextInterval,
    previous_ease_factor: Number(card.ease_factor || 2.5),
    next_ease_factor: next.nextEase,
    reviewed_at: next.updatedAt
  };

  db.prepare(
    `INSERT INTO flashcard_reviews (
      id, flashcard_id, quality, previous_due_at, next_due_at,
      previous_interval_days, next_interval_days, previous_ease_factor, next_ease_factor, reviewed_at
    ) VALUES (
      @id, @flashcard_id, @quality, @previous_due_at, @next_due_at,
      @previous_interval_days, @next_interval_days, @previous_ease_factor, @next_ease_factor, @reviewed_at
    )`
  ).run(reviewRow);

  return {
    flashcard: mapFlashcard(getFlashcardRowById(cardId)),
    review: {
      id: reviewRow.id,
      quality: reviewRow.quality,
      reviewedAt: reviewRow.reviewed_at,
      nextDueAt: reviewRow.next_due_at,
      nextIntervalDays: reviewRow.next_interval_days,
      nextEaseFactor: reviewRow.next_ease_factor
    }
  };
}
