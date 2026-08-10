// lib/chatApi.ts
//
// REMOVED: detectIntent() and the three separate fetch branches
// (/api/hackathon-analyze, /api/ask-database, /api/chat) that used to live
// in ChatPage.tsx. The backend router now decides internally which pipeline
// (filters / semantic / hybrid / geospatial / general_qa) answers a query,
// and returns one unified shape. The frontend's job is just to ask and render.
//
// REMOVED: anomalies, citations (dropped facility-verification feature).
// REMOVED: agent_response (dropped by product decision / dead weight).
// REMOVED: specialContent (report summary now formatted as plain text,
// not a structured field).

import type { BotMessage } from '../../lib/types';

export interface ChatApiResponse {
  reply?: string;
  answer?: string;
  error?: string;
  sql?: string;
  video?: BotMessage['video'];
  raw_data?: BotMessage['raw_data'];
  mapData?: BotMessage['mapData'];
  chat_id?: string;
}

export const sendChatMessage = async (
  apiUrl: string,
  accessToken: string | undefined,
  message: string,
  chatId: string,
  context: unknown
): Promise<ChatApiResponse> => {
  const response = await fetch(`${apiUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message, chat_id: chatId, context }),
  });

  const data = await response.json();
  // FIXED: previously the HEALTH branch read data.reply as the error
  // message on failure. It's data.error, same as every other branch.
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
};

export const buildBotMessage = (data: ChatApiResponse): BotMessage => ({
  id: (Date.now() + 1).toString(),
  type: 'bot',
  content: data.reply || data.answer || 'I could not process that.',
  timestamp: new Date(),
  sql: data.sql,
  video: data.video,
  raw_data: data.raw_data,
  mapData: data.mapData,
});
