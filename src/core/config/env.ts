// Environment configuration
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000",
  appName: "KRIN EdTech",
  appVersion: "1.0.0",
};
