import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/services/api.js";

const STORAGE_KEY = "studyield_user";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // corrupted — ignore
  }
  return null;
}

function saveToStorage(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // quota exceeded — ignore
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const useUserStore = defineStore("user", () => {
  // ---- state ----
  const saved = loadFromStorage();
  const currentUser = ref(saved);
  const loading = ref(false);
  const error = ref(null);

  // ---- getters ----
  const isLoggedIn = computed(() => !!currentUser.value?.id);
  const userId = computed(() => currentUser.value?.id ?? null);
  const userName = computed(() => currentUser.value?.name ?? "");

  // ---- actions ----
  async function login(name) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post("/users/login", { name });
      currentUser.value = data.user;
      saveToStorage(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || "登录失败，请稍后重试";
      error.value = msg;
      throw new Error(msg);
    } finally {
      loading.value = false;
    }
  }

  async function register(payload) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post("/users/register", payload);
      currentUser.value = data.user;
      saveToStorage(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || "注册失败，请稍后重试";
      error.value = msg;
      throw new Error(msg);
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    currentUser.value = null;
    clearStorage();
  }

  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get("/users");
      return data.users;
    } catch (err) {
      const msg = err.response?.data?.message || "获取用户列表失败";
      error.value = msg;
      throw new Error(msg);
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(payload) {
    if (!currentUser.value?.id) return;
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch(`/users/${currentUser.value.id}`, payload);
      currentUser.value = data.user;
      saveToStorage(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || "更新失败";
      error.value = msg;
      throw new Error(msg);
    } finally {
      loading.value = false;
    }
  }

  return {
    currentUser,
    loading,
    error,
    isLoggedIn,
    userId,
    userName,
    login,
    register,
    logout,
    fetchUsers,
    updateProfile
  };
});
