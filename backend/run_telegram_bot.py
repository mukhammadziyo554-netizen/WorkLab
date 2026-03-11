import atexit
import json
import os
import time
from typing import Any, Optional
from urllib import error, parse, request

TELEGRAM_API_BASE = "https://api.telegram.org"
REQUIRED_ENV_KEYS = ["TELEGRAM_BOT_TOKEN", "WORKLAB_WEBAPP_URL", "APP_PUBLIC_URL"]
LOCK_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".run_telegram_bot.lock")


def _load_dotenv(dotenv_path: Optional[str] = None) -> None:
    if dotenv_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        dotenv_path = os.path.join(base_dir, ".env")

    if not os.path.exists(dotenv_path):
        return

    with open(dotenv_path, "r", encoding="utf-8") as dotenv_file:
        for raw_line in dotenv_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            # Keep explicit shell env values as highest priority.
            if key and key not in os.environ:
                os.environ[key] = value


def _get_env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if value is None or value.strip() == "":
        raise RuntimeError(f"Environment variable {name} is required")
    return value


def _validate_required_env() -> None:
    missing = [key for key in REQUIRED_ENV_KEYS if not os.getenv(key, "").strip()]
    if not missing:
        return

    print("Missing required configuration keys:")
    for key in missing:
        print(f"- {key}")
    print("Create backend/.env from backend/.env.example and set the values.")
    raise RuntimeError("Bot configuration is incomplete")


def _validate_http_url(name: str, value: str) -> None:
    parsed_url = parse.urlparse(value)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise RuntimeError(
            f"{name} must be a valid absolute URL starting with http:// or https://"
        )


def _normalize_url(value: str) -> str:
    stripped = value.strip()
    parsed_url = parse.urlparse(stripped)

    # Keep scheme://host intact and remove redundant trailing slash from path.
    normalized_path = parsed_url.path.rstrip("/")

    return parse.urlunparse(
        (
            parsed_url.scheme,
            parsed_url.netloc,
            normalized_path,
            parsed_url.params,
            parsed_url.query,
            parsed_url.fragment,
        )
    )


def _validate_worklab_webapp_url(value: str) -> None:
    parsed_url = parse.urlparse(value)
    host = (parsed_url.hostname or "").lower()

    if parsed_url.scheme != "https":
        raise RuntimeError(
            "WORKLAB_WEBAPP_URL must use https for Telegram Mini App. Use your deployed public frontend URL."
        )

    if host in {"localhost", "127.0.0.1", "0.0.0.0"}:
        raise RuntimeError(
            "WORKLAB_WEBAPP_URL cannot point to localhost. Use a public HTTPS URL."
        )

    if "your-worklab-domain.com" in value:
        raise RuntimeError(
            "WORKLAB_WEBAPP_URL still contains placeholder domain. Set your real deployed URL."
        )


def _process_exists(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def _release_instance_lock() -> None:
    if os.path.exists(LOCK_FILE_PATH):
        try:
            os.remove(LOCK_FILE_PATH)
        except OSError:
            pass


def _acquire_instance_lock() -> None:
    if os.path.exists(LOCK_FILE_PATH):
        try:
            with open(LOCK_FILE_PATH, "r", encoding="utf-8") as lock_file:
                existing_pid = int(lock_file.read().strip())
        except (OSError, ValueError):
            existing_pid = -1

        if existing_pid > 0 and _process_exists(existing_pid):
            raise RuntimeError(
                f"Another bot instance is already running (PID {existing_pid}). Stop it before starting a new one."
            )

        _release_instance_lock()

    with open(LOCK_FILE_PATH, "w", encoding="utf-8") as lock_file:
        lock_file.write(str(os.getpid()))

    atexit.register(_release_instance_lock)


def _telegram_api_call(bot_token: str, method: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{TELEGRAM_API_BASE}/bot{bot_token}/{method}"
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")

    parsed = json.loads(raw)
    if not parsed.get("ok"):
        raise RuntimeError(f"Telegram API error on {method}: {parsed}")
    return parsed


def _set_chat_menu_button(
    bot_token: str,
    webapp_url: str,
    chat_id: Optional[int] = None,
) -> None:
    normalized_webapp_url = _normalize_url(webapp_url)
    payload: dict[str, Any] = {
        "menu_button": {
            "type": "web_app",
            "text": "Open WorkLab",
            "web_app": {"url": normalized_webapp_url},
        }
    }
    if chat_id is not None:
        payload["chat_id"] = chat_id

    _telegram_api_call(bot_token, "setChatMenuButton", payload)


def _send_start_hint(bot_token: str, chat_id: int) -> None:
    _telegram_api_call(
        bot_token,
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": "Use the Open WorkLab menu button to launch the Mini App.",
        },
    )


def _send_text(bot_token: str, chat_id: int, text: str) -> None:
    _telegram_api_call(
        bot_token,
        "sendMessage",
        {"chat_id": chat_id, "text": text},
    )


def _forward_update_to_backend(backend_webhook_url: str, update: dict[str, Any]) -> Optional[dict[str, Any]]:
    body = json.dumps(update).encode("utf-8")
    req = request.Request(
        url=backend_webhook_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
        return json.loads(raw)
    except error.URLError:
        return None


def _handle_backend_payload(bot_token: str, fallback_chat_id: int, backend_response: Optional[dict[str, Any]]) -> None:
    if not backend_response:
        _send_text(bot_token, fallback_chat_id, "Backend is unavailable right now.")
        return

    send_payload = backend_response.get("telegram_send_payload")
    if not isinstance(send_payload, dict):
        return

    method = send_payload.get("method", "sendMessage")
    if method != "sendMessage":
        return

    if "chat_id" not in send_payload:
        send_payload["chat_id"] = fallback_chat_id

    _telegram_api_call(bot_token, "sendMessage", send_payload)


def run_bot() -> None:
    _load_dotenv()
    _validate_required_env()
    _acquire_instance_lock()

    bot_token = _get_env("TELEGRAM_BOT_TOKEN")
    app_public_url = _normalize_url(_get_env("APP_PUBLIC_URL"))
    worklab_webapp_url = _normalize_url(_get_env("WORKLAB_WEBAPP_URL"))
    backend_webhook_url = _normalize_url(
        os.getenv("BACKEND_WEBHOOK_URL", f"{app_public_url}/telegram/webhook")
    )
    poll_timeout = int(os.getenv("BOT_POLL_TIMEOUT_SEC", "30"))

    _validate_http_url("WORKLAB_WEBAPP_URL", worklab_webapp_url)
    _validate_http_url("BACKEND_WEBHOOK_URL", backend_webhook_url)
    _validate_worklab_webapp_url(worklab_webapp_url)

    _set_chat_menu_button(bot_token, worklab_webapp_url)

    offset: Optional[int] = None

    print("Telegram bot started.")
    print(f"Mini App URL: {worklab_webapp_url}")
    print(f"Backend webhook URL: {backend_webhook_url}")

    while True:
        payload: dict[str, Any] = {"timeout": poll_timeout}
        if offset is not None:
            payload["offset"] = offset

        try:
            updates_response = _telegram_api_call(bot_token, "getUpdates", payload)
            updates = updates_response.get("result", [])
            if not isinstance(updates, list):
                time.sleep(1)
                continue

            for update in updates:
                update_id = update.get("update_id")
                if isinstance(update_id, int):
                    offset = update_id + 1

                message = update.get("message")
                if not isinstance(message, dict):
                    continue

                chat = message.get("chat")
                text = message.get("text")
                if not isinstance(chat, dict) or not isinstance(text, str):
                    continue

                chat_id = chat.get("id")
                if not isinstance(chat_id, int):
                    continue

                normalized = text.strip().lower()
                if normalized in {"/start", "start", "/menu", "open", "open worklab"}:
                    _set_chat_menu_button(bot_token, worklab_webapp_url, chat_id=chat_id)
                    _send_start_hint(bot_token, chat_id)
                    continue

                backend_response = _forward_update_to_backend(backend_webhook_url, update)
                _handle_backend_payload(bot_token, chat_id, backend_response)
        except KeyboardInterrupt:
            print("\nBot stopped.")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"Bot loop error: {exc}")
            time.sleep(2)


if __name__ == "__main__":
    run_bot()
