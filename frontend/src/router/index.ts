import axios from "axios";
import { api } from "../api/client";
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import WorkspaceLayout from "../layouts/WorkspaceLayout.vue";
const LoginView = () => import("../views/LoginView.vue");
const ResourceView = () => import("../views/ResourceView.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/setup", name: "setup", component: () => import("../views/SetupView.vue") },
    { path: "/login", name: "login", component: LoginView },
    {
      path: "/",
      component: WorkspaceLayout,
      children: [
        { path: "", redirect: "/courses" },
        {
          path: "courses",
          name: "courses",
          component: ResourceView,
          props: { resource: "courses" },
        },
        {
          path: "students",
          name: "students",
          component: ResourceView,
          props: { resource: "students" },
        },
        {
          path: "users",
          name: "users",
          component: ResourceView,
          props: { resource: "users" },
        },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/courses" },
  ],
});

router.beforeEach(async (to) => {
  const { data: runtime } = await api.get<{ mode: string; setup_required: boolean }>("/runtime").catch(() => ({ data: { mode: "web", setup_required: false } }));
  if (runtime.setup_required && to.name !== "setup") return "/setup";
  if (!runtime.setup_required && to.name === "setup") return "/login";
  if (to.name === "setup") return true;
  const auth = useAuthStore();
  if (to.name === "login") return true;
  try {
    await auth.refresh();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401)
      auth.clear();
    return "/login";
  }
  if (to.name === "users" && !auth.isAdmin) return "/courses";
  return true;
});
