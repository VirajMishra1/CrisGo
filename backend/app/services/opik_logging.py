from typing import Optional, Dict, Any, List, Tuple

try:
    from opik import Opik
except Exception:
    Opik = None  # type: ignore

from app.config import settings


def _get_client() -> Optional["Opik"]:
    if Opik is None:
        return None
    if not settings.opik_api_key:
        return None
    try:
        return Opik(api_key=settings.opik_api_key)
    except Exception:
        return None


def log_credibility_decision(signal: Dict[str, Any], extracted: Dict[str, Any], corroborations: List[Dict[str, Any]], score: float, decision: str):
    client = _get_client()
    if not client:
        return
    try:
        with client.trace(name="CredibilityAgent") as t:
            t.log_input(signal)
            t.log_metadata({"extracted": extracted, "corroborations": corroborations})
            t.log_output({"score": score, "decision": decision})
    except Exception:
        pass


def log_route_decision(origin: Tuple[float, float], destination: Tuple[float, float], incidents: List[Dict[str, Any]], chosen_index: int, reason: str, routes: List[Dict[str, Any]]):
    client = _get_client()
    if not client:
        return
    try:
        with client.trace(name="RoutingAgent") as t:
            t.log_input({"origin": origin, "destination": destination})
            t.log_metadata({"incidents": incidents})
            t.log_output({"chosen_index": chosen_index, "reason": reason, "routes": routes})
    except Exception:
        pass


def log_prompt_experiment(version: str, real_sources: List[str], real_result: Dict[str, Any], fake_sources: List[str], fake_result: Dict[str, Any], metrics: Dict[str, Any], prompt_text: str | None = None) -> bool:
    client = _get_client()
    if not client:
        return False
    try:
        with client.trace(name="CredibilityPromptExperiment") as t:
            t.log_input({
                "version": version,
                "real_sources": real_sources,
                "fake_sources": fake_sources,
            })
            t.log_metadata({
                "metrics": metrics,
                "prompt_text": prompt_text,
            })
            t.log_output({
                "real_result": real_result,
                "fake_result": fake_result,
            })
        return True
    except Exception:
        return False


def log_best_prompt(best_version: str, metrics: Dict[str, Any]) -> bool:
    client = _get_client()
    if not client:
        return False
    try:
        with client.trace(name="CredibilityPromptSelection") as t:
            t.log_input({"candidate": best_version})
            t.log_output({"selection": best_version, "metrics": metrics})
        return True
    except Exception:
        return False