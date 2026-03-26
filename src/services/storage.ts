import { Game, GameVersion, CodeSnapshot } from '../types';

export const apiFetchGameById = async (id: string): Promise<Game | null> => {
  const data = localStorage.getItem('game_' + id);
  return data ? JSON.parse(data) : null;
};

export const apiSaveGame = async (game: Game): Promise<void> => {
  localStorage.setItem('game_' + game.id, JSON.stringify(game));
};

export const apiUpdateGameMetadata = async (gameId: string, updates: Partial<Game>): Promise<void> => {
  const game = await apiFetchGameById(gameId);
  if (game) {
    Object.assign(game, updates);
    await apiSaveGame(game);
  }
};

export const apiUpdateGameVersion = async (versionId: string, updates: { code?: string, assets?: any[] }): Promise<void> => {
  // In local mode, we don't have a fast way to find the game from a version ID.
  // We'll just ignore this or implement a slow search if needed.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('game_')) {
      const game: Game = JSON.parse(localStorage.getItem(key) || '{}');
      if (game.history) {
        const vIndex = game.history.findIndex(v => v.id === versionId);
        if (vIndex !== -1) {
          Object.assign(game.history[vIndex], updates);
          await apiSaveGame(game);
          return;
        }
      }
    }
  }
};

export const apiSaveVersionSnapshot = async (versionId: string, code: string, label: string): Promise<CodeSnapshot | null> => {
  const snapshot: CodeSnapshot = {
    id: `snap_${Date.now()}`,
    timestamp: Date.now(),
    code,
    label
  };
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('game_')) {
      const game: Game = JSON.parse(localStorage.getItem(key) || '{}');
      if (game.history) {
        const vIndex = game.history.findIndex(v => v.id === versionId);
        if (vIndex !== -1) {
          if (!game.history[vIndex].minorVersions) game.history[vIndex].minorVersions = [];
          game.history[vIndex].minorVersions!.push(snapshot);
          await apiSaveGame(game);
          return snapshot;
        }
      }
    }
  }
  return snapshot;
};

export const apiDeleteVersionSnapshot = async (snapshotId: string): Promise<void> => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('game_')) {
      const game: Game = JSON.parse(localStorage.getItem(key) || '{}');
      if (game.history) {
        let modified = false;
        game.history.forEach(v => {
          if (v.minorVersions) {
            const initialLen = v.minorVersions.length;
            v.minorVersions = v.minorVersions.filter(mv => mv.id !== snapshotId);
            if (v.minorVersions.length !== initialLen) modified = true;
          }
        });
        if (modified) await apiSaveGame(game);
      }
    }
  }
};

export const apiDeleteGameVersion = async (gameId: string, versionId: string): Promise<Game | null> => {
  const game = await apiFetchGameById(gameId);
  if (game && game.history) {
    game.history = game.history.filter(v => v.id !== versionId);
    await apiSaveGame(game);
    return game;
  }
  return null;
};

export const apiUploadFile = async (file: File, path: string): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
};

const AUTOPLAY_TAG_OPEN = '<!--_AIGC_AUTOPLAY_AGENT_START_';
const AUTOPLAY_TAG_CLOSE = '_AIGC_AUTOPLAY_AGENT_END_-->';
const AGENT_HISTORY_TAG_OPEN = '<!--_AIGC_AGENT_HISTORY_START_';
const AGENT_HISTORY_TAG_CLOSE = '_AIGC_AGENT_HISTORY_END_-->';

export const embedGameDataToCode = (code: string, script?: string, history?: CodeSnapshot[]) => {
    let cleanCode = code;
    const scriptRegex = new RegExp(`${AUTOPLAY_TAG_OPEN}[\\s\\S]*?${AUTOPLAY_TAG_CLOSE}`, 'g');
    cleanCode = cleanCode.replace(scriptRegex, '').trim();
    const historyRegex = new RegExp(`${AGENT_HISTORY_TAG_OPEN}[\\s\\S]*?${AGENT_HISTORY_TAG_CLOSE}`, 'g');
    cleanCode = cleanCode.replace(historyRegex, '').trim();

    let appended = cleanCode;
    if (script) {
        appended += `\n${AUTOPLAY_TAG_OPEN}\n${script}\n${AUTOPLAY_TAG_CLOSE}`;
    }
    if (history && history.length > 0) {
        appended += `\n${AGENT_HISTORY_TAG_OPEN}\n${JSON.stringify(history)}\n${AGENT_HISTORY_TAG_CLOSE}`;
    }
    return appended;
};

export const extractGameDataFromCode = (code: string): any => {
  const regex = /<script id="gexus-game-data" type="application\/json">(.*?)<\/script>/s;
  const match = code.match(regex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("Failed to parse embedded game data", e);
    }
  }
  return null;
};

export const apiRecordPlaySession = async (gameId: string, duration: number): Promise<void> => {
  console.log('Session recorded:', gameId, duration);
};

export const apiRecordPlayEvent = async (gameId: string): Promise<void> => {
  console.log('Event recorded:', gameId);
};
