import type { ModelKey, EffortKey } from './houseData';

export interface Voxel {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly block: string; // e.g. 'oak_planks', 'grass_block', 'stone_bricks'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function box(
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  block: string, hollow = false,
): Voxel[] {
  const out: Voxel[] = [];
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        if (!hollow || x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1)
          out.push({ x, y, z, block });
  return out;
}

function slab(y: number, x0: number, z0: number, x1: number, z1: number, block: string): Voxel[] {
  return box(x0, y, z0, x1, y, z1, block);
}

// ─── House generators ────────────────────────────────────────────────────────

function tidyCabin(): Voxel[] {
  return [
    ...slab(0, 0, 0, 6, 6, 'oak_planks'),
    ...box(0, 1, 0, 0, 4, 6, 'oak_log', false),
    ...box(6, 1, 0, 6, 4, 6, 'oak_log', false),
    ...box(0, 1, 0, 6, 4, 0, 'oak_log', false),
    ...box(0, 1, 6, 6, 4, 6, 'oak_log', false),
    // door gap overrides (air — just skip those voxels)
    // windows
    { x: 1, y: 2, z: 6, block: 'glass' },
    { x: 5, y: 2, z: 6, block: 'glass' },
    { x: 1, y: 2, z: 0, block: 'glass' },
    { x: 5, y: 2, z: 0, block: 'glass' },
    // pitched roof
    ...slab(5, 0, 0, 6, 6, 'oak_planks'),
    ...slab(6, 1, 0, 5, 6, 'oak_planks'),
    ...slab(7, 2, 0, 4, 6, 'oak_planks'),
    ...slab(8, 3, 0, 3, 6, 'oak_planks'),
    // fireplace
    { x: 3, y: 1, z: 0, block: 'stone' },
    { x: 3, y: 2, z: 0, block: 'stone' },
    { x: 3, y: 3, z: 0, block: 'stone' },
    { x: 3, y: 1, z: 1, block: 'coal_block' },
  ];
}

function gardenCottage(): Voxel[] {
  return [
    ...slab(0, -2, -2, 8, 8, 'dirt'),
    ...slab(0, -2, -2, 8, -1, 'grass_block'),
    ...slab(0, -2, 7, 8, 8, 'grass_block'),
    ...slab(0, -2, -2, -1, 8, 'grass_block'),
    ...slab(0, 8, -2, 9, 8, 'grass_block'),
    ...slab(0, 0, 0, 7, 6, 'oak_planks'),
    ...box(0, 1, 0, 0, 4, 6, 'oak_log', false),
    ...box(7, 1, 0, 7, 4, 6, 'oak_log', false),
    ...box(0, 1, 0, 7, 4, 0, 'oak_log', false),
    ...box(0, 1, 6, 7, 4, 6, 'oak_log', false),
    { x: 2, y: 2, z: 6, block: 'glass' }, { x: 2, y: 3, z: 6, block: 'glass' },
    { x: 5, y: 2, z: 6, block: 'glass' }, { x: 5, y: 3, z: 6, block: 'glass' },
    ...slab(5, 0, 0, 7, 6, 'oak_planks'),
    ...box(0, 6, 0, 0, 9, 6, 'oak_log', false),
    ...box(7, 6, 0, 7, 9, 6, 'oak_log', false),
    ...box(0, 6, 0, 7, 9, 0, 'oak_log', false),
    ...box(0, 6, 6, 7, 9, 6, 'oak_log', false),
    ...slab(10, 0, 0, 7, 6, 'grass_block'),
    { x: 1, y: 11, z: 1, block: 'oak_leaves' }, { x: 6, y: 11, z: 1, block: 'oak_leaves' },
    { x: 1, y: 11, z: 5, block: 'oak_leaves' }, { x: 6, y: 11, z: 5, block: 'oak_leaves' },
    { x: -1, y: 1, z: 2, block: 'red_wool' }, { x: -1, y: 1, z: 4, block: 'red_wool' },
    { x: -1, y: 1, z: 3, block: 'oak_leaves' },
  ];
}

function symmetricManor(): Voxel[] {
  return [
    ...slab(0, -3, -3, 15, 15, 'stone'),
    ...box(0, 1, 0, 14, 8, 12, 'stone_bricks', true),
    ...slab(0, 0, 0, 14, 12, 'oak_planks'),
    ...slab(9, 0, 0, 14, 12, 'oak_planks'),
    ...box(0, 10, 0, 14, 16, 12, 'stone_bricks', true),
    ...box(-4, 1, 2, 0, 8, 10, 'stone_bricks', true),
    ...box(14, 1, 2, 18, 8, 10, 'stone_bricks', true),
    ...[2,4,6,8,10,12].flatMap(z => [
      { x: 0, y: 3, z, block: 'glass' }, { x: 0, y: 4, z, block: 'glass' },
      { x: 14, y: 3, z, block: 'glass' }, { x: 14, y: 4, z, block: 'glass' },
    ]),
    ...slab(1, -3, 4, -1, 8, 'oak_leaves'),
    ...slab(1, 15, 4, 17, 8, 'oak_leaves'),
    { x: 6, y: 1, z: -1, block: 'iron_block' }, { x: 7, y: 1, z: -1, block: 'iron_block' },
    { x: 8, y: 1, z: -1, block: 'iron_block' }, { x: 6, y: 2, z: -1, block: 'iron_block' },
    { x: 8, y: 2, z: -1, block: 'iron_block' },
    ...slab(9, 2, -1, 12, -1, 'oak_planks'),
  ];
}

function quickShack(): Voxel[] {
  return [
    ...slab(0, 0, 0, 5, 5, 'dirt'),
    ...box(0, 1, 0, 0, 3, 5, 'cobblestone', false),
    ...box(5, 1, 0, 5, 3, 5, 'cobblestone', false),
    ...box(0, 1, 0, 5, 3, 0, 'cobblestone', false),
    ...box(0, 1, 5, 5, 3, 5, 'cobblestone', false),
    ...slab(4, 0, 0, 5, 5, 'cobblestone'),
  ];
}

function splitLevelLodge(): Voxel[] {
  return [
    ...slab(0, 0, 0, 8, 8, 'oak_planks'),
    ...box(0, 1, 0, 0, 5, 8, 'spruce_log', false),
    ...box(8, 1, 0, 8, 5, 8, 'spruce_log', false),
    ...box(0, 1, 0, 8, 5, 0, 'spruce_log', false),
    ...box(0, 1, 8, 8, 5, 8, 'spruce_log', false),
    ...slab(6, 0, 0, 8, 8, 'oak_planks'),
    ...box(0, 7, 0, 0, 9, 8, 'spruce_log', false),
    ...box(8, 7, 0, 8, 9, 8, 'spruce_log', false),
    ...box(0, 7, 0, 8, 9, 0, 'spruce_log', false),
    ...box(0, 7, 8, 8, 9, 8, 'spruce_log', false),
    ...slab(6, -1, 2, -1, 6, 'oak_planks'),
    ...box(4, 1, 0, 4, 4, 0, 'stone', false),
    { x: 2, y: 3, z: 0, block: 'glass' }, { x: 6, y: 3, z: 0, block: 'glass' },
    { x: 2, y: 3, z: 8, block: 'glass' }, { x: 6, y: 3, z: 8, block: 'glass' },
  ];
}

function grandRedstoneEstate(): Voxel[] {
  return [
    ...slab(0, -2, -2, 16, 16, 'stone'),
    ...box(0, 1, 0, 16, 10, 14, 'quartz_block', true),
    ...slab(11, 0, 0, 16, 14, 'quartz_block'),
    ...box(0, 12, 0, 16, 18, 14, 'quartz_block', true),
    ...[1,3,5,7,9,11,13,15].flatMap(x => [
      { x, y: 0, z: 0, block: 'redstone_block' },
      { x, y: 0, z: 14, block: 'redstone_block' },
    ]),
    ...box(4, 1, 4, 4, 10, 4, 'gold_block', false),
    ...box(12, 1, 4, 12, 10, 4, 'gold_block', false),
    ...box(4, 1, 10, 4, 10, 10, 'gold_block', false),
    ...box(12, 1, 10, 12, 10, 10, 'gold_block', false),
    ...box(8, 1, 7, 9, 18, 8, 'iron_block', true),
    ...slab(-3, 5, 5, 11, 9, 'obsidian'),
    ...[2,6,10,14].flatMap(x => [
      { x, y: 4, z: 0, block: 'glass' }, { x, y: 5, z: 0, block: 'glass' },
      { x, y: 4, z: 14, block: 'glass' }, { x, y: 5, z: 14, block: 'glass' },
    ]),
  ];
}

function glassBox(): Voxel[] {
  return [
    ...slab(0, 0, 0, 6, 6, 'white_concrete'),
    ...box(0, 1, 0, 6, 5, 6, 'white_stained_glass', true),
    ...slab(6, 0, 0, 6, 6, 'white_concrete'),
    ...box(0, 0, 0, 0, 6, 6, 'white_concrete', false),
    ...box(6, 0, 0, 6, 6, 6, 'white_concrete', false),
  ];
}

function modernBungalow(): Voxel[] {
  return [
    ...slab(0, -2, -2, 9, 9, 'white_concrete'),
    ...slab(0, -1, -1, 8, 8, 'white_concrete'),
    ...box(0, 1, 0, 8, 5, 7, 'white_stained_glass', true),
    ...box(0, 0, 0, 8, 6, 7, 'white_concrete', false),
    ...slab(6, 0, 0, 8, 7, 'white_concrete'),
    ...slab(-1, -2, 1, -2, 5, 'white_concrete'),
    ...slab(-1, -1, 2, -1, 4, 'water_still'),
    ...slab(6, 0, 0, 8, 7, 'glowstone'),
  ];
}

function skylightVilla(): Voxel[] {
  return [
    ...slab(0, -3, -3, 12, 12, 'white_concrete'),
    ...box(0, 1, 0, 12, 8, 10, 'white_stained_glass', true),
    ...box(0, 0, 0, 12, 9, 10, 'white_concrete', false),
    ...slab(9, 0, 0, 12, 10, 'white_concrete'),
    ...slab(9, 4, 4, 8, 6, 'white_stained_glass'),
    ...slab(-1, 2, 3, 10, 7, 'water_still'),
    ...box(1, 0, 3, 9, 0, 7, 'white_concrete', false),
    ...[0, 10].flatMap(z => slab(0, 0, z, 12, z, 'glowstone')),
  ];
}

function dirtHut(): Voxel[] {
  return [
    ...slab(0, 0, 0, 4, 4, 'dirt'),
    ...box(0, 1, 0, 0, 3, 4, 'dirt', false),
    ...box(4, 1, 0, 4, 3, 4, 'dirt', false),
    ...box(0, 1, 0, 4, 3, 0, 'dirt', false),
    // south wall has door gap at x=2
    ...[0,1,3,4].map(x => ({ x, y: 1, z: 4, block: 'dirt' })),
    ...[0,1,3,4].map(x => ({ x, y: 2, z: 4, block: 'dirt' })),
    { x: 2, y: 3, z: 4, block: 'dirt' },
    { x: 0, y: 3, z: 4, block: 'dirt' }, { x: 4, y: 3, z: 4, block: 'dirt' },
    ...slab(4, 0, 0, 4, 4, 'dirt'),
    { x: 2, y: 2, z: 2, block: 'glowstone' },
  ];
}

function rusticFarmstead(): Voxel[] {
  return [
    ...slab(0, -2, -2, 14, 12, 'dirt'),
    ...slab(0, 0, 0, 6, 6, 'oak_planks'),
    ...box(0, 1, 0, 0, 5, 6, 'oak_log', false),
    ...box(6, 1, 0, 6, 5, 6, 'oak_log', false),
    ...box(0, 1, 0, 6, 5, 0, 'oak_log', false),
    ...box(0, 1, 6, 6, 5, 6, 'oak_log', false),
    ...box(8, 1, 0, 14, 6, 6, 'oak_log', true),
    ...slab(7, 8, 0, 14, 6, 'oak_planks'),
    { x: 9, y: 1, z: 1, block: 'hay_block' }, { x: 9, y: 1, z: 5, block: 'hay_block' },
    { x: 13, y: 1, z: 1, block: 'hay_block' }, { x: 13, y: 1, z: 5, block: 'hay_block' },
    ...slab(0, 0, 8, 6, 11, 'dirt'),
    ...[8,9,10,11].map(z => ({ x: 2, y: 1, z, block: 'emerald_block' })),
    ...[8,9,10,11].map(z => ({ x: 4, y: 1, z, block: 'emerald_block' })),
  ];
}

function fortifiedHomestead(): Voxel[] {
  return [
    ...slab(0, -2, -2, 18, 18, 'dirt'),
    ...box(-2, 1, -2, 18, 5, -2, 'stone_bricks', false),
    ...box(-2, 1, 18, 18, 5, 18, 'stone_bricks', false),
    ...box(-2, 1, -2, -2, 5, 18, 'stone_bricks', false),
    ...box(18, 1, -2, 18, 5, 18, 'stone_bricks', false),
    ...box(16, 1, 16, 18, 12, 18, 'stone_bricks', true),
    ...slab(13, 15, 15, 19, 19, 'stone_bricks'),
    ...slab(0, 0, 0, 10, 10, 'oak_planks'),
    ...box(0, 1, 0, 10, 7, 10, 'oak_log', true),
    ...slab(0, 0, 12, 10, 17, 'dirt'),
    ...[0,2,4,6,8,10].map(x => ({ x, y: 1, z: 14, block: 'emerald_block' })),
    ...[0,2,4,6,8,10].map(x => ({ x, y: 1, z: 16, block: 'emerald_block' })),
    { x: 1, y: 1, z: 12, block: 'gold_block' }, { x: 2, y: 1, z: 12, block: 'gold_block' },
    { x: 7, y: 1, z: -2, block: 'iron_block' }, { x: 8, y: 1, z: -2, block: 'iron_block' },
    { x: 7, y: 2, z: -2, block: 'iron_block' }, { x: 8, y: 2, z: -2, block: 'iron_block' },
    { x: 7, y: 3, z: -2, block: 'redstone_block' }, { x: 8, y: 3, z: -2, block: 'redstone_block' },
  ];
}

const BUILDERS: Record<string, () => Voxel[]> = {
  'claude-low':    tidyCabin,
  'claude-medium': gardenCottage,
  'claude-high':   symmetricManor,
  'gpt-low':       quickShack,
  'gpt-medium':    splitLevelLodge,
  'gpt-high':      grandRedstoneEstate,
  'gemini-low':    glassBox,
  'gemini-medium': modernBungalow,
  'gemini-high':   skylightVilla,
  'llama-low':     dirtHut,
  'llama-medium':  rusticFarmstead,
  'llama-high':    fortifiedHomestead,
  // fable — real captures load from JSON; these are fallbacks while capturing
  'fable-low':     tidyCabin,
  'fable-medium':  gardenCottage,
  'fable-high':    symmetricManor,
  'fable-max':     grandRedstoneEstate,
};

export function buildHouseVoxels(model: ModelKey, effort: EffortKey): Voxel[] {
  return (BUILDERS[`${model}-${effort}`] ?? tidyCabin)();
}
