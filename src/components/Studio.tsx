
import { Game, GameVersion, CodeSnapshot, ProjectAsset, Asset, User } from '../types';
import { streamGameModification, streamCodeAssistant, updateGameMetadata, Attachment, generateAutoplayAgent, generateGameThumbnail, adaptImportedGame, generateNextSteps, restoreCodeAssets } from '../services/geminiService';
import { apiFetchGameById, apiUploadFile, apiDeleteGameVersion, apiSaveVersionSnapshot, apiDeleteVersionSnapshot, apiUpdateGameMetadata, embedGameDataToCode, apiUpdateGameVersion } from '../services/storage';
import { LayoutDashboard, ArrowLeft, ArrowRight, Play, Cpu, Loader2, Sparkles, Send, Maximize2, Minimize2, RotateCcw, RotateCw, Globe, Code as CodeIcon, History, FileCode, FileType, FileJson, Check, X, Bot, ChevronRight, Wand2, Bug, MessageCircleQuestion, MessageSquare, Clock, GitCommit, Gamepad2, Smartphone, Settings, MonitorPlay, ZoomIn, ZoomOut, Hand, Palette, Music, Music2, Layout, Zap, Info, Box, Paperclip, Film, Image as ImageIcon, Plus, Trash2, FileAudio, MousePointer2, Link, Search, ShieldCheck, Coins, Tv, Laptop, ShoppingBag, ImagePlus, PenTool, Upload, ChevronLeft, Download, FileUp, Minus, Ban, StopCircle, RefreshCw, Share2, Hash, Sliders, Edit3, ChevronDown, Lock, FileText, ChevronUp, AlertCircle } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import GameRunner from './GameRunner';

const VersionSummary = ({ summary }: { summary: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (textRef.current) {
            setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
        }
    }, [summary]);

    return (
        <div className="relative w-full">
            <p 
                ref={textRef}
                className={`text-[12px] text-slate-200 leading-relaxed font-medium whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}
            >
                {summary}
            </p>
            {(isTruncated || isExpanded) && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold mt-1 flex items-center gap-1"
                >
                    {isExpanded ? (
                        <><ChevronUp size={10} /> Show Less</>
                    ) : (
                        <><ChevronDown size={10} /> Read More</>
                    )}
                </button>
            )}
        </div>
    );
};

interface StudioProps {
  games: Game[];
  onUpdateGame: (updatedGame: Game, persist?: boolean) => void;
  onDeleteGame: (gameId: string) => void;
  onCreateNew: () => void;
  onGameImported?: (game: Game) => void; 
  onEditingChange?: (isEditing: boolean) => void;
  libraryAssets: Asset[];
  language: 'en' | 'zh';
  projectToLoad?: Game | null; 
  onProjectLoaded?: () => void; 
  currentUser: User | null;
  onBusyChange?: (isBusy: boolean) => void; 
  onBack?: () => void;
  dashboardTrigger?: number;
  onProjectChange?: (projectId: string | null) => void;
}

type WorkbenchTab = 'director' | 'code' | 'inspector';
type FileTypeTab = 'html' | 'css' | 'js';
type AIState = 'idle' | 'thinking' | 'speaking';
type ModificationType = 'logic' | 'art' | 'music';

interface AssetSlot {
  variableName: string;
  displayName: string;
  currentValue: string;
}

interface NumberSlot {
  variableName: string;
  currentValue: number;
}

const MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro' },
];

const TEXT = {
  en: {
    myStudio: "MY STUDIO",
    projectsActive: "Projects Active",
    importHtml: "Import HTML",
    adapting: "Adapting...",
    importing: "Importing...",
    createProto: "Create New Prototype",
    createPrompt: "Prompt your next viral hit with AI",
    noProjects: "No projects found",
    deleteTooltip: "Delete Prototype",
    confirmDelete: "Confirm Delete",
    cancel: "Cancel",
    panTool: "Pan Tool (Drag to move view)",
    viewportSettings: "Viewport Settings",
    resetView: "Reset View",
    zoom: "Zoom",
    fullScreen: "Full Screen (Responsive)",
    mobilePortrait: "Mobile Portrait (360x640)",
    mobileLandscape: "Mobile Landscape (640x360)",
    live: "Live",
    publish: "Publish",
    export: "Export",
    director: "DIRECTOR",
    code: "CODE",
    inspector: "INSPECTOR",
    gameConfig: "Game Config",
    devKit: "Dev Kit",
    zeroCode: "Zero-Code Dev Kit",
    refreshSuggestions: "Refresh Suggestions",
    aiSuggestions: "AI Suggestions",
    standardTasks: "Standard Tasks",
    apply: "Apply",
    analyzeCode: "Analyze Code for Ideas",
    compliance: "AIGC Compliance Audit",
    currentImpl: "Current Implementation",
    activeControls: "Active Controls",
    baseOriginal: "Base Original",
    initialGen: "Initial Generation",
    noManualSaves: "No manual saves yet.",
    active: "Active",
    describeChanges: "Describe changes (mention asset name)...",
    smartInspector: "SMART INSPECTOR",
    bindAssets: "Bind assets to game logic components.",
    addAsset: "ADD ASSET",
    fromDevice: "From Device",
    uploadLocal: "Upload local file",
    fromLibrary: "From Library",
    useAcquired: "Use acquired assets",
    sceneLogic: "Scene Logic Slots",
    parameters: "Game Parameters",
    tweakHint: "Tweak numeric values found in code.",
    replace: "Replace",
    connectAsset: "Connect Asset",
    removeAsset: "Remove Asset",
    clearSlot: "Clear slot",
    selectLibAsset: "Select Library Asset",
    libraryEmpty: "Library is empty",
    projectLibrary: "Project Library",
    noAssets: "No assets",
    aiRefactor: "AI Refactor",
    customUsage: "Custom usage:",
    custom: "+ Custom",
    copilotChat: "Copilot Chat",
    askAnything: "Ask me anything...",
    editThis: "Edit this...",
    stop: "Stop",
    publishFeed: "Publish to Feed",
    releaseVer: "Release Version",
    previewCard: "Game Card Preview",
    editInfo: "Edit Game Info",
    enableAutoplay: "Enable AI Autoplay (Attract Mode)",
    recommended: "Recommended",
    autoplayDesc: "Gemini will analyze your source code and generate a bot script to play the game automatically in the feed.",
    releaseNow: "Release Now",
    gameTitle: "Game Title",
    coverArt: "Cover Artwork",
    noCover: "No Cover",
    aiGen: "AI Generate",
    upload: "Upload",
    descImage: "Describe image...",
    description: "Description",
    done: "Done",
    designingAgent: "Designing AI Agent...",
    agentDesc: "Reading game logic, identifying controls, and synthesizing input script.",
    published: "PUBLISHED!",
    liveMsg: "Your game is live on the feed.",
    agentAttached: "+ AI Autoplay Agent Attached",
    myLibrary: "My Library",
    noAssetsCat: "No assets in this category.",
    assetPreview: "Asset Preview",
    download: "Download",
    mechanics: "Core Mechanics",
    visuals: "Art & Visuals",
    audio: "Audio & SFX",
    ui: "Interface (UI)",
    polish: "Juice & Polish",
    explain: "Explain",
    refactor: "Refactor",
    fix: "Fix",
    initializing: "Initializing Neural Link...",
    synthesisFailed: "Error: Synthesis Failed",
    updateComplete: "Update Complete!",
    restoringAssets: "Restoring Assets...",
    updatingConfig: "Updating Configuration...",
    finalizingBuild: "Finalizing Build...",
    cancelled: "Cancelled by user.",
    mapToPlayer: "Map to Player",
    mapToBg: "Map to Background",
    mapToItem: "Map to Collectible",
    mapToEnemy: "Map to Enemy",
    mapToMusic: "Set as BGM",
    mapToSfx: "Set as SFX",
    versionHistory: "Version History",
    reference: "Reference",
    devKitHintPre: "Use the ",
    devKitHintBold: "Dev Kit",
    devKitHintPost: " above to start iterating,",
    devKitHintLine2: "or type a custom command below.",
    copilotPlaceholder: "Ask \"Where is the movement logic?\" or highlight code to modify it.",
    copilotGreeting: "Hi! I'm your Code Copilot. Select any code to refactor it, or ask me questions directly!",
    versionLabel: "Version",
    oneClickGen: "One-Click Generate",
    publishingTag: "PUBLISHED", 
    importedProject: "Imported Project",
    initialImport: "Initial Import & Auto-Adaptation",
    importInstr: "Imported Game. Touch to interact.",
    studioAiModel: "Studio AI Model",
    genModel: "Generated by",
    act_phys: "Smoother Physics",
    act_score: "Score Counter",
    act_win: "Win/Loss Logic",
    act_sprite: "Gen Player Sprite",
    act_palette: "Color Palette",
    act_bg: "Gen Background",
    act_sfx: "Synth SFX",
    act_music: "Gen Music Loop",
    act_start: "Start Screen",
    act_restart: "Restart Button",
    act_res: "Fix Resolution",
    act_mobile: "Mobile Controls",
    act_shake: "Screen Shake",
    act_particle: "Particle FX",
    act_trans: "UI Transitions",
    act_phys_prompt: "Adjust the game physics to make the movement feel smoother and slightly faster.",
    act_score_prompt: "Add a score counter that increases when the player succeeds, and display it clearly.",
    act_win_prompt: "Implement a 'Game Over' state when the player fails, and a victory state if they reach a certain score.",
    act_sprite_prompt: "Replace the player object with a generated pixel art sprite that matches the game theme.",
    act_palette_prompt: "Update the game's color scheme to a cohesive, professional palette (e.g. Neon, Pastel, or Retro).",
    act_bg_prompt: "Add a static or scrolling background pattern/image to replace the plain background.",
    act_sfx_prompt: "Implement synthesized sound effects (using Web Audio API) for jumping, collecting items, and game over.",
    act_music_prompt: "Use oscillators to generate a simple, looping background melody that fits the mood.",
    act_start_prompt: "Create a stylish 'Start Screen' overlay with a Play button and the game title.",
    act_restart_prompt: "Ensure there is a visible Restart button shown on the Game Over screen.",
    act_res_prompt: "Fix the canvas resolution issues. Ensure canvas.width and canvas.height are explicitly set to match game constants to avoid cut-off graphics.",
    act_mobile_prompt: "Add on-screen touch controls (buttons/joystick) for better mobile playability.",
    act_shake_prompt: "Add a screen shake effect when the player takes damage or hits an obstacle.",
    act_particle_prompt: "Add particle explosions when an objective is achieved or an enemy is defeated.",
    act_trans_prompt: "Add CSS transitions or animations for UI elements appearing and disappearing.",
    generating: "Generating... (Click to Cancel)",
    publishedSuccess: "Published Successfully",
    publishFailed: "Publish Failed",
    chat: {
      injected: (asset: string, slot: string) => `Neural link established. Injected "${asset}" into "${slot}". Hot-reloading...`,
      removed: (slot: string) => `Removed asset from "${slot}".`,
      imported: "Game imported! I've automatically refactored the canvas logic and touch controls to ensure compatibility with our platform.",
      coverGen: (prompt: string) => `New cover art generated for "${prompt}"!`,
      refactored: "Code refactored.",
      reverted: "Reverted to Base version.",
      manualSave: "Changes saved manually. Running new build...",
      loadedSnapshot: (label: string) => `Loaded snapshot: ${label}`,
      stopped: "[Response stopped by user]",
      error: "I encountered an error processing that request.",
      findError: "I tried to apply the fix but couldn't find the exact code block to replace. Please try selecting the problematic code or ask me to rewrite the whole file.",
      versionDeleted: "Version deleted successfully.",
      deleteVersionError: "Failed to delete version.",
      confirmDeleteVersion: "Confirm delete version? This action cannot be undone."
    },
    importAi: "✨ AI Adaptive",
    importDirect: "⚡ Direct Import",
    importAiDesc: "AI-powered code refactoring & asset binding for platform adaptation.",
    importDirectDesc: "Raw code import without AI changes.",
    selectMode: "Select Import Mode"
  },
  zh: {
    myStudio: "我的工作室",
    projectsActive: "个活跃项目",
    importHtml: "导入 HTML",
    adapting: "适配中...",
    importing: "导入中...",
    createProto: "创建新原型",
    createPrompt: "用 AI 开启你的下一个爆款",
    noProjects: "未找到项目",
    deleteTooltip: "删除原型",
    confirmDelete: "确认删除",
    cancel: "取消",
    panTool: "平移工具 (拖动移动视图)",
    viewportSettings: "视图设置",
    resetView: "重置视图",
    zoom: "缩放",
    fullScreen: "全屏 (响应式)",
    mobilePortrait: "手机竖屏 (360x640)",
    mobileLandscape: "手机横屏 (640x360)",
    live: "已上线",
    publish: "发布",
    export: "导出",
    director: "导演",
    code: "代码",
    inspector: "检查器",
    gameConfig: "游戏配置",
    devKit: "开发套件",
    zeroCode: "零代码开发套件",
    refreshSuggestions: "刷新建议",
    aiSuggestions: "AI 建议",
    standardTasks: "标准任务",
    apply: "应用",
    analyzeCode: "分析代码寻找灵感",
    compliance: "AIGC 合规审计",
    currentImpl: "当前实现",
    activeControls: "活跃控制",
    baseOriginal: "原始版本",
    initialGen: "初始生成",
    noManualSaves: "暂无手动保存。",
    active: "活跃",
    describeChanges: "描述更改 (提及素材名称)...",
    smartInspector: "智能检查器",
    bindAssets: "将素材绑定到游戏逻辑组件。",
    addAsset: "添加素材",
    fromDevice: "从设备",
    uploadLocal: "上传本地文件",
    fromLibrary: "从素材库",
    useAcquired: "使用已获取的素材",
    sceneLogic: "场景逻辑槽位",
    parameters: "游戏参数",
    tweakHint: "调整代码中发现的数值。",
    replace: "替换",
    connectAsset: "连接素材",
    removeAsset: "移除素材",
    clearSlot: "清空槽位",
    selectLibAsset: "选择库素材",
    libraryEmpty: "素材库为空",
    projectLibrary: "项目素材库",
    noAssets: "暂无素材",
    aiRefactor: "AI 重构",
    customUsage: "自定义用途：",
    custom: "+ 自定义",
    copilotChat: "副驾驶聊天",
    askAnything: "问我任何事情...",
    editThis: "编辑此内容...",
    stop: "停止",
    publishFeed: "发布到信息流",
    releaseVer: "发布版本",
    previewCard: "游戏卡片预览",
    editInfo: "编辑游戏信息",
    enableAutoplay: "启用 AI 自动试玩 (吸引模式)",
    recommended: "推荐",
    autoplayDesc: "Gemini 将分析您的源代码并生成一个机器人脚本，以便在信息流中自动游玩游戏。",
    releaseNow: "立即发布",
    gameTitle: "游戏标题",
    coverArt: "封面艺术",
    noCover: "暂无封面",
    aiGen: "AI 生成",
    upload: "上传",
    descImage: "描述图片...",
    description: "描述",
    done: "完成",
    designingAgent: "正在设计 AI 代理...",
    agentDesc: "正在读取游戏逻辑，识别控制，并合成输入脚本。",
    published: "已发布！",
    liveMsg: "您的游戏已在信息流上线。",
    agentAttached: "+ 已附带 AI 自动试玩代理",
    myLibrary: "我的素材库",
    noAssetsCat: "此分类暂无素材。",
    assetPreview: "素材预览",
    download: "下载",
    mechanics: "核心机制",
    visuals: "美术与视觉",
    audio: "音频与音效",
    ui: "界面 (UI)",
    polish: "润色与打磨",
    explain: "解释",
    refactor: "重构",
    fix: "修复",
    initializing: "正在初始化神经链接...",
    synthesisFailed: "错误：合成失败",
    updateComplete: "更新完成！",
    restoringAssets: "正在恢复素材...",
    updatingConfig: "正在更新配置...",
    finalizingBuild: "正在完成构建...",
    cancelled: "用户已取消。",
    mapToPlayer: "映射到玩家",
    mapToBg: "映射到背景",
    mapToItem: "映射到收集物",
    mapToEnemy: "映射到敌人",
    mapToMusic: "设为背景音乐",
    mapToSfx: "设为音效",
    versionHistory: "版本历史",
    reference: "参考",
    devKitHintPre: "使用上方的 ",
    devKitHintBold: "开发套件",
    devKitHintPost: " 开始迭代，",
    devKitHintLine2: "或在下方输入自定义指令。",
    copilotPlaceholder: "问“移动逻辑在哪里？”或选中代码进行修改。",
    copilotGreeting: "你好！我是你的代码副驾驶。选中任何代码进行重构，或者直接问我问题！",
    versionLabel: "版本",
    oneClickGen: "一键生成",
    publishingTag: "已发布",
    importedProject: "导入的项目",
    initialImport: "初始导入与自动适配",
    importInstr: "导入的游戏。触摸交互。",
    studioAiModel: "工作室 AI 模型",
    genModel: "生成模型",
    act_phys: "更流畅的物理",
    act_score: "计分器",
    act_win: "输赢逻辑",
    act_sprite: "生成玩家精灵",
    act_palette: "调色板",
    act_bg: "生成背景",
    act_sfx: "合成音效",
    act_music: "生成音乐循环",
    act_start: "开始屏幕",
    act_restart: "重新开始按钮",
    act_res: "修复分辨率",
    act_mobile: "移动端控制",
    act_shake: "屏幕震动",
    act_particle: "粒子特效",
    act_trans: "UI 过渡",
    act_phys_prompt: "调整游戏物理，使移动感觉更流畅且稍快。",
    act_score_prompt: "添加计分器，当玩家成功时增加分数，并清晰显示。",
    act_win_prompt: "实现玩家失败时的“游戏结束”状态，以及达到一定分数时的胜利状态。",
    act_sprite_prompt: "用符合游戏主题的生成像素艺术精灵替换玩家对象。",
    act_palette_prompt: "将游戏的配色方案更新为统一、专业的调色板（例如霓虹、柔和或复古）。",
    act_bg_prompt: "添加静态或滚动的背景图案/图像以替换纯色背景。",
    act_sfx_prompt: "为跳跃、收集物品和游戏结束实现合成音效（使用 Web Audio API）。",
    act_music_prompt: "使用振荡器生成符合氛围的简单循环背景旋律。",
    act_start_prompt: "创建一个带有播放按钮和游戏标题的时尚“开始屏幕”覆盖层。",
    act_restart_prompt: "确保在游戏结束屏幕上显示可见的重新开始按钮。",
    act_res_prompt: "修复画布分辨率问题。确保 canvas.width 和 canvas.height 显式设置为匹配游戏常量，以避免图形被截断。",
    act_mobile_prompt: "添加屏幕触摸控制（按钮/操纵杆）以获得更好的移动端可玩性。",
    act_shake_prompt: "当玩家受到伤害或撞到障碍物时添加屏幕震动效果。",
    act_particle_prompt: "当达成目标或击败敌人时添加粒子爆炸效果。",
    act_trans_prompt: "为 UI 元素的出现和消失添加 CSS 过渡或动画。",
    generating: "生成中... (点击取消)",
    publishedSuccess: "发布成功！",
    publishFailed: "发布失败",
    chat: {
      injected: (asset: string, slot: string) => `神经链接已建立。已将 "${asset}" 注入到 "${slot}"。热重载中...`,
      removed: (slot: string) => `已从 "${slot}" 移除素材。`,
      imported: "游戏已导入！我已经自动重构了画布逻辑和触摸控制，以确保与我们的平台兼容。",
      coverGen: (prompt: string) => `已为 "${prompt}" 生成新封面艺术！`,
      refactored: "代码已重构。",
      reverted: "已恢复到基础版本。",
      manualSave: "更改已手动保存。正在运行新构建...",
      loadedSnapshot: (label: string) => `已加载快照：${label}`,
      stopped: "[用户已停止响应]",
      error: "处理该请求时遇到错误。",
      findError: "我尝试应用修复，但找不到要替换的确切代码块。请尝试选中有问题的代码或要求我重写整个文件。",
      versionDeleted: "版本已成功删除。",
      deleteVersionError: "删除版本失败。",
      confirmDeleteVersion: "确认删除版本？此操作无法撤消。"
    },
    importAi: "✨ 智能适配",
    importDirect: "⚡ 直接导入",
    importAiDesc: "由AI执行代码重构 & 资产绑定，自动适配平台功能",
    importDirectDesc: "保留原始代码，不进行 AI 修改",
    selectMode: "选择导入模式"
  }
};

const FLAVOR_TEXTS = ["Compiling physics engine...","Reticulating splines...","Injecting fun molecules...","Optimizing render cycles...","Debugging timelines...","Teaching pixels to behave...","Generating logic gates...","Sipping virtual coffee...","Resolving paradoxes...","Aligning celestial bodies..."];
const FLAVOR_TEXTS_ZH = ["编译物理引擎...", "网格重新计算中...", "注入趣味分子...", "优化渲染周期...", "调试时间线...", "教像素乖乖听话...", "生成逻辑门...", "正在品尝虚拟咖啡...", "解决悖论...", "校准天体..."];
const PIPELINE_CONFIG = [
    {id: 'mechanics', icon: Gamepad2, color: 'text-indigo-400', mode: 'logic', actions: [{id: 'act_phys'}, {id: 'act_score'}, {id: 'act_win'}]},
    {id: 'visuals', icon: Palette, color: 'text-pink-400', mode: 'art', actions: [{id: 'act_sprite'}, {id: 'act_palette'}, {id: 'act_bg'}]},
    {id: 'audio', icon: Music, color: 'text-yellow-400', mode: 'music', actions: [{id: 'act_sfx'}, {id: 'act_music'}]},
    {id: 'ui', icon: Layout, color: 'text-emerald-400', mode: 'logic', actions: [{id: 'act_start'}, {id: 'act_restart'}, {id: 'act_res'}, {id: 'act_mobile'}]},
    {id: 'polish', icon: Zap, color: 'text-purple-400', mode: 'art', actions: [{id: 'act_shake'}, {id: 'act_particle'}, {id: 'act_trans'}]}
];

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const extractFiles = (fullCode: string) => { const styleMatch = fullCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i); const scriptMatch = fullCode.match(/<script[^>]*>([\s\S]*?)<\/script>/i); const css = styleMatch ? styleMatch[1].trim() : ''; const js = scriptMatch ? scriptMatch[1].trim() : ''; let html = fullCode.replace(/<style[^>]*>[\s\S]*?<\/style>/i, '').replace(/<script[^>]*>[\s\S]*?<\/script>/i, '').replace(/<!DOCTYPE html>/i, '').replace(/<html[^>]*>/i, '').replace(/<\/html>/i, '').replace(/<head[^>]*>/i, '').replace(/<\/head>/i, '').replace(/<body[^>]*>/i, '').replace(/<\/body>/i, '').trim(); return { html, css, js }; };
const combineFiles = (html: string, css: string, js: string) => { return `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${css}\n</style>\n</head>\n<body>\n${html}\n<script>\n${js}\n</script>\n</body>\n</html>`; };

const AssetThumbnail = ({ src, type, className, onClick, coverUrl }: { src: string, type?: 'image' | 'audio' | 'video', className?: string, onClick?: (e: React.MouseEvent) => void, coverUrl?: string }) => { 
    const inferredType = type || ((src.startsWith('data:audio') || src.match(/\.(mp3|wav|ogg)$/i)) ? 'audio' : 'image'); 
    
    if (inferredType === 'audio' && coverUrl) {
        return (
            <div onClick={onClick} className={`${className} relative group bg-[#111] overflow-hidden cursor-pointer hover:border-purple-500 border border-transparent transition-all`}>
                 <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`, backgroundSize: '8px 8px' }}></div>
                 <img src={coverUrl} className="w-full h-full object-cover relative z-10 transition-transform group-hover:scale-105 opacity-90 group-hover:opacity-100" alt="cover" />
                 <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1 text-pink-400 z-20 shadow-md">
                    <Music2 size={10} />
                 </div>
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20"><Maximize2 size={16} className="text-white drop-shadow-md"/></div>
            </div>
        );
    }

    return (<div onClick={onClick} className={`${className} relative group bg-[#111] overflow-hidden cursor-pointer hover:border-purple-500 border border-transparent transition-all`}><div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`, backgroundSize: '8px 8px' }}></div>{inferredType === 'audio' ? (<div className="w-full h-full flex items-center justify-center text-pink-500 bg-pink-500/5 group-hover:bg-pink-500/10 transition-colors"><Music2 size={20} className="group-hover:scale-110 transition-transform"/></div>) : (<img src={src} className="w-full h-full object-contain relative z-10 transition-transform group-hover:scale-105" alt="asset" />)}<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20"><Maximize2 size={16} className="text-white drop-shadow-md"/></div></div>) 
}

interface PreviewAsset { name?: string; type: 'image' | 'audio' | 'video'; src: string; coverUrl?: string; }

// Fixed AssetSlotItem component to correctly close braces and use Fragment implicitly
const AssetSlotItem: React.FC<{ slot: AssetSlot, isPickerOpen: boolean, onTogglePicker: () => void, onBind: (slot: AssetSlot, asset: ProjectAsset) => void, onClear: (slot: AssetSlot) => void, onExplain: (name: string) => void, projectAssets: ProjectAsset[], t: any, setPreviewAsset: (p: PreviewAsset) => void }> = ({ slot, isPickerOpen, onTogglePicker, onBind, onClear, onExplain, projectAssets, t, setPreviewAsset }) => { 
    const handlePreview = (e: React.MouseEvent, src: string, name: string) => { 
        e.stopPropagation(); 
        const type = (src.startsWith('data:audio') || src.match(/\.(mp3|wav|ogg)$/i)) ? 'audio' : 'image'; 
        setPreviewAsset({ name, src, type: type as any }); 
    }; 
    
    return (
        <div className={`border rounded-xl p-3 flex items-center justify-between group transition-all ${slot.currentValue ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${slot.currentValue ? 'bg-black shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-slate-800 border border-dashed border-slate-600'}`}>
                    {slot.currentValue ? <AssetThumbnail src={slot.currentValue} className="w-full h-full rounded-lg" onClick={(e) => handlePreview(e, slot.currentValue, slot.displayName)} /> : <Box size={16} className="text-slate-600"/>}
                </div>
                <div>
                    <p className={`text-xs font-bold flex items-center gap-2 ${slot.currentValue ? 'text-pink-100' : 'text-slate-300'}`}>
                        {slot.displayName}{slot.currentValue && <Check size={12} className="text-pink-400"/>}
                    </p>
                    <button onClick={() => onExplain(slot.variableName)} className="text-[9px] font-mono text-slate-500 uppercase hover:text-purple-400 flex items-center gap-1 transition-colors mt-0.5 group/explain text-left" title={t.explain}>
                        {slot.variableName}<MessageCircleQuestion size={10} className="text-slate-600 group-hover/explain:text-purple-400 opacity-50 group-hover/explain:opacity-100 transition-all" />
                    </button>
                </div>
            </div>
            <div className="relative">
                <button onClick={onTogglePicker} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 ${isPickerOpen ? 'bg-pink-600 text-white' : slot.currentValue ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}`}>
                    {slot.currentValue ? t.replace : t.connectAsset}<ChevronRight size={10} className={`transition-transform ${isPickerOpen ? 'rotate-90' : ''}`}/>
                </button>
                {isPickerOpen && (
                    <div className="absolute top-10 right-0 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 p-2 animate-in zoom-in-95 origin-top-right">
                        {slot.currentValue && (
                            <div className="mb-2 pb-2 border-b border-white/5">
                                <button onClick={() => onClear(slot)} className="w-full flex items-center gap-2 p-1.5 hover:bg-red-500/10 hover:border-red-500/30 border border-transparent rounded-lg transition-all text-left group/remove">
                                    <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center shrink-0 text-red-400 group-hover/remove:text-red-300"><Trash2 size={14} /></div>
                                    <div>
                                        <span className="text-[10px] font-bold text-red-400 block group-hover/remove:text-red-300">{t.removeAsset}</span>
                                        <span className="text-[8px] text-red-400/50 uppercase">{t.clearSlot}</span>
                                    </div>
                                </button>
                            </div>
                        )}
                        <p className="text-[9px] font-bold text-slate-500 px-2 py-1 uppercase mb-1 tracking-widest">{t.selectLibAsset}</p>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                            {projectAssets.length === 0 && <p className="text-[10px] text-slate-600 p-2 italic">{t.libraryEmpty}</p>}
                            {projectAssets.map(asset => { 
                                const assetSrc = asset.data.startsWith('http') || asset.data.startsWith('data:') ? asset.data : `data:${asset.mimeType};base64,${asset.data}`; 
                                return (
                                    <button key={asset.id} onClick={() => onBind(slot, asset)} className="w-full flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-lg transition-all text-left group/item">
                                        <div className="w-8 h-8 rounded bg-black border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                                            <AssetThumbnail src={assetSrc} type={asset.type === 'audio' ? 'audio' : 'image'} coverUrl={asset.coverUrl} className="w-full h-full" onClick={(e) => { e.stopPropagation(); setPreviewAsset({ name: asset.name, type: asset.type === 'audio' ? 'audio' : 'image', src: assetSrc, coverUrl: asset.coverUrl }); }}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] text-slate-300 truncate font-bold block group-hover/item:text-pink-300 transition-colors">{asset.name}</span>
                                            <span className="text-[8px] text-slate-500 uppercase">{(asset.data.length / 1024).toFixed(0)}KB</span>
                                        </div>
                                    </button>
                                ); 
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    ); 
};

// Fixed NumberSlotInput component
const NumberSlotInput: React.FC<{ slot: NumberSlot, onUpdate: (name: string, val: string) => void, onExplain: (name: string) => void }> = ({ slot, onUpdate, onExplain }) => { 
    const [val, setVal] = useState(slot.currentValue.toString()); 
    useEffect(() => { setVal(slot.currentValue.toString()); }, [slot.currentValue]); 
    const handleBlur = () => { if (parseFloat(val) !== slot.currentValue) { onUpdate(slot.variableName, val); } }; 
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }; 
    
    return (
        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 shrink-0">
                    <Hash size={14} />
                </div>
                <div className="min-w-0 flex-1">
                    <button onClick={() => onExplain(slot.variableName)} className="text-xs font-bold text-slate-300 hover:text-purple-300 transition-colors flex items-center gap-2 group/btn w-full text-left" title="Click to explain with AI">
                        <span className="truncate">{slot.variableName}</span>
                        <MessageCircleQuestion size={12} className="text-slate-600 group-hover/btn:text-purple-400 opacity-50 group-hover/btn:opacity-100 transition-all shrink-0"/>
                    </button>
                </div>
            </div>
            <input 
                type="number" 
                value={val} 
                onChange={(e) => setVal(e.target.value)} 
                onBlur={handleBlur} 
                onKeyDown={handleKeyDown} 
                className="w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-right text-xs text-white focus:border-indigo-500 outline-none font-mono"
            />
        </div>
    ); 
};


const Studio: React.FC<StudioProps> = ({ games, onUpdateGame, onDeleteGame, onCreateNew, onGameImported, onEditingChange, libraryAssets, language, projectToLoad, onProjectLoaded, currentUser, onBusyChange, onBack, dashboardTrigger, onProjectChange }) => {
  const t = TEXT[language] || TEXT['en'];
  const [selectedProject, setSelectedProject] = useState<Game | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('director');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  
  const [modificationPrompt, setModificationPrompt] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [modificationType, setModificationType] = useState<ModificationType>('logic');
  const [isModifying, setIsModifying] = useState(false);
  
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<'config' | 'cover_editor' | 'generating_agent' | 'success'>('config');
  const [enableAutoplay, setEnableAutoplay] = useState(true);
  const [publishDraft, setPublishDraft] = useState<Partial<Game>>({});
  
  // NEW: State for non-blocking publishing
  const [isPublishingBusy, setIsPublishingBusy] = useState(false);
  const publishAbortRef = useRef<AbortController | null>(null);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activePipelineStage, setActivePipelineStage] = useState<string>('mechanics');
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'devkit' | 'info'>('none');
  const [isFromDevKit, setIsFromDevKit] = useState(false);
  const [studioModel, setStudioModel] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('studio_model') || 'gemini-3-pro-preview';
      }
      return 'gemini-3-pro-preview';
  });
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const handleStudioModelSelect = (modelId: string) => {
      setStudioModel(modelId);
      localStorage.setItem('studio_model', modelId);
      setIsModelMenuOpen(false);
  };
  
  const [devKitTasks, setDevKitTasks] = useState<Record<string, {label: string, prompt: string}[]>>({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const studioFileInputRef = useRef<HTMLInputElement>(null);
  const bulkAssetInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null); 
  const [isImporting, setIsImporting] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [importMode, setImportMode] = useState<'ai' | 'direct'>('ai');
  const importAbortRef = useRef<AbortController | null>(null);
  
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isSlotPickerOpen, setIsSlotPickerOpen] = useState<string | null>(null);

  const [previewAsset, setPreviewAsset] = useState<PreviewAsset | null>(null); 
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({x: 0, y: 0});
  const isPreviewDragging = useRef(false);
  const lastPreviewMouse = useRef({x: 0, y: 0});

  const [isAddAssetMenuOpen, setIsAddAssetMenuOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState<'all' | 'image' | 'audio'>('all');

  const [currentThought, setCurrentThought] = useState('');
  const [lastLogLine, setLastLogLine] = useState('');
  const [thinkingTime, setThinkingTime] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [flavorIndex, setFlavorIndex] = useState(0);
  
  const [activeFile, setActiveFile] = useState<FileTypeTab>('js');
  const [editorContent, setEditorContent] = useState({ html: '', css: '', js: '' });
  
  const [history, setHistory] = useState<{html: string, css: string, js: string}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [initialContent, setInitialContent] = useState({ html: '', css: '', js: '' });
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  const [textSelection, setTextSelection] = useState<{start: number, end: number, text: string} | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{top: number, left: number} | null>(null);
  const [editorHighlights, setEditorHighlights] = useState<{start: number, end: number} | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [aiState, setAiState] = useState<AIState>('idle');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAvatarPeeking, setIsAvatarPeeking] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string, highlight?: {start: number, end: number, file: FileTypeTab}}[]>([]);
  const [showCopilotGreeting, setShowCopilotGreeting] = useState(false);
  
  const [coverPrompt, setCoverPrompt] = useState('');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [coverEditTab, setCoverEditTab] = useState<'ai' | 'upload'>('ai');
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const [versionToDeleteId, setVersionToDeleteId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{show: boolean, msg: string}>({show: false, msg: ''});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  const modifyAbortController = useRef<AbortController | null>(null);
  const copilotAbortController = useRef<AbortController | null>(null);
  
  const prevProjectIdRef = useRef<string | null>(null);

  const assetCache = useRef<Map<string, string>>(new Map());
  const getMaskedCode = useCallback((code: string) => { return code.replace(/(["'])(data:(?:image|audio|video)\/[^;]+;base64,[^"']*?)\1/g, (match, quote, data) => { const id = `${data.length}_${data.substring(data.length - 20)}`; const key = `__ASSET_Wrapper_${id}__`; assetCache.current.set(key, data); return `${quote}${key}${quote}`; }); }, []);
  const getUnmaskedCode = useCallback((maskedCode: string) => { return maskedCode.replace(/(["'])__ASSET_Wrapper_([a-zA-Z0-9_]+)__\1/g, (match, quote, idKey) => { const key = `__ASSET_Wrapper_${idKey}__`; if (assetCache.current.has(key)) { return quote + assetCache.current.get(key) + quote; } return match; }); }, []);
  const displayEditorContent = useMemo(() => { if (activeFile === 'js') { return getMaskedCode(editorContent.js); } return editorContent[activeFile]; }, [editorContent, activeFile, getMaskedCode]);
  const currentFlavorTexts = language === 'zh' ? FLAVOR_TEXTS_ZH : FLAVOR_TEXTS;

  useEffect(() => { onEditingChange?.(!!selectedProject); }, [selectedProject, onEditingChange]);
  
  useEffect(() => {
    if (dashboardTrigger && dashboardTrigger > 0) {
        setSelectedProject(null);
    }
  }, [dashboardTrigger]);

  useEffect(() => {
    if (onProjectChange) {
        onProjectChange(selectedProject?.id || null);
    }
  }, [selectedProject?.id, onProjectChange]);

  useEffect(() => {
      onBusyChange?.(isModifying || aiState === 'thinking' || isPublishingBusy);
  }, [isModifying, aiState, isPublishingBusy, onBusyChange]);

  useEffect(() => { if (projectToLoad) { const freshGame = games.find(g => g.id === projectToLoad.id) || projectToLoad; setSelectedProject(freshGame); setActiveTab('director'); if (onProjectLoaded) onProjectLoaded(); } }, [projectToLoad, games]);
  
  useEffect(() => {
      if (selectedProject) {
          const updated = games.find(g => g.id === selectedProject.id);
          if (updated) {
              const currentHistLen = selectedProject.history?.length || 0;
              const remoteHistLen = updated.history?.length || 0;
              
              if (currentHistLen === remoteHistLen) {
                  const hasTemp = selectedProject.history?.some(v => !v.id.includes('-')) ?? false;
                  const hasRemote = updated.history?.every(v => v.id.includes('-')) ?? false;
                  
                  if (hasTemp && hasRemote) {
                      setSelectedProject(prev => ({...updated, code: prev?.code || updated.code}));
                  }
              }
          }
      }
  }, [games]);

  useEffect(() => {
      if (selectedProject && (!selectedProject.code || selectedProject.code.length < 50)) {
          apiFetchGameById(selectedProject.id).then(fullGame => {
              if (fullGame) {
                  setSelectedProject(fullGame);
              }
          });
      }
  }, [selectedProject?.id]); 

  // MODIFIED: Enhanced Initialization Logic to prioritize Snapshot Code
  useEffect(() => {
      if (selectedProject) {
          let codeToLoad = selectedProject.code;

          // 1. Resolve correct code from History/Snapshots
          const history = selectedProject.history || [];
          const currentIndex = selectedProject.currentVersionIndex ?? (history.length - 1);
          const activeVersion = history[currentIndex];

          if (activeVersion) {
              // Check for active snapshot
              if (activeVersion.activeMinorVersionId && activeVersion.minorVersions) {
                  const activeSnapshot = activeVersion.minorVersions.find(
                      snap => snap.id === activeVersion.activeMinorVersionId
                  );
                  if (activeSnapshot) {
                      codeToLoad = activeSnapshot.code;
                  }
              } else if (activeVersion.code) {
                  // Fallback to version base code if distinct
                  codeToLoad = activeVersion.code;
              }
          }

          // 2. Prepare content
          const { html, css, js } = extractFiles(codeToLoad || '');
          const hasContent = !!js || !!html;
          const isEditorEmpty = !editorContent.js && !editorContent.html;

          // 3. Initialize Editor if project changed OR if we just loaded data into an empty editor
          if (selectedProject.id !== prevProjectIdRef.current || (isEditorEmpty && hasContent)) {
               const content = { html, css, js };
               setEditorContent(content);
               setInitialContent(content);
               setHistory([content]);
               setHistoryIndex(0);
               prevProjectIdRef.current = selectedProject.id;
               
               // 4. Sync Preview (Director) if codeToLoad differs from object code
               // This ensures the GameRunner sees the snapshot code immediately
               if (codeToLoad && codeToLoad !== selectedProject.code) {
                   setSelectedProject(prev => prev ? ({ ...prev, code: codeToLoad }) : null);
               }
          }
      }
  }, [selectedProject?.id, selectedProject?.code]);

  useEffect(() => { if (previewAsset) { setPreviewZoom(1); setPreviewOffset({x: 0, y: 0}); } }, [previewAsset]);
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) { setIsExportMenuOpen(false); } }; if (isExportMenuOpen) { document.addEventListener('mousedown', handleClickOutside); } else { document.removeEventListener('mousedown', handleClickOutside); } return () => document.removeEventListener('mousedown', handleClickOutside); }, [isExportMenuOpen]);
  useEffect(() => { setDevKitTasks({}); }, [selectedProject?.id, selectedProject?.code]);
  useEffect(() => { if ((isPublishModalOpen || isEditInfoModalOpen) && selectedProject) { setPublishDraft({ title: selectedProject.title, description: selectedProject.description, versionLabel: selectedProject.versionLabel, thumbnailUrl: selectedProject.thumbnailUrl }); } }, [isPublishModalOpen, isEditInfoModalOpen, selectedProject]);
  
  const loadTasksForStage = async (stageId: string) => { if (!selectedProject) return; setIsLoadingTasks(true); try { const tasks = await generateNextSteps(selectedProject.code, stageId, language); setDevKitTasks(prev => ({ ...prev, [stageId]: tasks })); } catch (e) { console.error("Failed to load dev tasks", e); } finally { setIsLoadingTasks(false); } };
  const assetSlots = useMemo((): AssetSlot[] => { const jsCode = editorContent.js; const slots: AssetSlot[] = []; const regex = /(const|let|var)\s+(\w+)\s*=\s*['"](.*?)['"]\s*;?\s*\/\/\s*@asset\(([^)]+)\)/g; let match; while ((match = regex.exec(jsCode)) !== null) { const val = match[3]; const isColor = /^(#|rgb|hsl)/i.test(val); if (!isColor) { slots.push({ variableName: match[2], currentValue: val, displayName: match[4] }); } } return slots; }, [editorContent.js]);
  const numberSlots = useMemo((): NumberSlot[] => { const jsCode = editorContent.js; const slots: NumberSlot[] = []; const regex = /(?:^|[\r\n;])\s*(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(-?\d+(?:\.\d+)?)\s*;/g; let match; while ((match = regex.exec(jsCode)) !== null) { slots.push({ variableName: match[2], currentValue: parseFloat(match[3]) }); } return slots; }, [editorContent.js]);
  
  const updateNumericValue = async (variableName: string, newValue: string) => { 
      if (!selectedProject) return; 
      const jsCode = editorContent.js; 
      const pattern = new RegExp(`((?:^|[\\r\\n;])\\s*(const|let|var)\\s+${variableName}\\s*=\\s*)(-?\\d+(?:\\.\\d+)?)(s*;)`); 
      if (!pattern.test(jsCode)) return; 
      const newJs = jsCode.replace(pattern, `$1${newValue}$4`); 
      const newContent = { ...editorContent, js: newJs }; 
      updateEditorContent(newContent); 
      const newFullCode = combineFiles(newContent.html, newContent.css, newJs); 
      const updatedGame = { ...selectedProject, code: newFullCode }; 
      
      setSelectedProject(updatedGame);
      
      const currentVersionId = getCurrentVersionId(selectedProject);
      if (currentVersionId && isUUID(currentVersionId)) {
          await apiUpdateGameVersion(currentVersionId, { code: newFullCode });
      } else {
          onUpdateGame(updatedGame); 
      }
  };

  const bindAssetToSlot = async (slot: AssetSlot, asset: ProjectAsset) => { 
      if (!selectedProject) return;
      setIsSlotPickerOpen(null); 
      
      const jsCode = editorContent.js; 
      const dataUri = asset.data.startsWith('http') ? asset.data : `data:${asset.mimeType};base64,${asset.data}`; 
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
      const safeVarName = escapeRegExp(slot.variableName); 
      const safeDisplayName = escapeRegExp(slot.displayName); 
      const pattern = new RegExp(`(const|let|var)\\s+${safeVarName}\\s*=\\s*['"].*?['"]\\s*;?\\s*\\/\\/\\s*@asset\\(${safeDisplayName}\\)`, 'g'); 
      const newJs = jsCode.replace(pattern, (match, keyword) => { return `${keyword} ${slot.variableName} = "${dataUri}"; // @asset(${slot.displayName})`; }); 
      const newContent = { ...editorContent, js: newJs }; 
      updateEditorContent(newContent); 
      const newFullCode = combineFiles(newContent.html, newContent.css, newJs); 
      const updatedGame = { ...selectedProject, code: newFullCode }; 
      
      setSelectedProject(updatedGame); 
      
      const currentVersionId = getCurrentVersionId(selectedProject);
      if (currentVersionId && isUUID(currentVersionId)) {
          await apiUpdateGameVersion(currentVersionId, { code: newFullCode });
      } else {
          onUpdateGame(updatedGame);
      }
  };

  const clearAssetFromSlot = async (slot: AssetSlot) => { 
      if (!selectedProject) return;
      setIsSlotPickerOpen(null);
      
      const jsCode = editorContent.js; 
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
      const safeVarName = escapeRegExp(slot.variableName); 
      const safeDisplayName = escapeRegExp(slot.displayName); 
      const pattern = new RegExp(`(const|let|var)\\s+${safeVarName}\\s*=\\s*['"].*?['"]\\s*;?\\s*\\/\\/\\s*@asset\\(${safeDisplayName}\\)`, 'g'); 
      const newJs = jsCode.replace(pattern, (match, keyword) => { return `${keyword} ${slot.variableName} = ""; // @asset(${slot.displayName})`; }); 
      const newContent = { ...editorContent, js: newJs }; 
      updateEditorContent(newContent); 
      const newFullCode = combineFiles(newContent.html, newContent.css, newJs); 
      const updatedGame = { ...selectedProject, code: newFullCode }; 
      
      setSelectedProject(updatedGame);
      
      const currentVersionId = getCurrentVersionId(selectedProject);
      if (currentVersionId && isUUID(currentVersionId)) {
          await apiUpdateGameVersion(currentVersionId, { code: newFullCode });
      } else {
          onUpdateGame(updatedGame);
      }
  };

  const getCurrentVersionId = (game: Game) => {
      if (!game.history || game.history.length === 0) return null;
      const idx = game.currentVersionIndex !== undefined ? game.currentVersionIndex : game.history.length - 1;
      return game.history[idx]?.id;
  };

  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const processFile = (file: File) => {
      // Infer mimeType if missing (common for .md, .ts, etc.)
      let mimeType = file.type;
      if (!mimeType) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'md') mimeType = 'text/markdown';
          else if (ext === 'ts' || ext === 'tsx') mimeType = 'text/plain';
          else if (ext === 'json') mimeType = 'application/json';
          else if (ext === 'csv') mimeType = 'text/csv';
          else if (ext === 'js' || ext === 'jsx') mimeType = 'application/javascript';
          else mimeType = 'application/octet-stream'; // Default fallback
      }

      // Check for supported types
      const isSupported = mimeType.startsWith('image/') || 
                          mimeType.startsWith('video/') || 
                          mimeType.startsWith('audio/') || 
                          mimeType === 'application/pdf' ||
                          mimeType.startsWith('text/') ||
                          mimeType.includes('json') ||
                          mimeType.includes('javascript') ||
                          mimeType === 'text/xml' ||
                          mimeType === 'application/xml' ||
                          mimeType.includes('csv') ||
                          mimeType.includes('typescript') ||
                          mimeType === 'application/x-httpd-php' || 
                          mimeType === 'application/x-sh';

      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          setAttachment({ 
              data: base64, 
              mimeType: isSupported ? mimeType : 'unsupported',
              fileName: file.name
          });
          setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
  };

  const handleStudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (!file) return; 
      processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);
      
      const file = e.dataTransfer.files?.[0];
      if (file) {
          processFile(file);
      }
  };

  
  const initiateImport = (mode: 'ai' | 'direct') => {
      setImportMode(mode);
      setIsImportMenuOpen(false);
      if (importFileInputRef.current) {
          importFileInputRef.current.value = '';
          importFileInputRef.current.click();
      }
  };

  const cancelImport = () => {
      if (importAbortRef.current) {
          importAbortRef.current.abort();
          importAbortRef.current = null;
      }
      setIsImporting(false);
      if (importFileInputRef.current) importFileInputRef.current.value = '';
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (!file) return; 
      
      setIsImporting(true); 
      
      const controller = new AbortController();
      importAbortRef.current = controller;
      
      const reader = new FileReader(); 
      reader.onload = async (event) => { 
          const rawCode = event.target?.result as string; 
          try { 
              const { code, summary, title } = await adaptImportedGame(
                  rawCode, 
                  controller.signal, 
                  importMode === 'direct'
              ); 
              
              const timestamp = Date.now(); 
              const newGame: Game = { id: `imp_${timestamp}`, title: title, description: summary, instructions: t.importInstr, author: 'You', likes: 0, coins: 0, fundingGoal: 1000, status: 'prototype', isPublished: false, code: code, thumbnailUrl: undefined, type: 'white-box', createdAt: timestamp, teamMembers: 1, tasksCompleted: 0, totalTasks: 5, history: [{ id: `v1_${timestamp}`, timestamp: timestamp, prompt: t.importedProject, code: code, versionNumber: 1, summary: importMode === 'direct' ? "Direct Import" : t.initialImport, description: summary }], currentVersionIndex: 0, resolution: { width: 360, height: 640, mode: 'responsive' } }; 
              onGameImported?.(newGame); 
              setSelectedProject(newGame); 
              setActiveTab('director'); 
          } catch (e: any) { 
              if (e.name !== 'AbortError') {
                  console.error("Import failed", e); 
              }
          } finally { 
              if (!controller.signal.aborted) {
                  setIsImporting(false); 
              }
              if (importFileInputRef.current) importFileInputRef.current.value = ''; 
              importAbortRef.current = null;
          } 
      }; 
      reader.readAsText(file); 
  };
  
  const handleBulkAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedProject) return;
      const files = Array.from(e.target.files || []) as File[];
      if (files.length === 0) return;
      const newAssets: ProjectAsset[] = [];
      for (const file of files) {
          try {
              const userId = currentUser?.id || 'guest';
              const timestamp = Date.now();
              const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
              const storagePath = `${userId}/${timestamp}_${cleanFileName}`;
              const publicUrl = await apiUploadFile(file, storagePath);
              const newAsset: ProjectAsset = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: file.name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_'),
                  mimeType: file.type,
                  data: publicUrl,
                  type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio'
              };
              newAssets.push(newAsset);
          } catch (error: any) {
              console.error(`Failed to upload ${file.name}:`, error);
              alert(`Failed to upload ${file.name}. Error: ${error.message || 'Permission denied'}. \n\nPlease ensure you have run the updated db_schema.sql to allow uploads.`);
          }
      }
      if (newAssets.length > 0) {
          const updatedGame = { 
              ...selectedProject, 
              assets: [...(selectedProject.assets || []), ...newAssets] 
          };
          
          setSelectedProject(updatedGame);
          await apiUpdateGameMetadata(updatedGame.id, { assets: updatedGame.assets });
      }
      setIsAddAssetMenuOpen(false);
      if (bulkAssetInputRef.current) bulkAssetInputRef.current.value = '';
  };
  
  const handleAddLibraryAsset = async (asset: Asset) => { 
      if (!selectedProject) return; 
      const exists = (selectedProject.assets || []).some(a => a.id === asset.id); 
      if (exists) { return; } 
      
      let mimeType = 'image/png'; 
      let data = ''; 
      if (asset.imageUrl.startsWith('data:')) { 
          const parts = asset.imageUrl.split(','); 
          const mimeMatch = parts[0].match(/:(.*?);/); 
          mimeType = mimeMatch ? mimeMatch[1] : 'image/png'; 
          data = parts[1]; 
      } else { 
          data = asset.imageUrl; 
          mimeType = 'audio/ogg'; 
      } 
      
      let studioType: 'image' | 'audio' | 'video' = 'image'; 
      if (asset.type === 'audio') studioType = 'audio'; 
      
      const newAsset: ProjectAsset = { id: asset.id, name: asset.name.replace(/ /g, '_'), type: studioType, mimeType: mimeType, data: data, coverUrl: asset.coverUrl }; 
      const updatedGame = { ...selectedProject, assets: [...(selectedProject.assets || []), newAsset] }; 
      
      setSelectedProject(updatedGame); 
      await apiUpdateGameMetadata(updatedGame.id, { assets: updatedGame.assets });
      
      setIsLibraryModalOpen(false); 
      setIsAddAssetMenuOpen(false); 
  };

  const toggleAssetSelection = (assetId: string) => { setSelectedAssetIds(prev => prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]); };
  
  const deleteAsset = async (assetId: string) => { 
      if (!selectedProject) return; 
      const updatedGame = { ...selectedProject, assets: (selectedProject.assets || []).filter(a => a.id !== assetId) }; 
      
      setSelectedProject(updatedGame); 
      await apiUpdateGameMetadata(updatedGame.id, { assets: updatedGame.assets });
      
      setSelectedAssetIds(prev => prev.filter(id => id !== assetId)); 
  };

  const removeStudioAttachment = () => { setAttachment(null); setPreviewUrl(null); if (studioFileInputRef.current) studioFileInputRef.current.value = ''; };
  const handleDragStart = (clientX: number, clientY: number) => { if (!isPanMode) return; isDraggingRef.current = true; lastMousePosRef.current = { x: clientX, y: clientY }; };
  const handleDragMove = (clientX: number, clientY: number) => { if (!isDraggingRef.current || !isPanMode) return; const deltaX = clientX - lastMousePosRef.current.x; const deltaY = clientY - lastMousePosRef.current.y; setViewOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY })); lastMousePosRef.current = { x: clientX, y: clientY }; };
  const handleDragEnd = () => { isDraggingRef.current = false; };
  const handleTouchStart = (e: React.TouchEvent) => { if (!isPanMode) return; const touch = e.touches[0]; handleDragStart(touch.clientX, touch.clientY); };
  const handleTouchMove = (e: React.TouchEvent) => { if (!isPanMode) return; const touch = e.touches[0]; handleDragMove(touch.clientX, touch.clientY); };
  const handleDragEndTouch = () => { isDraggingRef.current = false; };
  
  const handleResolutionChange = async (width: number, height: number, mode: 'responsive' | 'fixed') => { 
      if (!selectedProject) return; 
      
      const newResolution = { width, height, mode };
      const updatedGame: Game = { ...selectedProject, resolution: newResolution }; 
      setSelectedProject(updatedGame); 
      
      try {
          await apiUpdateGameMetadata(updatedGame.id, { resolution: newResolution });
      } catch (e) {
          console.error("Failed to update resolution metadata", e);
      }
  };
  
  const handleResolutionPreset = (preset: string) => { switch(preset) { case 'responsive': handleResolutionChange(360, 640, 'responsive'); break; case 'mobile-p': handleResolutionChange(360, 640, 'fixed'); break; case 'mobile-l': handleResolutionChange(640, 360, 'fixed'); break; case 'square': handleResolutionChange(600, 600, 'fixed'); break; } };
  const updateEditorContent = (newContent: {html: string, css: string, js: string}) => { const current = history[historyIndex]; if (current && current.html === newContent.html && current.css === newContent.css && current.js === newContent.js) return; const newHistory = history.slice(0, historyIndex + 1); newHistory.push(newContent); if (newHistory.length > 50) newHistory.shift(); setHistory(newHistory); setHistoryIndex(newHistory.length - 1); setEditorContent(newContent); };
  const handleUndo = () => { if (historyIndex > 0) { const newIndex = historyIndex - 1; setHistoryIndex(newIndex); setEditorContent(history[newIndex]); } };
  const handleRedo = () => { if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; setHistoryIndex(newIndex); setEditorContent(history[newIndex]); } };
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => { const target = e.currentTarget; const selection = target.value.substring(target.selectionStart, target.selectionEnd); if (selection.trim().length > 0) { setTextSelection({ start: target.selectionStart, end: target.selectionEnd, text: selection }); } else { setTextSelection(null); setToolbarPosition(null); } };
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => { const target = e.currentTarget; const selection = target.value.substring(target.selectionStart, target.selectionEnd); if (selection.trim().length > 0) { const rect = target.getBoundingClientRect(); setToolbarPosition({ top: Math.max(0, e.clientY - rect.top - 40), left: Math.max(0, e.clientX - rect.left - 40) }); } else { setToolbarPosition(null); } };
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => { if (lineNumbersRef.current) { lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop; } };
  const handleAiCoverGen = async () => { if (!selectedProject) return; setIsGeneratingCover(true); try { const prompt = `${selectedProject.title}. ${selectedProject.description}`; const newUrl = await generateGameThumbnail(prompt); setPublishDraft(prev => ({ ...prev, thumbnailUrl: newUrl })); setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.coverGen(selectedProject.title)}]); setAiState('speaking'); } catch (e) { console.error(e); } finally { setIsGeneratingCover(false); } };
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !selectedProject) return; const reader = new FileReader(); reader.onloadend = () => { const result = reader.result as string; setPublishDraft(prev => ({ ...prev, thumbnailUrl: result })); }; reader.readAsDataURL(file); };
  const handleDownload = () => { if (!selectedProject) return; let codeContent = selectedProject.code; const titleTag = `<title>${selectedProject.title}</title>`; if (codeContent.match(/<title>[\s\S]*?<\/title>/i)) { codeContent = codeContent.replace(/<title>[\s\S]*?<\/title>/i, titleTag); } else if (codeContent.includes('<head>')) { codeContent = codeContent.replace('<head>', `<head>\n${titleTag}`); } else { codeContent = `<!DOCTYPE html><html><head>${titleTag}</head>${codeContent}</html>`; } const blob = new Blob([codeContent], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const safeTitle = selectedProject.title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'game'; a.download = `${safeTitle}.html`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  
  const cancelModification = () => { 
      if (modifyAbortController.current) { 
          modifyAbortController.current.abort(); 
          modifyAbortController.current = null; 
      } 
      setIsModifying(false); 
      setLastLogLine(t.cancelled); 
      if (pendingPrompt && !modificationPrompt) { 
          setModificationPrompt(pendingPrompt); 
      } 
      setPendingPrompt(''); 
      setCurrentThought(''); 
      if (timerRef.current) clearInterval(timerRef.current); 
  };

  const handleModifyGame = async (prompt: string, type: ModificationType = 'logic') => {
    if (!selectedProject || !prompt.trim()) return;
    const currentPrompt = prompt;
    setPendingPrompt(currentPrompt);
    setModificationPrompt('');
    setIsModifying(true);
    setCurrentThought(''); 
    setLastLogLine(t.initializing);
    setThinkingTime(0);
    setProgressPercent(0);
    setActiveOverlay('none');
    
    const controller = new AbortController();
    modifyAbortController.current = controller;
    const signal = controller.signal;
    
    timerRef.current = setInterval(() => { setThinkingTime(prev => prev + 0.1); setProgressPercent(prev => prev < 20 ? prev + 0.5 : prev); }, 100);
    
    try {
      let finalPrompt = currentPrompt;
      const selectedAssets = (selectedProject.assets || []).filter(a => selectedAssetIds.includes(a.id));
      if (selectedAssets.length > 0) {
        const assetNames = selectedAssets.map(a => `"${a.name}"`).join(', ');
        finalPrompt += `\n(Priority Assets to use: ${assetNames})`;
      }
      
      let fullResponse = '';
      let restorationMap: Map<string, string> | null = null;
      
      const stream = streamGameModification(
        selectedProject.code, 
        finalPrompt, 
        type, 
        attachment || undefined, 
        selectedProject.assets, 
        signal, 
        (map) => { restorationMap = map; }, 
        language, 
        studioModel
      );
      
      for await (const chunk of stream) {
        if (signal.aborted) break;
        if (!chunk) continue;
        
        fullResponse += chunk;
        const separator = "==CODE_START==";
        const parts = fullResponse.split(separator);
        
        if (parts.length > 0) {
          const thoughtBuffer = parts[0].trim();
          setCurrentThought(thoughtBuffer);
          const lines = thoughtBuffer.split('\n').filter(l => l.trim().length > 5);
          if (lines.length > 0) setLastLogLine(lines[lines.length - 1]);
          const thoughtProgress = Math.min((thoughtBuffer.length / 500) * 80, 80);
          setProgressPercent(20 + thoughtProgress);
        }
        
        if (parts.length > 1) {
          setLastLogLine(t.finalizingBuild);
          setProgressPercent(95);
        }
      }
      
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (timerRef.current) clearInterval(timerRef.current);
      
      setProgressPercent(98);
      setLastLogLine(t.updateComplete);
      
      const separator = "==CODE_START==";
      const parts = fullResponse.split(separator);
      let newCode = "";
      let finalSummary = t.chat.refactored;
      
      if (parts.length > 1) {
        newCode = parts[1].trim();
        const thought = parts[0].trim();
        const summaryCandidates = thought.split('\n').filter(line => line.length > 20 && !line.startsWith('=='));
        if (summaryCandidates.length > 0) {
            const joinedSummary = summaryCandidates.join('\n');
            finalSummary = joinedSummary.substring(0, 5000) + (joinedSummary.length > 5000 ? '...' : '');
        }
      } else {
        newCode = fullResponse.includes('<!DOCTYPE') ? fullResponse.substring(fullResponse.indexOf('<!DOCTYPE')) : fullResponse;
      }
      
      if (newCode.startsWith('```')) newCode = newCode.replace(/^```(html)?/i, '').replace(/```$/, '');
      if (restorationMap) {
        setLastLogLine(t.restoringAssets);
        newCode = restoreCodeAssets(newCode, restorationMap);
      }
      
      let currentHistory = selectedProject.history ? [...selectedProject.history] : [];
      if (currentHistory.length === 0 && selectedProject.code) {
        currentHistory = [{ id: `base_${selectedProject.id}`, timestamp: selectedProject.createdAt, prompt: "Original Prototype", code: selectedProject.code, versionNumber: 1, summary: t.initialGen, description: selectedProject.description, instructions: selectedProject.instructions }];
      }
      
      setLastLogLine(t.updatingConfig);
      const newMeta = await updateGameMetadata(newCode, signal, language);
      
      setProgressPercent(100);
      const newVersion: GameVersion = { 
        id: Date.now().toString(), 
        timestamp: Date.now(), 
        prompt: currentPrompt, 
        code: newCode, 
        versionNumber: currentHistory.length + 1, 
        summary: finalSummary, 
        description: newMeta.description, 
        instructions: newMeta.instructions, 
        modelName: studioModel 
      };
      
      const updatedGame: Game = { 
        ...selectedProject, 
        code: newCode, 
        description: newMeta.description, 
        instructions: newMeta.instructions, 
        history: [...currentHistory, newVersion], 
        currentVersionIndex: currentHistory.length, 
        tasksCompleted: (selectedProject.tasksCompleted || 0) + 1, 
        modelName: studioModel 
      };
      
      setSelectedProject(updatedGame);
      onUpdateGame(updatedGame);
      setAttachment(null);
      setPreviewUrl(null);
      setIsFromDevKit(false);
      setSelectedAssetIds([]);
      
      const { html, css, js } = extractFiles(newCode);
      const newContent = { html, css, js };
      setEditorContent(newContent);
      setHistory(prev => [...prev, newContent]);
      setHistoryIndex(prev => prev + 1);
      
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        setLastLogLine(t.synthesisFailed);
        if (!modificationPrompt) setModificationPrompt(currentPrompt);
      }
    } finally {
      if (!signal.aborted) {
          setIsModifying(false);
          setPendingPrompt('');
          setCurrentThought('');
      }
      if (modifyAbortController.current === controller) {
          modifyAbortController.current = null;
          if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  };
  
  const handleRestoreVersion = (versionIndex: number) => { if (!selectedProject || !selectedProject.history) return; const targetVersion = selectedProject.history[versionIndex]; if (!targetVersion) return; let codeToLoad = targetVersion.code; let activeId = undefined; if (targetVersion.minorVersions && targetVersion.minorVersions.length > 0) { if (targetVersion.activeMinorVersionId) { const snap = targetVersion.minorVersions.find(m => m.id === targetVersion.activeMinorVersionId); if (snap) { codeToLoad = snap.code; activeId = snap.id; } } if (!activeId) { const latest = targetVersion.minorVersions[targetVersion.minorVersions.length - 1]; codeToLoad = latest.code; activeId = latest.id; } } const updatedHistory = [...selectedProject.history]; updatedHistory[versionIndex] = { ...targetVersion, activeMinorVersionId: activeId }; const updatedGame: Game = { ...selectedProject, code: codeToLoad, description: targetVersion.description || selectedProject.description, instructions: targetVersion.instructions || selectedProject.instructions, history: updatedHistory, currentVersionIndex: versionIndex }; setSelectedProject(updatedGame); setIsFromDevKit(false); setModificationPrompt(''); const { html, css, js } = extractFiles(codeToLoad); const content = { html, css, js }; setEditorContent(content); setInitialContent(content); setHistory([content]); setHistoryIndex(0); };

  const handleSaveGameInfo = async () => {
    if (!selectedProject) return;
    const updatedGame = {
      ...selectedProject,
      title: publishDraft.title ?? selectedProject.title,
      description: publishDraft.description ?? selectedProject.description,
      versionLabel: publishDraft.versionLabel ?? selectedProject.versionLabel,
      thumbnailUrl: publishDraft.thumbnailUrl ?? selectedProject.thumbnailUrl
    };
    
    setSelectedProject(updatedGame);
    await apiUpdateGameMetadata(updatedGame.id, {
      title: updatedGame.title,
      description: updatedGame.description,
      versionLabel: updatedGame.versionLabel,
      thumbnailUrl: updatedGame.thumbnailUrl
    });
    onUpdateGame(updatedGame, false);
    setIsEditInfoModalOpen(false);
  };

  const handlePublishFlow = async () => {
    if (!selectedProject) return;
    const gameToPublish = { ...selectedProject, ...publishDraft };

    // 1. Close Modal Immediately
    setIsPublishModalOpen(false);
    
    // 2. Set Busy State
    setIsPublishingBusy(true);
    
    const controller = new AbortController();
    publishAbortRef.current = controller;

    try {
        let finalGame = { ...gameToPublish };

        // 3. Initialize History if Missing
        if (!finalGame.history || finalGame.history.length === 0) {
            const timestamp = Date.now();
            const baseVersion: GameVersion = { id: `base_${timestamp}`, timestamp: timestamp, prompt: "Initial Publish", code: finalGame.code, versionNumber: 1, summary: "Auto-generated history for publish" };
            finalGame = { ...finalGame, history: [baseVersion], currentVersionIndex: 0 };
            
            if (!finalGame.id.startsWith('imp_') && !finalGame.id.startsWith('fork_')) {
                 // Persist base version immediately
                 await onUpdateGame(finalGame); 
            }
        }

        // 4. Generate Autoplay Agent if enabled
        if (enableAutoplay) {
            // Check for abort signal
            if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');

            const agentScript = await generateAutoplayAgent(finalGame.code, undefined, language);
            
            if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');

            const timestamp = Date.now();
            const newSnapshot: CodeSnapshot = { id: `pub_auto_${timestamp}`, code: agentScript, timestamp: timestamp, label: language === 'zh' ? `发布自动生成` : `Auto-gen on Publish` };
            
            finalGame = { 
                ...finalGame, 
                autoplayScript: agentScript, 
                agentHistory: [newSnapshot, ...(finalGame.agentHistory || [])] 
            };
        }

        // 5. Finalize Publish
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        await finalizePublish(finalGame);
        
        setShowToast({show: true, msg: t.publishedSuccess});

    } catch (e: any) { 
        if (e.name !== 'AbortError') {
            console.error("Publishing Failed", e); 
            setShowToast({show: true, msg: t.publishFailed});
        }
    } finally {
        // 6. Reset Busy State
        setIsPublishingBusy(false);
        publishAbortRef.current = null;
        setPublishStep('config'); // Reset internal step for next time
    }
  };

  const handleCancelPublish = () => {
      if (publishAbortRef.current) {
          publishAbortRef.current.abort();
      }
      setIsPublishingBusy(false);
      setShowToast({show: true, msg: t.cancelled});
  };

  const finalizePublish = async (gameToPublish = selectedProject) => {
      if (!gameToPublish) return;
      const history = gameToPublish.history || [];
      const idx = gameToPublish.currentVersionIndex ?? (history.length - 1);
      const currentVersion = history[idx];
      
      let publishedVersionId = currentVersion?.id;
      let publishedMinorVersionId = currentVersion?.activeMinorVersionId;

      let finalPublishedCode = gameToPublish.code;
      if (enableAutoplay && gameToPublish.autoplayScript) {
          finalPublishedCode = embedGameDataToCode(gameToPublish.code, gameToPublish.autoplayScript, gameToPublish.agentHistory);
      }

      const updates: Partial<Game> = {
          isPublished: true,
          publishedCode: finalPublishedCode, 
          publishedVersionId: publishedVersionId,
          publishedMinorVersionId: publishedMinorVersionId,
          publishedResolution: gameToPublish.resolution,
          status: gameToPublish.status === 'prototype' ? 'funding' : gameToPublish.status,
          isAgentActive: enableAutoplay,
          autoplayScript: gameToPublish.autoplayScript, 
          agentHistory: gameToPublish.agentHistory,     
          
          title: gameToPublish.title,
          description: gameToPublish.description,
          versionLabel: gameToPublish.versionLabel,
          thumbnailUrl: gameToPublish.thumbnailUrl
      };

      const finalGame: Game = { ...gameToPublish, ...updates };
      setSelectedProject(finalGame);
      
      await apiUpdateGameMetadata(gameToPublish.id, updates);

      onUpdateGame(finalGame, false);
  };

  const currentFullCode = useMemo(() => combineFiles(editorContent.html, editorContent.css, editorContent.js), [editorContent]);
  const hasUnsavedChanges = useMemo(() => editorContent.html !== initialContent.html || editorContent.css !== initialContent.css || editorContent.js !== initialContent.js, [editorContent, initialContent]);
  
  const handleManualSave = async () => { if (!selectedProject || !hasUnsavedChanges) return; const newFullCode = currentFullCode; const currentHistory = selectedProject.history || []; let currentVersionIndex = selectedProject.currentVersionIndex; if (currentVersionIndex === undefined || currentVersionIndex < 0 || currentVersionIndex >= currentHistory.length) { currentVersionIndex = Math.max(0, currentHistory.length - 1); } const currentVersion = currentHistory[currentVersionIndex]; if ((!currentVersion || !currentVersion.id) && selectedProject.id && !selectedProject.id.startsWith('imp_') && !selectedProject.id.startsWith('fork_')) { console.warn("History not loaded yet, aborting save to prevent overwrite."); return; } if (!currentVersion || !currentVersion.id) { const baseVersion: GameVersion = { id: `base_${Date.now()}`, timestamp: Date.now(), prompt: "Initial Save", code: newFullCode, versionNumber: 1, summary: "Manual Save initialized" }; const updatedGame: Game = { ...selectedProject, code: newFullCode, history: [baseVersion], currentVersionIndex: 0 }; setSelectedProject(updatedGame); onUpdateGame(updatedGame); setInitialContent(editorContent); return; } 
  
  if (!isUUID(currentVersion.id)) {
      const updatedHistory = [...currentHistory];
      updatedHistory[currentVersionIndex] = {
          ...currentVersion,
          code: newFullCode
      };
      
      const updatedGame: Game = { 
          ...selectedProject, 
          code: newFullCode, 
          history: updatedHistory 
      };
      
      setSelectedProject(updatedGame);
      onUpdateGame(updatedGame); 
      setInitialContent(editorContent);
      setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.manualSave}]); 
      setAiState('speaking');
      return;
  }

  const tempId = `mv_temp_${Date.now()}`; const label = `Edit ${currentVersion.minorVersions ? currentVersion.minorVersions.length + 1 : 1}`; const minorVersion: CodeSnapshot = { id: tempId, timestamp: Date.now(), code: newFullCode, label: label }; const updatedHistory = [...currentHistory]; updatedHistory[currentVersionIndex] = { ...currentVersion, minorVersions: [...(currentVersion.minorVersions || []), minorVersion], activeMinorVersionId: minorVersion.id }; const updatedGame: Game = { ...selectedProject, code: newFullCode, history: updatedHistory }; setSelectedProject(updatedGame); setInitialContent(editorContent); try { const savedSnapshot = await apiSaveVersionSnapshot(currentVersion.id, newFullCode, label); if (savedSnapshot) { const verifiedHistory = [...updatedHistory]; const verifiedVersion = { ...verifiedHistory[currentVersionIndex] }; verifiedVersion.minorVersions = verifiedVersion.minorVersions?.map(mv => mv.id === tempId ? savedSnapshot : mv); verifiedVersion.activeMinorVersionId = savedSnapshot.id; verifiedHistory[currentVersionIndex] = verifiedVersion; setSelectedProject(prev => prev ? ({ ...prev, history: verifiedHistory }) : null); setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.manualSave}]); setAiState('speaking'); } } catch (e) { console.error("Failed to save snapshot", e); } };
  const handleLoadSnapshot = (snapshot: CodeSnapshot) => { const { html, css, js } = extractFiles(snapshot.code); const content = { html, css, js }; updateEditorContent(content); setShowVersionHistory(false); setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.loadedSnapshot(snapshot.label)}]); setAiState('speaking'); };
  const handleDeleteSnapshot = async (snapshotId: string, e: React.MouseEvent) => { e.stopPropagation(); if (!selectedProject || !selectedProject.history) return; const currentHistory = [...selectedProject.history]; const idx = selectedProject.currentVersionIndex ?? (currentHistory.length - 1); if (idx < 0 || idx >= currentHistory.length) return; const currentVersion = currentHistory[idx]; if (!currentVersion || !currentVersion.minorVersions) return; const updatedMinorVersions = currentVersion.minorVersions.filter(mv => mv.id !== snapshotId); currentHistory[idx] = { ...currentVersion, minorVersions: updatedMinorVersions, activeMinorVersionId: currentVersion.activeMinorVersionId === snapshotId ? undefined : currentVersion.activeMinorVersionId }; const updatedGame = { ...selectedProject, history: currentHistory }; setSelectedProject(updatedGame); 
  
  if (isUUID(snapshotId)) {
      try { 
          await apiDeleteVersionSnapshot(snapshotId); 
      } catch (e) { 
          console.error("Failed to delete snapshot", e); 
      }
  }
  };
  const stopCopilot = () => { if (copilotAbortController.current) { copilotAbortController.current.abort(); copilotAbortController.current = null; } setAiState('idle'); setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.stopped}]); };
  const runAICopilot = async (instruction: string, isImplicitCommand: boolean = true, overrideSelection?: string) => { setToolbarPosition(null); if (!textSelection && !instruction && !overrideSelection) return; const contextCode = editorContent[activeFile]; const selectedCode = overrideSelection || (textSelection ? textSelection.text : ''); setIsAvatarPeeking(false); setAiState('thinking'); setChatHistory(prev => [...prev, {role: 'user', text: instruction}]); setChatInput(''); copilotAbortController.current = new AbortController(); const signal = copilotAbortController.current.signal; try { const stream = streamCodeAssistant(contextCode, selectedCode, instruction, signal, language, undefined, studioModel); let accumulatedResponse = ''; let mode: 'idle' | 'edit' | 'search' | 'full' | 'find' | 'chat' | 'summary' = 'idle'; let buffer = ''; let searchBuffer = ''; let summaryBuffer = ''; for await (const chunk of stream) { if (signal.aborted) break; const newContent = chunk; if (mode === 'idle') { accumulatedResponse += newContent; if (accumulatedResponse.includes('==EDIT==')) { mode = 'edit'; buffer = accumulatedResponse.split('==EDIT==')[1] || ''; } else if (accumulatedResponse.includes('==SEARCH==')) { mode = 'search'; searchBuffer = accumulatedResponse.split('==SEARCH==')[1] || ''; } else if (accumulatedResponse.includes('==FULL_FILE==')) { mode = 'full'; buffer = accumulatedResponse.split('==FULL_FILE==')[1] || ''; } else if (accumulatedResponse.includes('==FIND==')) { mode = 'find'; buffer = accumulatedResponse.split('==FIND==')[1] || ''; } else if (accumulatedResponse.includes('==CHAT==')) { mode = 'chat'; accumulatedResponse = accumulatedResponse.split('==CHAT==')[1] || ''; } } else if (mode === 'search') { searchBuffer += newContent; if (searchBuffer.includes('==REPLACE==')) { const parts = searchBuffer.split('==REPLACE=='); searchBuffer = parts[0].trim(); mode = 'edit'; buffer = parts[1] || ''; } } else if (mode === 'edit' || mode === 'find' || mode === 'full') { buffer += newContent; if (buffer.includes('==SUMMARY==')) { const parts = buffer.split('==SUMMARY=='); buffer = parts[0].trim(); mode = 'summary'; summaryBuffer = parts[1] || ''; } } else if (mode === 'summary') { summaryBuffer += newContent; } else if (mode === 'chat') { accumulatedResponse += newContent; } } if (signal.aborted) throw new DOMException('Aborted', 'AbortError'); if (mode === 'idle' && accumulatedResponse.trim().length > 0) mode = 'chat'; if (mode === 'summary' || mode === 'edit' || mode === 'full') { const finalSummary = summaryBuffer.trim() || "Tasks completed."; let newFileContent = contextCode; let start = -1; let end = -1; if (mode === 'full') { newFileContent = buffer; start = 0; end = buffer.length; } else if (textSelection) { start = textSelection.start; const before = contextCode.substring(0, textSelection.start); const after = contextCode.substring(textSelection.end); newFileContent = before + buffer + after; end = start + buffer.length; } else if (searchBuffer) { const foundIndex = contextCode.indexOf(searchBuffer); if (foundIndex !== -1) { start = foundIndex; const before = contextCode.substring(0, foundIndex); const after = contextCode.substring(foundIndex + searchBuffer.length); newFileContent = before + buffer + after; end = start + buffer.length; } } else { const foundIndex = contextCode.indexOf(buffer); if (foundIndex !== -1) { start = foundIndex; end = foundIndex + buffer.length; } } if (start !== -1 || mode === 'full') { setEditorContent(prev => ({ ...prev, [activeFile]: newFileContent })); const newContentObj = { ...editorContent, [activeFile]: newFileContent }; const newHistory = history.slice(0, historyIndex + 1); newHistory.push(newContentObj); if (newHistory.length > 50) newHistory.shift(); setHistory(newHistory); setHistoryIndex(newHistory.length - 1); setTimeout(() => { if (textAreaRef.current) { textAreaRef.current.focus(); textAreaRef.current.setSelectionRange(start, end); const lineHeight = 24; const linesBefore = newFileContent.substring(0, start).split('\n').length; textAreaRef.current.scrollTop = (linesBefore - 5) * lineHeight; } setEditorHighlights({start, end}); setTimeout(() => setEditorHighlights(null), 2000); }, 50); } else { setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.findError}]); return; } setAiState('speaking'); setChatHistory(prev => [...prev, {role: 'ai', text: finalSummary, highlight: {start, end, file: activeFile}}]); } else if (mode === 'chat') { setAiState('speaking'); setChatHistory(prev => [...prev, {role: 'ai', text: accumulatedResponse}]); } else { setAiState('idle'); } } catch (e: any) { if (e.name !== 'AbortError') { console.error(e); setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.error}]); setAiState('idle'); } } finally { copilotAbortController.current = null; setToolbarPosition(null); setTextSelection(null); } };
  const handleExplainVariable = (variableName: string) => { setIsChatOpen(true); const jsCode = editorContent.js; const lines = jsCode.split('\n'); const index = lines.findIndex(l => l.includes(variableName) && /^(const|let|var)\s/.test(l.trim())); let context = variableName; if (index >= 0) { const start = Math.max(0, index - 2); const end = Math.min(lines.length, index + 3); context = lines.slice(start, end).join('\n'); } const prompt = language === 'zh' ? `请解释游戏代码中变量 "${variableName}" 的作用。` : `Explain the purpose of the variable "${variableName}" in the game code.`; runAICopilot(prompt, false, context); };
  const filteredLibraryAssets = libraryAssets.filter(asset => { if (libraryCategory === 'all') return true; if (libraryCategory === 'image') return asset.type === 'sprite' || asset.type === 'model' || asset.type === 'ui'; return asset.type === libraryCategory; });
  
  const handleDeleteVersion = async (e: React.MouseEvent, versionId: string) => { 
    e.stopPropagation(); 
    if (!selectedProject || !selectedProject.history) return; 

    const targetVersion = selectedProject.history.find(v => v.id === versionId);
    if (targetVersion && targetVersion.versionNumber === 1) {
        return;
    }
    
    const isTempId = versionId.startsWith('v1_') || versionId.startsWith('base_') || versionId.startsWith('imp_') || !versionId.includes('-');

    if (isTempId) {
        const updatedHistory = selectedProject.history.filter(v => v.id !== versionId);
        
        let newIndex = selectedProject.currentVersionIndex ?? (updatedHistory.length - 1);
        if (newIndex >= updatedHistory.length) newIndex = Math.max(0, updatedHistory.length - 1);
        
        const updatedGame = { 
            ...selectedProject, 
            history: updatedHistory, 
            currentVersionIndex: newIndex 
        };
        
        setSelectedProject(updatedGame);
        setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.versionDeleted}]);
        setVersionToDeleteId(null);
        return;
    }

    try { 
        const updatedGame = await apiDeleteGameVersion(selectedProject.id, versionId); 
        if (updatedGame) { 
            setSelectedProject(updatedGame); 
            setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.versionDeleted}]); 
            setVersionToDeleteId(null);
        } 
    } catch (err) { 
        console.error(err); 
        setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.deleteVersionError}]); 
    } 
  };

  if (!selectedProject) {
    return (
        <div className="h-full w-full bg-slate-950 flex flex-col px-4 pt-10 pb-24 overflow-y-auto custom-scrollbar">
            <header className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">{t.myStudio}</h1>
                    <p className="text-slate-400 text-xs mt-1">{games.length} {t.projectsActive}</p>
                </div>
                 <div className="flex gap-3">
                    <input type="file" ref={importFileInputRef} className="hidden" accept=".html,.htm" onChange={handleImportFile} />
                    
                    <div className="relative">
                        {isImporting ? (
                            <button onClick={cancelImport} className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 rounded-xl text-xs font-bold text-red-400 transition-all active:scale-95 h-full animate-in fade-in">
                                <X size={14} />
                                <span className="hidden sm:inline">{t.cancel}</span>
                            </button>
                        ) : (
                            <button onClick={() => setIsImportMenuOpen(!isImportMenuOpen)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-bold text-white transition-all active:scale-95 h-full">
                                <FileUp size={14} className="text-purple-400"/>
                                <span className="hidden sm:inline">{t.importHtml}</span>
                                <span className="sm:hidden">{t.importHtml.split(' ')[0]}</span>
                            </button>
                        )}

                        {isImportMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setIsImportMenuOpen(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-64 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl z-30 overflow-hidden p-1 animate-in fade-in zoom-in-95 origin-top-right flex flex-col gap-1">
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.selectMode}</div>
                                    <button
                                        onClick={() => initiateImport('ai')}
                                        className="w-full text-left px-3 py-3 hover:bg-white/5 rounded-lg transition-colors group"
                                    >
                                        <div className="text-xs font-bold text-white mb-0.5 group-hover:text-purple-400 transition-colors">{t.importAi}</div>
                                        <div className="text-[10px] text-slate-500 leading-tight">{t.importAiDesc}</div>
                                    </button>
                                    <button
                                        onClick={() => initiateImport('direct')}
                                        className="w-full text-left px-3 py-3 hover:bg-white/5 rounded-lg transition-colors group"
                                    >
                                        <div className="text-xs font-bold text-white mb-0.5 group-hover:text-yellow-400 transition-colors">{t.importDirect}</div>
                                        <div className="text-[10px] text-slate-500 leading-tight">{t.importDirectDesc}</div>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>
            <div className="space-y-3">
                <div onClick={onCreateNew} className="bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 cursor-pointer group transition-all">
                    <div className="w-14 h-14 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><Plus size={32} strokeWidth={3} /></div><div><h3 className="font-bold text-white text-sm">{t.createProto}</h3><p className="text-[10px] text-slate-500 mt-0.5">{t.createPrompt}</p></div>
                </div>
                {games.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 opacity-30"><LayoutDashboard size={48} className="mb-4 text-slate-600"/><p className="text-sm font-bold uppercase tracking-widest">{t.noProjects}</p></div>) : (games.map(game => (
                    <div key={game.id} className="group relative">
                        <div onClick={() => { setSelectedProject(game); setActiveTab('director'); }} className="bg-white/5 border border-white/5 rounded-xl p-3 flex gap-3 hover:bg-white/10 cursor-pointer transition-all pr-12">
                            {game.thumbnailUrl ? (<img src={game.thumbnailUrl} className="w-16 h-16 rounded-lg object-cover bg-slate-800" alt={game.title} />) : (<div className="w-16 h-16 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-slate-600"><Gamepad2 size={24}/></div>)}
                            <div className="flex-1 min-w-0"><h3 className="font-bold text-white text-sm mb-1 truncate">{game.title}</h3><div className="flex gap-2 items-center">{game.isPublished && (<span className="text-[10px] px-1.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{t.publishingTag}</span>)}<span className="text-[10px] text-slate-500">v{game.versionLabel || '1.0'}</span></div><p className="text-[10px] text-slate-500 mt-1 truncate">{game.description}</p></div>
                            <div className="flex items-center"><ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={20} /></div></div>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">{confirmDeleteId === game.id ? (<div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200"><button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors" title={t.cancel}><X size={16} /></button><button onClick={(e) => { e.stopPropagation(); onDeleteGame(game.id); setConfirmDeleteId(null); }} className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 shadow-lg shadow-red-900/20 transition-colors" title={t.confirmDelete}><Check size={16} /></button></div>) : (<button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(game.id); }} className="p-2 text-slate-600 hover:text-red-400 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all active:scale-90" title={t.deleteTooltip}><Trash2 size={18} /></button>)}</div>
                    </div>
                )))}
            </div>
        </div>
    );
  }

  const projectHistory = selectedProject.history || [];
  const currentVersionNumber = selectedProject.currentVersionIndex !== undefined ? selectedProject.currentVersionIndex + 1 : projectHistory.length || 1;
  const isCodeSyncedToLive = selectedProject.isPublished && selectedProject.publishedCode === selectedProject.code;
  const currentResolution = selectedProject.resolution || { width: 360, height: 640, mode: 'responsive' };
  const activeHistoryIndex = selectedProject.currentVersionIndex !== undefined ? selectedProject.currentVersionIndex : (projectHistory.length - 1);
  const activeVersion = projectHistory[activeHistoryIndex];
  const displayDescription = activeVersion?.description || selectedProject.description;
  const displayInstructions = activeVersion?.instructions || selectedProject.instructions;

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col relative"> 
        {/* TOAST for feedback */}
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none transition-all duration-300 ${showToast.show ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
            <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2">
                <Check size={16} className="text-emerald-400" />
                <span className="text-sm font-bold">{showToast.msg}</span>
            </div>
        </div>

        {previewAsset && (
            <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewAsset(null)}>
                <div className="relative max-w-2xl w-full bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h3 className="font-bold text-white flex items-center gap-2"><ZoomIn size={16} className="text-purple-400"/> {t.assetPreview}</h3>
                        <button onClick={() => setPreviewAsset(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-8 flex items-center justify-center bg-[#0f0f13] min-h-[300px] h-[50vh] relative overflow-hidden" onWheel={(e) => { if (previewAsset.type !== 'image') return; e.stopPropagation(); const delta = e.deltaY > 0 ? -0.1 : 0.1; setPreviewZoom(prev => Math.min(5, Math.max(0.1, prev + delta))); }} onMouseDown={(e) => { if (previewAsset.type !== 'image') return; isPreviewDragging.current = true; lastPreviewMouse.current = {x: e.clientX, y: e.clientY}; }} onMouseMove={(e) => { if (!isPreviewDragging.current) return; const dx = e.clientX - lastPreviewMouse.current.x; const dy = e.clientY - lastPreviewMouse.current.y; setPreviewOffset(prev => ({x: prev.x + dx, y: prev.y + dy})); lastPreviewMouse.current = {x: e.clientX, y: e.clientY}; }} onMouseUp={() => isPreviewDragging.current = false} onMouseLeave={() => isPreviewDragging.current = false}>
                         <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`, backgroundSize: '8px 8px' }}></div>
                         {previewAsset.type === 'audio' ? (
                             <div className="flex flex-col items-center gap-6 relative z-10 w-full max-w-sm">
                                 <div className="w-32 h-32 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.1)] overflow-hidden relative">
                                      {previewAsset.coverUrl ? (
                                          <img src={previewAsset.coverUrl} className="w-full h-full object-cover" />
                                      ) : (
                                          <Music size={64} className="text-pink-500 animate-pulse"/>
                                      )}
                                 </div>
                                 <div className="w-full bg-slate-800 rounded-full p-2 border border-white/5 shadow-lg">
                                     <audio controls src={previewAsset.src} className="w-full h-8" autoPlay />
                                 </div>
                             </div>
                         ) : (<><img src={previewAsset.src} className="max-w-full max-h-full object-contain relative z-10 transition-transform duration-75 ease-out shadow-2xl rounded-lg border border-white/5 [image-rendering:pixelated]" style={{ transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewZoom})`, cursor: previewZoom > 1 ? 'grab' : 'default' }} alt="preview" draggable={false} /><div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/90 backdrop-blur rounded-full p-1 border border-white/10 z-30 shadow-xl" onClick={e => e.stopPropagation()}><button onClick={() => setPreviewZoom(z => Math.max(0.1, z - 0.25))} className="p-1.5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors"><Minus size={14}/></button><span className="text-[10px] font-bold text-slate-300 w-10 text-center select-none">{Math.round(previewZoom * 100)}%</span><button onClick={() => setPreviewZoom(z => Math.min(5, z + 0.25))} className="p-1.5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors"><Plus size={14}/></button><div className="w-px h-3 bg-white/10 mx-1"></div><button onClick={() => { setPreviewZoom(1); setPreviewOffset({x:0, y:0}); }} className="p-1.5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors text-[10px] font-bold px-2">Reset</button></div></>)}
                    </div>
                    <div className="p-4 bg-slate-900 border-t border-white/10 flex justify-between items-center"><div className="min-w-0 flex-1 mr-4">{previewAsset.name && <p className="text-sm font-bold text-white mb-1 truncate">{previewAsset.name}</p>}<p className="text-[10px] text-slate-500 font-mono truncate">{previewAsset.type.toUpperCase()} • {previewAsset.src.substring(0, 30)}...</p></div><a href={previewAsset.src} download={`asset_${Date.now()}`} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2"><Download size={14}/> {t.download}</a></div>
                </div>
            </div>
        )}

        <div className="h-14 border-b border-white/10 flex items-center px-4 gap-3 bg-black/40 backdrop-blur-md z-20 shrink-0 relative">
            <button 
                disabled={isModifying || aiState === 'thinking'} 
                onClick={() => {
                    setIsEditInfoModalOpen(true);
                }} 
                className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10 relative flex items-center justify-center group transition-all ${isModifying || aiState === 'thinking' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-purple-500/50'}`}
            >
                {selectedProject.thumbnailUrl ? (
                    <img src={selectedProject.thumbnailUrl} className="w-full h-full object-cover" />
                ) : (
                    <Gamepad2 size={16} className="text-slate-400 group-hover:text-purple-400 transition-colors"/>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PenTool size={12} className="text-white"/>
                </div>
            </button>
            <div className="flex-1 min-w-0"><h2 className="text-sm font-bold text-white truncate">{selectedProject.title}</h2><div className="flex items-center gap-2"><p className="text-[10px] text-emerald-500 font-mono">v{currentVersionNumber}.0</p></div></div>
            
            <div className="relative">
                <button 
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                >
                    <Cpu size={14} className="text-purple-400"/>
                    <span className="hidden sm:inline">{MODELS.find(m => m.id === studioModel)?.label}</span>
                    <span className="sm:hidden">{MODELS.find(m => m.id === studioModel)?.label.replace('Gemini ', '')}</span>
                    <ChevronDown size={12} />
                </button>
                {isModelMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsModelMenuOpen(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl z-30 overflow-hidden py-1 animate-in fade-in zoom-in-95 origin-top-right">
                            {MODELS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => handleStudioModelSelect(m.id)}
                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-bold hover:bg-white/5 transition-colors flex items-center justify-between ${studioModel === m.id ? 'text-purple-400 bg-purple-500/10' : 'text-slate-400'}`}
                                >
                                    {m.label}
                                    {studioModel === m.id && <Check size={12} />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <button onClick={() => setIsPanMode(!isPanMode)} className={`p-2 rounded-full transition-colors ${isPanMode ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} title={t.panTool}><Hand size={18} /></button>
            <div className="relative"><button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2 rounded-full hover:bg-white/10 ${isSettingsOpen ? 'bg-white/10 text-white' : 'text-slate-400'}`} title={t.viewportSettings}><Smartphone size={18} /></button>
                {isSettingsOpen && (
                    <div className="absolute top-12 right-0 w-64 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-100 z-50">
                        <div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-white flex items-center gap-2"><Settings size={12}/> {t.viewportSettings}</h3><button onClick={() => setIsSettingsOpen(false)}><X size={12} className="text-slate-500 hover:text-white"/></button></div>
                        <button onClick={() => { setZoomLevel(100); setViewOffset({x: 0, y: 0}); }} className="w-full mb-4 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors active:scale-95" title={t.resetView}><RotateCcw size={14}/> {t.resetView}</button>
                        <div className="mb-4 bg-black/20 p-2 rounded-lg border border-white/5"><div className="flex justify-between items-center mb-2"><span className="text-[10px] text-slate-400 flex items-center gap-1"><ZoomIn size={10}/> {t.zoom}</span><span className="text-[10px] font-mono text-purple-400">{zoomLevel}%</span></div><input type="range" min="25" max="200" step="25" value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" /></div>
                        <div className="space-y-2 mb-4"><button onClick={() => handleResolutionPreset('responsive')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${currentResolution.mode === 'responsive' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{t.fullScreen}</button><button onClick={() => handleResolutionPreset('mobile-p')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${currentResolution.mode === 'fixed' && currentResolution.width === 360 ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{t.mobilePortrait}</button><button onClick={() => handleResolutionPreset('mobile-l')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${currentResolution.mode === 'fixed' && currentResolution.width === 640 ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{t.mobileLandscape}</button></div>
                        {currentResolution.mode === 'fixed' && (<div className="flex gap-2"><div className="flex-1"><label className="text-[10px] text-slate-500 block mb-1">Width</label><input type="number" value={currentResolution.width} onChange={(e) => handleResolutionChange(Number(e.target.value), currentResolution.height, 'fixed')} className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white" /></div><div className="flex items-center pt-4 text-slate-500">x</div><div className="flex-1"><label className="text-[10px] text-slate-500 block mb-1">Height</label><input type="number" value={currentResolution.height} onChange={(e) => handleResolutionChange(currentResolution.width, Number(e.target.value), 'fixed')} className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white" /></div></div>)}
                    </div>
                )}
            </div>
            <div className="h-6 w-px bg-white/10 mx-1"></div>
            <div ref={exportMenuRef} className="relative mr-2">
                {isPublishingBusy ? (
                    <button 
                        onClick={handleCancelPublish}
                        className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full flex items-center gap-2 animate-pulse cursor-pointer hover:bg-red-500/20"
                        title="Click to Cancel"
                    >
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs font-bold whitespace-nowrap">{t.generating}</span>
                    </button>
                ) : (
                    <button 
                        disabled={isModifying || aiState === 'thinking'}
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 ${isModifying || aiState === 'thinking' ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed shadow-none' : (isExportMenuOpen ? 'bg-indigo-700 text-white ring-2 ring-indigo-500/50' : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:scale-105')}`}
                    >
                         <Share2 size={12} /> {t.export}
                    </button>
                )}
                {isExportMenuOpen && !isPublishingBusy && (
                     <div className="absolute top-full right-0 pt-2 min-w-full z-50 flex flex-col items-end animate-in fade-in zoom-in-95 duration-200">
                         <div className="bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col p-1 min-w-full w-max">
                             <button onClick={() => { setIsExportMenuOpen(false); setIsPublishModalOpen(true); }} disabled={isCodeSyncedToLive} className={`w-full text-left px-3 py-2.5 flex items-center justify-center gap-2 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap ${isCodeSyncedToLive ? 'text-slate-500 cursor-not-allowed bg-black/20' : 'text-white hover:bg-white/10'}`}>
                                {isCodeSyncedToLive ? <Check size={12} className="text-emerald-500"/> : <Globe size={12} className="text-indigo-400"/>}
                                {isCodeSyncedToLive ? t.live : t.publish}
                             </button>
                             <div className="h-px bg-white/5 mx-2 my-1"></div>
                             <button onClick={() => { setIsExportMenuOpen(false); handleDownload(); }} className="w-full text-left px-3 py-2.5 flex items-center justify-center gap-2 text-[10px] font-bold text-white hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap">
                                <Download size={12} className="text-emerald-400"/>
                                {t.download}
                             </button>
                         </div>
                     </div>
                )}
            </div>
            <button onClick={() => setIsPreviewExpanded(!isPreviewExpanded)} className={`p-2 rounded-full ${isPreviewExpanded ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300'}`}>{isPreviewExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
        </div>

        {isLibraryModalOpen && (
            <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm h-[70vh] flex flex-col relative shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                         <h3 className="font-bold text-white flex items-center gap-2"><ShoppingBag size={16} className="text-pink-500"/> {t.myLibrary}</h3>
                         <button onClick={() => setIsLibraryModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
                    </div>
                    <div className="flex gap-2 p-2 bg-black/10 border-b border-white/5">
                        {['all', 'image', 'audio'].map(cat => (<button key={cat} onClick={() => setLibraryCategory(cat as any)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors ${libraryCategory === cat ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{cat}</button>))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {filteredLibraryAssets.length === 0 ? (<div className="flex flex-col items-center justify-center h-40 opacity-50"><ShoppingBag size={32} className="mb-2"/><p className="text-xs">{t.noAssetsCat}</p></div>) : (filteredLibraryAssets.map(asset => {
                            const isAdded = (selectedProject?.assets || []).some(a => a.id === asset.id);
                            return (
                                <button key={asset.id} onClick={() => !isAdded && handleAddLibraryAsset(asset)} disabled={isAdded} className={`w-full flex items-center gap-3 p-2 bg-white/5 border border-white/5 rounded-xl transition-all text-left ${isAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}>
                                    <div className="w-12 h-12 bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                                        <AssetThumbnail src={asset.imageUrl} type={asset.type === 'audio' ? 'audio' : 'image'} coverUrl={asset.coverUrl} className="w-full h-full" onClick={(e) => { e.stopPropagation(); setPreviewAsset({ name: asset.name, type: asset.type === 'audio' ? 'audio' : 'image', src: asset.imageUrl, coverUrl: asset.coverUrl }); }}/>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{asset.name}</div>
                                        <div className="text-[10px] text-slate-400 uppercase">{asset.type}</div>
                                    </div>
                                    <div className={`ml-auto p-1.5 rounded-full ${isAdded ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10'}`}>
                                        {isAdded ? <Check size={14}/> : <Plus size={14}/>}
                                    </div>
                                </button>
                            );
                        }))}
                    </div>
                </div>
            </div>
        )}
        
        {isPublishModalOpen && (
            <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
                    {publishStep !== 'generating_agent' && publishStep !== 'success' && (<button onClick={() => { setIsPublishModalOpen(false); setPublishStep('config'); }} className="absolute top-4 right-4 text-slate-500 hover:text-white z-20"><X size={18}/></button>)}
                    {publishStep === 'config' && (<div className="animate-in slide-in-from-bottom-5 p-6"><div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center"><Globe size={24} className="text-indigo-400"/></div><div><h3 className="text-xl font-bold text-white">{t.publishFeed}</h3><p className="text-sm text-slate-400">{t.releaseVer} v{publishDraft.versionLabel || selectedProject.versionLabel || '1.0'}</p></div></div><div className="mb-4"><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{t.previewCard}</label><div className="bg-black/40 border border-white/5 rounded-xl p-3 flex gap-4 items-center group relative overflow-hidden"><div className="w-20 h-20 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-white/10 relative flex items-center justify-center">{(publishDraft.thumbnailUrl || selectedProject.thumbnailUrl) ? (<img src={publishDraft.thumbnailUrl || selectedProject.thumbnailUrl} className="w-full h-full object-cover" />) : (<Gamepad2 size={32} className="text-slate-600"/>)}<div onClick={() => setPublishStep('cover_editor')} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><PenTool size={16} className="text-white"/></div></div><div className="flex-1 min-w-0"><div className="text-sm font-bold text-white truncate">{publishDraft.title || selectedProject.title}</div><div className="text-[10px] text-slate-400 line-clamp-2 mt-1">{publishDraft.description || selectedProject.description}</div><button onClick={() => setPublishStep('cover_editor')} className="text-[10px] text-purple-400 font-bold uppercase mt-2 hover:text-purple-300 flex items-center gap-1">{t.editInfo} <ChevronRight size={10}/></button></div></div></div><div className="bg-black/20 border border-white/5 rounded-xl p-4 mb-6"><div className="flex items-start gap-3"><div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${enableAutoplay ? 'bg-purple-600 border-purple-500' : 'border-slate-600 bg-slate-800'}`} onClick={() => setEnableAutoplay(!enableAutoplay)}>{enableAutoplay && <Check size={14} className="text-white"/>}</div><div><h4 className="text-sm font-bold text-white flex items-center gap-2">{t.enableAutoplay}<span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded uppercase">{t.recommended}</span></h4><p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.autoplayDesc}</p></div></div></div><button onClick={handlePublishFlow} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"><Globe size={16}/> {t.releaseNow}</button></div>)}
                    {publishStep === 'cover_editor' && (
                        <div className="animate-in slide-in-from-right-10 p-0 flex flex-col h-full bg-slate-900 overflow-y-auto">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPublishStep('config')} className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={18}/></button>
                                    <h3 className="font-bold text-white flex items-center gap-2"><PenTool size={16} className="text-pink-500"/> {t.editInfo}</h3>
                                </div>
                            </div>
                            <div className="p-6 flex flex-col gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{t.gameTitle}</label>
                                    <input type="text" value={publishDraft.title ?? selectedProject.title} onChange={(e) => setPublishDraft(prev => ({ ...prev, title: e.target.value }))} maxLength={20} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-pink-500 outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{t.versionLabel}</label>
                                    <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                                        <span className="text-sm font-bold text-slate-400">v</span>
                                        <input type="text" value={publishDraft.versionLabel ?? selectedProject.versionLabel ?? '1.0'} onChange={(e) => setPublishDraft(prev => ({ ...prev, versionLabel: e.target.value }))} maxLength={15} className="w-full bg-transparent text-sm font-bold text-white focus:outline-none" placeholder="1.0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{t.coverArt}</label>
                                    <div className="flex gap-4">
                                        <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-white/20 bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                                            {(publishDraft.thumbnailUrl || selectedProject.thumbnailUrl) ? (<img src={publishDraft.thumbnailUrl || selectedProject.thumbnailUrl} className="w-full h-full object-cover" />) : (<div className="flex flex-col items-center justify-center text-slate-600"><ImageIcon size={24} className="mb-1"/><span className="text-[8px] uppercase font-bold">{t.noCover}</span></div>)}
                                        </div>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <div className="flex gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
                                                <button onClick={() => setCoverEditTab('ai')} className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${coverEditTab === 'ai' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t.aiGen}</button>
                                                <button onClick={() => setCoverEditTab('upload')} className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${coverEditTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t.upload}</button>
                                            </div>
                                            {coverEditTab === 'ai' ? (
                                                <button onClick={handleAiCoverGen} disabled={isGeneratingCover} className="w-full h-10 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-lg gap-2 transition-all active:scale-95 disabled:opacity-50">
                                                    {isGeneratingCover ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                                                    {t.oneClickGen}
                                                </button>
                                            ) : (
                                                <div onClick={() => coverFileInputRef.current?.click()} className="flex-1 border border-dashed border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5 text-[10px] text-slate-400 gap-2 h-10">
                                                    <Upload size={12}/> {t.upload}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{t.description}</label>
                                    <textarea value={publishDraft.description ?? selectedProject.description} onChange={(e) => setPublishDraft(prev => ({ ...prev, description: e.target.value }))} maxLength={300} className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:border-pink-500 outline-none resize-none leading-relaxed" />
                                </div>
                                <button onClick={() => setPublishStep('config')} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all mt-auto shrink-0">{t.done}</button>
                                <input type="file" ref={coverFileInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {isEditInfoModalOpen && (
            <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
                    <div className="animate-in slide-in-from-right-10 p-0 flex flex-col h-full bg-slate-900 overflow-y-auto">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsEditInfoModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={18}/></button>
                                <h3 className="font-bold text-white flex items-center gap-2"><PenTool size={16} className="text-pink-500"/> {t.editInfo}</h3>
                            </div>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{t.gameTitle}</label>
                                <input type="text" value={publishDraft.title ?? selectedProject.title} onChange={(e) => setPublishDraft(prev => ({ ...prev, title: e.target.value }))} maxLength={20} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-pink-500 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{t.versionLabel}</label>
                                <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                                    <span className="text-sm font-bold text-slate-400">v</span>
                                    <input type="text" value={publishDraft.versionLabel ?? selectedProject.versionLabel ?? '1.0'} onChange={(e) => setPublishDraft(prev => ({ ...prev, versionLabel: e.target.value }))} maxLength={15} className="w-full bg-transparent text-sm font-bold text-white focus:outline-none" placeholder="1.0" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{t.coverArt}</label>
                                <div className="flex gap-4">
                                    <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-white/20 bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                                        {(publishDraft.thumbnailUrl || selectedProject.thumbnailUrl) ? (<img src={publishDraft.thumbnailUrl || selectedProject.thumbnailUrl} className="w-full h-full object-cover" />) : (<div className="flex flex-col items-center justify-center text-slate-600"><ImageIcon size={24} className="mb-1"/><span className="text-[8px] uppercase font-bold">{t.noCover}</span></div>)}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="flex gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
                                            <button onClick={() => setCoverEditTab('ai')} className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${coverEditTab === 'ai' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t.aiGen}</button>
                                            <button onClick={() => setCoverEditTab('upload')} className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${coverEditTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t.upload}</button>
                                        </div>
                                        {coverEditTab === 'ai' ? (
                                            <button onClick={handleAiCoverGen} disabled={isGeneratingCover} className="w-full h-10 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-lg gap-2 transition-all active:scale-95 disabled:opacity-50">
                                                {isGeneratingCover ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                                                {t.oneClickGen}
                                            </button>
                                        ) : (
                                            <div onClick={() => coverFileInputRef.current?.click()} className="flex-1 border border-dashed border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5 text-[10px] text-slate-400 gap-2 h-10">
                                                <Upload size={12}/> {t.upload}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{t.description}</label>
                                <textarea value={publishDraft.description ?? selectedProject.description} onChange={(e) => setPublishDraft(prev => ({ ...prev, description: e.target.value }))} maxLength={300} className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:border-pink-500 outline-none resize-none leading-relaxed" />
                            </div>
                            <button onClick={handleSaveGameInfo} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all mt-auto shrink-0">{t.done}</button>
                            <input type="file" ref={coverFileInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 relative">
            <div className={`relative w-full transition-all duration-300 ease-in-out bg-[#0c0c12] overflow-hidden ${isPreviewExpanded ? 'flex-1 h-full' : 'h-[40%] border-b border-white/10'}`}>
                 <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' }}></div>
                 <GameRunner game={selectedProject} isActive={true} isInteractive={true} scale={zoomLevel / 100} offset={viewOffset} />
                 {isPanMode && (<div className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing touch-none" onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)} onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleDragEndTouch}/>)}
            </div>
            
            <div className={`flex flex-col bg-slate-900/95 backdrop-blur-md transition-all duration-300 ease-in-out border-t border-white/5 relative ${isPreviewExpanded ? 'h-0 overflow-hidden opacity-0' : 'flex-1 min-h-0 opacity-100'}`}>
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/20 relative z-20">
                     <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                         <button onClick={() => setActiveTab('director')} className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold transition-all ${activeTab === 'director' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}><Sparkles size={12} /> {t.director}</button>
                         <button onClick={() => setActiveTab('code')} className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold transition-all ${activeTab === 'code' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><CodeIcon size={12} /> {t.code}</button>
                         <button onClick={() => setActiveTab('inspector')} className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold transition-all ${activeTab === 'inspector' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}><Maximize2 size={12} /> {t.inspector}</button>
                     </div>
                     {activeTab === 'director' && (<div className="flex items-center gap-2"><button onClick={() => setActiveOverlay(activeOverlay === 'info' ? 'none' : 'info')} className={`p-1.5 rounded-lg border border-transparent transition-all ${activeOverlay === 'info' ? 'bg-white/10 text-white border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} title={t.gameConfig}><Info size={16} /></button><button onClick={() => setActiveOverlay(activeOverlay === 'devkit' ? 'none' : 'devkit')} className={`px-3 py-1.5 rounded-lg border border-transparent flex items-center gap-2 text-xs font-bold transition-all ${activeOverlay === 'devkit' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}><Bot size={14} /><span className="hidden sm:inline">{t.devKit}</span></button></div>)}
                     {activeTab === 'code' && (<div className="flex items-center gap-1"><div className="relative"><button onClick={() => setShowVersionHistory(!showVersionHistory)} className={`p-1.5 rounded hover:bg-white/10 ${showVersionHistory ? 'text-white bg-white/10' : 'text-slate-400'}`}><History size={14} /></button>{showVersionHistory && (<div className="absolute top-full right-0 mt-2 w-64 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl z-[100] p-2 animate-in fade-in zoom-in-95 flex flex-col gap-1"><h4 className="text-[10px] font-bold text-slate-500 px-2 mb-1 uppercase tracking-wider flex items-center gap-1"><History size={10}/> {t.versionHistory}</h4><button onClick={() => { const currentVersion = projectHistory[activeHistoryIndex]; const { html, css, js } = extractFiles(currentVersion?.code || ''); updateEditorContent({ html, css, js }); setShowVersionHistory(false); setChatHistory(prev => [...prev, {role: 'ai', text: t.chat.reverted}]); setAiState('speaking'); }} className="w-full text-left px-2 py-2 hover:bg-white/5 rounded text-[10px] text-slate-300 hover:text-white truncate transition-colors border-l-2 border-transparent hover:border-purple-500 flex justify-between items-center bg-black/20"><div><div className="font-bold text-white flex items-center gap-1"><GitCommit size={10}/> {t.baseOriginal}</div><div className="text-[9px] text-slate-500 opacity-70">{t.initialGen}</div></div></button><div className="h-px bg-white/5 my-1"></div><div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">{(!projectHistory[activeHistoryIndex]?.minorVersions || projectHistory[activeHistoryIndex]?.minorVersions?.length === 0) && (<p className="text-[10px] text-slate-600 px-2 py-2 italic text-center">{t.noManualSaves}</p>)}{(projectHistory[activeHistoryIndex]?.minorVersions || []).slice().reverse().map((mv) => (<div key={mv.id} className="flex items-stretch gap-1 group/item"><button onClick={() => handleLoadSnapshot(mv)} className="flex-1 text-left px-2 py-1.5 hover:bg-white/5 rounded text-[10px] text-slate-300 hover:text-white truncate transition-colors border-l-2 border-transparent hover:border-purple-500"><div className="font-bold text-white">{mv.label}</div><div className="text-[9px] text-slate-500 opacity-70">{new Date(mv.timestamp).toLocaleTimeString()}</div></button><button onClick={(e) => handleDeleteSnapshot(mv.id, e)} className="px-2 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors flex items-center justify-center"><Trash2 size={12}/></button></div>))}</div></div>)}</div><button onClick={handleManualSave} disabled={!hasUnsavedChanges} className={`p-1.5 rounded flex items-center gap-1 ${hasUnsavedChanges ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600'}`}><Play size={14} fill={hasUnsavedChanges ? "currentColor" : "none"}/></button></div>)}
                </div>

                {activeTab === 'director' && (
                    <div 
                        className="h-full flex flex-col min-h-0 bg-slate-950 relative"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                         {isDraggingFile && (
                            <div className="absolute inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                                <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                    <Upload size={40} className="text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">{language === 'zh' ? '释放文件以附加' : 'Drop file to attach'}</h3>
                                <p className="text-indigo-200 mt-2">{language === 'zh' ? '支持图片、音频、视频及代码文件' : 'Supports images, audio, video & code files'}</p>
                            </div>
                        )}
                         {activeOverlay === 'devkit' && (<div className="absolute top-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-xl border-b border-purple-500/30 p-4 shadow-2xl animate-in slide-in-from-top-2 flex flex-col gap-4 max-h-[80%] overflow-y-auto"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Bot size={16} className="text-purple-400"/> {t.zeroCode}</h3><div className="flex items-center gap-2"><button onClick={() => loadTasksForStage(activePipelineStage)} disabled={isLoadingTasks} className="p-1.5 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors" title={t.refreshSuggestions}><RefreshCw size={14} className={isLoadingTasks ? "animate-spin" : ""} /></button><button onClick={() => setActiveOverlay('none')} className="text-slate-500 hover:text-white"><X size={16}/></button></div></div><div className="flex justify-between items-center px-2">{PIPELINE_CONFIG.map((stage) => { const isActive = activePipelineStage === stage.id; return (<button key={stage.id} onClick={() => { setActivePipelineStage(stage.id); setModificationType(stage.mode as any); }} className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? `border-current ${stage.color} bg-white/10` : 'border-slate-700 bg-slate-900 text-slate-500'}`}><stage.icon size={14} /></div><span className={`text-[9px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{(t as any)[stage.id]}</span></button>) })}</div><div className="bg-slate-900/50 rounded-lg p-3 border border-white/5 min-h-[160px] shrink-0">{PIPELINE_CONFIG.map(stage => { if (stage.id !== activePipelineStage) return null; const dynamicTasks = devKitTasks[stage.id]; const tasksToShow = (dynamicTasks && dynamicTasks.length > 0) ? dynamicTasks : stage.actions; return (<div key={stage.id} className="animate-in fade-in slide-in-from-right-4 duration-300"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><stage.icon size={16} className={stage.color}/><h4 className={`text-sm font-bold ${stage.color}`}>{dynamicTasks ? t.aiSuggestions : t.standardTasks}</h4></div>{isLoadingTasks && <Loader2 size={14} className="text-slate-500 animate-spin"/>}</div><div className="grid grid-cols-1 gap-2">{tasksToShow.map((action: any, idx: number) => { const isDynamic = !!action.label; const displayLabel = isDynamic ? action.label : t[action.id as keyof typeof t]; const promptToUse = isDynamic ? action.prompt : (t[(action.id + '_prompt') as keyof typeof t] || action.prompt); return (<button key={idx} onClick={() => { setModificationPrompt(promptToUse); setModificationType(stage.mode as any); setIsFromDevKit(true); setActiveOverlay('none'); }} className="flex items-center justify-between p-2.5 bg-black/40 hover:bg-white/5 border border-white/5 hover:border-white/20 rounded-lg group text-left transition-all"><div className="flex items-center gap-3"><div className={`w-1.5 h-1.5 rounded-full ${stage.color}`}></div><span className="text-xs text-slate-300 font-medium group-hover:text-white">{displayLabel}</span></div><div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-purple-400 flex items-center gap-1">{t.apply} <ArrowRight size={10} /></div></button>); })}{!dynamicTasks && !isLoadingTasks && (<button onClick={() => loadTasksForStage(stage.id)} className="w-full py-2 mt-1 border border-dashed border-white/10 rounded-lg text-[10px] text-slate-500 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-2"><Sparkles size={10} className="text-yellow-400"/> {t.analyzeCode}</button>)}</div></div>) })}</div></div>)}
                        
                         {activeOverlay === 'info' && (
                             <div className="absolute top-0 right-0 z-20 w-full max-sm:max-w-none max-w-sm h-full bg-slate-900/95 backdrop-blur-xl border-l border-white/10 p-4 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                                 <div className="flex items-center justify-between mb-4">
                                     <div className="flex items-center gap-2">
                                         <ShieldCheck size={16} className="text-emerald-400"/>
                                         <span className="text-xs font-bold text-white uppercase tracking-wider">{t.compliance}</span>
                                     </div>
                                     <button onClick={() => setActiveOverlay('none')} className="text-slate-500 hover:text-white"><X size={16}/></button>
                                 </div>
                                 <div className="space-y-4">
                                     <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30">
                                         <h4 className="text-[9px] font-black text-emerald-500 uppercase mb-2 flex items-center gap-1.5">
                                             <Play size={10} fill="currentColor"/> {t.currentImpl}
                                         </h4>
                                         <p className="text-xs text-slate-200 leading-relaxed font-medium mb-3">{displayDescription}</p>
                                         <div className="bg-black/40 p-2 rounded border border-white/5">
                                             <h5 className="text-[8px] font-bold text-slate-500 uppercase mb-1">{t.activeControls}</h5>
                                             <p className="text-[11px] text-emerald-400 font-mono">{displayInstructions}</p>
                                         </div>
                                         <div className="mt-3 pt-3 border-t border-emerald-500/20">
                                             <h5 className="text-[8px] font-bold text-slate-500 uppercase mb-1">{t.genModel}</h5>
                                             <div className="flex items-center gap-2">
                                                 <Cpu size={12} className="text-purple-400"/>
                                                 <span className="text-xs text-white font-bold">{activeVersion?.modelName || selectedProject.modelName || 'Gemini 2.5 Flash'}</span>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         )}

                         <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {projectHistory.length <= 1 && !isModifying && (<div className="flex flex-col items-center justify-center py-10 opacity-50 space-y-2"><Box size={32} className="text-slate-600"/><p className="text-xs text-slate-500 text-center">{t.devKitHintPre}<strong>{t.devKitHintBold}</strong>{t.devKitHintPost}<br/>{t.devKitHintLine2}</p></div>)}
                            {projectHistory.map((version, idx) => { 
                                const isCurrent = idx === (selectedProject.currentVersionIndex !== undefined ? selectedProject.currentVersionIndex : projectHistory.length - 1); 
                                const isLive = selectedProject.isPublished && selectedProject.publishedVersionId === version.id; 
                                let liveLabel = null; 
                                if (isLive) { 
                                    if (selectedProject.publishedMinorVersionId) { 
                                        const minor = version.minorVersions?.find(m => m.id === selectedProject.publishedMinorVersionId); 
                                        liveLabel = minor ? `Live: ${minor.label}` : "Live: Snapshot"; 
                                    } else { 
                                        liveLabel = "Live: Base"; 
                                    } 
                                }
                                
                                let activeLabel = "Base";
                                if (version.activeMinorVersionId && version.minorVersions) {
                                    const activeSnap = version.minorVersions.find(v => v.id === version.activeMinorVersionId);
                                    if (activeSnap) activeLabel = activeSnap.label;
                                }

                                return (
                                    <React.Fragment key={version.id}>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-end gap-2 max-w-[85%]">
                                                <div className="bg-indigo-600 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-md">
                                                    <p className="text-xs text-white leading-relaxed">{version.prompt}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start gap-1">
                                            <div className="flex items-end gap-2 max-w-[90%]">
                                                <div className={`rounded-2xl rounded-tl-sm p-3 border shadow-md transition-all cursor-pointer hover:border-white/20 group relative pr-8 ${isCurrent ? 'bg-[#1e1e2e] border-purple-500/50' : 'bg-slate-900 border-slate-800'}`} onClick={() => handleRestoreVersion(idx)}>
                                                    <div className="flex items-center justify-between gap-4 mb-1">
                                                        <span className={`text-[10px] font-bold ${isCurrent ? 'text-purple-300' : 'text-slate-500'}`}>{new Date(version.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                                        <div className="flex gap-1">
                                                            {isCurrent && <span className="text-[8px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">{t.active}</span>}
                                                            {isCurrent && activeLabel !== "Base" && (
                                                                <span className="text-[8px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 truncate max-w-[80px]">
                                                                    <Edit3 size={8}/> {activeLabel}
                                                                </span>
                                                            )}
                                                            {liveLabel && <span className="text-[8px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1"><Globe size={8}/> {liveLabel}</span>}
                                                        </div>
                                                    </div>
                                                    <VersionSummary summary={version.summary || "Updates applied successfully."} />
                                                    {versionToDeleteId === version.id ? (
                                                        <div className="absolute top-2 right-2 flex gap-1 bg-slate-900 rounded p-0.5 shadow-lg animate-in fade-in zoom-in">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setVersionToDeleteId(null); }}
                                                                className="p-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => handleDeleteVersion(e, version.id)}
                                                                className="p-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                                                            >
                                                                <Check size={10} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setVersionToDeleteId(version.id); }} 
                                                            className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Delete Version"
                                                        >
                                                            <Trash2 size={12}/>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                ); 
                            })}
                            {isModifying && pendingPrompt && (<div className="flex flex-col items-end gap-1 animate-in fade-in slide-in-from-bottom-2"><div className="flex items-end gap-2 max-w-[85%]"><div className="bg-indigo-600 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-md"><p className="text-xs text-white leading-relaxed">{pendingPrompt}</p></div></div></div>)}
                            {isModifying && (<div className="flex flex-col items-start gap-1 animate-in fade-in slide-in-from-bottom-2"><div className="flex items-end gap-2 max-w-[90%]"><div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm p-3 shadow-md min-w-[220px]"><div className="flex justify-between items-start gap-2"><div className="flex-1 flex flex-col gap-2"><span className="text-emerald-400 font-bold text-[10px] tracking-wider animate-pulse uppercase">{lastLogLine}</span><div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div></div><span className="text-[9px] text-slate-500 italic">{currentFlavorTexts[flavorIndex]}</span></div><button onClick={cancelModification} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full transition-colors" title={t.stop}><X size={12} /></button></div></div></div></div>)}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-3 bg-slate-950 border-t border-white/10 shrink-0">
                            {(selectedAssetIds.length > 0 || previewUrl) && (<div className="mb-2 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 duration-200">
                                {previewUrl && (
                                    <div className={`animate-in zoom-in duration-200 flex items-center gap-2 pr-2 rounded-lg border overflow-hidden ${attachment?.mimeType === 'unsupported' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                                        <div className={`relative w-10 h-10 border-r border-white/10 flex items-center justify-center shrink-0 ${attachment?.mimeType === 'unsupported' ? 'bg-red-500/20 border-red-500/30' : 'bg-black/40'}`}>
                                            {attachment?.mimeType === 'unsupported' ? (
                                                <div className="w-full h-full flex items-center justify-center text-red-400"><AlertCircle size={16}/></div>
                                            ) : attachment?.mimeType.startsWith('image/') ? (
                                                <img src={previewUrl} className="w-full h-full object-cover" alt="upload" />
                                            ) : attachment?.mimeType.startsWith('video/') ? (
                                                <div className="w-full h-full flex items-center justify-center bg-indigo-900/40 text-indigo-300"><Film size={14}/></div>
                                            ) : attachment?.mimeType.startsWith('audio/') ? (
                                                <div className="w-full h-full flex items-center justify-center bg-yellow-900/40 text-yellow-300"><Music size={14}/></div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-300 flex-col gap-0.5">
                                                    <Paperclip size={12}/>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col min-w-0 max-w-[150px]">
                                            <span className={`text-[10px] font-bold truncate leading-tight ${attachment?.mimeType === 'unsupported' ? 'text-red-300' : 'text-slate-200'}`} title={attachment?.fileName}>
                                                {attachment?.fileName || 'Untitled'}
                                            </span>
                                            <span className={`text-[9px] font-mono uppercase leading-tight ${attachment?.mimeType === 'unsupported' ? 'text-red-400/70' : 'text-slate-500'}`}>
                                                {attachment?.mimeType === 'unsupported' ? (language === 'zh' ? '不支持的格式' : 'UNSUPPORTED') : (attachment?.mimeType.split('/')[1] || 'FILE')}
                                            </span>
                                        </div>

                                        <button 
                                            onClick={removeStudioAttachment}
                                            className={`p-1.5 rounded-full transition-colors ml-1 ${attachment?.mimeType === 'unsupported' ? 'hover:bg-red-500/20 text-red-400 hover:text-red-200' : 'hover:bg-white/10 text-slate-500 hover:text-white'}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                                {selectedAssetIds.map(id => { const asset = (selectedProject.assets || []).find(a => a.id === id); if (!asset) return null; return (<div key={id} className="bg-pink-500/20 border border-pink-500/40 rounded-full pl-1.5 pr-2 py-1 flex items-center gap-1.5 animate-in zoom-in-95"><div className="w-5 h-5 rounded-full overflow-hidden bg-black/40 border border-white/10">{asset.type === 'image' ? <img src={asset.data.startsWith('http') ? asset.data : `data:${asset.mimeType};base64,${asset.data}`} className="w-full h-full object-cover" /> : <Music size={10} className="m-auto mt-1 text-pink-400"/>}</div><span className="text-[10px] text-pink-200 font-bold max-w-[80px] truncate">{asset.name}</span><button onClick={() => toggleAssetSelection(id)} className="text-pink-400 hover:text-white"><X size={10}/></button></div>); })}</div>)}
                            <div className="relative flex items-center gap-2">
                                <input type="file" ref={studioFileInputRef} className="hidden" onChange={handleStudioFileChange} accept="image/*,video/*,audio/*,.pdf,.txt,.md,.json,.csv" />
                                <button onClick={() => studioFileInputRef.current?.click()} className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"><Paperclip size={18} /></button>
                                <div className="relative flex-1">
                                    <div className={`absolute top-3.5 left-3 text-[10px] font-bold uppercase pointer-events-none px-1.5 py-0.5 rounded transition-all flex items-center gap-1.5 ${(isFromDevKit || activeOverlay === 'devkit') ? (modificationType === 'logic' ? 'bg-indigo-500/20 text-indigo-400' : modificationType === 'art' ? 'bg-pink-500/20 text-pink-400' : 'bg-yellow-500/20 text-yellow-400') : 'bg-slate-800 text-slate-400' }`}><span>{activeVersion ? new Date(activeVersion.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'V1'}</span>{(isFromDevKit || activeOverlay === 'devkit') && (<><div className="w-1 h-1 rounded-full bg-current opacity-40"></div><span>{modificationType}</span></>)}</div>
                                    <input type="text" value={modificationPrompt} onChange={(e) => { setModificationPrompt(e.target.value); if (e.target.value === '') setIsFromDevKit(false); }} placeholder={t.describeChanges} style={{ paddingLeft: (isFromDevKit || activeOverlay === 'devkit') ? (modificationType === 'logic' || modificationType === 'music' ? '150px' : '140px') : '110px' }} className="w-full bg-slate-900 border border-slate-700 rounded-full pr-12 py-3 text-sm text-white focus:border-purple-500 outline-none transition-all" onKeyDown={(e) => e.key === 'Enter' && !isModifying && handleModifyGame(modificationPrompt, modificationType)} />
                                    {isModifying ? (
                                        <button onClick={cancelModification} className="absolute right-1 top-1 p-2 bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors animate-in zoom-in duration-200"><StopCircle size={16} /></button>
                                    ) : (
                                        <button onClick={() => handleModifyGame(modificationPrompt, modificationType)} className="absolute right-1 top-1 p-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white transition-colors"><Send size={16} /></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'code' && (<div className="flex-1 min-h-0 flex flex-col relative bg-[#1e1e2e]">{toolbarPosition && textSelection && (<div className="absolute z-50 flex gap-1 bg-slate-800 p-1 rounded-lg border border-white/10 shadow-xl animate-in fade-in zoom-in-95 duration-200" style={{ top: toolbarPosition.top, left: toolbarPosition.left }}><button onClick={() => runAICopilot(`${t.explain}: ${textSelection.text}`)} className="px-2 py-1 text-[10px] font-bold text-white hover:bg-white/10 rounded flex items-center gap-1"><MessageCircleQuestion size={12} className="text-purple-400"/> {t.explain}</button><button onClick={() => runAICopilot(`${t.refactor}: ${textSelection.text}`)} className="px-2 py-1 text-[10px] font-bold text-white hover:bg-white/10 rounded flex items-center gap-1"><Wand2 size={12} className="text-emerald-400"/> {t.refactor}</button><button onClick={() => runAICopilot(`${t.fix}: ${textSelection.text}`)} className="px-2 py-1 text-[10px] font-bold text-white hover:bg-white/10 rounded flex items-center gap-1"><Bug size={12} className="text-red-400"/> {t.fix}</button></div>)}<div className="flex-1 relative overflow-hidden flex group">{editorHighlights && (<div className="absolute inset-0 pointer-events-none z-10 p-4 pl-14 font-mono text-xs leading-6 text-transparent whitespace-pre">{displayEditorContent.substring(0, editorHighlights.start)}<span className="bg-emerald-500/30 rounded border border-emerald-500/50 animate-pulse">{displayEditorContent.substring(editorHighlights.start, editorHighlights.end)}</span></div>)}<div ref={lineNumbersRef} className="w-10 bg-[#1e1e2e] border-r border-white/5 flex flex-col items-end pr-2 pt-4 pb-4 select-none text-slate-600 font-mono text-xs leading-6 overflow-hidden">{displayEditorContent.split('\n').map((_, i) => (<div key={i}>{i + 1}</div>))}<div className="min-h-[40px] w-full"></div></div><textarea ref={textAreaRef} value={displayEditorContent} onChange={(e) => { const newVal = e.target.value; const unmaskedVal = activeFile === 'js' ? getUnmaskedCode(newVal) : newVal; updateEditorContent({ ...editorContent, [activeFile]: unmaskedVal }); }} onMouseUp={handleMouseUp} onScroll={handleScroll} onSelect={handleSelect} className="flex-1 bg-[#1e1e2e] text-slate-300 p-4 font-mono text-xs leading-6 resize-none outline-none whitespace-pre border-none z-0 relative" spellCheck={false} autoCapitalize="off" /></div><div className="bg-[#181825] border-t border-white/5 px-2 flex items-center gap-1 h-8"><button onClick={() => setActiveFile('html')} className={`px-3 h-full text-[10px] font-bold border-t-2 transition-colors flex items-center gap-1.5 ${activeFile === 'html' ? 'border-orange-500 text-slate-200 bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}><FileType size={10} className="text-orange-400"/> index.html</button><button onClick={() => setActiveFile('css')} className={`px-3 h-full text-[10px] font-bold border-t-2 transition-colors flex items-center gap-1.5 ${activeFile === 'css' ? 'border-blue-500 text-slate-200 bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}><FileCode size={10} className="text-blue-400"/> style.css</button><button onClick={() => setActiveFile('js')} className={`px-3 h-full text-[10px] font-bold border-t-2 transition-colors flex items-center gap-1.5 ${activeFile === 'js' ? 'border-yellow-500 text-slate-200 bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}><FileJson size={10} className="text-yellow-400"/> script.js</button><div className="flex-1"></div><div className="flex items-center gap-2 px-2 text-[10px] text-slate-500"><GitCommit size={10}/><span>{historyIndex + 1}/{history.length}</span></div><button onClick={handleUndo} disabled={historyIndex <= 0} className={`p-1 rounded hover:bg-white/10 ${historyIndex <= 0 ? 'text-slate-700' : 'text-slate-400'}`}><RotateCcw size={12}/></button><button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className={`p-1 rounded hover:bg-white/10 ${historyIndex >= history.length - 1 ? 'text-slate-700' : 'text-slate-400'}`}><RotateCw size={12}/></button></div></div>)}
                {activeTab === 'inspector' && (<div className="flex-1 min-h-0 flex flex-col bg-slate-950 overflow-hidden"><div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0"><div><h3 className="text-sm font-black text-white flex items-center gap-2"><Maximize2 className="text-pink-500" size={16}/> {t.smartInspector}</h3><p className="text-[10px] text-slate-500">{t.bindAssets}</p></div><div className="relative"><button onClick={() => setIsAddAssetMenuOpen(!isAddAssetMenuOpen)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold rounded-lg flex items-center gap-2 transition-all"><Plus size={14}/> {t.addAsset}</button>{isAddAssetMenuOpen && (<div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 origin-top-right"><button onClick={() => { bulkAssetInputRef.current?.click(); setIsAddAssetMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors group"><Laptop size={14} className="text-slate-400 group-hover:text-white"/><div><span className="text-xs font-bold text-white block">{t.fromDevice}</span><span className="text-[9px] text-slate-500 block">{t.uploadLocal}</span></div></button><div className="h-px bg-white/5 mx-2"></div><button onClick={() => { setIsLibraryModalOpen(true); setIsAddAssetMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors group"><ShoppingBag size={14} className="text-slate-400 group-hover:text-pink-400"/><div><span className="text-xs font-bold text-white block group-hover:text-pink-400">{t.fromLibrary}</span><span className="text-[9px] text-slate-500 block">{t.useAcquired}</span></div></button></div>)}</div><input type="file" ref={bulkAssetInputRef} className="hidden" multiple accept="image/*,audio/*" onChange={handleBulkAssetUpload} /></div><div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">{assetSlots.length > 0 && (<section className="animate-in fade-in slide-in-from-left-4 duration-500"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Link size={12} className="text-pink-500"/> {t.sceneLogic}</h4><div className="grid grid-cols-1 gap-2">{assetSlots.map(slot => (<AssetSlotItem key={slot.variableName} slot={slot} isPickerOpen={isSlotPickerOpen === slot.variableName} onTogglePicker={() => setIsSlotPickerOpen(isSlotPickerOpen === slot.variableName ? null : slot.variableName)} onBind={bindAssetToSlot} onClear={clearAssetFromSlot} onExplain={handleExplainVariable} projectAssets={selectedProject?.assets || []} t={t} setPreviewAsset={setPreviewAsset} />))}</div></section>)}{numberSlots.length > 0 && (<section className="animate-in fade-in slide-in-from-left-4 duration-500 delay-100"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Sliders size={12} className="text-indigo-500"/> {t.parameters}</h4><p className="text-[10px] text-slate-500 mb-3 px-1">{t.tweakHint}</p><div className="grid grid-cols-1 gap-2">{numberSlots.map(slot => (<NumberSlotInput key={slot.variableName} slot={slot} onUpdate={updateNumericValue} onExplain={handleExplainVariable} />))}</div></section>)}<section><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{t.projectLibrary}</h4>{(selectedProject.assets || []).length === 0 ? (<div className="h-40 flex flex-col items-center justify-center opacity-30"><Box size={32} className="mb-2"/><p className="text-[10px] font-bold uppercase tracking-widest">{t.noAssets}</p></div>) : (<div className="space-y-3">{(selectedProject.assets || []).map(asset => (<div key={asset.id} className="bg-white/5 border border-white/5 rounded-xl overflow-hidden transition-all"><div className="p-3 flex items-center gap-3"><div className="w-12 h-12 bg-black/40 rounded-lg overflow-hidden shrink-0 border border-white/10 flex items-center justify-center"><AssetThumbnail src={asset.data.startsWith('http') ? asset.data : `data:${asset.mimeType};base64,${asset.data}`} type={asset.type === 'audio' ? 'audio' : 'image'} coverUrl={asset.coverUrl} className="w-full h-full" onClick={(e) => { e.stopPropagation(); setPreviewAsset({ name: asset.name, type: asset.type === 'audio' ? 'audio' : 'image', src: asset.data.startsWith('http') ? asset.data : `data:${asset.mimeType};base64,${asset.data}`, coverUrl: asset.coverUrl }); }}/></div><div className="flex-1 min-w-0"><h4 className="text-xs font-bold text-white truncate">{asset.name}</h4><p className="text-[9px] text-slate-500 font-mono uppercase mt-0.5">{asset.type} • {(asset.data.length / 1024).toFixed(1)} KB</p></div><div className="flex gap-2"><button onClick={() => deleteAsset(asset.id)} className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg border border-white/5 transition-all"><Trash2 size={14} /></button></div></div></div>))}</div>)}</section></div></div>)}
            </div>
            {activeTab !== 'director' && (<div className={`fixed bottom-32 right-4 z-[100] flex flex-col items-end transition-all duration-300 ${isAvatarPeeking ? 'translate-x-[40%]' : 'translate-x-0'}`} onMouseLeave={() => { if (!isChatOpen) setIsAvatarPeeking(true); }}>{isChatOpen && (<div className="mb-4 w-80 h-[500px] max-h-[60vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300"><div className="p-3 bg-slate-800 border-b border-black flex justify-between items-center"><span className="text-xs font-bold text-white flex items-center gap-2"><Bot size={14} className="text-emerald-400"/> {t.copilotChat}</span><button onClick={() => { setIsChatOpen(false); setIsAvatarPeeking(true); }} className="text-slate-500 hover:text-white"><X size={14}/></button></div><div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/20 pb-20 no-scrollbar">{chatHistory.length === 0 && (<div className="flex flex-col items-center justify-center mt-10 opacity-50"><Sparkles size={24} className="text-purple-500 mb-2"/><p className="text-[10px] text-slate-400 text-center px-4">{t.copilotPlaceholder}</p></div>)}{chatHistory.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div onClick={() => { if (msg.highlight) { setActiveFile(msg.highlight.file); setTimeout(() => { if (textAreaRef.current) { textAreaRef.current.focus(); textAreaRef.current.setSelectionRange(msg.highlight.start, msg.highlight.end); const lineHeight = 24; const linesBefore = editorContent[msg.highlight.file].substring(0, msg.highlight.start).split('\n').length; textAreaRef.current.scrollTop = (linesBefore - 5) * lineHeight; } setEditorHighlights({start: msg.highlight.start, end: msg.highlight.end}); setTimeout(() => setEditorHighlights(null), 2000); }, 50); } }} className={`text-[11px] p-2.5 rounded-2xl max-w-[90%] leading-relaxed break-words whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none'} ${msg.highlight ? 'cursor-pointer hover:bg-slate-700 transition-colors border-emerald-500/30' : ''}`}>{msg.text}{msg.highlight && <div className="mt-1 flex items-center gap-1 text-[9px] text-emerald-400 opacity-80"><Search size={10}/> {t.reference}</div>}</div></div>))}<div ref={messageEndRef} /></div><div className="p-3 bg-slate-800 border-t border-black relative">{textSelection && (<div className="mb-2 bg-slate-700/50 border border-white/5 rounded px-2 py-1.5 flex items-center gap-2"><FileCode size={10} className="text-purple-400"/><div className="flex-1 min-w-0"><p className="text-[10px] text-slate-300 font-mono truncate">{t.reference}: <span className="opacity-50">Lines {editorContent[activeFile].substring(0, textSelection.start).split('\n').length}-{editorContent[activeFile].substring(0, textSelection.end).split('\n').length}</span></p><p className="text-[9px] text-slate-500 font-mono truncate italic opacity-70">"{textSelection.text.replace(/\n/g, ' ')}"</p></div><button onClick={() => setTextSelection(null)} className="text-slate-500 hover:text-white"><X size={10}/></button></div>)}<div className="relative"><input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runAICopilot(chatInput, false)} placeholder={textSelection ? t.editThis : t.askAnything } className="w-full bg-black/50 border border-white/5 rounded-xl pl-3 pr-9 py-2.5 text-xs text-white outline-none placeholder:text-slate-600" /><button onClick={() => aiState === 'thinking' ? stopCopilot() : runAICopilot(chatInput, false)} className={`absolute right-2 top-2 p-1 transition-colors ${aiState === 'thinking' ? 'text-slate-400 hover:text-red-400 cursor-pointer' : 'text-slate-400 hover:text-emerald-400'}`}>{aiState === 'thinking' ? <Loader2 size={14} className="animate-spin" /> : (chatInput.toLowerCase().includes('where') || chatInput.toLowerCase().includes('find') ? <Search size={14}/> : <Send size={14}/>)}</button></div></div></div>)} {!isChatOpen && showCopilotGreeting && ( <div onClick={() => setShowCopilotGreeting(false)} className="mb-3 mr-1 relative animate-in slide-in-from-bottom-2 fade-in duration-500 cursor-pointer"> <div className="bg-[#1e1e2e] border border-emerald-500/30 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-2xl relative max-w-[240px] hover:bg-[#252535] transition-colors"> <div className="flex justify-between items-start gap-2"> <p className="text-xs font-bold leading-relaxed pointer-events-none text-emerald-100">{t.copilotGreeting}</p> <button onClick={(e) => { e.stopPropagation(); setShowCopilotGreeting(false); }} className="text-slate-400 hover:text-white -mt-1 -mr-1"><X size={12} /></button> </div> <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-[#1e1e2e] border-r border-b border-emerald-500/30 transform rotate-45"></div> </div> </div> )} <div className="relative group cursor-pointer" onClick={() => { if (isChatOpen) { setIsChatOpen(false); setIsAvatarPeeking(true); } else { setIsChatOpen(true); setIsAvatarPeeking(false); } setShowCopilotGreeting(false); }} onMouseEnter={() => setIsAvatarPeeking(false)}>{(chatHistory.length > 0 && aiState === 'speaking' && !isChatOpen) && (<div onClick={(e) => { e.stopPropagation(); setAiState('idle'); }} className="absolute bottom-14 right-0 w-56 bg-slate-800 text-white text-[10px] p-3 rounded-xl rounded-br-none shadow-xl border border-white/10 mb-2 animate-in fade-in slide-in-from-bottom-2 cursor-pointer hover:bg-slate-700 transition-colors"><div className="flex justify-between items-start gap-2"><p className="leading-relaxed">{chatHistory[chatHistory.length-1].text.substring(0, 80)}{chatHistory[chatHistory.length-1].text.length > 80 ? '...' : ''}</p><button className="text-slate-500 hover:text-white"><X size={10}/></button></div></div>)}<div className={`w-12 h-12 rounded-full border-2 bg-slate-900 flex items-center justify-center shadow-lg transition-all ${aiState === 'thinking' ? 'border-purple-500 animate-pulse' : 'border-emerald-500'}`}><Bot size={24} className={aiState === 'thinking' ? 'text-purple-400' : 'text-emerald-400'}/></div></div></div>)}
        </div>
    </div>
  );
};

export default Studio;
