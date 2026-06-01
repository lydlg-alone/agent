<template>
  <section class="signup-page">
    <div class="signup-card">
      <div class="signup-card__header">
        <h1 class="signup-card__title">创建你的 Studyield 账户</h1>
        <p class="signup-card__subtitle">个性化你的 AI 学习空间</p>
      </div>

      <form class="signup-form" @submit.prevent="handleRegister">
        <div class="signup-form__field">
          <label for="signup-name" class="signup-form__label">用户名称 <span class="signup-form__required">*</span></label>
          <input
            id="signup-name"
            ref="nameInput"
            v-model.trim="name"
            type="text"
            class="signup-form__input"
            placeholder="你想让大家怎么称呼你？"
            autocomplete="off"
            :disabled="submitting"
          />
        </div>

        <div class="signup-form__field">
          <label for="signup-goal" class="signup-form__label">学习目标</label>
          <input
            id="signup-goal"
            v-model.trim="currentGoal"
            type="text"
            class="signup-form__input"
            placeholder="例如：通过英语六级、掌握微积分"
            :disabled="submitting"
          />
        </div>

        <div class="signup-form__row">
          <div class="signup-form__field signup-form__field--half">
            <label for="signup-level" class="signup-form__label">当前水平</label>
            <select
              id="signup-level"
              v-model="level"
              class="signup-form__select"
              :disabled="submitting"
            >
              <option value="">不指定</option>
              <option value="beginner">入门</option>
              <option value="intermediate">进阶</option>
              <option value="advanced">高阶</option>
            </select>
          </div>

          <div class="signup-form__field signup-form__field--half">
            <label for="signup-pref" class="signup-form__label">学习偏好</label>
            <select
              id="signup-pref"
              v-model="preference"
              class="signup-form__select"
              :disabled="submitting"
            >
              <option value="">不指定</option>
              <option value="flashcards">闪卡记忆</option>
              <option value="quizzes">测验练习</option>
              <option value="chat">AI 对话</option>
              <option value="mixed">混合模式</option>
            </select>
          </div>
        </div>

        <p v-if="errorMsg" class="signup-form__error">{{ errorMsg }}</p>

        <button type="submit" class="signup-form__submit" :disabled="!name || submitting">
          {{ submitting ? "创建中…" : "创建账户并开始学习" }}
        </button>
      </form>

      <p class="signup-card__footer">
        已有账户？
        <RouterLink to="/login" class="signup-card__link">去登录</RouterLink>
      </p>
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
const currentGoal = ref("");
const level = ref("");
const preference = ref("");
const nameInput = ref(null);
const submitting = ref(false);
const errorMsg = ref("");

onMounted(() => {
  nameInput.value?.focus();
});

async function handleRegister() {
  if (!name.value) return;
  submitting.value = true;
  errorMsg.value = "";
  try {
    await userStore.register({
      name: name.value,
      current_goal: currentGoal.value || undefined,
      level: level.value || undefined,
      preference: preference.value || undefined
    });
    router.replace({ name: "dashboard-chat" });
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.signup-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
  padding: 24px;
}

.signup-card {
  width: 100%;
  max-width: 460px;
  padding: 36px 32px;
  border-radius: 20px;
  background: var(--bg-overlay-strong);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-card);
}

.signup-card__header {
  text-align: center;
  margin-bottom: 28px;
}

.signup-card__title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.signup-card__subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-tertiary);
}

.signup-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.signup-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.signup-form__field--half {
  flex: 1;
}

.signup-form__row {
  display: flex;
  gap: 12px;
}

.signup-form__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.signup-form__required {
  color: var(--color-danger);
}

.signup-form__input,
.signup-form__select {
  padding: 10px 14px;
  font-size: 15px;
  border-radius: 12px;
  border: 1px solid var(--border-input);
  background: var(--bg-input);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.signup-form__select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2349677d' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.signup-form__input:focus,
.signup-form__select:focus {
  border-color: var(--border-input-focus);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
}

.signup-form__input:disabled,
.signup-form__select:disabled {
  opacity: 0.6;
}

.signup-form__error {
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  color: var(--color-danger);
  background: rgba(224, 82, 104, 0.08);
}

.signup-form__submit {
  margin-top: 6px;
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

.signup-form__submit:hover:not(:disabled) {
  background: var(--brand-blue-hover);
  transform: translateY(-1px);
}

.signup-form__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.signup-card__footer {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

.signup-card__link {
  color: var(--brand-blue);
  font-weight: 600;
  text-decoration: none;
}

.signup-card__link:hover {
  color: var(--brand-blue-hover);
}
</style>
