# 🎮 Gexus: AI Game Studio

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

[English](#english) | [中文说明](#中文说明)

<a name="english"></a>
## 📖 Overview
Gexus is an innovative, Gemini-inspired web application that empowers users to generate, edit, and manage playable HTML5 games instantly using Google's Gemini AI models. Simply describe your game idea, and watch the AI build a playable "White Box" prototype in seconds.

## ✨ Features
*   🤖 **AI-Powered Generation**: Turn text prompts into playable prototypes using Gemini 3 Pro/Flash.
*   🎨 **Gemini-Style UI**: Clean, responsive dark-mode interface (`slate-950`) with a collapsible sidebar.
*   🛠️ **Studio Editor**: Inspect generated code, manage game assets, tweak parameters, and iterate on your game's logic.
*   🌍 **Bilingual Support**: Fully supports English and Chinese (Simplified).
*   🔑 **Bring Your Own Key (BYOK)**: Securely store your Gemini API key locally in the browser.
*   💾 **Local Persistence**: All projects, versions, and settings are saved locally via `localStorage`.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gexus-ai-studio.git
   cd gexus-ai-studio
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Usage
1. Open the app in your browser (usually `http://localhost:3000`).
2. Click the **Settings** (⚙️) icon in the sidebar.
3. Enter your **Gemini API Key** (Get one from [Google AI Studio](https://aistudio.google.com/)).
4. Click **New Project** and describe your game idea!

## 🛠️ Tech Stack
*   **Frontend**: React, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **AI Integration**: Google Gemini API (`@google/genai`)

---

<a name="中文说明"></a>
## 📖 项目简介 (Overview)
Gexus 是一款受 Gemini 界面启发的创新型 Web 应用，用户可以通过 Google 的 Gemini AI 模型，通过自然语言描述瞬间生成、编辑和管理可玩的 HTML5 网页游戏。

## ✨ 核心特性 (Features)
*   🤖 **AI 驱动生成**: 使用 Gemini 3 Pro/Flash 模型，将文本提示转化为可玩的“白盒”原型。
*   🎨 **Gemini 风格 UI**: 干净、响应式的深色模式界面，配备可折叠侧边栏，提供沉浸式体验。
*   🛠️ **Studio 工作室**: 检查生成的代码，管理游戏素材，调整参数，并迭代游戏逻辑。
*   🌍 **双语支持**: 原生支持英文和简体中文。
*   🔑 **自带 API Key (BYOK)**: 在浏览器本地安全地存储您的 Gemini API Key。
*   💾 **本地存储**: 所有项目、版本历史和设置均通过 `localStorage` 安全保存在本地，保护隐私。

## 🚀 快速开始 (Getting Started)

### 环境要求
*   Node.js (v18 或更高版本)
*   npm 或 yarn

### 安装步骤
1. 克隆仓库:
   ```bash
   git clone https://github.com/yourusername/gexus-ai-studio.git
   cd gexus-ai-studio
   ```
2. 安装依赖:
   ```bash
   npm install
   ```
3. 启动开发服务器:
   ```bash
   npm run dev
   ```

### 使用指南
1. 在浏览器中打开应用 (通常为 `http://localhost:3000`)。
2. 点击侧边栏的 **设置** (⚙️) 图标。
3. 输入您的 **Gemini API Key** (可在 [Google AI Studio](https://aistudio.google.com/) 免费获取)。
4. 点击 **新项目 (New Project)**，输入您的游戏创意，开始生成！

## 📄 License
This project is licensed under the MIT License.
