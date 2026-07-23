export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AIResponse {
  ok: boolean;
  reply?: string;
  feedback?: string;
}
