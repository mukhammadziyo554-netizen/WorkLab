from dataclasses import dataclass
from typing import Optional


@dataclass
class AIResponse:
    text: str
    confidence: float = 0.0


def _normalize_language(language: Optional[str]) -> str:
    if language in {"en", "ru", "uz"}:
        return language
    return "en"


def generate_ai_response(message_text: str, language: Optional[str] = None) -> AIResponse:
    """Placeholder AI logic.

    Replace this with your real model or provider call later.
    """
    lang = _normalize_language(language)
    normalized = message_text.strip().lower()

    delivery_keywords = [
        "deliver",
        "delivery",
        "доставка",
        "достав",
        "yetkaz",
        "dostavka",
    ]

    localized_delivery_reply = {
        "en": "Yes. Delivery takes 2-3 days and costs 30,000 UZS.",
        "ru": "Да. Доставка занимает 2-3 дня и стоит 30 000 UZS.",
        "uz": "Ha. Yetkazib berish 2-3 kun davom etadi va narxi 30 000 UZS.",
    }

    localized_default_reply = {
        "en": "Thanks for your message. I am your WorkLab AI employee and I will help you shortly.",
        "ru": "Спасибо за сообщение. Я AI-сотрудник WorkLab и скоро помогу вам.",
        "uz": "Xabaringiz uchun rahmat. Men WorkLab AI xodimiman va tez orada sizga yordam beraman.",
    }

    if any(keyword in normalized for keyword in delivery_keywords):
        return AIResponse(
            text=localized_delivery_reply[lang],
            confidence=0.72,
        )

    return AIResponse(
        text=localized_default_reply[lang],
        confidence=0.45,
    )
