import React, { useState, useRef, useEffect } from 'react';
import CreationWizard from './components/CreationWizard';
import Studio from './components/Studio';
import { Game, GameVersion, Asset } from './types';
import { polishGameDescription, streamGameCode, updateGameMetadata, generateGameThumbnail, Attachment } from './services/geminiService';
import { apiSaveGame } from './services/storage';
import { Menu, Plus, Settings, Gamepad2, X, Trash2, Check } from 'lucide-react';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'create' | 'studio'>('create');
  const [games, setGames] = useState<Game[]>([]);
  const [projectToLoad, setProjectToLoad] = useState<Game | null>(null);
  const [libraryAssets, setLibraryAssets] = useState<Asset[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatus, setGenStatus] = useState('');
  const [genStreamLog, setGenStreamLog] = useState('');
  
  const genAbortRef = useRef<AbortController | null>(null);
  const genTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  const [apiKey, setApiKey] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // Load Settings
    const savedLang = localStorage.getItem('gexus_language') as 'en' | 'zh';
    if (savedLang) setLanguage(savedLang);
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) setApiKey(savedKey);

    // Load Games
    const loadedGames: Game[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('game_')) {
        try {
          loadedGames.push(JSON.parse(localStorage.getItem(key) || '{}'));
        } catch (e) {}
      }
    }
    // Sort by createdAt descending
    loadedGames.sort((a, b) => b.createdAt - a.createdAt);
    setGames(loadedGames);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('gexus_language', language);
    if (apiKey) {
      localStorage.setItem('user_gemini_api_key', apiKey);
    } else {
      localStorage.removeItem('user_gemini_api_key');
    }
    setIsSettingsOpen(false);
  };

  const handleUpdateGame = (updatedGame: Game, persist: boolean = true) => {
    setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
    if (persist) apiSaveGame(updatedGame);
  };

  const handleDeleteGame = (gameId: string) => {
    setGames(prev => prev.filter(g => g.id !== gameId));
    localStorage.removeItem('game_' + gameId);
  };

  const handleGlobalGenerate = async (prompt: string, attachment?: Attachment, modelName: string = 'gemini-3-flash-preview') => {
    if (isGenerating) return; 
    
    setIsGenerating(true);
    setGenProgress(0);
    setGenStatus('Initializing...');
    setGenStreamLog('');
    
    const controller = new AbortController();
    genAbortRef.current = controller;
    const signal = controller.signal;

    genTimerRef.current = setInterval(() => {
        setGenProgress(prev => {
            if (prev >= 95) return prev;
            const increment = prev < 30 ? 2 : prev < 60 ? 0.5 : 0.1;
            return Math.min(prev + increment, 95);
        });
    }, 100);

    try {
        setGenStatus('Synthesizing Core Mechanics...');
        const meta = await polishGameDescription(prompt, signal, language, modelName);
        
        setGenStatus('Compiling Prototype Build...');
        
        let fullResponse = '';
        let hasSeenSeparator = false;
        
        const stream = streamGameCode(prompt, attachment, signal, language, modelName);
        for await (const chunk of stream) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            
            const previousFullResponse = fullResponse;
            fullResponse += chunk;
            
            if (!hasSeenSeparator) {
                if (fullResponse.includes('==CODE_START==')) {
                    hasSeenSeparator = true;
                    const parts = fullResponse.split('==CODE_START==');
                    const finalThoughts = parts[0];
                    
                    setGenStreamLog(prev => {
                        const systemPart = prev.slice(0, prev.length - previousFullResponse.length);
                        return systemPart + finalThoughts + "\n> Generating Code...\n";
                    });
                } else {
                    setGenStreamLog(prev => prev + chunk);
                }
            } else {
                setGenProgress(prev => Math.min(prev + 0.5, 98));
            }
        }
        
        let code = '';
        if (fullResponse.includes('==CODE_START==')) {
            code = fullResponse.split('==CODE_START==')[1];
        } else {
            code = fullResponse;
        }
        
        if (code.startsWith('```')) code = code.replace(/^```(html)?/i, '').replace(/```$/, '');
        code = code.trim();

        setGenStatus('Auditing Code Capability...');
        const realMeta = await updateGameMetadata(code, signal, language);

        setGenStatus('Generating Brand Assets...');
        const thumbnail = await generateGameThumbnail(prompt, signal);
        
        setGenProgress(95);
        if (genTimerRef.current) clearInterval(genTimerRef.current);
        
        setGenStatus('Finalizing Build...');
        setGenProgress(100);
        
        const timestamp = Date.now();
        const initialVersion: GameVersion = {
            id: `v1_${timestamp}`,
            timestamp: timestamp,
            prompt: prompt,
            code: code,
            versionNumber: 1,
            summary: 'Initial Prototype',
            description: realMeta.description, 
            instructions: realMeta.instructions,
            modelName: modelName
        };

        const newGame: Game = {
            id: timestamp.toString(),
            title: meta.title,
            description: realMeta.description,
            instructions: realMeta.instructions,
            author: 'Local Dev',
            likes: 0,
            coins: 0,
            fundingGoal: 1000,
            status: 'prototype',
            isPublished: false,
            code: code,
            thumbnailUrl: thumbnail,
            type: 'white-box',
            createdAt: timestamp,
            teamMembers: 1,
            tasksCompleted: 0,
            totalTasks: 5,
            history: [initialVersion],
            currentVersionIndex: 0,
            resolution: { width: 360, height: 640, mode: 'responsive' }
        };

        setGames(prev => [newGame, ...prev]);
        apiSaveGame(newGame);
        setProjectToLoad(newGame);
        setCurrentView('studio');
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error(error);
            setGenStatus('Generation Failed.');
        } else {
            setGenStatus('Cancelled');
        }
    } finally {
        setIsGenerating(false);
        if (genTimerRef.current) clearInterval(genTimerRef.current);
        genAbortRef.current = null;
    }
  };

  const handleGlobalCancel = () => {
    if (genAbortRef.current) {
        genAbortRef.current.abort();
        genAbortRef.current = null;
    }
    setIsGenerating(false);
    if (genTimerRef.current) clearInterval(genTimerRef.current);
    setGenStatus('Cancelled');
  };

  return (
    <div className="flex w-full h-screen bg-slate-950 text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className={`flex flex-col h-full bg-slate-900 border-r border-white/5 transition-all duration-300 ${isSidebarOpen ? 'w-[280px]' : 'w-[68px]'} shrink-0 z-20`}>
        {/* Top: Menu */}
        <div className="p-3 flex items-center h-16 shrink-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-full text-slate-300 transition-colors">
            <Menu size={20} />
          </button>
        </div>

        {/* New Project */}
        <div className="px-3 mb-4 shrink-0">
          <button 
            onClick={() => { setCurrentView('create'); setProjectToLoad(null); }}
            className={`flex items-center gap-3 rounded-full transition-all overflow-hidden ${isSidebarOpen ? 'px-4 py-2.5 w-full' : 'w-11 h-11 justify-center'} ${currentView === 'create' ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
          >
            <Plus size={20} className="shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">{language === 'zh' ? '新项目' : 'New Project'}</span>}
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3">
          {isSidebarOpen && games.length > 0 && (
            <div className="text-xs font-medium text-slate-400 mb-2 px-2">{language === 'zh' ? '近期项目' : 'Recent Projects'}</div>
          )}
          <div className="flex flex-col gap-1">
            {games.map(game => {
              const isActive = currentView === 'studio' && projectToLoad?.id === game.id;
              return (
              <div key={game.id} className="relative group">
                <button
                  onClick={() => { setProjectToLoad(game); setCurrentView('studio'); }}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${isSidebarOpen ? 'w-full pr-8' : 'justify-center'} ${isActive ? 'bg-purple-500/10 text-purple-300' : 'hover:bg-white/5 text-slate-300'}`}
                  title={!isSidebarOpen ? game.title : undefined}
                >
                  <div className={`w-6 h-6 rounded shrink-0 overflow-hidden flex items-center justify-center border ${isActive ? 'bg-purple-500/20 border-purple-500/30' : 'bg-slate-800 border-white/5'}`}>
                    {game.thumbnailUrl ? (
                      <img src={game.thumbnailUrl} alt={game.title} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 size={14} className={isActive ? "text-purple-400" : "text-slate-500"} />
                    )}
                  </div>
                  {isSidebarOpen && (
                    <span className={`text-sm truncate ${isActive ? 'font-semibold text-purple-300' : 'text-slate-300'}`}>{game.title}</span>
                  )}
                </button>
                {isSidebarOpen && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {confirmDeleteId === game.id ? (
                      <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} 
                          className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors"
                        >
                          <X size={14} />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDeleteGame(game.id);
                            setConfirmDeleteId(null);
                            if (isActive) {
                              setCurrentView('create');
                              setProjectToLoad(null);
                            }
                          }} 
                          className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 shadow-lg shadow-red-900/20 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(game.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-white/10"
                        title={language === 'zh' ? '删除项目' : 'Delete Project'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>

        {/* Settings */}
        <div className="p-3 shrink-0">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-300 ${isSidebarOpen ? 'w-full' : 'justify-center'}`}
          >
            <Settings size={20} className="shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium">{language === 'zh' ? '设置' : 'Settings'}</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full relative overflow-hidden">
        {currentView === 'create' && (
          <CreationWizard 
            onGameCreated={(game) => {
              setGames(prev => [game, ...prev]);
              apiSaveGame(game);
              setProjectToLoad(game);
              setCurrentView('studio');
            }}
            language={language}
            isGenerating={isGenerating}
            progress={genProgress}
            status={genStatus}
            streamLog={genStreamLog}
            onGenerate={handleGlobalGenerate}
            onCancel={handleGlobalCancel}
          />
        )}
        {currentView === 'studio' && (
          <Studio 
            games={games}
            onUpdateGame={handleUpdateGame}
            onDeleteGame={handleDeleteGame}
            onCreateNew={() => { setCurrentView('create'); setProjectToLoad(null); }}
            onGameImported={(game) => {
              setGames(prev => [game, ...prev]);
              apiSaveGame(game);
            }}
            libraryAssets={libraryAssets}
            language={language}
            projectToLoad={projectToLoad}
            onProjectLoaded={() => setProjectToLoad(null)}
            currentUser={{ id: 'local-user', handle: '@localdev', displayName: 'Local Dev', avatarUrl: '', coins: 9999, level: 1, isPro: true, joinedAt: Date.now(), email: 'dev@local' }}
            onBack={() => { setCurrentView('create'); setProjectToLoad(null); }}
          />
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{language === 'zh' ? '设置' : 'Settings'}</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">{language === 'zh' ? '语言 (Language)' : 'Language'}</label>
                <div className="flex gap-2">
                  <button onClick={() => setLanguage('zh')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${language === 'zh' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>中文</button>
                  <button onClick={() => setLanguage('en')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${language === 'en' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>English</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Gemini API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AI Studio API Key..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-2">{language === 'zh' ? 'API Key 保存在本地浏览器中。' : 'API Key is stored locally in your browser.'}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={saveSettings} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
                {language === 'zh' ? '保存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
