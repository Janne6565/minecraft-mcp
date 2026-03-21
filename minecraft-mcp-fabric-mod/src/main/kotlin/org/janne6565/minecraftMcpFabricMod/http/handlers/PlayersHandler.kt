package org.janne6565.minecraftMcpFabricMod.http.handlers

import com.google.gson.Gson
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import net.minecraft.server.MinecraftServer
import net.minecraft.server.network.ServerPlayerEntity
import org.janne6565.minecraftMcpFabricMod.http.requireMethod
import org.janne6565.minecraftMcpFabricMod.http.sendError
import org.janne6565.minecraftMcpFabricMod.http.sendJson
import java.util.concurrent.CompletableFuture

class PlayersHandler(
    private val server: MinecraftServer,
    private val gson: Gson
) : HttpHandler {

    override fun handle(exchange: HttpExchange) {
        if (!exchange.requireMethod("GET", gson)) return

        try {
            val path = exchange.requestURI.path
            val segments = path.trimEnd('/').split("/")
            // /players or /players/{name}
            val playerName = if (segments.size > 2) segments[2] else null

            val future = CompletableFuture<Any>()

            server.execute {
                try {
                    if (playerName != null) {
                        val player = server.playerManager.getPlayer(playerName)
                        if (player == null) {
                            future.complete(mapOf("error" to "Player not found: $playerName"))
                        } else {
                            future.complete(playerToDetailedMap(player))
                        }
                    } else {
                        val players = server.playerManager.playerList.map { playerToMap(it) }
                        future.complete(mapOf("players" to players))
                    }
                } catch (e: Exception) {
                    future.completeExceptionally(e)
                }
            }

            val result = future.get()
            if (result is Map<*, *> && result["error"] != null) {
                exchange.sendError(404, result["error"].toString(), gson)
            } else {
                exchange.sendJson(200, result, gson)
            }
        } catch (e: Exception) {
            exchange.sendError(500, "Error getting players: ${e.message}", gson)
        }
    }

    private fun playerToMap(player: ServerPlayerEntity): Map<String, Any> {
        return mapOf(
            "name" to player.name.string,
            "position" to mapOf(
                "x" to player.x,
                "y" to player.y,
                "z" to player.z
            ),
            "health" to player.health,
            "hunger" to player.hungerManager.foodLevel,
            "yaw" to player.yaw,
            "pitch" to player.pitch
        )
    }

    private fun playerToDetailedMap(player: ServerPlayerEntity): Map<String, Any> {
        val base = playerToMap(player).toMutableMap()

        val inventory = mutableListOf<Map<String, Any>>()
        for (i in 0 until player.inventory.size()) {
            val stack = player.inventory.getStack(i)
            if (!stack.isEmpty) {
                inventory.add(
                    mapOf(
                        "slot" to i,
                        "item" to stack.item.toString(),
                        "count" to stack.count
                    )
                )
            }
        }
        base["inventory"] = inventory

        return base
    }
}
