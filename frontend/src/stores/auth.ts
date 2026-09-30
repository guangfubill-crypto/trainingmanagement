import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "../api/client";
import type { User } from "../types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isAdmin = computed(() => user.value?.role === "admin");
  async function refresh() {
    const { data } = await api.get<User>("/auth/me");
    user.value = data;
    return data;
  }
  async function login(username: string, password: string) {
    const { data } = await api.post<User>("/auth/login", {
      username,
      password,
    });
    user.value = data;
  }
  async function logout() {
    await api.post("/auth/logout");
    user.value = null;
  }
  function clear() {
    user.value = null;
  }
  return { user, isAdmin, refresh, login, logout, clear };
});
