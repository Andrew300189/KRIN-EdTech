import { useState } from 'react';
import { askAI } from './ai.service';

export default function useAI() {
  const [loading, setLoading] = useState(false);

  const sendPrompt = async (prompt: string) => {
    setLoading(true);
    const response = await askAI(prompt);
    setLoading(false);
    return response;
  };

  return { loading, sendPrompt };
}
