"""
Logging stubs — Opik not available. All functions are no-ops.
"""

from typing import Dict, Any, List, Tuple


def log_credibility_decision(signal, extracted, corroborations, score, decision):
    pass


def log_route_decision(origin, destination, incidents, chosen_index, reason, routes):
    pass


def log_prompt_experiment(version, real_sources, real_result, fake_sources, fake_result, metrics, prompt_text=None) -> bool:
    return False


def log_best_prompt(best_version, metrics) -> bool:
    return False
