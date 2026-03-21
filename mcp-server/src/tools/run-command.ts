import { z } from "zod";
import { mcPost } from "../minecraft-client.js";

export const runCommandSchema = z.object({
  command: z.string().describe("The Minecraft command to execute (without leading /)"),
});

export async function runCommand(
  params: z.infer<typeof runCommandSchema>
): Promise<string> {
  const result = await mcPost("/command", params);
  return JSON.stringify(result);
}
