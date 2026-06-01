import { defineStore } from "pinia";
import {
  createStudySetNote as createStudySetNoteApi,
  deleteStudySetNote as deleteStudySetNoteApi,
  fetchAllNotes as fetchAllNotesApi,
  fetchNoteDetail as fetchNoteDetailApi,
  fetchStudySetNotes as fetchStudySetNotesApi,
  generateNote as generateNoteApi,
  updateStudySetNote as updateStudySetNoteApi
} from "@/services/api.js";

function sortNotes(notes) {
  return [...notes].sort((left, right) => {
    if (Boolean(left.isPinned) !== Boolean(right.isPinned)) {
      return left.isPinned ? -1 : 1;
    }

    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });
}

export const useNotesStore = defineStore("notes", {
  state: () => ({
    items: [],
    loading: false,
    detailLoading: false,
    activeNote: null
  }),

  actions: {
    upsertNote(note) {
      const nextItems = this.items.filter((item) => item.id !== note.id);
      nextItems.unshift(note);
      this.items = sortNotes(nextItems);
      if (this.activeNote?.id === note.id) {
        this.activeNote = note;
      }
      return note;
    },

    removeNoteById(noteId) {
      this.items = this.items.filter((item) => item.id !== noteId);
      if (this.activeNote?.id === noteId) {
        this.activeNote = null;
      }
    },

    async fetchAllNotes() {
      this.loading = true;
      try {
        this.items = sortNotes(await fetchAllNotesApi());
      } finally {
        this.loading = false;
      }
      return this.items;
    },

    async fetchStudySetNotes(studySetId) {
      this.loading = true;
      try {
        const notes = sortNotes(await fetchStudySetNotesApi(studySetId));
        const filtered = this.items.filter((item) => item.studySetId !== studySetId);
        this.items = sortNotes([...filtered, ...notes]);
        return notes;
      } finally {
        this.loading = false;
      }
    },

    async fetchNote(noteId) {
      this.detailLoading = true;
      try {
        const note = await fetchNoteDetailApi(noteId);
        this.activeNote = note;
        this.upsertNote(note);
        return note;
      } finally {
        this.detailLoading = false;
      }
    },

    async createNote(studySetId, payload) {
      const note = await createStudySetNoteApi(studySetId, payload);
      return this.upsertNote(note);
    },

    async updateNote(noteId, payload) {
      const note = await updateStudySetNoteApi(noteId, payload);
      return this.upsertNote(note);
    },

    async deleteNote(noteId) {
      await deleteStudySetNoteApi(noteId);
      this.removeNoteById(noteId);
    },

    async generateNote(payload) {
      const note = await generateNoteApi(payload);
      return this.upsertNote(note);
    }
  }
});
