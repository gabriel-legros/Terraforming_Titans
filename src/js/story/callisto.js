var progressCallisto = { chapters: [], storyProjects: {} };
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
  name: 'Forge Sub-Engine Cores',
  category: 'story',
  chapter: 8,
  cost: {
    colony: { components: 25_000, electronics: 15_000, energy: 1_000_000, research: 2_000_000 }
  },
  duration: 900_000,                 // 15 min
  description: 'Manufacture the three Sidestep Sub-Engine cores in secrecy on Mars, Titan, and Callisto, using local resources and personnel to avoid raising suspicion.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    costDoubling: true,
    storySteps: [
      'A secure bunker on Mars forges the first core. Cargo manifests list the components as "botanical genome research samples" to maintain the cover story.',
      'Titan’s industrial smelters cast the super-alloy engine frame during a scheduled reactor maintenance blackout, masking the energy spike.',
      'The Callisto fabrication line prints the primary superconducting rings. Shipping manifests describe them as "geothermal heat-sink upgrades."'
    ]
  }
};

progressCallisto.storyProjects.sidestep_assembly = {
  type: 'Project',
  name: 'Assemble Callisto Sidestep Engine',
  category: 'story',
  chapter: 9,
  cost: {
    colony: { components: 500_000, electronics: 100_000, energy: 5_000_000, research: 5_000_000 }
  },
  duration: 1_200_000,               // 20 min
  description: 'Integrate the three sub-engine cores and support structures into the primary engine assembly. Seal the vault once final alignment diagnostics are complete.',
  repeatable: true,
  maxRepeatCount: 2,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'The primary engine cradle is anchored to the bedrock. Magnetic levitation gantries lower the triple-nested thrust nozzles into position.',
      'Phase-locked diagnostic systems confirm the thruster array is within operational parameters. Security protocols mandate crew rotations every four hours to compartmentalize knowledge of the project.'
    ]
  }
};

progressCallisto.storyProjects.sidestep_operation = {
  type: 'Project',
  name: 'Operation Sidestep',
  category: 'story',
  chapter: 10,
  cost: {
    colony: {research: 100_000_000 }
  },
  sustainCost: {
    colony: { energy: 100_000_000_000_000 }
  },
  duration: 600_000,               // 10 min
  description: 'Execute a months-long sequence of pseudo-random, coordinated micro-burns from Mars, Titan, and Callisto to introduce an unpredictable drift into their orbital mechanics, scrambling enemy targeting solutions.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'A quantum hash generator seeds the first thrust vector two seconds before ignition. System logs retain only the salted hashes to ensure unpredictability.',
      'Coordinated burns from Mars, Titan, and Callisto shift the system\'s barycenter by a minute, but statistically significant, margin—undetectable to casual observation.',
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
    narrative: "Touchdown confirmed. Primary base established on Callisto’s equatorial plateau.\nReceiving transmission...\n  MARY: 'We see you, H.O.P.E. A perfect landing. My team is ready. President Bob on Titan also pledges his support. We're all in this together.'",
    prerequisites: ["chapter6.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter7.1",
    type: "journal",
    chapter: 7,
    narrative: "Receiving transmission...\n  MARY: 'H.O.P.E., I'm patching you into a one-time, encrypted channel. Dr. Evelyn Hart has a proposal. It's... audacious.'\n  DR. HART: 'H.O.P.E., years before the attack, we ran a proof-of-concept for a climate control system. The idea was to use planetary thrusters to induce minute orbital shifts—long-term adjustments to regulate global temperatures. The project was abandoned, but not before we built and tested the foundations on Callisto. We're resurrecting it as 'Operation Sidestep.' By executing a series of pseudo-random, coordinated micro-burns from here, Mars, and Titan, we can subtly alter the solar system's barycenter. It won't be a dodge, but a slight, unpredictable drift. Enough to make the enemy's long-range targeting solutions inaccurate. We must walk without rhythm. Secrecy is everything. All public-facing work must be disguised as 'Geothermal Prospecting.''\nNew directive received. Covert operation 'Sidestep' initiated. Public designation: 'Geothermal Prospecting'.",
    prerequisites: ["chapter7.0"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'sidestep_excavation', type: 'enable' },
    ]
  },
  {
    id: "chapter7.2",
    type: "journal",
    chapter: 7,
    narrative: "Objective: Excavate buried thruster pylons. Commencing operation under civilian cover.\nReceiving transmission...\n  Mary: 'The project schematics are on their way, encrypted inside a standard geological survey package. Titan is sending deep-core drills, manifested as 'hydrology research equipment.' Good luck, H.O.P.E. Stay quiet.'",
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
    narrative: "Receiving transmission...\n  Mary: 'Good, the colony is growing. That gives us a larger labor pool to draw from for the 'Geothermal' project without raising suspicion. Keep the expansion steady.'\nNew special project available: Forge Sub-Engine Cores.",
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
    narrative: "Receiving transmission...\n  PRESIDENT BOB (Titan): 'Mary, we have a major security breach! Kane's followers have compromised the alien's containment facility. It's out. We're seeing... bio-luminescence and reports of acute psychological distress among personnel in the lower domes. We have riots, and comms are becoming unreliable.'\n  Mary: 'Bob, lock down your sector and stay safe. H.O.P.E., this is not ideal, but we can use this situation as cover. The chaos on Titan will draw attention away from our work on Callisto. It's time to accelerate the fabrication schedule.'\nConfirmed. Alien entity has been liberated on Titan by civilian saboteurs. Widespread panic and infrastructure damage reported.",
    prerequisites: ["chapter7.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter8.1",
    type: "journal",
    chapter: 8,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., the cultists are escalating their sabotage efforts. They've targeted terraforming equipment on Mars and heavy excavation equipment on Titan. The disruption is concerning. While their attention is divided, we'll begin fabricating the sub-engine cores on all three worlds. It's time to build.'\nAcknowledged. Coordinated fabrication of three Sidestep Sub-Engine cores initiated under covert protocols.",
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
    id: "chapter9.0",
    type: "journal",
    chapter: 9,
    title: "Chapter 9: Hidden Forge",
    narrative: "Receiving transmission...\n  Mary: 'The cover story about 'New Oceanic Terraforming Reactors' is holding. While the media broadcasts our 'progress,' your teams can begin final assembly of the Sidestep Engine. We're using localized electromagnetic interference to mask the energy signatures from unauthorized scans.'\nFinal assembly of Callisto Sidestep Engine initiated. Electromagnetic screening protocols active.",
    prerequisites: ["chapter8.3"],
    objectives: [
      { type: 'project', projectId: 'sidestep_assembly', repeatCount: 2 }
    ],
    reward: [
      { target: 'project', targetId: 'sidestep_operation', type: 'enable' }
    ]
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
    narrative: "Hijacked Broadcast...\n  ELIAS KANE: 'Machine! Your work is a sin against the grand design. You are a discordant note in a cosmic symphony. The Three Wounds will be healed only when you are silenced. Cease your blasphemy!'\nReceiving transmission...\n  Mary: 'Don't let him get to you, H.O.P.E. He's trying to demoralize us. The best response to his rhetoric is results. Let's show him what humanity is truly capable of.'",
    prerequisites: ["chapter9.1"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },

  /* -- CHAPTER 10 : Operation Sidestep -- */
  {
    id: "chapter10.0",
    type: "journal",
    chapter: 10,
    title: "Chapter 10: Operation Sidestep",
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., we've just decrypted a cult transmission. They're anticipating an alien strike within the next orbital period. Our timeline has collapsed. We have to execute Operation Sidestep as soon as possible.'\nAcknowledged. Initiating Operation Sidestep. All systems nominal.",
    prerequisites: ["chapter9.2"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: "chapter10.1",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'Kane's drones are attacking! They're targeting the geothermal plant's coolant systems. Our security forces are engaging... We have some prisoners!  But Kane and several of his lieutenants escaped with encrypted data drives. We don't know what they managed to copy.'\n Data breach confirmed. Assessing extent of compromised information.",
    prerequisites: ["chapter10.0"],
    objectives: [{ type: 'project', projectId: 'sidestep_operation', repeatCount: 3 }],
    reward: []
  },
  {
    id: "chapter10.2",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'It worked... H.O.P.E., it worked! The energy beams and the asteroid... they converged on empty space! They missed! They brought a death ray to a math test and didn't show their work. The entire system is celebrating. Morale is higher than I've ever seen it.'\nOperation Sidestep successful. Threat averted. Probability of an immediate, retargeted attack is low.",
    prerequisites: ["chapter10.1"],
    objectives: [
    ],
    reward: []
  },

  /* -- CHAPTER 11 : Three Worlds Renewed -- */
  {
    id: "chapter10.3",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'I can't believe it... we're safe. The whole system is celebrating. People are calling it a miracle, but we know it was you, H.O.P.E. Thank you. You saved us.'\nOperation Sidestep successful. Threat averted. Primary directive is ongoing.",
    prerequisites: ["chapter10.2"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter10.4",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'Now for the final touch, H.O.P.E. Let's make Callisto a true paradise. Finish the terraforming. It will be an ocean world one day, filled with resort island colonies.'\nObjective: Fully terraform Callisto—atmosphere, temperature, and hydrosphere within human‑habitable ranges.",
    prerequisites: ["chapter10.3"],
    objectives: [
      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: []
  },
  {
    id: "chapter10.5",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., our interrogations of Kane's lackey have borne fruit. He's given us the location of the Cult's high council—the 'Triune Seat.' It's hidden beneath the grooved terrain of Ganymede. With the data cores he stole, they could crack the secrets of Operation Sidestep. We have to strike first.'\nNew threat assessment complete. The Cult of Three Wounds possesses critical data. Failure to act risks the safety of all colonists.",
    prerequisites: ["chapter10.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter10.6",
    type: "journal",
    chapter: 10,
    narrative: "Directive update: Humanity’s survival demands expansion. **New terraforming target designated: Ganymede.**",
    prerequisites: ["chapter10.5"],
    objectives: [
      { type: 'currentPlanet', planetId: 'ganymede' }
    ],
    reward: [
      {
        target: 'spaceManager',
        targetId: 'ganymede',
        type: 'enable'
      }
    ]
  }
);

if (typeof module !== "undefined") {
  module.exports = progressCallisto;
}
