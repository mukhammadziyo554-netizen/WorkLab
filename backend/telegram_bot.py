from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class IncomingTelegramMessage:
    chat_id: int
    text: str
    update_id: Optional[int] = None


def parse_telegram_update(update: dict[str, Any]) -> Optional[IncomingTelegramMessage]:
    """Extract a minimal message from a Telegram webhook update payload."""
    message = update.get("message")
    if not isinstance(message, dict):
        return None

    text = message.get("text")
    chat = message.get("chat")
    if not isinstance(text, str) or not isinstance(chat, dict):
        return None

    chat_id = chat.get("id")
    if not isinstance(chat_id, int):
        return None

    update_id = update.get("update_id")
    if not isinstance(update_id, int):
        update_id = None

    return IncomingTelegramMessage(chat_id=chat_id, text=text, update_id=update_id)


def build_send_message_payload(chat_id: int, text: str) -> dict[str, Any]:
    """Generate payload for Telegram sendMessage API."""
    return {
        "method": "sendMessage",
        "chat_id": chat_id,
        "text": text,
    }


def build_set_webhook_request(bot_token: str, webhook_url: str) -> dict[str, str]:
    """Build Telegram webhook configuration request details for later integration."""
    return {
        "url": f"https://api.telegram.org/bot{bot_token}/setWebhook",
        "webhook_url": webhook_url,
    }
