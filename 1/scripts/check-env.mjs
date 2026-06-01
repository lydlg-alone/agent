import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const [major, minor] = process.versions.node.split(".").map((value) => Number(value));

if (Number.isNaN(major) || major < 18 || (major === 18 && minor < 18)) {
  console.error(`Node.js ${process.version} 不满足要求。请使用 Node.js 18.18 或更高版本。`);
  process.exit(1);
}

const requiredPackages = [
  "vue",
  "vue-router",
  "pinia",
  "axios",
  "element-plus",
  "echarts",
  "marked",
  "dompurify",
  "highlight.js",
  "katex",
  "express",
  "better-sqlite3",
  "mammoth",
  "pdf-parse",
  "electron"
];

const missingPackages = [];

for (const packageName of requiredPackages) {
  try {
    require.resolve(packageName);
  } catch {
    missingPackages.push(packageName);
  }
}

if (missingPackages.length) {
  console.error("以下依赖未安装完整：");
  for (const packageName of missingPackages) {
    console.error(`- ${packageName}`);
  }
  console.error('请在项目目录执行 "npm ci" 或 "npm install" 后重试。');
  process.exit(1);
}

console.log(`依赖环境检查通过。Node.js ${process.version}`);
