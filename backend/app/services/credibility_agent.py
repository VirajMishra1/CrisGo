"""
Credibility scoring pipeline for incident verification.

Architecture:
  1. Deterministic base score from source weights + corroboration
  2. Ensemble LLM scoring — all 5 prompt versions run, weighted median
  3. Gemini web grounding — real-time verification via google_search tool
  4. Temporal decay — stale reports fade in confidence
  5. Cross-source corroboration bonus

No LangGraph dependency. Uses google-generativeai SDK directly.
"""

import json
import math
import statistics
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


SOURCE_WEIGHTS = {
    # Government / official agencies — highest trust
    "NYPD": 1.0,
    "FDNY": 0.95,
    "NYC DOT": 0.9,
    "NYC OEM": 0.9,
    "USGS": 1.0,
    "National Weather Service": 1.0,
    "GDACS": 0.95,
    "NYC 311 Open Data": 0.85,
    "MTA": 0.85,
    # Major local news — high trust
    "CBS New York": 0.85,
    "NBC New York": 0.85,
    "ABC7NY": 0.85,
    "Gothamist": 0.8,
    "NY1": 0.8,
    "Google News": 0.75,
    # Tabloids — medium trust
    "NYPost": 0.7,
    "Daily News": 0.7,
    # Community / social — lower trust
    "Reddit": 0.55,
    "CitizenApp": 0.6,
    "Scanner": 0.55,
    "Local Blog": 0.45,
}

SOURCE_TYPE_WEIGHTS = {
    "official": 1.0,
    "news": 0.75,
    "social": 0.5,
    "unknown": 0.4,
}

PROMPTS: Dict[str, str] = {
    "v1": (
        "You are a credibility auditor for NYC emergency incidents. "
        "Given a list of sources that reported the same incident, assign a credibility score 1-5. "
        "5 = official agencies or multiple major outlets; 1 = unverified single community posts. "
        "Return JSON: {\"score\": <number>, \"reason\": <one sentence>}"
    ),
    "v2": (
        "Act as a media reliability analyst. Evaluate source trust and corroboration. "
        "Prioritize NYPD/FDNY/NYC OEM highest, then ABC7NY/NBC/CBS/NY1/Gothamist, then tabloids, then citizen apps. "
        "Use the distribution of sources to calibrate score. Return JSON with score and reason."
    ),
    "v3": (
        "You are verifying incident authenticity. Score 1-5 based on: (1) presence of official sources, "
        "(2) number of independent outlets >=3, (3) absence of only low-cred sources. "
        "Give concise reasoning. Return JSON with score and reason."
    ),
    "v4": (
        "Assess credibility using evidence weighting and corroboration thresholds. "
        "Source weights: Official (NYPD/FDNY/NYC OEM/MTA)=high; Major local TV/news (ABC7NY/NBC/CBS/NY1/Gothamist)=medium-high; "
        "Tabloids/community apps/blogs/scanners=low. Increase score with >=3 independent sources; penalize when majority are low-cred. "
        "Return strictly JSON with numeric score (1-5) and short reason."
    ),
    "v5": (
        "Use a rubric: start at 2.5. +1.5 if any official source is present; +1.0 if >=3 independent major outlets; "
        "-1.0 if only low-cred sources; +0.02 per corroborating source up to +0.5. Clamp 1-5. "
        "Write one-sentence reason referencing source mix. Output JSON {score, reason}."
    ),
}

# Prompt weights for ensemble (v5 rubric-based gets highest weight)
PROMPT_WEIGHTS = {"v1": 1.0, "v2": 1.2, "v3": 1.0, "v4": 1.1, "v5": 1.5}


# ── Deterministic scorer ─────────────────────────────────────────────

def _deterministic_score(sources: List[str]) -> float:
    if not sources:
        return 1.0
    weights = [SOURCE_WEIGHTS.get(s, 0.5) for s in sources]
    avg_weight = sum(weights) / len(weights)
    corroboration = min(len(sources), 25)
    bonus = 0.04 * corroboration
    raw = avg_weight + bonus
    score = 1.0 + (raw - 0.5) * (4.0 / 1.5)
    return float(max(1.0, min(5.0, round(score, 2))))


def _corroboration_bonus(source_names: List[str], source_types: List[str]) -> float:
    n_sources = len(set(source_names))
    n_types = len(set(source_types))

    bonus = 0.0
    if n_sources >= 5:
        bonus += 0.8
    elif n_sources >= 3:
        bonus += 0.5
    elif n_sources >= 2:
        bonus += 0.2

    if n_types >= 3:
        bonus += 0.5
    elif n_types >= 2:
        bonus += 0.2

    has_official = any(t == "official" for t in source_types)
    if has_official:
        bonus += 0.3

    return bonus


def _temporal_decay(first_reported: Optional[str], last_reported: Optional[str]) -> float:
    now = datetime.now(timezone.utc)

    def parse(ts: Optional[str]) -> Optional[datetime]:
        if not ts:
            return None
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            return None

    last = parse(last_reported)
    if not last:
        last = parse(first_reported)
    if not last:
        return 0.7

    age_hours = (now - last).total_seconds() / 3600.0
    if age_hours <= 1:
        return 1.0
    elif age_hours <= 6:
        return 0.95
    elif age_hours <= 24:
        return 0.85
    elif age_hours <= 72:
        return 0.7
    else:
        return 0.5


# ── Gemini LLM calls ─────────────────────────────────────────────────

def _llm_available() -> bool:
    try:
        from app.config import settings
        return bool(settings.gemini_api_key)
    except Exception:
        return False


def _get_model():
    from app.config import settings
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel("gemini-2.0-flash-exp")


def _parse_json_response(text: str) -> Dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    return {}


def _call_gemini_single(prompt: str) -> Dict[str, Any]:
    try:
        model = _get_model()
        resp = model.generate_content(prompt)
        text = resp.text or "{}"
        parsed = _parse_json_response(text)
        if "score" in parsed:
            return parsed
        return {"score": 3.0, "reason": "LLM returned non-JSON; defaulted"}
    except Exception as e:
        return {"score": 3.0, "reason": f"LLM error: {str(e)[:80]}"}


def _ensemble_score(sources: List[str]) -> Dict[str, Any]:
    """Run all 5 prompt versions, return weighted median score + per-version breakdown."""
    results: Dict[str, Dict[str, Any]] = {}
    scores_weighted: List[float] = []
    weights_list: List[float] = []

    source_str = ", ".join(sources)

    for ver, base_prompt in PROMPTS.items():
        full_prompt = base_prompt + "\nSources: " + source_str

        if _llm_available():
            out = _call_gemini_single(full_prompt)
        else:
            out = {"score": _deterministic_score(sources), "reason": "deterministic fallback"}

        score = float(out.get("score", 3.0))
        score = max(1.0, min(5.0, score))
        results[ver] = {"score": score, "reason": out.get("reason", "")}

        w = PROMPT_WEIGHTS.get(ver, 1.0)
        scores_weighted.append(score)
        weights_list.append(w)

    # Weighted median
    paired = sorted(zip(scores_weighted, weights_list))
    total_w = sum(weights_list)
    cumulative = 0.0
    median_score = paired[len(paired) // 2][0]
    for s, w in paired:
        cumulative += w
        if cumulative >= total_w / 2:
            median_score = s
            break

    return {
        "ensemble_score": round(median_score, 2),
        "per_version": results,
        "method": "ensemble_llm" if _llm_available() else "ensemble_deterministic",
    }


def _gemini_ground_verify(event_title: str, event_description: str) -> Dict[str, Any]:
    """Use Gemini's google_search grounding to verify an incident against the web."""
    if not _llm_available():
        return {"verified": False, "confidence": 0.0, "reason": "LLM not available"}

    try:
        from app.config import settings
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)

        model = genai.GenerativeModel(
            "gemini-2.0-flash-exp",
            tools="google_search_retrieval",
        )

        prompt = (
            f"Verify this incident report using web search. "
            f"Title: {event_title}\n"
            f"Description: {event_description[:300]}\n\n"
            f"Search the web for this incident. Return JSON:\n"
            f'{{"verified": true/false, "confidence": 0.0-1.0, '
            f'"web_sources_found": <number>, "reason": "<one sentence>"}}'
        )

        resp = model.generate_content(prompt)
        text = resp.text or "{}"
        parsed = _parse_json_response(text)

        return {
            "verified": parsed.get("verified", False),
            "confidence": float(parsed.get("confidence", 0.0)),
            "web_sources_found": int(parsed.get("web_sources_found", 0)),
            "reason": parsed.get("reason", ""),
        }
    except Exception as e:
        return {"verified": False, "confidence": 0.0, "reason": f"Grounding error: {str(e)[:80]}"}


# ── Main scoring pipeline ────────────────────────────────────────────

def score_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Full credibility pipeline for a clustered event.

    Input: event dict from clustering.py with source_names, source_diversity,
           corroboration_count, first_reported, last_reported, title, description.

    Returns full breakdown with final_score, confidence, ensemble, grounding, etc.
    """
    source_names = event.get("source_names", [])
    source_types = [s.get("source_type", "unknown") for s in event.get("sources", [])]

    det_score = _deterministic_score(source_names)

    if _llm_available() and len(source_names) >= 1:
        ens = _ensemble_score(source_names)
        llm_score = ens["ensemble_score"]
    else:
        ens = {"ensemble_score": det_score, "per_version": {}, "method": "skipped"}
        llm_score = det_score

    corr_bonus = _corroboration_bonus(source_names, source_types)
    decay = _temporal_decay(event.get("first_reported"), event.get("last_reported"))

    title = event.get("title", "")
    desc = event.get("description", "")
    corr_count = event.get("corroboration_count", 1)
    severity = event.get("severity", "low")

    grounding = {"verified": False, "confidence": 0.0, "reason": "skipped"}
    grounding_boost = 0.0
    if severity in ("high", "medium") or corr_count >= 3:
        grounding = _gemini_ground_verify(title, desc)
        if grounding.get("verified"):
            grounding_boost = grounding.get("confidence", 0.0) * 0.5

    raw = (det_score * 0.3 + llm_score * 0.5 + corr_bonus + grounding_boost) * decay
    final = max(1.0, min(5.0, round(raw, 2)))

    confidence_factors = [
        min(corr_count / 5.0, 1.0) * 0.3,
        (len(set(source_types)) / 3.0) * 0.25,
        (1.0 if _llm_available() else 0.3) * 0.25,
        decay * 0.2,
    ]
    confidence = min(1.0, sum(confidence_factors))

    breakdown_parts = [
        f"det={det_score}",
        f"llm={llm_score}",
        f"corr=+{corr_bonus:.2f}({corr_count}src/{len(set(source_types))}types)",
        f"decay={decay}",
    ]
    if grounding_boost > 0:
        breakdown_parts.append(f"ground=+{grounding_boost:.2f}")

    return {
        "final_score": final,
        "confidence": round(confidence, 3),
        "deterministic_score": det_score,
        "ensemble": ens,
        "grounding": grounding,
        "corroboration_bonus": round(corr_bonus, 2),
        "temporal_decay": decay,
        "breakdown": " | ".join(breakdown_parts),
    }


# ── Public API (backward compatible) ─────────────────────────────────

def credibility_score(sources: List[str]) -> float:
    """Simple score 1-5 for a list of source names. Backward compatible."""
    event = {
        "source_names": sources,
        "sources": [{"source": s, "source_type": "unknown"} for s in sources],
        "corroboration_count": len(sources),
        "title": "unknown",
        "description": "",
        "severity": "medium",
    }
    result = score_event(event)
    return result["final_score"]


def credibility_score_full(sources: List[str]) -> Dict[str, Any]:
    """Full scoring with breakdown. For API responses."""
    event = {
        "source_names": sources,
        "sources": [{"source": s, "source_type": "unknown"} for s in sources],
        "corroboration_count": len(sources),
        "title": "unknown",
        "description": "",
        "severity": "medium",
    }
    return score_event(event)


def _run_single(sources: List[str], version: str, prompts: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    catalog = {**PROMPTS, **(prompts or {})}
    base = catalog.get(version, PROMPTS["v2"])
    full_prompt = base + "\nSources: " + ", ".join(sources)

    if _llm_available():
        out = _call_gemini_single(full_prompt)
    else:
        out = {"score": _deterministic_score(sources), "reason": "deterministic fallback"}

    score = float(out.get("score", _deterministic_score(sources)))
    reason = str(out.get("reason", "computed"))
    return {"score": max(1.0, min(5.0, round(score, 2))), "reason": reason}


def run_prompt_experiments(real_sources: List[str], fake_sources: List[str]) -> Dict[str, Any]:
    versions = list(PROMPTS.keys())
    results: Dict[str, Any] = {"real": {}, "fake": {}}
    for ver in versions:
        r1 = _run_single(real_sources, ver)
        r2 = _run_single(fake_sources, ver)
        results["real"][ver] = r1
        results["fake"][ver] = r2
    return results


def run_prompt_experiments_custom(prompts: Dict[str, str], real_sources: List[str], fake_sources: List[str]) -> Dict[str, Any]:
    versions = list(prompts.keys()) or list(PROMPTS.keys())
    results: Dict[str, Any] = {"real": {}, "fake": {}}
    for ver in versions:
        r1 = _run_single(real_sources, ver, prompts)
        r2 = _run_single(fake_sources, ver, prompts)
        results["real"][ver] = r1
        results["fake"][ver] = r2
    return results


def get_prompts() -> Dict[str, str]:
    return dict(PROMPTS)
