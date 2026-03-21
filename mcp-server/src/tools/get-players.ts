import { z } from "zod";
import { mcGet } from "../minecraft-client.js";

export const getPlayersSchema = z.object({
  name: z.string().optional().describe("Specific player name. Omit to list all players."),
});

export async function getPlayers(
  params: z.infer<typeof getPlayersSchema>
): Promise<string> {
  const path = params.name ? `/players/${params.name}` : "/players";
  const result = await mcGet(path);
  return JSON.stringify(result);
}
