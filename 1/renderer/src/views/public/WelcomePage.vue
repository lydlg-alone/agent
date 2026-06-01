<template>
  <div class="welcome-page">
    <h1 class="welcome__title">功能预览</h1>
    <p class="welcome__subtitle">了解 Studyield 如何通过 AI 提升你的学习效率</p>

    <div class="welcome__sections">
      <!-- AI Chat -->
      <section class="welcome-section">
        <div class="welcome-section__icon">💬</div>
        <div class="welcome-section__body">
          <h2>AI 对话学习</h2>
          <p>
            与 AI 进行深入的自然语言对话。提问、追问、讨论——就像拥有一位随时在线的私人家教。
            支持 Markdown、代码高亮、LaTeX 数学公式渲染和流式输出。
          </p>
          <ul>
            <li>实时流式对话，秒级响应</li>
            <li>Markdown 富文本 + 代码语法高亮</li>
            <li>LaTeX 数学公式完美渲染</li>
            <li>知识库文档作为对话上下文</li>
          </ul>
        </div>
      </section>

      <!-- Study Sets -->
      <section class="welcome-section">
        <div class="welcome-section__icon">📚</div>
        <div class="welcome-section__body">
          <h2>学习集管理</h2>
          <p>
            创建主题学习集合，上传 PDF、Word 文档，AI 自动提取知识点。
            支持笔记、资源链接和参考文献管理。
          </p>
          <ul>
            <li>创建和管理多个学习主题</li>
            <li>上传文档自动解析（PDF / Word）</li>
            <li>笔记与外部资源关联</li>
            <li>知识库文档与学习集联动</li>
          </ul>
        </div>
      </section>

      <!-- Flashcards -->
      <section class="welcome-section">
        <div class="welcome-section__icon">🃏</div>
        <div class="welcome-section__body">
          <h2>智能闪卡系统</h2>
          <p>
            基于 SM-2 间隔重复算法的科学记忆系统。支持标准问答卡、填空卡和图像遮挡卡。
            AI 可根据学习内容自动生成闪卡。
          </p>
          <ul>
            <li>SM-2 间隔重复算法自动排期</li>
            <li>支持填空卡（Cloze）和图像遮挡卡</li>
            <li>AI 一键生成闪卡</li>
            <li>复习进度可视化追踪</li>
          </ul>
        </div>
      </section>

      <!-- Quizzes -->
      <section class="welcome-section">
        <div class="welcome-section__icon">📝</div>
        <div class="welcome-section__body">
          <h2>自适应测验</h2>
          <p>
            AI 基于学习内容自动生成单选、多选和填空题。测验结果即时反馈，
            支持错题重做和针对性强化。
          </p>
          <ul>
            <li>AI 自动生成多样化题型</li>
            <li>即时批改与详细解析</li>
            <li>错题回顾与重做机制</li>
            <li>测验历史与成绩追踪</li>
          </ul>
        </div>
      </section>

      <!-- Analytics -->
      <section class="welcome-section">
        <div class="welcome-section__icon">📊</div>
        <div class="welcome-section__body">
          <h2>学习分析仪表盘</h2>
          <p>
            通过 ECharts 可视化图表全面追踪学习进度。复习覆盖率、掌握趋势、
            科目分布一目了然。
          </p>
          <ul>
            <li>交互式可视化图表</li>
            <li>学习时长与复习次数统计</li>
            <li>科目掌握程度分布</li>
            <li>学习趋势预测</li>
          </ul>
        </div>
      </section>

      <!-- Multi-Agent -->
      <section class="welcome-section">
        <div class="welcome-section__icon">🤖</div>
        <div class="welcome-section__body">
          <h2>多智能体架构</h2>
          <p>
            内置多个 AI 智能体协同工作：资源生成 Agent、测验生成 Agent、
            复习调度 Agent 等，各司其职，高效协作。
          </p>
          <ul>
            <li>模块化智能体设计</li>
            <li>支持自定义 Agent 配置</li>
            <li>任务路由与并行处理</li>
            <li>对接多种大模型后端</li>
          </ul>
        </div>
      </section>
    </div>

    <!-- CTA -->
    <div class="welcome__cta">
      <p>准备好开始了吗？</p>
      <RouterLink to="/signup" class="welcome__btn">免费创建账户</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router";
</script>

<style scoped>
.welcome-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 24px 40px;
}

.welcome__title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  text-align: center;
}

.welcome__subtitle {
  margin: 0 0 36px;
  font-size: 15px;
  color: var(--text-tertiary);
  text-align: center;
}

.welcome__sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.welcome-section {
  display: flex;
  gap: 20px;
  padding: 28px 24px;
  border-radius: 18px;
  background: var(--bg-overlay-strong);
  border: 1px solid var(--border-subtle);
  transition: box-shadow 0.2s;
}

.welcome-section:hover {
  box-shadow: var(--shadow-card);
}

.welcome-section__icon {
  font-size: 36px;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: var(--bg-overlay-soft);
}

.welcome-section__body {
  flex: 1;
}

.welcome-section__body h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.welcome-section__body p {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.welcome-section__body ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-tertiary);
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
}

.welcome-section__body li {
  line-height: 1.7;
}

/* CTA */
.welcome__cta {
  margin-top: 40px;
  text-align: center;
  padding: 32px;
  border-radius: 20px;
  background: var(--bg-overlay-soft);
  border: 1px solid var(--border-light);
}

.welcome__cta p {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.welcome__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 32px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 14px;
  color: var(--text-inverse);
  background: var(--brand-blue);
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.28);
  transition: background 0.2s, transform 0.12s;
}

.welcome__btn:hover {
  background: var(--brand-blue-hover);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .welcome-section {
    flex-direction: column;
    gap: 14px;
  }

  .welcome-section__icon {
    width: 44px;
    height: 44px;
    font-size: 26px;
  }
}
</style>
