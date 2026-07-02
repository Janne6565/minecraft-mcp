import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readBlocks, readBlocksSchema } from "./tools/read-blocks.js";
import { setBlocks, setBlocksSchema } from "./tools/set-blocks.js";
import { getPlayers, getPlayersSchema } from "./tools/get-players.js";
import { getEntities, getEntitiesSchema } from "./tools/get-entities.js";
import {
  sendChat,
  sendChatSchema,
  readChat,
  readChatSchema,
} from "./tools/chat.js";
import { runCommand, runCommandSchema } from "./tools/run-command.js";

const BUILDING_GUIDE = `# Minecraft MCP Building Guide

## Coordinate System
- **X**: East (+) / West (-)
- **Y**: Up (+) / Down (-)
- **Z**: South (+) / North (-)

## Block Grid Format
Both read_blocks and set_blocks use a compact **legend + 3D grid** format to minimize token usage.

### Legend
A mapping of short keys to block IDs:
\`\`\`json
{ "a": "stone", "b": "oak_planks", "c": "oak_stairs{facing=east,half=bottom}" }
\`\`\`
Keys are short strings (a-z, A-Z). Block states go in curly braces after the block ID.

### Grid
A 3D array structured as: \`grid[Y layers][Z rows][X columns]\`
- **Y layers**: Bottom to top (index 0 = lowest Y)
- **Z rows**: North to south (index 0 = smallest Z)
- **X columns**: West to east (index 0 = smallest X)

### Empty String Meaning
- In **read_blocks** response: \`""\` = air block
- In **set_blocks** input: \`""\` = skip (preserve whatever block is already there)

To explicitly place air (clear a block), include \`"air"\` in the legend.

## read_blocks
Reads all blocks in a rectangular volume defined by \`from\` and \`to\` coordinates.
The response auto-generates the legend from discovered block types.

**Example** — reading a 3x2x2 area:
\`\`\`json
Request:  { "from": {"x":0,"y":64,"z":0}, "to": {"x":2,"y":65,"z":1} }
Response: {
  "legend": { "a": "grass_block", "b": "dirt" },
  "grid": [
    [["a","a","a"], ["a","a","a"]],
    [["","",""], ["","",""]]
  ]
}
\`\`\`
This shows: Y=64 is all grass, Y=65 is all air. Each Y layer has 2 Z-rows of 3 X-columns.

## set_blocks
Places blocks starting from the \`from\` coordinate as the anchor (minimum corner).
The grid extends in +X, +Z, +Y directions from that point.

**Example** — building a 3x3x3 hollow cube of stone:
\`\`\`json
{
  "from": {"x":0, "y":64, "z":0},
  "legend": {"s": "stone"},
  "grid": [
    [["s","s","s"], ["s","s","s"], ["s","s","s"]],
    [["s","s","s"], ["s","","s"], ["s","s","s"]],
    [["s","s","s"], ["s","s","s"], ["s","s","s"]]
  ]
}
\`\`\`
Y=64 and Y=66 are solid stone floors/ceilings. Y=65 has hollow interior (empty string = skip).

## Block States
Many blocks have directional or state properties. Include them in curly braces:
- \`oak_stairs{facing=east}\` — stair ascending east
- \`oak_stairs{facing=west,half=top}\` — upside-down stair facing west
- \`oak_door{facing=north,half=lower,open=false}\` — door lower half
- \`oak_door{facing=north,half=upper,open=false}\` — door upper half
- \`furnace{facing=south}\` — furnace facing south
- \`chest{facing=south}\` — chest facing south
- \`oak_log{axis=x}\` — horizontal log along X axis
- \`wall_torch{facing=south}\` — wall torch on south face

Only non-default states need to be specified. If you omit block states, the default state is used.

### Common Stair Facings for Roofs
- West slope (ascending east toward ridge): \`oak_stairs{facing=east}\`
- East slope (ascending west toward ridge): \`oak_stairs{facing=west}\`
- North slope (ascending south): \`oak_stairs{facing=south}\`
- South slope (ascending north): \`oak_stairs{facing=north}\`

## Building Tips
1. **Always read first**: Use read_blocks to survey the area before building. Check terrain, existing structures, and player position.
2. **Use get_players to find positions**: Get the player's coordinates before building near them.
3. **Build in layers**: The grid is Y-layered, so think floor-by-floor: foundation, walls, roof.
4. **Use "" to preserve**: When modifying an existing structure, use empty strings to keep blocks you don't want to change.
5. **Place air explicitly**: To clear blocks, add \`"O": "air"\` to the legend and use "O" in the grid.
6. **Max area**: The server limits reads/writes to 64x64x64 blocks (262,144 volume).
7. **Don't block the player**: After building, check that doorways and paths are clear.
8. **Coordinate math**: The grid size determines the area: grid[0].length = Z depth, grid[0][0].length = X width, grid.length = Y height.

## Common Block IDs
### Building Blocks
stone, cobblestone, stone_bricks, bricks, oak_planks, spruce_planks, birch_planks, dark_oak_planks,
oak_log, spruce_log, birch_log, stripped_oak_log, glass, glass_pane, white_wool, terracotta

### Decoration
torch, lantern, campfire, flower_pot, painting, item_frame, bookshelf, crafting_table, furnace, chest,
oak_fence, spruce_fence, oak_door, spruce_door, oak_trapdoor, ladder, oak_stairs, stone_brick_stairs

### Nature
grass_block, dirt, sand, gravel, water, lava, oak_leaves, spruce_leaves, poppy, dandelion,
cornflower, lily_of_the_valley, sweet_berry_bush

### Redstone
redstone_block, redstone_torch, redstone_lamp, lever, stone_button, repeater, comparator, piston, observer
`;

function createServer(): McpServer {
  const server = new McpServer({
    name: "minecraft-mcp",
    version: "1.0.0",
  });

  // Register the building guide as a resource
  server.resource(
    "building-guide",
    "minecraft://guide/building",
    { mimeType: "text/plain", description: "Comprehensive guide for building in Minecraft via MCP tools. Read this first!" },
    async () => ({
      contents: [{ uri: "minecraft://guide/building", mimeType: "text/plain", text: BUILDING_GUIDE }],
    })
  );

  server.tool(
    "read_blocks",
    `Read blocks in a 3D area. Returns a legend mapping keys to block IDs and a 3D grid [Y layers][Z rows][X cols] using those keys. Empty string = air.

Example response for a 3x2x1 area:
{"legend":{"a":"stone","b":"dirt"},"grid":[[["a","b","a"]],[["","",""]]] }
This means: Y=0 layer has stone/dirt/stone, Y=1 layer is all air.

The from/to coordinates define opposite corners of the volume (order doesn't matter, min/max is computed automatically).`,
    readBlocksSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await readBlocks(params) }],
    })
  );

  server.tool(
    "set_blocks",
    `Place blocks in the world. Provide a "from" coordinate as anchor, a legend mapping keys to block IDs (with optional block states like "oak_stairs{facing=east}"), and a 3D grid [Y layers][Z rows][X cols]. Empty string = skip (preserve existing block).

The grid is placed starting from the "from" coordinate, extending in +X, +Z, +Y directions.
Grid dimensions: grid.length = Y height, grid[0].length = Z depth, grid[0][0].length = X width.

To clear blocks, use "air" in the legend: {"O": "air"} and place "O" in the grid.

Example — place a 3-wide, 2-tall wall of stone:
{ "from": {"x":0,"y":64,"z":0}, "legend": {"s":"stone"}, "grid": [[["s","s","s"]],[["s","s","s"]]] }`,
    setBlocksSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await setBlocks(params) }],
    })
  );

  server.tool(
    "get_players",
    "Get info about players on the server. Returns position (x/y/z), health, hunger, yaw (horizontal look direction), pitch (vertical look direction). Specify a name for detailed info including full inventory with slot numbers and item counts.",
    getPlayersSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await getPlayers(params) }],
    })
  );

  server.tool(
    "get_entities",
    "Get entities within a 3D area defined by from/to coordinates. Returns entity type (e.g. minecraft:zombie), position, UUID, display name, and health (for living entities). Useful for finding mobs, animals, or dropped items near a location.",
    getEntitiesSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await getEntities(params) }],
    })
  );

  server.tool(
    "send_chat",
    "Send a chat message to all players on the server. Message will be prefixed with [Claude]. Use this to communicate with players about what you're building or to respond to their requests.",
    sendChatSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await sendChat(params) }],
    })
  );

  server.tool(
    "read_chat",
    "Read recent chat messages from the server. Returns sender name, message text, and timestamp for each message. Use this to see what players are saying or requesting.",
    readChatSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await readChat(params) }],
    })
  );

  server.tool(
    "run_command",
    `Execute a Minecraft server command (without leading /). The command runs with server-level permissions.
Common commands: 'time set day', 'weather clear', 'give @p diamond 64', 'tp @p 0 64 0', 'gamemode creative @p', 'effect give @p speed 60 2'.
Use @p for nearest player, @a for all players, @r for random player, or a specific player name.`,
    runCommandSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await runCommand(params) }],
    })
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
