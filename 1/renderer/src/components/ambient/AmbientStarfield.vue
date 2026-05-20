<template>
  <div class="ambient-starfield" aria-hidden="true">
    <div class="ambient-starfield__wash ambient-starfield__wash--one"></div>
    <div class="ambient-starfield__wash ambient-starfield__wash--two"></div>
    <div class="ambient-starfield__wash ambient-starfield__wash--three"></div>
    <div class="ambient-starfield__dust"></div>
    <canvas ref="canvasRef" class="ambient-starfield__canvas"></canvas>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const canvasRef = ref(null);

let ctx = null;
let animationFrameId = 0;
let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
const mouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2
};

function getParticleCount() {
  const area = window.innerWidth * window.innerHeight;
  if (area < 500000) {
    return 56;
  }
  if (area < 1100000) {
    return 82;
  }
  return 112;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

class Particle {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = initial ? Math.random() * width : (Math.random() > 0.5 ? -30 : width + 30);
    this.y = initial ? Math.random() * height : Math.random() * height;
    this.size = randomBetween(0.55, 1.8);
    this.speedX = randomBetween(-0.035, 0.035);
    this.speedY = randomBetween(-0.03, 0.08);
    this.alpha = randomBetween(0.2, 0.72);
    this.twinkle = randomBetween(0, Math.PI * 2);
    this.twinkleSpeed = randomBetween(0.003, 0.012);
    this.hue = [205, 214, 224, 235][Math.floor(Math.random() * 4)];
  }

  update() {
    const driftX = (mouse.x - width / 2) * 0.000018 * this.size;
    const driftY = (mouse.y - height / 2) * 0.000018 * this.size;

    this.x += this.speedX + driftX;
    this.y += this.speedY + driftY;
    this.twinkle += this.twinkleSpeed;

    if (this.y > height + 30 || this.x < -40 || this.x > width + 40) {
      this.reset();
      this.y = -12;
    }
  }

  draw() {
    const shimmer = (Math.sin(this.twinkle) + 1) * 0.18;
    const alpha = Math.min(1, this.alpha + shimmer);
    const radius = this.size * (1 + shimmer * 0.28);

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 5);
    gradient.addColorStop(0, `hsla(${this.hue}, 100%, 96%, ${alpha})`);
    gradient.addColorStop(0.45, `hsla(${this.hue}, 90%, 80%, ${alpha * 0.18})`);
    gradient.addColorStop(1, `hsla(${this.hue}, 90%, 70%, 0)`);

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, radius * 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `hsla(${this.hue}, 100%, 98%, ${Math.min(1, alpha + 0.05)})`;
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function resizeCanvas() {
  if (!canvasRef.value || !ctx) {
    return;
  }

  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  canvasRef.value.width = Math.round(width * dpr);
  canvasRef.value.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  particles = Array.from({ length: getParticleCount() }, () => new Particle());
}

function handleMouseMove(event) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

function drawBackgroundDust() {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.008)");
  gradient.addColorStop(0.45, "rgba(112, 145, 255, 0.018)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0.004)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  drawBackgroundDust();

  particles.forEach((particle) => {
    particle.update();
    particle.draw();
  });

  animationFrameId = window.requestAnimationFrame(animate);
}

onMounted(() => {
  ctx = canvasRef.value?.getContext("2d");
  if (!ctx) {
    return;
  }

  resizeCanvas();
  animate();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("mousemove", handleMouseMove);
});

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrameId);
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("mousemove", handleMouseMove);
});
</script>

<style scoped>
.ambient-starfield {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(circle at 18% 14%, rgba(121, 137, 255, 0.16), transparent 24%),
    radial-gradient(circle at 78% 12%, rgba(106, 157, 255, 0.13), transparent 26%),
    radial-gradient(circle at 62% 68%, rgba(255, 255, 255, 0.05), transparent 18%),
    linear-gradient(180deg, #1a2029 0%, #161b23 54%, #11161f 100%);
}

.ambient-starfield__wash {
  position: absolute;
  border-radius: 999px;
  filter: blur(60px);
  opacity: 0.42;
  animation: drift 22s ease-in-out infinite alternate;
}

.ambient-starfield__wash--one {
  top: -12%;
  left: -10%;
  width: 34vw;
  height: 22vw;
  background: radial-gradient(circle, rgba(118, 135, 255, 0.28), rgba(60, 76, 108, 0.12) 42%, transparent 74%);
}

.ambient-starfield__wash--two {
  top: 10%;
  right: -8%;
  width: 30vw;
  height: 20vw;
  background: radial-gradient(circle, rgba(108, 162, 255, 0.2), rgba(42, 58, 86, 0.1) 48%, transparent 76%);
  animation-duration: 26s;
}

.ambient-starfield__wash--three {
  bottom: -14%;
  left: 28%;
  width: 40vw;
  height: 18vw;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.11), rgba(51, 61, 77, 0.08) 52%, transparent 80%);
  animation-duration: 30s;
}

.ambient-starfield__dust {
  position: absolute;
  inset: 0;
  opacity: 0.42;
  background-image:
    radial-gradient(circle at 18% 26%, rgba(255, 255, 255, 0.28) 0 1px, transparent 1.5px),
    radial-gradient(circle at 34% 68%, rgba(148, 180, 255, 0.18) 0 1px, transparent 1.5px),
    radial-gradient(circle at 62% 22%, rgba(255, 255, 255, 0.22) 0 1px, transparent 1.6px),
    radial-gradient(circle at 84% 42%, rgba(140, 175, 255, 0.16) 0 1px, transparent 1.4px),
    radial-gradient(circle at 72% 78%, rgba(255, 255, 255, 0.2) 0 1px, transparent 1.5px);
  background-size: 420px 420px, 560px 560px, 500px 500px, 620px 620px, 460px 460px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.3));
}

.ambient-starfield__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(1.6%, -1.8%, 0) scale(1.04);
  }
}
</style>
