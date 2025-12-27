#!/usr/bin/env python3
from __future__ import annotations

import random
import re
import zlib
from pathlib import Path

RESOURCE_IDS = ["water", "carbon", "nitrogen", "metal", "silicon"]
START_MARKER = "// SECTOR_RESOURCE_OVERRIDES_START"
END_MARKER = "// SECTOR_RESOURCE_OVERRIDES_END"

ROOT = Path(__file__).resolve().parents[1]
SECTOR_PARAMETERS_PATH = ROOT / "src/js/galaxy/sector-parameters.js"
GALAXY_CONSTANTS_PATH = ROOT / "src/js/galaxy/galaxyConstants.js"


def load_galaxy_radius(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"\bGALAXY_RADIUS\s*=\s*(\d+)", text)
    if not match:
        raise SystemExit("GALAXY_RADIUS not found in galaxyConstants.js")
    return int(match.group(1))


def compute_ring(q: int, r: int) -> int:
    s = -q - r
    return max(abs(q), abs(r), abs(s))


def compute_ring_index(q: int, r: int, ring: int) -> int:
    if ring == 0:
        return 0
    current_q = ring
    current_r = 0
    index = 0
    if current_q == q and current_r == r:
        return index
    directions = [(0, -1), (-1, 0), (-1, 1), (0, 1), (1, 0), (1, -1)]
    for dq, dr in directions:
        for _ in range(ring):
            current_q += dq
            current_r += dr
            index += 1
            if current_q == q and current_r == r:
                return index
    return index % (ring * 6)


def format_sector_label(q: int, r: int) -> str:
    ring = compute_ring(q, r)
    if ring == 0:
        return "Core"
    index = compute_ring_index(q, r, ring)
    ring_size = ring * 6
    digits = max(2, len(str(ring_size)))
    return f"R{ring}-{index + 1:0{digits}d}"


def iter_hexes(radius: int):
    for q in range(-radius, radius + 1):
        r_min = max(-radius, -q - radius)
        r_max = min(radius, -q + radius)
        for r in range(r_min, r_max + 1):
            yield q, r


def choose_resources(sector_key: str):
    seed = zlib.crc32(sector_key.encode("utf-8"))
    rng = random.Random(seed)
    rich = rng.choice(RESOURCE_IDS)
    poor_pool = [resource for resource in RESOURCE_IDS if resource != rich]
    poor = rng.sample(poor_pool, 2)
    return rich, poor


def build_overrides_block(entries) -> str:
    lines = [
        START_MARKER,
        "const SECTOR_RESOURCE_OVERRIDES = {",
    ]
    for entry in entries:
        poor_list = "', '".join(entry["poor"])
        lines.append(
            f"    \"{entry['key']}\": {{ richResource: '{entry['rich']}', poorResources: ['{poor_list}'] }},"
        )
    lines.extend(
        [
            "};",
            "",
            "Object.entries(SECTOR_RESOURCE_OVERRIDES).forEach(([key, entry]) => {",
            "    const override = overrides[key] || {};",
            "    override.richResource = entry.richResource;",
            "    override.poorResources = entry.poorResources;",
            "    overrides[key] = override;",
            "});",
            END_MARKER,
            "",
        ]
    )
    return "\n".join(lines)


def update_sector_parameters(path: Path, block: str) -> None:
    text = path.read_text(encoding="utf-8")
    if START_MARKER in text and END_MARKER in text:
        pattern = re.compile(
            re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER) + r"\n?",
            re.DOTALL,
        )
        updated = pattern.sub(block, text)
    else:
        insert_at = text.find("const galaxySectorParameters")
        if insert_at < 0:
            raise SystemExit("Unable to find insertion point in sector-parameters.js")
        updated = f"{text[:insert_at]}{block}{text[insert_at:]}"
    path.write_text(updated, encoding="utf-8")


def main() -> None:
    radius = load_galaxy_radius(GALAXY_CONSTANTS_PATH)
    entries = []
    for q, r in iter_hexes(radius):
        if q == 0 and r == 0:
            continue
        label = format_sector_label(q, r)
        if label == "R5-07":
            continue
        key = f"{q},{r}"
        if key == "4,-5":
            continue
        ring = compute_ring(q, r)
        index = compute_ring_index(q, r, ring)
        rich, poor = choose_resources(key)
        entries.append(
            {
                "key": key,
                "label": label,
                "ring": ring,
                "index": index,
                "rich": rich,
                "poor": poor,
            }
        )
    entries.sort(key=lambda entry: (entry["ring"], entry["index"]))
    block = build_overrides_block(entries)
    update_sector_parameters(SECTOR_PARAMETERS_PATH, block)
    print(f"Updated sector resources for {len(entries)} sectors in {SECTOR_PARAMETERS_PATH}.")


if __name__ == "__main__":
    main()
