export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const APP_ID = process.env.NEXT_PUBLIC_APP_ID || "";

export const apiConfig = {
  baseUrl: API_URL,
  appId: APP_ID,
  defaultHeaders: {
    "Content-Type": "application/json",
  },
} as const;
