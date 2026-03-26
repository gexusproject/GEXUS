// ... (imports remain the same)
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProjectAsset } from "../types";

// Helper to safely access env vars in Vite or standard env
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key] || (import.meta as any).env[`VITE_${key}`];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    return process.env[key] || process.env[`VITE_${key}`];
  }
  return '';
};

// DYNAMIC INITIALIZATION: Check localStorage for user key, fallback to env
const getAI = () => {
  const userKey = typeof window !== 'undefined' ? localStorage.getItem('user_gemini_api_key') : null;
  // Use safe env getter
  return new GoogleGenAI({ apiKey: userKey || getEnv('API_KEY') });
};

export interface Attachment {
  data: string; // base64
  mimeType: string;
  fileName?: string;
}

// Helper to wrap promises with cancellation
const cancellable = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));

    return new Promise((resolve, reject) => {
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        signal.addEventListener('abort', onAbort);
        
        promise.then(resolve, reject).finally(() => {
            signal.removeEventListener('abort', onAbort);
        });
    });
};

// Helper to generate a stylized SVG fallback based on title
const generateSvgFallback = (title: string): string => {
    const hash = title.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const hue = Math.abs(hash % 360);
    const colorPrimary = `hsl(${hue}, 70%, 50%)`;
    const colorSecondary = `hsl(${(hue + 40) % 360}, 70%, 30%)`;
    
    const svg = `
    <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${colorPrimary};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${colorSecondary};stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#g)"/>
        <rect x="50" y="50" width="300" height="300" fill="none" stroke="white" stroke-width="2" stroke-opacity="0.2"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold" font-size="40" style="text-transform:uppercase; letter-spacing:2px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3))">
            ${title.substring(0, 8)}
        </text>
        <circle cx="350" cy="50" r="20" fill="white" fill-opacity="0.1"/>
        <path d="M0 400 L400 0" stroke="white" stroke-width="1" stroke-opacity="0.1"/>
    </svg>
    `;
    
    // Fix for "The string to be encoded contains characters outside of the Latin1 range"
    const encoded = btoa(encodeURIComponent(svg.trim()).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
    }));

    return `data:image/svg+xml;base64,${encoded}`;
};

// --- ASSET PRESERVATION LOGIC ---
const ASSET_TOKEN_PREFIX = "___ASSET_TOKEN_";
const ASSET_TOKEN_SUFFIX = "___";

const preserveAssets = (code: string): { cleanedCode: string, assetMap: Map<string, string> } => {
    const assetMap = new Map<string, string>();
    let tokenIndex = 0;
    const regex = /("|')(data:(?:image|audio|video)\/[^;]+;base64,[^"']+)\1/g;
    const cleanedCode = code.replace(regex, (match, quote, dataUri) => {
        const token = `${ASSET_TOKEN_PREFIX}${tokenIndex++}${ASSET_TOKEN_SUFFIX}`;
        assetMap.set(token, dataUri);
        return `${quote}${token}${quote}`;
    });
    return { cleanedCode, assetMap };
};

export const restoreCodeAssets = (code: string, assetMap: Map<string, string>): string => {
    if (!assetMap || assetMap.size === 0) return code;
    let restoredCode = code;
    for (const [token, dataUri] of assetMap.entries()) {
        restoredCode = restoredCode.split(token).join(dataUri);
    }
    return restoredCode;
};

const cleanCodeForAnalysis = (code: string): string => {
    return code.replace(/["']data:(?:image|audio|video)\/[^"']*?;base64,[^"']*?["']/g, '"[ASSET_DATA_OMITTED]"');
};

const GAME_GENERATION_SYSTEM_PROMPT = `
You are an expert game developer engine. Your goal is to generate or modify a single-file HTML5 playable mini-game.

Rules:
1. Return ONLY the raw HTML code. No markdown blocks.
2. The code must include CSS (in <style>) and JS (in <script>).
3. The game must be responsive (mobile & desktop).
4. Use HTML5 Canvas API.

INSPECTOR & ASSET LOADING PROTOCOL:
- When defining variables for images or sounds, you MUST use the following comment pattern:
  const VARIABLE_NAME = ""; // @asset(DisplayName)
- CRITICAL: You MUST implement an asset loader. If the variable is NOT an empty string, create a new Image() or Audio() object, set its .src to the variable, and use the loaded object for rendering/playback.

ROBUSTNESS & ERROR PREVENTION (CRITICAL):
1. PREVENT "UNDEFINED" CRASHES: In your \`draw()\` or \`update()\` loops, NEVER assume arrays (like \`this.grid\`, \`this.enemies\`) are populated. 
   - BAD: \`this.grid[y][x]\` (Crashes if grid is undefined)
   - GOOD: \`if (this.grid && this.grid[y]) { ... }\`
2. RESIZE SAFETY: The \`resize\` event happens frequently. Ensure your resize handler does NOT crash if the game hasn't finished initializing. 
   - Check if critical objects (like \`player\`, \`map\`) exist before accessing them in \`draw()\`.

OUTPUT FORMAT (STRICT):
1. First, output your "Thought Process" or "Plan" as plain text lines. Explain what you are building, the mechanics, and the structure.
2. Then, output a short title for the version: "==TITLE== Your Short Title".
3. Then, output the separator: "==CODE_START=="
4. Finally, output the full HTML code.
`;

export const streamGameCode = async function* (
  prompt: string, 
  attachment?: Attachment, 
  signal?: AbortSignal, 
  language: 'en' | 'zh' = 'en', 
  modelName: string = 'gemini-3-pro-preview'
) {
  try {
    const ai = getAI();
    const langInstruction = language === 'zh' 
        ? "CRITICAL: All in-game text (UI, score, messages, buttons) MUST be in Simplified Chinese (简体中文). ALSO: Write your Thought Process in Simplified Chinese." 
        : "All in-game text must be in English.";

    const parts: any[] = [{ 
      text: `Create a mini-game: ${prompt}. 
      ${langInstruction}
      ${attachment ? `Use the attached media as the primary asset. Ensure you tag it with // @asset(MainAsset)` : ''}` 
    }];
    
    if (attachment) {
      const isText = attachment.mimeType.startsWith('text/') || 
                     attachment.mimeType.includes('json') ||
                     attachment.mimeType.includes('javascript') ||
                     attachment.mimeType.includes('xml') ||
                     attachment.mimeType.includes('csv') ||
                     attachment.mimeType.includes('typescript');

      if (isText) {
        try {
            // Decode base64 text content and add as a text part
            const decodedText = atob(attachment.data);
            parts.push({
                text: `\n\n[ATTACHED DOCUMENT START]\n${decodedText}\n[ATTACHED DOCUMENT END]\n\n`
            });
        } catch (e) {
            console.error("Failed to decode text attachment", e);
        }
      } else {
          // PDF, Image, Video, Audio -> InlineData
          parts.push({
            inlineData: {
              data: attachment.data,
              mimeType: attachment.mimeType
            }
          });
      }
    }

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction: GAME_GENERATION_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    for await (const chunk of responseStream) { 
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        const text = (chunk as GenerateContentResponse).text;
        if (text) {
            yield text;
        }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("Gemini Game Gen Error:", error);
    throw new Error("Failed to construct the game module.");
  }
};

export const generateGameCode = async (prompt: string, attachment?: Attachment, signal?: AbortSignal, language: 'en' | 'zh' = 'en', modelName: string = 'gemini-3-pro-preview'): Promise<string> => {
  try {
    const ai = getAI();
    const langInstruction = language === 'zh' 
        ? "CRITICAL: All in-game text (UI, score, messages, buttons) MUST be in Simplified Chinese (简体中文)." 
        : "All in-game text must be in English.";

    const parts: any[] = [{ 
      text: `Create a mini-game: ${prompt}. 
      ${langInstruction}
      ${attachment ? `Use the attached media as the primary asset. Ensure you tag it with // @asset(MainAsset)` : ''}` 
    }];
    
    if (attachment) {
      const isText = attachment.mimeType.startsWith('text/') || 
                     attachment.mimeType.includes('json') ||
                     attachment.mimeType.includes('javascript') ||
                     attachment.mimeType.includes('xml') ||
                     attachment.mimeType.includes('csv') ||
                     attachment.mimeType.includes('typescript');

      if (isText) {
        try {
            // Decode base64 text content and add as a text part
            const decodedText = atob(attachment.data);
            parts.push({
                text: `\n\n[ATTACHED DOCUMENT START]\n${decodedText}\n[ATTACHED DOCUMENT END]\n\n`
            });
        } catch (e) {
            console.error("Failed to decode text attachment", e);
        }
      } else {
          // PDF, Image, Video, Audio -> InlineData
          parts.push({
            inlineData: {
              data: attachment.data,
              mimeType: attachment.mimeType
            }
          });
      }
    }

    const response = await cancellable(ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction: GAME_GENERATION_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    }), signal) as GenerateContentResponse;

    let code = response.text || '';
    if (code.startsWith('```')) code = code.replace(/^```(html)?/i, '').replace(/```$/, '');
    return code.trim();
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("Gemini Game Gen Error:", error);
    throw new Error("Failed to construct the game module.");
  }
};

export const adaptImportedGame = async (rawCode: string, signal?: AbortSignal, skipAdaptation: boolean = false): Promise<{ code: string, summary: string, title: string }> => {
    try {
        if (skipAdaptation) {
            const titleMatch = rawCode.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : "Imported Game";
            return {
                code: rawCode,
                title: title || "Imported Game",
                summary: "Directly imported HTML game (Raw)."
            };
        }

        const ai = getAI();
        const truncatedCode = rawCode.length > 100000 ? cleanCodeForAnalysis(rawCode) : rawCode;

        const response = await cancellable(ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `
                You are a "Legacy Game Porting Expert".
                I have an existing HTML5 game code that I want to import into a modern mobile-first game platform.

                YOUR TASKS:
                1. ANALYZE the raw code.
                2. REFACTOR it to ensure it works in a responsive iframe (remove hardcoded width=800, use window.innerWidth).
                3. ENSURE <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /> exists.
                4. ADD TOUCH CONTROLS if missing: Map 'touchstart'/'touchmove' to existing mouse or keyboard logic.
                5. EXTRACT TITLE & SUMMARY: Infer a title and 1-sentence summary.

                6. CRITICAL - ENABLE ASSET INSPECTOR (IMPORTANT):
                   - Scan the code for ANY Image objects, Audio objects.
                   - Extract them into TOP-LEVEL constants in the <script> section.
                   - You MUST append the comment "// @asset(Name)" to these lines.
                   - DO NOT extract simple colors (hex, rgb) as asset slots. Colors do not need slots.
                   - If the game uses procedural graphics (fillRect), ONLY create placeholders if the user specifically asked, otherwise leave as procedural.
                   
                   Examples:
                   const PLAYER_SRC = ""; // @asset(Player Sprite)
                   const BG_MUSIC_SRC = ""; // @asset(Bg Music)

                   - Then, update the game logic to use these variables. Check if they are empty strings; if so, fallback to original logic. If not empty, use them as .src for Images/Audio.

                RAW CODE:
                ${truncatedCode.substring(0, 5000000)}

                RETURN JSON FORMAT ONLY:
                {
                    "code": "The full refactored HTML string...",
                    "title": "Detected Title",
                    "summary": "Short description of what this game is."
                }
            `,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        }), signal) as GenerateContentResponse;

        const json = JSON.parse(response.text || '{}');
        return {
            code: json.code || rawCode,
            title: json.title || "Imported Game",
            summary: json.summary || "A classic game imported from external source."
        };
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error("Adaptation Error:", error);
        return { code: rawCode, title: "Imported Project", summary: "Imported without adaptation." };
    }
};

export const streamGameModification = async function* (
  currentCode: string, 
  instruction: string, 
  type: 'logic' | 'art' | 'music', 
  attachment?: Attachment,
  projectAssets?: ProjectAsset[],
  signal?: AbortSignal,
  onAssetMapReady?: (map: Map<string, string>) => void,
  language: 'en' | 'zh' = 'en',
  modelName: string = 'gemini-3-pro-preview'
) {
    try {
        const ai = getAI();
        let assetContext = "";
        if (projectAssets && projectAssets.length > 0) {
          assetContext = "Available library assets (use their names to refer to them):\n" + 
            projectAssets.map(a => `- "${a.name}" (${a.type})`).join('\n');
        }

        const { cleanedCode, assetMap } = preserveAssets(currentCode);
        if (onAssetMapReady) onAssetMapReady(assetMap);

        const langInstruction = language === 'zh' 
            ? "IMPORTANT: If adding new text, UI labels, or messages, they MUST be in Simplified Chinese (简体中文). ALSO: Write your Plan/Reasoning in Simplified Chinese." 
            : "";

        const parts: any[] = [{
            text: `
                Existing code: ${cleanedCode.substring(0, 5000000)} 
                User Instruction: "${instruction}"
                ${langInstruction}
                ${assetContext}
                
                STRICT MODIFICATION PROTOCOL:
                1. MAINTAIN PERSPECTIVE: If the current game is 2D Top-down, KEEP it 2D Top-down.
                2. MINIMAL RECONSTRUCTION: Keep 95% of the original variable names and code structure.
                3. INCREMENTAL UPDATES: Only change the parts relevant to the instruction.
                4. ASSETS: 
                   - The code contains asset tokens (e.g., "${ASSET_TOKEN_PREFIX}0${ASSET_TOKEN_SUFFIX}"). 
                   - YOU MUST PRESERVE THESE TOKENS EXACTLY AS IS. DO NOT REMOVE OR CHANGE THEM.
                   - If you add NEW assets from the library, use // @asset(Name) tags with empty strings or new placeholders.
                
                FORMAT:
                1. Plan (Concise summary of changes).
                2. "==TITLE==" + Short Title (Max 5 words, e.g. "Added Double Jump").
                3. "==CODE_START==".
                4. Full raw HTML (re-emitted with your changes).
            `
        }];

        if (attachment) parts.push({ inlineData: { data: attachment.data, mimeType: attachment.mimeType } });

        const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: { parts },
            config: { 
              systemInstruction: GAME_GENERATION_SYSTEM_PROMPT,
              temperature: 0.2
            }
        });

        for await (const chunk of responseStream) { 
            if (signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            yield (chunk as GenerateContentResponse).text; 
        }
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error("Gemini Streaming Error:", error);
        throw error;
    }
}

export const streamCodeAssistant = async function* (
    fullCode: string, 
    selectedCode: string, 
    instruction: string, 
    signal?: AbortSignal, 
    language: 'en' | 'zh' = 'en',
    additionalContext?: string,
    modelName: string = 'gemini-3-pro-preview'
) {
    try {
        const ai = getAI();
        const contextCode = cleanCodeForAnalysis(fullCode);
        const cleanSelection = cleanCodeForAnalysis(selectedCode);
        
        const langInstruction = language === 'zh' ? "You must respond in Simplified Chinese (简体中文)." : "";

        let promptContext = `
                File To Edit:
                ${contextCode.substring(0, 5000000)}
        `;

        if (additionalContext) {
            const cleanAdditional = cleanCodeForAnalysis(additionalContext);
            promptContext += `
                
                REFERENCE CONTEXT (READ-ONLY, DO NOT EDIT):
                Use this to understand variable names, DOM elements, and game logic structure.
                ${cleanAdditional.substring(0, 5000000)}
            `;
        }

        const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: `
                You are a senior AI coding assistant.
                ${langInstruction}
                
                ${promptContext}
                
                Current Selection:
                ${cleanSelection}

                User Instruction: "${instruction}"

                STRICT RULE: Decide whether the user wants to MODIFY code or just ASK a question about it.
                
                INTENT RECOGNITION:
                1. If the instruction is "Explain this", "What does this do?", "How does this work?", or any descriptive query:
                   - USE THE ==CHAT== PROTOCOL.
                   
                2. If the instruction is "Refactor", "Fix", "Change", "Rewrite", "Clean up", or any request for modification:
                   - USE ==EDIT==, ==SEARCH==, or ==FULL_FILE==.

                EDITING PROTOCOLS:
                - ==CHAT==: Just return the text.
                - ==EDIT==: Replace SELECTED text. Format: "==EDIT==" + New Code + "==SUMMARY==" + explanation.
                - ==SEARCH==: Surgical edits. Format: "==SEARCH==" + unique snippet + "==REPLACE==" + new code + "==SUMMARY==" + explanation.
                - ==FULL_FILE==: Rewrite file. Format: "==FULL_FILE==" + new file content + "==SUMMARY==" + explanation.
                - ==FIND==: If user asks to find something, use ==FIND== + code snippet.
            `,
             config: { temperature: 0.1 }
        });
        for await (const chunk of responseStream) {
            if (signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            yield (chunk as GenerateContentResponse).text;
        }
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error("Gemini Copilot Error:", error);
        throw error;
    }
}

export const updateGameMetadata = async (code: string, signal?: AbortSignal, language: 'en' | 'zh' = 'en'): Promise<{description: string, instructions: string, shortTitle: string}> => {
    try {
        const ai = getAI();
        const cleanCode = cleanCodeForAnalysis(code);
        const langInstruction = language === 'zh' ? "Output description and instructions strictly in Simplified Chinese." : "Output in English.";

        const response = await cancellable(ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
            Analyze this HTML mini-game code. 
            Strictly extract only what is ACTUALLY implemented.
            ${langInstruction}
            
            Return JSON: 
            {
              "shortTitle": "A very short, catchy title (max 5 words) summarizing the game or recent changes",
              "description": "Short 1-sentence factual description.",
              "instructions": "Exact literal controls."
            }
            
            Code: ${cleanCode.substring(0, 5000000)}`,
            config: { 
                responseMimeType: "application/json",
                temperature: 0.1
            }
        }), signal) as GenerateContentResponse;
        const json = JSON.parse(response.text || '{}');
        return {
            description: json.description || "A generated prototype.",
            instructions: json.instructions || "Check game for controls.",
            shortTitle: json.shortTitle || ""
        };
    } catch (error) {
        return { description: "Updated prototype.", instructions: "Check game for controls.", shortTitle: "" };
    }
}

export const generateGameThumbnail = async (prompt: string, signal?: AbortSignal): Promise<string> => {
    try {
        const ai = getAI();
        const finalPrompt = `Professional mobile game capsule art for "${prompt}". 
        Style: Vibrant 2D game illustration, clean vector art, high contrast, digital painting. 
        NO REALISTIC PHOTOS. NO PEOPLE. NO TEXT. NO WORDS. NO ALPHABET. 
        Focus on central game objects or abstract game patterns. 
        Aspect ratio: 1:1 square icon.`;

        const response = await cancellable(ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: finalPrompt }] }
        }), signal) as GenerateContentResponse;
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        
        return generateSvgFallback(prompt);
    } catch (error) { 
        console.error("Image generation failed, using fallback:", error);
        return generateSvgFallback(prompt);
    }
};

export const streamPolishGameDescription = async function* (
    rawPrompt: string, 
    signal?: AbortSignal, 
    language: 'en' | 'zh' = 'en', 
    modelName: string = 'gemini-3-flash-preview'
) {
    try {
        const ai = getAI();
        const langInstruction = language === 'zh' 
            ? "Output title and vision strictly in Simplified Chinese." 
            : "Output in English.";

        const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: `
            You are a creative game director. User wants to create: "${rawPrompt}". 
            
            Task:
            1. First, analyze the request and brainstorm core mechanics, themes, and a unique twist. Output this as "Thought Process".
            2. Then, output the separator: "==JSON_START=="
            3. Finally, output a JSON object with:
               - "title": A catchy, marketable title.
               - "vision": A high-level "Vision" (what this game aims to be after funding).
            
            ${langInstruction}
            `,
            config: { 
                temperature: 0.7 
            }
        });

        for await (const chunk of responseStream) {
            if (signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            const text = (chunk as GenerateContentResponse).text;
            if (text) {
                yield text;
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error("Gemini Polish Stream Error:", error);
        throw error;
    }
}

export const polishGameDescription = async (rawPrompt: string, signal?: AbortSignal, language: 'en' | 'zh' = 'en', modelName: string = 'gemini-3-flash-preview'): Promise<{title: string, vision: string}> => {
    try {
        const ai = getAI();
        const langInstruction = language === 'zh' ? "Output title and vision strictly in Simplified Chinese." : "Output in English.";
        const response = await cancellable(ai.models.generateContent({
            model: modelName,
            contents: `Creative game director. User wants to create: "${rawPrompt}". 
            Give it a catchy title and a high-level "Vision" (what this game aims to be after funding).
            ${langInstruction}
            Output JSON: { "title": "...", "vision": "..." }`,
            config: { responseMimeType: "application/json" }
        }), signal) as GenerateContentResponse;
        return JSON.parse(response.text || '{}');
    } catch (error) {
        return { title: "Untitled Prototype", vision: "A futuristic AIGC game concept." };
    }
}

export const suggestConcepts = async (context: string, language: 'en' | 'zh' = 'en'): Promise<string[]> => {
    try {
        const ai = getAI();
        const langInstruction = language === 'zh' ? "Output tags strictly in Simplified Chinese." : "Output in English.";
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
            You are a creative game design assistant.
            User input: "${context}".
            
            Task: Provide 4 short, punchy, diverse game concepts or mechanic twists that relate to the user's input.
            ${langInstruction}
            
            Constraints:
            - Max 4-6 words per tag.
            - Return ONLY a JSON array of strings.
            `,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7
            }
        }) as GenerateContentResponse;

        const text = response.text || "[]";
        const json = JSON.parse(text);
        return Array.isArray(json) ? json.slice(0, 4) : [];
    } catch (error) {
        console.error("Suggestion Error", error);
        return ["Physics Puzzle", "Retro Platformer", "Idle Clicker", "Space Shooter"];
    }
}

export const generateNextSteps = async (code: string, category: string, language: 'en' | 'zh' = 'en'): Promise<{label: string, prompt: string}[]> => {
    try {
        const ai = getAI();
        const categoryPrompts: {[key: string]: string} = {
            mechanics: "gameplay mechanics, rules, controls, physics, and scoring",
            visuals: "graphics, colors, sprites, particles, and visual effects",
            audio: "sound effects, background music, and audio feedback",
            ui: "user interface, menus, HUD, buttons, and text displays",
            polish: "game feel, screen shake, transitions, and overall polish"
        };

        const focus = categoryPrompts[category] || "general improvements";
        const cleanCode = cleanCodeForAnalysis(code);
        const langInstruction = language === 'zh' ? "Output 'label' and 'prompt' strictly in Simplified Chinese." : "Output in English.";

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
            Analyze this HTML5 game code.
            The user wants to improve: ${focus}.

            Task: Suggest 3 specific, actionable tasks to add or improve features in this category.
            CRITICAL: Do NOT suggest features that are ALREADY implemented.
            ${langInstruction}
            
            Return purely a JSON array of objects with 'label' (max 4-5 words) and 'prompt' (detailed instruction).
            Example: [{"label": "Add Double Jump", "prompt": "Implement a double jump mechanic for the player."}]
            
            Code Context:
            ${cleanCode.substring(0, 5000000)}
            `,
            config: {
                responseMimeType: "application/json",
                temperature: 0.4
            }
        }) as GenerateContentResponse;
        
        const json = JSON.parse(response.text || '[]');
        return Array.isArray(json) ? json.slice(0, 4) : [];
    } catch (e) {
        console.error("Task Gen Error", e);
        return [];
    }
}

export const generateAutoplayAgent = async (code: string, instruction?: string, language: 'en' | 'zh' = 'en'): Promise<string> => {
  try {
    const ai = getAI();
    const cleanCode = cleanCodeForAnalysis(code);
    const langInstruction = language === 'zh' 
        ? "CRITICAL: The BEHAVIOR_SUMMARY MUST be in Simplified Chinese (简体中文)." 
        : "The BEHAVIOR_SUMMARY MUST be in English.";
    
    let userInstruction = "";
    if (instruction) {
        userInstruction = `USER INSTRUCTION: The user wants the bot to behave like this: "${instruction}". Adapt the logic accordingly.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze this HTML5 game code. 
        Create a valid JavaScript snippet that acts as an "Autoplay Bot" (Attract Mode).
        
        REQUIREMENT:
        The FIRST line of your code MUST be a comment in this format:
        // BEHAVIOR_SUMMARY: [A short 1-sentence description of the bot's strategy, e.g. "Jumps when seeing red obstacles."]
        ${langInstruction}

        CRITICAL FOR PHYSICS/AIMING GAMES (like Suika, Angry Birds):
        - Do NOT just set variables (e.g. player.x = 100). The physics engine will ignore this.
        - You MUST simulate User Input Events (MouseEvent, TouchEvent) on the canvas.
        - IMPORTANT: You cannot move and click in the same frame. Dispatch 'mousemove'/'touchmove', then wait 50-100ms, then dispatch 'mouseup'/'touchend'.
        - Ensure you target the correct canvas element.

        CRITICAL ROBUSTNESS (The "Blind Mode" Fallback):
        - Many games do NOT expose their logic to 'window.game'. 
        - IF you cannot access the internal game state (fruits, enemies, player pos), you MUST implement a "Blind Mode".
        - Blind Mode should: Pick a random X coordinate on the canvas, move there, and click. This ensures the bot does *something* even if it can't "see".

        CRITICAL COORDINATE MAPPING (The Canvas might be scaled via CSS):
        - You MUST use \`getBoundingClientRect()\` to map internal game coordinates to screen coordinates.
        - Example: \`clientX = rect.left + (gameX * (rect.width / canvas.width))\`

        REQUIRED HELPER FUNCTION (YOU MUST INCLUDE AND USE THIS):
        \`\`\`javascript
        function triggerInput(element, type, x, y) {
            if (!element) return;
            const rect = element.getBoundingClientRect();
            // Calculate scale in case canvas is resized via CSS
            const scaleX = rect.width / element.width;
            const scaleY = rect.height / element.height;
            
            const clientX = rect.left + (x * scaleX);
            const clientY = rect.top + (y * scaleY);
            
            const event = new MouseEvent(type, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: clientX,
                clientY: clientY,
                buttons: 1 // Simulate Left Click
            });
            element.dispatchEvent(event);
        }
        \`\`\`

        EXECUTION ORDER (CRITICAL):
        1. FIRST, check if a 'Start Screen' or 'Game Over' screen is visible. If so, simulate a click.
        2. THEN, try to find the game object.
        3. IF found -> Execute smart logic (aiming).
        4. IF NOT found -> Execute BLIND logic (random movement/clicks on canvas).

        Code Structure:
        setInterval(() => {
           try {
               // 1. UI Handling (Start/Restart)
               const startBtn = document.getElementById('start-btn');
               if (startBtn && startBtn.offsetParent !== null) { startBtn.click(); return; }

               // 2. Safety Checks
               const canvas = document.querySelector('canvas');
               if (!canvas) return;
               
               // 3. Logic Attempt
               // Attempt to find game instance. If 'game' is a DOM element (div), it's NOT the instance.
               let logic = (typeof game !== 'undefined' && (!window.game || !(window.game instanceof HTMLElement))) ? game : null;
               
               if (logic && logic.canDrop) {
                   // --- SMART MODE ---
                   // ... calculate best X based on logic.fruits ...
               } else {
                   // --- BLIND MODE (Fallback) ---
                   // ... pick random X ...
               }
               
               // ... triggerInput(canvas, ...) ...
           } catch (e) {
               // Ignore errors to prevent flooding console
           }
        }, 100);
        
        ${userInstruction}
        
        Game Code Context:
        ${cleanCode.substring(0, 5000000)}

        Return ONLY the raw JavaScript code for the bot. Do not wrap in markdown.
      `,
      config: {
        temperature: 0.4
      }
    }) as GenerateContentResponse;

    let script = response.text || '';
    if (script.startsWith('```')) script = script.replace(/^```(javascript|js)?/i, '').replace(/```$/, '');
    return script.trim();
  } catch (error) {
    console.error("Failed to generate autoplay agent", error);
    return "// AI Autoplay generation failed.";
  }
}

export const translateText = async (text: string, targetLanguage: 'en' | 'zh', signal?: AbortSignal): Promise<string> => {
    try {
        const ai = getAI();
        const langName = targetLanguage === 'zh' ? 'Simplified Chinese' : 'English';
        const response = await cancellable(ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate the following user comment to ${langName}. 
            
            Rules:
            1. Preserve any version tags like [v1.0] exactly as is.
            2. Preserve user mentions like @username exactly as is.
            3. Only translate the message content.
            
            Text: "${text}"`,
            config: { temperature: 0.1 }
        }), signal) as GenerateContentResponse;
        return response.text?.trim() || text;
    } catch (error) {
        console.error("Translation failed", error);
        return text;
    }
}