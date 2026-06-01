<template>
  <section class="section-block">
    <div class="section-block__header">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <slot name="actions" />
    </div>
    <div class="section-block__content">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: String,
  description: String
});
</script>
