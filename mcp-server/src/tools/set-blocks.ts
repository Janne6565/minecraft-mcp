import { z } from "zod";
import { mcPost } from "../minecraft-client.js";

export const setBlocksSchema = z.object({
  from: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  legend: z.record(z.string(), z.string()),
  grid: z.array(z.array(z.array(z.string()))),
});

export async function setBlocks(
  params: z.infer<typeof setBlocksSchema>
): Promise<string> {
  const result = await mcPost("/blocks/set", params);
  return JSON.stringify(result);
}
