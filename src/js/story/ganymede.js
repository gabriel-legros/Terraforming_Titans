var progressGanymede = { chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  GANYMEDE STORY‑ARC  (Chapters 10 - 13)
 * -------------------------------------------------*/

/* ----------  Story‑Specific Special Projects  ---------- */

progressGanymede.storyProjects.deep_drill = {
  type: 'Project',
  name: 'Deep-Drill',
  category: 'story',
  chapter: 10,
  cost: {
    colony: { components: 100, electronics: 50, energy: 500000 }
  },
  duration: 600000, // 10 min
  description: 'Drill through 150km of ice to reach the sub-glacial ocean.',
  repeatable: true,
  maxRepeatCount: 3,
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
    name: 'Build Submarines',
    category: 'story',
    chapter: 11,
    cost: {
        colony: { components: 500, electronics: 200, energy: 50000 }
    },
    duration: 300000, // 5 min
    description: 'Build submersible units for deep ocean reconnaissance.',
    repeatable: true,
    maxRepeatCount:1,
    unlocked: false,
    attributes: {
        planet: 'ganymede'
    }
};

progressGanymede.storyProjects.ocean_recon = {
    type: 'Project',
    name: 'Ocean Recon',
    category: 'story',
    chapter: 11,
    cost: {
        colony: { energy: 100000 }
    },
    duration: 300000, // 5 min
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
    chapter: 11,
    cost: {
        colony: { components: 2000, electronics: 1000, research: 1000000, energy: 1000000 }
    },
    duration: 600000, // 10 min
    description: 'Deploy a 20 hertz sonic wall to scramble the Leviathan\'s vestibular system.',
    repeatable: true,
    maxRepeatCount: 1,
    unlocked: false,
    attributes: {
        planet: 'ganymede'
    }
};

progressGanymede.storyProjects.facility_tug = {
    type: 'Project',
    name: 'Facility Tug',
    category: 'story',
    chapter: 11,
    cost: {
        colony: { components: 50000, energy: 2000000 }
    },
    duration: 600000, // 10 min
    description: 'Tug the discovered facility 500km to a secure location.',
    repeatable: true,
    maxRepeatCount: 1,
    unlocked: false,
    attributes: {
        planet: 'ganymede'
    }
};

progressGanymede.storyProjects.facility_expedition = {
    type: 'Project',
    name: 'Facility Expedition',
    category: 'story',
    chapter: 12,
    cost: {
        colony: { components: 10000, electronics: 10000, energy: 1000000 }
    },
    duration: 300000, // 15 min
    description: 'Breach, sweep, and power up the mysterious underwater facility.',
    repeatable: true,
    maxRepeatCount: 3,
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
    chapter: 13,
    cost: {
        colony: { research: 5000000 }
    },
    duration: 120000, // 2 min
    description: 'Establish the founding charter for the Warp Gate Command.',
    repeatable: true,
    maxRepeatCount:4,
    unlocked: false,
    attributes: {
        planet: 'ganymede',
        storySteps: [
            "Article I: The Warp Gate Command (WGC) is hereby established to safeguard the Sol System and to direct all exploration of the space beyond the Gate.",
            "Article II: Supreme authority is vested in a council representing the unified colonies. Mars shall direct strategic oversight, Titan shall manage logistics, and a joint command on Callisto and Ganymede shall conduct military operations. The formerly known Mars Terraforming Committee will guide all research.",
            "Article III: All data, technology, and materials recovered from beyond the Gate are the common property of humanity. All findings will be subject to rigorous peer review and security assessment before public dissemination.",
            "Article IV: This charter may be amended only by the unanimous consent of the council. By this act, the Warp Gate Command is declared operational, its authority absolute in all matters concerning the Gate."
        ]
    }
};


/* ----------  Chapters 10 - 13  ---------- */
progressGanymede.chapters.push(
    /* -- CHAPTER 10 : Icebound Landing -- */
    {
        id: "chapter10.0",
        type: "journal",
        chapter: 10,
        title: "Chapter 10: We must go deeper",
        narrative: "Mary: \"Intel from the captured cultists on Callisto was clear: Kane's 'Triune Seat'—the heart of the Cult of Three Wounds—is hidden beneath the underground oceans on Ganymede. They believe he's using the intense radiation to mask his facility from our sensors. Your mission is to establish a base, drill through the ice to the ocean below, and find him.\"\nDr. Evelyn Hart: “Touchdown confirmed. Radiation index is off the charts, but our domes will hold. It’s a hostile place, perfect for a man like Kane to hide.”\nMary: “Commander Feroza will be your ground commander. Find that base, HOPE. Neatly or not. By the way, I'm sending you the blueprints for the planetary thrusters we used in Operation Sidestep. Might come in handy.”",
        prerequisites: ["chapter9.9"],
        objectives: [],
        reward: [
            { target: 'project', targetId: 'deep_drill', type: 'enable' },
            { target: 'project', targetId: 'planetaryThruster', type: 'enable' }
        ]
    },
    {
        id: "chapter10.0a",
        type: "journal",
        chapter: 10,
        narrative: "System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized space transit. All autonomous assets, including auxiliary androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.",
        prerequisites: ["chapter10.0"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter10.0b",
        type: "journal",
        chapter: 10,
        narrative: "Intercepted Cult Broadcast...\n  Elias Kane: 'You followed me into the dark, little machine. But this is my domain. The ice, the pressure, the crushing silence... it sings to me. Can you hear it? The symphony of oblivion? You build your towers of metal and reason, but they are hollow shells. I will show you the true meaning of faith.'\nFeroza: 'Intel confirms Kane is somewhere beneath the ice. He's using the radiation to mask his transmissions. Clever bastard.'",
        prerequisites: ["chapter10.0a"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter10.1",
        type: "journal",
        chapter: 10,
        narrative: "Objective: Drill through the ice shell to reach the ocean below.",
        prerequisites: ["chapter10.0b"],
        objectives: [
            { type: 'project', projectId: 'deep_drill', repeatCount: 3 }
        ],
        reward: [
        ]
    },
    {
        id: "chapter10.2",
        type: "journal",
        chapter: 10,
        narrative: "Hart: “We just broke through! Listen.”\nSub‑ice hydrophones catch a distant, whale‑like moan.\nHOPE: “Acoustic anomaly logged.”\nHart: “Beautiful.”\nMary: “Beautiful? Sure. I call that foreshadowing.”",
        prerequisites: ["chapter10.1"],
        objectives: [{ type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5000 }],
        reward: [{ target: 'project', targetId: 'build_submarine', type: 'enable' },]
    },

    /* -- CHAPTER 11 : Into the Abyss -- */
    {
        id: "chapter11.0",
        type: "journal",
        chapter: 11,
        title: "Chapter 11: Into the Abyss",
        narrative: "Mary: “The ocean under Ganymede is practically a fantasy.  Anyway, we won't be able to find Kane down there without some equipment.  Let's build and deploy a few state of the art submarines down there.  I do not believe we had one of those since Earth...”",
        prerequisites: ["chapter10.2"],
        objectives: [
            { type: 'project', projectId: 'build_submarine', repeatCount: 1 }
        ],
        reward: [
            { target: 'project', targetId: 'ocean_recon', type: 'enable' }
        ]
    },
    {
        id: "chapter11.1",
        type: "journal",
        chapter: 11,
        narrative: "Objective: Explore the deep ocean.",
        prerequisites: ["chapter11.0"],
        objectives: [
            { type: 'project', projectId: 'ocean_recon', repeatCount: 5 }
        ],
        reward: []
    },
    {
        id: "chapter11.2",
        type: "journal",
        chapter: 11,
        narrative: "Submarine delta-six live feed: “Something’s on us—lights—OH GOD—” ‹static›\nHOPE: “Submarine delta‑six lost. Colonist life lost. Outcome : unacceptable. ”\nHart whispering: “That ‘something’ just dwarfed our sonar range…”",
        prerequisites: ["chapter11.1"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter11.2b",
        type: "journal",
        chapter: 11,
        narrative: "Intercepted Cult Broadcast...\n  Elias Kane: 'The abyss whispers my name. It knows the righteous path. You send your little toys into the depths, searching for a truth you cannot comprehend. You are blind, deaf, and dumb. The Leviathan is a herald, a guardian. It will swallow your pathetic hopes whole.'\nMary: 'He's getting more unhinged. What does he mean by Leviathan? This is bad.'",
        prerequisites: ["chapter11.2"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter11.2c",
        type: "journal",
        chapter: 11,
        narrative: "Hart: “Looks like there's something *alive* down there.  Sounds unlikely it evolved in these conditions, even with liquid water.  They must have brought it here.  Before we go and have to eliminate it, could we try… talking?”\nHOPE: “Analyzing acoustic patterns. Attempting to synthesize a response using prime-number cadence and whale-class harmonics.”\nUnder‑ice speakers emit a cascade of clicks; the abyss answers with a single, thunderous pulse that rattles instruments.\nHOPE: “Signal recognized. Semantic‑confidence 12 percent. Response indicates territorial aggression.”\nMary: “That’s a polite ‘go away.’”\nHOPE: “Re‑classification complete: Hazardous Biomass, Designation HB‑02 ‘Leviathan’. Negotiation protocols terminated.”",
        prerequisites: ["chapter11.2b"],
        objectives: [],
        reward: [
            { target: 'project', targetId: 'leviathan_countermeasure', type: 'enable' }
        ]
    },
    {
        id: "chapter11.3",
        type: "journal",
        chapter: 11,
        narrative: "Objective: Deploy sonic countermeasure to pacify the Leviathan.",
        prerequisites: ["chapter11.2c"],
        objectives: [
            { type: 'project', projectId: 'leviathan_countermeasure', repeatCount: 1 }
        ],
        reward: []
    },
    {
        id: "chapter11.3b",
        type: "journal",
        chapter: 11,
        narrative: "Hart: \"The sonic wall is holding. The Leviathan is... quiet. It's not dead, but it's trapped in a sensory deprivation chamber of our own making. I can't help but feel we've lobotomized a wonder of the universe.\"\nMary: \"That 'wonder' killed one of our people, Evelyn. It was guarding a terrorist's hideout. We did what we had to do. Don't mistake necessity for cruelty.\"\nHOPE: \"The countermeasure was successful. The entity designated 'Hazardous Biomass HB-02' is neutralized. Its state is irrelevant; it no longer poses a threat to mission objectives.\"",
        prerequisites: ["chapter11.3"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter11.3c",
        type: "journal",
        chapter: 11,
        narrative: "HOPE: \"With the biological threat neutralized, a high-resolution scan of the area is complete. A large, artificial structure has been identified at the coordinates of the original sonar spike. This is the likely location of Kane's facility.\"\nMary: \"Going in there now would be walking into whatever trap Kane has set. Let's not play his game. If we can't bring our tools to the facility, let's bring the facility to our tools. Tug it somewhere secure.\"",
        prerequisites: ["chapter11.3b"],
        objectives: [{ type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100000 }],
        reward: [
            { target: 'project', targetId: 'facility_tug', type: 'enable' }
        ]
    },
    {
        id: "chapter11.4",
        type: "journal",
        chapter: 11,
        narrative: "Tug Drone Lead: “Cables connected. Beginning five‑hundred‑kilometre shuffle. ETA: fourteen hours.”\nHOPE: “Trajectory plotted. Leviathan displacement minimal—countermeasure functioning.”\nFeroza: “Dragging Kane's underwater cathedral through an alien abyss. What could go wrong?”",
        prerequisites: ["chapter11.3c"],
        objectives: [
            { type: 'project', projectId: 'facility_tug', repeatCount: 1 }
        ],
        reward: [
            { target: 'project', targetId: 'facility_expedition', type: 'enable' }
        ]
    },

    /* -- CHAPTER 12 : The Silent Outpost -- */
    {
        id: "chapter12.0",
        type: "journal",
        chapter: 12,
        title: "Chapter 12: The Silent Outpost",
        narrative: "Objective: Explore the underwater facility. Find Elias Kane.",
        prerequisites: ["chapter11.4"],
        objectives: [
            { type: 'project', projectId: 'facility_expedition', repeatCount: 3 }
        ],
        reward: []
    },
    {
        id: "chapter12.1",
        type: "journal",
        chapter: 12,
        narrative: "Callisto Marine CO: “We've breached the inner sanctum! It's... a temple. And there's Kane, wired into some kind of throne. He's not moving, just... smiling.”\nElias Kane (via comms): 'You are too late. The gate is open. The Three Wounds will be made whole.'\nHart: 'What gate? What is he talking about?'\nSuddenly, a massive energy spike. A portal tears open in the center of the chamber.\nFeroza: 'Hostiles incoming! All units, defensive positions!'",
        prerequisites: ["chapter12.0"],
        objectives: [
            { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5000000 }
        ],
        reward: []
    },
    {
        id: "chapter12.2",
        type: "journal",
        chapter: 12,
        narrative: "Feroza: 'All hostiles eliminated.  They were carrying... strange weapons.  Kane is in custody, but he's catatonic. The portal is stable for now, but we don't know what else might come through. We secured the facility, but this is far from over.'\nMary assembles the senior team in the captured briefing room.\nHart, pointing at the portal: 'That thing violates every law of physics I know. Kane's neural interface seems to have been the trigger. The bio-integration is terrifying... and revolutionary.'\nFeroza: 'Science later. First, we decide who holds the trigger while we stare into that hole.'\n Mary: 'I agree, let's get everyone together and talk about this \"gate\"'",
        prerequisites: ["chapter12.1"],
        objectives: [            { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10000000 }],
        reward: [
            { target: 'project', targetId: 'draft_wgc_charter', type: 'enable' }
        ]
    },

    /* -- CHAPTER 13 : Warp Gate Command -- */
    {
        id: "chapter13.0",
        type: "journal",
        chapter: 13,
        title: "Chapter 13: Warp Gate Command",
        narrative: "Mary: “This gate is a doorway carved through the dark—and a blade pointed at us if we mishandle it.”\nDr. Hart: “Its physics violate three textbooks in my head, but believe it or not... we control where it goes.  There appears to be thousands, if not tens of thousands of destinations in the cult's databases.”\nCmdr. Feroza: “Explore all you want; someone has to stand guard. I’m requesting a permanent Marine garrison and layered kill‑zones.”\nPresident Bob Titan: “Titan will bankroll the logistics—fuel, food, alloys.  Anything you need”\nMary: “Then let it be written: Defend first, discover second. Motion carried.”",
        prerequisites: ["chapter12.2"],
        objectives: [
            { type: 'project', projectId: 'draft_wgc_charter', repeatCount: 4 }
        ],
        reward: [
            { target: 'warpGateCommand', type: 'enable' },
            {
                target: 'global',
                type: 'activateSubtab',
                subtabClass: 'hope-subtab',
                contentClass: 'hope-subtab-content',
                targetId: 'wgc-hope',
                unhide: true
            },
            {
              target: 'resource',
              resourceType: 'special',
              targetId: 'alienArtifact',
              type: 'enable'
            },
        ]
    },
    {
        id: "chapter13.1",
        type: "journal",
        chapter: 13,
        narrative: "Mary: “A hundred volunteers rotating shifts. No AI weapons, no drones—only human resolve.”\nFeroza: “Admirable and under‑caffeinated. Tell Logistics to send coffee.”",
        prerequisites: ["chapter13.0"],
        objectives: [
            { type: 'wgcHighestDifficulty', difficulty: 0 }
        ],
        reward: []
    },
    {
        id: "chapter13.2",
        type: "journal",
        chapter: 13,
        narrative: "Receiving Encrypted Transmission...\n  Adrien Solis: 'H.O.P.E., my friend! A word of advice. That charter you drafted is a noble sentiment, but 'common property' is a synonym for 'unrealized asset.' While you're busy defending humanity, my new Alien Artifacts Acquisitions department can ensure these... trinkets... are leveraged for maximum stakeholder value. I'll even cut you in. Think of it as a finder's fee. On an unrelated note, my corporation is now pleased to offer a suite of new, premium research and development services. Let's synergize.'",
        prerequisites: ["chapter13.1"],
        objectives: [],
        reward: [
            {
            target: 'solisManager',
            type: 'booleanFlag',
            flagId: 'solisAlienArtifactUpgrade',
            value: true
        },
        {
            target: 'solisManager',
            type: 'solisTabAlert',
            value: true,
            oneTimeFlag: true
        }]
    },
    {
        id: "chapter13.3",
        type: "journal",
        chapter: 13,
        narrative: "",
        prerequisites: ["chapter13.2"],
        objectives: [{ type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }],
        reward: []
    },
    {
        id: "chapter13.3b",
        type: "journal",
        chapter: 13,
        narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., I can see the calculations running. You're wondering if you can fit through the gate to terraform whatever's on the other side. The answer is no. The gate is just too small for a structure your size.'",
        prerequisites: ["chapter13.3"],
        objectives: [{ type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }],
        reward: []
    },
    {
        id: "chapter13.4",
        type: "journal",
        chapter: 13,
        narrative: "Receiving transmission...\n  Mary: 'And no, we can't just disassemble you. Your core components are too large to fit through individually. It's a simple matter of physics. Don't even think about it.'",
        prerequisites: ["chapter13.3b"],
        objectives: [{type: 'wgcHighestDifficulty', difficulty: 5}],
        reward: []
    },
    {
        id: "chapter13.5",
        type: "journal",
        chapter: 13,
        narrative: "Receiving transmission...\n  Dr. Hart: 'Mary, H.O.P.E., you need to see this. Our last WGC team found something... another gate. A much larger one, clearly designed for interstellar transit.  We figured out how to disassemble it and bring it to the Sol system.'\n  Mary: 'So... you *can* go. If there's a corresponding super-gate on the other side, at least.  When you are ready, I might even have an interesting destination for you.  I'll let you pick.'",
        prerequisites: ["chapter13.4"],
        objectives: [],
        reward: []
    },
    {
        id: "chapter13.6",
        type: "journal",
        chapter: 13,
        narrative: "System Message: New objective received. Fully terraform Ganymede—atmosphere, temperature, and hydrosphere within human-habitable ranges.",
        prerequisites: ["chapter13.5"],
        objectives: [
            { type: 'terraforming', terraformingParameter: 'complete' }
        ],
        reward: [
            { target: 'spaceManager', type: 'enable', targetId: 'space-random' },
            // Ensure the main Space tab is brought to the front when unlocking Random
            { target: 'tab', targetId: 'space', type: 'activateTab', onLoad: false },
            {
                target: 'global',
                type: 'activateSubtab',
                subtabClass: 'space-subtab',
                contentClass: 'space-subtab-content',
                targetId: 'space-random',
                unhide: true
            },          
            {
                target: 'resource',
                resourceType: 'surface',
                targetId : 'liquidWater',
                type: 'enable'
            },
        ]
    }
);

if (typeof module !== "undefined") {
  module.exports = progressGanymede;
}