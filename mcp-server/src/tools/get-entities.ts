import { z } from "zod";
import { mcPost } from "../minecraft-client.js";

export const getEntitiesSchema = z.object({
  from: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  to: z.object({ x: z.number(), y: z.number(), z: z.number() }),
});

export async function getEntities(
  params: z.infer<typeof getEntitiesSchema>
): Promise<string> {
  const result = await mcPost("/entities", params);
  return JSON.stringify(result);
}
