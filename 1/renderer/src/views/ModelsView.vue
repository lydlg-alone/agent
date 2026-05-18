<template>
  <div class="page-stack">
    <SectionBlock title="模型配置" description="管理 OpenAI、DeepSeek、Qwen、Ollama 等兼容接口。">
      <template #actions>
        <el-button type="primary" @click="submitModel">保存模型</el-button>
      </template>

      <div class="two-column">
        <el-form :model="form" label-position="top">
          <el-form-item label="模型名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="服务提供商">
            <el-input v-model="form.provider" />
          </el-form-item>
          <el-form-item label="API Base URL">
            <el-input v-model="form.baseUrl" />
          </el-form-item>
          <el-form-item label="模型 ID">
            <el-input v-model="form.modelId" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="form.apiKey" show-password />
          </el-form-item>
        </el-form>

        <div class="panel-card">
          <h3>已配置模型</h3>
          <el-table :data="models" stripe>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="provider" label="提供商" />
            <el-table-column prop="model_id" label="模型 ID" />
            <el-table-column prop="context_length" label="上下文长度" />
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

const models = ref([]);
const form = reactive({
  name: "新增模型",
  provider: "OpenAI-Compatible",
  baseUrl: "https://api.example.com/v1",
  modelId: "custom-chat",
  apiKey: "",
  contextLength: 8192,
  temperature: 0.7,
  streamEnabled: true,
  isDefault: false
});

async function loadModels() {
  const { data } = await api.get("/models");
  models.value = data;
}

async function submitModel() {
  await api.post("/models", form);
  ElMessage.success("模型配置已保存");
  await loadModels();
}

onMounted(loadModels);
</script>
