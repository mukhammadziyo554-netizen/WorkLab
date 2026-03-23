import atexit
import json
import os
import signal
import subprocess
import sys
import time
from typing import Optional
from urllib import error, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCK_FILE_PATH = os.path.join(BASE_DIR, ".run_backend.lock")


def _load_dotenv(dotenv_path: Optional[str] = None) -> None:
    if dotenv_path is None:
        dotenv_path = os.path.join(BASE_DIR, ".env")

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

            if key and key not in os.environ:
                os.environ[key] = value


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
                f"Another backend supervisor is already running (PID {existing_pid})."
            )

        _release_instance_lock()

    with open(LOCK_FILE_PATH, "w", encoding="utf-8") as lock_file:
        lock_file.write(str(os.getpid()))

    atexit.register(_release_instance_lock)


def _health_url(host: str, port: int) -> str:
    probe_host = host if host not in {"0.0.0.0", "::"} else "127.0.0.1"
    return f"http://{probe_host}:{port}/health"


def _is_backend_healthy(host: str, port: int) -> bool:
    url = _health_url(host, port)
    req = request.Request(url=url, method="GET")

    try:
        with request.urlopen(req, timeout=2.0) as response:
            if response.status != 200:
                return False

            raw = response.read().decode("utf-8")
            data = json.loads(raw)
            return bool(data.get("ok"))
    except (error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return False


def _build_uvicorn_command(host: str, port: int, reload_enabled: bool) -> list[str]:
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--app-dir",
        BASE_DIR,
        "--host",
        host,
        "--port",
        str(port),
    ]

    if reload_enabled:
        command.append("--reload")

    return command


def run_backend_supervisor() -> None:
    _load_dotenv()
    _acquire_instance_lock()

    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    reload_enabled = os.getenv("BACKEND_RELOAD", "0").strip().lower() in {
        "1",
        "true",
        "yes",
    }
    restart_delay_sec = float(os.getenv("BACKEND_RESTART_DELAY_SEC", "2.0"))
    max_restart_delay_sec = float(os.getenv("BACKEND_MAX_RESTART_DELAY_SEC", "8.0"))

    if _is_backend_healthy(host, port):
        print(f"Backend already healthy at {_health_url(host, port)}")
        return

    stop_requested = False

    def _handle_signal(signum: int, _frame: object) -> None:
        nonlocal stop_requested
        print(f"Received signal {signum}. Stopping backend supervisor...")
        stop_requested = True

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    backoff = restart_delay_sec

    while not stop_requested:
        command = _build_uvicorn_command(host, port, reload_enabled)
        print("Starting backend:", " ".join(command))

        process = subprocess.Popen(command, cwd=BASE_DIR)

        while not stop_requested:
            exit_code = process.poll()
            if exit_code is not None:
                break
            time.sleep(0.4)

        if stop_requested and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            break

        exit_code = process.returncode if process.returncode is not None else 1

        if exit_code == 0:
            print("Backend exited cleanly. Supervisor stopped.")
            break

        print(f"Backend crashed with exit code {exit_code}. Restarting in {backoff:.1f}s...")
        time.sleep(backoff)
        backoff = min(backoff * 1.5, max_restart_delay_sec)


if __name__ == "__main__":
    run_backend_supervisor()
