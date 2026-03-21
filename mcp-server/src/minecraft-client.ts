const MINECRAFT_HOST = process.env.MINECRAFT_HOST ?? "localhost";
const MINECRAFT_PORT = process.env.MINECRAFT_PORT ?? "4711";
const BASE_URL = `http://${MINECRAFT_HOST}:${MINECRAFT_PORT}`;

export async function mcPost(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Minecraft API error (${response.status}): ${text}`);
  }

  return response.json();
}

export async function mcGet(path: string): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Minecraft API error (${response.status}): ${text}`);
  }

  return response.json();
}
