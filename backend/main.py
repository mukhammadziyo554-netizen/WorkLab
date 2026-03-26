import hashlib
import hmac
import json
import os
import sqlite3
import secrets
import time
import uuid
from difflib import SequenceMatcher
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import parse_qsl

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    import stripe
except ImportError:
    stripe = None

try:
    from .ai_agent import generate_ai_response
    from .database import DB_PATH, init_database
    from .telegram_bot import (
        build_send_message_payload,
        build_set_webhook_request,
        parse_telegram_update,
    )
except ImportError:
    from ai_agent import generate_ai_response
    from database import DB_PATH, init_database
    from telegram_bot import (
        build_send_message_payload,
        build_set_webhook_request,
        parse_telegram_update,
    )

app = FastAPI(
    title="WorkLab Backend API",
    description="Backend service for AI processing and Telegram communication.",
    version="0.1.0",
)

init_database()

ADMIN_EMAIL = "mukhammadziyo554@gmail.com"

SUBSCRIPTION_PLANS: dict[str, dict[str, Any]] = {
    "starter": {
        "name": "Starter",
        "price_usd": 19,
        "ai_employees": 1,
        "telegram_bots": 1,
        "analytics": "basic",
    },
    "pro": {
        "name": "Pro",
        "price_usd": 49,
        "ai_employees": 5,
        "telegram_bots": -1,
        "analytics": "advanced",
    },
    "business": {
        "name": "Business",
        "price_usd": 99,
        "ai_employees": -1,
        "telegram_bots": -1,
        "analytics": "full",
    },
}

def _build_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
    if configured:
        origins = [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]
        if origins:
            return origins

    single = os.getenv("CORS_ORIGIN", "").strip()
    if single:
        return [single.rstrip("/")]

    public_frontend_url = os.getenv("WORKLAB_WEBAPP_URL", "").strip().rstrip("/")
    if public_frontend_url:
        return [public_frontend_url]

    # In development allow localhost (useful when running frontend locally)
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


cors_origins = _build_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TelegramWebhookConfigRequest(BaseModel):
    bot_token: str = Field(..., min_length=10)
    webhook_url: str = Field(..., min_length=8)


class TelegramAuthRequest(BaseModel):
    init_data: Optional[str] = Field(default=None, min_length=10)
    user: Optional[dict[str, Any]] = None


class SignupRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=255)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=255)


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: Optional[str] = Field(default=None, max_length=255)
    language: Optional[str] = Field(default="en", pattern="^(en|ru|uz)$")


class AIConversationListQuery(BaseModel):
    limit: int = Field(default=30, ge=1, le=100)


class AIConversationMessagesQuery(BaseModel):
    limit: int = Field(default=30, ge=1, le=100)
    before_id: Optional[int] = Field(default=None, ge=1)


class AIConversationUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)


class KnowledgeBaseRequest(BaseModel):
    business_description: str = ""
    products_services: str = ""
    delivery_rules: str = ""
    working_hours: str = ""
    pricing_information: str = ""
    faq: str = ""


class AIEmployeeCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., min_length=2, max_length=60)
    language: str = Field(default="en", pattern="^(en|ru|uz)$")
    tone: str = Field(default="friendly", min_length=2, max_length=40)
    knowledge_base_reference: Optional[str] = Field(default=None, max_length=255)
    communication_style: Optional[str] = Field(default="Professional", max_length=40)
    response_length: Optional[str] = Field(default="Medium", max_length=40)
    response_tone: Optional[str] = Field(default="Balanced", max_length=40)
    response_speed_priority: Optional[str] = Field(default="Balanced", max_length=40)
    context_memory_depth: Optional[int] = Field(default=10, ge=3, le=50)


class TakeoverRequest(BaseModel):
    active: bool = True


class HumanReplyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)


class CorrectionRequest(BaseModel):
    corrected_answer: str = Field(..., min_length=1, max_length=5000)


class AIResponseFeedbackRequest(BaseModel):
    message_id: Optional[int] = Field(default=None, ge=1)
    feedback_type: str = Field(..., pattern="^(correct|needs_improvement|incorrect)$")
    suggested_answer: Optional[str] = Field(default=None, max_length=5000)


class FAQSuggestionDecisionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=300)
    answer: str = Field(..., min_length=3, max_length=1000)
    approved: bool


class BillingCheckoutRequest(BaseModel):
    plan: str = Field(..., pattern="^(starter|pro|business)$")
    card_number: str = Field(..., min_length=12, max_length=30)
    cardholder_name: str = Field(..., min_length=2, max_length=120)
    expiry_date: str = Field(..., min_length=4, max_length=7)
    cvv: str = Field(..., min_length=3, max_length=4)
    country: Optional[str] = Field(default=None, max_length=80)
    billing_email: Optional[str] = Field(default=None, max_length=255)


class BillingConfirmRequest(BaseModel):
    session_id: str = Field(..., min_length=6, max_length=255)


class UpdatePaymentMethodRequest(BaseModel):
    payment_method_brand: str = Field(..., min_length=2, max_length=40)
    payment_method_last4: str = Field(..., min_length=4, max_length=4)


class FeatureToggleRequest(BaseModel):
    enabled: bool


def _get_authenticated_actor(authorization: Optional[str]) -> tuple[str, int]:
    token = _extract_bearer_token(authorization)
    session_data = _find_session_user(token)
    auth_type = str(session_data.get("auth_type"))
    user = session_data.get("user", {})
    user_id = user.get("id")

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid session token")

    if auth_type not in {"web", "telegram"}:
        raise HTTPException(status_code=401, detail="Unsupported auth type")

    return auth_type, int(user_id)


def _truncate_title(message: str) -> str:
    cleaned = " ".join(message.strip().split())
    prefixes = (
        "hi",
        "hello",
        "hey",
        "assalomu alaykum",
        "salom",
        "добрый день",
        "привет",
    )

    lowered = cleaned.lower()
    for prefix in prefixes:
        if lowered.startswith(prefix):
            return "New customer inquiry"

    if len(cleaned) <= 56:
        return cleaned
    return f"{cleaned[:53]}..."


def _ensure_operations_seed(owner_type: str, owner_id: int) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COUNT(*) FROM monitored_conversations
            WHERE owner_type = ? AND owner_id = ?
            """,
            (owner_type, owner_id),
        )
        existing_count = int(cursor.fetchone()[0])
        if existing_count > 0:
            return

        now = time.strftime("%Y-%m-%d %H:%M:%S")
        conversation_id = f"ops_{uuid.uuid4().hex[:12]}"
        cursor.execute(
            """
            INSERT INTO monitored_conversations (
                id, owner_type, owner_id, customer_handle, customer_name,
                last_message, last_timestamp, unread_count, taken_over
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                conversation_id,
                owner_type,
                owner_id,
                "@john_doe",
                "John Doe",
                "Do you deliver to Samarkand?",
                now,
                1,
                0,
            ),
        )
        cursor.execute(
            """
            INSERT INTO monitored_messages (conversation_id, sender_type, content, confidence)
            VALUES (?, 'customer', ?, NULL)
            """,
            (conversation_id, "Do you deliver to Samarkand?"),
        )
        cursor.execute(
            """
            INSERT INTO monitored_messages (conversation_id, sender_type, content, confidence)
            VALUES (?, 'ai', ?, ?)
            """,
            (conversation_id, "Yes, delivery takes 2-3 days and costs 30,000 UZS.", 0.82),
        )

        conn.commit()


def _find_best_correction(
    owner_type: str,
    owner_id: int,
    message_text: str,
) -> Optional[str]:
    normalized = message_text.strip().lower()
    if not normalized:
        return None

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT question, corrected_answer
            FROM ai_corrections
            WHERE owner_type = ? AND owner_id = ?
            ORDER BY id DESC
            LIMIT 100
            """,
            (owner_type, owner_id),
        )
        rows = cursor.fetchall()

    best_answer: Optional[str] = None
    best_score = 0.0
    for question, corrected_answer in rows:
        score = SequenceMatcher(None, normalized, str(question).lower()).ratio()
        if score > best_score:
            best_score = score
            best_answer = str(corrected_answer)

    if best_score >= 0.62:
        return best_answer
    return None


def _build_knowledge_base_hint(owner_type: str, owner_id: int) -> Optional[str]:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT delivery_rules, pricing_information, faq
            FROM knowledge_base_entries
            WHERE owner_type = ? AND owner_id = ?
            """,
            (owner_type, owner_id),
        )
        row = cursor.fetchone()

    if not row:
        return None

    delivery_rules = (row[0] or "").strip()
    pricing_information = (row[1] or "").strip()
    faq = (row[2] or "").strip()
    combined = " ".join(part for part in [delivery_rules, pricing_information, faq] if part)
    return combined or None


def _estimate_sentiment_label(text: str) -> str:
    normalized = text.strip().lower()
    if not normalized:
        return "neutral"

    negative_markers = [
        "third time",
        "still waiting",
        "angry",
        "bad",
        "terrible",
        "refund now",
        "not working",
        "again",
        "can't",
        "cannot",
        "problem",
        "issue",
        "yomon",
        "muammo",
        "плохо",
        "проблем",
    ]
    positive_markers = [
        "thanks",
        "great",
        "perfect",
        "awesome",
        "good",
        "rahmat",
        "zor",
        "спасибо",
        "отлично",
    ]

    if any(marker in normalized for marker in negative_markers):
        return "negative"
    if any(marker in normalized for marker in positive_markers):
        return "positive"
    return "neutral"


def _build_knowledge_insights(owner_type: str, owner_id: int) -> dict[str, Any]:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT business_description, products_services, delivery_rules, working_hours, pricing_information, faq
            FROM knowledge_base_entries
            WHERE owner_type = ? AND owner_id = ?
            """,
            (owner_type, owner_id),
        )
        row = cursor.fetchone()

        if not row:
            return {
                "summary": "No knowledge base content yet.",
                "key_topics": [],
                "suggested_faqs": [],
                "coverage_score": 0,
            }

        fields = [str(value or "").strip() for value in row]
        full_text = " ".join([value for value in fields if value]).strip()

        summary = full_text[:220] + ("..." if len(full_text) > 220 else "") if full_text else "No summary available."

        topic_candidates = {
            "delivery": ["delivery", "yetkaz", "достав"],
            "pricing": ["price", "pricing", "cost", "narx", "цена"],
            "working_hours": ["hour", "working", "open", "ish vaqti", "время"],
            "products": ["product", "service", "товар", "xizmat"],
            "refunds": ["refund", "return", "возврат", "qaytar"],
        }
        key_topics: list[str] = []
        lowered_text = full_text.lower()
        for topic, markers in topic_candidates.items():
            if any(marker in lowered_text for marker in markers):
                key_topics.append(topic.replace("_", " ").title())

        suggested_faqs: list[dict[str, str]] = []
        if "delivery" in lowered_text or "yetkaz" in lowered_text or "достав" in lowered_text:
            suggested_faqs.append(
                {
                    "question": "What is the delivery time?",
                    "answer": "Delivery timelines are defined in your delivery rules section.",
                }
            )
        if "price" in lowered_text or "cost" in lowered_text or "narx" in lowered_text:
            suggested_faqs.append(
                {
                    "question": "How much does it cost?",
                    "answer": "Pricing details are available in your pricing information section.",
                }
            )
        if "refund" in lowered_text or "return" in lowered_text or "возврат" in lowered_text:
            suggested_faqs.append(
                {
                    "question": "Can I request a refund?",
                    "answer": "Refund policy can be confirmed from your support team guidelines.",
                }
            )

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ? AND mm.sender_type = 'customer'
            """,
            (owner_type, owner_id),
        )
        customer_messages = int(cursor.fetchone()[0] or 0)

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ? AND mm.sender_type = 'ai' AND COALESCE(mm.confidence, 0) >= 0.65
            """,
            (owner_type, owner_id),
        )
        strong_ai_answers = int(cursor.fetchone()[0] or 0)

    if customer_messages == 0:
        coverage_score = 78 if full_text else 0
    else:
        coverage_score = int(min(99, max(0, (strong_ai_answers / customer_messages) * 100)))

    return {
        "summary": summary,
        "key_topics": key_topics,
        "suggested_faqs": suggested_faqs,
        "coverage_score": coverage_score,
    }


def _assess_conversation_metrics(messages: list[dict[str, Any]]) -> dict[str, Any]:
    negative_count = 0
    repeat_like_count = 0
    low_confidence_count = 0
    ai_count = 0
    customer_count = 0

    seen_customer_messages: set[str] = set()

    for message in messages:
        sender = str(message.get("sender_type", ""))
        content = str(message.get("content", ""))
        confidence = message.get("confidence")

        if sender == "customer":
            customer_count += 1
            sentiment = _estimate_sentiment_label(content)
            if sentiment == "negative":
                negative_count += 1

            normalized_content = content.strip().lower()
            if normalized_content in seen_customer_messages:
                repeat_like_count += 1
            elif normalized_content:
                seen_customer_messages.add(normalized_content)

            if any(marker in normalized_content for marker in ["again", "third time", "still", "not solved", "still waiting"]):
                repeat_like_count += 1

        if sender == "ai":
            ai_count += 1
            if confidence is not None and float(confidence) < 0.6:
                low_confidence_count += 1

    risk_score = negative_count * 2 + repeat_like_count * 2 + low_confidence_count
    if risk_score >= 5:
        escalation_risk = "High"
    elif risk_score >= 2:
        escalation_risk = "Medium"
    else:
        escalation_risk = "Low"

    satisfaction = 4.8 - (negative_count * 0.4) - (repeat_like_count * 0.3) - (low_confidence_count * 0.2)
    satisfaction = max(1.0, min(5.0, round(satisfaction, 1)))

    if ai_count == 0:
        resolution_quality = 0
    else:
        strong_ai = max(0, ai_count - low_confidence_count)
        resolution_quality = int((strong_ai / ai_count) * 100)

    return {
        "estimated_satisfaction_score": satisfaction,
        "resolution_quality_score": resolution_quality,
        "escalation_risk": escalation_risk,
        "takeover_recommended": escalation_risk == "High",
        "negative_messages": negative_count,
        "repeat_questions": repeat_like_count,
        "low_confidence_count": low_confidence_count,
        "customer_messages": customer_count,
    }


def _pick_ai_employee(owner_type: str, owner_id: int, message_text: str) -> dict[str, Any]:
    normalized = message_text.strip().lower()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, name, role,
                   COALESCE(response_length, 'Medium') AS response_length,
                   COALESCE(response_speed_priority, 'Balanced') AS response_speed_priority,
                   COALESCE(context_memory_depth, 10) AS context_memory_depth
            FROM ai_employee_configs
            WHERE owner_type = ? AND owner_id = ? AND is_active = 1
            ORDER BY id ASC
            """,
            (owner_type, owner_id),
        )
        rows = cursor.fetchall()

    if not rows:
        return {
            "id": None,
            "name": "Default AI",
            "role": "Customer Support Agent",
            "response_length": "Medium",
            "response_speed_priority": "Balanced",
            "context_memory_depth": 10,
        }

    keyword_map = {
        "Sales": ["buy", "price", "discount", "sale", "offer", "narx"],
        "Technical": ["error", "bug", "not working", "issue", "problem", "api"],
        "Support": ["delivery", "refund", "status", "order", "help", "support"],
        "FAQ": ["faq", "hours", "location", "contact"],
    }

    for row in rows:
        role = str(row["role"])
        for role_key, keywords in keyword_map.items():
            if role_key.lower() in role.lower() and any(keyword in normalized for keyword in keywords):
                return {
                    "id": int(row["id"]),
                    "name": str(row["name"]),
                    "role": role,
                    "response_length": str(row["response_length"]),
                    "response_speed_priority": str(row["response_speed_priority"]),
                    "context_memory_depth": int(row["context_memory_depth"]),
                }

    row = rows[0]
    return {
        "id": int(row["id"]),
        "name": str(row["name"]),
        "role": str(row["role"]),
        "response_length": str(row["response_length"]),
        "response_speed_priority": str(row["response_speed_priority"]),
        "context_memory_depth": int(row["context_memory_depth"]),
    }


def _shape_response_text(text: str, response_length: str, response_speed_priority: str) -> str:
    normalized_length = response_length.strip().lower()
    normalized_speed = response_speed_priority.strip().lower()
    cleaned = " ".join(text.split())

    sentences = [sentence.strip() for sentence in cleaned.replace("\n", " ").split(".") if sentence.strip()]

    if normalized_length.startswith("short"):
        cleaned = ". ".join(sentences[:2]).strip()
        if cleaned and not cleaned.endswith("."):
            cleaned += "."
    elif normalized_length.startswith("medium") and len(sentences) > 4:
        cleaned = ". ".join(sentences[:4]).strip()
        if cleaned and not cleaned.endswith("."):
            cleaned += "."

    if normalized_speed.startswith("fast"):
        cleaned = cleaned.replace("Please let me know if you need anything else.", "")
    elif normalized_speed.startswith("more thoughtful"):
        cleaned = f"{cleaned} If you want, I can provide a more detailed step-by-step explanation."

    return cleaned.strip() or text


def _build_notifications(owner_type: str, owner_id: int) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT mm.conversation_id, mm.content, mm.confidence, mm.created_at
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ? AND mm.sender_type = 'ai' AND COALESCE(mm.confidence, 0) < 0.6
            ORDER BY mm.id DESC
            LIMIT 5
            """,
            (owner_type, owner_id),
        )
        for row in cursor.fetchall():
            alerts.append(
                {
                    "type": "low_confidence",
                    "severity": "medium",
                    "conversation_id": str(row["conversation_id"]),
                    "message": f"AI confidence dropped to {int(float(row['confidence']) * 100)}%. Consider review.",
                    "created_at": str(row["created_at"]),
                }
            )

        cursor.execute(
            """
            SELECT id, last_message, last_timestamp
            FROM monitored_conversations
            WHERE owner_type = ? AND owner_id = ? AND unread_count > 0 AND taken_over = 0
            ORDER BY updated_at DESC
            LIMIT 5
            """,
            (owner_type, owner_id),
        )
        for row in cursor.fetchall():
            content = str(row["last_message"] or "")
            if content and _estimate_sentiment_label(content) == "negative":
                alerts.append(
                    {
                        "type": "high_escalation_risk",
                        "severity": "high",
                        "conversation_id": str(row["id"]),
                        "message": "Negative sentiment detected. Human support recommended.",
                        "created_at": str(row["last_timestamp"]),
                    }
                )

        insights = _build_knowledge_insights(owner_type, owner_id)
        if int(insights["coverage_score"]) < 75:
            alerts.append(
                {
                    "type": "knowledge_gap",
                    "severity": "medium",
                    "conversation_id": None,
                    "message": "Knowledge coverage is below 75%. Add more delivery, pricing, and FAQ details.",
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
            )

    return alerts[:10]


def _generate_trained_ai_response(
    owner_type: str,
    owner_id: int,
    message_text: str,
    language: Optional[str],
) -> tuple[str, float]:
    corrected = _find_best_correction(owner_type, owner_id, message_text)
    if corrected:
        return corrected, 0.94

    knowledge_hint = _build_knowledge_base_hint(owner_type, owner_id)
    normalized = message_text.strip().lower()
    if knowledge_hint and any(keyword in normalized for keyword in ["deliver", "delivery", "достав", "yetkaz"]):
        if language == "ru":
            return f"По нашей базе знаний: {knowledge_hint}", 0.79
        if language == "uz":
            return f"Bilimlar bazasiga ko'ra: {knowledge_hint}", 0.79
        return f"According to your knowledge base: {knowledge_hint}", 0.79

    ai_result = generate_ai_response(message_text, language)
    return ai_result.text, ai_result.confidence


def _extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    prefix = "bearer "
    if not authorization.lower().startswith(prefix):
        raise HTTPException(status_code=401, detail="Authorization must be Bearer token")

    token = authorization[len(prefix) :].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token")

    return token


def _find_session_user(token: str) -> dict[str, Any]:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                wu.id,
                wu.email,
                wu.company_name,
                COALESCE(wu.role, 'user') AS role,
                COALESCE(wu.subscription_status, 'inactive') AS subscription_status,
                COALESCE(wu.subscription_plan, 'starter') AS subscription_plan,
                wu.subscription_expiry,
                wu.payment_method_last4,
                wu.payment_method_brand
            FROM web_sessions ws
            JOIN web_users wu ON wu.id = ws.user_id
            WHERE ws.token = ?
            """,
            (token,),
        )
        web_row = cursor.fetchone()
        if web_row:
            email = str(web_row[1])
            role = str(web_row[3] or "user")
            if _is_admin_email(email) and role != "admin":
                cursor.execute(
                    """
                    UPDATE web_users
                    SET
                        role = 'admin',
                        subscription_status = 'active',
                        subscription_plan = 'business',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (int(web_row[0]),),
                )
                conn.commit()
                role = "admin"
            elif not _is_admin_email(email) and role == "admin":
                cursor.execute(
                    """
                    UPDATE web_users
                    SET role = 'user', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (int(web_row[0]),),
                )
                conn.commit()
                role = "user"

            _refresh_web_user_subscription_if_expired(int(web_row[0]))
            cursor.execute(
                """
                SELECT
                    COALESCE(role, 'user'),
                    COALESCE(subscription_status, 'inactive'),
                    COALESCE(subscription_plan, 'starter'),
                    subscription_expiry,
                    payment_method_last4,
                    payment_method_brand
                FROM web_users
                WHERE id = ?
                """,
                (int(web_row[0]),),
            )
            normalized = cursor.fetchone()
            if normalized:
                role = str(normalized[0] or "user")
                subscription_status = str(normalized[1] or "inactive")
                subscription_plan = str(normalized[2] or "starter")
                subscription_expiry = normalized[3]
                payment_method_last4 = normalized[4]
                payment_method_brand = normalized[5]
            else:
                subscription_status = "inactive"
                subscription_plan = "starter"
                subscription_expiry = None
                payment_method_last4 = None
                payment_method_brand = None

            return {
                "ok": True,
                "auth_type": "web",
                "user": {
                    "id": int(web_row[0]),
                    "email": email,
                    "company_name": str(web_row[2]),
                    "role": role,
                    "subscription_status": "active" if role == "admin" else subscription_status,
                    "subscription_plan": "business" if role == "admin" else subscription_plan,
                    "subscription_expiry": subscription_expiry,
                    "payment_method_last4": payment_method_last4,
                    "payment_method_brand": payment_method_brand,
                },
            }

        cursor.execute(
            """
            SELECT u.id, u.telegram_id, u.username, u.first_name, u.last_name, u.photo_url, u.language_code
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        )
        tg_row = cursor.fetchone()
        if tg_row:
            return {
                "ok": True,
                "auth_type": "telegram",
                "user": {
                    "id": int(tg_row[0]),
                    "telegram_id": int(tg_row[1]),
                    "username": tg_row[2],
                    "first_name": tg_row[3],
                    "last_name": tg_row[4],
                    "photo_url": tg_row[5],
                    "language_code": tg_row[6],
                },
            }

    raise HTTPException(status_code=401, detail="Invalid session token")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_admin_email(email: str) -> bool:
    return _normalize_email(email) == ADMIN_EMAIL


def _get_web_user_account(user_id: int) -> dict[str, Any]:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                id,
                email,
                company_name,
                COALESCE(role, 'user') AS role,
                COALESCE(subscription_status, 'inactive') AS subscription_status,
                COALESCE(subscription_plan, 'starter') AS subscription_plan,
                subscription_expiry,
                payment_method_last4,
                payment_method_brand
            FROM web_users
            WHERE id = ?
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User account not found")

        email = str(row[1])
        role = str(row[3] or "user")
        if _is_admin_email(email) and role != "admin":
            cursor.execute(
                """
                UPDATE web_users
                SET
                    role = 'admin',
                    subscription_status = 'active',
                    subscription_plan = 'business',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (user_id,),
            )
            conn.commit()
            role = "admin"
        elif not _is_admin_email(email) and role == "admin":
            cursor.execute(
                """
                UPDATE web_users
                SET role = 'user', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (user_id,),
            )
            conn.commit()
            role = "user"

        _refresh_web_user_subscription_if_expired(user_id)

        cursor.execute(
            """
            SELECT
                COALESCE(role, 'user'),
                COALESCE(subscription_status, 'inactive'),
                COALESCE(subscription_plan, 'starter'),
                subscription_expiry,
                payment_method_last4,
                payment_method_brand,
                company_name,
                email
            FROM web_users
            WHERE id = ?
            """,
            (user_id,),
        )
        normalized = cursor.fetchone()
        if not normalized:
            raise HTTPException(status_code=404, detail="User account not found")

        normalized_role = str(normalized[0] or "user")
        normalized_status = str(normalized[1] or "inactive")
        normalized_plan = str(normalized[2] or "starter")
        expiry = normalized[3]
        payment_last4 = normalized[4]
        payment_brand = normalized[5]
        company_name = str(normalized[6] or "")
        normalized_email = str(normalized[7] or "")

        if normalized_role == "admin":
            normalized_status = "active"
            normalized_plan = "business"

        return {
            "id": user_id,
            "email": normalized_email,
            "company_name": company_name,
            "role": normalized_role,
            "subscription_status": normalized_status,
            "subscription_plan": normalized_plan,
            "subscription_expiry": expiry,
            "payment_method_last4": payment_last4,
            "payment_method_brand": payment_brand,
        }


def _require_web_account(authorization: Optional[str]) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    if owner_type != "web":
        raise HTTPException(status_code=403, detail="This endpoint requires a web account")
    return _get_web_user_account(owner_id)


def _require_admin(authorization: Optional[str]) -> dict[str, Any]:
    account = _require_web_account(authorization)
    if str(account.get("role") or "") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return account


def _list_platform_features() -> list[dict[str, Any]]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT feature_key, display_name, enabled, updated_at
            FROM platform_feature_flags
            ORDER BY id ASC
            """
        )
        rows = cursor.fetchall()

    return [
        {
            "feature_key": str(row["feature_key"]),
            "display_name": str(row["display_name"]),
            "enabled": bool(row["enabled"]),
            "updated_at": str(row["updated_at"]),
        }
        for row in rows
    ]


def _is_feature_enabled(feature_key: str) -> bool:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT enabled
            FROM platform_feature_flags
            WHERE feature_key = ?
            """,
            (feature_key,),
        )
        row = cursor.fetchone()

    if not row:
        return True
    return bool(row[0])


def _record_system_activity(
    *,
    event_type: str,
    message: str,
    actor_user_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO system_activity (event_type, message, actor_user_id, actor_email, metadata_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                event_type,
                message,
                actor_user_id,
                actor_email,
                json.dumps(metadata or {}),
            ),
        )
        conn.commit()


def _feature_key_for_access(feature: str) -> Optional[str]:
    mapping = {
        "ai_chat": "ai_chat",
        "ai_employees_create": "ai_employees",
        "ai_employees_view": "ai_employees",
        "telegram_automation": "telegram_integration",
        "analytics": "analytics_dashboard",
        "knowledge_base": "knowledge_base",
    }
    return mapping.get(feature)


def _require_feature_access(
    *,
    owner_type: str,
    owner_id: int,
    feature: str,
    min_analytics_tier: Optional[str] = None,
) -> dict[str, Any]:
    if owner_type != "web":
        return {
            "role": "telegram",
            "subscription_status": "active",
            "subscription_plan": "business",
        }

    account = _get_web_user_account(owner_id)
    role = str(account.get("role") or "user")
    status = str(account.get("subscription_status") or "inactive")
    plan = str(account.get("subscription_plan") or "starter")

    feature_key = _feature_key_for_access(feature)
    if role != "admin" and feature_key and not _is_feature_enabled(feature_key):
        raise HTTPException(
            status_code=403,
            detail={
                "message": "This feature is currently disabled by admin",
                "feature": feature_key,
            },
        )

    if role != "admin" and status != "active":
        raise HTTPException(
            status_code=402,
            detail={
                "message": "Active subscription required",
                "feature": feature,
                "subscription_status": status,
            },
        )

    limits = SUBSCRIPTION_PLANS.get(plan, SUBSCRIPTION_PLANS["starter"])

    if feature == "ai_employees_create" and role != "admin":
        max_employees = int(limits.get("ai_employees", 1))
        if max_employees >= 0:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM ai_employee_configs
                    WHERE owner_type = ? AND owner_id = ?
                    """,
                    (owner_type, owner_id),
                )
                current_count = int(cursor.fetchone()[0])
            if current_count >= max_employees:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "message": "Plan employee limit reached",
                        "plan": plan,
                        "limit": max_employees,
                    },
                )

    if feature == "analytics" and role != "admin" and min_analytics_tier:
        current_tier = str(limits.get("analytics", "basic"))
        tiers = {"basic": 1, "advanced": 2, "full": 3}
        if tiers.get(current_tier, 1) < tiers.get(min_analytics_tier, 1):
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Upgrade required for advanced analytics",
                    "plan": plan,
                    "required_tier": min_analytics_tier,
                    "current_tier": current_tier,
                },
            )

    return account


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _subscription_expiry_string(days: int = 30) -> str:
    expiry = _utc_now() + timedelta(days=days)
    return expiry.strftime("%Y-%m-%d %H:%M:%S")


def _refresh_web_user_subscription_if_expired(user_id: int) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT role, subscription_status, subscription_expiry
            FROM web_users
            WHERE id = ?
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return

        role = str(row[0] or "user")
        status = str(row[1] or "inactive")
        expiry_raw = row[2]

        if role == "admin":
            return

        if status != "active" or not expiry_raw:
            return

        try:
            expiry = datetime.strptime(str(expiry_raw), "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except ValueError:
            return

        if expiry <= _utc_now():
            cursor.execute(
                """
                UPDATE web_users
                SET subscription_status = 'expired', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (user_id,),
            )
            conn.commit()


def _create_stripe_checkout_session(
    *,
    email: str,
    plan: str,
    amount_usd: int,
    metadata: dict[str, str],
) -> tuple[str, str]:
    if stripe is None:
        raise HTTPException(status_code=500, detail="Stripe SDK is not installed")

    stripe_secret_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    frontend_url = os.getenv("WORKLAB_WEBAPP_URL", "http://localhost:3000").strip().rstrip("/")
    if not stripe_secret_key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY is not configured")

    stripe.api_key = stripe_secret_key

    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        customer_email=email,
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount_usd * 100,
                    "product_data": {
                        "name": f"WorkLab {SUBSCRIPTION_PLANS[plan]['name']} Plan",
                    },
                },
            }
        ],
        success_url=f"{frontend_url}/settings/billing?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/pricing?checkout=cancelled",
        metadata=metadata,
    )

    return str(session.get("id")), str(session.get("url"))


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    )
    return f"{salt}${derived.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, hash_hex = stored_hash.split("$", 1)
    except ValueError:
        return False

    recalculated = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()
    return hmac.compare_digest(recalculated, hash_hex)


def _validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(char.islower() for char in password):
        raise HTTPException(status_code=400, detail="Password must include a lowercase letter")
    if not any(char.isupper() for char in password):
        raise HTTPException(status_code=400, detail="Password must include an uppercase letter")
    if not any(char.isdigit() for char in password):
        raise HTTPException(status_code=400, detail="Password must include a number")
    if password.isalnum():
        raise HTTPException(status_code=400, detail="Password must include a symbol")


def _extract_verified_telegram_user(init_data: str) -> dict[str, Any]:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(
            status_code=500,
            detail="TELEGRAM_BOT_TOKEN is not configured",
        )

    parsed_data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed_data.pop("hash", None)

    if not received_hash:
        raise HTTPException(status_code=401, detail="Missing Telegram signature hash")

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(parsed_data.items())
    )

    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")

    auth_date_raw = parsed_data.get("auth_date")
    if not auth_date_raw:
        raise HTTPException(status_code=401, detail="Missing Telegram auth_date")

    try:
        auth_date = int(auth_date_raw)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid Telegram auth_date") from exc

    max_age_seconds = int(os.getenv("TELEGRAM_AUTH_MAX_AGE_SEC", "86400"))
    if time.time() - auth_date > max_age_seconds:
        raise HTTPException(status_code=401, detail="Telegram auth data is expired")

    user_raw = parsed_data.get("user")
    if not user_raw:
        raise HTTPException(status_code=400, detail="Missing Telegram user payload")

    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid Telegram user payload") from exc

    telegram_id = user.get("id")
    if telegram_id is None:
        raise HTTPException(status_code=400, detail="Telegram user id is missing")

    try:
        normalized_telegram_id = int(telegram_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Telegram user id is invalid") from exc

    return {
        "telegram_id": normalized_telegram_id,
        "username": user.get("username"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "photo_url": user.get("photo_url"),
        "language_code": user.get("language_code"),
    }


def _normalize_telegram_user_payload(user: dict[str, Any]) -> dict[str, Any]:
    telegram_id = user.get("telegram_id", user.get("id"))
    if telegram_id is None:
        raise HTTPException(status_code=400, detail="Telegram user id is missing")

    try:
        normalized_telegram_id = int(telegram_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Telegram user id is invalid") from exc

    return {
        "telegram_id": normalized_telegram_id,
        "username": user.get("username"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "photo_url": user.get("photo_url"),
        "language_code": user.get("language_code"),
    }


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "WorkLab Backend API is running"}


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "database": str(DB_PATH),
    }


@app.post("/telegram/webhook")
async def receive_telegram_webhook(update: dict[str, Any]) -> dict[str, Any]:
    """Receive Telegram webhook updates and generate an AI reply payload."""
    incoming = parse_telegram_update(update)

    if incoming is None:
        return {
            "ok": True,
            "status": "ignored",
            "reason": "No processable message found in update",
        }

    normalized_text = incoming.text.strip().lower()

    if normalized_text in {"/start", "start", "/menu", "open worklab", "open"}:
        reply_payload = build_send_message_payload(
            chat_id=incoming.chat_id,
            text="Use the Open WorkLab menu button to launch the Mini App.",
        )
        return {
            "ok": True,
            "status": "processed",
            "update_id": incoming.update_id,
            "input_text": incoming.text,
            "ai_reply": None,
            "confidence": None,
            "telegram_send_payload": reply_payload,
        }

    ai_result = generate_ai_response(incoming.text)
    reply_payload = build_send_message_payload(chat_id=incoming.chat_id, text=ai_result.text)

    # For now, we only return the prepared payload.
    # Later, send this payload to Telegram sendMessage API.
    return {
        "ok": True,
        "status": "processed",
        "update_id": incoming.update_id,
        "input_text": incoming.text,
        "ai_reply": ai_result.text,
        "confidence": ai_result.confidence,
        "telegram_send_payload": reply_payload,
    }


@app.post("/telegram/webhook/configure")
async def configure_telegram_webhook(
    request: TelegramWebhookConfigRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Prepare webhook registration details for Telegram integration."""
    account = _require_web_account(authorization)
    _require_feature_access(
        owner_type="web",
        owner_id=int(account["id"]),
        feature="telegram_automation",
    )

    webhook_request = build_set_webhook_request(
        bot_token=request.bot_token,
        webhook_url=request.webhook_url,
    )

    _record_system_activity(
        event_type="telegram_connected",
        message="Telegram webhook configuration prepared",
        actor_user_id=int(account["id"]),
        actor_email=str(account["email"]),
        metadata={"webhook_url": request.webhook_url},
    )

    return {
        "ok": True,
        "status": "ready",
        "message": "Webhook request prepared. Execute this call in deployment environment.",
        "telegram_set_webhook": webhook_request,
    }


@app.post("/telegram-auth")
async def telegram_auth(request: TelegramAuthRequest) -> dict[str, Any]:
    """Authenticate Telegram Mini App user and issue a session token."""
    if request.init_data:
        user_payload = _extract_verified_telegram_user(request.init_data)
    elif request.user:
        user_payload = _normalize_telegram_user_payload(request.user)
    else:
        raise HTTPException(
            status_code=400,
            detail="Either init_data or user must be provided",
        )

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id FROM users WHERE telegram_id = ?
            """,
            (str(user_payload["telegram_id"]),),
        )
        existing_user = cursor.fetchone()

        if existing_user:
            user_id = int(existing_user[0])
            cursor.execute(
                """
                UPDATE users
                SET username = ?, first_name = ?, last_name = ?, photo_url = ?, language_code = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    user_payload["username"],
                    user_payload["first_name"],
                    user_payload["last_name"],
                    user_payload["photo_url"],
                    user_payload["language_code"],
                    user_id,
                ),
            )
        else:
            cursor.execute(
                """
                INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, language_code)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(user_payload["telegram_id"]),
                    user_payload["username"],
                    user_payload["first_name"],
                    user_payload["last_name"],
                    user_payload["photo_url"],
                    user_payload["language_code"],
                ),
            )
            user_id = int(cursor.lastrowid)

        token = secrets.token_urlsafe(32)
        cursor.execute(
            """
            INSERT INTO sessions (user_id, token)
            VALUES (?, ?)
            """,
            (user_id, token),
        )

        conn.commit()

    return {
        "ok": True,
        "token": token,
        "user": {
            "id": user_id,
            "telegram_id": user_payload["telegram_id"],
            "username": user_payload["username"],
            "first_name": user_payload["first_name"],
            "last_name": user_payload["last_name"],
            "photo_url": user_payload["photo_url"],
            "language_code": user_payload["language_code"],
        },
    }


@app.post("/auth/signup")
async def auth_signup(request: SignupRequest) -> dict[str, Any]:
    email = _normalize_email(request.email)
    _validate_password_strength(request.password)
    is_admin_signup = _is_admin_email(email)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id FROM web_users WHERE email = ?
            """,
            (email,),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Account already exists")

        password_hash = _hash_password(request.password)
        cursor.execute(
            """
            INSERT INTO web_users (company_name, email, password_hash, role, subscription_status, subscription_plan, subscription_expiry)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request.company_name.strip(),
                email,
                password_hash,
                "admin" if is_admin_signup else "user",
                "active" if is_admin_signup else "inactive",
                "business" if is_admin_signup else "starter",
                _subscription_expiry_string(3650) if is_admin_signup else None,
            ),
        )
        user_id = int(cursor.lastrowid)

        token = secrets.token_urlsafe(32)
        cursor.execute(
            """
            INSERT INTO web_sessions (user_id, token)
            VALUES (?, ?)
            """,
            (user_id, token),
        )
        conn.commit()

    account = _get_web_user_account(user_id)
    _record_system_activity(
        event_type="user_registered",
        message=f"User {account['email']} registered",
        actor_user_id=int(account["id"]),
        actor_email=str(account["email"]),
        metadata={"company_name": account["company_name"]},
    )

    return {
        "ok": True,
        "token": token,
        "user": {
            "id": account["id"],
            "email": account["email"],
            "company_name": account["company_name"],
            "role": account["role"],
            "subscription_status": account["subscription_status"],
            "subscription_plan": account["subscription_plan"],
            "subscription_expiry": account["subscription_expiry"],
            "payment_method_last4": account["payment_method_last4"],
            "payment_method_brand": account["payment_method_brand"],
        },
    }


@app.post("/auth/login")
async def auth_login(request: LoginRequest) -> dict[str, Any]:
    email = _normalize_email(request.email)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, company_name, password_hash FROM web_users WHERE email = ?
            """,
            (email,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = int(row[0])
        company_name = str(row[1])
        password_hash = str(row[2])

        if not _verify_password(request.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = secrets.token_urlsafe(32)
        cursor.execute(
            """
            INSERT INTO web_sessions (user_id, token)
            VALUES (?, ?)
            """,
            (user_id, token),
        )
        conn.commit()

    if _is_admin_email(email):
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE web_users
                SET
                    role = 'admin',
                    subscription_status = 'active',
                    subscription_plan = 'business',
                    subscription_expiry = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (_subscription_expiry_string(3650), user_id),
            )
            conn.commit()

    account = _get_web_user_account(user_id)

    return {
        "ok": True,
        "token": token,
        "user": {
            "id": account["id"],
            "email": account["email"],
            "company_name": account["company_name"] or company_name,
            "role": account["role"],
            "subscription_status": account["subscription_status"],
            "subscription_plan": account["subscription_plan"],
            "subscription_expiry": account["subscription_expiry"],
            "payment_method_last4": account["payment_method_last4"],
            "payment_method_brand": account["payment_method_brand"],
        },
    }


@app.get("/auth/session")
async def auth_session(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)
    return _find_session_user(token)


@app.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM web_sessions WHERE token = ?", (token,))
        web_deleted = cursor.rowcount
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        tg_deleted = cursor.rowcount
        conn.commit()

    if web_deleted == 0 and tg_deleted == 0:
        raise HTTPException(status_code=401, detail="Invalid session token")

    return {"ok": True}


@app.get("/billing/plans")
async def billing_plans() -> dict[str, Any]:
    plans = []
    for plan_key, plan_data in SUBSCRIPTION_PLANS.items():
        plans.append(
            {
                "id": plan_key,
                "name": str(plan_data["name"]),
                "price_usd": int(plan_data["price_usd"]),
                "limits": {
                    "ai_employees": int(plan_data["ai_employees"]),
                    "telegram_bots": int(plan_data["telegram_bots"]),
                    "analytics": str(plan_data["analytics"]),
                },
            }
        )

    return {"ok": True, "plans": plans}


@app.get("/billing/status")
async def billing_status(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    account = _require_web_account(authorization)
    plan = str(account.get("subscription_plan") or "starter")
    plan_limits = SUBSCRIPTION_PLANS.get(plan, SUBSCRIPTION_PLANS["starter"])

    return {
        "ok": True,
        "billing": {
            "role": account["role"],
            "subscription_status": account["subscription_status"],
            "subscription_plan": plan,
            "subscription_expiry": account["subscription_expiry"],
            "payment_method_last4": account["payment_method_last4"],
            "payment_method_brand": account["payment_method_brand"],
            "features": {
                "ai_employees": int(plan_limits["ai_employees"]),
                "telegram_bots": int(plan_limits["telegram_bots"]),
                "analytics": str(plan_limits["analytics"]),
            },
            "admin_bypass": account["role"] == "admin",
        },
    }


@app.get("/features/status")
async def feature_status(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    account = _require_web_account(authorization)
    features = _list_platform_features()
    feature_map = {item["feature_key"]: bool(item["enabled"]) for item in features}

    return {
        "ok": True,
        "role": account["role"],
        "is_admin": account["role"] == "admin",
        "features": feature_map,
        "feature_list": features,
    }


@app.get("/admin/monitor")
async def admin_monitor(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    _require_admin(authorization)

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) AS total FROM web_users")
        total_users = int(cursor.fetchone()["total"])

        cursor.execute(
            """
            SELECT COUNT(DISTINCT user_id) AS active_today
            FROM web_sessions
            WHERE date(created_at) = date('now')
            """
        )
        active_users_today = int(cursor.fetchone()["active_today"])

        cursor.execute("SELECT COUNT(*) AS total FROM ai_employee_configs")
        total_ai_employees = int(cursor.fetchone()["total"])

        cursor.execute("SELECT COUNT(*) AS total FROM monitored_conversations")
        total_conversations = int(cursor.fetchone()["total"])

        cursor.execute("SELECT COUNT(*) AS total FROM telegram_bot_tokens")
        active_bots = int(cursor.fetchone()["total"])

        cursor.execute(
            """
            SELECT date(created_at) AS day, COUNT(*) AS count
            FROM web_users
            GROUP BY date(created_at)
            ORDER BY day DESC
            LIMIT 14
            """
        )
        registrations_rows = list(reversed(cursor.fetchall()))

        cursor.execute(
            """
            SELECT date(created_at) AS day, COUNT(DISTINCT user_id) AS count
            FROM web_sessions
            GROUP BY date(created_at)
            ORDER BY day DESC
            LIMIT 14
            """
        )
        dau_rows = list(reversed(cursor.fetchall()))

        cursor.execute(
            """
            SELECT date(created_at) AS day, COUNT(*) AS count
            FROM ai_chat_messages
            WHERE role = 'user'
            GROUP BY date(created_at)
            ORDER BY day DESC
            LIMIT 14
            """
        )
        interactions_rows = list(reversed(cursor.fetchall()))

        cursor.execute(
            """
            SELECT
                SUM(CASE WHEN COALESCE(role, 'user') != 'admin' AND COALESCE(subscription_status, 'inactive') = 'inactive' THEN 1 ELSE 0 END) AS free_users,
                SUM(CASE WHEN COALESCE(role, 'user') != 'admin' AND COALESCE(subscription_status, 'inactive') = 'active' THEN 1 ELSE 0 END) AS subscribed_users,
                SUM(CASE WHEN COALESCE(role, 'user') != 'admin' AND COALESCE(subscription_status, 'inactive') = 'active' THEN 1 ELSE 0 END) AS active_subscriptions,
                SUM(CASE WHEN COALESCE(role, 'user') != 'admin' AND COALESCE(subscription_status, 'inactive') = 'expired' THEN 1 ELSE 0 END) AS expired_subscriptions
            FROM web_users
            """
        )
        subscription_row = cursor.fetchone()

        cursor.execute(
            """
            SELECT COALESCE(SUM(amount_usd), 0) AS monthly_revenue
            FROM billing_history
            WHERE status = 'paid' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
            """
        )
        monthly_revenue = int(cursor.fetchone()["monthly_revenue"])

        cursor.execute(
            """
            SELECT date(created_at) AS day, COUNT(*) AS count
            FROM billing_history
            WHERE status = 'paid'
            GROUP BY date(created_at)
            ORDER BY day DESC
            LIMIT 14
            """
        )
        subscription_growth_rows = list(reversed(cursor.fetchall()))

        cursor.execute(
            """
            SELECT id, event_type, message, actor_email, metadata_json, created_at
            FROM system_activity
            ORDER BY id DESC
            LIMIT 30
            """
        )
        activity_rows = cursor.fetchall()

    features = _list_platform_features()

    return {
        "ok": True,
        "platform_overview": {
            "total_users": total_users,
            "active_users_today": active_users_today,
            "ai_employees_created": total_ai_employees,
            "total_conversations_handled": total_conversations,
            "active_bots": active_bots,
        },
        "user_analytics": {
            "registrations_over_time": [
                {"day": str(row["day"]), "count": int(row["count"])} for row in registrations_rows
            ],
            "daily_active_users": [
                {"day": str(row["day"]), "count": int(row["count"])} for row in dau_rows
            ],
            "ai_interactions_per_day": [
                {"day": str(row["day"]), "count": int(row["count"])} for row in interactions_rows
            ],
        },
        "subscription_analytics": {
            "cards": {
                "free_users": int(subscription_row["free_users"] or 0),
                "subscribed_users": int(subscription_row["subscribed_users"] or 0),
                "active_subscriptions": int(subscription_row["active_subscriptions"] or 0),
                "expired_subscriptions": int(subscription_row["expired_subscriptions"] or 0),
                "monthly_revenue_usd": monthly_revenue,
            },
            "growth_over_time": [
                {"day": str(row["day"]), "count": int(row["count"])} for row in subscription_growth_rows
            ],
        },
        "feature_management": features,
        "system_activity": [
            {
                "id": int(row["id"]),
                "event_type": str(row["event_type"]),
                "message": str(row["message"]),
                "actor_email": row["actor_email"],
                "metadata": json.loads(str(row["metadata_json"] or "{}")),
                "created_at": str(row["created_at"]),
            }
            for row in activity_rows
        ],
    }


@app.patch("/admin/features/{feature_key}")
async def toggle_admin_feature(
    feature_key: str,
    request: FeatureToggleRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    account = _require_admin(authorization)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE platform_feature_flags
            SET enabled = ?, updated_at = CURRENT_TIMESTAMP
            WHERE feature_key = ?
            """,
            (1 if request.enabled else 0, feature_key),
        )
        conn.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Feature not found")

    _record_system_activity(
        event_type="feature_toggled",
        message=f"Feature {feature_key} {'enabled' if request.enabled else 'disabled'} by admin",
        actor_user_id=int(account["id"]),
        actor_email=str(account["email"]),
        metadata={"feature_key": feature_key, "enabled": request.enabled},
    )

    return {"ok": True, "feature_key": feature_key, "enabled": request.enabled}


@app.post("/billing/checkout/session")
async def create_billing_checkout_session(
    request: BillingCheckoutRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    account = _require_web_account(authorization)
    if account["role"] == "admin":
        return {
            "ok": True,
            "status": "admin-bypass",
            "message": "Admin account does not require checkout.",
        }

    plan = request.plan
    if plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")

    sanitized_card_number = "".join(char for char in request.card_number if char.isdigit())
    if len(sanitized_card_number) < 12:
        raise HTTPException(status_code=400, detail="Card number is invalid")

    sanitized_cvv = "".join(char for char in request.cvv if char.isdigit())
    if len(sanitized_cvv) not in {3, 4}:
        raise HTTPException(status_code=400, detail="CVV is invalid")

    amount_usd = int(SUBSCRIPTION_PLANS[plan]["price_usd"])
    billing_email = _normalize_email(request.billing_email or account["email"])
    brand = "card"
    session_id = f"local_{secrets.token_hex(12)}"
    checkout_url = ""

    metadata = {
        "plan": plan,
        "user_id": str(account["id"]),
        "billing_email": billing_email,
    }

    if stripe is not None and os.getenv("STRIPE_SECRET_KEY", "").strip():
        stripe_session_id, stripe_checkout_url = _create_stripe_checkout_session(
            email=billing_email,
            plan=plan,
            amount_usd=amount_usd,
            metadata=metadata,
        )
        session_id = stripe_session_id
        checkout_url = stripe_checkout_url

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO billing_checkout_sessions (
                user_id,
                plan,
                status,
                provider,
                provider_session_id,
                checkout_url,
                metadata_json
            )
            VALUES (?, ?, 'pending', ?, ?, ?, ?)
            """,
            (
                account["id"],
                plan,
                "stripe" if session_id.startswith("cs_") else "manual",
                session_id,
                checkout_url,
                json.dumps(
                    {
                        "card_last4": sanitized_card_number[-4:],
                        "card_brand": brand,
                        "billing_email": billing_email,
                        "country": (request.country or "").strip(),
                    }
                ),
            ),
        )
        conn.commit()

    return {
        "ok": True,
        "session_id": session_id,
        "checkout_url": checkout_url,
        "plan": plan,
        "amount_usd": amount_usd,
        "requires_redirect": bool(checkout_url),
    }


@app.post("/billing/checkout/confirm")
async def confirm_billing_checkout(
    request: BillingConfirmRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    account = _require_web_account(authorization)
    if account["role"] == "admin":
        return {"ok": True, "status": "active", "admin_bypass": True}

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, plan, status, provider, provider_session_id, metadata_json
            FROM billing_checkout_sessions
            WHERE user_id = ? AND provider_session_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (account["id"], request.session_id),
        )
        checkout_row = cursor.fetchone()
        if not checkout_row:
            raise HTTPException(status_code=404, detail="Checkout session not found")

        checkout_status = str(checkout_row["status"])
        if checkout_status == "completed":
            updated = _get_web_user_account(int(account["id"]))
            return {
                "ok": True,
                "status": "active",
                "subscription_plan": updated["subscription_plan"],
                "subscription_expiry": updated["subscription_expiry"],
            }

        provider = str(checkout_row["provider"])
        provider_session_id = str(checkout_row["provider_session_id"])
        payment_success = True

        if provider == "stripe" and provider_session_id.startswith("cs_"):
            if stripe is None or not os.getenv("STRIPE_SECRET_KEY", "").strip():
                raise HTTPException(status_code=500, detail="Stripe checkout is not configured")
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
            stripe_session = stripe.checkout.Session.retrieve(provider_session_id)
            payment_success = str(stripe_session.get("payment_status", "")) == "paid"

        if not payment_success:
            raise HTTPException(status_code=402, detail="Payment not completed yet")

        plan = str(checkout_row["plan"])
        amount_usd = int(SUBSCRIPTION_PLANS.get(plan, SUBSCRIPTION_PLANS["starter"])["price_usd"])
        metadata_json = checkout_row["metadata_json"]
        metadata = {}
        if metadata_json:
            try:
                metadata = json.loads(str(metadata_json))
            except json.JSONDecodeError:
                metadata = {}

        payment_last4 = str(metadata.get("card_last4") or "")[-4:] or None
        payment_brand = str(metadata.get("card_brand") or "card")
        expiry = _subscription_expiry_string(30)

        cursor.execute(
            """
            UPDATE billing_checkout_sessions
            SET status = 'completed'
            WHERE id = ?
            """,
            (int(checkout_row["id"]),),
        )
        cursor.execute(
            """
            UPDATE web_users
            SET
                subscription_status = 'active',
                subscription_plan = ?,
                subscription_expiry = ?,
                payment_method_last4 = ?,
                payment_method_brand = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (plan, expiry, payment_last4, payment_brand, account["id"]),
        )
        cursor.execute(
            """
            INSERT INTO billing_history (user_id, plan, amount_usd, currency, status, provider, provider_session_id)
            VALUES (?, ?, ?, 'USD', 'paid', ?, ?)
            """,
            (
                account["id"],
                plan,
                amount_usd,
                provider,
                provider_session_id,
            ),
        )
        conn.commit()

    _record_system_activity(
        event_type="subscription_activated",
        message=f"Subscription activated on {plan} plan",
        actor_user_id=int(account["id"]),
        actor_email=str(account["email"]),
        metadata={"plan": plan, "provider": provider, "amount_usd": amount_usd},
    )

    updated = _get_web_user_account(int(account["id"]))
    return {
        "ok": True,
        "status": "active",
        "subscription_plan": updated["subscription_plan"],
        "subscription_expiry": updated["subscription_expiry"],
        "payment_method_last4": updated["payment_method_last4"],
        "payment_method_brand": updated["payment_method_brand"],
    }


@app.get("/billing/history")
async def billing_history(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    account = _require_web_account(authorization)

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, plan, amount_usd, currency, status, provider, provider_session_id, created_at
            FROM billing_history
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 30
            """,
            (account["id"],),
        )
        rows = cursor.fetchall()

    items = [
        {
            "id": int(row["id"]),
            "plan": str(row["plan"]),
            "amount_usd": int(row["amount_usd"]),
            "currency": str(row["currency"]),
            "status": str(row["status"]),
            "provider": str(row["provider"]),
            "provider_session_id": row["provider_session_id"],
            "created_at": str(row["created_at"]),
        }
        for row in rows
    ]

    return {"ok": True, "history": items}


@app.put("/billing/payment-method")
async def update_payment_method(
    request: UpdatePaymentMethodRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    account = _require_web_account(authorization)
    if account["role"] == "admin":
        return {
            "ok": True,
            "admin_bypass": True,
            "payment_method_last4": account["payment_method_last4"],
            "payment_method_brand": account["payment_method_brand"],
        }

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE web_users
            SET
                payment_method_brand = ?,
                payment_method_last4 = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                request.payment_method_brand.strip().lower(),
                request.payment_method_last4.strip(),
                account["id"],
            ),
        )
        conn.commit()

    updated = _get_web_user_account(int(account["id"]))
    return {
        "ok": True,
        "payment_method_last4": updated["payment_method_last4"],
        "payment_method_brand": updated["payment_method_brand"],
    }


@app.post("/billing/cancel")
async def cancel_subscription(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    account = _require_web_account(authorization)
    if account["role"] == "admin":
        return {
            "ok": True,
            "status": "active",
            "admin_bypass": True,
        }

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE web_users
            SET
                subscription_status = 'inactive',
                subscription_plan = 'starter',
                subscription_expiry = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (account["id"],),
        )
        conn.commit()

    updated = _get_web_user_account(int(account["id"]))
    return {
        "ok": True,
        "subscription_status": updated["subscription_status"],
        "subscription_plan": updated["subscription_plan"],
        "subscription_expiry": updated["subscription_expiry"],
    }


@app.get("/operations/conversations")
async def list_monitored_conversations(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )
    _ensure_operations_seed(owner_type, owner_id)

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, customer_handle, customer_name, last_message, last_timestamp, unread_count, taken_over,
                   assigned_employee_id
            FROM monitored_conversations
            WHERE owner_type = ? AND owner_id = ?
            ORDER BY last_timestamp DESC
            """,
            (owner_type, owner_id),
        )
        rows = cursor.fetchall()

    conversations = [
        {
            "id": str(row["id"]),
            "customer_handle": row["customer_handle"],
            "customer_name": row["customer_name"],
            "last_message": row["last_message"],
            "timestamp": row["last_timestamp"],
            "unread_count": int(row["unread_count"] or 0),
            "taken_over": bool(row["taken_over"]),
            "assigned_employee_id": int(row["assigned_employee_id"]) if row["assigned_employee_id"] is not None else None,
            "sentiment": _estimate_sentiment_label(str(row["last_message"] or "")),
        }
        for row in rows
    ]

    return {"ok": True, "conversations": conversations}


@app.get("/operations/conversations/{conversation_id}")
async def get_monitored_conversation(
    conversation_id: str,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, customer_handle, customer_name, taken_over, assigned_employee_id
            FROM monitored_conversations
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (conversation_id, owner_type, owner_id),
        )
        conversation = cursor.fetchone()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        cursor.execute(
            """
            SELECT id, sender_type, content, confidence, created_at
            FROM monitored_messages
            WHERE conversation_id = ?
            ORDER BY id ASC
            """,
            (conversation_id,),
        )
        messages_rows = cursor.fetchall()

    messages = [
        {
            "id": int(row["id"]),
            "sender_type": str(row["sender_type"]),
            "content": str(row["content"]),
            "confidence": float(row["confidence"]) if row["confidence"] is not None else None,
            "created_at": str(row["created_at"]),
            "low_confidence": row["confidence"] is not None and float(row["confidence"]) < 0.6,
            "sentiment": _estimate_sentiment_label(str(row["content"] or "")),
        }
        for row in messages_rows
    ]

    monitoring = _assess_conversation_metrics(messages)

    assigned_employee = None
    assigned_employee_id = conversation["assigned_employee_id"]
    if assigned_employee_id is not None:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, name, role
                FROM ai_employee_configs
                WHERE id = ?
                """,
                (int(assigned_employee_id),),
            )
            employee_row = cursor.fetchone()
        if employee_row:
            assigned_employee = {
                "id": int(employee_row["id"]),
                "name": str(employee_row["name"]),
                "role": str(employee_row["role"]),
            }

    return {
        "ok": True,
        "conversation": {
            "id": str(conversation["id"]),
            "customer_handle": conversation["customer_handle"],
            "customer_name": conversation["customer_name"],
            "taken_over": bool(conversation["taken_over"]),
            "assigned_employee": assigned_employee,
        },
        "messages": messages,
        "monitoring": monitoring,
    }


@app.post("/operations/conversations/{conversation_id}/feedback")
async def submit_ai_feedback(
    conversation_id: str,
    request: AIResponseFeedbackRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id
            FROM monitored_conversations
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (conversation_id, owner_type, owner_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Conversation not found")

        cursor.execute(
            """
            SELECT content
            FROM monitored_messages
            WHERE conversation_id = ? AND sender_type = 'customer'
            ORDER BY id DESC
            LIMIT 1
            """,
            (conversation_id,),
        )
        latest_customer = cursor.fetchone()
        source_question = str(latest_customer[0]) if latest_customer else "Customer question"

        status = "approved" if request.feedback_type == "correct" else "pending"
        cursor.execute(
            """
            INSERT INTO ai_response_feedback (
                owner_type, owner_id, conversation_id, message_id, feedback_type,
                source_question, suggested_answer, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                owner_type,
                owner_id,
                conversation_id,
                request.message_id,
                request.feedback_type,
                source_question,
                (request.suggested_answer or "").strip() or None,
                status,
            ),
        )
        feedback_id = int(cursor.lastrowid)
        conn.commit()

    if request.feedback_type in {"needs_improvement", "incorrect"}:
        _record_system_activity(
            event_type="ai_training_suggestion",
            message="New AI training suggestion pending admin approval",
            actor_user_id=owner_id if owner_type == "web" else None,
            metadata={"conversation_id": conversation_id, "feedback_id": feedback_id},
        )

    return {"ok": True, "feedback_id": feedback_id, "status": status}


@app.get("/operations/training-suggestions")
async def list_training_suggestions(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, conversation_id, message_id, feedback_type, source_question,
                   COALESCE(suggested_answer, '') AS suggested_answer, status, created_at
            FROM ai_response_feedback
            WHERE owner_type = ? AND owner_id = ?
              AND feedback_type IN ('needs_improvement', 'incorrect')
              AND status = 'pending'
            ORDER BY id DESC
            LIMIT 50
            """,
            (owner_type, owner_id),
        )
        rows = cursor.fetchall()

    suggestions = [
        {
            "id": int(row["id"]),
            "conversation_id": str(row["conversation_id"]),
            "message_id": int(row["message_id"]) if row["message_id"] is not None else None,
            "feedback_type": str(row["feedback_type"]),
            "source_question": str(row["source_question"]),
            "suggested_answer": str(row["suggested_answer"]),
            "status": str(row["status"]),
            "created_at": str(row["created_at"]),
        }
        for row in rows
    ]
    return {"ok": True, "suggestions": suggestions}


@app.post("/operations/training-suggestions/{feedback_id}/approve")
async def approve_training_suggestion(
    feedback_id: int,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, source_question, suggested_answer, status
            FROM ai_response_feedback
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (feedback_id, owner_type, owner_id),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Training suggestion not found")

        if str(row["status"]) != "pending":
            return {"ok": True, "feedback_id": feedback_id, "status": str(row["status"])}

        suggested_answer = str(row["suggested_answer"] or "").strip()
        if suggested_answer:
            cursor.execute(
                """
                INSERT INTO ai_corrections (owner_type, owner_id, question, corrected_answer)
                VALUES (?, ?, ?, ?)
                """,
                (owner_type, owner_id, str(row["source_question"]), suggested_answer),
            )

        cursor.execute(
            """
            UPDATE ai_response_feedback
            SET status = 'approved'
            WHERE id = ?
            """,
            (feedback_id,),
        )
        conn.commit()

    return {"ok": True, "feedback_id": feedback_id, "status": "approved"}


@app.get("/operations/notifications")
async def get_smart_notifications(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )
    return {"ok": True, "notifications": _build_notifications(owner_type, owner_id)}


@app.post("/operations/conversations/{conversation_id}/takeover")
async def toggle_takeover(
    conversation_id: str,
    request: Optional[TakeoverRequest] = None,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    next_state = True if request is None else bool(request.active)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE monitored_conversations
            SET taken_over = ?, unread_count = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (1 if next_state else 0, conversation_id, owner_type, owner_id),
        )
        conn.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {"ok": True, "conversation_id": conversation_id, "taken_over": next_state}


@app.post("/operations/conversations/{conversation_id}/reply")
async def human_reply_to_conversation(
    conversation_id: str,
    request: HumanReplyRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )
    message = request.message.strip()

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id
            FROM monitored_conversations
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (conversation_id, owner_type, owner_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Conversation not found")

        cursor.execute(
            """
            INSERT INTO monitored_messages (conversation_id, sender_type, content, confidence)
            VALUES (?, 'human', ?, NULL)
            """,
            (conversation_id, message),
        )
        cursor.execute(
            """
            UPDATE monitored_conversations
            SET last_message = ?, last_timestamp = CURRENT_TIMESTAMP, unread_count = 0, taken_over = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (message, conversation_id),
        )
        conn.commit()

    return {"ok": True}


@app.post("/operations/conversations/{conversation_id}/correct")
async def correct_ai_response(
    conversation_id: str,
    request: CorrectionRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )
    corrected_answer = request.corrected_answer.strip()

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id
            FROM monitored_conversations
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (conversation_id, owner_type, owner_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Conversation not found")

        cursor.execute(
            """
            SELECT content
            FROM monitored_messages
            WHERE conversation_id = ? AND sender_type = 'customer'
            ORDER BY id DESC
            LIMIT 1
            """,
            (conversation_id,),
        )
        latest_customer = cursor.fetchone()
        source_question = str(latest_customer[0]) if latest_customer else "Customer question"

        cursor.execute(
            """
            INSERT INTO ai_corrections (owner_type, owner_id, question, corrected_answer)
            VALUES (?, ?, ?, ?)
            """,
            (owner_type, owner_id, source_question, corrected_answer),
        )
        cursor.execute(
            """
            INSERT INTO monitored_messages (conversation_id, sender_type, content, confidence)
            VALUES (?, 'human', ?, NULL)
            """,
            (conversation_id, corrected_answer),
        )
        cursor.execute(
            """
            UPDATE monitored_conversations
            SET last_message = ?, last_timestamp = CURRENT_TIMESTAMP, taken_over = 1, unread_count = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (corrected_answer, conversation_id),
        )
        conn.commit()

    return {"ok": True}


@app.get("/operations/knowledge-base")
async def get_knowledge_base(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="knowledge_base",
    )

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT business_description, products_services, delivery_rules, working_hours, pricing_information, faq
            FROM knowledge_base_entries
            WHERE owner_type = ? AND owner_id = ?
            """,
            (owner_type, owner_id),
        )
        row = cursor.fetchone()

    if not row:
        insights = _build_knowledge_insights(owner_type, owner_id)
        return {
            "ok": True,
            "knowledge_base": {
                "business_description": "",
                "products_services": "",
                "delivery_rules": "",
                "working_hours": "",
                "pricing_information": "",
                "faq": "",
            },
            "insights": insights,
        }

    insights = _build_knowledge_insights(owner_type, owner_id)
    return {
        "ok": True,
        "knowledge_base": {
            "business_description": row["business_description"] or "",
            "products_services": row["products_services"] or "",
            "delivery_rules": row["delivery_rules"] or "",
            "working_hours": row["working_hours"] or "",
            "pricing_information": row["pricing_information"] or "",
            "faq": row["faq"] or "",
        },
        "insights": insights,
    }


@app.put("/operations/knowledge-base")
async def save_knowledge_base(
    request: KnowledgeBaseRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="knowledge_base",
    )

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO knowledge_base_entries (
                owner_type, owner_id, business_description, products_services,
                delivery_rules, working_hours, pricing_information, faq, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(owner_type, owner_id)
            DO UPDATE SET
                business_description = excluded.business_description,
                products_services = excluded.products_services,
                delivery_rules = excluded.delivery_rules,
                working_hours = excluded.working_hours,
                pricing_information = excluded.pricing_information,
                faq = excluded.faq,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                owner_type,
                owner_id,
                request.business_description.strip(),
                request.products_services.strip(),
                request.delivery_rules.strip(),
                request.working_hours.strip(),
                request.pricing_information.strip(),
                request.faq.strip(),
            ),
        )
        conn.commit()

    if owner_type == "web":
        account = _get_web_user_account(owner_id)
        _record_system_activity(
            event_type="knowledge_base_updated",
            message=f"Knowledge base article added by {account['email']}",
            actor_user_id=int(account["id"]),
            actor_email=str(account["email"]),
        )

    return {"ok": True, "insights": _build_knowledge_insights(owner_type, owner_id)}


@app.get("/operations/knowledge-base/insights")
async def get_knowledge_base_insights(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="knowledge_base",
    )
    return {"ok": True, "insights": _build_knowledge_insights(owner_type, owner_id)}


@app.post("/operations/knowledge-base/faq-suggestions/decision")
async def decide_faq_suggestion(
    request: FAQSuggestionDecisionRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="knowledge_base",
    )

    if not request.approved:
        return {"ok": True, "approved": False}

    faq_append = f"Q: {request.question.strip()}\nA: {request.answer.strip()}"
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COALESCE(faq, '')
            FROM knowledge_base_entries
            WHERE owner_type = ? AND owner_id = ?
            """,
            (owner_type, owner_id),
        )
        existing = cursor.fetchone()
        current_faq = str(existing[0] if existing else "")
        merged_faq = faq_append if not current_faq.strip() else f"{current_faq.strip()}\n\n{faq_append}"

        cursor.execute(
            """
            INSERT INTO knowledge_base_entries (owner_type, owner_id, faq, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(owner_type, owner_id)
            DO UPDATE SET
                faq = excluded.faq,
                updated_at = CURRENT_TIMESTAMP
            """,
            (owner_type, owner_id, merged_faq),
        )
        conn.commit()

    return {"ok": True, "approved": True, "insights": _build_knowledge_insights(owner_type, owner_id)}


@app.get("/operations/ai-employees")
async def list_ai_employees(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_employees_view",
    )

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                id,
                name,
                role,
                language,
                tone,
                COALESCE(knowledge_base_reference, '') AS knowledge_base_reference,
                COALESCE(communication_style, 'Professional') AS communication_style,
                COALESCE(response_length, 'Medium') AS response_length,
                COALESCE(response_tone, 'Balanced') AS response_tone,
                COALESCE(response_speed_priority, 'Balanced') AS response_speed_priority,
                COALESCE(context_memory_depth, 10) AS context_memory_depth,
                is_active
            FROM ai_employee_configs
            WHERE owner_type = ? AND owner_id = ?
            ORDER BY id DESC
            """,
            (owner_type, owner_id),
        )
        rows = cursor.fetchall()

    employees = [
        {
            "id": int(row["id"]),
            "name": str(row["name"]),
            "role": str(row["role"]),
            "language": str(row["language"]),
            "tone": str(row["tone"]),
            "knowledge_base_reference": str(row["knowledge_base_reference"]),
            "communication_style": str(row["communication_style"]),
            "response_length": str(row["response_length"]),
            "response_tone": str(row["response_tone"]),
            "response_speed_priority": str(row["response_speed_priority"]),
            "context_memory_depth": int(row["context_memory_depth"]),
            "is_active": bool(row["is_active"]),
        }
        for row in rows
    ]

    return {"ok": True, "employees": employees}


@app.post("/operations/ai-employees")
async def create_ai_employee(
    request: AIEmployeeCreateRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_employees_create",
    )

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO ai_employee_configs (
                owner_type, owner_id, name, role, language, tone, knowledge_base_reference,
                communication_style, response_length, response_tone, response_speed_priority,
                context_memory_depth, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                owner_type,
                owner_id,
                request.name.strip(),
                request.role.strip(),
                request.language,
                request.tone.strip(),
                (request.knowledge_base_reference or "").strip() or None,
                (request.communication_style or "Professional").strip(),
                (request.response_length or "Medium").strip(),
                (request.response_tone or request.tone or "Balanced").strip(),
                (request.response_speed_priority or "Balanced").strip(),
                int(request.context_memory_depth or 10),
            ),
        )
        employee_id = int(cursor.lastrowid)
        conn.commit()

    if owner_type == "web":
        account = _get_web_user_account(owner_id)
        _record_system_activity(
            event_type="ai_employee_created",
            message=f"AI employee created by {account['email']}",
            actor_user_id=int(account["id"]),
            actor_email=str(account["email"]),
            metadata={"employee_id": employee_id, "name": request.name.strip(), "role": request.role.strip()},
        )

    return {"ok": True, "id": employee_id}


@app.get("/operations/analytics")
async def get_operations_analytics(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="analytics",
        min_analytics_tier="advanced",
    )
    _ensure_operations_seed(owner_type, owner_id)

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ? AND date(mm.created_at) = date('now')
            """,
            (owner_type, owner_id),
        )
        messages_today = int(cursor.fetchone()[0])

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM monitored_conversations
            WHERE owner_type = ? AND owner_id = ? AND date(last_timestamp) = date('now')
            """,
            (owner_type, owner_id),
        )
        daily_conversations = int(cursor.fetchone()[0])

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM ai_employee_configs
            WHERE owner_type = ? AND owner_id = ? AND is_active = 1
            """,
            (owner_type, owner_id),
        )
        active_employees = int(cursor.fetchone()[0])

        if active_employees == 0:
            active_employees = 1

        cursor.execute(
            """
            SELECT
                SUM(CASE WHEN sender_type = 'ai' THEN 1 ELSE 0 END) AS ai_count,
                SUM(CASE WHEN sender_type = 'human' THEN 1 ELSE 0 END) AS human_count,
                AVG(CASE WHEN sender_type = 'ai' THEN confidence END) AS avg_confidence
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ?
            """,
            (owner_type, owner_id),
        )
        stats_row = cursor.fetchone()

        ai_count = int(stats_row["ai_count"] or 0)
        human_count = int(stats_row["human_count"] or 0)
        total_handled = ai_count + human_count
        automation_rate = int((ai_count / total_handled) * 100) if total_handled else 0

        avg_confidence = float(stats_row["avg_confidence"] or 0.74)
        average_response_seconds = max(10, int((1 - min(avg_confidence, 1.0)) * 90))
        human_takeover_rate = int((human_count / total_handled) * 100) if total_handled else 0

        cursor.execute(
            """
            SELECT date(mm.created_at) AS day, COUNT(*) AS count
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ?
            GROUP BY date(mm.created_at)
            ORDER BY day DESC
            LIMIT 7
            """,
            (owner_type, owner_id),
        )
        by_day_rows = list(reversed(cursor.fetchall()))

        cursor.execute(
            """
            SELECT date(mm.created_at) AS day,
                   SUM(CASE WHEN mm.sender_type = 'ai' THEN 1 ELSE 0 END) AS ai_count,
                   SUM(CASE WHEN mm.sender_type = 'human' THEN 1 ELSE 0 END) AS human_count
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ?
            GROUP BY date(mm.created_at)
            ORDER BY day DESC
            LIMIT 7
            """,
            (owner_type, owner_id),
        )
        success_rows = list(reversed(cursor.fetchall()))

        cursor.execute(
            """
            SELECT content, COUNT(*) AS cnt
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ? AND mm.sender_type = 'customer'
            GROUP BY content
            ORDER BY cnt DESC
            LIMIT 5
            """,
            (owner_type, owner_id),
        )
        top_questions_rows = cursor.fetchall()

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM monitored_conversations
            WHERE owner_type = ? AND owner_id = ?
              AND strftime('%Y-%m', last_timestamp) = strftime('%Y-%m', 'now')
            """,
            (owner_type, owner_id),
        )
        conversations_this_month = int(cursor.fetchone()[0])

        cursor.execute(
            """
            SELECT SUM(LENGTH(content))
            FROM monitored_messages mm
            JOIN monitored_conversations mc ON mc.id = mm.conversation_id
            WHERE mc.owner_type = ? AND mc.owner_id = ? AND mm.sender_type = 'ai'
              AND strftime('%Y-%m', mm.created_at) = strftime('%Y-%m', 'now')
            """,
            (owner_type, owner_id),
        )
        ai_chars_month = int(cursor.fetchone()[0] or 0)

    messages_per_day = [
        {"day": str(row["day"]), "count": int(row["count"])} for row in by_day_rows
    ]
    ai_vs_human = [
        {"name": "AI", "value": ai_count},
        {"name": "Human", "value": human_count},
    ]
    top_questions = [
        {"question": str(row["content"]), "count": int(row["cnt"])} for row in top_questions_rows
    ]
    automation_success_rate_over_time = []
    human_takeover_analysis = []
    for row in success_rows:
        ai_day = int(row["ai_count"] or 0)
        human_day = int(row["human_count"] or 0)
        total_day = ai_day + human_day
        success_rate = int((ai_day / total_day) * 100) if total_day else 0
        automation_success_rate_over_time.append({"day": str(row["day"]), "rate": success_rate})
        human_takeover_analysis.append({"day": str(row["day"]), "count": human_day})

    conversation_volume_trends = messages_per_day
    estimated_tokens = int(ai_chars_month / 4)
    estimated_cost = round((estimated_tokens / 1_000_000) * 2.0, 2)

    return {
        "ok": True,
        "cards": {
            "messages_handled_today": messages_today,
            "active_ai_employees": active_employees,
            "automation_rate": automation_rate,
            "average_response_time_seconds": average_response_seconds,
            "human_takeover_rate": human_takeover_rate,
            "daily_conversations": daily_conversations,
        },
        "usage": {
            "conversations_this_month": conversations_this_month,
            "tokens_used": estimated_tokens,
            "estimated_cost_usd": estimated_cost,
        },
        "charts": {
            "messages_per_day": messages_per_day,
            "ai_vs_human": ai_vs_human,
            "top_customer_questions": top_questions,
            "automation_success_rate_over_time": automation_success_rate_over_time,
            "conversation_volume_trends": conversation_volume_trends,
            "human_takeover_analysis": human_takeover_analysis,
        },
    }


@app.get("/ai/conversations")
async def list_ai_conversations(
    limit: int = 30,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    query = AIConversationListQuery(limit=limit)
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, COALESCE(last_message, '') AS last_message, updated_at
            FROM ai_chat_conversations
            WHERE owner_type = ? AND owner_id = ?
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (owner_type, owner_id, query.limit),
        )
        rows = cursor.fetchall()

    conversations = [
        {
            "id": str(row["id"]),
            "title": str(row["title"]),
            "last_message": str(row["last_message"]),
            "updated_at": str(row["updated_at"]),
        }
        for row in rows
    ]

    return {"ok": True, "conversations": conversations}


@app.get("/ai/conversations/{conversation_id}/messages")
async def get_ai_conversation_messages(
    conversation_id: str,
    limit: int = 30,
    before_id: Optional[int] = None,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    query = AIConversationMessagesQuery(limit=limit, before_id=before_id)
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id
            FROM ai_chat_conversations
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (conversation_id, owner_type, owner_id),
        )
        conversation = cursor.fetchone()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if query.before_id is None:
            cursor.execute(
                """
                SELECT id, role, content, created_at
                FROM ai_chat_messages
                WHERE conversation_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (conversation_id, query.limit),
            )
        else:
            cursor.execute(
                """
                SELECT id, role, content, created_at
                FROM ai_chat_messages
                WHERE conversation_id = ? AND id < ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (conversation_id, query.before_id, query.limit),
            )
        rows = cursor.fetchall()

    ordered_rows = list(reversed(rows))
    messages = [
        {
            "id": int(row["id"]),
            "role": str(row["role"]),
            "content": str(row["content"]),
            "created_at": str(row["created_at"]),
        }
        for row in ordered_rows
    ]

    has_more = len(rows) == query.limit
    return {
        "ok": True,
        "conversation_id": conversation_id,
        "messages": messages,
        "has_more": has_more,
    }


@app.patch("/ai/conversations/{conversation_id}")
async def rename_ai_conversation(
    conversation_id: str,
    request: AIConversationUpdateRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )
    title = " ".join(request.title.strip().split())
    if not title:
        raise HTTPException(status_code=400, detail="title must not be empty")

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE ai_chat_conversations
            SET title = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (title, conversation_id, owner_type, owner_id),
        )
        conn.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {"ok": True, "id": conversation_id, "title": title}


@app.delete("/ai/conversations/{conversation_id}")
async def delete_ai_conversation(
    conversation_id: str,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type, owner_id = _get_authenticated_actor(authorization)
    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id
            FROM ai_chat_conversations
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (conversation_id, owner_type, owner_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Conversation not found")

        cursor.execute(
            """
            DELETE FROM ai_chat_messages
            WHERE conversation_id = ?
            """,
            (conversation_id,),
        )
        cursor.execute(
            """
            DELETE FROM ai_chat_conversations
            WHERE id = ? AND owner_type = ? AND owner_id = ?
            """,
            (conversation_id, owner_type, owner_id),
        )
        conn.commit()

    return {"ok": True, "id": conversation_id}


@app.post("/ai/chat")
async def ai_chat(
    request: AIChatRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    owner_type: Optional[str] = None
    owner_id: Optional[int] = None
    if authorization:
        owner_type, owner_id = _get_authenticated_actor(authorization)

    message_text = request.message.strip()
    if not message_text:
        raise HTTPException(status_code=400, detail="message must not be empty")

    conversation_id = request.conversation_id.strip() if request.conversation_id else ""

    # Public AI page requests may not have auth; return localized response without persistence.
    if not owner_type or owner_id is None:
        ai_result = generate_ai_response(message_text, request.language)
        return {
            "reply": ai_result.text,
        }

    _require_feature_access(
        owner_type=owner_type,
        owner_id=owner_id,
        feature="ai_chat",
    )

    selected_employee = _pick_ai_employee(owner_type, owner_id, message_text)

    ai_text, ai_confidence = _generate_trained_ai_response(
        owner_type=owner_type,
        owner_id=owner_id,
        message_text=message_text,
        language=request.language,
    )
    ai_text = _shape_response_text(
        ai_text,
        str(selected_employee.get("response_length", "Medium")),
        str(selected_employee.get("response_speed_priority", "Balanced")),
    )

    now = time.strftime("%Y-%m-%d %H:%M:%S")

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        if conversation_id:
            cursor.execute(
                """
                SELECT id FROM ai_chat_conversations
                WHERE id = ? AND owner_type = ? AND owner_id = ?
                """,
                (conversation_id, owner_type, owner_id),
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            conversation_id = f"conv_{uuid.uuid4().hex[:14]}"
            cursor.execute(
                """
                INSERT INTO ai_chat_conversations (id, owner_type, owner_id, title, last_message)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    conversation_id,
                    owner_type,
                    owner_id,
                    _truncate_title(message_text),
                    message_text,
                ),
            )

        cursor.execute(
            """
            INSERT INTO ai_chat_messages (conversation_id, role, content)
            VALUES (?, 'user', ?)
            """,
            (conversation_id, message_text),
        )
        cursor.execute(
            """
            INSERT INTO ai_chat_messages (conversation_id, role, content)
            VALUES (?, 'ai', ?)
            """,
            (conversation_id, ai_text),
        )
        cursor.execute(
            """
            UPDATE ai_chat_conversations
            SET last_message = ?, updated_at = ?
            WHERE id = ?
            """,
            (message_text, now, conversation_id),
        )

        # Mirror interactions into operations monitoring stream.
        cursor.execute(
            """
            INSERT OR IGNORE INTO monitored_conversations (
                id, owner_type, owner_id, customer_handle, customer_name,
                last_message, last_timestamp, unread_count, taken_over, assigned_employee_id
            )
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0, 0, ?)
            """,
            (
                conversation_id,
                owner_type,
                owner_id,
                "@customer",
                "Telegram Customer",
                message_text,
                selected_employee.get("id"),
            ),
        )
        cursor.execute(
            """
            INSERT INTO monitored_messages (conversation_id, sender_type, content, confidence)
            VALUES (?, 'customer', ?, NULL)
            """,
            (conversation_id, message_text),
        )
        cursor.execute(
            """
            INSERT INTO monitored_messages (conversation_id, sender_type, content, confidence)
            VALUES (?, 'ai', ?, ?)
            """,
            (conversation_id, ai_text, ai_confidence),
        )
        cursor.execute(
            """
            UPDATE monitored_conversations
            SET last_message = ?, last_timestamp = CURRENT_TIMESTAMP, unread_count = unread_count + 1,
                assigned_employee_id = COALESCE(assigned_employee_id, ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (message_text, selected_employee.get("id"), conversation_id),
        )
        conn.commit()

    return {
        "reply": ai_text,
        "conversation_id": conversation_id,
        "assigned_employee": {
            "id": selected_employee.get("id"),
            "name": selected_employee.get("name"),
            "role": selected_employee.get("role"),
        },
    }
