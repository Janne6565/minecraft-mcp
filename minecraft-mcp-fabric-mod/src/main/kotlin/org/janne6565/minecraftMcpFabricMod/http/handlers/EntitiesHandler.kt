package org.janne6565.minecraftMcpFabricMod.http.handlers

import com.google.gson.Gson
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import net.minecraft.entity.LivingEntity
import net.minecraft.registry.Registries
import net.minecraft.server.MinecraftServer
import net.minecraft.util.math.BlockPos
import net.minecraft.util.math.Box
import org.janne6565.minecraftMcpFabricMod.http.readBodyAsJson
import org.janne6565.minecraftMcpFabricMod.http.requireMethod
import org.janne6565.minecraftMcpFabricMod.http.sendError
import org.janne6565.minecraftMcpFabricMod.http.sendJson
import java.util.concurrent.CompletableFuture
import kotlin.math.max
import kotlin.math.min

class EntitiesHandler(
    private val server: MinecraftServer,
    private val gson: Gson
) : HttpHandler {

    override fun handle(exchange: HttpExchange) {
        if (!exchange.requireMethod("POST", gson)) return

        try {
            val body = exchange.readBodyAsJson()

            val from = body.getAsJsonObject("from")
            val to = body.getAsJsonObject("to")

            val minX = min(from.get("x").asDouble, to.get("x").asDouble)
            val minY = min(from.get("y").asDouble, to.get("y").asDouble)
            val minZ = min(from.get("z").asDouble, to.get("z").asDouble)
            val maxX = max(from.get("x").asDouble, to.get("x").asDouble) + 1.0
            val maxY = max(from.get("y").asDouble, to.get("y").asDouble) + 1.0
            val maxZ = max(from.get("z").asDouble, to.get("z").asDouble) + 1.0

            val box = Box(minX, minY, minZ, maxX, maxY, maxZ)
            val world = server.overworld

            val future = CompletableFuture<Any>()

            server.execute {
                try {
                    val entities = world.getOtherEntities(null, box).map { entity ->
                        val map = mutableMapOf<String, Any>(
                            "type" to Registries.ENTITY_TYPE.getId(entity.type).toString(),
                            "position" to mapOf(
                                "x" to entity.x,
                                "y" to entity.y,
                                "z" to entity.z
                            ),
                            "uuid" to entity.uuidAsString
                        )
                        if (entity is LivingEntity) {
                            map["health"] = entity.health
                        }
                        map["name"] = entity.name.string
                        map
                    }
                    future.complete(mapOf("entities" to entities))
                } catch (e: Exception) {
                    future.completeExceptionally(e)
                }
            }

            val result = future.get()
            exchange.sendJson(200, result, gson)
        } catch (e: Exception) {
            exchange.sendError(500, "Error getting entities: ${e.message}", gson)
        }
    }
}
