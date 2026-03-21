package org.janne6565.minecraftMcpFabricMod.chat

import org.janne6565.minecraftMcpFabricMod.config.ModConfig

data class ChatMessage(
    val sender: String,
    val message: String,
    val timestamp: Long
)

object ChatHistory {
    private val messages = ArrayDeque<ChatMessage>(ModConfig.MAX_CHAT_HISTORY)

    fun add(sender: String, message: String) {
        if (messages.size >= ModConfig.MAX_CHAT_HISTORY) {
            messages.removeFirst()
        }
        messages.addLast(ChatMessage(sender, message, System.currentTimeMillis()))
    }

    fun getRecent(limit: Int = 50): List<ChatMessage> {
        return messages.takeLast(limit)
    }

    fun clear() {
        messages.clear()
    }
}
