package org.janne6565.minecraftMcpFabricMod.blocks

import net.minecraft.server.world.ServerWorld
import net.minecraft.util.math.BlockPos
import net.minecraft.block.BlockState
import net.minecraft.registry.Registries
import kotlin.math.min
import kotlin.math.max

data class BlockAreaResult(
    val legend: Map<String, String>,
    val grid: List<List<List<String>>>
)

object BlockAreaReader {

    fun read(world: ServerWorld, from: BlockPos, to: BlockPos): BlockAreaResult {
        val minX = min(from.x, to.x)
        val minY = min(from.y, to.y)
        val minZ = min(from.z, to.z)
        val maxX = max(from.x, to.x)
        val maxY = max(from.y, to.y)
        val maxZ = max(from.z, to.z)

        // Collect all unique block state strings and assign legend keys
        val blockStateToKey = mutableMapOf<String, String>()
        val keyToBlockState = mutableMapOf<String, String>()
        var nextKeyIndex = 0

        // First pass: discover all unique block types
        val pos = BlockPos.Mutable()
        for (y in minY..maxY) {
            for (z in minZ..maxZ) {
                for (x in minX..maxX) {
                    pos.set(x, y, z)
                    val state = world.getBlockState(pos)
                    val stateStr = blockStateToString(state)
                    if (stateStr !in blockStateToKey) {
                        val key = generateKey(nextKeyIndex++)
                        blockStateToKey[stateStr] = key
                        keyToBlockState[key] = stateStr
                    }
                }
            }
        }

        // Find the air key so we can use "" instead
        val airStr = "air"
        val airKey = blockStateToKey[airStr]

        // Second pass: build the 3D grid [Y][Z][X]
        val grid = mutableListOf<List<List<String>>>()
        for (y in minY..maxY) {
            val layer = mutableListOf<List<String>>()
            for (z in minZ..maxZ) {
                val row = mutableListOf<String>()
                for (x in minX..maxX) {
                    pos.set(x, y, z)
                    val state = world.getBlockState(pos)
                    val stateStr = blockStateToString(state)
                    val key = blockStateToKey[stateStr]!!
                    row.add(if (key == airKey) "" else key)
                }
                layer.add(row)
            }
            grid.add(layer)
        }

        // Remove air from legend
        val cleanLegend = keyToBlockState.filterValues { it != airStr }

        return BlockAreaResult(cleanLegend, grid)
    }

    private fun blockStateToString(state: BlockState): String {
        val blockId = Registries.BLOCK.getId(state.block).path
        if (blockId == "air") return "air"

        val properties = state.entries
        if (properties.isEmpty()) return blockId

        // Only include non-default properties
        val defaultState = state.block.defaultState
        val nonDefault = properties.entries
            .filter { (property, value) -> defaultState.get(property) != value }
            .joinToString(",") { (property, value) ->
                "${property.name}=${value.toString().lowercase()}"
            }

        return if (nonDefault.isEmpty()) blockId else "$blockId{$nonDefault}"
    }

    private fun generateKey(index: Int): String {
        // a-z, A-Z, then aa, ab, ...
        return if (index < 26) {
            ('a' + index).toString()
        } else if (index < 52) {
            ('A' + (index - 26)).toString()
        } else {
            val first = 'a' + ((index - 52) / 26)
            val second = 'a' + ((index - 52) % 26)
            "$first$second"
        }
    }
}
