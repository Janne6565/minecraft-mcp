import * as THREE from 'three';

// ─── Vanilla block model resolution ──────────────────────────────────────────
// Resolves a block state string (e.g. "oak_stairs{facing=south,half=top}") to
// renderable quads using the vanilla blockstate/model JSONs that
// `bun scripts/sync-assets.ts` copies into public/assets/.

export interface Quad {
  /** 4 corners in block space (0..1), order: TL, TR, BR, BL seen from outside */
  readonly pos: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
  /** UV per corner (three.js convention, v up) */
  readonly uv: [THREE.Vector2, THREE.Vector2, THREE.Vector2, THREE.Vector2];
  /** texture name under /textures/block/, null = untextured gray */
  readonly tex: string | null;
  /** baked biome tint color, if the face is tinted */
  readonly tint?: string;
  /** render overrides for blocks without alpha info in the texture (water) */
  readonly opacity?: number;
  readonly forceTransparent?: boolean;
}

// ─── Tint colors (plains biome) ───────────────────────────────────────────────

export function tintColorFor(block: string): string {
  if (block.includes('water')) return '#3F76E4';
  if (block === 'spruce_leaves') return '#619961';
  if (block === 'birch_leaves') return '#80A755';
  if (block.endsWith('_leaves') || block === 'vine') return '#77AB2F';
  if (block === 'redstone_wire') return '#B00000';
  if (block === 'lily_pad') return '#208030';
  return '#91BD59'; // grass_block, short_grass, fern, sugar_cane, …
}

// ─── Block state parsing ──────────────────────────────────────────────────────

export function parseStateString(raw: string): { name: string; props: Record<string, string> } {
  const bare = raw.replace(/^minecraft:/, '');
  const match = bare.match(/^([^{[]+)[{[](.*)[}\]]$/);
  if (!match) return { name: bare, props: {} };
  const props: Record<string, string> = {};
  for (const pair of match[2].split(',')) {
    const [k, v] = pair.split('=');
    if (k && v) props[k.trim()] = v.trim();
  }
  return { name: match[1], props };
}

// The capture strips default property values, so variant matching needs to know
// them. Values are the accepted defaults per property — some vary by block
// ("half" is "bottom" for stairs but "lower" for doors). Unknown props match
// leniently.
const DEFAULT_PROPS: Record<string, string[]> = {
  facing: ['north'], half: ['bottom', 'lower'], shape: ['straight'], type: ['bottom'],
  axis: ['y'], open: ['false'], powered: ['false'], lit: ['false'], snowy: ['false'],
  waterlogged: ['false'], hinge: ['left'], part: ['foot'], attachment: ['floor'],
  face: ['wall'], hanging: ['false'], age: ['0'], stage: ['0'], level: ['0'],
  rotation: ['0'], moisture: ['0'], distance: ['7'], persistent: ['false'],
  leaves: ['none'], delay: ['1'], locked: ['false'], extended: ['false'],
  triggered: ['false'], occupied: ['false'], inverted: ['false'], in_wall: ['false'],
  signal_fire: ['false'], has_record: ['false'], has_book: ['false'], bottom: ['false'],
  up: ['true'], // walls: a lone pillar has up=true by default
};

// ─── Raw JSON types ───────────────────────────────────────────────────────────

interface VariantRef { model: string; x?: number; y?: number }
interface MultipartCase { when?: Record<string, unknown>; apply: VariantRef | VariantRef[] }
interface RawBlockState {
  variants?: Record<string, VariantRef | VariantRef[]>;
  multipart?: MultipartCase[];
}

interface RawFace { texture: string; uv?: number[]; rotation?: number; tintindex?: number }
interface RawElement {
  from: number[];
  to: number[];
  rotation?: { origin: number[]; axis: 'x' | 'y' | 'z'; angle: number; rescale?: boolean };
  faces?: Record<string, RawFace>;
}
type TextureRef = string | { sprite: string };
interface RawModel {
  parent?: string;
  textures?: Record<string, TextureRef>;
  elements?: RawElement[];
}

// ─── Fetch + cache ────────────────────────────────────────────────────────────

const jsonCache = new Map<string, Promise<unknown | null>>();

function fetchJson<T>(url: string): Promise<T | null> {
  let hit = jsonCache.get(url);
  if (!hit) {
    hit = fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
    jsonCache.set(url, hit);
  }
  return hit as Promise<T | null>;
}

const fetchBlockState = (name: string) => fetchJson<RawBlockState>(`/assets/blockstates/${name}.json`);
const fetchModel = (ref: string) => {
  const name = ref.replace(/^minecraft:/, '');
  return name.startsWith('builtin/') ? Promise.resolve(null) : fetchJson<RawModel>(`/assets/models/${name}.json`);
};

/** Walk the parent chain: merged textures (child wins) + most-derived elements. */
async function resolveModel(ref: string): Promise<{ textures: Record<string, string>; elements: RawElement[] }> {
  const layers: Record<string, TextureRef>[] = [];
  let elements: RawElement[] | undefined;
  let current: string | undefined = ref;
  for (let depth = 0; current && depth < 16; depth++) {
    const model: RawModel | null = await fetchModel(current);
    if (!model) break;
    if (model.textures) layers.push(model.textures);
    elements ??= model.elements;
    current = model.parent;
  }
  const textures: Record<string, string> = {};
  for (const layer of layers.reverse()) {
    for (const [slot, value] of Object.entries(layer)) {
      textures[slot] = typeof value === 'string' ? value : value?.sprite ?? '';
    }
  }
  return { textures, elements: elements ?? [] };
}

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

// ─── Variant / multipart selection ────────────────────────────────────────────

function propMatches(key: string, wanted: string, props: Record<string, string>): boolean {
  const alternatives = wanted.split('|');
  const actual = props[key];
  if (actual !== undefined) return alternatives.includes(actual);
  const fallbacks = DEFAULT_PROPS[key] ?? ['false', 'none'];
  return fallbacks.some((d) => alternatives.includes(d));
}

function selectVariant(variants: Record<string, VariantRef | VariantRef[]>, props: Record<string, string>): VariantRef | null {
  let best: VariantRef | VariantRef[] | null = null;
  let bestScore = -1;
  for (const [key, value] of Object.entries(variants)) {
    const pairs = key === '' ? [] : key.split(',').map((p) => p.split('='));
    let score = 0;
    let ok = true;
    for (const [k, v] of pairs) {
      if (props[k] !== undefined) {
        if (props[k] === v) score += 2;
        else { ok = false; break; }
      } else if (DEFAULT_PROPS[k]?.includes(v)) {
        score += 1; // unspecified prop matching its default
      } else if (DEFAULT_PROPS[k] === undefined) {
        score += 0; // unknown prop: lenient, but prefer variants matching defaults
      } else { ok = false; break; }
    }
    if (ok && score > bestScore) { bestScore = score; best = value; }
  }
  if (best === null) {
    const first = Object.values(variants)[0];
    best = first ?? null;
  }
  return Array.isArray(best) ? best[0] ?? null : best;
}

function matchCondition(when: Record<string, unknown> | undefined, props: Record<string, string>): boolean {
  if (!when) return true;
  if (Array.isArray(when.OR)) return (when.OR as Record<string, unknown>[]).some((c) => matchCondition(c, props));
  if (Array.isArray(when.AND)) return (when.AND as Record<string, unknown>[]).every((c) => matchCondition(c, props));
  return Object.entries(when).every(([k, v]) => propMatches(k, String(v), props));
}

// ─── Geometry building ────────────────────────────────────────────────────────

type Dir = 'up' | 'down' | 'north' | 'south' | 'east' | 'west';

interface FaceLayout {
  corners(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number[][];
  defaultUv(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number[];
}

// Corners ordered TL, TR, BR, BL as seen from outside the face.
// Default UVs follow the vanilla projection rules.
const FACE_LAYOUT: Record<Dir, FaceLayout> = {
  north: {
    corners: (x1, y1, z1, x2, y2) => [[x2, y2, z1], [x1, y2, z1], [x1, y1, z1], [x2, y1, z1]],
    defaultUv: (x1, y1, _z1, x2, y2) => [16 - x2, 16 - y2, 16 - x1, 16 - y1],
  },
  south: {
    corners: (x1, y1, _z1, x2, y2, z2) => [[x1, y2, z2], [x2, y2, z2], [x2, y1, z2], [x1, y1, z2]],
    defaultUv: (x1, y1, _z1, x2, y2) => [x1, 16 - y2, x2, 16 - y1],
  },
  west: {
    corners: (x1, y1, z1, _x2, y2, z2) => [[x1, y2, z1], [x1, y2, z2], [x1, y1, z2], [x1, y1, z1]],
    defaultUv: (_x1, y1, z1, _x2, y2, z2) => [z1, 16 - y2, z2, 16 - y1],
  },
  east: {
    corners: (_x1, y1, z1, x2, y2, z2) => [[x2, y2, z2], [x2, y2, z1], [x2, y1, z1], [x2, y1, z2]],
    defaultUv: (_x1, y1, z1, _x2, y2, z2) => [16 - z2, 16 - y2, 16 - z1, 16 - y1],
  },
  up: {
    corners: (x1, _y1, z1, x2, y2, z2) => [[x1, y2, z1], [x2, y2, z1], [x2, y2, z2], [x1, y2, z2]],
    defaultUv: (x1, _y1, z1, x2, _y2, z2) => [x1, z1, x2, z2],
  },
  down: {
    corners: (x1, y1, z1, x2, _y2, z2) => [[x1, y1, z2], [x2, y1, z2], [x2, y1, z1], [x1, y1, z1]],
    defaultUv: (x1, _y1, z1, x2, _y2, z2) => [x1, 16 - z2, x2, 16 - z1],
  },
};

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

function elementQuads(
  element: RawElement,
  textures: Record<string, string>,
  blockName: string,
): Quad[] {
  const [x1, y1, z1] = element.from;
  const [x2, y2, z2] = element.to;
  const quads: Quad[] = [];

  for (const [dirName, face] of Object.entries(element.faces ?? {})) {
    const layout = FACE_LAYOUT[dirName as Dir];
    if (!layout) continue;
    const tex = resolveTexture(face.texture, textures);
    if (!tex) continue;

    const corners = layout
      .corners(x1, y1, z1, x2, y2, z2)
      .map(([x, y, z]) => new THREE.Vector3(x / 16, y / 16, z / 16));

    // element rotation (e.g. 45° for cross models)
    if (element.rotation) {
      const { origin, axis, angle, rescale } = element.rotation;
      const pivot = new THREE.Vector3(origin[0] / 16, origin[1] / 16, origin[2] / 16);
      const rad = (angle * Math.PI) / 180;
      for (const c of corners) {
        c.sub(pivot).applyAxisAngle(AXES[axis], rad);
        if (rescale) {
          const scale = 1 / Math.cos(rad);
          if (axis !== 'x') c.x *= scale;
          if (axis !== 'y') c.y *= scale;
          if (axis !== 'z') c.z *= scale;
        }
        c.add(pivot);
      }
    }

    // UVs: [u1, v1, u2, v2] in texture pixels, v measured from the top
    const [u1, v1, u2, v2] = face.uv ?? layout.defaultUv(x1, y1, z1, x2, y2, z2);
    let uv: THREE.Vector2[] = [
      new THREE.Vector2(u1 / 16, 1 - v1 / 16), // TL
      new THREE.Vector2(u2 / 16, 1 - v1 / 16), // TR
      new THREE.Vector2(u2 / 16, 1 - v2 / 16), // BR
      new THREE.Vector2(u1 / 16, 1 - v2 / 16), // BL
    ];
    const steps = ((face.rotation ?? 0) / 90) & 3;
    for (let i = 0; i < steps; i++) uv = [uv[3], uv[0], uv[1], uv[2]];

    quads.push({
      pos: corners as Quad['pos'],
      uv: uv as Quad['uv'],
      tex,
      tint: face.tintindex !== undefined ? tintColorFor(blockName) : undefined,
    });
  }
  return quads;
}

/** Rotate quads around the block center per the blockstate variant (x, then y). */
function rotateQuads(quads: Quad[], xDeg: number, yDeg: number): Quad[] {
  if (!xDeg && !yDeg) return quads;
  const center = new THREE.Vector3(0.5, 0.5, 0.5);
  const rotation = new THREE.Quaternion()
    .setFromAxisAngle(AXES.y, (-yDeg * Math.PI) / 180)
    .multiply(new THREE.Quaternion().setFromAxisAngle(AXES.x, (-xDeg * Math.PI) / 180));
  return quads.map((q) => ({
    ...q,
    pos: q.pos.map((c) => c.clone().sub(center).applyQuaternion(rotation).add(center)) as Quad['pos'],
  }));
}

// ─── Coplanar overlay handling ────────────────────────────────────────────────
// Some models stack coplanar faces (grass_block side + tinted overlay). Nudge
// later duplicates outward along their normal to avoid z-fighting.

function offsetCoplanarDuplicates(quads: Quad[]): Quad[] {
  const seen = new Map<string, number>();
  return quads.map((q) => {
    const normal = new THREE.Vector3()
      .subVectors(q.pos[3], q.pos[0])
      .cross(new THREE.Vector3().subVectors(q.pos[1], q.pos[0]))
      .normalize();
    const key = [
      normal.x.toFixed(3), normal.y.toFixed(3), normal.z.toFixed(3),
      q.pos[0].dot(normal).toFixed(3),
    ].join(',');
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return q;
    const shift = normal.multiplyScalar(0.0015 * count);
    return { ...q, pos: q.pos.map((c) => c.clone().add(shift)) as Quad['pos'] };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

const quadCache = new Map<string, Promise<Quad[] | null>>();

/** Resolve a block state string to quads via the vanilla model data.
 *  Returns null if no blockstate/model exists (water, entity blocks, …). */
export function resolveBlockQuads(stateStr: string): Promise<Quad[] | null> {
  let hit = quadCache.get(stateStr);
  if (!hit) {
    hit = buildQuads(stateStr);
    quadCache.set(stateStr, hit);
  }
  return hit;
}

async function buildQuads(stateStr: string): Promise<Quad[] | null> {
  const { name, props } = parseStateString(stateStr);
  const state = await fetchBlockState(name);
  if (!state) return null;

  const refs: VariantRef[] = [];
  if (state.variants) {
    const variant = selectVariant(state.variants, props);
    if (variant) refs.push(variant);
  } else if (state.multipart) {
    for (const part of state.multipart) {
      if (!matchCondition(part.when, props)) continue;
      const apply = Array.isArray(part.apply) ? part.apply[0] : part.apply;
      if (apply) refs.push(apply);
    }
  }
  if (refs.length === 0) return null;

  const quads: Quad[] = [];
  for (const ref of refs) {
    const { textures, elements } = await resolveModel(ref.model);
    const modelQuads = elements.flatMap((el) => elementQuads(el, textures, name));
    quads.push(...rotateQuads(modelQuads, ref.x ?? 0, ref.y ?? 0));
  }
  return quads.length > 0 ? offsetCoplanarDuplicates(quads) : null;
}
