import { GoogleGenAI } from "@google/genai";
import { EngineType } from '../types';
import { ENGINE_CONFIG, INITIAL_SYSTEM_INSTRUCTION } from '../constants';

// Initialize the client. API Key is expected to be in environment variables.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const streamChatResponse = async (
  message: string,
  engine: EngineType,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  customSystemInstruction?: string
) => {
  const modelName = ENGINE_CONFIG[engine].model;
  
  // Use custom instruction if provided (for Squad Members), otherwise derive from engine
  let systemInstruction = customSystemInstruction;

  if (!systemInstruction) {
    systemInstruction = INITIAL_SYSTEM_INSTRUCTION;
    if (engine === EngineType.ETERNAL_CORE) {
      systemInstruction += " You are in Eternal Core mode: providing deep, detailed, and highly reasoned answers.";
    } else if (engine === EngineType.LAND_VESSEL) {
      systemInstruction += " You are in Land Vessel mode: prioritize stability, robustness, and practical, safe advice.";
    } else {
      systemInstruction += " You are in Frost Blade mode: be quick, precise, and efficient.";
    }
  }

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
      },
      history: history,
    });

    const result = await chat.sendMessageStream({ message });
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
