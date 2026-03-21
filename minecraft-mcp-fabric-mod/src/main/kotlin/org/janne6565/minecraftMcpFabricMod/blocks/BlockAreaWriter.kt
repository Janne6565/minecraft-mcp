package org.janne6565.minecraftMcpFabricMod.blocks

import net.minecraft.block.Block
import net.minecraft.block.BlockState
import net.minecraft.registry.Registries
import net.minecraft.server.world.ServerWorld
import net.minecraft.state.property.Property
import net.minecraft.util.Identifier
import net.minecraft.util.math.BlockPos

object BlockAreaWriter {

    data class SetResult(val blocksPlaced: Int)

    fun write(
        world: ServerWorld,
        from: BlockPos,
        legend: Map<String, String>,
        grid: List<List<List<String>>>
    ): SetResult {
        // Parse legend into BlockState map
        val stateMap = legend.mapValues { (_, blockStr) -> parseBlockState(blockStr) }

        var placed = 0
        val pos = BlockPos.Mutable()

        for ((yOffset, layer) in grid.withIndex()) {
            for ((zOffset, row) in layer.withIndex()) {
                for ((xOffset, key) in row.withIndex()) {
                    if (key.isEmpty()) continue // skip empty = preserve existing

                    val state = stateMap[key] ?: continue
                    pos.set(from.x + xOffset, from.y + yOffset, from.z + zOffset)
                    world.setBlockState(pos, state, Block.NOTIFY_ALL)
                    placed++
                }
            }
        }

        return SetResult(placed)
    }

    private fun parseBlockState(blockStr: String): BlockState {
        val braceIndex = blockStr.indexOf('{')
        val blockId: String
        val propsStr: String?

        if (braceIndex >= 0) {
            blockId = blockStr.substring(0, braceIndex)
            propsStr = blockStr.substring(braceIndex + 1, blockStr.length - 1)
        } else {
            blockId = blockStr
            propsStr = null
        }

        val identifier = Identifier.of("minecraft", blockId)
        val block = Registries.BLOCK.get(identifier)
        var state = block.defaultState

        if (propsStr != null && propsStr.isNotEmpty()) {
            val propPairs = propsStr.split(",")
            for (pair in propPairs) {
                val (name, value) = pair.split("=", limit = 2)
                state = applyProperty(state, name.trim(), value.trim())
            }
        }

        return state
    }

    @Suppress("UNCHECKED_CAST")
    private fun applyProperty(state: BlockState, name: String, value: String): BlockState {
        val property = state.properties.find { it.name == name } ?: return state
        val parsed = (property as Property<Comparable<Any>>).parse(value)
        return if (parsed.isPresent) {
            state.with(property, parsed.get())
        } else {
            state
        }
    }
}
