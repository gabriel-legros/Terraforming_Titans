import argparse
import json
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

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

THEME_KEYWORDS: List[str] = [
    "forest", "ruin", "battery", "desert", "glacier", "swamp", "reef", "crater", "vault", "hive",
    "temple", "portal", "archive", "lab", "mine", "outpost", "beacon", "relay", "bunker", "reactor",
    "shipwreck", "canyon", "oasis", "tundra", "trench", "citadel", "monolith", "observatory", "cavern",
    "market", "scrapyard", "spire", "dome", "station", "array", "silo", "quarry", "forge", "foundry",
    "lighthouse", "garrison", "embassy", "shrine", "caravan", "depot", "hangar", "labyrinth", "farm",
    "orchard", "jungle", "meadow", "volcano", "geyser", "lagoon", "delta", "plateau", "ridge", "icefield",
    "asteroid", "comet", "nebula", "magnetar", "pulsar", "wormhole", "gateway", "nexus", "library",
    "museum", "armory", "barracks", "prison", "laboratory", "clinic", "hospital", "nursery", "greenhouse",
    "refinery", "distillery", "generator", "turbine", "pipeline", "aqueduct", "reservoir", "dam", "bridge",
    "tunnel", "subway", "rail", "dock", "harbor", "shipyard", "launchpad", "impact", "basin", "steppe",
    "savanna", "rainforest", "catacomb", "crypt", "workshop", "mesa", "badlands", "bog", "atoll", "shoal",
    "strait", "fjord", "taiga", "moor", "heath", "glade", "dune", "isthmus", "peninsula", "headland", "cliff",
    "bluff", "escarpment", "gorge", "ravine", "chasm", "sinkhole", "cenote", "karst", "grotto", "abyss",
    "rift", "void", "halo", "corona", "flare", "aurora", "eclipse", "transit", "alignment", "resonance",
    "vortex", "maelstrom", "cyclone", "squall", "thunderhead", "blizzard", "whiteout", "permafrost", "iceberg",
    "floe", "scree", "talus", "fault", "fumarole", "caldera", "maar", "tuff", "obsidian", "basalt", "granite",
    "quartz", "crystal", "diamond", "amber", "ore", "isotope", "plasma", "quasar", "blazar", "singularity",
    "star", "planet", "moon", "satellite", "ring", "belt", "cluster", "voidspace", "riftgate", "rime", "stepwell",
    "cistern", "canal", "sluice", "lock", "aquifer", "spring", "waterfall", "cascade", "rapids", "whirlpool",
    "marsh", "fen", "mire", "peatland", "mangrove", "deltaic", "shoals", "backwater", "headwater", "estuary",
    "seamount", "trenchline", "shelf", "abyssal", "upwelling", "tower", "mast", "antenna", "dish", "transmitter",
    "receiver", "uplink", "downlink", "console", "terminal", "mainframe", "server", "node", "hub", "router",
    "switch", "matrix", "cache", "starport", "spaceport", "pier", "quay", "wharf", "marina", "warehouse",
    "factory", "smelter", "kiln", "furnace", "crucible", "storm",
]

OUTPUT_DIR = Path(__file__).resolve().parent / "generated"
OUTPUT_PATH = OUTPUT_DIR / "operation_stories.js"
DEFAULT_MODEL = os.environ.get("POE_MODEL", "Grok-4")
DEFAULT_STEP_COUNT = 10
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


def generate_event_plan(step_count: int = DEFAULT_STEP_COUNT) -> List[Dict[str, Any]]:
    return [pick_event() for _ in range(step_count)]


def normalize_event(event: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(event, dict):
        raise ValueError("Event entries must be objects with at least 'name' and 'type'.")
    if "name" not in event or "type" not in event:
        raise ValueError("Event entries must include 'name' and 'type' keys.")
    normalized: Dict[str, Any] = {
        "name": str(event["name"]),
        "type": str(event["type"]),
    }
    if "skill" in event:
        normalized["skill"] = str(event["skill"])
    if "specialty" in event:
        normalized["specialty"] = str(event["specialty"])
    if "weight" in event:
        normalized["weight"] = event["weight"]
    return normalized


def load_event_plans(paths: List[str]) -> List[List[Dict[str, Any]]]:
    plans: List[List[Dict[str, Any]]] = []
    for raw_path in paths:
        path = Path(raw_path).expanduser()
        data = json.loads(path.read_text("utf-8"))
        if not isinstance(data, list) or not data:
            raise ValueError(f"{path} must contain a JSON array of event definitions.")
        if all(isinstance(item, dict) for item in data):
            plans.append([normalize_event(item) for item in data])
        elif all(isinstance(item, list) for item in data):
            for nested in data:
                if not nested:
                    raise ValueError(f"{path} includes an empty event plan.")
                plans.append([normalize_event(item) for item in nested])
        else:
            raise ValueError(f"{path} contains an unsupported event format.")
    return plans


def build_prompt(events: List[Dict[str, Any]]) -> Tuple[str, List[str]]:
    if not events:
        raise ValueError("Event plan cannot be empty.")
    total_steps = len(events)
    selected_keywords = random.sample(THEME_KEYWORDS, k=3)
    lines = [
        "Create a cinematic Warp Gate Command operation report inspired by Stargate, but without any direct Stargate reference.",
        f"Return ONLY a JSON array with exactly {total_steps} string entries.",
        "Each string must describe a single event separated by newline characters. Do not include a number, or the name of the event in each string. Just skip straight to the story.",
        "Use placeholders $TEAM_MEMBER_1, $TEAM_MEMBER_2, $TEAM_MEMBER_3, $TEAM_MEMBER_4 to refer to party members. You should use $TEAM_MEMBER_SELECTED to refer to the team member selected for an individual challenge.  Natural Science and Social Science challenges are also individual challenges.",
        "Keep the tone adventurous but grounded in tactical science fiction. No crazy science terminology or technobabble.",
        "Come up with a common theme and maintain story consistency.",
        f"Do not add numbering, keys, narration outside the {total_steps} strings, or trailing commentary.",
        "Be verbose and detailed. Try to write a story that makes sense using the space provided. Keep it to between 2 and 10 lines per step.",
        "Use non-gendered pronouns for team members, or refer to them directly by name"
    ]

    lines.append(
        "Themes: The story must prominently feature the following three keywords as recurring settings, imagery, or objectives: "
        f"{', '.join(selected_keywords)}. Integrate all three, but keep it realistic.  Do not overuse them and keep them consistent."
    )

    lines.append("Event plan:")
    for idx, event in enumerate(events, start=1):
        detail_parts = [event["type"]]
        if event.get("skill"):
            detail_parts.append(f'skill={event["skill"]}')
        if event.get("specialty"):
            detail_parts.append(f'specialty={event["specialty"]}')
        details = ", ".join(detail_parts)
        lines.append(f"{idx}. {event['name']} ({details})")

    return "\n".join(lines), selected_keywords


def request_story(client: openai.OpenAI, model: str, events: List[Dict[str, Any]]) -> Tuple[str, List[str]]:
    prompt, keywords = build_prompt(events)
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
    return message.strip(), keywords


def parse_story(raw: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Model response was not valid JSON.") from exc


def validate_story_lines(payload: Any, events: List[Dict[str, Any]]) -> List[List[str]]:
    expected_steps = len(events)
    if not isinstance(payload, list) or len(payload) != expected_steps:
        raise ValueError(f"Story must be a JSON array with exactly {expected_steps} strings.")

    sanitized: List[List[str]] = []
    for idx, entry in enumerate(payload, start=1):
        if not isinstance(entry, str):
            raise ValueError(f"Step {idx} must be a string.")
        segments = [segment.strip() for segment in entry.splitlines() if segment.strip()]
        if not 2 <= len(segments) <= 10:
            raise ValueError(
                f"Step {idx} must contain between 2 and 10 non-empty lines separated by newlines. Currently contains {segments}"
            )
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


def load_existing_records() -> List[Dict[str, Any]]:
    if not OUTPUT_PATH.exists():
        return []
    raw = OUTPUT_PATH.read_text("utf-8")
    start = raw.find('[')
    end = raw.rfind(']')
    if start == -1 or end == -1 or end < start:
        raise ValueError("operation_stories.js is not in the expected format.")
    payload = raw[start:end + 1]
    data = json.loads(payload)
    if not isinstance(data, list):
        raise ValueError("operation_stories.js must wrap a JSON array.")
    return data


def write_records(records: List[Dict[str, Any]]) -> None:
    json_payload = json.dumps(records, indent=2, ensure_ascii=True)
    lines = json_payload.split('\n')
    indented = '\n'.join(line if idx == 0 else f"  {line}" for idx, line in enumerate(lines))
    bundle = (
        "(function(root){\n"
        f"  const stories = {indented};\n"
        "  if (typeof module !== 'undefined' && module.exports) {\n"
        "    module.exports = stories;\n"
        "  }\n"
        "  if (root) {\n"
        "    root.WGC_OPERATION_STORIES = stories;\n"
        "  }\n"
        "})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));\n"
    )
    OUTPUT_PATH.write_text(bundle, "utf-8")


def append_record(record: Dict[str, Any]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    existing = load_existing_records()
    existing.append(record)
    write_records(existing)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Warp Gate Command operation stories.")
    parser.add_argument(
        "--runs",
        type=int,
        default=100,
        help="Number of stories to generate (default: 100).",
    )
    parser.add_argument(
        "--events-file",
        action="append",
        dest="event_files",
        default=[],
        help="Path to a JSON file defining an ordered list of events. Can be provided multiple times.",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Override the model used for generation (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--steps",
        type=int,
        default=DEFAULT_STEP_COUNT,
        help=f"Number of events per randomly generated plan (default: {DEFAULT_STEP_COUNT}).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print parsed steps for each successful run.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        event_plans = load_event_plans(args.event_files) if args.event_files else []
    except Exception as exc:  # noqa: broad-except - fallback to random plan generation
        print(f"Failed to load custom event plans: {exc}. Falling back to random plans.")
        event_plans = []

    client = create_client()
    successes = 0
    for attempt in range(args.runs):
        try:
            if event_plans:
                template = event_plans[attempt % len(event_plans)]
                events = [dict(item) for item in template]
            else:
                events = generate_event_plan(args.steps)

            raw_story, keywords = request_story(client, args.model, events)
            story_lines = validate_story_lines(parse_story(raw_story), events)

            print(f"Run {attempt + 1}/{args.runs} keywords: {', '.join(keywords)}")

            if args.verbose:
                print("Parsed steps:")
                for idx, entry in enumerate(story_lines, start=1):
                    print(f"{idx}: {' | '.join(entry)}")

            record = build_record(story_lines, events, args.model)
            append_record(record)
            summary_line = story_lines[0][0] if story_lines and story_lines[0] else record["summary"]
            print(f"Run {attempt + 1}/{args.runs} appended {record['id']}: {summary_line}")
            successes += 1
        except Exception as exc:  # noqa: broad-except - continue to next attempt on failure
            print(f"Run {attempt + 1}/{args.runs} skipped due to error: {exc}")

    print(f"Completed {successes} successful runs out of {args.runs}. Output written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
