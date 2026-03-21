import { z } from "zod";
import { mcPost, mcGet } from "../minecraft-client.js";

export const sendChatSchema = z.object({
  message: z.string().describe("The chat message to send"),
});

export const readChatSchema = z.object({
  limit: z.number().optional().default(50).describe("Number of recent messages to retrieve"),
});

export async function sendChat(
  params: z.infer<typeof sendChatSchema>
): Promise<string> {
  const result = await mcPost("/chat/send", params);
  return JSON.stringify(result);
}

export async function readChat(
  params: z.infer<typeof readChatSchema>
): Promise<string> {
  const result = await mcGet(`/chat/history?limit=${params.limit}`);
  return JSON.stringify(result);
}
