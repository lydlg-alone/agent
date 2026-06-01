<template>
  <div class="launch-overlay" :class="{ 'launch-overlay--dismissing': isDismissing }">
    <div ref="entranceLayerRef" class="entrance-layer" :class="{ 'entrance-layer--hidden': isDismissing }">
      <canvas ref="canvasRef" class="particle-canvas"></canvas>
      <div class="nebula-halo nebula-halo--cyan"></div>
      <div class="nebula-halo nebula-halo--violet"></div>

      <div ref="welcomeContentRef" class="welcome-card" :class="{ 'welcome-card--hidden': hideWelcomeCard }">
        <div class="welcome-copy">
          <div class="status-pill">LEARNING WORKSPACE READY</div>
          <h1 class="welcome-title">AI 学习智能体系统</h1>
          <p class="welcome-subtitle">KNOWLEDGE BASE · AGENTS · API RUNTIME</p>
          <button type="button" class="enter-button" :disabled="isWarping" @click="handleEnter">
            进入学习空间
          </button>
        </div>

        <div class="geometry-stage" aria-hidden="true">
          <div class="geometry-orbit geometry-orbit--outer"></div>
          <div class="geometry-orbit geometry-orbit--inner"></div>
          <div class="geometry-core">
            <span class="geometry-face geometry-face--front"></span>
            <span class="geometry-face geometry-face--back"></span>
            <span class="geometry-face geometry-face--right"></span>
            <span class="geometry-face geometry-face--left"></span>
            <span class="geometry-face geometry-face--top"></span>
            <span class="geometry-face geometry-face--bottom"></span>
          </div>
        </div>
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
let gridNodes = [];
let uiParticles = [];
let flowLights = [];
let mouseTrail = [];
let timeouts = [];
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

const STAR_COUNT = 760;
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

function createGridNodes() {
  const spacing = Math.max(96, Math.min(width, height) / 6.8);
  const columns = Math.ceil(width / spacing) + 2;
  const rows = Math.ceil(height / spacing) + 2;

  gridNodes = [];
  for (let row = -1; row < rows; row += 1) {
    for (let column = -1; column < columns; column += 1) {
      const baseX = column * spacing + (row % 2) * spacing * 0.28;
      const baseY = row * spacing;
      gridNodes.push({
        baseX,
        baseY,
        phase: Math.random() * Math.PI * 2,
        drift: Math.random() * 12 + 6
      });
    }
  }
}

function resizeCanvas() {
  if (!canvasRef.value) {
    return;
  }

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  centerX = width / 2;
  centerY = height / 2;
  canvasRef.value.width = Math.floor(width * pixelRatio);
  canvasRef.value.height = Math.floor(height * pixelRatio);
  canvasRef.value.style.width = `${width}px`;
  canvasRef.value.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  createGridNodes();
}

function handleMouseMove(event) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

function drawDeepSpaceBackground(time) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f8fcff");
  gradient.addColorStop(0.42, "#e8f6ff");
  gradient.addColorStop(0.72, "#d9ecf8");
  gradient.addColorStop(1, "#eef8ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const pulse = Math.sin(time * 0.00032) * 0.05 + 0.16;
  const nebula = ctx.createRadialGradient(width * 0.68, height * 0.42, 0, width * 0.68, height * 0.42, Math.max(width, height) * 0.78);
  nebula.addColorStop(0, `rgba(14, 165, 233, ${pulse})`);
  nebula.addColorStop(0.28, "rgba(186, 230, 253, 0.18)");
  nebula.addColorStop(0.68, "rgba(255, 255, 255, 0.2)");
  nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, width, height);

  const violetCloud = ctx.createRadialGradient(width * 0.18, height * 0.72, 0, width * 0.18, height * 0.72, Math.max(width, height) * 0.52);
  violetCloud.addColorStop(0, "rgba(125, 211, 252, 0.2)");
  violetCloud.addColorStop(0.45, "rgba(219, 234, 254, 0.28)");
  violetCloud.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = violetCloud;
  ctx.fillRect(0, 0, width, height);
}

function drawParticleGrid(time) {
  const activeNodes = gridNodes.map((node) => {
    const wave = time * 0.00022 + node.phase;
    return {
      x: node.baseX + Math.cos(wave) * node.drift + (mouse.x - centerX) * 0.006,
      y: node.baseY + Math.sin(wave * 1.3) * node.drift + (mouse.y - centerY) * 0.006
    };
  });

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  activeNodes.forEach((node, index) => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 1.15, 0, Math.PI * 2);
    ctx.fillStyle = index % 3 === 0 ? "rgba(14, 165, 233, 0.18)" : "rgba(59, 130, 246, 0.1)";
    ctx.fill();

    for (let nextIndex = index + 1; nextIndex < activeNodes.length; nextIndex += 1) {
      const next = activeNodes[nextIndex];
      const dx = node.x - next.x;
      const dy = node.y - next.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 150) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(14, 116, 144, ${0.06 * (1 - distance / 150)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });
  ctx.restore();
}

class Star {
  constructor() {
    this.x = (Math.random() - 0.5) * width * 5;
    this.y = (Math.random() - 0.5) * height * 5;
    this.z = Math.random() * MAX_DEPTH;
    this.pz = this.z;
    this.color = `hsla(${Math.random() * 48 + 188}, 100%, ${Math.random() * 36 + 58}%, `;
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
    const size = (1 - this.z / MAX_DEPTH) * 2.2;
    const alpha = Math.max(0, 1 - this.z / MAX_DEPTH);

    ctx.beginPath();
    if (currentWarpSpeed > 5) {
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.lineWidth = size;
      ctx.strokeStyle = this.color + alpha + ")";
      ctx.stroke();
    } else {
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = this.color + alpha * 0.88 + ")";
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
    this.color = Math.random() > 0.5 ? "#38bdf8" : "#93c5fd";
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

function animate(time = 0) {
  currentWarpSpeed += (targetWarpSpeed - currentWarpSpeed) * 0.08;
  if (isWarping) {
    ctx.fillStyle = "rgba(238, 248, 255, 0.24)";
    ctx.fillRect(0, 0, width, height);
  } else {
    drawDeepSpaceBackground(time);
    drawParticleGrid(time);
  }

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
      ctx.strokeStyle = "rgba(0, 240, 255, 0.42)";
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
    const expansionRatio = Math.pow(Math.min(timeElapsed / 1800, 1.25), 2.25);
    const vortexRadius = expansionRatio * width * 1.18;

    if (vortexRadius > 0) {
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vortexRadius);
      gradient.addColorStop(0, "rgba(224, 242, 254, 0.34)");
      gradient.addColorStop(0.26, "rgba(56, 189, 248, 0.26)");
      gradient.addColorStop(0.58, "rgba(147, 197, 253, 0.16)");
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

  for (let index = 0; index < 180; index += 1) {
    uiParticles.push(new DissipateParticle(
      rect.left + Math.random() * rect.width,
      rect.top + Math.random() * rect.height,
      200,
      true
    ));
  }

  isWarping = true;
  warpStartTime = Date.now();
  targetWarpSpeed = 82;
  mouseTrail = [];

  queueTimeout(() => {
    flashActive.value = true;

    queueTimeout(() => {
      isDismissing.value = true;

      queueTimeout(() => {
        emit("finish");
      }, 620);
    }, 420);
  }, 1450);
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
  background:
    radial-gradient(circle at 68% 38%, rgba(125, 211, 252, 0.42), transparent 36%),
    radial-gradient(circle at 18% 76%, rgba(219, 234, 254, 0.62), transparent 34%),
    linear-gradient(135deg, #f8fcff 0%, #e8f6ff 42%, #dceef8 72%, #f4fbff 100%);
  color: #123047;
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
  padding: 32px;
  isolation: isolate;
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

.nebula-halo {
  position: absolute;
  z-index: 0;
  border-radius: 999px;
  filter: blur(52px);
  opacity: 0.46;
  pointer-events: none;
  transform-origin: center;
  animation: nebula-drift 18s linear infinite;
}

.nebula-halo--cyan {
  width: min(620px, 58vw);
  height: min(620px, 58vw);
  right: 10vw;
  top: 8vh;
  background: conic-gradient(from 90deg, transparent, rgba(125, 211, 252, 0.36), transparent, rgba(255, 255, 255, 0.56), transparent);
}

.nebula-halo--violet {
  width: min(520px, 54vw);
  height: min(520px, 54vw);
  left: 7vw;
  bottom: 2vh;
  background: conic-gradient(from 260deg, transparent, rgba(186, 230, 253, 0.42), transparent, rgba(14, 165, 233, 0.16), transparent);
  animation-direction: reverse;
  animation-duration: 24s;
}

.welcome-card {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  align-items: center;
  gap: 36px;
  width: min(960px, calc(100vw - 48px));
  min-height: 360px;
  padding: 54px 56px;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(235, 248, 255, 0.5)),
    rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.82);
  box-shadow:
    0 34px 90px rgba(55, 125, 166, 0.16),
    0 0 120px rgba(125, 211, 252, 0.22),
    0 0 220px rgba(255, 255, 255, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    inset 0 0 44px rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(36px) saturate(1.35);
  -webkit-backdrop-filter: blur(36px) saturate(1.35);
  isolation: isolate;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.welcome-card::before {
  position: absolute;
  inset: -2px;
  z-index: -1;
  border-radius: inherit;
  content: "";
  background: linear-gradient(120deg, rgba(125, 211, 252, 0.36), rgba(255, 255, 255, 0.52), rgba(14, 165, 233, 0.22));
  filter: blur(22px);
  opacity: 0.6;
}

.welcome-card::after {
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  content: "";
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent) 0 0 / 180% 1px no-repeat,
    radial-gradient(circle at 78% 22%, rgba(125, 211, 252, 0.18), transparent 28%);
  pointer-events: none;
}

.welcome-card--hidden {
  opacity: 0;
  transform: scale(0.9);
  pointer-events: none;
}

.welcome-copy {
  position: relative;
  z-index: 1;
  text-align: left;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: 18px;
  border-radius: 999px;
  border: 1px solid rgba(14, 165, 233, 0.28);
  background: rgba(255, 255, 255, 0.58);
  color: #0f82bd;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.22em;
  user-select: none;
  -webkit-user-select: none;
  box-shadow: 0 0 18px rgba(125, 211, 252, 0.24), inset 0 0 18px rgba(255, 255, 255, 0.58);
}

.welcome-title {
  max-width: none;
  margin: 0 0 18px;
  font-size: clamp(38px, 4.8vw, 62px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.04;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
  background: linear-gradient(96deg, #123047 0%, #176a9b 38%, #0ea5e9 66%, #7dd3fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 30px rgba(125, 211, 252, 0.32);
}

.welcome-subtitle {
  margin: 0 0 42px;
  color: rgba(73, 103, 125, 0.86);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.22em;
  user-select: none;
  -webkit-user-select: none;
}

.enter-button {
  position: relative;
  min-width: 218px;
  padding: 16px 42px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0)),
    linear-gradient(135deg, #0ea5e9 0%, #38bdf8 52%, #7dd3fc 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.14em;
  cursor: pointer;
  box-shadow:
    0 18px 42px rgba(14, 165, 233, 0.24),
    0 0 0 1px rgba(255, 255, 255, 0.36) inset,
    0 0 18px rgba(125, 211, 252, 0.48);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.enter-button::before {
  position: absolute;
  inset: -40% -24%;
  content: "";
  background: linear-gradient(110deg, transparent 28%, rgba(255, 255, 255, 0.52) 48%, transparent 68%);
  transform: translateX(-80%);
  transition: transform 0.55s ease;
}

.enter-button::after {
  position: absolute;
  inset: 2px;
  border-radius: inherit;
  content: "";
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.16);
  opacity: 0.8;
}

.enter-button:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 24px 58px rgba(14, 165, 233, 0.34),
    0 0 0 1px rgba(255, 255, 255, 0.48) inset,
    0 0 24px rgba(125, 211, 252, 0.58),
    0 0 56px rgba(186, 230, 253, 0.62);
}

.enter-button:hover:not(:disabled)::before {
  transform: translateX(82%);
}

.enter-button:hover:not(:disabled)::after {
  animation: current-ripple 0.72s linear infinite;
}

.enter-button:disabled {
  cursor: default;
}

.geometry-stage {
  position: relative;
  z-index: 1;
  width: 240px;
  height: 240px;
  justify-self: center;
  perspective: 760px;
  transform-style: preserve-3d;
  filter: drop-shadow(0 0 34px rgba(14, 165, 233, 0.24));
}

.geometry-stage::before {
  position: absolute;
  inset: 38px;
  border-radius: 999px;
  content: "";
  background: radial-gradient(circle, rgba(125, 211, 252, 0.32), rgba(255, 255, 255, 0.28) 48%, transparent 72%);
  filter: blur(14px);
  animation: geometry-pulse 4.2s ease-in-out infinite;
}

.geometry-orbit {
  position: absolute;
  inset: 26px;
  border: 1px solid rgba(125, 211, 252, 0.34);
  border-radius: 50%;
  transform-style: preserve-3d;
  box-shadow: 0 0 22px rgba(14, 165, 233, 0.14);
}

.geometry-orbit--outer {
  animation: orbit-spin 9s linear infinite;
}

.geometry-orbit--inner {
  inset: 56px;
  border-color: rgba(14, 165, 233, 0.28);
  transform: rotateX(66deg) rotateZ(18deg);
  animation: orbit-spin-reverse 7s linear infinite;
}

.geometry-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 88px;
  height: 88px;
  transform-style: preserve-3d;
  transform: translate(-50%, -50%) rotateX(-22deg) rotateY(34deg);
  animation: cube-rotate 8s ease-in-out infinite;
}

.geometry-face {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.78);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(125, 211, 252, 0.22)),
    rgba(255, 255, 255, 0.34);
  box-shadow:
    inset 0 0 22px rgba(255, 255, 255, 0.34),
    0 0 18px rgba(14, 165, 233, 0.16);
  backdrop-filter: blur(8px);
}

.geometry-face--front {
  transform: translateZ(44px);
}

.geometry-face--back {
  transform: rotateY(180deg) translateZ(44px);
}

.geometry-face--right {
  transform: rotateY(90deg) translateZ(44px);
}

.geometry-face--left {
  transform: rotateY(-90deg) translateZ(44px);
}

.geometry-face--top {
  transform: rotateX(90deg) translateZ(44px);
}

.geometry-face--bottom {
  transform: rotateX(-90deg) translateZ(44px);
}

.flash-layer {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.58), rgba(125, 211, 252, 0.24) 34%, rgba(219, 234, 254, 0.16) 68%, transparent 100%),
    linear-gradient(135deg, rgba(186, 230, 253, 0.18), rgba(14, 165, 233, 0.12));
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.75s ease-out;
}

.flash-layer--active {
  opacity: 0.62;
}

@keyframes nebula-drift {
  from {
    transform: rotate(0deg) scale(1);
  }

  50% {
    transform: rotate(180deg) scale(1.08);
  }

  to {
    transform: rotate(360deg) scale(1);
  }
}

@keyframes current-ripple {
  0% {
    box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.18), 0 0 0 rgba(125, 211, 252, 0);
  }

  50% {
    box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.24), 0 0 18px rgba(125, 211, 252, 0.38);
  }

  100% {
    box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.18), 0 0 0 rgba(125, 211, 252, 0);
  }
}

@keyframes geometry-pulse {
  0%,
  100% {
    opacity: 0.72;
    transform: scale(0.92);
  }

  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@keyframes orbit-spin {
  from {
    transform: rotateX(68deg) rotateZ(0deg);
  }

  to {
    transform: rotateX(68deg) rotateZ(360deg);
  }
}

@keyframes orbit-spin-reverse {
  from {
    transform: rotateX(66deg) rotateZ(18deg);
  }

  to {
    transform: rotateX(66deg) rotateZ(-342deg);
  }
}

@keyframes cube-rotate {
  0%,
  100% {
    transform: translate(-50%, -50%) rotateX(-22deg) rotateY(34deg);
  }

  50% {
    transform: translate(-50%, -50%) rotateX(28deg) rotateY(214deg);
  }
}

@media (max-width: 760px) {
  .entrance-layer {
    padding: 20px;
  }

  .welcome-card {
    grid-template-columns: 1fr;
    gap: 24px;
    min-height: 0;
    padding: 38px 26px;
    border-radius: 24px;
  }

  .welcome-copy {
    text-align: center;
  }

  .welcome-subtitle {
    margin-bottom: 32px;
    letter-spacing: 0.14em;
  }

  .welcome-title {
    font-size: clamp(26px, 8.2vw, 42px);
  }

  .enter-button {
    width: 100%;
    min-width: 0;
    padding-left: 24px;
    padding-right: 24px;
  }

  .geometry-stage {
    width: 178px;
    height: 178px;
    order: -1;
  }

  .geometry-core {
    width: 68px;
    height: 68px;
  }

  .geometry-face--front {
    transform: translateZ(34px);
  }

  .geometry-face--back {
    transform: rotateY(180deg) translateZ(34px);
  }

  .geometry-face--right {
    transform: rotateY(90deg) translateZ(34px);
  }

  .geometry-face--left {
    transform: rotateY(-90deg) translateZ(34px);
  }

  .geometry-face--top {
    transform: rotateX(90deg) translateZ(34px);
  }

  .geometry-face--bottom {
    transform: rotateX(-90deg) translateZ(34px);
  }
}
</style>
