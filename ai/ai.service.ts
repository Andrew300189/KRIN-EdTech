import { aiApi } from "./ai.api";

export async function askAI(prompt: string) {
  return aiApi.chat(prompt);
}

export async function checkEssay(text: string) {
  return aiApi.essayCheck(text);
}
