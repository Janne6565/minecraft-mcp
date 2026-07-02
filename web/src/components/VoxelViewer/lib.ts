import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Voxel } from '@/lib/voxelBuilders';
import type { Quad } from './blockModels';
import { resolveBlockQuads, parseStateString } from './blockModels';

export interface SceneHandle {
  dispose: () => void;
}

// ─── Block texture definitions ────────────────────────────────────────────────
// Face order for BoxGeometry: [+x, -x, +y, -y, +z, -z]
//
// Per-block face/tint/transparency data lives in /blocks.json, generated from
// a vanilla resource pack by `bun scripts/sync-assets.ts`.

type Dir = 'up' | 'down' | 'north' | 'south' | 'east' | 'west';

interface BlockDef {
  all?: string;
  side?: string;
  top?: string;
  bottom?: string;
  up?: string; down?: string; north?: string; south?: string; east?: string; west?: string;
  transparent?: boolean;
  opacity?: number;
  /** Baked biome tint color (grass tops, leaves, water are grayscale textures). */
  tint?: string;
  /** Faces the tint applies to; omitted = all faces. */
  tintFaces?: Dir[];
}

let blockDefsPromise: Promise<Record<string, BlockDef>> | null = null;

function loadBlockDefs(): Promise<Record<string, BlockDef>> {
  blockDefsPromise ??= fetch('/blocks.json')
    .then((res) => (res.ok ? (res.json() as Promise<Record<string, BlockDef>>) : {}))
    .catch(() => ({}));
  return blockDefsPromise;
}

function faceTexture(def: BlockDef, dir: Dir): string | undefined {
  if (def.all) return def.all;
  if (def[dir]) return def[dir];
  if (dir === 'up') return def.top ?? def.side;
  if (dir === 'down') return def.bottom ?? def.side;
  return def.side;
}

function faceTint(def: BlockDef, dir: Dir): string | undefined {
  if (!def.tint) return undefined;
  if (def.tintFaces && !def.tintFaces.includes(dir)) return undefined;
  return def.tint;
}

// ─── Texture helpers ──────────────────────────────────────────────────────────

const loader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();

type AlphaClass = 'opaque' | 'cutout' | 'translucent';

/** Scan the first frame's alpha channel: fully opaque, binary (cutout: glass,
 *  torches, crops) or semi-transparent (translucent: stained glass). */
function classifyAlpha(image: HTMLImageElement, frameHeight: number): AlphaClass {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'opaque';
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, image.width, frameHeight).data;
  let cutout = false;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a === 255) continue;
    if (a > 12) return 'translucent';
    cutout = true;
  }
  return cutout ? 'cutout' : 'opaque';
}

async function loadTex(name: string): Promise<THREE.Texture> {
  const cached = texCache.get(name);
  if (cached) return cached;

  const tex = await loader.loadAsync(`/textures/block/${name}.png`);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  // Handle animated texture strips (height > width)
  let frameHeight = tex.image.height;
  if (tex.image.height > tex.image.width) {
    const frames = tex.image.height / tex.image.width;
    frameHeight = tex.image.width;
    tex.repeat.set(1, 1 / frames);
    // THREE.js UV y=1 = top of image (with default flipY=true)
    tex.offset.set(0, (frames - 1) / frames);
  }

  tex.userData.alphaClass = classifyAlpha(tex.image, frameHeight);
  texCache.set(name, tex);
  return tex;
}

// ─── Voxel → quads ────────────────────────────────────────────────────────────

/** Full-cube quads from a blocks.json def — fallback for blocks without model
 *  data (water, chests) and for unknown blocks (tex: null → gray). */
function cubeQuads(def: BlockDef | undefined): Quad[] {
  const faces: Array<{ dir: Dir; corners: number[][] }> = [
    { dir: 'up',    corners: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] },
    { dir: 'down',  corners: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]] },
    { dir: 'north', corners: [[1, 1, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0]] },
    { dir: 'south', corners: [[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]] },
    { dir: 'west',  corners: [[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]] },
    { dir: 'east',  corners: [[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 1]] },
  ];
  const uv = [
    new THREE.Vector2(0, 1), new THREE.Vector2(1, 1),
    new THREE.Vector2(1, 0), new THREE.Vector2(0, 0),
  ] as Quad['uv'];

  return faces.map(({ dir, corners }) => ({
    pos: corners.map(([x, y, z]) => new THREE.Vector3(x, y, z)) as Quad['pos'],
    uv,
    tex: def ? faceTexture(def, dir) ?? null : null,
    tint: def ? faceTint(def, dir) : undefined,
    forceTransparent: def?.transparent,
    opacity: def?.opacity,
  }));
}

/** Quads for one block state: vanilla model data, else blocks.json cube, else gray cube. */
async function quadsForState(stateStr: string): Promise<Quad[]> {
  const modelQuads = await resolveBlockQuads(stateStr);
  if (modelQuads) return modelQuads;
  const defs = await loadBlockDefs();
  const { name } = parseStateString(stateStr);
  return cubeQuads(defs[stateStr] ?? defs[name]);
}

// ─── Scene building ───────────────────────────────────────────────────────────

function centroid(voxels: Voxel[]): THREE.Vector3 {
  if (!voxels.length) return new THREE.Vector3();
  let sx = 0, sy = 0, sz = 0;
  for (const v of voxels) { sx += v.x; sy += v.y; sz += v.z; }
  return new THREE.Vector3(sx / voxels.length, sy / voxels.length, sz / voxels.length);
}

interface MeshGroup {
  readonly meshes: THREE.Mesh[];
  dispose(): void;
}

interface GeoBuilder {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  tex: string | null;
  tint?: string;
  forceTransparent?: boolean;
  opacity?: number;
}

function appendQuad(b: GeoBuilder, quad: Quad, offset: THREE.Vector3): void {
  const base = b.positions.length / 3;
  const normal = new THREE.Vector3()
    .subVectors(quad.pos[3], quad.pos[0])
    .cross(new THREE.Vector3().subVectors(quad.pos[1], quad.pos[0]))
    .normalize();
  for (let i = 0; i < 4; i++) {
    b.positions.push(quad.pos[i].x + offset.x, quad.pos[i].y + offset.y, quad.pos[i].z + offset.z);
    b.normals.push(normal.x, normal.y, normal.z);
    b.uvs.push(quad.uv[i].x, quad.uv[i].y);
  }
  // TL, BL, BR / TL, BR, TR (counter-clockwise from outside)
  b.indices.push(base, base + 3, base + 2, base, base + 2, base + 1);
}

function buildMaterial(b: GeoBuilder, tex: THREE.Texture | null): THREE.MeshLambertMaterial {
  if (!tex) return new THREE.MeshLambertMaterial({ color: 0x888888 });
  const alphaClass: AlphaClass = b.forceTransparent
    ? 'translucent'
    : (tex.userData.alphaClass as AlphaClass) ?? 'opaque';
  return new THREE.MeshLambertMaterial({
    map: tex,
    color: b.tint ? new THREE.Color(b.tint) : 0xffffff,
    transparent: alphaClass === 'translucent',
    opacity: b.opacity ?? 1,
    alphaTest: alphaClass === 'cutout' ? 0.35 : 0,
    side: alphaClass === 'opaque' ? THREE.FrontSide : THREE.DoubleSide,
  });
}

async function buildMeshGroup(voxels: Voxel[]): Promise<MeshGroup> {
  // Group voxels by full block state so each state resolves its model once
  const byState = new Map<string, Voxel[]>();
  for (const v of voxels) {
    const list = byState.get(v.block) ?? [];
    list.push(v);
    byState.set(v.block, list);
  }

  const stateQuads = new Map<string, Quad[]>();
  await Promise.all([...byState.keys()].map(async (state) => {
    try {
      stateQuads.set(state, await quadsForState(state));
    } catch {
      stateQuads.set(state, cubeQuads(undefined));
    }
  }));

  // Merge all faces into one geometry per material (texture + tint + blend mode)
  const builders = new Map<string, GeoBuilder>();
  const offset = new THREE.Vector3();
  for (const [state, svoxels] of byState) {
    for (const v of svoxels) {
      // quads are in 0..1 block space; instanced cubes were centered on the voxel
      offset.set(v.x - 0.5, v.y - 0.5, v.z - 0.5);
      for (const quad of stateQuads.get(state) ?? []) {
        const key = `${quad.tex ?? ''}|${quad.tint ?? ''}|${quad.forceTransparent ?? ''}|${quad.opacity ?? ''}`;
        let b = builders.get(key);
        if (!b) {
          b = {
            positions: [], normals: [], uvs: [], indices: [],
            tex: quad.tex, tint: quad.tint,
            forceTransparent: quad.forceTransparent, opacity: quad.opacity,
          };
          builders.set(key, b);
        }
        appendQuad(b, quad, offset);
      }
    }
  }

  const meshes: THREE.Mesh[] = [];
  await Promise.all([...builders.values()].map(async (b) => {
    let tex: THREE.Texture | null = null;
    if (b.tex) {
      try { tex = await loadTex(b.tex); } catch { tex = null; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uvs, 2));
    geo.setIndex(b.indices);
    const mesh = new THREE.Mesh(geo, buildMaterial(b, tex));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh);
  }));

  return {
    meshes,
    dispose() {
      for (const m of meshes) {
        m.geometry.dispose();
        const mat = m.material as THREE.MeshLambertMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    },
  };
}

// ─── Shared lighting/scene setup ──────────────────────────────────────────────

function makeScene(span: number): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1f2e);
  // Scale fog with build size so large captures aren't fogged out
  scene.fog = new THREE.Fog(0x2a3040, Math.max(40, span * 3), Math.max(120, span * 9));

  scene.add(new THREE.AmbientLight(0x8090a0, 0.6));

  const sun = new THREE.DirectionalLight(0xfff8e0, 1.8);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const s = Math.max(50, span * 2);
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: Math.max(200, span * 8) });
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x4060a0, 0.4);
  fill.position.set(-20, 10, -20);
  scene.add(fill);

  const gridSize = Math.max(80, Math.ceil(span / 20) * 40);
  const grid = new THREE.GridHelper(gridSize, gridSize, 0x2a3548, 0x2a3548);
  grid.position.y = -0.5;
  scene.add(grid);

  return scene;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Render one static frame, return data URL. Fully disposes the WebGL context after. */
export async function renderThumbnail(voxels: Voxel[], width = 536, height = 300): Promise<string> {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;

  const renderer = new THREE.WebGLRenderer({ canvas: offscreen, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;

  const center = centroid(voxels);
  const span = Math.max(10, Math.sqrt(voxels.length) * 0.65);
  const scene = makeScene(span);
  const group = await buildMeshGroup(voxels);
  for (const m of group.meshes) scene.add(m);

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, Math.max(300, span * 12));
  camera.position.set(center.x + span * 0.9, center.y + span * 0.65, center.z + span * 1.1);
  camera.lookAt(center);

  renderer.render(scene, camera);
  const dataUrl = offscreen.toDataURL('image/webp', 0.85);

  group.dispose();
  renderer.dispose();
  return dataUrl;
}

/** Start an interactive scene with OrbitControls. Returns a handle to dispose it. */
export async function initScene(canvas: HTMLCanvasElement, voxels: Voxel[]): Promise<SceneHandle> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(globalThis.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const center = centroid(voxels);
  const span = Math.max(12, Math.sqrt(voxels.length) * 0.8);
  const scene = makeScene(span);
  const group = await buildMeshGroup(voxels);
  for (const m of group.meshes) scene.add(m);

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, Math.max(400, span * 12));
  camera.position.set(center.x + span, center.y + span * 0.7, center.z + span);
  camera.lookAt(center);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(center);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = Math.max(120, span * 3);
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.update();

  // WASD fly-through: moves camera and orbit target together, relative to the
  // camera's heading. Space/Shift move up/down.
  const pressed = new Set<string>();
  const MOVE_KEYS = new Set(['w', 'a', 's', 'd', ' ', 'shift']);
  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (!MOVE_KEYS.has(key)) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    pressed.add(key);
    if (key === ' ') e.preventDefault(); // don't scroll the page
  };
  const onKeyUp = (e: KeyboardEvent) => pressed.delete(e.key.toLowerCase());
  const onBlur = () => pressed.clear();
  globalThis.addEventListener('keydown', onKeyDown);
  globalThis.addEventListener('keyup', onKeyUp);
  globalThis.addEventListener('blur', onBlur);

  const moveSpeed = Math.max(14, span * 0.8); // blocks per second
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const step = new THREE.Vector3();

  const applyMovement = (dt: number) => {
    if (pressed.size === 0) return;
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    step.set(0, 0, 0);
    if (pressed.has('w')) step.add(forward);
    if (pressed.has('s')) step.sub(forward);
    if (pressed.has('d')) step.add(right);
    if (pressed.has('a')) step.sub(right);
    if (pressed.has(' ')) step.y += 1;
    if (pressed.has('shift')) step.y -= 1;
    if (step.lengthSq() === 0) return;

    step.normalize().multiplyScalar(moveSpeed * dt);
    camera.position.add(step);
    controls.target.add(step);
  };

  let raf = 0;
  let lastTime = performance.now();
  const animate = () => {
    raf = requestAnimationFrame(animate);
    const now = performance.now();
    applyMovement(Math.min((now - lastTime) / 1000, 0.1));
    lastTime = now;
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  globalThis.addEventListener('resize', onResize);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      globalThis.removeEventListener('resize', onResize);
      globalThis.removeEventListener('keydown', onKeyDown);
      globalThis.removeEventListener('keyup', onKeyUp);
      globalThis.removeEventListener('blur', onBlur);
      controls.dispose();
      group.dispose();
      renderer.dispose();
    },
  };
}
