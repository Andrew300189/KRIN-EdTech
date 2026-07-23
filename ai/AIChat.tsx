import React, { useState } from 'react';
import AIMessage from './AIMessage';

export default function AIChat() {
  const [messages, setMessages] = useState([{ id: '1', role: 'assistant', content: 'Hello! I can help with grammar, writing, and speaking practice.' }]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: input }]);
    setInput('');
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">AI Tutor</h3>
      <div className="mt-4 space-y-3">
        {messages.map((message) => (
          <AIMessage key={message.id} role={message.role} content={message.content} />
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Ask the AI tutor..."
        />
        <button onClick={sendMessage} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Send</button>
      </div>
    </section>
  );
}
