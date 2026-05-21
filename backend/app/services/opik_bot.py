"""
Opik experiment tracking stubs — Opik not available in production.
All functions return safe defaults so callers don't break.
"""

from typing import Dict, Any, List


def record_prompt_experiments(real_sources: List[str], fake_sources: List[str]) -> Dict[str, Any]:
    """Run credibility experiments using deterministic scorer."""
    from app.services.credibility_agent import run_prompt_experiments
    return run_prompt_experiments(real_sources, fake_sources)


def record_prompt_experiments_custom(prompts: Dict[str, str], real_sources: List[str], fake_sources: List[str]) -> Dict[str, Any]:
    from app.services.credibility_agent import run_prompt_experiments_custom
    return run_prompt_experiments_custom(prompts, real_sources, fake_sources)


def list_logs() -> List[Dict]:
    return []
