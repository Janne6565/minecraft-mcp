/**
 * Sync Minecraft block assets from a vanilla-format resource pack into web/public.
 *
 * 1. Copies  <pack>/assets/minecraft/textures/block/*.png  →  public/textures/block/
 * 2. Parses  <pack>/assets/minecraft/blockstates + models  →  public/blocks.json
 *
 * blocks.json maps block name → per-face textures, tint color and transparency,
 * derived from the vanilla model definitions (parent chain + tintindex flags).
 *
 * Usage:
 *   bun scripts/sync-assets.ts [--pack <path-to-resource-pack>]
 *   (or set MC_RESOURCE_PACK)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PACK = 'C:/Users/janne/Downloads/26.2.x-Template';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const PACK_ROOT = argValue('--pack') ?? process.env.MC_RESOURCE_PACK ?? DEFAULT_PACK;
const MC_ASSETS = path.join(PACK_ROOT, 'assets', 'minecraft');
const TEXTURES_DIR = path.join(MC_ASSETS, 'textures', 'block');
const MODELS_DIR = path.join(MC_ASSETS, 'models');
const BLOCKSTATES_DIR = path.join(MC_ASSETS, 'blockstates');
const OUT_TEXTURES = path.join(WEB_ROOT, 'public', 'textures', 'block');
const OUT_MANIFEST = path.join(WEB_ROOT, 'public', 'blocks.json');

// ─── Tint colors (plains biome) ───────────────────────────────────────────────
// Grayscale textures that Minecraft tints at runtime via biome colormaps.
// The models mark tinted faces with `tintindex`; we bake a fixed plains color.

const TINT = {
  grass: '#91BD59',
  foliage: '#77AB2F',
  spruce: '#619961',
  birch: '#80A755',
  water: '#3F76E4',
} as const;

function tintColorFor(block: string): string {
  if (block.includes('water')) return TINT.water;
  if (block === 'spruce_leaves') return TINT.spruce;
  if (block === 'birch_leaves') return TINT.birch;
  if (block.endsWith('_leaves') || block === 'vine') return TINT.foliage;
  if (block === 'redstone_wire') return '#B00000';
  if (block === 'lily_pad') return '#208030';
  return TINT.grass; // grass_block, short_grass, fern, sugar_cane, …
}

// Blocks whose transparency comes from the render layer, not texture alpha
const FORCE_TRANSPARENT = new Set([
  'water', 'flowing_water', 'ice', 'frosted_ice', 'slime_block', 'honey_block',
]);

// ─── PNG transparency detection ───────────────────────────────────────────────
// Minimal PNG decode: enough to answer "does any pixel have alpha < 255?".
// Handles 8-bit non-interlaced images (all vanilla block textures).

function pngHasTransparency(file: string): boolean {
  const buf = fs.readFileSync(file);
  let off = 8; // skip signature
  let colorType = -1;
  let bitDepth = 0;
  let interlace = 0;
  let width = 0;
  let height = 0;
  let hasTRNS = false;
  const idat: Buffer[] = [];

  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'tRNS') {
      hasTRNS = true;
      if (colorType === 3) {
        for (const a of data) if (a < 255) return true;
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }

  // Grayscale/RGB with a tRNS chunk = one fully transparent color
  if (hasTRNS && (colorType === 0 || colorType === 2)) return true;
  // No alpha channel at all
  if (colorType !== 4 && colorType !== 6) return false;
  // Unsupported encodings: assume opaque
  if (bitDepth !== 8 || interlace !== 0 || idat.length === 0) return false;

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : 2;
  const stride = width * channels;
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);

  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos + x];
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let val: number;
      switch (filter) {
        case 1: val = rawByte + a; break;
        case 2: val = rawByte + b; break;
        case 3: val = rawByte + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          val = rawByte + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: val = rawByte;
      }
      cur[x] = val & 0xff;
    }
    pos += stride;
    for (let x = channels - 1; x < stride; x += channels) {
      if (cur[x] < 255) return true; // alpha is the last channel
    }
    prev.set(cur);
  }
  return false;
}

// ─── Model resolution ─────────────────────────────────────────────────────────

interface ModelFace { texture: string; tintindex?: number }
interface ModelElement { faces?: Record<string, ModelFace> }
// Texture values are either "block/stone" or, in newer packs,
// { "sprite": "block/glass", "force_translucent": true }
type TextureRef = string | { sprite: string; force_translucent?: boolean };
interface RawModel {
  parent?: string;
  textures?: Record<string, TextureRef>;
  elements?: ModelElement[];
}

const modelCache = new Map<string, RawModel | null>();

function loadModel(ref: string): RawModel | null {
  const name = ref.replace(/^minecraft:/, '');
  if (name.startsWith('builtin/')) return null;
  const cached = modelCache.get(name);
  if (cached !== undefined) return cached;
  const file = path.join(MODELS_DIR, `${name}.json`);
  let model: RawModel | null = null;
  try {
    model = JSON.parse(fs.readFileSync(file, 'utf8')) as RawModel;
  } catch {
    model = null;
  }
  modelCache.set(name, model);
  return model;
}

/** Walk the parent chain: merged textures (child wins) + most-derived elements. */
function resolveModel(ref: string): {
  textures: Record<string, string>;
  elements?: ModelElement[];
  forceTranslucent: boolean;
} {
  const textureLayers: Record<string, TextureRef>[] = [];
  let elements: ModelElement[] | undefined;
  let current: string | undefined = ref;
  for (let depth = 0; current && depth < 16; depth++) {
    const model = loadModel(current);
    if (!model) break;
    if (model.textures) textureLayers.push(model.textures);
    elements ??= model.elements;
    current = model.parent;
  }
  // Parent-first merge so child assignments override
  const merged: Record<string, TextureRef> = {};
  for (const layer of textureLayers.reverse()) Object.assign(merged, layer);

  const textures: Record<string, string> = {};
  let forceTranslucent = false;
  for (const [slot, value] of Object.entries(merged)) {
    if (typeof value === 'string') {
      textures[slot] = value;
    } else if (value?.sprite) {
      textures[slot] = value.sprite;
      if (value.force_translucent) forceTranslucent = true;
    }
  }
  return { textures, elements, forceTranslucent };
}

/** Resolve "#side" style references through the texture map to a concrete name. */
function resolveTexture(ref: string, textures: Record<string, string>): string | null {
  let value: string | undefined = ref;
  for (let depth = 0; typeof value === 'string' && depth < 16; depth++) {
    if (!value.startsWith('#')) {
      const name = value.replace(/^minecraft:/, '');
      return name.startsWith('block/') ? name.slice('block/'.length) : null;
    }
    value = textures[value.slice(1)];
  }
  return null;
}

// ─── Blockstate → default variant model ───────────────────────────────────────

// Property values considered "default" when picking a variant for the base state.
// Only used for tie-breaking; texture choice rarely differs between variants.
const DEFAULT_PROPS: Record<string, string> = {
  facing: 'north', half: 'bottom', shape: 'straight', type: 'bottom', axis: 'y',
  open: 'false', powered: 'false', lit: 'false', snowy: 'false', waterlogged: 'false',
  hinge: 'left', part: 'foot', attachment: 'floor', face: 'wall', age: '0',
  stage: '0', level: '0', rotation: '0', leaves: 'none', east: 'none',
  north: 'none', south: 'none', west: 'none', up: 'false', down: 'false',
};

function pickVariantModel(stateFile: string): string | null {
  let state: {
    variants?: Record<string, unknown>;
    multipart?: Array<{ apply: unknown }>;
  };
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return null;
  }

  const modelOf = (entry: unknown): string | null => {
    const v = Array.isArray(entry) ? entry[0] : entry;
    return (v as { model?: string })?.model ?? null;
  };

  if (state.variants) {
    const keys = Object.keys(state.variants);
    if (keys.length === 0) return null;
    let best = keys[0];
    let bestScore = -1;
    for (const key of keys) {
      const props = key === '' ? [] : key.split(',').map((p) => p.split('='));
      const matches = props.every(([k, v]) => DEFAULT_PROPS[k] === undefined || DEFAULT_PROPS[k] === v);
      const score = matches ? props.length + 100 : 0;
      if (score > bestScore) { bestScore = score; best = key; }
    }
    return modelOf(state.variants[best]);
  }
  if (state.multipart?.length) return modelOf(state.multipart[0].apply);
  return null;
}

// ─── Manifest generation ──────────────────────────────────────────────────────

const DIRS = ['up', 'down', 'north', 'south', 'east', 'west'] as const;
type Dir = (typeof DIRS)[number];

interface BlockEntry {
  all?: string;
  top?: string;
  bottom?: string;
  side?: string;
  up?: string; down?: string; north?: string; south?: string; east?: string; west?: string;
  transparent?: boolean;
  opacity?: number;
  tint?: string;
  tintFaces?: Dir[];
}

const transparencyCache = new Map<string, boolean>();

function textureIsTransparent(name: string): boolean {
  const cached = transparencyCache.get(name);
  if (cached !== undefined) return cached;
  let result = false;
  try {
    result = pngHasTransparency(path.join(TEXTURES_DIR, `${name}.png`));
  } catch {
    result = false;
  }
  transparencyCache.set(name, result);
  return result;
}

function buildEntry(block: string, modelRef: string): BlockEntry | null {
  const { textures, elements, forceTranslucent } = resolveModel(modelRef);

  const faces = new Map<Dir, { tex: string; tint: boolean }>();
  // Panes: element faces use the 2px edge strip; the "pane" slot is the full sheet
  if (block.endsWith('_pane') && textures.pane) {
    const tex = resolveTexture(textures.pane, textures);
    if (tex) for (const dir of DIRS) faces.set(dir, { tex, tint: false });
  }
  for (const element of elements ?? []) {
    for (const dir of DIRS) {
      const face = element.faces?.[dir];
      if (!face || faces.has(dir)) continue;
      const tex = resolveTexture(face.texture, textures);
      if (tex) faces.set(dir, { tex, tint: face.tintindex !== undefined });
    }
  }

  // Partial models (crosses, rails, …): fill missing directions from any face,
  // falling back to the particle texture. Rendered as a full cube regardless.
  let fallback = faces.values().next().value;
  if (!fallback && textures.particle) {
    const tex = resolveTexture(textures.particle, textures);
    if (tex) fallback = { tex, tint: false };
  }
  if (!fallback) return null;
  for (const dir of DIRS) if (!faces.has(dir)) faces.set(dir, fallback);

  const entry: BlockEntry = {};
  const tex = (d: Dir) => faces.get(d)!.tex;
  const sidesEqual = tex('north') === tex('south') && tex('north') === tex('east') && tex('north') === tex('west');
  if (sidesEqual && tex('north') === tex('up') && tex('north') === tex('down')) {
    entry.all = tex('north');
  } else if (sidesEqual) {
    entry.side = tex('north');
    entry.top = tex('up');
    entry.bottom = tex('down');
  } else {
    for (const dir of DIRS) entry[dir] = tex(dir);
  }

  const tintFaces = DIRS.filter((d) => faces.get(d)!.tint);
  if (tintFaces.length > 0) {
    entry.tint = tintColorFor(block);
    if (tintFaces.length < DIRS.length) entry.tintFaces = tintFaces;
  }

  const usedTextures = new Set(DIRS.map(tex));
  if (forceTranslucent || [...usedTextures].some(textureIsTransparent)) entry.transparent = true;
  if (FORCE_TRANSPARENT.has(block)) {
    entry.transparent = true;
    entry.opacity = block.includes('water') ? 0.8 : 0.9;
  }

  return entry;
}

// Blocks whose models are entity-rendered in the game; give them sane stand-ins.
const OVERRIDES: Record<string, BlockEntry> = {
  chest: { side: 'oak_planks', top: 'oak_planks', bottom: 'oak_planks' },
  trapped_chest: { side: 'oak_planks', top: 'oak_planks', bottom: 'oak_planks' },
  ender_chest: { all: 'obsidian' },
  water: { all: 'water_still', transparent: true, opacity: 0.8, tint: TINT.water },
  flowing_water: { all: 'water_flow', transparent: true, opacity: 0.8, tint: TINT.water },
  lava: { all: 'lava_still' },
  flowing_lava: { all: 'lava_flow' },
  // legacy alias used by older captures
  water_still: { all: 'water_still', transparent: true, opacity: 0.8, tint: TINT.water },
};

function generateManifest(): Record<string, BlockEntry> {
  const manifest: Record<string, BlockEntry> = {};
  const stateFiles = fs.readdirSync(BLOCKSTATES_DIR).filter((f) => f.endsWith('.json'));
  const skipped: string[] = [];

  for (const file of stateFiles.sort()) {
    const block = path.basename(file, '.json');
    if (block === 'air') continue;
    const modelRef = pickVariantModel(path.join(BLOCKSTATES_DIR, file));
    const entry = modelRef ? buildEntry(block, modelRef) : null;
    if (entry) manifest[block] = entry;
    else skipped.push(block);
  }

  Object.assign(manifest, OVERRIDES);
  console.log(`blocks.json: ${Object.keys(manifest).length} blocks`);
  if (skipped.length > 0) console.log(`  no usable model (render gray): ${skipped.join(', ')}`);
  return manifest;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function copyTextures(): void {
  fs.mkdirSync(OUT_TEXTURES, { recursive: true });
  const files = fs.readdirSync(TEXTURES_DIR).filter((f) => f.endsWith('.png'));
  for (const file of files) {
    fs.copyFileSync(path.join(TEXTURES_DIR, file), path.join(OUT_TEXTURES, file));
  }
  console.log(`textures: copied ${files.length} files → public/textures/block/`);
}

/** The viewer builds real block geometry (stairs, torches, fences, …) from the
 *  vanilla blockstate/model JSONs, fetched on demand from public/assets/. */
function copyModelData(): void {
  const targets = [
    { src: BLOCKSTATES_DIR, dest: path.join(WEB_ROOT, 'public', 'assets', 'blockstates') },
    { src: path.join(MODELS_DIR, 'block'), dest: path.join(WEB_ROOT, 'public', 'assets', 'models', 'block') },
  ];
  for (const { src, dest } of targets) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }
    console.log(`model data: copied ${files.length} files → ${path.relative(WEB_ROOT, dest)}/`);
  }
}

if (!fs.existsSync(BLOCKSTATES_DIR)) {
  console.error(`Resource pack not found at: ${PACK_ROOT}`);
  console.error('Pass --pack <path> or set MC_RESOURCE_PACK.');
  process.exit(1);
}

copyTextures();
copyModelData();
const manifest = generateManifest();
fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest));
console.log(`wrote ${OUT_MANIFEST}`);
