<template>
  <section class="login-page">
    <div class="login-card">
      <div class="login-card__header">
        <h1 class="login-card__title">欢迎回到 Studyield</h1>
        <p class="login-card__subtitle">输入你的名称，继续学习之旅</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="login-form__field">
          <label for="login-name" class="login-form__label">用户名称</label>
          <input
            id="login-name"
            ref="nameInput"
            v-model.trim="name"
            type="text"
            class="login-form__input"
            placeholder="请输入你的名称"
            autocomplete="off"
            :disabled="submitting"
          />
        </div>

        <p v-if="errorMsg" class="login-form__error">{{ errorMsg }}</p>

        <button type="submit" class="login-form__submit" :disabled="!name || submitting">
          {{ submitting ? "登录中…" : "进入 Studyield" }}
        </button>
      </form>

      <p class="login-card__footer">
        还没有账户？
        <RouterLink to="/signup" class="login-card__link">创建新账户</RouterLink>
      </p>

      <!-- existing users quick pick -->
      <div v-if="existingUsers.length > 0" class="login-card__users">
        <p class="login-card__users-title">或选择已有用户</p>
        <div class="login-card__users-list">
          <button
            v-for="user in existingUsers"
            :key="user.id"
            class="login-card__user-chip"
            @click="loginAs(user)"
          >
            {{ user.name }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useUserStore } from "@/stores/user.js";

const router = useRouter();
const userStore = useUserStore();

const name = ref("");
const nameInput = ref(null);
const submitting = ref(false);
const errorMsg = ref("");
const existingUsers = ref([]);

onMounted(async () => {
  nameInput.value?.focus();
  try {
    const users = await userStore.fetchUsers();
    existingUsers.value = users || [];
  } catch {
    // silent
  }
});

async function handleLogin() {
  if (!name.value) return;
  submitting.value = true;
  errorMsg.value = "";
  try {
    await userStore.login(name.value);
    router.replace({ name: "dashboard-chat" });
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function loginAs(user) {
  name.value = user.name;
  await handleLogin();
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 36px 32px;
  border-radius: 20px;
  background: var(--bg-overlay-strong);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-card);
}

.login-card__header {
  text-align: center;
  margin-bottom: 28px;
}

.login-card__title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.login-card__subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-tertiary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login-form__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.login-form__input {
  padding: 10px 14px;
  font-size: 15px;
  border-radius: 12px;
  border: 1px solid var(--border-input);
  background: var(--bg-input);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.login-form__input:focus {
  border-color: var(--border-input-focus);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
}

.login-form__input:disabled {
  opacity: 0.6;
}

.login-form__error {
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  color: var(--color-danger);
  background: rgba(224, 82, 104, 0.08);
}

.login-form__submit {
  margin-top: 4px;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-inverse);
  background: var(--brand-blue);
  transition: background 0.2s, transform 0.12s;
}

.login-form__submit:hover:not(:disabled) {
  background: var(--brand-blue-hover);
  transform: translateY(-1px);
}

.login-form__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.login-card__footer {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

.login-card__link {
  color: var(--brand-blue);
  font-weight: 600;
  text-decoration: none;
}

.login-card__link:hover {
  color: var(--brand-blue-hover);
}

.login-card__users {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border-subtle);
}

.login-card__users-title {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}

.login-card__users-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.login-card__user-chip {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.login-card__user-chip:hover {
  background: var(--brand-blue-light);
  border-color: var(--brand-blue-border);
  color: var(--brand-blue);
}
</style>
