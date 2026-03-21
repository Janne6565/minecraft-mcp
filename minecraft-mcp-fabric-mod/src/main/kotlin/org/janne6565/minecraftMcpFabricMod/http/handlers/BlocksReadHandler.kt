package org.janne6565.minecraftMcpFabricMod.http.handlers

import com.google.gson.Gson
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import net.minecraft.server.MinecraftServer
import net.minecraft.util.math.BlockPos
import org.janne6565.minecraftMcpFabricMod.blocks.BlockAreaReader
import org.janne6565.minecraftMcpFabricMod.config.ModConfig
import org.janne6565.minecraftMcpFabricMod.http.readBodyAsJson
import org.janne6565.minecraftMcpFabricMod.http.requireMethod
import org.janne6565.minecraftMcpFabricMod.http.sendError
import org.janne6565.minecraftMcpFabricMod.http.sendJson
import java.util.concurrent.CompletableFuture
import kotlin.math.abs

class BlocksReadHandler(
    private val server: MinecraftServer,
    private val gson: Gson
) : HttpHandler {

    override fun handle(exchange: HttpExchange) {
        if (!exchange.requireMethod("POST", gson)) return

        try {
            val body = exchange.readBodyAsJson()

            val from = body.getAsJsonObject("from")
            val to = body.getAsJsonObject("to")

            val fromPos = BlockPos(from.get("x").asInt, from.get("y").asInt, from.get("z").asInt)
            val toPos = BlockPos(to.get("x").asInt, to.get("y").asInt, to.get("z").asInt)

            // Validate area size
            val volume = (abs(toPos.x - fromPos.x) + 1L) *
                    (abs(toPos.y - fromPos.y) + 1L) *
                    (abs(toPos.z - fromPos.z) + 1L)
            if (volume > ModConfig.MAX_AREA_VOLUME) {
                exchange.sendError(400, "Area too large: $volume blocks (max ${ModConfig.MAX_AREA_VOLUME})", gson)
                return
            }

            val world = server.overworld
            val future = CompletableFuture<Any>()

            server.execute {
                try {
                    val result = BlockAreaReader.read(world, fromPos, toPos)
                    future.complete(result)
                } catch (e: Exception) {
                    future.completeExceptionally(e)
                }
            }

            val result = future.get()
            exchange.sendJson(200, result, gson)
        } catch (e: Exception) {
            exchange.sendError(500, "Error reading blocks: ${e.message}", gson)
        }
    }
}
