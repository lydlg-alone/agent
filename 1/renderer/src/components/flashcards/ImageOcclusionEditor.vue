<template>
  <div class="image-occlusion-editor">
    <el-form-item label="提示说明">
      <el-input v-model="draft.frontText" type="textarea" :rows="3" maxlength="20000" @input="emitChange" />
    </el-form-item>

    <el-form-item label="图片">
      <div class="image-occlusion-editor__upload">
        <input ref="fileInputRef" type="file" accept="image/*" class="hidden-file-input" @change="handleFileChange" />
        <el-button @click="fileInputRef?.click()">上传图片</el-button>
        <span class="image-occlusion-editor__hint">空白处拖拽新建遮挡区，点击已存在区域后可移动或缩放。</span>
      </div>
    </el-form-item>

    <div
      v-if="draft.imageDataUrl"
      class="image-occlusion-editor__workspace"
    >
      <div class="image-occlusion-editor__toolbar">
        <div class="image-occlusion-editor__toolbar-meta">
          <strong>标注区 {{ draft.masks.length }}</strong>
          <span v-if="selectedMask">已选中：{{ selectedMask.label || selectedMask.id }}</span>
          <span v-else>拖拽创建新遮挡区，方向键可微调位置。</span>
        </div>
        <div class="image-occlusion-editor__toolbar-actions">
          <el-button :disabled="!selectedMask" @click="duplicateSelectedMask">复制选中</el-button>
          <el-button :disabled="!selectedMask" @click="removeMask(selectedMask.id)">删除选中</el-button>
          <el-button :disabled="!draft.masks.length" @click="clearMasks">清空全部</el-button>
        </div>
      </div>

      <div
      ref="canvasRef"
      class="image-occlusion-editor__canvas"
      @mousedown="handleCanvasMouseDown"
      >
        <img :src="draft.imageDataUrl" alt="occlusion source" class="image-occlusion-editor__image" />

        <div
          v-for="mask in draft.masks"
          :key="mask.id"
          class="image-occlusion-editor__mask"
          :class="{ 'image-occlusion-editor__mask--selected': selectedMaskId === mask.id }"
          :style="maskStyle(mask)"
          @mousedown.stop="handleMaskMoveStart(mask, $event)"
          @click.stop="setSelectedMask(mask.id)"
        >
          <span>{{ mask.label || "遮挡区" }}</span>
          <button
            v-for="handle in handles"
            :key="handle"
            type="button"
            class="image-occlusion-editor__handle"
            :class="`image-occlusion-editor__handle--${handle}`"
            @mousedown.stop.prevent="handleResizeStart(mask, handle, $event)"
          />
        </div>

        <div
          v-if="draftMask"
          class="image-occlusion-editor__mask image-occlusion-editor__mask--draft"
          :style="maskStyle(draftMask)"
        />
      </div>
    </div>

    <div v-if="draft.masks.length" class="image-occlusion-editor__mask-list">
      <div
        v-for="mask in draft.masks"
        :key="mask.id"
        class="image-occlusion-editor__mask-row"
        :class="{ 'image-occlusion-editor__mask-row--selected': selectedMaskId === mask.id }"
        @click="setSelectedMask(mask.id)"
      >
        <el-input v-model="mask.label" placeholder="遮挡区标签" @focus="selectedMaskId = mask.id" @input="emitChange" />
        <span class="image-occlusion-editor__mask-meta">
          {{ Math.round(mask.x) }}%, {{ Math.round(mask.y) }}% · {{ Math.round(mask.width) }}% × {{ Math.round(mask.height) }}%
        </span>
        <el-button text type="danger" @click="removeMask(mask.id)">删除</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      frontText: "",
      imageDataUrl: "",
      masks: []
    })
  }
});

const emit = defineEmits(["update:modelValue"]);

const MIN_MASK_SIZE = 1;
const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const draft = reactive({
  frontText: props.modelValue.frontText || "",
  imageDataUrl: props.modelValue.imageDataUrl || "",
  masks: Array.isArray(props.modelValue.masks) ? structuredClone(props.modelValue.masks) : []
});

const fileInputRef = ref(null);
const canvasRef = ref(null);
const selectedMaskId = ref("");
const draftMask = ref(null);
const interaction = ref(null);
const selectedMask = computed(() => draft.masks.find((item) => item.id === selectedMaskId.value) || null);

watch(
  () => props.modelValue,
  (value) => {
    draft.frontText = value?.frontText || "";
    draft.imageDataUrl = value?.imageDataUrl || "";
    draft.masks = Array.isArray(value?.masks) ? structuredClone(value.masks) : [];
    if (!draft.masks.some((item) => item.id === selectedMaskId.value)) {
      selectedMaskId.value = draft.masks[0]?.id || "";
    }
  },
  { deep: true }
);

function normalizeMasks() {
  return draft.masks
    .map((mask, index) => ({
      id: String(mask.id || `mask-${index + 1}`),
      x: Number(mask.x || 0),
      y: Number(mask.y || 0),
      width: Number(mask.width || 0),
      height: Number(mask.height || 0),
      label: String(mask.label || "").trim()
    }))
    .filter((mask) => mask.width > 0 && mask.height > 0);
}

function emitChange() {
  emit("update:modelValue", {
    frontText: draft.frontText,
    imageDataUrl: draft.imageDataUrl,
    masks: normalizeMasks()
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function maskStyle(mask) {
  return {
    left: `${mask.x}%`,
    top: `${mask.y}%`,
    width: `${mask.width}%`,
    height: `${mask.height}%`
  };
}

function getRelativePoint(event) {
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) {
    return null;
  }

  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
  };
}

function getMaskIndex(maskId) {
  return draft.masks.findIndex((mask) => mask.id === maskId);
}

function setSelectedMask(maskId) {
  selectedMaskId.value = maskId;
}

function buildMaskFromPoints(start, current) {
  return {
    id: `draft-${Date.now()}`,
    x: Number(Math.min(start.x, current.x).toFixed(2)),
    y: Number(Math.min(start.y, current.y).toFixed(2)),
    width: Number(Math.abs(current.x - start.x).toFixed(2)),
    height: Number(Math.abs(current.y - start.y).toFixed(2)),
    label: ""
  };
}

function handleCanvasMouseDown(event) {
  if (event.button !== 0) {
    return;
  }

  const point = getRelativePoint(event);
  if (!point) {
    return;
  }

  selectedMaskId.value = "";
  interaction.value = {
    type: "draw",
    startPoint: point
  };
  draftMask.value = buildMaskFromPoints(point, point);
}

function handleMaskMoveStart(mask, event) {
  const point = getRelativePoint(event);
  if (!point) {
    return;
  }

  setSelectedMask(mask.id);
  interaction.value = {
    type: "move",
    maskId: mask.id,
    startPoint: point,
    originMask: { ...mask }
  };
}

function handleResizeStart(mask, handle, event) {
  const point = getRelativePoint(event);
  if (!point) {
    return;
  }

  setSelectedMask(mask.id);
  interaction.value = {
    type: "resize",
    handle,
    maskId: mask.id,
    startPoint: point,
    originMask: { ...mask }
  };
}

function updateDraw(point) {
  draftMask.value = buildMaskFromPoints(interaction.value.startPoint, point);
}

function updateMove(point) {
  const maskIndex = getMaskIndex(interaction.value.maskId);
  if (maskIndex < 0) {
    return;
  }

  const dx = point.x - interaction.value.startPoint.x;
  const dy = point.y - interaction.value.startPoint.y;
  const origin = interaction.value.originMask;
  const next = {
    ...draft.masks[maskIndex],
    x: clamp(origin.x + dx, 0, 100 - origin.width),
    y: clamp(origin.y + dy, 0, 100 - origin.height)
  };

  draft.masks.splice(maskIndex, 1, next);
}

function updateResize(point) {
  const maskIndex = getMaskIndex(interaction.value.maskId);
  if (maskIndex < 0) {
    return;
  }

  const origin = interaction.value.originMask;
  const dx = point.x - interaction.value.startPoint.x;
  const dy = point.y - interaction.value.startPoint.y;
  let { x, y, width, height } = origin;

  if (interaction.value.handle.includes("e")) {
    width = clamp(origin.width + dx, MIN_MASK_SIZE, 100 - origin.x);
  }
  if (interaction.value.handle.includes("s")) {
    height = clamp(origin.height + dy, MIN_MASK_SIZE, 100 - origin.y);
  }
  if (interaction.value.handle.includes("w")) {
    x = clamp(origin.x + dx, 0, origin.x + origin.width - MIN_MASK_SIZE);
    width = clamp(origin.width - (x - origin.x), MIN_MASK_SIZE, 100);
  }
  if (interaction.value.handle.includes("n")) {
    y = clamp(origin.y + dy, 0, origin.y + origin.height - MIN_MASK_SIZE);
    height = clamp(origin.height - (y - origin.y), MIN_MASK_SIZE, 100);
  }

  if (x + width > 100) {
    width = 100 - x;
  }
  if (y + height > 100) {
    height = 100 - y;
  }

  draft.masks.splice(maskIndex, 1, {
    ...draft.masks[maskIndex],
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2))
  });
}

function handleWindowMouseMove(event) {
  if (!interaction.value) {
    return;
  }

  const point = getRelativePoint(event);
  if (!point) {
    return;
  }

  if (interaction.value.type === "draw") {
    updateDraw(point);
    return;
  }

  if (interaction.value.type === "move") {
    updateMove(point);
    return;
  }

  if (interaction.value.type === "resize") {
    updateResize(point);
  }
}

function handleWindowMouseUp() {
  if (!interaction.value) {
    return;
  }

  if (interaction.value.type === "draw" && draftMask.value) {
    if (draftMask.value.width >= MIN_MASK_SIZE && draftMask.value.height >= MIN_MASK_SIZE) {
      const newMask = {
        id: `mask-${Date.now()}`,
        x: draftMask.value.x,
        y: draftMask.value.y,
        width: draftMask.value.width,
        height: draftMask.value.height,
        label: ""
      };
      draft.masks.push(newMask);
      selectedMaskId.value = newMask.id;
      emitChange();
    }
    draftMask.value = null;
  }

  if (interaction.value.type === "move" || interaction.value.type === "resize") {
    emitChange();
  }

  interaction.value = null;
}

function updateMask(maskId, updater) {
  const maskIndex = getMaskIndex(maskId);
  if (maskIndex < 0) {
    return;
  }

  const current = draft.masks[maskIndex];
  draft.masks.splice(maskIndex, 1, updater(current));
}

function removeMask(maskId) {
  draft.masks = draft.masks.filter((mask) => mask.id !== maskId);
  if (selectedMaskId.value === maskId) {
    selectedMaskId.value = draft.masks[0]?.id || "";
  }
  emitChange();
}

function duplicateSelectedMask() {
  if (!selectedMask.value) {
    return;
  }

  const source = selectedMask.value;
  const nextMask = {
    ...source,
    id: `mask-${Date.now()}`,
    x: Number(clamp(source.x + 2, 0, 100 - source.width).toFixed(2)),
    y: Number(clamp(source.y + 2, 0, 100 - source.height).toFixed(2)),
    label: source.label ? `${source.label} 副本` : ""
  };

  draft.masks.push(nextMask);
  selectedMaskId.value = nextMask.id;
  emitChange();
}

function clearMasks() {
  draft.masks = [];
  selectedMaskId.value = "";
  draftMask.value = null;
  emitChange();
}

function nudgeSelectedMask(deltaX, deltaY) {
  if (!selectedMask.value) {
    return;
  }

  updateMask(selectedMask.value.id, (mask) => ({
    ...mask,
    x: Number(clamp(mask.x + deltaX, 0, 100 - mask.width).toFixed(2)),
    y: Number(clamp(mask.y + deltaY, 0, 100 - mask.height).toFixed(2))
  }));
  emitChange();
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    draft.imageDataUrl = String(reader.result || "");
    draft.masks = [];
    selectedMaskId.value = "";
    emitChange();
  };
  reader.readAsDataURL(file);
}

function handleWindowKeyDown(event) {
  if (!draft.imageDataUrl || !selectedMask.value) {
    return;
  }

  if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) {
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    removeMask(selectedMask.value.id);
    return;
  }

  if (event.key === "Escape") {
    draftMask.value = null;
    interaction.value = null;
    return;
  }

  const step = event.shiftKey ? 5 : 1;
  if (event.key === "ArrowUp") {
    event.preventDefault();
    nudgeSelectedMask(0, -step);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    nudgeSelectedMask(0, step);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    nudgeSelectedMask(-step, 0);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    nudgeSelectedMask(step, 0);
  }
}

onMounted(() => {
  window.addEventListener("mousemove", handleWindowMouseMove);
  window.addEventListener("mouseup", handleWindowMouseUp);
  window.addEventListener("keydown", handleWindowKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", handleWindowMouseMove);
  window.removeEventListener("mouseup", handleWindowMouseUp);
  window.removeEventListener("keydown", handleWindowKeyDown);
});
</script>

<style scoped>
.image-occlusion-editor {
  display: flex;
  flex-direction: column;
}

.image-occlusion-editor__workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-occlusion-editor__upload {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.image-occlusion-editor__hint {
  color: var(--text-secondary);
  font-size: 13px;
}

.image-occlusion-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  background: var(--bg-overlay-strong);
}

.image-occlusion-editor__toolbar-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-occlusion-editor__toolbar-meta strong {
  font-size: 14px;
}

.image-occlusion-editor__toolbar-meta span {
  color: var(--text-secondary);
  font-size: 12px;
}

.image-occlusion-editor__toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.image-occlusion-editor__canvas {
  position: relative;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface-alt);
  cursor: crosshair;
}

.image-occlusion-editor__image {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
}

.image-occlusion-editor__mask {
  position: absolute;
  border: 2px solid rgba(245, 158, 11, 0.95);
  background: rgba(245, 158, 11, 0.26);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 4px;
  box-sizing: border-box;
}

.image-occlusion-editor__mask--selected {
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.6);
}

.image-occlusion-editor__mask span {
  font-size: 12px;
  color: #fff;
  background: rgba(15, 23, 42, 0.72);
  padding: 2px 6px;
  border-radius: 999px;
  pointer-events: none;
}

.image-occlusion-editor__mask--draft {
  border-style: dashed;
  pointer-events: none;
}

.image-occlusion-editor__handle {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid #fff;
  border-radius: 999px;
  background: #0ea5e9;
  padding: 0;
}

.image-occlusion-editor__handle--nw {
  top: -6px;
  left: -6px;
  cursor: nwse-resize;
}

.image-occlusion-editor__handle--n {
  top: -6px;
  left: calc(50% - 5px);
  cursor: ns-resize;
}

.image-occlusion-editor__handle--ne {
  top: -6px;
  right: -6px;
  cursor: nesw-resize;
}

.image-occlusion-editor__handle--e {
  top: calc(50% - 5px);
  right: -6px;
  cursor: ew-resize;
}

.image-occlusion-editor__handle--se {
  right: -6px;
  bottom: -6px;
  cursor: nwse-resize;
}

.image-occlusion-editor__handle--s {
  bottom: -6px;
  left: calc(50% - 5px);
  cursor: ns-resize;
}

.image-occlusion-editor__handle--sw {
  left: -6px;
  bottom: -6px;
  cursor: nesw-resize;
}

.image-occlusion-editor__handle--w {
  top: calc(50% - 5px);
  left: -6px;
  cursor: ew-resize;
}

.image-occlusion-editor__mask-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-occlusion-editor__mask-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  background: var(--bg-surface-alt);
  cursor: pointer;
}

.image-occlusion-editor__mask-row--selected {
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2) inset;
}

.image-occlusion-editor__mask-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 900px) {
  .image-occlusion-editor__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .image-occlusion-editor__toolbar-actions {
    width: 100%;
  }

  .image-occlusion-editor__mask-row {
    grid-template-columns: 1fr;
  }
}
</style>
