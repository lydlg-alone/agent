<template>
  <div class="home-page">
    <!-- ========== Hero ========== -->
    <section class="hero">
      <div class="hero__badge">🧠 AI 驱动的个性化学习平台</div>
      <h1 class="hero__title">
        用 AI 重塑
        <span class="hero__highlight">学习方式</span>
      </h1>
      <p class="hero__desc">
        基于大语言模型，为每一位学习者自动生成定制化学习资源、智能闪卡和自适应测验。
        让 AI 成为你全天候的私人家教。
      </p>
      <div class="hero__actions">
        <RouterLink to="/login" class="hero__cta hero__cta--primary">
          开始学习
        </RouterLink>
        <RouterLink to="/welcome" class="hero__cta hero__cta--secondary">
          了解更多
        </RouterLink>
      </div>
    </section>

    <!-- ========== Feature Grid ========== -->
    <section class="features">
      <h2 class="features__title">核心功能</h2>
      <p class="features__subtitle">一站式覆盖学习全流程，从资源生成到效果追踪</p>

      <div class="features__grid">
        <div class="feature-card" v-for="f in features" :key="f.title">
          <div class="feature-card__icon">{{ f.icon }}</div>
          <h3 class="feature-card__title">{{ f.title }}</h3>
          <p class="feature-card__desc">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ========== Stats ========== -->
    <section class="stats">
      <div class="stats__item">
        <span class="stats__number">AI 驱动</span>
        <span class="stats__label">智能内容生成</span>
      </div>
      <div class="stats__item">
        <span class="stats__number">间隔重复</span>
        <span class="stats__label">科学记忆算法</span>
      </div>
      <div class="stats__item">
        <span class="stats__number">多模态</span>
        <span class="stats__label">文本·图片·代码</span>
      </div>
      <div class="stats__item">
        <span class="stats__number">本地优先</span>
        <span class="stats__label">数据安全可控</span>
      </div>
    </section>

    <!-- ========== CTA Banner ========== -->
    <section class="cta-banner">
      <div class="cta-banner__content">
        <h2 class="cta-banner__title">准备好开始你的学习之旅了吗？</h2>
        <p class="cta-banner__desc">只需一个名称，即刻拥有专属 AI 学习助手。</p>
        <RouterLink to="/signup" class="cta-banner__btn">免费创建账户</RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router";

const features = [
  {
    icon: "💬",
    title: "AI 对话学习",
    desc: "与 AI 进行自然语言对话，实时提问、深入讨论，获得即时的解答与引导。"
  },
  {
    icon: "📚",
    title: "学习集管理",
    desc: "创建和管理结构化学习资源，上传文档自动解析知识点，打造个人知识库。"
  },
  {
    icon: "🃏",
    title: "智能闪卡复习",
    desc: "基于间隔重复算法自动安排复习计划，支持填空卡与图像遮挡卡，让记忆更高效。"
  },
  {
    icon: "📝",
    title: "自适应测验",
    desc: "AI 根据学习内容自动生成测验题，实时评估掌握程度并调整后续学习路径。"
  },
  {
    icon: "📊",
    title: "学习分析",
    desc: "可视化学习数据，追踪进度、复习覆盖率和掌握趋势，用数据驱动学习决策。"
  },
  {
    icon: "⚡",
    title: "本地离线运行",
    desc: "Electron 桌面应用，数据本地存储。支持对接本地大模型，无需联网也可使用。"
  }
];
</script>

<style scoped>
.home-page {
  max-width: 1060px;
  margin: 0 auto;
}

/* ======== Hero ======== */
.hero {
  text-align: center;
  padding: 48px 24px 40px;
}

.hero__badge {
  display: inline-block;
  padding: 6px 18px;
  margin-bottom: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-blue);
  background: var(--brand-blue-light);
  border: 1px solid var(--brand-blue-border);
  border-radius: 24px;
}

.hero__title {
  margin: 0 0 16px;
  font-size: clamp(28px, 5vw, 46px);
  font-weight: 800;
  line-height: 1.25;
  color: var(--text-primary);
}

.hero__highlight {
  background: linear-gradient(135deg, var(--brand-blue), #38bdf8);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero__desc {
  max-width: 640px;
  margin: 0 auto 30px;
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.hero__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 28px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 14px;
  text-decoration: none;
  transition: background 0.2s, transform 0.12s, box-shadow 0.2s;
}

.hero__cta--primary {
  color: var(--text-inverse);
  background: var(--brand-blue);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.28);
}

.hero__cta--primary:hover {
  background: var(--brand-blue-hover);
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(14, 165, 233, 0.38);
}

.hero__cta--secondary {
  color: var(--brand-blue);
  background: var(--bg-surface);
  border: 1px solid var(--brand-blue-border);
}

.hero__cta--secondary:hover {
  background: var(--brand-blue-light);
  transform: translateY(-2px);
}

/* ======== Features ======== */
.features {
  padding: 48px 24px;
  text-align: center;
}

.features__title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.features__subtitle {
  margin: 0 0 36px;
  font-size: 15px;
  color: var(--text-tertiary);
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 20px;
}

.feature-card {
  padding: 28px 22px;
  border-radius: 18px;
  background: var(--bg-overlay-strong);
  border: 1px solid var(--border-subtle);
  text-align: left;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card);
}

.feature-card__icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.feature-card__title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

.feature-card__desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-secondary);
}

/* ======== Stats ======== */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 36px 24px;
  margin: 0 24px;
  border-radius: 20px;
  background: var(--bg-overlay-soft);
  border: 1px solid var(--border-light);
}

.stats__item {
  text-align: center;
  padding: 12px;
}

.stats__number {
  display: block;
  font-size: 22px;
  font-weight: 800;
  color: var(--brand-blue);
  margin-bottom: 4px;
}

.stats__label {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ======== CTA Banner ======== */
.cta-banner {
  margin: 48px 24px 36px;
  padding: 40px 32px;
  border-radius: 24px;
  text-align: center;
  background: linear-gradient(135deg, var(--brand-blue), #0e8ad4);
  color: #ffffff;
  box-shadow: var(--shadow-elevated);
}

.cta-banner__title {
  margin: 0 0 10px;
  font-size: 24px;
  font-weight: 700;
}

.cta-banner__desc {
  margin: 0 0 24px;
  font-size: 15px;
  opacity: 0.88;
}

.cta-banner__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 32px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 14px;
  color: var(--brand-blue);
  background: #ffffff;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.cta-banner__btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

/* ======== Responsive ======== */
@media (max-width: 640px) {
  .hero {
    padding: 32px 16px 28px;
  }

  .features__grid {
    grid-template-columns: 1fr;
  }

  .stats {
    grid-template-columns: repeat(2, 1fr);
    margin: 0 16px;
    padding: 24px 12px;
  }

  .cta-banner {
    margin: 36px 16px 24px;
    padding: 28px 20px;
  }
}
</style>
