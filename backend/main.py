"""
ManaSetu (CareerPulse) API — FastAPI on Modal.

Local dev:  cd backend && uvicorn main:api --reload --port 8000
Modal dev:  modal serve main.py
Deploy:     modal deploy main.py

Secrets (Modal dashboard → Secrets → mana-setu-secrets):
  GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import modal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Modal image
# ---------------------------------------------------------------------------
mana_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
)

app = modal.App("mana-setu", image=mana_image)

# ---------------------------------------------------------------------------
# Supabase helper
# ---------------------------------------------------------------------------
_supabase_client = None


def _get_supabase():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key or "your_" in url or "your_" in key:
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(url, key)
        return _supabase_client
    except Exception as e:
        print(f"Supabase init failed: {e}")
        return None


# ---------------------------------------------------------------------------
# In-memory fallback (used when Supabase isn't configured)
# ---------------------------------------------------------------------------
_users_mem: dict[str, dict] = {}
_burnout_mem: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class OnboardRequest(BaseModel):
    major: str
    skills: list[str]
    interests: list[str]


class BurnoutCheckinRequest(BaseModel):
    user_id: str
    answers: list[int]  # 5 answers, each 1-5


class CareerMapRequest(BaseModel):
    user_id: str


# ---------------------------------------------------------------------------
# Burnout scoring
# ---------------------------------------------------------------------------
def _compute_burnout(answers: list[int]) -> dict:
    if not answers:
        return {"score": 0, "zone": "healthy"}
    raw = sum(answers) / (len(answers) * 5)
    score = round(raw * 100)
    if score <= 35:
        zone = "healthy"
    elif score <= 65:
        zone = "early_warning"
    else:
        zone = "risk"
    return {"score": score, "zone": zone}


# ---------------------------------------------------------------------------
# Gemini prompt
# ---------------------------------------------------------------------------
GEMINI_CAREER_PROMPT = """You are CareerPulse AI. Given the user profile below, generate a personalized career roadmap as a directed graph.

User Profile:
- Major: {major}
- Skills: {skills}
- Career Interests: {interests}
- Current Burnout Zone: {burnout_zone}

Rules:
1. Generate 6-8 career milestone nodes forming 2-3 branching paths.
2. The first node is always the user's current state (label: "Current: Student").
3. Each node must have: id (string number starting from "1"), position (object with x, y integers - space ~280px apart horizontally, vary y between -60 and 280), and a data object.
4. Node data fields: label (short title, NO emojis), role (job title), timelineMonths (integer), readiness (0.0-1.0 float), stressLevel ("low"|"medium"|"high"), description (1 sentence career advice, NO emojis).
5. If burnout_zone is "risk", include MORE low-stress, short-timeline nodes (e.g. "Update Resume", "Coffee Chat", "1-Day Workshop").
6. If burnout_zone is "healthy", include ambitious longer-term paths too.
7. Edges connect nodes logically. Each edge: id (e.g. "e1-2"), source (string), target (string).
8. Do NOT use any emojis anywhere.

Return ONLY valid JSON (no markdown fences, no extra text):
{{"nodes": [...], "edges": [...]}}"""

# ---------------------------------------------------------------------------
# Fallback career map (no emojis)
# ---------------------------------------------------------------------------
FALLBACK_CAREER_MAP: dict[str, Any] = {
    "nodes": [
        {
            "id": "1",
            "type": "default",
            "position": {"x": 0, "y": 80},
            "data": {
                "label": "Current: Student",
                "role": "Student",
                "timelineMonths": 0,
                "readiness": 1.0,
                "stressLevel": "low",
                "description": "You are here. Let's map out your future.",
            },
        },
        {
            "id": "2",
            "position": {"x": 300, "y": 0},
            "data": {
                "label": "Update Resume",
                "role": "Job Seeker",
                "timelineMonths": 1,
                "readiness": 0.9,
                "stressLevel": "low",
                "description": "Polish your resume with your latest projects and skills.",
            },
        },
        {
            "id": "3",
            "position": {"x": 300, "y": 160},
            "data": {
                "label": "Coffee Chats",
                "role": "Networker",
                "timelineMonths": 1,
                "readiness": 0.85,
                "stressLevel": "low",
                "description": "Reach out to 3 professionals in your field for informal chats.",
            },
        },
        {
            "id": "4",
            "position": {"x": 600, "y": -40},
            "data": {
                "label": "Internship",
                "role": "Intern",
                "timelineMonths": 6,
                "readiness": 0.65,
                "stressLevel": "medium",
                "description": "Apply for summer internships to gain real-world experience.",
            },
        },
        {
            "id": "5",
            "position": {"x": 600, "y": 120},
            "data": {
                "label": "Side Project",
                "role": "Builder",
                "timelineMonths": 3,
                "readiness": 0.7,
                "stressLevel": "medium",
                "description": "Build a portfolio project showcasing your strongest skill.",
            },
        },
        {
            "id": "6",
            "position": {"x": 600, "y": 260},
            "data": {
                "label": "Online Course",
                "role": "Learner",
                "timelineMonths": 2,
                "readiness": 0.8,
                "stressLevel": "low",
                "description": "Take a free course to level up a skill gap.",
            },
        },
        {
            "id": "7",
            "position": {"x": 900, "y": 40},
            "data": {
                "label": "Junior Role",
                "role": "Junior Developer",
                "timelineMonths": 12,
                "readiness": 0.4,
                "stressLevel": "medium",
                "description": "Land your first full-time role with your new skills and experience.",
            },
        },
        {
            "id": "8",
            "position": {"x": 900, "y": 200},
            "data": {
                "label": "Grad School",
                "role": "Graduate Student",
                "timelineMonths": 24,
                "readiness": 0.3,
                "stressLevel": "high",
                "description": "Consider graduate studies if you want to specialize or research.",
            },
        },
    ],
    "edges": [
        {"id": "e1-2", "source": "1", "target": "2"},
        {"id": "e1-3", "source": "1", "target": "3"},
        {"id": "e2-4", "source": "2", "target": "4"},
        {"id": "e2-5", "source": "2", "target": "5"},
        {"id": "e3-5", "source": "3", "target": "5"},
        {"id": "e3-6", "source": "3", "target": "6"},
        {"id": "e4-7", "source": "4", "target": "7"},
        {"id": "e5-7", "source": "5", "target": "7"},
        {"id": "e6-8", "source": "6", "target": "8"},
    ],
}


# ---------------------------------------------------------------------------
# FastAPI builder
# ---------------------------------------------------------------------------
def _build_fastapi() -> Any:

    @asynccontextmanager
    async def lifespan(web_app: FastAPI):
        yield

    web_app = FastAPI(
        title="ManaSetu API",
        description="Career map + burnout signals for students and professionals.",
        version="0.1.0",
        lifespan=lifespan,
    )

    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=os.environ.get(
            "CORS_ORIGINS", "http://localhost:5173"
        ).split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health ──────────────────────────────────────────────────────
    @web_app.get("/health")
    async def health():
        sb = _get_supabase()
        return {
            "status": "ok",
            "service": "mana-setu",
            "supabase": "connected" if sb else "not configured",
            "gemini": "configured" if os.environ.get("GEMINI_API_KEY", "") not in ("", "your_gemini_api_key_here") else "not configured",
        }

    # ── Onboarding ──────────────────────────────────────────────────
    @web_app.post("/api/onboard")
    async def onboard(req: OnboardRequest):
        user_id = str(uuid.uuid4())
        profile = {
            "major": req.major,
            "skills": req.skills,
            "interests": req.interests,
        }

        sb = _get_supabase()
        if sb:
            try:
                sb.table("users").insert({
                    "id": user_id,
                    "major": req.major,
                    "skills": req.skills,
                    "interests": req.interests,
                    "burnout_score": 0,
                    "burnout_zone": "healthy",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
            except Exception as e:
                print(f"Supabase insert error: {e}")
                # Fall back to in-memory
                _users_mem[user_id] = profile
                _burnout_mem[user_id] = {"score": 0, "zone": "healthy"}
        else:
            _users_mem[user_id] = profile
            _burnout_mem[user_id] = {"score": 0, "zone": "healthy"}

        return {"user_id": user_id, "profile": profile}

    # ── Burnout Check-in ────────────────────────────────────────────
    @web_app.post("/api/burnout/checkin")
    async def burnout_checkin(req: BurnoutCheckinRequest):
        result = _compute_burnout(req.answers)

        sb = _get_supabase()
        if sb:
            try:
                # Update user record
                sb.table("users").update({
                    "burnout_score": result["score"],
                    "burnout_zone": result["zone"],
                }).eq("id", req.user_id).execute()

                # Log the checkin
                sb.table("burnout_checkins").insert({
                    "user_id": req.user_id,
                    "answers": req.answers,
                    "score": result["score"],
                    "zone": result["zone"],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
            except Exception as e:
                print(f"Supabase burnout update error: {e}")
                _burnout_mem[req.user_id] = result
        else:
            _burnout_mem[req.user_id] = result

        return result

    # ── Get burnout ─────────────────────────────────────────────────
    @web_app.get("/api/burnout/{user_id}")
    async def get_burnout(user_id: str):
        sb = _get_supabase()
        if sb:
            try:
                res = sb.table("users").select("burnout_score, burnout_zone").eq("id", user_id).single().execute()
                return {"score": res.data["burnout_score"], "zone": res.data["burnout_zone"]}
            except Exception:
                pass
        return _burnout_mem.get(user_id, {"score": 0, "zone": "healthy"})

    # ── Generate career map ─────────────────────────────────────────
    @web_app.post("/api/career-map/generate")
    async def generate_career_map(req: CareerMapRequest):
        # Get profile
        profile = None
        sb = _get_supabase()
        if sb:
            try:
                res = sb.table("users").select("*").eq("id", req.user_id).single().execute()
                profile = {
                    "major": res.data["major"],
                    "skills": res.data["skills"],
                    "interests": res.data["interests"],
                }
                burnout = {
                    "score": res.data.get("burnout_score", 0),
                    "zone": res.data.get("burnout_zone", "healthy"),
                }
            except Exception as e:
                print(f"Supabase fetch error: {e}")

        if not profile:
            profile = _users_mem.get(req.user_id)
            burnout = _burnout_mem.get(req.user_id, {"score": 0, "zone": "healthy"})

        if not profile:
            raise HTTPException(status_code=404, detail="User not found. Onboard first.")

        zone = burnout["zone"]
        api_key = os.environ.get("GEMINI_API_KEY", "")

        # Try Gemini
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                from google import genai

                client = genai.Client(api_key=api_key)
                prompt = GEMINI_CAREER_PROMPT.format(
                    major=profile["major"],
                    skills=", ".join(profile["skills"]),
                    interests=", ".join(profile["interests"]),
                    burnout_zone=zone,
                )
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                )
                text = response.text.strip()
                if text.startswith("```"):
                    text = text.split("\n", 1)[1]
                if text.endswith("```"):
                    text = text.rsplit("```", 1)[0]
                if text.startswith("json"):
                    text = text[4:].strip()

                career_data = json.loads(text)
                return {
                    "nodes": career_data["nodes"],
                    "edges": career_data["edges"],
                    "burnout": burnout,
                    "source": "gemini",
                }
            except Exception as e:
                print(f"Gemini error, using fallback: {e}")

        return {
            **FALLBACK_CAREER_MAP,
            "burnout": burnout,
            "source": "fallback",
        }

    # ── Legacy sample ───────────────────────────────────────────────
    @web_app.get("/api/career-map/sample")
    async def sample_career_map():
        return FALLBACK_CAREER_MAP

    return web_app


# ASGI app for local dev
api = _build_fastapi()


# ---------------------------------------------------------------------------
# Modal web function
# ---------------------------------------------------------------------------
@app.function(
    secrets=[
        modal.Secret.from_name("mana-setu-secrets"),
    ],
    timeout=120,
)
@modal.concurrent(max_inputs=100)
@modal.asgi_app()
def http_api() -> Any:
    return _build_fastapi()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api, host="0.0.0.0", port=8000)
