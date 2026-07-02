# Blockworks — AI Build Showcase

React + Vite + three.js gallery that displays Minecraft builds captured from a
live world via the minecraft-mcp Fabric mod.

## Capture pipeline

Requires Minecraft running with the mod (HTTP API on `localhost:4711`) and a
player standing near the build. The world must be a flatland world — capture
works by diffing against the flat baseline.

```sh
bun run capture <model>-<effort>     # e.g. bun run capture fable-max
```

The script:

1. Scans the volume around the player (default: radius 48, 12 below / 48 above).
2. Diffs each Y layer against the flatland baseline (the most common block of
   that layer) — everything that differs is part of the build.
3. Crops to the bounding box of those differences, padded by 3 blocks so a
   slab of surrounding ground is included.
4. Writes `public/houses/<model>-<effort>.json` (palette-indexed voxels,
   block states preserved) and prints the stats to paste into
   `src/lib/houseData.ts`.

Options: `--player <name>`, `--radius <n>`, `--pad <n>`, `--y-below <n>`,
`--y-above <n>`, `--host`, `--port`. The script warns when the build touches
the scan boundary (increase `--radius` / `--y-above` and re-run).

To show a new house in the UI, add an entry to `HOUSES` in
`src/lib/houseData.ts` with the same `<model>-<effort>` id.

## Asset pipeline

Block textures and face mappings are generated from a vanilla-format resource
pack:

```sh
bun run sync-assets                  # or: --pack <path> / MC_RESOURCE_PACK
```

This copies into `public/`:

- `textures/block/` — all block textures
- `assets/blockstates/` + `assets/models/block/` — the vanilla model data.
  The viewer builds real block geometry from these at load time
  (`src/components/VoxelViewer/blockModels.ts`): stairs, slabs, torches,
  trapdoors, doors, fences/panes (multipart), crops, flowers — including the
  correct variant for each captured block state (`oak_stairs{facing=south}`).
- `blocks.json` — full-cube fallback manifest for blocks without usable models
  (water, chests, …), with transparency detected from the PNG alpha channel.

Biome-tinted faces (`tintindex` in the models) get a baked plains-biome color —
grass tops, leaves and water are grayscale textures in the pack.

Re-run it after switching resource packs or Minecraft versions. Blocks without
any model or fallback (barrier, light, …) render as gray cubes.

## Dev

```sh
bun install
bun run dev        # vite dev server
bun run build      # tsc + vite build
bun run lint       # oxlint
```
