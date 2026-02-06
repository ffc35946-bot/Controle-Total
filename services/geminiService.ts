
import { GoogleGenAI, Type } from "@google/genai";
import { AddictionData, ChatMessage, DailyLog } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function identifyAddiction(userInput: string): Promise<{ 
  name: string; 
  unit: string; 
  intensityQuestion: string; 
  frequencyQuestion: string;
  psychologicalStrategy: string;
}> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `O usuário quer superar: "${userInput}". 
      1. Identifique o vício de forma concisa.
      2. Crie uma pergunta curta sobre a intensidade emocional/vontade.
      3. Crie uma pergunta direta sobre o consumo ou valor gasto.
      4. Defina uma estratégia psicológica reconhecida.
      Responda estritamente em JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            unit: { type: Type.STRING },
            intensityQuestion: { type: Type.STRING },
            frequencyQuestion: { type: Type.STRING },
            psychologicalStrategy: { type: Type.STRING }
          },
          required: ["name", "unit", "intensityQuestion", "frequencyQuestion", "psychologicalStrategy"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    return {
      name: userInput,
      unit: "unidades",
      intensityQuestion: "Qual o nível desse vício hoje?",
      frequencyQuestion: "Qual o seu consumo diário?",
      psychologicalStrategy: "Apoio Cognitivo Comportamental"
    };
  }
}

export async function processChat(
  history: ChatMessage[],
  addiction: AddictionData,
  userInput: string,
  daysClean: number
): Promise<{ 
  reply: string; 
  usedToday: boolean; 
  amount?: number; 
  detectedTrigger?: string; 
  grantBadgeId?: string;
  shouldAdvancePhase: boolean;
}> {
  try {
    const ai = getAI();
    const systemPrompt = `Você é um Juiz e Mentor de Recuperação. Vício: ${addiction.name}. Meta: ${addiction.dailyAverage} ${addiction.unit}.
    REGRAS DE RECOMPENSA:
    - Conceda 'first_log' na primeira conversa positiva.
    - Conceda 'streak_3' se o usuário demonstrar 3 dias de controle.
    - Conceda 'streak_7' se o usuário demonstrar 7 dias de controle.
    - Avance a fase (shouldAdvancePhase) se o progresso for excepcional.
    Analise se o usuário usou a substância/vício hoje baseado no texto.
    Seja curto, direto e empático. Responda APENAS em JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.slice(-4).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            usedToday: { type: Type.BOOLEAN },
            amount: { type: Type.NUMBER },
            detectedTrigger: { type: Type.STRING },
            grantBadgeId: { type: Type.STRING },
            shouldAdvancePhase: { type: Type.BOOLEAN }
          },
          required: ["reply", "usedToday", "shouldAdvancePhase"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { 
      reply: "Estou aqui para te ouvir. Como foi seu controle hoje?", 
      usedToday: false, 
      shouldAdvancePhase: false 
    };
  }
}

export async function generateWeeklyAnalysis(logs: DailyLog[], addiction: AddictionData): Promise<string> {
  try {
    const ai = getAI();
    const logSummary = logs.map(l => `Data: ${l.date}, Qtd: ${l.amount}, Sentimento: ${l.feeling}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise brevemente este histórico de ${addiction.name}:\n${logSummary}\nSeja motivador e direto ao ponto.`,
    });
    return response.text || "Continue focado na sua meta diária!";
  } catch (error) {
    return "Mantenha o foco nos seus objetivos.";
  }
}
