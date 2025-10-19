import json
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import openai

BASE_EVENTS: List[Dict[str, Any]] = [
    {"name": "Team Power Challenge", "type": "team", "skill": "power", "weight": 1},
    {"name": "Team Athletics Challenge", "type": "team", "skill": "athletics", "weight": 1},
    {"name": "Team Wits Challenge", "type": "team", "skill": "wit", "weight": 1},
    {"name": "Individual Athletics Challenge", "type": "individual", "skill": "athletics", "weight": 1},
    {"name": "Natural Science challenge", "type": "science", "specialty": "Natural Scientist", "weight": 1},
    {"name": "Social Science challenge", "type": "science", "specialty": "Social Scientist", "weight": 1},
    {"name": "Combat challenge", "type": "combat", "weight": 1},
]

OUTPUT_DIR = Path(__file__).resolve().parent / "generated"
OUTPUT_PATH = OUTPUT_DIR / "operation_stories.json"
DEFAULT_MODEL = os.environ.get("POE_MODEL", "Grok-4")
POE_API_KEY = os.environ.get("POE_API_KEY")
POE_BASE_URL = os.environ.get("POE_BASE_URL", "https://api.poe.com/v1")


def require_api_key() -> str:
    if not POE_API_KEY:
        raise RuntimeError("Set the POE_API_KEY environment variable before running the generator.")
    return POE_API_KEY


def create_client() -> openai.OpenAI:
    return openai.OpenAI(api_key=require_api_key(), base_url=POE_BASE_URL)


def pick_event() -> Dict[str, Any]:
    weights = [event.get("weight", 1) for event in BASE_EVENTS]
    chosen = random.choices(BASE_EVENTS, weights=weights, k=1)[0]
    return dict(chosen)


def generate_event_plan(step_count: int = 10) -> List[Dict[str, Any]]:
    return [pick_event() for _ in range(step_count)]


def build_prompt(events: List[Dict[str, Any]]) -> str:
    lines = [
        "Create a cinematic Warp Gate Command operation report inspired by Stargate, but without any direct Stargate reference.",
        "Return ONLY a JSON array with exactly ten string entries.",
        "Each string must describe a single event separated by newline characters.  Do not include a number, or the name of the event in each string.  Just skip straight to the story.",
        "Use placeholders $TEAM_MEMBER_1, $TEAM_MEMBER_2, $TEAM_MEMBER_3, $TEAM_MEMBER_4, or $TEAM_MEMBER_SELECTED when a line should mention a specific operative.",
        "Keep the tone adventurous but grounded in tactical science fiction.  No crazy science terminology or technobabble.",
        "Do not add numbering, keys, narration outside the ten strings, or trailing commentary.",
        "Be verbose and detailed.  Try to write a story that makes sense using the space provided.  Keep it to between 2 and 10 lines per step.",
        "Use non-gendered pronouns for team members, or refer to them directly by name"
    ]

    lines.append("Event plan:")
    for idx, event in enumerate(events, start=1):
        detail_parts = [event["type"]]
        if event.get("skill"):
            detail_parts.append(f'skill={event["skill"]}')
        if event.get("specialty"):
            detail_parts.append(f'specialty={event["specialty"]}')
        details = ", ".join(detail_parts)
        lines.append(f"{idx}. {event['name']} ({details})")

    return "\n".join(lines)


def request_story(client: openai.OpenAI, model: str, events: List[Dict[str, Any]]) -> str:
    prompt = build_prompt(events)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You craft succinct tactical mission logs that can be parsed as JSON.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=10000,
    )
    message = response.choices[0].message.content
    if not isinstance(message, str) or not message.strip():
        raise ValueError("Model returned an empty response.")
    return message.strip()


def parse_story(raw: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Model response was not valid JSON.") from exc


def validate_story_lines(payload: Any, events: List[Dict[str, Any]]) -> List[List[str]]:
    if not isinstance(payload, list) or len(payload) != len(events):
        raise ValueError("Story must be a JSON array with exactly ten strings.")

    sanitized: List[List[str]] = []
    for idx, entry in enumerate(payload, start=1):
        if not isinstance(entry, str):
            raise ValueError(f"Step {idx} must be a string.")
        segments = [segment.strip() for segment in entry.splitlines() if segment.strip()]
        if not 2 <= len(segments) <= 10:
            raise ValueError(f"Step {idx} must contain ten non-empty lines separated by newlines.  Currently contains {segments}")
        for segment in segments:
            if len(segment) > 1000:
                raise ValueError(f"Step {idx} includes a line longer than 1000 characters.")
        sanitized.append(segments)
    return sanitized


def build_record(lines: List[List[str]], events: List[Dict[str, Any]], model: str) -> Dict[str, Any]:
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    summary = lines[0][0] if lines and lines[0] else "Warp Gate Command operation log."
    payload = {
        "id": f"wgc_operation_story_{timestamp}",
        "title": f"Warp Gate Command Operation {timestamp[-6:]}",
        "summary": summary,
        "model": model,
        "createdAt": timestamp,
        "events": [],
    }

    for idx, (step_lines, event) in enumerate(zip(lines, events), start=1):
        payload["events"].append(
            {
                "step": idx,
                "name": event["name"],
                "type": event["type"],
                "skill": event.get("skill"),
                "specialty": event.get("specialty"),
                "lines": step_lines,
            }
        )

    return payload


def append_record(record: Dict[str, Any]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT_PATH.exists():
        existing = json.loads(OUTPUT_PATH.read_text("utf-8"))
        if not isinstance(existing, list):
            raise ValueError("operation_stories.json must contain a JSON array.")
    else:
        existing = []
    existing.append(record)
    OUTPUT_PATH.write_text(json.dumps(existing, indent=2, ensure_ascii=True) + "\n", "utf-8")


def main() -> None:
    client = create_client()
    events = generate_event_plan()
    raw_story = request_story(client, DEFAULT_MODEL, events)
    print("Model response:", raw_story)
    story_lines = validate_story_lines(parse_story(raw_story), events)
    print("Parsed steps:")
    for idx, entry in enumerate(story_lines, start=1):
        print(f"{idx}: {' | '.join(entry)}")
    record = build_record(story_lines, events, DEFAULT_MODEL)
    append_record(record)
    print(f"Story appended to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
