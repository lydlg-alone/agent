<template>
  <div class="page-stack">
    <SectionBlock title="学习资源生成" description="按知识库、目标、资源类型和难度生成个性化内容。">
      <template #actions>
        <el-button type="primary" @click="generate">生成资源</el-button>
      </template>

      <div class="two-column">
        <el-form :model="form" label-position="top">
          <el-form-item label="学习目标">
            <el-input v-model="form.goal" />
          </el-form-item>
          <el-form-item label="主题">
            <el-input v-model="form.topic" />
          </el-form-item>
          <el-form-item label="资源类型">
            <el-select v-model="form.resourceType" style="width: 100%">
              <el-option label="知识点讲义" value="讲义" />
              <el-option label="思维导图大纲" value="思维导图" />
              <el-option label="复习提纲" value="提纲" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="form.difficulty" style="width: 100%">
              <el-option label="基础" value="基础" />
              <el-option label="中等" value="中等" />
              <el-option label="进阶" value="进阶" />
            </el-select>
          </el-form-item>
        </el-form>

        <div class="panel-card">
          <h3>生成结果</h3>
          <pre class="markdown-preview">{{ resource?.content || "暂无内容" }}</pre>
        </div>
      </div>
    </SectionBlock>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import SectionBlock from "@/components/SectionBlock.vue";
import { api } from "@/services/api.js";

const resource = ref(null);
const form = reactive({
  goal: "掌握导数的定义与求导规则",
  topic: "导数入门",
  resourceType: "讲义",
  difficulty: "中等",
  knowledgeBaseId: "kb_math"
});

async function generate() {
  const { data } = await api.post("/workflows/resources", form);
  resource.value = data;
  ElMessage.success("学习资源已生成");
}
</script>
