<template>
  <div class="status-card">
    <span class="status-card__label">{{ label }}</span>
    <strong class="status-card__value">{{ value }}</strong>
    <p class="status-card__hint">{{ hint }}</p>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  value: [String, Number],
  hint: String
});
</script>
