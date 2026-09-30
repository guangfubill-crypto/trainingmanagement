"""Frozen local server entry point. Never used by the cloud deployment."""
import json
import os
import socket
import sys
import threading
from pathlib import Path


def main():
    data_dir = Path(os.environ["TRAINING_DATA_DIR"]).resolve()
    data_dir.mkdir(parents=True, exist_ok=True)
    static_dir = Path(os.environ["TRAINING_STATIC_DIR"]).resolve()
    if not (static_dir / "index.html").is_file():
        raise RuntimeError("Missing frontend resources")
    if len(os.environ.get("DESKTOP_KEY", "")) < 32:
        raise RuntimeError("Missing desktop launch credential")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    os.environ["DATABASE_URL"] = "sqlite:///" + (data_dir / "training.db").as_posix()
    os.environ["DESKTOP_MODE"] = "true"
    os.environ["STATIC_DIR"] = str(static_dir)
    os.environ["ALLOWED_ORIGINS"] = json.dumps([f"http://127.0.0.1:{port}"])
    os.environ["COOKIE_SECURE"] = "false"
    from app.main import app
    import uvicorn
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))

    def watch_parent():
        sys.stdin.buffer.read()
        server.should_exit = True

    threading.Thread(target=watch_parent, daemon=True).start()
    print(json.dumps({"port": port}), flush=True)
    try:
        server.run(sockets=[sock])
    finally:
        sock.close()


if __name__ == "__main__":
    main()
