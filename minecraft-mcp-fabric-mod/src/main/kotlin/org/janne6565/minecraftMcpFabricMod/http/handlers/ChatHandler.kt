package org.janne6565.minecraftMcpFabricMod.http.handlers

import com.google.gson.Gson
import com.sun.net.httpserver.HttpExchange
import net.minecraft.server.MinecraftServer
import net.minecraft.text.Text
import org.janne6565.minecraftMcpFabricMod.chat.ChatHistory
import org.janne6565.minecraftMcpFabricMod.http.readBodyAsJson
import org.janne6565.minecraftMcpFabricMod.http.requireMethod
import org.janne6565.minecraftMcpFabricMod.http.sendError
import org.janne6565.minecraftMcpFabricMod.http.sendJson

class ChatHandler(
    private val server: MinecraftServer,
    private val gson: Gson
) {

    fun handleSend(exchange: HttpExchange) {
        if (!exchange.requireMethod("POST", gson)) return

        try {
            val body = exchange.readBodyAsJson()
            val message = body.get("message").asString

            server.execute {
                server.playerManager.broadcast(
                    Text.of("[Claude] $message"),
                    false
                )
            }

            exchange.sendJson(200, mapOf("success" to true), gson)
        } catch (e: Exception) {
            exchange.sendError(500, "Error sending chat: ${e.message}", gson)
        }
    }

    fun handleHistory(exchange: HttpExchange) {
        if (!exchange.requireMethod("GET", gson)) return

        try {
            val params = exchange.requestURI.query?.split("&")?.associate {
                val (k, v) = it.split("=", limit = 2)
                k to v
            } ?: emptyMap()

            val limit = params["limit"]?.toIntOrNull() ?: 50
            val messages = ChatHistory.getRecent(limit)

            exchange.sendJson(200, mapOf("messages" to messages), gson)
        } catch (e: Exception) {
            exchange.sendError(500, "Error getting chat history: ${e.message}", gson)
        }
    }
}
