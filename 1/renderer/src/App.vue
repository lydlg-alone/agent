<template>
  <div class="app-shell">
    <AmbientStarfield />
    <div class="app-shell__content">
      <router-view />
    </div>
    <LaunchAnimation v-if="showLaunchAnimation" @finish="showLaunchAnimation = false" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import AmbientStarfield from "@/components/ambient/AmbientStarfield.vue";
import LaunchAnimation from "@/components/intro/LaunchAnimation.vue";

const showLaunchAnimation = ref(true);
</script>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  isolation: isolate;
}

.app-shell__content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}
</style>
