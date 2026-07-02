/**
 * Capture a build from the Minecraft world into web/public/houses/<id>.json.
 *
 * Pipeline:
 *   1. Find the player via the mod's HTTP API and scan the volume around them.
 *   2. Diff each Y layer against the flatland baseline (the most common block
 *      of that layer) — anything that differs is part of the build.
 *   3. Take the bounding box of those anomalies, pad it by a few blocks so a
 *      slab of the surrounding ground is included, and export every non-air
 *      block inside as a palette-indexed voxel list.
 *
 * Usage:
 *   bun scripts/capture.ts <model>-<effort> [options]
 *     --player <name>   player to center on (default: first player)
 *     --radius <n>      XZ scan radius around the player (default 48)
 *     --pad <n>         padding around the detected build (default 3)
 *     --y-below <n>     scan depth below the player (default 12)
 *     --y-above <n>     scan height above the player (default 48)
 *     --host / --port   mod HTTP API (default localhost:4711)
 *
 * Example: bun scripts/capture.ts fable-high
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_READ_VOLUME = 262_144; // mod-side limit per read_blocks request

// ─── CLI args ─────────────────────────────────────────────────────────────────

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('Usage: bun scripts/capture.ts <model>-<effort> [--player NAME] [--radius 48] [--pad 3]');
  process.exit(1);
}

const HOST = argValue('--host') ?? process.env.MINECRAFT_HOST ?? 'localhost';
const PORT = argValue('--port') ?? process.env.MINECRAFT_PORT ?? '4711';
const RADIUS = Number(argValue('--radius') ?? 48);
const PAD = Number(argValue('--pad') ?? 3);
const Y_BELOW = Number(argValue('--y-below') ?? 12);
const Y_ABOVE = Number(argValue('--y-above') ?? 48);
const PLAYER = argValue('--player');

// ─── Mod HTTP API ─────────────────────────────────────────────────────────────

async function api<T>(pathname: string, body?: unknown): Promise<T> {
  const res = await fetch(`http://${HOST}:${PORT}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${pathname} failed (${res.status}): ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface PlayerInfo { name: string; position: { x: number; y: number; z: number } }
interface ReadResult { legend: Record<string, string>; grid: string[][][] }

// ─── Scan ─────────────────────────────────────────────────────────────────────

/** Reads the volume in Y-slabs that respect the mod's per-request limit.
 *  Returns grid[y][z][x] of block names ('' = air), relative to (x0,y0,z0). */
async function scanVolume(
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
): Promise<string[][][]> {
  const width = x1 - x0 + 1;
  const depth = z1 - z0 + 1;
  const slabHeight = Math.max(1, Math.floor(MAX_READ_VOLUME / (width * depth)));
  const grid: string[][][] = [];

  for (let y = y0; y <= y1; y += slabHeight) {
    const yTop = Math.min(y + slabHeight - 1, y1);
    process.stdout.write(`  reading y=${y}..${yTop} (${width}x${depth})…\n`);
    const result = await api<ReadResult>('/blocks/read', {
      from: { x: x0, y, z: z0 },
      to: { x: x1, y: yTop, z: z1 },
    });
    for (const layer of result.grid) {
      grid.push(layer.map((row) => row.map((key) => (key === '' ? '' : result.legend[key] ?? key))));
    }
  }
  return grid;
}

// ─── Build detection ──────────────────────────────────────────────────────────

/** Most common block per Y layer = the flatland baseline for that layer. */
function layerBaseline(layer: string[][]): string {
  const counts = new Map<string, number>();
  for (const row of layer) {
    for (const block of row) counts.set(block, (counts.get(block) ?? 0) + 1);
  }
  let best = '';
  let bestCount = -1;
  for (const [block, count] of counts) {
    if (count > bestCount) { best = block; bestCount = count; }
  }
  return best;
}

interface Box { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number }

function findAnomalyBox(grid: string[][][]): Box | null {
  const box: Box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  let found = false;
  for (let y = 0; y < grid.length; y++) {
    const baseline = layerBaseline(grid[y]);
    for (let z = 0; z < grid[y].length; z++) {
      for (let x = 0; x < grid[y][z].length; x++) {
        if (grid[y][z][x] === baseline) continue;
        found = true;
        if (x < box.minX) box.minX = x;
        if (y < box.minY) box.minY = y;
        if (z < box.minZ) box.minZ = z;
        if (x > box.maxX) box.maxX = x;
        if (y > box.maxY) box.maxY = y;
        if (z > box.maxZ) box.maxZ = z;
      }
    }
  }
  return found ? box : null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const playersResponse = await api<{ players: PlayerInfo[] }>('/players');
const player = PLAYER
  ? playersResponse.players.find((p) => p.name === PLAYER)
  : playersResponse.players[0];
if (!player) {
  console.error(PLAYER ? `Player "${PLAYER}" not online.` : 'No players online.');
  process.exit(1);
}

const px = Math.floor(player.position.x);
const py = Math.floor(player.position.y);
const pz = Math.floor(player.position.z);
console.log(`Scanning around ${player.name} at ${px} ${py} ${pz} (radius ${RADIUS})`);

const scanX0 = px - RADIUS, scanX1 = px + RADIUS;
const scanZ0 = pz - RADIUS, scanZ1 = pz + RADIUS;
const scanY0 = py - Y_BELOW, scanY1 = py + Y_ABOVE;

const grid = await scanVolume(scanX0, scanY0, scanZ0, scanX1, scanY1, scanZ1);

const box = findAnomalyBox(grid);
if (!box) {
  console.error('No build found — the scanned area matches the flatland baseline everywhere.');
  process.exit(1);
}

const sizeX = grid[0][0].length, sizeY = grid.length, sizeZ = grid[0].length;
if (box.minX === 0 || box.minZ === 0 || box.maxX === sizeX - 1 || box.maxZ === sizeZ - 1) {
  console.warn('⚠ Build touches the scan boundary — it may be cut off. Re-run with a larger --radius.');
}
if (box.maxY === sizeY - 1) {
  console.warn('⚠ Build reaches the top of the scan — re-run with a larger --y-above.');
}

// Pad so a slab of surrounding ground is part of the capture
const minX = Math.max(0, box.minX - PAD);
const minY = Math.max(0, box.minY - PAD);
const minZ = Math.max(0, box.minZ - PAD);
const maxX = Math.min(sizeX - 1, box.maxX + PAD);
const maxY = Math.min(sizeY - 1, box.maxY + PAD);
const maxZ = Math.min(sizeZ - 1, box.maxZ + PAD);

const palette: string[] = [];
const paletteIndex = new Map<string, number>();
const blocks: number[][] = [];

for (let y = minY; y <= maxY; y++) {
  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const block = grid[y][z][x];
      if (block === '') continue;
      let index = paletteIndex.get(block);
      if (index === undefined) {
        index = palette.length;
        palette.push(block);
        paletteIndex.set(block, index);
      }
      blocks.push([x - minX, y - minY, z - minZ, index]);
    }
  }
}

const output = {
  version: 2,
  id,
  capturedAt: new Date().toISOString().slice(0, 10),
  origin: { x: scanX0 + minX, y: scanY0 + minY, z: scanZ0 + minZ },
  size: { x: maxX - minX + 1, y: maxY - minY + 1, z: maxZ - minZ + 1 },
  palette,
  blocks,
};

const outFile = path.join(WEB_ROOT, 'public', 'houses', `${id}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(output));

const baseNames = new Set(palette.map((p) => p.replace(/[{[].*/, '')));
console.log(`\nCaptured "${id}" → ${path.relative(process.cwd(), outFile)}`);
console.log(`  build bounds : ${output.size.x} x ${output.size.y} x ${output.size.z} (origin ${output.origin.x} ${output.origin.y} ${output.origin.z})`);
console.log(`  blocks       : ${blocks.length}`);
console.log(`  block types  : ${baseNames.size}`);
console.log(`\nFor src/lib/houseData.ts: blocks: ${blocks.length}, blockTypes: ${baseNames.size}, capturedAt: '${output.capturedAt}'`);
