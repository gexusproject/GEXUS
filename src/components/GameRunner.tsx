
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Game } from '../types';
import { MousePointer2, Loader2, Play, Gamepad2 } from 'lucide-react';
import { apiRecordPlaySession, apiRecordPlayEvent } from '../services/storage';

interface GameRunnerProps {
  game: Game;
  isActive: boolean;
  isInteractive: boolean; 
  onOpenDetails?: () => void;
  scale?: number;
  offset?: { x: number; y: number };
  shouldLoad?: boolean; // NEW: Controls whether the heavy iframe is mounted
}

const GameRunner: React.FC<GameRunnerProps> = ({ 
    game, 
    isActive, 
    isInteractive, 
    onOpenDetails, 
    scale, 
    offset,
    shouldLoad = true // Default to true if not provided
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0); 
  
  // Analytics Tracking
  const startTimeRef = useRef<number>(0);
  const sessionRecordedRef = useRef(false);
  const hitRecordedRef = useRef(false);

  // Handle Play Tracking
  useEffect(() => {
      if (isActive) {
          startTimeRef.current = Date.now();
          sessionRecordedRef.current = false;
          
          if (!hitRecordedRef.current) {
              apiRecordPlayEvent(game.id);
              hitRecordedRef.current = true;
          }

      } else {
          if (startTimeRef.current > 0 && !sessionRecordedRef.current) {
              const duration = (Date.now() - startTimeRef.current) / 1000;
              if (duration > 2) {
                  apiRecordPlaySession(game.id, duration);
                  sessionRecordedRef.current = true;
              }
              startTimeRef.current = 0;
          }
      }
  }, [isActive, game.id]);

  useEffect(() => {
      return () => {
          if (startTimeRef.current > 0 && !sessionRecordedRef.current) {
              const duration = (Date.now() - startTimeRef.current) / 1000;
              if (duration > 2) {
                  apiRecordPlaySession(game.id, duration);
              }
          }
      };
  }, [game.id]);

  useEffect(() => {
      setKey(prev => prev + 1);
      hitRecordedRef.current = false;
  }, [game.code, game.id, isInteractive, game.autoplayScript, game.isAgentActive]);

  useEffect(() => {
      if (isActive && isInteractive && iframeRef.current) {
          iframeRef.current.focus();
          iframeRef.current.contentWindow?.focus();
      }
  }, [isActive, isInteractive]);

  // Construct source code only if loading
  const finalSrcDoc = useMemo(() => {
    if (!shouldLoad) return ''; // Optimization: Don't compute if detached
    if (!game.code || game.code.length < 50) return '';

    let doc = game.code;
    
    if (isActive && !isInteractive && game.autoplayScript && game.isAgentActive) {
        const agentScript = `
        <script>
          (function() {
             console.log("🤖 AI Autoplay Agent Initializing...");
             setTimeout(() => {
                try {
                  ${game.autoplayScript}
                } catch(e) { console.warn("AI Agent Error:", e); }
             }, 800);
          })();
        </script>`;

        if (doc.includes('</body>')) {
            doc = doc.replace('</body>', `${agentScript}</body>`);
        } else {
            doc = doc + agentScript;
        }
    }
    return doc;
  }, [game.code, isActive, isInteractive, game.autoplayScript, game.isAgentActive, shouldLoad]);

  const resolution = game.resolution || { width: 360, height: 640, mode: 'responsive' };
  const isResponsive = resolution.mode === 'responsive';
  const scaleValue = scale || 1;
  const offsetValue = offset || { x: 0, y: 0 };
  
  const containerStyle: React.CSSProperties = {
      width: isResponsive ? '100%' : resolution.width,
      height: isResponsive ? '100%' : resolution.height,
      transform: `translate(${offsetValue.x}px, ${offsetValue.y}px) scale(${scaleValue})`,
      transformOrigin: 'center center'
  };

  const iframeStyle: React.CSSProperties = isResponsive 
      ? { width: '100%', height: '100%' }
      : { width: `${resolution.width}px`, height: `${resolution.height}px` };

  const isAgentRunning = !isInteractive && isActive && game.autoplayScript && game.isAgentActive;
  const isDataMissing = !game.code || game.code.length < 50;

  // --- MEMORY OPTIMIZATION RENDERER ---
  if (!shouldLoad) {
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
            {/* Lightweight Placeholder */}
            <div className="relative w-full h-full opacity-50 blur-sm scale-105">
                {game.thumbnailUrl ? (
                    <img 
                        src={game.thumbnailUrl} 
                        className="w-full h-full object-cover" 
                        loading="lazy" 
                        alt="preview"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-900">
                        <Gamepad2 size={48} className="text-white/20" />
                    </div>
                )}
            </div>
            {/* Static Overlay to indicate it's a game */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                    <Play size={24} className="text-white/50 fill-current ml-1" />
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none bg-black" style={{ touchAction: 'none' }}>
      
      {/* Game Container */}
      <div 
        className={`relative transition-all duration-75 ${
            !isResponsive 
            ? 'border-2 border-white/50 shadow-xl bg-black' 
            : 'w-full h-full'
        }`}
        style={containerStyle}
      >
          {isDataMissing ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                  <Loader2 size={32} className="text-purple-500 animate-spin mb-2" />
                  <p className="text-xs text-slate-500 font-mono animate-pulse">LOADING GAME DATA...</p>
              </div>
          ) : (
              <iframe
                key={key}
                ref={iframeRef}
                title={game.title}
                srcDoc={finalSrcDoc} 
                style={{
                    ...iframeStyle,
                    pointerEvents: isInteractive ? 'auto' : 'none' 
                }}
                className={`border-none touch-action-none block w-full h-full`}
                sandbox="allow-scripts allow-popups allow-modals allow-forms allow-same-origin" 
                loading="eager" // Load eagerly when mounted because we control mounting via 'shouldLoad'
              />
          )}
          
          {!isResponsive && !isDataMissing && (
              <div className="absolute -top-6 left-0 text-[10px] text-slate-400 font-mono font-bold tracking-wider">
                  {resolution.width}x{resolution.height}
              </div>
          )}
      </div>

      {/* Attract Mode Overlay */}
      {isAgentRunning && !isDataMissing && (
          <div className="absolute top-20 right-4 pointer-events-none animate-pulse opacity-60">
             <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                 <MousePointer2 size={12} className="text-emerald-400" />
                 <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">AI Preview</span>
             </div>
          </div>
      )}

    </div>
  );
};

export default GameRunner;
