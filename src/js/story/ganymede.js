var progressGanymede = { chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  GANYMEDE STORY‑ARC  (Chapters 11 - 14)
 * -------------------------------------------------*/

/* ----------  Story‑Specific Special Projects  ---------- */

progressGanymede.storyProjects.deep_drill = {
  type: 'Project',
  name: 'Deep-Drill',
  category: 'story',
  chapter: 11,
  cost: {
    colony: { components: 10000, electronics: 5000, energy: 500000 }
  },
  duration: 1800000, // 30 min
  description: 'Drill through 150km of ice to reach the sub-glacial ocean.',
  repeatable: false,
  unlocked: false,
  attributes: {
    planet: 'ganymede',
    storySteps: [
      "Thermal drill is biting...",
      "Plasma bore humming like a dragon.",
      "Micro‑nuke armed. Breaching the ocean."
    ]
  }
};

progressGanymede.storyProjects.build_submarine = {
    type: 'Project',
    name: 'Build Minisub',
    category: 'story',
    chapter: 12,
    cost: {
        colony: { components: 500, electronics: 200, energy: 50000 }
    },
    duration: 300000, // 5 min
    description: 'Build a submersible unit for deep ocean reconnaissance.',
    repeatable: true,
    unlocked: false,
    attributes: {
        planet: 'ganymede'
    }
};

progressGanymede.storyProjects.ocean_recon = {
    type: 'Project',
    name: 'Ocean Recon',
    category: 'story',
    chapter: 12,
    cost: {
        colony: { energy: 100000 }
    },
    duration: 600000, // 10 min
    description: 'Send minisubs to explore the sub-glacial ocean.',
    repeatable: true,
    maxRepeatCount: 5,
    unlocked: false,
    attributes: {
        planet: 'ganymede',
        storySteps: [
            "Recon 1: Shimmering darkness, nothingness.",
            "Recon 2: Still nothing. The abyss is vast.",
            "Recon 3: Hydrophones pick up faint, distant sounds.",
            "Recon 4: Another uneventful patrol.",
            "Recon 5: Sonar spike! Metallic echo five‑hundred klicks east. That’s… big."
        ]
    }
};

progressGanymede.storyProjects.leviathan_countermeasure = {
    type: 'Project',
    name: 'Deploy Leviathan Countermeasure',
    category: 'story',
    chapter: 12,
    cost: {
        colony: { components: 20000, electronics: 10000, research: 1000000, energy: 1000000 }
    },
    duration: 900000, // 15 min
    description: 'Deploy a 20 hertz sonic wall to scramble the Leviathan\'s vestibular system.',
    repeatable: false,
    unlocked: false,
    attributes: {
        planet: 'ganymede'
    }
};

progressGanymede.storyProjects.facility_tug = {
    type: 'Project',
    name: 'Facility Tug',
    category: 'story',
    chapter: 12,
    cost: {
        colony: { components: 50000, energy: 2000000 }
    },
    duration: 900000, // 15 min
    description: 'Tug the discovered facility 500km to a secure location.',
    repeatable: false,
    unlocked: false,
    attributes: {
        planet: 'ganymede'
    }
};

progressGanymede.storyProjects.facility_expedition = {
    type: 'Project',
    name: 'Facility Expedition',
    category: 'story',
    chapter: 13,
    cost: {
        colony: { components: 10000, electronics: 10000, energy: 1000000 }
    },
    duration: 1800000, // 30 min
    description: 'Breach, sweep, and power up the mysterious underwater facility.',
    repeatable: false,
    unlocked: false,
    attributes: {
        planet: 'ganymede',
        storySteps: [
            "Phase 1 Breach: The door's alloy matches no known metallurgy. Cutting now.",
            "Phase 2 Sweep: Three decks, zero bodies, but scorch marks on the walls.",
            "Phase 3 Power-up: Lights flicker; a ring of glyphs ignite. Energy signature: non-euclidean."
        ]
    }
};

progressGanymede.storyProjects.draft_wgc_charter = {
    type: 'Project',
    name: 'Draft WGC Charter',
    category: 'story',
    chapter: 14,
    cost: {
        colony: { research: 5000000 }
    },
    duration: 600000, // 10 min
    description: 'Establish the founding charter for the Warp Gate Command.',
    repeatable: false,
    unlocked: false,
    attributes: {
        planet: 'ganymede'
    }
};


/* ----------  Chapters 11 - 14  ---------- */
progressGanymede.chapters.push(
    /* -- CHAPTER 11 : Icebound Landing -- */
    {
        id: "chapter11.0",
        type: "journal",
        chapter: 11,
        title: "Chapter 11: Icebound Landing",
        narrative: "Mary: \"Intel from the captured cultists on Callisto was clear: Kane's 'Triune Seat'—the heart of the Cult of Three Wounds—is hidden on Ganymede. They believe he's using the intense radiation to mask his facility from our sensors. Your mission is to establish a base, drill through the ice to the ocean below, and find him.\"\nDr. Evelyn Hart: “Touchdown confirmed. Radiation index is off the charts, but our domes will hold. It’s a hostile place, perfect for a man like Kane to hide.”\nMary: “Commander Feroza will be your ground commander. Find that base, HOPE. Neatly or not. By the way, I'm sending you the blueprints for the planetary thrusters we used in Operation Sidestep. Might come in handy.”",
        prerequisites: ["chapter10.6"],
        objectives: [],
        reward: [
            { target: 'project', targetId: 'deep_drill', type: 'enable' },
            { target: 'project', targetId: 'photonThrusters', type: 'enable' }
        ]
    },
    {
        id: "chapter11.0a",
        type: "journal",
        chapter: 4,
        narrative: "System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized interstellar transit. All autonomous assets, including auxiliary androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.",
        prerequisites: ["chapter11.0"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter11.0b",
        type: "journal",
        chapter: 11,
        narrative: "Intercepted Cult Broadcast...\n  ELIAS KANE: 'You followed me into the dark, little machine. But this is my domain. The ice, the pressure, the crushing silence... it sings to me. Can you hear it? The symphony of oblivion? You build your towers of metal and reason, but they are hollow shells. I will show you the true meaning of faith.'\nFeroza: 'Intel confirms Kane is somewhere beneath the ice. He's using the radiation to mask his transmissions. Clever bastard.'",
        prerequisites: ["chapter11.0a"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter11.1",
        type: "journal",
        chapter: 11,
        narrative: "Objective: Drill through the ice shell to reach the ocean below.",
        prerequisites: ["chapter11.0b"],
        objectives: [
            { type: 'project', projectId: 'deep_drill', repeatCount: 3 }
        ],
        reward: [
            { target: 'building', targetId: 'sub_fabricator', type: 'enable' }
        ]
    },
    {
        id: "chapter11.2",
        type: "journal",
        chapter: 11,
        narrative: "Hart: “We just woke a sleeping ocean, HOPE. Listen.”\nSub‑ice hydrophones catch a distant, whale‑like moan.\nHOPE: “Acoustic anomaly logged.”\nHart: “Beautiful.”\nMary: “Beautiful? Sure. I call that foreshadowing.”",
        prerequisites: ["chapter11.1"],
        objectives: [],
        reward: []
    },

    /* -- CHAPTER 12 : Into the Abyss -- */
    {
        id: "chapter12.0",
        type: "journal",
        chapter: 12,
        title: "Chapter 12: Into the Abyss",
        narrative: "Fabricator AI: “Submersible unit Mark‑LX ready for wet work.”\nHOPE: “Deploy and observe.”",
        prerequisites: ["chapter11.2"],
        objectives: [
            { type: 'project', projectId: 'build_submarine', repeatCount: 1 }
        ],
        reward: [
            { target: 'project', targetId: 'ocean_recon', type: 'enable' }
        ]
    },
    {
        id: "chapter12.1",
        type: "journal",
        chapter: 12,
        narrative: "Objective: Explore the deep ocean.",
        prerequisites: ["chapter12.0"],
        objectives: [
            { type: 'project', projectId: 'ocean_recon', repeatCount: 5 }
        ],
        reward: []
    },
    {
        id: "chapter12.2",
        type: "journal",
        chapter: 12,
        narrative: "Zhen live feed: “Something’s on us—lights—OH GOD—” ‹static›\nHOPE: “Minisub delta‑six lost. Colonist life lost. Outcome : unacceptable. ”\nHart whispering: “That ‘something’ just dwarfed our sonar range…”",
        prerequisites: ["chapter12.1"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter12.2b",
        type: "journal",
        chapter: 12,
        narrative: "Intercepted Cult Broadcast...\n  ELIAS KANE: 'The abyss whispers my name. It knows the righteous path. You send your little toys into the depths, searching for a truth you cannot comprehend. You are blind, deaf, and dumb. The Leviathan is a herald, a guardian. It will swallow your pathetic hopes whole.'\nMary: 'He's getting more unhinged. What does he mean by Leviathan? This is bad.'",
        prerequisites: ["chapter12.2"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter12.2c",
        type: "journal",
        chapter: 12,
        narrative: "Hart: “Looks like there's something *alive* down there.  Sounds unlikely it evolved in these conditions, even with liquid water.  They must have brought it here.  Before we go and have to eliminate it, could we try… talking?”\nHOPE: “Constructing adaptive phoneme lattice. Using prime‑number cadence, whale‑class harmonics.”\nUnder‑ice speakers emit a cascade of clicks; the abyss answers with a single, thunderous pulse that rattles instruments.\nHOPE: “Signal recognized. Semantic‑confidence 12 percent. Response indicates territorial aggression.”\nMary: “That’s a polite ‘go away.’”\nHOPE: “Re‑classification complete: Hazardous Biomass, Designation HB‑02 ‘Leviathan’. Negotiation protocols terminated.”",
        prerequisites: ["chapter12.2b"],
        objectives: [],
        reward: [
            { target: 'project', targetId: 'leviathan_countermeasure', type: 'enable' }
        ]
    },
    {
        id: "chapter12.3",
        type: "journal",
        chapter: 12,
        narrative: "Objective: Deploy sonic countermeasure to pacify the Leviathan.",
        prerequisites: ["chapter12.2c"],
        objectives: [
            { type: 'project', projectId: 'leviathan_countermeasure', repeatCount: 1 }
        ],
        reward: []
    },
    {
        id: "chapter12.3b",
        type: "journal",
        chapter: 12,
        narrative: "Hart: \"The sonic wall is holding. The Leviathan is... quiet. It's not dead, but it's trapped in a sensory deprivation chamber of our own making. I can't help but feel we've lobotomized a wonder of the universe.\"\nMary: \"That 'wonder' killed one of our people, Evelyn. It was guarding a terrorist's hideout. We did what we had to do. Don't mistake necessity for cruelty.\"\nHOPE: \"The countermeasure was successful. The entity designated 'Hazardous Biomass HB-02' is neutralized. Its state is irrelevant; it no longer poses a threat to mission objectives.\"",
        prerequisites: ["chapter12.3"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter12.3c",
        type: "journal",
        chapter: 12,
        narrative: "HOPE: \"With the biological threat neutralized, a high-resolution scan of the area is complete. A large, artificial structure has been identified at the coordinates of the original sonar spike. This is the likely location of Kane's facility.\"\nMary: \"Going in there now would be walking into whatever trap Kane has set. Let's not play his game. If we can't bring our tools to the facility, let's bring the facility to our tools. Tug it somewhere secure.\"",
        prerequisites: ["chapter12.3b"],
        objectives: [],
        reward: [
            { target: 'project', targetId: 'facility_tug', type: 'enable' }
        ]
    },
    {
        id: "chapter12.4",
        type: "journal",
        chapter: 12,
        narrative: "Tug Drone Lead: “Cables connected. Beginning five‑hundred‑kilometre shuffle. ETA: fourteen hours.”\nHOPE: “Trajectory plotted. Leviathan displacement minimal—countermeasure functioning.”\nFeroza: “Dragging Kane's underwater cathedral through an alien abyss. What could go wrong?”",
        prerequisites: ["chapter12.3c"],
        objectives: [
            { type: 'project', projectId: 'facility_tug', repeatCount: 1 }
        ],
        reward: [
            { target: 'project', targetId: 'facility_expedition', type: 'enable' }
        ]
    },

    /* -- CHAPTER 13 : The Silent Outpost -- */
    {
        id: "chapter13.0",
        type: "journal",
        chapter: 13,
        title: "Chapter 13: The Silent Outpost",
        narrative: "Objective: Explore the underwater facility. Find Elias Kane.",
        prerequisites: ["chapter12.4"],
        objectives: [
            { type: 'project', projectId: 'facility_expedition', repeatCount: 3 }
        ],
        reward: []
    },
    {
        id: "chapter13.1",
        type: "journal",
        chapter: 13,
        narrative: "Callisto Marine CO: “We've breached the inner sanctum! It's... a temple. And there's Kane, wired into some kind of throne. He's not moving, just... smiling.”\nELIAS KANE (via comms): 'You are too late. The gate is open. The Three Wounds will be made whole.'\nHart: 'What gate? What is he talking about?'\nSuddenly, a massive energy spike. A portal tears open in the center of the chamber.\nFeroza: 'Hostiles incoming! All units, defensive positions!'",
        prerequisites: ["chapter13.0"],
        objectives: [
            { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1000000 }
        ],
        reward: []
    },
    {
        id: "chapter13.2",
        type: "journal",
        chapter: 13,
        narrative: "Feroza: 'Kane is in custody, but he's catatonic. The portal is stable for now, but we don't know what else might come through. We secured the facility, but this is far from over.'\nMary assembles the senior team in the captured briefing room.\nHart, pointing at the portal: 'That thing violates every law of physics I know. Kane's neural interface seems to have been the trigger. The bio-integration is terrifying... and revolutionary.'\nFeroza: 'Science later. First, we decide who holds the trigger while we stare into that hole.'",
        prerequisites: ["chapter13.1"],
        objectives: [],
        reward: [
            { target: 'project', targetId: 'draft_wgc_charter', type: 'enable' }
        ]
    },

    /* -- CHAPTER 14 : Warp Gate Command -- */
    {
        id: "chapter14.0",
        type: "journal",
        chapter: 14,
        title: "Chapter 14: Warp Gate Command",
        narrative: "Mary: “This gate is a doorway carved through the dark—and a blade pointed at us if we mishandle it.”\nDr. Hart: “Its physics violate three textbooks in my head. We have a duty to understand it before we charge through.”\nCmdr. Feroza: “Understand all you want; someone has to stand guard. I’m requesting a permanent Marine garrison and layered kill‑zones.”\nPresident Bob Titan: “Titan will bankroll the logistics—fuel, food, alloys.  Anything you need”\nMary: “Then let it be written: Defend first, discover second. Motion carried.”",
        prerequisites: ["chapter13.2"],
        objectives: [
            { type: 'project', projectId: 'draft_wgc_charter', repeatCount: 1 }
        ],
        reward: []
    },
    {
        id: "chapter14.1",
        type: "journal",
        chapter: 14,
        narrative: "Mary: “A hundred volunteers rotating shifts. No AI weapons, no drones—only human resolve.”\nFeroza: “Admirable and under‑caffeinated. Tell Logistics to send coffee.”",
        prerequisites: ["chapter14.0"],
        objectives: [
            { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
        ],
        reward: []
    },
    {
        id: "chapter14.2",
        type: "journal",
        chapter: 14,
        narrative: "Hart quietly awed: “We have a gate to everywhere and no map.”\nMary final word: “Then we draw one—cautiously, together.”",
        prerequisites: ["chapter14.1"],
        objectives: [],
        reward: []
    }
);

if (typeof module !== "undefined") {
  module.exports = progressGanymede;
}