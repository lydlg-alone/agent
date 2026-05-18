<template>
  <div class="page-stack">
    <SectionBlock title="智能体编排" description="配置智能体角色、提示词、模型绑定和知识访问范围。">
      <template #actions>
        <el-button type="primary" @click="submitAgent">新增智能体</el-button>
      </template>

      <div class="two-column">
        <el-form :model="form" label-position="top">
          <el-form-item label="智能体名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="角色">
            <el-input v-model="form.role" />
          </el-form-item>
          <el-form-item label="绑定模型">
            <el-input v-model="form.modelBinding" />
          </el-form-item>
          <el-form-item label="提示词模板">
            <el-input v-model="form.promptTemplate" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="知识访问范围">
            <el-input v-model="form.knowledgeScope" />
          </el-form-item>
        </el-form>

        <div class="panel-card">
          <h3>智能体列表</h3>
          <el-table :data="agents" stripe>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="role" label="角色" />
            <el-table-column prop="model_binding" label="模型" />
            <el-table-column prop="knowledge_scope" label="知识范围" />
          </el-table>
        </div>
      </div>
    </SectionBlock>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import SectionBlock from "@/components/SectionBlock.vue";
import { api } from "@/services/api.js";

const agents = ref([]);
const form = reactive({
  name: "资源生成智能体",
  role: "resource_generation",
  modelBinding: "DeepSeek",
  promptTemplate: "根据知识库摘要和学习目标输出结构化讲义。",
  knowledgeScope: "高等数学知识库、学习计划、用户画像"
});

async function loadAgents() {
  const { data } = await api.get("/agents");
  agents.value = data;
}

async function submitAgent() {
  await api.post("/agents", form);
  ElMessage.success("智能体已创建");
  await loadAgents();
}

onMounted(loadAgents);
</script>
