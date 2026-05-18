<template>
  <div class="page-stack">
    <SectionBlock title="练习与测评" description="生成题目、提交答案并查看自动反馈。">
      <template #actions>
        <el-button @click="generateQuestion">生成题目</el-button>
        <el-button type="primary" @click="submitAnswer">提交答案</el-button>
      </template>

      <div class="two-column">
        <div class="panel-card">
          <h3>练习题</h3>
          <p>{{ question?.prompt || "尚未生成题目" }}</p>
          <el-input
            v-model="answerText"
            type="textarea"
            :rows="8"
            placeholder="输入你的答案"
          />
        </div>

        <div class="panel-card">
          <h3>测评反馈</h3>
          <p>得分：{{ feedback?.score ?? "-" }}</p>
          <p>评语：{{ feedback?.feedback ?? "暂无反馈" }}</p>
          <p>下一步：{{ feedback?.nextStep ?? "-" }}</p>
        </div>
      </div>
    </SectionBlock>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import SectionBlock from "@/components/SectionBlock.vue";
import { api } from "@/services/api.js";

const question = ref(null);
const feedback = ref(null);
const answerText = ref("");

async function generateQuestion() {
  const { data } = await api.post("/workflows/practice", {
    topic: "导数的几何意义",
    questionType: "简答题",
    difficulty: "中等",
    knowledgeBaseId: "kb_math"
  });
  question.value = data;
  feedback.value = null;
  answerText.value = "";
  ElMessage.success("题目已生成");
}

async function submitAnswer() {
  if (!question.value) {
    ElMessage.warning("请先生成题目");
    return;
  }

  const { data } = await api.post("/workflows/feedback", {
    questionId: question.value.id,
    answerText: answerText.value
  });
  feedback.value = data;
  ElMessage.success("答案已批改");
}
</script>
