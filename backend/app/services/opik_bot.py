"""
Opik experiment tracking and logging for credibility scoring.
"""

import os
from typing import Dict, Any, Optional
from opik import Opik
from opik.api_objects import trace


class OpikBot:
    """Manages Opik experiments and logging for credibility scores."""
    
    def __init__(self):
        self.client = None
        self.current_experiment = None
        
        # Initialize Opik client if API key is available
        if os.getenv("OPIK_API_KEY"):
            try:
                self.client = Opik()
            except Exception as e:
                print(f"Failed to initialize Opik client: {e}")
    
    def create_experiment(self, name: str, description: str = "") -> Optional[str]:
        """Create a new experiment for tracking credibility scoring variants."""
        if not self.client:
            return None
        
        try:
            experiment = self.client.create_experiment(
                name=name,
                description=description
            )
            self.current_experiment = experiment.id
            return experiment.id
        except Exception as e:
            print(f"Failed to create experiment: {e}")
            return None
    
    def log_credibility_score(
        self,
        incident_data: Dict[str, Any],
        credibility_result: Dict[str, Any],
        prompt_version: str,
        experiment_id: Optional[str] = None
    ) -> None:
        """Log a credibility scoring result to Opik."""
        if not self.client:
            return
        
        exp_id = experiment_id or self.current_experiment
        
        try:
            with trace.start_trace(
                name="credibility_scoring",
                input={"incident": incident_data, "prompt_version": prompt_version},
                output=credibility_result,
                tags=["credibility", prompt_version],
                metadata={"experiment_id": exp_id}
            ) as current_trace:
                current_trace.log_feedback_score(
                    name="credibility_score",
                    value=credibility_result.get("score", 0.0)
                )
        except Exception as e:
            print(f"Failed to log credibility score: {e}")
    
    def compare_prompt_versions(
        self,
        incident_data: Dict[str, Any],
        results: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compare multiple prompt versions for the same incident."""
        comparison = {
            "incident_id": incident_data.get("id"),
            "incident_title": incident_data.get("title"),
            "prompt_results": results,
            "best_version": None,
            "score_variance": 0.0
        }
        
        # Find best scoring version
        best_score = 0.0
        best_version = None
        scores = []
        
        for version, result in results.items():
            score = result.get("score", 0.0)
            scores.append(score)
            if score > best_score:
                best_score = score
                best_version = version
        
        comparison["best_version"] = best_version
        
        # Calculate variance
        if len(scores) > 1:
            mean_score = sum(scores) / len(scores)
            variance = sum((s - mean_score) ** 2 for s in scores) / len(scores)
            comparison["score_variance"] = variance
        
        return comparison


# Global instance
opik_bot = OpikBot()