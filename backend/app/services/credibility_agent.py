from typing import List, Dict, Any

# Base deterministic scorer remains for fallback and consistency.
SOURCE_WEIGHTS = {
    # Government and official agencies
    "NYPD": 1.0,
    "FDNY": 0.95,
    "NYC DOT": 0.9,
    "NYC OEM": 0.9,
    # Major local news
    "CBS New York": 0.85,
    "NBC New York": 0.85,
    "ABC7NY": 0.85,
    "Gothamist": 0.8,
    "NY1": 0.8,
    # Mixed credibility
    "NYPost": 0.7,
    "Daily News": 0.7,
    # Community apps / blogs / scanners
    "CitizenApp": 0.6,
    "Scanner": 0.55,
    "Local Blog": 0.45,
}


def _deterministic_score(sources: List[str]) -> float:
    if not sources:
        return 1.0
    weights = [SOURCE_WEIGHTS.get(s, 0.5) for s in sources]
    avg_weight = sum(weights) / len(weights)
    corroboration = min(len(sources), 25)
    bonus = 0.04 * corroboration  # up to +1.0 at 25 corroborations
    raw = avg_weight + bonus
    score = 1.0 + (raw - 0.5) * (4.0 / 1.5)
    return float(max(1.0, min(5.0, round(score, 2))))


# LangGraph-based prompt experimentation (optional, uses Gemini if available)
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
        "(2) number of independent outlets ≥3, (3) absence of only low-cred sources. "
        "Give concise reasoning. Return JSON with score and reason."
    ),
    "v4": (
        "Assess credibility using evidence weighting and corroboration thresholds. "
        "Source weights: Official (NYPD/FDNY/NYC OEM/MTA)=high; Major local TV/news (ABC7NY/NBC/CBS/NY1/Gothamist)=medium-high; "
        "Tabloids/community apps/blogs/scanners=low. Increase score with ≥3 independent sources; penalize when majority are low-cred. "
        "Return strictly JSON with numeric score (1-5) and short reason."
    ),
    "v5": (
        "Use a rubric: start at 2.5. +1.5 if any official source is present; +1.0 if ≥3 independent major outlets; "
        "-1.0 if only low-cred sources; +0.02 per corroborating source up to +0.5. Clamp 1-5. "
        "Write one-sentence reason referencing source mix. Output JSON {score, reason}."
    ),
}


def _llm_available() -> bool:
    try:
        from app.config import settings
        return bool(settings.gemini_api_key)
    except Exception:
        return False


def _call_gemini(prompt: str) -> Dict[str, Any]:
    try:
        from app.config import settings
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content(prompt)
        text = resp.text or "{}"
        import json
        # attempt to extract JSON
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end+1])
        # fallback simple parse
        return {"score": 3.0, "reason": "LLM returned non-JSON; defaulted"}
    except Exception:
        return {"score": 3.0, "reason": "LLM error; defaulted"}


# Minimal LangGraph pipeline: select prompt → call LLM → parse
def _build_graph():
    try:
        from typing import TypedDict
        from langgraph.graph import StateGraph, END

        class State(TypedDict):
            sources: List[str]
            version: str
            prompt: str
            llm_output: Dict[str, Any]
            score: float
            reason: str

        def select_prompt(state: State) -> State:
            srcs = state.get("sources", [])
            ver = state.get("version", "v2")
            # Support injected prompt overrides via state
            injected = state.get("prompts") or {}
            catalog = {**PROMPTS, **injected}
            base = catalog.get(ver, PROMPTS["v2"])
            prompt = base + "\nSources: " + ", ".join(srcs)
            state["prompt"] = prompt
            return state

        def run_llm(state: State) -> State:
            out = _call_gemini(state["prompt"]) if _llm_available() else {"score": _deterministic_score(state["sources"]), "reason": "deterministic fallback"}
            state["llm_output"] = out
            return state

        def parse_score(state: State) -> State:
            out = state.get("llm_output", {})
            score = float(out.get("score", _deterministic_score(state.get("sources", []))))
            reason = str(out.get("reason", "computed"))
            state["score"] = max(1.0, min(5.0, round(score, 2)))
            state["reason"] = reason
            return state

        g = StateGraph(State)
        g.add_node("select", select_prompt)
        g.add_node("llm", run_llm)
        g.add_node("parse", parse_score)
        g.add_edge("select", "llm")
        g.add_edge("llm", "parse")
        g.add_edge("parse", END)
        return g.compile()
    except Exception:
        return None


_GRAPH_APP = _build_graph()


def credibility_score(sources: List[str]) -> float:
    # Use graph with v2 prompt when available, fallback otherwise
    if _GRAPH_APP:
        try:
            state = {"sources": sources, "version": "v2"}
            result = _GRAPH_APP.invoke(state)
            return float(result.get("score", _deterministic_score(sources)))
        except Exception:
            return _deterministic_score(sources)
    return _deterministic_score(sources)


def run_prompt_experiments(real_sources: List[str], fake_sources: List[str]) -> Dict[str, Any]:
    """Run multiple prompt versions and return scores and reasons for both real vs fake cases."""
    versions = list(PROMPTS.keys())
    results: Dict[str, Any] = {"real": {}, "fake": {}}
    for ver in versions:
        if _GRAPH_APP:
            try:
                r1 = _GRAPH_APP.invoke({"sources": real_sources, "version": ver})
                r2 = _GRAPH_APP.invoke({"sources": fake_sources, "version": ver})
                results["real"][ver] = {"score": r1.get("score", 3.0), "reason": r1.get("reason", "")}
                results["fake"][ver] = {"score": r2.get("score", 3.0), "reason": r2.get("reason", "")}
                continue
            except Exception:
                pass
        # Fallback deterministic
        results["real"][ver] = {"score": _deterministic_score(real_sources), "reason": "deterministic"}
        results["fake"][ver] = {"score": _deterministic_score(fake_sources), "reason": "deterministic"}
    return results


def run_prompt_experiments_custom(prompts: Dict[str, str], real_sources: List[str], fake_sources: List[str]) -> Dict[str, Any]:
    """Run experiments using custom prompt texts provided at runtime."""
    versions = list(prompts.keys()) or list(PROMPTS.keys())
    results: Dict[str, Any] = {"real": {}, "fake": {}}
    for ver in versions:
        if _GRAPH_APP:
            try:
                r1 = _GRAPH_APP.invoke({"sources": real_sources, "version": ver, "prompts": prompts})
                r2 = _GRAPH_APP.invoke({"sources": fake_sources, "version": ver, "prompts": prompts})
                results["real"][ver] = {"score": r1.get("score", 3.0), "reason": r1.get("reason", "")}
                results["fake"][ver] = {"score": r2.get("score", 3.0), "reason": r2.get("reason", "")}
                continue
            except Exception:
                pass
        # Fallback deterministic
        results["real"][ver] = {"score": _deterministic_score(real_sources), "reason": "deterministic"}
        results["fake"][ver] = {"score": _deterministic_score(fake_sources), "reason": "deterministic"}
    return results


def get_prompts() -> Dict[str, str]:
    return dict(PROMPTS)