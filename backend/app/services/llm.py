from typing import List, Dict


def summarize_with_gemini(messages: List[Dict[str, str]], api_key: str) -> str:
    try:
        import google.generativeai as genai
    except Exception:
        return "Gemini client unavailable."
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        content = []
        for m in messages:
            content.append({"role": m.get("role", "user"), "parts": [m.get("text", "")]})
        prompt = (
            "You are a first responder. Produce a concise incident summary including"
            " type, location, time, injured count, and any credibility hints."
        )
        # Compose summary from messages
        response = model.generate_content([
            {"role": "system", "parts": [prompt]},
            *content,
        ])
        return getattr(response, "text", None) or (response.candidates[0].content.parts[0].text if response.candidates else "")
    except Exception:
        return "Summary generation failed."


def categorize_incident_with_gemini(text: str, api_key: str) -> Dict[str, str]:
    try:
        import google.generativeai as genai
    except Exception:
        return {
            "summary": "Gemini client unavailable.",
            "where": "",
            "when": "",
            "injured_count": "",
            "note": "",
        }
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        instruction = (
            "Extract four fields from the incident text: WHERE, WHEN, INJURED_COUNT (number), and NOTE."
            " Return a short 1-2 sentence SUMMARY first."
            " Format strictly as JSON with keys: summary, where, when, injured_count, note."
            " If information missing, leave the field blank or use 'unknown'."
        )
        response = model.generate_content([
            {"role": "system", "parts": [instruction]},
            {"role": "user", "parts": [text]},
        ])
        output_text = getattr(response, "text", None) or (
            response.candidates[0].content.parts[0].text if response.candidates else ""
        )
        import json
        try:
            data = json.loads(output_text)
        except Exception:
            # try to coerce by finding JSON in text
            import re
            m = re.search(r"\{[\s\S]*\}", output_text)
            data = json.loads(m.group(0)) if m else {}
        return {
            "summary": data.get("summary", ""),
            "where": data.get("where", ""),
            "when": data.get("when", ""),
            "injured_count": str(data.get("injured_count", "")),
            "note": data.get("note", ""),
        }
    except Exception:
        return {
            "summary": "Categorization failed.",
            "where": "",
            "when": "",
            "injured_count": "",
            "note": "",
        }