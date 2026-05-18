import { createRouter, createWebHashHistory } from "vue-router";
import StudyWorkspaceView from "@/views/StudyWorkspaceView.vue";

const routes = [
  {
    path: "/",
    name: "workspace",
    component: StudyWorkspaceView
  }
];

export default createRouter({
  history: createWebHashHistory(),
  routes
});
