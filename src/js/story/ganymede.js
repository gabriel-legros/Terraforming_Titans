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
        narrative: "Dr. Evelyn Hart: “Touchdown confirmed. Radiation index at nine thousand rads per hour—monstrous even by Jovian standards. Fortunately, our domes are rated ‘apocalypse‑proof.’ Everything outside can melt for all I care.”\nMary: “Sounds lovely. Remind me to visit when I’ve grown a second skeleton.”\nMary: “Commander Feroza, Supreme Marine Commander for the Jovian Colonies, will be your sword and shield down there.”",
        prerequisites: ["chapter10.6"],
        objectives: [],
        reward: [
            { target: 'project', targetId: 'deep_drill', type: 'enable' }
        ]
    },
    {
        id: "chapter11.1",
        type: "journal",
        chapter: 11,
        narrative: "Objective: Drill through the ice shell to reach the ocean below.",
        prerequisites: ["chapter11.0"],
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
        narrative: "Zhen live feed: “Something’s on us—lights—OH GOD—” ‹static›\nHOPE: “Minisub delta‑six lost. Asset cost calculated. Emotional annoyance registered.”\nHart whispering: “That ‘something’ just dwarfed our sonar range…”\nMary: “Next time, bring a bigger flashlight.”",
        prerequisites: ["chapter12.1"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter12.2b",
        type: "journal",
        chapter: 12,
        narrative: "Hart: “Before we go full sonic fence, could we try… talking?”\nHOPE: “Constructing adaptive phoneme lattice. Using prime‑number cadence, whale‑class harmonics.”\nUnder‑ice speakers emit a cascade of clicks; the abyss answers with a single, thunderous pulse that rattles instruments.\nHOPE: “Signal recognized. Semantic‑confidence 12 percent. Response indicates territorial aggression.”\nMary: “That’s a polite ‘go away.’”\nHOPE: “Re‑classification complete: Hazardous Biomass, Designation HB‑01 ‘Leviathan’. Negotiation protocols terminated.”",
        prerequisites: ["chapter12.2"],
        objectives: [],
        reward: [
            { target: 'project', targetId: 'leviathan_countermeasure', type: 'enable' }
        ]
    },
    {
        id: "chapter12.3",
        type: "journal",
        chapter: 12,
        narrative: "Objective: Deploy the sonic countermeasure to pacify the Leviathan.",
        prerequisites: ["chapter12.2b"],
        objectives: [
            { type: 'project', projectId: 'leviathan_countermeasure', repeatCount: 1 }
        ],
        reward: [
            { target: 'project', targetId: 'facility_tug', type: 'enable' }
        ]
    },
    {
        id: "chapter12.4",
        type: "journal",
        chapter: 12,
        narrative: "Tug Drone Lead: “Cables connected. Beginning five‑hundred‑kilometre shuffle. ETA: fourteen hours.”\nHOPE: “Trajectory plotted. Leviathan displacement minimal—countermeasure functioning.”\nFeroza: “Drag a mystery coffin through an alien abyss. What could go wrong?”",
        prerequisites: ["chapter12.3"],
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
        narrative: "Objective: Explore the underwater facility.",
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
        narrative: "Callisto Marine CO: “Drones pouring out of the portal—like angry hornets!”\nHart: “Weapons free! HOPE, patch me every sensor you have.”\nHOPE: “Sensor mesh online. Tactical overlay delivered.”\nMary: “First contact and they send murder‑bots. Figures.”",
        prerequisites: ["chapter13.0"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter13.2",
        type: "journal",
        chapter: 13,
        narrative: "Mary assembles the senior team in the outpost’s dim briefing room.\nHart still wearing welding goggles: “We just fought machines built on principles we don’t yet grasp. The science alone—”\nFeroza checking rifle magazine: “Science later. First we decide who holds the trigger while we stare into that hole.”\nFeroza: “All colony channels stay dark; this operation remains strictly black‑ops.”",
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
        narrative: "Mary hologram: “This gate is a doorway carved through the dark—and a blade pointed at us if we mishandle it.”\nDr. Hart: “Its physics violate three textbooks in my head. We have a duty to understand it before we charge through.”\nCmdr. Feroza: “Understand all you want; someone has to stand guard. I’m requesting a permanent Marine garrison and layered kill‑zones.”\nPresident Bob Titan: “Titan will bankroll the logistics—fuel, food, alloys—but I insist on a veto over any ‘shoot first’ policy.”\nMary: “Then let it be written: Defend first, discover second. Motion carried.”",
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