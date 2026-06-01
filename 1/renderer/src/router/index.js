import { createRouter, createWebHashHistory } from "vue-router";
import PublicLayout from "@/layouts/PublicLayout.vue";
import DashboardLayout from "@/layouts/DashboardLayout.vue";
import WelcomePage from "@/views/public/WelcomePage.vue";
import LoginPage from "@/views/public/LoginPage.vue";
import SignupPage from "@/views/public/SignupPage.vue";
import StudyWorkspaceView from "@/views/StudyWorkspaceView.vue";
import KnowledgeView from "@/views/KnowledgeView.vue";
import AnalyticsView from "@/views/AnalyticsView.vue";
import AgentsView from "@/views/AgentsView.vue";
import StudySetsPage from "@/views/dashboard/StudySetsPage.vue";
import StudySetDetailPage from "@/views/dashboard/StudySetDetailPage.vue";
import StudySetFlashcardsPage from "@/views/dashboard/StudySetFlashcardsPage.vue";
import StudySessionPage from "@/views/dashboard/StudySessionPage.vue";
import QuizPage from "@/views/dashboard/QuizPage.vue";
import LearningPathsPage from "@/views/dashboard/LearningPathsPage.vue";
import LearningPathDetailPage from "@/views/dashboard/LearningPathDetailPage.vue";
import SettingsPage from "@/views/dashboard/SettingsPage.vue";
import NotesPage from "@/views/dashboard/NotesPage.vue";
import CreateNotePage from "@/views/dashboard/CreateNotePage.vue";
import GenerateNotePage from "@/views/dashboard/GenerateNotePage.vue";
import NoteDetailPage from "@/views/dashboard/NoteDetailPage.vue";
import EditNotePage from "@/views/dashboard/EditNotePage.vue";

const routes = [
  {
    path: "/",
    component: PublicLayout,
    children: [
      {
        path: "",
        redirect: "/dashboard/chat"
      },
      {
        path: "welcome",
        name: "welcome",
        component: WelcomePage
      },
      {
        path: "login",
        name: "login",
        component: LoginPage
      },
      {
        path: "signup",
        alias: "/register",
        name: "signup",
        component: SignupPage
      }
    ]
  },
  {
    path: "/workspace",
    redirect: "/dashboard/chat"
  },
  {
    path: "/dashboard",
    component: DashboardLayout,
    redirect: "/dashboard/chat",
    children: [
      {
        path: "chat",
        name: "dashboard-chat",
        component: StudyWorkspaceView,
        props: { embedded: true, lockedPage: "chat" }
      },
      {
        path: "knowledge-base",
        name: "dashboard-knowledge-base",
        component: KnowledgeView
      },
      {
        path: "analytics",
        name: "dashboard-analytics",
        component: AnalyticsView
      },
      {
        path: "study-sets",
        name: "study-sets",
        component: StudySetsPage
      },
      {
        path: "study-sets/:id",
        name: "study-set-detail",
        component: StudySetDetailPage
      },
      {
        path: "study-sets/:id/flashcards",
        name: "study-set-flashcards",
        component: StudySetFlashcardsPage
      },
      {
        path: "study-sets/:id/study",
        name: "study-session",
        component: StudySessionPage
      },
      {
        path: "study-sets/:id/quiz",
        name: "study-set-quiz",
        component: QuizPage
      },
      {
        path: "learning-paths",
        name: "learning-paths",
        component: LearningPathsPage
      },
      {
        path: "learning-paths/:id",
        name: "learning-path-detail",
        component: LearningPathDetailPage
      },
      {
        path: "notes",
        name: "notes",
        component: NotesPage
      },
      {
        path: "notes/create",
        alias: "/dashboard/study-sets/:id/notes/create",
        name: "note-create",
        component: CreateNotePage
      },
      {
        path: "notes/generate",
        alias: "/dashboard/study-sets/:id/notes/generate",
        name: "note-generate",
        component: GenerateNotePage
      },
      {
        path: "notes/:noteId",
        alias: "/dashboard/study-sets/:id/notes/:noteId",
        name: "note-detail",
        component: NoteDetailPage
      },
      {
        path: "notes/:noteId/edit",
        alias: "/dashboard/study-sets/:id/notes/:noteId/edit",
        name: "note-edit",
        component: EditNotePage
      },
      {
        path: "settings",
        name: "dashboard-settings",
        component: SettingsPage
      },
      {
        path: "settings/agents",
        name: "dashboard-settings-agents",
        component: AgentsView
      }
    ]
  }
];

export default createRouter({
  history: createWebHashHistory(),
  routes
});
