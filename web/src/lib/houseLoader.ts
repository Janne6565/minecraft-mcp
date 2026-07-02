import type { ModelKey, EffortKey } from './houseData';
import type { Voxel } from './voxelBuilders';
import { buildHouseVoxels } from './voxelBuilders';

export interface HouseJson {
  // v2 (scripts/capture.ts): palette-indexed blocks, may include block states
  readonly version?: number;
  readonly palette?: readonly string[];
  readonly blocks?: readonly (readonly [number, number, number, number])[];
  // v1 (legacy): plain voxel list
  readonly voxels?: readonly Voxel[];
  readonly capturedAt?: string;
  readonly origin?: { x: number; y: number; z: number };
}

// Block name aliases: Minecraft name → blocks.json key
const ALIASES: Record<string, string> = {
  // add overrides here if needed
};

// Strip block state suffix and namespace prefix
// e.g. "minecraft:oak_log[axis=y]" → "oak_log"
export function normalizeBlockName(raw: string): string {
  // strip namespace prefix and any block state suffix ({...} or [...])
  const bare = raw.replace(/^minecraft:/, '').replace(/[{[].*/,'');
  return ALIASES[bare] ?? bare;
}

// Convert MCP read_blocks response to Voxel[]
export function mcDataToVoxels(data: {
  legend: Record<string, string>;
  grid: string[][][]; // grid[yi][zi][xi]
}): Voxel[] {
  const voxels: Voxel[] = [];
  const SKIP = new Set(['air', 'cave_air', 'void_air']);

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  const raw: Array<{ x: number; y: number; z: number; block: string }> = [];

  for (let yi = 0; yi < data.grid.length; yi++) {
    for (let zi = 0; zi < data.grid[yi].length; zi++) {
      for (let xi = 0; xi < data.grid[yi][zi].length; xi++) {
        const key = data.grid[yi][zi][xi];
        if (!key) continue;
        const block = normalizeBlockName(data.legend[key] ?? key);
        if (SKIP.has(block)) continue;
        raw.push({ x: xi, y: yi, z: zi, block });
        if (xi < minX) minX = xi;
        if (yi < minY) minY = yi;
        if (zi < minZ) minZ = zi;
      }
    }
  }

  // Normalize so minimum coords start at 0
  for (const r of raw) {
    voxels.push({ x: r.x - minX, y: r.y - minY, z: r.z - minZ, block: r.block });
  }

  return voxels;
}

// In-memory cache so we don't re-fetch on every card render
const cache = new Map<string, Voxel[]>();

export async function loadHouseVoxels(model: ModelKey, effort: EffortKey): Promise<Voxel[]> {
  const id = `${model}-${effort}`;
  const hit = cache.get(id);
  if (hit) return hit;

  try {
    const res = await fetch(`/houses/${id}.json`);
    if (res.ok) {
      const json: HouseJson = await res.json() as HouseJson;
      const voxels = houseJsonToVoxels(json);
      if (voxels) {
        cache.set(id, voxels);
        return voxels;
      }
    }
  } catch {
    // not captured yet — fall through to sample
  }

  return buildHouseVoxels(model, effort);
}

function houseJsonToVoxels(json: HouseJson): Voxel[] | null {
  if (json.palette && json.blocks) {
    // Keep block states ("oak_stairs{facing=south}") — the viewer resolves the
    // matching model variant from them. Only strip the namespace prefix.
    const names = json.palette.map((p) => p.replace(/^minecraft:/, ''));
    return json.blocks.map(([x, y, z, i]) => ({ x, y, z, block: names[i] }));
  }
  if (json.voxels) return json.voxels as Voxel[];
  return null;
}

/** Call this after writing a new JSON file to bust the cache for that house. */
export function bustCache(model: ModelKey, effort: EffortKey) {
  cache.delete(`${model}-${effort}`);
}
