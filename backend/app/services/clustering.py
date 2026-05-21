"""
Geo-clustering: group nearby incidents into unified "events".

An event = multiple reports about the same real-world incident.
Incidents within CLUSTER_RADIUS_M of each other get merged.
"""

import math
from typing import List, Dict, Any, Optional
from datetime import datetime


CLUSTER_RADIUS_M = 500.0
CLUSTER_TIME_WINDOW_H = 24


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _parse_ts(ts: Optional[str]) -> Optional[datetime]:
    if not ts or not isinstance(ts, str):
        return None
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        # Normalize to naive UTC so mixed tz/naive subtraction never crashes
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
        return dt
    except Exception:
        return None


def _type_compatible(a: str, b: str) -> bool:
    if a == b:
        return True
    groups = [
        {"earthquake"},
        {"flooding", "water_system", "sewer"},
        {"fire", "gas_leak"},
        {"traffic", "road_closure", "blocked_driveway"},
        {"hazard", "building_collapse", "scaffolding"},
        {"power_outage"},
    ]
    for g in groups:
        if a in g and b in g:
            return True
    return False


def cluster_incidents(incidents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Cluster raw incidents into events.

    Returns list of event dicts:
    {
        "event_id": str,
        "type": str,
        "title": str,
        "description": str,
        "lat": float, "lng": float,
        "severity": str,
        "sources": [{"source": str, "source_type": str, "id": str, "title": str}],
        "source_names": [str],
        "corroboration_count": int,
        "source_diversity": int,  # unique source types (official, social, news)
        "first_reported": str,
        "last_reported": str,
        "incidents": [original dicts],
    }
    """
    if not incidents:
        return []

    assigned = [False] * len(incidents)
    clusters: List[List[int]] = []

    for i in range(len(incidents)):
        if assigned[i]:
            continue

        cluster = [i]
        assigned[i] = True
        inc_i = incidents[i]
        lat_i = inc_i.get("lat", 0)
        lng_i = inc_i.get("lng", 0)
        type_i = inc_i.get("type", "hazard")
        ts_i = _parse_ts(inc_i.get("timestamp"))

        for j in range(i + 1, len(incidents)):
            if assigned[j]:
                continue
            inc_j = incidents[j]
            lat_j = inc_j.get("lat", 0)
            lng_j = inc_j.get("lng", 0)

            if lat_j == 0 or lng_j == 0:
                continue

            dist = _haversine_m(lat_i, lng_i, lat_j, lng_j)
            if dist > CLUSTER_RADIUS_M:
                continue

            type_j = inc_j.get("type", "hazard")
            if not _type_compatible(type_i, type_j):
                continue

            ts_j = _parse_ts(inc_j.get("timestamp"))
            if ts_i and ts_j:
                delta = abs((ts_i - ts_j).total_seconds())
                if delta > CLUSTER_TIME_WINDOW_H * 3600:
                    continue

            cluster.append(j)
            assigned[j] = True

        clusters.append(cluster)

    events: List[Dict[str, Any]] = []
    for idx, cluster_indices in enumerate(clusters):
        members = [incidents[i] for i in cluster_indices]

        avg_lat = sum(m.get("lat", 0) for m in members) / len(members)
        avg_lng = sum(m.get("lng", 0) for m in members) / len(members)

        sev_rank = {"high": 3, "medium": 2, "low": 1}
        best_sev = max(members, key=lambda m: sev_rank.get(m.get("severity", "low"), 0))

        src_priority = {"official": 3, "news": 2, "social": 1}
        best_title_member = max(members, key=lambda m: src_priority.get(m.get("source_type", ""), 0))

        source_names = list(set(m.get("source", "Unknown") for m in members))
        source_types = list(set(m.get("source_type", "unknown") for m in members))

        sources = [
            {
                "source": m.get("source", "Unknown"),
                "source_type": m.get("source_type", "unknown"),
                "id": m.get("id", ""),
                "title": m.get("title", ""),
            }
            for m in members
        ]

        timestamps = [_parse_ts(m.get("timestamp")) for m in members]
        valid_ts = [t for t in timestamps if t is not None]
        first = min(valid_ts).isoformat() + "Z" if valid_ts else ""
        last = max(valid_ts).isoformat() + "Z" if valid_ts else ""

        type_counts: Dict[str, int] = {}
        for m in members:
            t = m.get("type", "hazard")
            type_counts[t] = type_counts.get(t, 0) + 1
        primary_type = max(type_counts, key=type_counts.get)  # type: ignore[arg-type]

        events.append({
            "event_id": f"evt_{idx}_{hash(best_title_member.get('id', '')) % 100000}",
            "type": primary_type,
            "title": best_title_member.get("title", "Incident"),
            "description": best_title_member.get("description", ""),
            "lat": round(avg_lat, 6),
            "lng": round(avg_lng, 6),
            "severity": best_sev.get("severity", "medium"),
            "sources": sources,
            "source_names": source_names,
            "corroboration_count": len(members),
            "source_diversity": len(source_types),
            "first_reported": first,
            "last_reported": last,
            "incidents": members,
        })

    return events
