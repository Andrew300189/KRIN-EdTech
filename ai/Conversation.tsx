import React from 'react';
import AIMessage from './AIMessage';

export interface ConversationProps {
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
}

export default function Conversation({ messages }: ConversationProps) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <AIMessage key={message.id} role={message.role} content={message.content} />
      ))}
    </div>
  );
}
