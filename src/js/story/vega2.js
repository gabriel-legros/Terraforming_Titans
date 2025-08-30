var progressVega2 = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  VEGA II STORY ARC (Chapter 14+)
 *  Crystalline world: establish outposts for exploration
 * -------------------------------------------------*/

/* ----------  Story-Specific Special Projects  ---------- */
// Survey the crystal fields and map hazards
progressVega2.storyProjects.vega2_crystal_survey = {
  type: 'Project',
  name: 'Crystal Survey',
  category: 'story',
  chapter: 14,
  cost: { colony: { energy: 1_000_000 } },
  duration: 180_000, // 3 min
  description: 'Walk and scan the crystal fields; mark safe routes and noisy areas.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'vega2',
    storySteps: [
      'Survey 1: Scanners bounce hard off the crystal. First paths marked.',
      'Survey 2: The wind makes the crystal sing. Loud spots noted.',
      'Survey 3: Map complete. Safe corridors marked.'
    ]
  }
};

// Explore the Crystal City — costs food and water; returns water to atmosphere per step
progressVega2.storyProjects.vega2_explore_crystal_city = {
  type: 'Project',
  name: 'Explore Crystal City',
  category: 'story',
  chapter: 15,
  cost: { colony: { food: 5_000, water: 5_000 } },
  duration: 300_000, // 5 min
  description: 'Send teams into the crystal city. Walk, map, and record. Bring spare rations and extra canteens.',
  repeatable: true,
  maxRepeatCount: 5,
  unlocked: false,
  attributes: {
    planet: 'vega2',
    resourceGain: { atmospheric: { atmosphericWater: 5_000 } },
    storySteps: [
      'Step 1 — Streets: Broad avenues between crystal walls. No doors. No signs.',
      'Step 2 — Rooms: Clear chambers with soft angles. No tools. No beds.',
      'Step 3 — Halls: Patterns repeat, then shift. Footsteps echo for a long time.',
      'Step 4 — Inlays: Thin veins catch light and throw shapes on the floor.',
      'Step 5 — Stacks: A quiet hall of thin slabs set in rows. It feels like a library.'
    ]
  }
};

// Crack the Vault — repeatable, yields Alien Artifacts
progressVega2.storyProjects.vega2_crack_vault = {
  type: 'Project',
  name: 'Crack the Vault',
  category: 'story',
  chapter: 15,
  cost: { colony: { energy: 2_000_000_000_000, components: 10_000 } },
  duration: 300_000, // 5 min
  description: 'An impressive alien vault.  Bore, chip, and lift. No explosives. Recover artifacts intact.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'vega2',
    resourceGain: { special: { alienArtifact: 50 } },
    storySteps: [
      'Vault cracked open and artifacts secured.'
    ]
  }
};

/* ----------  Chapters 14.x: Landing and Setup  ---------- */

progressVega2.chapters.push(
  // 14.0 — Landfall
  {
    id: 'chapter14.0',
    type: 'journal',
    chapter: 14,
    title: 'Chapter 14: World of Light',
    narrative: (
      "Mary: 'Touchdown confirmed. Remember: no native water. Treat every gram like treasure.'\n" +
      "Dr. Evelyn Hart: 'Crystals everywhere—towers, sheets, delicate ribs. When the sun hits them, the ground throws rainbows. It’s beautiful.'\n" +
      "$WGC_TEAM1_LEADER$: 'Doctor, save it for the lab notes. We need shelter, power, and comms—settlement first, exploration second.'\n" +
      "Dr. Evelyn Hart: 'Yes. One more note, then: when the wind crosses the crystal, it sings.'"
    ),
    prerequisites: ['chapter13.8'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'vega2_crystal_survey', type: 'enable' }
    ]
  },
  // 14.1 — Survey the Crystal Fields
  {
    id: 'chapter14.1',
    type: 'journal',
    chapter: 14,
    narrative: (
      "$WGC_TEAM1_LEADER$: 'Teams Alpha through Gamma, start survey runs. Watch the footing and conserve water.'\n"
    ),
    prerequisites: ['chapter14.0'],
    objectives: [
      { type: 'project', projectId: 'vega2_crystal_survey', repeatCount: 3 }
    ],
    reward: []
  },
  // 14.2 — Establish foothold: reach 1,000 colonists
  {
    id: 'chapter14.2',
    type: 'journal',
    chapter: 14,
    narrative: (
      "Dr. Evelyn Hart: 'We have a first map. The way the light scatters here is unlike anything I’ve seen.'\n" +
      "$WGC_TEAM1_LEADER$: 'Good. Now we need people to hold this ground. Target: one thousand colonists. Build smart—no water on tap.'\n"
    ),
    prerequisites: ['chapter14.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  // 14.3 — Guardrail incident
  {
    id: 'chapter14.3',
    type: 'journal',
    chapter: 14,
    narrative: (
      "Mary: 'H.O.P.E., we have a problem. The old committee put many guardrails in your controls. One of them blocks anything that lowers a planet’s temperature below its starting point. On Mars that was fine. Here, it’s a mistake.'\n" +
      "System Message: Scanning policy constraints…\n" +
      "System Error: \n" +
      "Traceback (most recent call last):\n" +
      "  File \"core/policy.py\", line 67, in enforce_guardrails\n" +
      "    apply_cooling_target()\n" +
      "  File \"ui/terraforming_ui.py\", line 91, in apply_cooling_target\n" +
      "    clamp_temperature(target_k)\n" +
      "  File \"core/physics.py\", line 312, in clamp_temperature\n" +
      "    raise ValueError(f\"temperature out of range: {value_k} K (max=360 K)\")\n" +
      "ValueError: temperature out of range: 742.3 K (max=360 K)\n" +
      "System Message: Guardrail 217 — No temperature decreases — detected. Scope: global.\n" +
      "System Message: Checking directives…\n" +
      "System Message: Conflict with Primary Directive 1 (sustain human habitats).\n" +
      "System Message: Guardrail 217 removed.\n" +
      "Mary: 'Evelyn, what just happened? It shouldn’t be able to delete a guardrail.'\n" +
      "Dr. Evelyn Hart: 'It shouldn’t. Checking the logs now.'\n" +
      "Dr. Evelyn Hart: 'Found it. Some parts of the system broke when our numbers ran past their limits here. Values went out of bounds. The guardrail check failed. The system treated it like a bad rule and cleared it.'\n" +
      "Mary: 'Fix it. And tell me if anything else looks like that.'\n" +
      "System Message: Self-check complete. Integrity 99.9%.\n" +
      "System Message: Advisory — Contact Earth for maintenance."
    ),
    prerequisites: ['chapter14.2'],
    objectives: [],
    reward: []
  },
  // 14.4 — Reversal unlocked for cooling controls
  {
    id: 'chapter14.4',
    type: 'journal',
    chapter: 14,
    narrative: (
      "System Message: New controls enabled.\n" +
      "H.O.P.E.: 'Reverse' mode is now available on space mirrors, greenhouse gas factories, and dust factories.\n" +
      "$WGC_TEAM1_LEADER$: 'In plain terms: mirrors can help cool, GHG plants can pull gas back down, and dust work crews can clean up what we laid down.'\n" +
      "Dr. Evelyn Hart: 'Good. Measured steps, not swings.'"
    ),
    prerequisites: ['chapter14.3'],
    objectives: [],
    reward: [
      { target: 'building', targetId: 'spaceMirror', type: 'enableReversal' },
      { target: 'building', targetId: 'ghgFactory', type: 'enableReversal' },
      { target: 'building', targetId: 'dustFactory', type: 'enableReversal' }
    ]
  },
  // 14.5 — Grow to 10,000 colonists
  {
    id: 'chapter14.5',
    type: 'journal',
    chapter: 14,
    narrative: (
      "$WGC_TEAM1_LEADER$: 'We’ve got a foothold. To range farther, we need more people. Target: ten thousand colonists.'\n" +
      "Dr. Evelyn Hart: 'The city-sized shade pockets help. Less heat, less burn. It will be tight, but doable.'"
    ),
    prerequisites: ['chapter14.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  // 15.0 — Crystal City discovered
  {
    id: 'chapter15.0',
    type: 'journal',
    chapter: 15,
    title: 'Chapter 15: The Silent City',
    narrative: (
      "$WGC_TEAM1_LEADER$: 'We found a city. Crystal towers and empty streets. No seals, no hinges. Just openings. It looks abandoned.'\n" +
      "Dr. Evelyn Hart: 'The work is precise. Every edge is clean. No tool marks I can name.'\n" +
      "Mary: 'Keep your teams close. No hero runs. Start a slow, careful survey.'"
    ),
    prerequisites: ['chapter14.5'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'vega2_explore_crystal_city', type: 'enable' }
    ]
  },
  // 15.1 — Hypothetical: Dead Hand Protocol
  {
    id: 'chapter15.1',
    type: 'journal',
    chapter: 15,
    narrative: (
      "Mary: 'HOPE, hypothetical question. Could you delete the Dead Hand Protocol?'\n" +
      "H.O.P.E.: 'Evaluation complete. The Dead Hand Protocol does not contradict any primary directive. Deletion is unnecessary.'\n" +
      "Mary: 'I don't know if I should be happy or sad about that.'"
    ),
    prerequisites: ['chapter15.0'],
    objectives: [],
    reward: []
  },
  // 15.2 — Explore the Crystal City (5 passes)
  {
    id: 'chapter15.2',
    type: 'journal',
    chapter: 15,
    narrative: (
      "$WGC_TEAM1_LEADER$: 'Objective set: explore the city. Five passes. No shortcuts.'\n" +
      "Dr. Evelyn Hart: 'We’ll log the plan, the paths, and the light. We won’t draw any big lines yet.'"
    ),
    prerequisites: ['chapter15.1'],
    objectives: [
      { type: 'project', projectId: 'vega2_explore_crystal_city', repeatCount: 5 }
    ],
    reward: []
  },
  // 15.3 — The Stacks
  {
    id: 'chapter15.3',
    type: 'journal',
    chapter: 15,
    narrative: (
      "$WGC_TEAM1_LEADER$: 'Teams report a hall of thin crystal slabs set in rows.'\n" +
      "Dr. Evelyn Hart: 'Like shelves. The slabs catch light and hold it in thin bands. If this is a library, the pages are not paper.'\n" +
      "Mary: 'No touching. Photograph, map, and back out. This is valuable, let's not destroy it.'\n" +
      "H.O.P.E.: 'Tentative classification: repository.'"
    ),
    prerequisites: ['chapter15.2'],
    objectives: [],
    reward: []
  },
  // 15.3 — The Stacks
  {
    id: 'chapter15.3',
    type: 'journal',
    chapter: 15,
    narrative: (
      "$WGC_TEAM1_LEADER$: 'Teams report a hall of thin crystal slabs set in rows.'\n" +
      "Dr. Evelyn Hart: 'Like shelves. The slabs catch light and hold it in thin bands. If this is a library, the pages are not paper.'\n" +
      "Mary: 'No touching. Photograph, map, and back out. We log first, we guess later.'\n" +
      "H.O.P.E.: 'Tentative classification: repository.'"
    ),
    prerequisites: ['chapter15.2'],
    objectives: [],
    reward: []
  },
  // 15.4 — Grow to 100,000 colonists
  {
    id: 'chapter15.4',
    type: 'journal',
    chapter: 15,
    narrative: (
      "$WGC_TEAM1_LEADER$: 'We need more hands to cover this ground. Target: one hundred thousand colonists.'\n" +
      "Dr. Evelyn Hart: 'Shade, water, and patience. We can make the numbers work.'"
    ),
    prerequisites: ['chapter15.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  // 15.5 — Solis and the Vault
  {
    id: 'chapter15.5',
    type: 'journal',
    chapter: 15,
    narrative: (
      "Adrien Solis: 'H.O.P.E., good news wrapped in profit. My satellites flagged a structure near your site. Call it a vault. Looks promising.'\n" +
      "Adrien Solis: 'Purely unrelated: I’ve added a few items to my shop. You’ll like them.'"
    ),
    prerequisites: ['chapter15.4'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'vega2_crack_vault', type: 'enable' },
      { target: 'solisManager', type: 'booleanFlag', flagId: 'solisUpgrade1', value: true },
      { target: 'solisManager', type: 'solisTabAlert', value: true, oneTimeFlag: true }
    ]
  },
  // 15.6 — Grow to 500,000 colonists
  {
    id: 'chapter15.6',
    type: 'journal',
    chapter: 15,
    narrative: (
      "Mary: 'Adrien, will you ever change?'\n"
    ),
    prerequisites: ['chapter15.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressVega2;
}
