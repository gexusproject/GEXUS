
import React, { useState, useRef, useEffect } from 'react';
import { Game } from '../types';
import { suggestConcepts, Attachment } from '../services/geminiService';
import { Sparkles, Loader2, Box, ArrowRight, Paperclip, X, Image as ImageIcon, Music, Film, Trash2, BrainCircuit, Plus, RefreshCw, List, Check, ChevronRight, Ban, ChevronDown, AlertCircle } from 'lucide-react';

interface CreationWizardProps {
  onGameCreated: (game: Game) => void;
  language: 'en' | 'zh';
  // New Props for Global State
  isGenerating: boolean;
  progress: number;
  status: string;
  streamLog?: string;
  onGenerate: (prompt: string, attachment?: Attachment, model?: string) => void;
  onCancel: () => void;
}

const TEXT = {
  en: {
    create: "CREATE",
    new: "NEW",
    subtitle: "Describe a gameplay mechanic. Our AI will build a playable \"White Box\" prototype in seconds.",
    placeholderSpecific: "Add specific details...",
    placeholderEx: "Ex: A platformer where you control the level rotation...",
    attachTooltip: "Attach image, video or audio",
    cancel: "CANCEL",
    generate: "GENERATE",
    manageConcepts: "Manage Concepts",
    noConcepts: "No concepts added.",
    manageHint: "Tap to delete. Close to return.",
    aiModel: "AI Model: Gemini 3 Pro",
    nextTitle: "What happens next?",
    nextDesc: "Your prototype will be saved to your Studio. You can then manage tasks, buy assets, and release it to the public feed.",
    refresh: "Refresh ideas",
    thinking: "Thinking",
    failed: "Generation Failed. Please try again.",
    cancelled: "Generation cancelled by user",
    studio: "Studio",
    streamTitle: "Neural Stream"
  },
  zh: {
    create: "创建",
    new: "新项目",
    subtitle: "描述游戏机制。AI 将在几秒钟内构建一个可玩的“白盒”原型。",
    placeholderSpecific: "添加具体细节...",
    placeholderEx: "例如：控制关卡旋转的平台跳跃游戏...",
    attachTooltip: "附加图片、视频或音频",
    cancel: "取消",
    generate: "生成",
    manageConcepts: "管理概念",
    noConcepts: "未添加概念。",
    manageHint: "点击删除。关闭返回。",
    aiModel: "AI 模型：Gemini 3 Pro",
    nextTitle: "接下来会发生什么？",
    nextDesc: "您的原型将保存到您的工作室。之后您可以管理任务、购买素材并将其发布到公共信息流。",
    refresh: "刷新灵感",
    thinking: "思考中",
    failed: "生成失败。请重试。",
    cancelled: "生成已取消",
    studio: "工作室",
    streamTitle: "神经流"
  }
};

const STARTERS_EN = [
    "Medieval tavern manager", "Roguelike dungeon crawler", "One-button fighting game", 
    "2D Minecraft clone", "Vampire Survivors clone", "Suika watermelon merge",
    "Cyberpunk rhythm racer", "Gravity switching platformer", "Physics-based soccer",
    "Tower defense vs zombies", "Cozy farming sim", "Typing shooter",
    "Rhythm cooking game", "Stealth puzzle", "Infinite runner"
];

const STARTERS_ZH = [
    "中世纪酒馆经营", "肉鸽地牢爬行", "一键格斗游戏", "2D 我的世界克隆", 
    "吸血鬼幸存者克隆", "合成大西瓜", "赛博朋克节奏赛车", "重力反转平台跳跃", 
    "物理足球", "塔防大战僵尸", "休闲农场模拟", "打字射击游戏", 
    "节奏烹饪游戏", "潜行解谜", "无尽跑酷"
];

const MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro' },
];

const CreationWizard: React.FC<CreationWizardProps> = ({ onGameCreated, language, isGenerating, progress, status, streamLog, onGenerate, onCancel }) => {
  const t = TEXT[language];
  // Input State
  const [inputText, setInputText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [deleteCandidateIndex, setDeleteCandidateIndex] = useState<number | null>(null);
  
  // Tag Management Modal State
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Model Selection State
  const [selectedModel, setSelectedModel] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('creation_wizard_model') || 'gemini-2.5-flash';
      }
      return 'gemini-2.5-flash';
  });
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const handleModelSelect = (modelId: string) => {
      setSelectedModel(modelId);
      localStorage.setItem('creation_wizard_model', modelId);
      setIsModelMenuOpen(false);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const streamLogRef = useRef<HTMLDivElement>(null);
  
  // Drag Scroll Refs
  const suggestionsScrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const isDragClick = useRef(false); 

  // Computed combined prompt for AI Context
  const combinedPrompt = `${selectedTags.join(', ')} ${inputText}`.trim();

  useEffect(() => {
    refreshSuggestions();
  }, [language]); 

  // Auto-scroll stream log
  useEffect(() => {
      if (streamLogRef.current) {
          streamLogRef.current.scrollTop = streamLogRef.current.scrollHeight;
      }
  }, [streamLog]);

  const handleAddTag = (tag: string) => {
      if (!selectedTags.includes(tag)) {
          setSelectedTags([...selectedTags, tag]);
          setSuggestions(prev => prev.filter(t => t !== tag));
      }
      setTimeout(() => textAreaRef.current?.focus(), 10);
  };

  const handleRemoveTag = (tagToRemove: string) => {
      setSelectedTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleTagClickInInput = (index: number) => {
      if (deleteCandidateIndex === index) {
          setSelectedTags(prev => prev.filter((_, i) => i !== index));
          setDeleteCandidateIndex(null);
      } else {
          setDeleteCandidateIndex(index);
          setTimeout(() => setDeleteCandidateIndex(prev => prev === index ? null : prev), 2000);
      }
  };

  const refreshSuggestions = async () => {
    setIsLoadingSuggestions(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    if (combinedPrompt && combinedPrompt.length >= 3) {
         try {
            const newTags = await suggestConcepts(combinedPrompt, language);
             if (newTags && newTags.length > 0) {
                const filtered = newTags.filter(t => !selectedTags.includes(t));
                setSuggestions(filtered);
            }
        } catch (e) { console.error(e); }
    } else {
        const starters = language === 'zh' ? STARTERS_ZH : STARTERS_EN;
        setSuggestions(starters.sort(() => 0.5 - Math.random()).slice(0, 5));
    }
    setIsLoadingSuggestions(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    isDragClick.current = false;
    if (suggestionsScrollRef.current) {
        startX.current = e.pageX - suggestionsScrollRef.current.offsetLeft;
        scrollLeft.current = suggestionsScrollRef.current.scrollLeft;
    }
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    setTimeout(() => { isDragClick.current = false; }, 50); 
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    if (suggestionsScrollRef.current) {
        const x = e.pageX - suggestionsScrollRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5; 
        if (Math.abs(walk) > 5) isDragClick.current = true;
        suggestionsScrollRef.current.scrollLeft = scrollLeft.current - walk;
    }
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
      const base64 = (reader.result as string).split(',')[1];
      setAttachment({
        data: base64,
        mimeType: isSupported ? mimeType : 'unsupported',
        fileName: file.name
      });
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if we're really leaving the main container
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
          return;
      }
      
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

  const removeAttachment = () => {
    setAttachment(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerGenerate = () => {
      if (!combinedPrompt.trim()) return;
      onGenerate(combinedPrompt, attachment || undefined, selectedModel);
  };

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col px-6 pt-10 overflow-y-auto no-scrollbar relative">
        <div className="mb-6 shrink-0 flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter mb-2">
                    {t.create} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{t.new}</span>
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                    {t.subtitle}
                </p>
            </div>
            <div className="relative">
                <button 
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                >
                    <Sparkles size={12} className="text-purple-400"/>
                    {MODELS.find(m => m.id === selectedModel)?.label}
                    <ChevronDown size={12} />
                </button>
                {isModelMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsModelMenuOpen(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-40 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl z-30 overflow-hidden py-1 animate-in fade-in zoom-in-95 origin-top-right">
                            {MODELS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => handleModelSelect(m.id)}
                                    className={`w-full text-left px-4 py-2 text-[10px] font-bold hover:bg-white/5 transition-colors flex items-center justify-between ${selectedModel === m.id ? 'text-purple-400' : 'text-slate-400'}`}
                                >
                                    {m.label}
                                    {selectedModel === m.id && <Check size={10} />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Suggestion Chips Container */}
        {!isGenerating && (
            <div className="mb-4 shrink-0 w-full relative group">
                {isLoadingSuggestions ? (
                    <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                        {[1, 2, 3].map((_, i) => (
                            <div 
                                key={i} 
                                className="h-8 w-24 bg-white/5 border border-white/5 rounded-full animate-pulse flex items-center px-3"
                            >
                                <div className="w-full h-2 bg-white/10 rounded-full"></div>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 ml-1 text-purple-500/50 animate-pulse">
                            <BrainCircuit size={14} className="animate-spin duration-slow" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{t.thinking}</span>
                        </div>
                    </div>
                ) : (
                    <div 
                        ref={suggestionsScrollRef}
                        className="w-full overflow-x-auto no-scrollbar pb-2 cursor-grab active:cursor-grabbing"
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                    >
                        <div className="flex gap-2 w-max pr-12">
                            {suggestions.map((ex, i) => (
                                <button 
                                    key={`${ex}-${i}`}
                                    onClick={() => {
                                        if (!isDragClick.current) handleAddTag(ex);
                                    }}
                                    className="text-[11px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-full px-4 py-2 text-slate-200 transition-all active:scale-95 whitespace-nowrap animate-in slide-in-from-right-8 fade-in duration-500 fill-mode-backwards select-none"
                                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!isLoadingSuggestions && (
                    <>
                        <div className="absolute top-0 right-0 bottom-2 w-16 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none z-10" />
                        <button 
                            onClick={(e) => { e.stopPropagation(); refreshSuggestions(); }}
                            className="absolute top-1/2 -translate-y-[calc(50%+4px)] right-0 w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-300 shadow-md border border-white/10 z-20 active:scale-95 transition-all"
                            title={t.refresh}
                        >
                            <RefreshCw size={12} />
                        </button>
                    </>
                )}
            </div>
        )}

        {/* Composite Input Area */}
        <div 
            className={`
                relative mb-4 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col transition-all min-h-[14rem]
                ${isGenerating ? 'opacity-50 pointer-events-none' : 'focus-within:bg-white/10 focus-within:border-purple-500/30'}
                ${isDraggingFile ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50' : ''}
                pb-16
            `}
            onClick={() => textAreaRef.current?.focus()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDraggingFile && (
                <div className="absolute inset-0 z-50 bg-slate-900/90 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-purple-500 animate-in fade-in duration-200 backdrop-blur-sm pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 animate-bounce">
                        <Paperclip size={32} className="text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{language === 'zh' ? '释放文件以附加' : 'Drop file to attach'}</h3>
                    <p className="text-slate-400 text-sm">{language === 'zh' ? '支持图片、音频、视频及代码文件' : 'Supports images, audio, video & code files'}</p>
                </div>
            )}

            {/* Selected Tags - Inline Preview */}
            {selectedTags.length > 0 && (
                <div className="w-full mb-3 pb-2 border-b border-white/5 shrink-0 flex items-center gap-2 relative">
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                        <div className="flex gap-2 w-max pr-4">
                            {selectedTags.map((tag, i) => {
                                const isCandidate = deleteCandidateIndex === i;
                                return (
                                    <span 
                                        key={i} 
                                        onClick={(e) => { e.stopPropagation(); handleTagClickInInput(i); }}
                                        className={`
                                            cursor-pointer select-none text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap
                                            ${isCandidate 
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                                                : 'bg-gradient-to-r from-purple-600/20 to-pink-500/20 text-pink-200 border border-purple-500/30 hover:border-purple-400/50'}
                                        `}
                                    >
                                        {tag}
                                        {isCandidate && <Trash2 size={10} />}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsManageTagsOpen(true); }}
                        className="shrink-0 p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors border border-white/5"
                        title={t.manageConcepts}
                    >
                        <List size={14} />
                    </button>
                </div>
            )}

            {/* Text Input */}
            <textarea
                ref={textAreaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={selectedTags.length > 0 ? t.placeholderSpecific : t.placeholderEx}
                className="w-full bg-transparent border-none text-white placeholder:text-slate-500 focus:outline-none focus:ring-0 resize-none font-medium text-sm flex-1 min-h-[80px]"
                disabled={isGenerating}
            />

            {/* Toolbar Bottom Left */}
            <div className="absolute bottom-3 left-3 flex gap-2 items-center">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept="image/*,video/*,audio/*,.pdf,.txt,.md,.json,.csv,.js,.html,.css"
                />
                <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    disabled={isGenerating}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title={language === 'zh' ? "附加文件 (推荐 PDF/文本，不支持 Word)" : "Attach file (PDF/Text recommended, Word not supported)"}
                >
                    <Paperclip size={18} />
                </button>

                {/* Attachment Preview */}
                {previewUrl && (
                  <div className={`animate-in zoom-in duration-200 flex items-center gap-2 pr-2 rounded-lg border overflow-hidden ${attachment?.mimeType === 'unsupported' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className={`relative w-10 h-10 border-r flex items-center justify-center shrink-0 ${attachment?.mimeType === 'unsupported' ? 'bg-red-500/20 border-red-500/30' : 'bg-black/40 border-white/10'}`}>
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
                        onClick={(e) => { e.stopPropagation(); removeAttachment(); }}
                        className={`p-1.5 rounded-full transition-colors ml-1 ${attachment?.mimeType === 'unsupported' ? 'hover:bg-red-500/20 text-red-400 hover:text-red-200' : 'hover:bg-white/10 text-slate-500 hover:text-white'}`}
                    >
                        <X size={12} />
                    </button>
                  </div>
                )}
            </div>

            {/* Toolbar Bottom Right */}
            <div className="absolute bottom-3 right-3 pointer-events-auto">
                {isGenerating ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all shadow-lg bg-red-600/80 hover:bg-red-500 text-white hover:scale-105 active:scale-95 shadow-red-900/20"
                    >
                        <Ban size={14} />
                        {t.cancel}
                    </button>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); triggerGenerate(); }}
                        disabled={(!inputText.trim() && selectedTags.length === 0)}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all shadow-lg
                            ${(!inputText.trim() && selectedTags.length === 0)
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-white text-black hover:scale-105 active:scale-95 shadow-white/10'}
                        `}
                    >
                        <Sparkles size={14} />
                        {t.generate}
                    </button>
                )}
            </div>

            {/* INLINE MANAGE TAGS OVERLAY */}
            {isManageTagsOpen && (
                <div className="absolute inset-0 z-20 bg-slate-900 rounded-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 shadow-2xl border border-white/10">
                     <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/20">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <List size={12} className="text-purple-400"/>
                            {t.manageConcepts}
                        </span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsManageTagsOpen(false); }}
                            className="p-1 bg-white/10 rounded-full text-slate-400 hover:text-white hover:bg-white/20 transition-colors"
                        >
                            <X size={14} />
                        </button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                        <div className="flex flex-wrap gap-2">
                            {selectedTags.map(tag => (
                                <button 
                                    key={tag}
                                    onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg group transition-all"
                                >
                                    <span className="text-xs text-red-200 font-bold">{tag}</span>
                                    <Trash2 size={12} className="text-red-400 group-hover:text-red-300"/>
                                </button>
                            ))}
                        </div>
                        {selectedTags.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <List size={24} className="mb-2"/>
                                <span className="text-[10px] font-medium">{t.noConcepts}</span>
                            </div>
                        )}
                     </div>
                     <div className="p-2 border-t border-white/5 bg-black/20 text-center">
                        <p className="text-[9px] text-slate-500 font-medium">{t.manageHint}</p>
                     </div>
                </div>
            )}
        </div>

        {isGenerating && (
            <div className="mt-4 animate-in fade-in zoom-in-95 duration-300 shrink-0">
                <div className="bg-black border-2 border-purple-900/50 rounded-lg p-6 shadow-[0_0_30px_rgba(168,85,247,0.2)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                    <div className="relative z-10 text-center mb-6 min-h-[40px] flex items-center justify-center flex-col">
                         <Box className="animate-bounce mb-2 text-purple-400" size={24} />
                        <h3 className="text-purple-300 font-bold text-lg tracking-wider animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] font-mono uppercase">
                            {status}
                        </h3>
                    </div>

                    <div className="relative h-8 bg-slate-900 border-2 border-slate-700 rounded-sm mb-2 overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]"></div>
                        <div 
                            className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-300 ease-out flex items-center justify-end pr-2"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="w-full h-full absolute top-0 left-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-black text-white drop-shadow-md tracking-widest">{Math.round(progress)}%</span>
                        </div>
                    </div>

                    <div className="text-center">
                         <span className="text-[10px] text-slate-500 font-mono">Model: {MODELS.find(m => m.id === selectedModel)?.label}</span>
                    </div>

                    {/* Only show stream panel when log has content */}
                    {streamLog && (
                        <div ref={streamLogRef} className="mt-4 bg-black/80 border border-purple-500/30 rounded-lg p-4 font-mono text-[10px] text-green-400 h-32 overflow-y-auto shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] text-left relative custom-scrollbar">
                            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10"></div>
                            <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1 sticky top-0 bg-black/80 z-20 backdrop-blur-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                                <span className="uppercase tracking-widest text-slate-500 text-[9px] font-bold">{t.streamTitle}</span>
                            </div>
                            <pre className="whitespace-pre-wrap break-all font-mono leading-relaxed opacity-90 pb-6">
                                {streamLog}
                                <span className="animate-pulse inline-block w-1.5 h-3 bg-green-500 ml-0.5 align-middle"></span>
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {!isGenerating && (
            <div className="mt-auto mb-24 flex items-start gap-3 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl shrink-0">
                 <div className="bg-indigo-500/20 p-2 rounded-lg">
                    <ArrowRight size={16} className="text-indigo-300"/>
                 </div>
                 <div>
                     <h4 className="text-indigo-200 font-bold text-xs mb-1">{t.nextTitle}</h4>
                     <p className="text-indigo-300/60 text-[11px] leading-relaxed">
                         {t.nextDesc}
                     </p>
                 </div>
            </div>
        )}
    </div>
  );
};

export default CreationWizard;
