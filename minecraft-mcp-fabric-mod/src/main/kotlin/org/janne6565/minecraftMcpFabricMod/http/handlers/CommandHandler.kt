package org.janne6565.minecraftMcpFabricMod.http.handlers

import com.google.gson.Gson
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import net.minecraft.server.MinecraftServer
import org.janne6565.minecraftMcpFabricMod.http.readBodyAsJson
import org.janne6565.minecraftMcpFabricMod.http.requireMethod
import org.janne6565.minecraftMcpFabricMod.http.sendError
import org.janne6565.minecraftMcpFabricMod.http.sendJson
import java.util.concurrent.CompletableFuture

class CommandHandler(
    private val server: MinecraftServer,
    private val gson: Gson
) : HttpHandler {

    override fun handle(exchange: HttpExchange) {
        if (!exchange.requireMethod("POST", gson)) return

        try {
            val body = exchange.readBodyAsJson()
            val command = body.get("command").asString

            val future = CompletableFuture<Any>()

            server.execute {
                try {
                    val source = server.commandSource
                    server.commandManager.parseAndExecute(source, command)
                    future.complete(mapOf("success" to true))
                } catch (e: Exception) {
                    future.completeExceptionally(e)
                }
            }

            val result = future.get()
            exchange.sendJson(200, result, gson)
        } catch (e: Exception) {
            exchange.sendError(500, "Error executing command: ${e.message}", gson)
        }
    }
}
