package org.janne6565.minecraftMcpFabricMod.http.handlers

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import net.minecraft.server.MinecraftServer
import net.minecraft.util.math.BlockPos
import org.janne6565.minecraftMcpFabricMod.blocks.BlockAreaWriter
import org.janne6565.minecraftMcpFabricMod.http.readBodyAsJson
import org.janne6565.minecraftMcpFabricMod.http.requireMethod
import org.janne6565.minecraftMcpFabricMod.http.sendError
import org.janne6565.minecraftMcpFabricMod.http.sendJson
import java.util.concurrent.CompletableFuture

class BlocksSetHandler(
    private val server: MinecraftServer,
    private val gson: Gson
) : HttpHandler {

    override fun handle(exchange: HttpExchange) {
        if (!exchange.requireMethod("POST", gson)) return

        try {
            val body = exchange.readBodyAsJson()

            val from = body.getAsJsonObject("from")
            val fromPos = BlockPos(from.get("x").asInt, from.get("y").asInt, from.get("z").asInt)

            val legendType = object : TypeToken<Map<String, String>>() {}.type
            val legend: Map<String, String> = gson.fromJson(body.get("legend"), legendType)

            val gridType = object : TypeToken<List<List<List<String>>>>() {}.type
            val grid: List<List<List<String>>> = gson.fromJson(body.get("grid"), gridType)

            val world = server.overworld
            val future = CompletableFuture<Any>()

            server.execute {
                try {
                    val result = BlockAreaWriter.write(world, fromPos, legend, grid)
                    future.complete(mapOf("success" to true, "blocksPlaced" to result.blocksPlaced))
                } catch (e: Exception) {
                    future.completeExceptionally(e)
                }
            }

            val result = future.get()
            exchange.sendJson(200, result, gson)
        } catch (e: Exception) {
            exchange.sendError(500, "Error setting blocks: ${e.message}", gson)
        }
    }
}
