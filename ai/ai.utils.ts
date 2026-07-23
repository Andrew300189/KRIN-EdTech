export function formatAIResponse(text: string) {
  return text.trim();
}

export function truncateMessage(text: string, maxLength = 80) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
