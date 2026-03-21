package org.janne6565.minecraftMcpFabricMod

import net.fabricmc.api.ModInitializer
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents
import net.fabricmc.fabric.api.message.v1.ServerMessageEvents
import org.janne6565.minecraftMcpFabricMod.chat.ChatHistory
import org.janne6565.minecraftMcpFabricMod.http.HttpApiServer
import org.slf4j.LoggerFactory

class MinecraftMcpFabricMod : ModInitializer {
    private val logger = LoggerFactory.getLogger("minecraft-mcp")
    private var httpServer: HttpApiServer? = null

    override fun onInitialize() {
        logger.info("Minecraft MCP Fabric Mod initializing...")

        ServerLifecycleEvents.SERVER_STARTED.register { server ->
            httpServer = HttpApiServer(server).also { it.start() }
        }

        ServerLifecycleEvents.SERVER_STOPPING.register {
            httpServer?.stop()
            httpServer = null
            ChatHistory.clear()
        }

        ServerMessageEvents.CHAT_MESSAGE.register { message, sender, _ ->
            ChatHistory.add(sender.name.string, message.content.string)
        }
    }
}
