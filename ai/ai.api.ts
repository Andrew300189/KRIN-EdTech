export const aiApi = {
  chat: async (prompt: string) => ({ ok: true, reply: `AI response to: ${prompt}` }),
  essayCheck: async (text: string) => ({ ok: true, feedback: `Checked essay with ${text.length} characters.` }),
};
