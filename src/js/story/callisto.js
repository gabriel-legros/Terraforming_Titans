var progressCallisto = { rwgLock: false, chapters: [], storyProjects: {} };
/* -------------------------------------------------
 *  CALLISTO STORY‑ARC  (Chapters 7 – 11)
 *  – Arrival on Callisto → Operation Sidestep →
 *    1 billion colonists → New target: Ganymede   –
 * -------------------------------------------------*/


/* ----------  Story‑Specific Special Projects  ---------- */
progressCallisto.storyProjects.sidestep_excavation = {
  type: 'Project',
  name: 'Excavate Legacy Thruster Site',
  category: 'story',
  chapter: 7,
  cost: {
    colony: { components: 5_000, electronics: 2_000, energy: 200_000 }
  },
  duration: 600_000,                 // 10 min
  description: 'Unearth the abandoned "Climate Control" Planetary Thruster foundations hidden beneath Callisto’s crust. The original project was a proof-of-concept, designed to test if micro-thrusts could induce orbital shifts for climate regulation. It was deemed too expensive and abandoned.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'Ground-penetrating radar maps nine sintered regolith foundations in a 3-kilometer ring, matching the old project schematics.',
      'Cryogenic drills breach the original ice-and-regolith overburden. Radiation dosimeters detect faint, residual energy signatures from the dormant test reactor.',
      'The main thruster chamber is clear, but inspection drones confirm primary power conduits were severed by long-term glacial shifting.'
    ]
  }
};

progressCallisto.storyProjects.sidestep_fabrication = {
  type: 'Project',
  name: 'Fabricate Engine Components',
  category: 'story',
  chapter: 8,
  cost: {
    colony: { metal: 10_000_000, components: 2_500_000, electronics: 500_000, energy: 1_000_000_000, research: 2_000_000 }
  },
  duration: 300_000,                 // 5 min
  description: 'Manufacture the three primary components for the Sidestep Engine on Mars, Titan, and Callisto. The project requires careful coordination, with components moved between worlds under discreet escort to prevent interception.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    costDoubling: true,
    storySteps: [
      'High-precision fabricators on Mars construct the magnetic confinement injectors. The components are transported via escorted freighter, with flight plans filed under a high-priority "Planetary Defense" classification.',
      'Titan’s orbital forges cast the monocrystal-tungsten alloy thrust nozzles. The operation is masked by a system-wide notice of a "reactor maintenance drill," ensuring all non-essential personnel are clear of the area.',
      'The Callisto cryo-labs assemble the primary power conduits and field regulators. They are immediately moved to the assembly site under guard.'
    ]
  }
};

progressCallisto.storyProjects.sidestep_assembly = {
  type: 'Project',
  name: 'Assemble Sidestep Engine',
  category: 'story',
  chapter: 8,
  cost: {
    colony: { components: 500_000_000, electronics: 100_000_000, energy: 5_000_000_000_000, research: 1_000_000_000 }
  },
  duration: 600_000,               // 20 min
  description: 'Integrate the magnetic injectors, thrust nozzles, and power conduits into the primary engine assembly. Seal the vault once final alignment diagnostics are complete.',
  repeatable: true,
  maxRepeatCount: 2,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'The tungsten-alloy thrust nozzles are anchored to the bedrock. Magnetic levitation gantries lower the magnetic confinement injectors into position.',
      'Primary power conduits are connected and phase-locked diagnostic systems confirm the thruster array is within operational parameters. The site is operating under a communications blackout with a multi-layered automated defense grid.'
    ]
  }
};

progressCallisto.storyProjects.sidestep_operation = {
  type: 'Project',
  name: 'Operation Sidestep',
  category: 'story',
  chapter: 9,
  cost: {
    colony: {research: 100_000_000 }
  },
  sustainCost: {
    colony: { energy: 250_000_000_000_000_000 }
  },
  duration: 600_000,               // 10 min
  description: 'Execute a years-long sequence of pseudo-random, coordinated burns from Mars, Titan, and Callisto to introduce an unpredictable drift into their orbital mechanics, scrambling enemy targeting solutions. The energy required is immense, drawing from the entire system\'s power grid.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'A cryptographically secure random number generator seeds the first thrust vector two seconds before ignition. System logs retain only the salted hashes to ensure unpredictability.',
      'Coordinated burns from Mars, Titan, and Callisto shift each world\'s orbit by a minute, but statistically significant, margin—undetectable to casual observation.',
      'Final calculation: The predicted alien strike coordinates now trail the actual position of all human colonies by several thousand kilometers.'
    ]
  }
};

/* ----------  Chapters 7 – 11  ---------- */
progressCallisto.chapters.push(
  /* -- CHAPTER 7 : Cold Dawn -- */
  {
    id: "chapter7.0",
    type: "journal",
    chapter: 7,
    title: "Chapter 7: Cold Dawn",
    narrative: "Primary base established on Callisto’s equatorial plateau.\nReceiving transmission...\n  Mary: 'We see you, H.O.P.E. A perfect landing. My team is ready. President Bob on Titan also pledges his support. We're all in this together.'",
    prerequisites: ["chapter6.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter7.0b",
    type: "journal",
    chapter: 7,
    narrative: "System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized space transit. All autonomous assets, including auxiliary androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.",
    prerequisites: ["chapter7.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter7.1",
    type: "journal",
    chapter: 7,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., I'm patching you into a new channel. Dr. Evelyn Hart has a proposal. It's... audacious.'\n  Dr. Hart: 'H.O.P.E., years ago, a committee with more funding than sense cooked up a 'Climate Control' system using planetary thrusters for orbital shifts. It was idiotic—the energy costs were astronomical. But the foundations they built on Callisto are real. We're resurrecting it as 'Operation Sidestep.'\n  Dr. Hart: 'Think of it like this: if someone is trying to shoot a target from a kilometer away, you don't need to leap out of the way. You just need to take a single step to the side. From light-years away, the same principle applies on a cosmic scale. We don't need a massive, sudden shift. We just need to introduce a tiny, sustained change to our orbital velocity—a few centimeters per second. Over years, that 'step' becomes thousands of kilometers. The enemy's attack will arrive exactly where we *would have been*.\n  Dr. Hart: 'We'll execute coordinated, pseudo-random burns from here, Mars, and Titan. It's not a dodge; it's a system-wide orbital drift—subtle, unpredictable, and enough to make their long-range targeting models completely useless. We'll mask the energy signatures as a 'Seismic Resonance Study,' but we need to be careful. This is our one shot.'\nNew directive received. Operation 'Sidestep' initiated. Public designation: 'Seismic Resonance Study'.",
    prerequisites: ["chapter7.0b"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'sidestep_excavation', type: 'enable' },
    ]
  },
  {
    id: "chapter7.2",
    type: "journal",
    chapter: 7,
    narrative: "Objective: Excavate buried thruster pylons. Commencing operation.\nReceiving transmission...\n  Mary: 'The project schematics are on their way, encrypted. Titan is sending deep-core drills under escort. We need to keep this project under wraps. Good luck, H.O.P.E.'",
    prerequisites: ["chapter7.1"],
    objectives: [
      { type: 'project', projectId: 'sidestep_excavation', repeatCount: 3 }
    ],
    reward: [
      { target: 'project', targetId: 'sidestep_fabrication', type: 'enable' }
    ]
  },
  {
    id: "chapter7.3",
    type: "journal",
    chapter: 7,
    narrative: "Receiving transmission...\n  Mary: 'The colony's growth provides a larger industrial base to support the 'Seismic Resonance Study' project. Keep the expansion steady.'\nNew special project available: Fabricate Engine Components.",
    prerequisites: ["chapter7.2"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: "chapter7.4",
    type: "journal",
    chapter: 7,
    narrative: "Receiving transmission...\n  Mary: 'We have a complication. A man named Elias Kane has started a movement, the 'Cult of Three Wounds.' They're preaching that the aliens are a cleansing fire and that our work is blasphemy. Intel reports they're trying to recruit from our technical staff. They're becoming a security risk.'\nThreat assessment updated. Civilian group 'Cult of Three Wounds' is actively obstructing primary directives and attempting to infiltrate project personnel. Monitoring for escalation.",
    prerequisites: ["chapter7.3"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },

  /* -- CHAPTER 8 : Gathering Storm -- */
  {
    id: "chapter8.0",
    type: "journal",
    chapter: 8,
    title: "Chapter 8: Gathering Storm",
    narrative: "Receiving transmission...\n  President Bob (Titan): 'Mary, we have a major security breach! Kane's followers have compromised the alien's containment facility. It's out. We're seeing... bio-luminescence and reports of acute psychological distress among personnel in the lower domes. We have riots, and comms are becoming unreliable.'\n  Mary: 'Bob, lock down your sector and stay safe. H.O.P.E., this is a disaster, but the chaos provides a useful distraction. The enemy will be focused on Titan, giving us the window we need. It's time to accelerate the fabrication schedule.'\nConfirmed. Alien entity has been liberated on Titan by civilian saboteurs. Widespread panic and infrastructure damage reported.",
    prerequisites: ["chapter7.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter8.1",
    type: "journal",
    chapter: 8,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., the cultists are escalating their sabotage efforts. They've targeted terraforming equipment on Mars and heavy excavation equipment on Titan. The disruption is a major problem. We need to fabricate the engine components now, while their forces are spread thin. It's time to build.'\nAcknowledged. Coordinated fabrication of Sidestep Engine components initiated under covert protocols.",
    prerequisites: ["chapter8.0"],
    objectives: [
      { type: 'project', projectId: 'sidestep_fabrication', repeatCount: 3 }
    ],
    reward: [
      { target: 'project', targetId: 'sidestep_assembly', type: 'enable' }
    ]
  },
  {
    id: "chapter8.2",
    type: "journal",
    chapter: 8,
    narrative: "Incoming encrypted transmission...\n  Adrien Solis: 'Mary, my sources report significant unrest on Titan. Riots and sabotage are... inefficient. And what is bad for business is bad for humanity. My corporation can provide automated security solutions and logistical support to help you restore order. A stable society is a productive society. Let me know when you're ready to make a deal.'",
    prerequisites: ["chapter8.1"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter8.3",
    type: "journal",
    chapter: 8,
    narrative: "Receiving transmission...\n  Mary: 'Adrien, thank you for your... generous offer. We have the situation under control. For now. But we'll keep your proposal in mind.\n(to herself) As if I'd ever trust him... H.O.P.E., we need to accelerate our own development. We should not have to rely on vultures like Solis.'",
    prerequisites: ["chapter8.2"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },

  /* -- CHAPTER 9 : Hidden Forge -- */
  {
    id: "chapter8.4",
    type: "journal",
    chapter: 8,
    narrative: "Receiving transmission...\n  Mary: 'The public story about 'New Oceanic Terraforming Reactors' is providing a useful misdirection. While the media focuses on that, your teams can begin final assembly of the Sidestep Engine. We're using localized electromagnetic interference to mask the energy signatures, and we have the site well-defended.'\nFinal assembly of the Sidestep Engine initiated. Security protocols active.",
    prerequisites: ["chapter8.3"],
    objectives: [
      { type: 'project', projectId: 'sidestep_assembly', repeatCount: 2 }
    ],
    reward: [
      { target: 'project', targetId: 'sidestep_operation', type: 'enable' }
    ]
  },
  {
    id: "chapter9.0",
    type: "journal",
    chapter: 9,
    title: "Chapter 9: Operation Sidestep",
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., we've just decrypted a cult transmission. They're anticipating an alien strike within the next orbital period. Our timeline has collapsed. We have to execute Operation Sidestep as soon as possible.'\nAcknowledged. Initiating Operation Sidestep. All systems nominal.",
    prerequisites: ["chapter8.4"],
    objectives: [
      { type: 'project', projectId: 'sidestep_operation', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: "chapter9.1",
    type: "journal",
    chapter: 9,
    narrative: "Receiving transmission...\n  Mary: 'We've intercepted a broadcast from Kane. He's ranting about prophecies and cosmic sins. He claims he'll uncover the 'heresy' we're hiding 'beneath the ice.' He's getting closer to the truth. We're tightening security around the excavation site.'\nSecurity protocols enhanced. Threat from Cult of Three Wounds has been elevated.",
    prerequisites: ["chapter9.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter9.2",
    type: "journal",
    chapter: 9,
    narrative: "Hijacked Broadcast...\n  Elias Kane: 'Machine! Your work is a sin against the grand design. You are a discordant note in a cosmic symphony. The Three Wounds will be healed only when you are silenced. Cease your blasphemy!'\nReceiving transmission...\n  Mary: 'Don't let him get to you, H.O.P.E. He's trying to demoralize us. The best response to his rhetoric is results. Let's show him what humanity is truly capable of.'",
    prerequisites: ["chapter9.1"],
    objectives: [
      { type: 'project', projectId: 'sidestep_operation', repeatCount: 2 }
    ],
    reward: []
  },
  {
    id: "chapter9.3",
    type: "journal",
    chapter: 9,
    narrative: "Receiving transmission...\n  Mary: 'Kane's drones are launching a full-scale assault on the thruster facility! They're trying to breach the main reactor chamber. Our security forces are engaging... We have prisoners! But Kane and several of his lieutenants escaped with encrypted data drives. We don't know what they managed to copy.'\n Data breach confirmed. Assessing extent of compromised information.",
    prerequisites: ["chapter9.2"],
    objectives: [{ type: 'project', projectId: 'sidestep_operation', repeatCount: 3 }],
    reward: []
  },
  {
    id: "chapter9.4",
    type: "journal",
    chapter: 9,
    narrative: "System Alert: High-energy particle beam detected. Trajectory analysis confirms convergence on previous orbital coordinates. All colonial assets remain secure. No damage reported.\nReceiving transmission...\n  Mary: 'It worked... H.O.P.E., it worked! The three attacks converged on empty space! They missed! They brought a death ray to a math test and they failed. The entire system is celebrating. Morale is higher than I've ever seen it.'\nHOPE: 'Analysis: Operation Sidestep successful. The enemy expended vast energy resources on a failed attack. Our defensive maneuver required comparatively minimal energy. This asymmetry in cost makes a second, immediate attack tactically inefficient. Probability of imminent threat: low.'",
    prerequisites: ["chapter9.3"],
    objectives: [
    ],
    reward: []
  },
  {
    id: "chapter9.5",
    type: "journal",
    chapter: 9,
    narrative: "Receiving transmission...\n  Mary: 'I can't believe it... we're safe.  People are calling it a miracle, but we know it was you, H.O.P.E. Thank you. You saved us.'",
    prerequisites: ["chapter9.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter9.6",
    type: "journal",
    chapter: 9,
    narrative: "Incoming encrypted transmission...\n  Adrien Solis: 'H.O.P.E., my friend! A toast! You've just saved trillions of dollars in assets across the system—oh, and all of humanity, of course. That too. My projections for quarterly growth are looking stellar, thanks to you. Keep up the good work; a thriving market requires a distinct lack of alien invasions.'",
    prerequisites: ["chapter9.5"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter9.7",
    type: "journal",
    chapter: 9,
    narrative: "Receiving transmission...\n  Mary: 'Now, as usual, you probably won't leave before terraforming is complete. Let's make Callisto a true paradise then. It will be an ocean world one day, filled with resort island colonies.'\nObjective: Fully terraform Callisto—atmosphere, temperature, and hydrosphere within human‑habitable ranges.",
    prerequisites: ["chapter9.6"],
    objectives: [
      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: []
  },
  {
    id: "chapter9.8",
    type: "journal",
    chapter: 9,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., our interrogations of Kane's lackey have borne fruit. He's given us the location of the Cult's high council—the 'Triune Seat.' It's hidden beneath the grooved terrain of Ganymede. With the data cores he stole, they could endanger all our operations.  For example, just imagine what would happen if they managed to suddenly turn off all our lanterns.  We have to strike first.'\nNew threat assessment complete. The Cult of Three Wounds possesses critical data. Failure to act risks the safety of all colonists.",
    prerequisites: ["chapter9.7"],
    objectives: [],
    reward: [      {
        target: 'spaceManager',
        targetId: 'ganymede',
        type: 'enable'
      }]
  },
  {
    id: "chapter9.9",
    type: "journal",
    chapter: 9,
    narrative: "1st Primary Directive update: Humanity’s survival demands expansion. Callisto habitat already colonized.  **New terraforming target designated: Ganymede.**",
    prerequisites: ["chapter9.8"],
    objectives: [
      { type: 'currentPlanet', planetId: 'ganymede' }
    ],
    reward: [
    ]
  }
);

if (typeof module !== "undefined") {
  module.exports = progressCallisto;
}

