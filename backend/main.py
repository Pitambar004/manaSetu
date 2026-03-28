"""
ManaSetu API — FastAPI application deployed on Modal.

Run locally (no Modal):
  cd backend && uvicorn main:api --reload --port 8000

Deploy / dev tunnel on Modal:
  modal serve main.py    # ephemeral URL, hot reload
  modal deploy main.py   # persistent production endpoint

Environment (set via Modal Secrets or .env for local dev):
  GEMINI_API_KEY
  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (when you add auth)
  GOOGLE_CALENDAR_* (OAuth tokens when Calendar sync is implemented)
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

import modal

# ---------------------------------------------------------------------------
# Modal image: everything the container needs at runtime
# ---------------------------------------------------------------------------
mana_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    # If you add local packages, mount them with .add_local_dir(...)
)

# Single Modal App; image defaults for all functions unless overridden
app = modal.App("mana-setu", image=mana_image)


def _build_fastapi() -> Any:
    """Construct FastAPI app inside the function body so imports resolve in the container."""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    @asynccontextmanager
    async def lifespan(web_app: FastAPI):
        # Startup: clients, caches, DB pools (Supabase) go here
        yield
        # Shutdown

    web_app = FastAPI(
        title="ManaSetu API",
        description="Career map + burnout signals for students and professionals.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Frontend (Vite dev server or static host) — tighten origins in production
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @web_app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "mana-setu"}

    @web_app.get("/api/career-map/sample")
    async def sample_career_map() -> dict[str, list[dict[str, Any]]]:
        """
        Example payload matching the React Flow shape the frontend expects.
        Replace with Gemini-structured JSON + DB lookup in production.
        """
        nodes = [
            {
                "id": "1",
                "type": "default",
                "position": {"x": 0, "y": 0},
                "data": {
                    "label": "Current: Student",
                    "role": "Student",
                    "timelineMonths": 0,
                    "readiness": 1.0,
                    "stressLevel": "low",
                },
            },
            {
                "id": "2",
                "position": {"x": 280, "y": -40},
                "data": {
                    "label": "Internship",
                    "role": "Intern",
                    "timelineMonths": 6,
                    "readiness": 0.7,
                    "stressLevel": "medium",
                },
            },
            {
                "id": "3",
                "position": {"x": 280, "y": 120},
                "data": {
                    "label": "Grad role",
                    "role": "Junior Engineer",
                    "timelineMonths": 18,
                    "readiness": 0.4,
                    "stressLevel": "high",
                },
            },
        ]
        edges = [
            {"id": "e1-2", "source": "1", "target": "2"},
            {"id": "e2-3", "source": "2", "target": "3"},
        ]
        return {"nodes": nodes, "edges": edges}

    return web_app


# ASGI app for local development: `uvicorn main:api` (Modal keeps `app` = modal.App)
api = _build_fastapi()


# ---------------------------------------------------------------------------
# Modal web function: full ASGI app behind @app.function()
# ---------------------------------------------------------------------------
@app.function(
    # secrets=[
    #     modal.Secret.from_name("mana-setu-secrets"),  # GEMINI_API_KEY, etc.
    # ],
    timeout=120,
)
@modal.concurrent(max_inputs=100)
@modal.asgi_app()
def http_api() -> Any:
    """
    Modal entrypoint for the HTTP API.

    `modal serve main.py` exposes this ASGI app at a *.modal.run URL.
    """
    return _build_fastapi()


if __name__ == "__main__":
    # Quick local run without remembering the uvicorn module path
    import uvicorn

    uvicorn.run(api, host="0.0.0.0", port=8000)
