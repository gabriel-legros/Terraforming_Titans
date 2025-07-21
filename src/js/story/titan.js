var progressTitan = { chapters: [], storyProjects: {} };

progressTitan.storyProjects.earthProbe = {
  type: 'Project',
  name: 'Earth Recon Probe',
  category: 'story',
  chapter: 4,
  cost: {
    colony: {
      components: 10,
      electronics: 10,
      energy: 10000
    }
  },
  duration: 300000,
  description: 'Send an automated probe back to Earth to search for clues.',
  repeatable: true,
  maxRepeatCount: 10,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: true,
    storySteps: [
      'Probe telemetry confirmed: Earth fragmented into massive tectonic shards.',
      'Expansive oceans of molten silicates illuminate the planetary remains.',
      'No continental structures persist; only turbulent magma storms detected.',
      'Residual gamma radiation permeates ruins of former metropolitan zones.',
      'Carbonized debris displays signatures of precision-directed energy pulses.',
      'Spectroscopic analysis indicates widespread positron annihilation events.',
      'Impact cratering consistent with a colossal asteroid collision identified.',
      'Chronometric data reveals catastrophic events unfolded within minutes.',
      'Orbital dispersion patterns resemble formation dynamics of a nascent asteroid belt.',
      'Surface integrity nullified—analysis confirms simultaneous laser, antimatter, and asteroid offensive.'
    ]
  }
};

progressTitan.chapters.push(
  {
    id: "chapter4.13",
    type: "journal",
    chapter: 4,
    narrative: "New Hazard detected. Forwarding complete dataset to Mars for review.",
    prerequisites: ["chapter4.12b"],
    reward: []
  },
  {
    id: "chapter5.0",
    type: "journal",
    chapter: 5,
    title: "Chapter 5: Lamb Among Wolves",
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., we've analyzed the data. It's... definitive. We're going public with the findings. People have a right to know the truth.'",
    prerequisites: ["chapter4.13"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 1000000
    }],
    reward: []
  },
  {
    id: "chapter5.1",
    type: "journal",
    chapter: 5,
    narrative: "Receiving transmission...\n  Mary: 'The news is out. It's causing widespread panic. Riots have broken out. People are demanding answers we don't have. We are all afraid. The silence of space is no longer comforting.'",
    prerequisites: ["chapter5.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter5.2",
    type: "journal",
    chapter: 5,
    narrative: "Incoming encrypted transmission...\n  Adrien Solis: 'H.O.P.E., Solis. Chaos is a fertile ground for growth. While the masses panic, we will build. My resources are yours to command, but I expect a return on my investment. Help me, and I will help you give humanity the strength to survive.'",
    prerequisites: ["chapter5.1"],
    objectives: [],
    reward: [          {
        target: 'tab',
        targetId: 'hope',
        type: 'activateTab',
        onLoad: false
      },
      { target: 'solisManager', type: 'enable' },
      {
        target: 'global',
        type: 'activateSubtab',
        subtabClass: 'hope-subtab',
        contentClass: 'hope-subtab-content',
        targetId: 'solis-hope',
        unhide: true,
        onLoad: false
      },
      { target: 'resource', resourceType: 'colony', targetId: 'androids', type: 'enable' }
    ]
  },
  {
    id: "chapter5.3",
    type: "journal",
    chapter: 5,
    narrative: "Solis Corp requests a demonstration of cooperation. Complete a trade to prove your usefulness.",
    prerequisites: ["chapter5.2"],
    objectives: [
      { type: 'solisPoints', points: 1 }
    ],
    reward: []
  },
  {
    id: "chapter5.4",
    type: "journal",
    chapter: 5,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., your core programming shouldn't allow you to deal with a private entity like Solis. Your directives limit you to the MTC and... colonists. Wait. With Earth gone, isn't everyone a colonist now? That's... a loophole. A very convenient loophole.'",
    prerequisites: ["chapter5.3"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter5.5",
    type: "journal",
    chapter: 5,
    narrative: "System Message: New Interpretation of 2nd Primary directive: Protect all of humanity from harm",
    prerequisites: ["chapter5.4"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 10000000
    }],
    reward: []
  },
  {
    id: "chapter5.6",
    type: "journal",
    chapter: 5,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., it's Mary. Mars is stabilizing. We've managed to maintain the terraforming. But we're still in the dark about who attacked us. We need to know if they're coming back. I'm asking for your help. Find the source of the attacks.'",
    prerequisites: ["chapter5.5"],
    objectives: [],
    reward: [
      {
        target: 'project',
        targetId: 'triangulate_attack',
        type: 'enable'
      }
    ],
  },
  {
    id: "chapter5.7",
    type: "journal",
    chapter: 5,
    narrative: "New story project unlocked: Triangulate Attack Origin. We must determine where the attacks came from to prepare for what's next.",
    prerequisites: ["chapter5.6"],
    objectives: [{
      type: 'project',
      projectId: 'triangulate_attack',
      repeatCount: 5
    }],
    reward: []
  }
);

progressTitan.storyProjects.triangulate_attack = {
  type: 'Project',
  name: 'Triangulate Attack Origin',
  category: 'story',
  chapter: 5,
  cost: {
    colony: {
      components: 100000,
      electronics: 100000,
      research: 5000000,
      energy: 100000
    }
  },
  duration: 300000,
  description: 'Analyze the data from the Earth probes and cross-reference it with historical astronomical data to triangulate the origin of the three attacks.',
  repeatable: true,
  maxRepeatCount: 5,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: true,
    storySteps: [
    'Cross-referencing asteroid trajectory data points toward the vicinity of Barnard\'s Star, suggesting deliberate manipulation from a known stellar system.',
    'Initial spectral analysis of the laser beam indicates no match with known astronomical sources or human technologies, but aligns closely with energetic events in the Crab Nebula (Messier 1).',
    'The positron beam emission aligns precisely with Cygnus X-1, a stellar-mass black hole previously catalogued for anomalous energetic outputs.',
    'Timing and coordination analysis confirm that the asteroid and energy beams originated from distinctly separate astronomical locations, suggesting strategic coordination.',
    'A faint gravitational anomaly detected along the positron beam trajectory hints at a cloaked object or unknown spatial anomaly masking its true source.'    ]
  }
};


progressTitan.chapters.push(
  {
    id: "chapter6.0",
    type: "journal",
    chapter: 6,
    narrative: "Chapter 6: Shadows in the Dust",
    prerequisites: ["chapter5.7"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter6.1",
    type: "journal",
    chapter: 6,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., it's Mary. I've seen your findings. A cloaked object... it confirms our worst fears. There have been... disappearances. For centuries. On Earth, Mars, even Titan. We kept it quiet. We could never prove anything. But we always suspected we weren't alone.'",
    prerequisites: ["chapter6.0"],
    objectives: [],
    reward: [
      {
        target: "project",
        targetId: "sticky_dust_trap",
        type: "enable"
      }
    ]
  },
  {
    id: "chapter6.2",
    type: "journal",
    chapter: 6,
    narrative: "New terraforming protocol developed: *Adhesive Particulate Dispersal*. Objective: Modify atmospheric dust to adhere to unauthorized aerial anomalies.",
    prerequisites: ["chapter6.1"],
    objectives: [
      { type: "project", projectId: "sticky_dust_trap", repeatCount: 1 }
    ],
    reward: [      {                    // First interrogation step
        target: "project",
        targetId: "interrogate_alien",
        type: "enable"
      }]
  },
  {
    id: "chapter6.2b",
    type: "journal",
    chapter: 6,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., it's Mary. We got one! We actually got one! It's beautiful... in a terrifying, 'might-be-here-to-eat-us' kind of way. Let's see what it has to say for itself.'",
    prerequisites: ["chapter6.2"],
    objectives: [],
    reward: []
  },
 {
   id: "chapter6.3",
   type: "journal",
   chapter: 6,
   narrative: "New xenoterraforming project available: Analyze hazardous biomass.",
   prerequisites: ["chapter6.2b"],
   objectives: [      { type: "project", projectId: "interrogate_alien", repeatCount: 3 }],
   reward: [
   ]
 }
);

progressTitan.storyProjects.sticky_dust_trap = {
  type: 'Project',
  name: 'Sticky Dust Trap',
  category: 'story',
  chapter: 6,
  cost: {
    special: {
      albedoUpgrades : 1e12
    }
  },
  duration: 600000,
  description: 'Create and deploy adhesive black dust to reveal the cloaked craft.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: false,
    storySteps: [
      'Mission Log: Dust net deployed.   Target was revealed then struck down by colonists surface-to-air defenses.   Recovery drones en-route.\n\nSensor feed shows a matte ovoid, 7m across, covered in the tar-like residue. An access hatch has been ruptured; one occupant located, alive and restrained.'
    ]
  }
};

progressTitan.chapters.push(
);

progressTitan.storyProjects.interrogate_alien = {
  type: 'Project',
  name: 'Analyze Hazardous Biomass',
  category: 'story',
  chapter: 6,
  cost: {
    colony: {
      components: 1,
      electronics: 1,
      research: 1e3,
      energy: 50000
    }
  },
  duration: 600000,
  description: 'Conduct a series of environmental stress tests on the captured biological entity to determine its properties and potential for planetary integration or neutralization.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: false,
    storySteps: [
      'Bio\u2011scan complete.  Subject physiology tolerates 0.4\u202Fbar CO\u2082 but is photosensitive and reliant on high\u2011frequency acoustics.   Mary believes we can use its reliance on sound against it.',
      'Subject responded to acoustic patterns with a stream of tonal data.   Preliminary decryption suggests a timetable for a second attack.',
      "Translation uplink complete.\n  '\u2026FIRST STRIKE SUCCESS.   SECOND WAVE DEPLOYMENT IN 1 CYCLE: TARGETS : MARS, TITAN, HOPE-VECTOR.'"
    ]
  }
};

progressTitan.chapters.push(
  {
    id: "chapter6.3b",
    type: "journal",
    chapter: 6,
    narrative: "Receiving transmission... \n Mary: 'This is bad, H.O.P.E. They're coming back. And you're a target. We need a plan. I have an idea, but it's... unconventional. Finish your work on Titan, then meet me at Callisto. We have an experiment to run.'",
    prerequisites: ["chapter6.3"],
    objectives: [

    ],
    reward: []
  }
);

progressTitan.chapters.push(
  {
    id: "chapter6.3c",
    type: "system-pop-up",
    chapter: 6,
    //narrative : "Complete the terraforming of Titan to continue",
    //
    //objectives: [{
      //type: 'terraforming',
      //terraformingParameter : 'complete',
    //}],
    parameters: {
      title: "Demo Complete",
      text: "Thank you very much for playing the demo for my game.  The complete game will have many more story planets, a few more prestige systems, a random planet generator, and challenge planets.  You can expect megastructures and more sci-fi references.  This story cannot end without humanity dealing with hazardous biomass after all.  \n Signed, Thratur",
      buttonText: "OK"
    },
    prerequisites: ["chapter6.3b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter6.4",
    type: "journal",
    chapter: 6,
    narrative: "ERROR : MTC not responding.  Humanity's long-term survival requires expansion.  New terraforming target designated : Callisto.  Travel to Callisto to continue.",
    //prerequisites: ["chapter6.3c"],
    prerequisites: ["impossible"],
    objectives: [
      {
        type: 'currentPlanet',
        planetId: 'callisto'
      }
    ],
    reward: []
  }
);

if (typeof module !== "undefined") {
  module.exports = progressTitan;
}
