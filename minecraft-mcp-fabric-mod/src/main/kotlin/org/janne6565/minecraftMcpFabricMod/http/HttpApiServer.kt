package org.janne6565.minecraftMcpFabricMod.http

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import com.sun.net.httpserver.HttpServer
import net.minecraft.server.MinecraftServer
import org.janne6565.minecraftMcpFabricMod.config.ModConfig
import org.janne6565.minecraftMcpFabricMod.http.handlers.*
import org.janne6565.minecraftMcpFabricMod.chat.ChatHistory
import org.slf4j.LoggerFactory
import java.net.InetSocketAddress
import java.util.concurrent.Executors

class HttpApiServer(private val server: MinecraftServer) {
    private val logger = LoggerFactory.getLogger("minecraft-mcp")
    private val gson = Gson()
    private var httpServer: HttpServer? = null

    fun start() {
        val httpServer = HttpServer.create(InetSocketAddress(ModConfig.HTTP_PORT), 0)
        httpServer.executor = Executors.newFixedThreadPool(4)

        val blocksReadHandler = BlocksReadHandler(server, gson)
        val blocksSetHandler = BlocksSetHandler(server, gson)
        val playersHandler = PlayersHandler(server, gson)
        val entitiesHandler = EntitiesHandler(server, gson)
        val chatHandler = ChatHandler(server, gson)
        val commandHandler = CommandHandler(server, gson)

        httpServer.createContext("/blocks/read", blocksReadHandler)
        httpServer.createContext("/blocks/set", blocksSetHandler)
        httpServer.createContext("/players", playersHandler)
        httpServer.createContext("/entities", entitiesHandler)
        httpServer.createContext("/chat/send", chatHandler::handleSend)
        httpServer.createContext("/chat/history", chatHandler::handleHistory)
        httpServer.createContext("/command", commandHandler)

        httpServer.start()
        this.httpServer = httpServer
        logger.info("MCP HTTP API started on port ${ModConfig.HTTP_PORT}")
    }

    fun stop() {
        httpServer?.stop(0)
        logger.info("MCP HTTP API stopped")
    }
}

fun HttpExchange.readBodyAsJson(): JsonObject {
    return requestBody.bufferedReader().use { reader ->
        JsonParser.parseReader(reader).asJsonObject
    }
}

fun HttpExchange.sendJson(statusCode: Int, data: Any, gson: Gson) {
    val json = gson.toJson(data)
    val bytes = json.toByteArray(Charsets.UTF_8)
    responseHeaders.set("Content-Type", "application/json; charset=utf-8")
    sendResponseHeaders(statusCode, bytes.size.toLong())
    responseBody.use { it.write(bytes) }
}

fun HttpExchange.sendError(statusCode: Int, message: String, gson: Gson) {
    sendJson(statusCode, mapOf("error" to message), gson)
}

fun HttpExchange.requireMethod(method: String, gson: Gson): Boolean {
    if (requestMethod.uppercase() != method.uppercase()) {
        sendError(405, "Method not allowed, expected $method", gson)
        return false
    }
    return true
}
