import { z } from "zod";
import { mcPost } from "../minecraft-client.js";

export const readBlocksSchema = z.object({
  from: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  to: z.object({ x: z.number(), y: z.number(), z: z.number() }),
});

export async function readBlocks(
  params: z.infer<typeof readBlocksSchema>
): Promise<string> {
  const result = await mcPost("/blocks/read", params);
  return JSON.stringify(result);
}
