import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

DB_PATH = Path(__file__).resolve().parent / "worklab.db"


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, sql_type: str) -> None:
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table})")
    existing_columns = {str(row[1]) for row in cursor.fetchall()}
    if column in existing_columns:
        return

    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}")


def init_database() -> None:
    """Initialize a minimal schema for WorkLab backend data."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                role TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS telegram_bot_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                bot_token TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                chat_id TEXT NOT NULL,
                user_message TEXT,
                ai_response TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                photo_url TEXT,
                language_code TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS web_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS web_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_chat_conversations (
                id TEXT PRIMARY KEY,
                owner_type TEXT NOT NULL,
                owner_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                last_message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES ai_chat_conversations(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_owner
            ON ai_chat_conversations(owner_type, owner_id, updated_at)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation
            ON ai_chat_messages(conversation_id, id)
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_base_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_type TEXT NOT NULL,
                owner_id INTEGER NOT NULL,
                business_description TEXT,
                products_services TEXT,
                delivery_rules TEXT,
                working_hours TEXT,
                pricing_information TEXT,
                faq TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(owner_type, owner_id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_employee_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_type TEXT NOT NULL,
                owner_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'en',
                tone TEXT NOT NULL DEFAULT 'friendly',
                knowledge_base_reference TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS monitored_conversations (
                id TEXT PRIMARY KEY,
                owner_type TEXT NOT NULL,
                owner_id INTEGER NOT NULL,
                customer_handle TEXT,
                customer_name TEXT,
                last_message TEXT,
                last_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                unread_count INTEGER NOT NULL DEFAULT 0,
                taken_over INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS monitored_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                sender_type TEXT NOT NULL,
                content TEXT NOT NULL,
                confidence REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES monitored_conversations(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_corrections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_type TEXT NOT NULL,
                owner_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                corrected_answer TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS billing_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plan TEXT NOT NULL,
                amount_usd INTEGER NOT NULL,
                currency TEXT NOT NULL DEFAULT 'USD',
                status TEXT NOT NULL,
                provider TEXT NOT NULL DEFAULT 'stripe',
                provider_session_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plan TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                provider TEXT NOT NULL DEFAULT 'stripe',
                provider_session_id TEXT,
                checkout_url TEXT,
                metadata_json TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS platform_feature_flags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                feature_key TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS system_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                message TEXT NOT NULL,
                actor_user_id INTEGER,
                actor_email TEXT,
                metadata_json TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (actor_user_id) REFERENCES web_users(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_monitored_conversations_owner
            ON monitored_conversations(owner_type, owner_id, updated_at)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_monitored_messages_conversation
            ON monitored_messages(conversation_id, id)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_corrections_owner
            ON ai_corrections(owner_type, owner_id, id)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_system_activity_created_at
            ON system_activity(created_at DESC, id DESC)
            """
        )

        cursor.execute(
            """
            INSERT OR IGNORE INTO platform_feature_flags (feature_key, display_name, enabled)
            VALUES
                ('ai_chat', 'AI Chat', 1),
                ('ai_employees', 'AI Employees', 1),
                ('telegram_integration', 'Telegram Integration', 1),
                ('analytics_dashboard', 'Analytics Dashboard', 1),
                ('knowledge_base', 'Knowledge Base', 1)
            """
        )

        # Handle existing databases created before profile fields existed.
        _ensure_column(conn, "users", "last_name", "TEXT")
        _ensure_column(conn, "users", "photo_url", "TEXT")
        _ensure_column(conn, "web_users", "role", "TEXT DEFAULT 'user'")
        _ensure_column(conn, "web_users", "subscription_status", "TEXT DEFAULT 'inactive'")
        _ensure_column(conn, "web_users", "subscription_plan", "TEXT")
        _ensure_column(conn, "web_users", "subscription_expiry", "TEXT")
        _ensure_column(conn, "web_users", "payment_method_last4", "TEXT")
        _ensure_column(conn, "web_users", "payment_method_brand", "TEXT")

        conn.commit()


@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()
