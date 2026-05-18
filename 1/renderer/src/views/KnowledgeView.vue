<template>
  <div class="page-stack">
    <SectionBlock title="知识库管理" description="对应文档上传、切分、向量化和检索测试流程。">
      <template #actions>
        <el-button type="primary" @click="submitKnowledgeBase">新建知识库</el-button>
      </template>

      <div class="two-column">
        <el-form :model="form" label-position="top">
          <el-form-item label="知识库名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="form.category" />
          </el-form-item>
          <el-form-item label="向量引擎">
            <el-input v-model="form.vectorStore" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="form.description" type="textarea" :rows="4" />
          </el-form-item>
        </el-form>

        <div class="panel-card">
          <h3>知识库列表</h3>
          <el-table :data="items" stripe>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="category" label="分类" />
            <el-table-column prop="vector_store" label="向量引擎" />
            <el-table-column prop="document_count" label="文档数" />
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

const items = ref([]);
const form = reactive({
  name: "新知识库",
  category: "通用",
  vectorStore: "SQLite + sqlite-vec",
  description: "用于存储课程资料、学习笔记和练习解析。",
  status: "active"
});

async function loadItems() {
  const { data } = await api.get("/knowledge-bases");
  items.value = data;
}

async function submitKnowledgeBase() {
  await api.post("/knowledge-bases", form);
  ElMessage.success("知识库已创建");
  await loadItems();
}

onMounted(loadItems);
</script>
