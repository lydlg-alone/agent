<template>
  <div class="launch-overlay" :class="{ 'launch-overlay--dismissing': isDismissing }">
    <div ref="entranceLayerRef" class="entrance-layer" :class="{ 'entrance-layer--hidden': isDismissing }">
      <canvas ref="canvasRef" class="particle-canvas"></canvas>

      <div ref="welcomeContentRef" class="welcome-card" :class="{ 'welcome-card--hidden': hideWelcomeCard }">
        <div class="status-pill">LEARNING WORKSPACE READY</div>
        <h1 class="welcome-title">AI 学习智能体系统</h1>
        <p class="welcome-subtitle">KNOWLEDGE BASE · AGENTS · API RUNTIME</p>
        <button type="button" class="enter-button" :disabled="isWarping" @click="handleEnter">
          进入学习空间
        </button>
      </div>
    </div>

    <div class="flash-layer" :class="{ 'flash-layer--active': flashActive }"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["finish"]);

const canvasRef = ref(null);
const entranceLayerRef = ref(null);
const welcomeContentRef = ref(null);

const hideWelcomeCard = ref(false);
const flashActive = ref(false);
const isDismissing = ref(false);

let ctx = null;
let width = 0;
let height = 0;
let centerX = 0;
let centerY = 0;
let animationFrameId = 0;
let warpStartTime = 0;
let currentWarpSpeed = 1.2;
let targetWarpSpeed = 1.2;
let isWarping = false;
let stars = [];
let uiParticles = [];
let flowLights = [];
let mouseTrail = [];
let timeouts = [];
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

const STAR_COUNT = 800;
const MAX_DEPTH = 2500;
const FOV = 450;

function queueTimeout(callback, delay) {
  const timeoutId = window.setTimeout(callback, delay);
  timeouts.push(timeoutId);
  return timeoutId;
}

function clearQueuedTimeouts() {
  timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  timeouts = [];
}

function resizeCanvas() {
  if (!canvasRef.value) {
    return;
  }

  width = canvasRef.value.width = window.innerWidth;
  height = canvasRef.value.height = window.innerHeight;
  centerX = width / 2;
  centerY = height / 2;
}

function handleMouseMove(event) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

class Star {
  constructor() {
    this.x = (Math.random() - 0.5) * width * 5;
    this.y = (Math.random() - 0.5) * height * 5;
    this.z = Math.random() * MAX_DEPTH;
    this.pz = this.z;
    this.color = `hsla(${Math.random() * 40 + 190}, 100%, ${Math.random() * 40 + 60}%, `;
  }

  update() {
    this.pz = this.z;
    this.z -= currentWarpSpeed;

    if (this.z < 1) {
      this.z = MAX_DEPTH;
      this.pz = MAX_DEPTH;
      this.x = (Math.random() - 0.5) * width * 5;
      this.y = (Math.random() - 0.5) * height * 5;
    }
  }

  draw() {
    const offsetX = (mouse.x - centerX) * 0.05;
    const offsetY = (mouse.y - centerY) * 0.05;
    const sx = ((this.x - offsetX) / this.z) * FOV + centerX;
    const sy = ((this.y - offsetY) / this.z) * FOV + centerY;
    const px = ((this.x - offsetX) / this.pz) * FOV + centerX;
    const py = ((this.y - offsetY) / this.pz) * FOV + centerY;
    const size = (1 - this.z / MAX_DEPTH) * 2;
    const alpha = 1 - this.z / MAX_DEPTH;

    ctx.beginPath();
    if (currentWarpSpeed > 5) {
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.lineWidth = size;
      ctx.strokeStyle = this.color + alpha + ")";
      ctx.stroke();
    } else {
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = this.color + alpha + ")";
      ctx.fill();
    }
  }
}

class DissipateParticle {
  constructor(x, y, hue = 200, isUi = false) {
    const angle = isUi ? Math.random() * Math.PI * 2 : Math.random() * Math.PI - Math.PI;
    const speed = isUi ? Math.random() * 15 + 5 : Math.random() * 5 + 2;

    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed + (isUi ? 0 : 5);
    this.size = Math.random() * 3 + 1;
    this.alpha = 1;
    this.decay = Math.random() * 0.02 + 0.015;
    this.color = isUi ? (Math.random() > 0.5 ? "#06b6d4" : "#3b82f6") : `hsl(${hue}, 80%, 60%)`;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.alpha -= this.decay;
  }

  draw() {
    if (this.alpha <= 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class WarpFlowLight {
  constructor() {
    this.reset();
    this.y = Math.random() * height;
  }

  reset() {
    this.x = Math.random() > 0.5 ? -200 : width + 200;
    this.y = -200;
    this.length = Math.random() * 400 + 300;
    this.speed = Math.random() * 40 + 60;
    this.thickness = Math.random() * 4 + 2;
    this.color = Math.random() > 0.5 ? "#06b6d4" : "#8b5cf6";
  }

  update() {
    this.y += this.speed;
    this.x += (centerX - this.x) * 0.02;
    if (this.y > height + this.length) {
      this.reset();
    }
  }

  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.length);
    ctx.quadraticCurveTo(this.x + 50, this.y - this.length / 2, this.x, this.y);
    const gradient = ctx.createLinearGradient(0, this.y - this.length, 0, this.y);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;
    ctx.stroke();
    ctx.restore();
  }
}

function createScene() {
  stars = Array.from({ length: STAR_COUNT }, () => new Star());
  uiParticles = [];
  flowLights = Array.from({ length: 8 }, () => new WarpFlowLight());
  mouseTrail = [];
}

function animate() {
  currentWarpSpeed += (targetWarpSpeed - currentWarpSpeed) * 0.08;
  ctx.fillStyle = isWarping ? "rgba(1, 1, 3, 0.3)" : "rgba(1, 1, 3, 1)";
  ctx.fillRect(0, 0, width, height);

  if (!isWarping) {
    mouseTrail.push({ x: mouse.x, y: mouse.y });
    if (mouseTrail.length > 20) {
      mouseTrail.shift();
    }

    if (mouseTrail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(mouseTrail[0].x, mouseTrail[0].y);
      for (let index = 1; index < mouseTrail.length; index += 1) {
        ctx.lineTo(mouseTrail[index].x, mouseTrail[index].y);
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00f0ff";
      ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  if (isWarping) {
    flowLights.forEach((light) => {
      light.update();
      light.draw();
    });
  }

  stars.forEach((star) => {
    star.update();
    star.draw();
  });

  for (let index = uiParticles.length - 1; index >= 0; index -= 1) {
    uiParticles[index].update();
    uiParticles[index].draw();
    if (uiParticles[index].alpha <= 0) {
      uiParticles.splice(index, 1);
    }
  }

  if (isWarping) {
    const timeElapsed = Date.now() - warpStartTime;
    const expansionRatio = Math.pow(timeElapsed / 1400, 4);
    const vortexRadius = expansionRatio * width * 1.5;

    if (vortexRadius > 0) {
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vortexRadius);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.2, "rgba(6, 182, 212, 0.8)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.arc(centerX, centerY, vortexRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  animationFrameId = window.requestAnimationFrame(animate);
}

function handleEnter() {
  if (isWarping || !welcomeContentRef.value) {
    return;
  }

  const rect = welcomeContentRef.value.getBoundingClientRect();
  hideWelcomeCard.value = true;

  for (let index = 0; index < 300; index += 1) {
    uiParticles.push(new DissipateParticle(
      rect.left + Math.random() * rect.width,
      rect.top + Math.random() * rect.height,
      200,
      true
    ));
  }

  isWarping = true;
  warpStartTime = Date.now();
  targetWarpSpeed = 150;
  mouseTrail = [];

  queueTimeout(() => {
    flashActive.value = true;

    queueTimeout(() => {
      isDismissing.value = true;

      queueTimeout(() => {
        emit("finish");
      }, 450);
    }, 200);
  }, 1300);
}

onMounted(() => {
  ctx = canvasRef.value?.getContext("2d");
  if (!ctx) {
    emit("finish");
    return;
  }

  resizeCanvas();
  createScene();
  animate();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("mousemove", handleMouseMove);
});

onBeforeUnmount(() => {
  clearQueuedTimeouts();
  window.cancelAnimationFrame(animationFrameId);
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("mousemove", handleMouseMove);
});
</script>

<style scoped>
.launch-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  background: #010103;
  color: #ffffff;
  opacity: 1;
  transition: opacity 0.45s ease;
}

.launch-overlay--dismissing {
  opacity: 0;
  pointer-events: none;
}

.entrance-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.8s ease-in-out;
}

.entrance-layer--hidden {
  opacity: 0;
}

.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.welcome-card {
  width: min(680px, calc(100vw - 48px));
  padding: 48px 40px;
  border-radius: 32px;
  text-align: center;
  background: rgba(10, 15, 25, 0.45);
  border: 1px solid rgba(0, 255, 255, 0.1);
  box-shadow: 0 0 50px rgba(0, 150, 255, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.welcome-card--hidden {
  opacity: 0;
  transform: scale(0.9);
  pointer-events: none;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: 16px;
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.4);
  background: rgba(6, 182, 212, 0.1);
  color: #67e8f9;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.3);
}

.welcome-title {
  margin: 0 0 16px;
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  background: linear-gradient(90deg, #93c5fd 0%, #3b82f6 48%, #8b5cf6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.welcome-subtitle {
  margin: 0 0 40px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.22em;
}

.enter-button {
  padding: 16px 48px;
  border: 1px solid rgba(96, 165, 250, 0.5);
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.18em;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.enter-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 40px rgba(56, 189, 248, 0.9);
}

.enter-button:disabled {
  cursor: default;
}

.flash-layer {
  position: absolute;
  inset: 0;
  background: #ffffff;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease-in;
}

.flash-layer--active {
  opacity: 1;
}

@media (max-width: 640px) {
  .welcome-card {
    padding: 36px 24px;
    border-radius: 28px;
  }

  .welcome-subtitle {
    letter-spacing: 0.14em;
  }

  .enter-button {
    width: 100%;
    padding-left: 24px;
    padding-right: 24px;
  }
}
</style>
