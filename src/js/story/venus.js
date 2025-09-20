var progressVenus = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  VENUS STORY ARC (Chapter 18+)
 * -------------------------------------------------*/

/* ----------  Story-Specific Special Projects  ---------- */

progressVenus.storyProjects.venus_neptune_probe = {
  type: 'Project',
  name: 'Neptune Salvage Recon',
  category: 'story',
  chapter: 18,
  cost: {
    colony: { components: 150_000, electronics: 75_000, energy: 25_000_000, research: 2_000_000 }
  },
  duration: 360_000,
  description: 'Send stealth probes to Neptune to clear antimatter hazards around alien wreckage.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'venus',
    costDoubling: true,
    storySteps: [
      'Recon 1: Radiation plumes charted. Antimatter pockets dispersed with magnetic sheaths.',
      'Recon 2: Salvage corridors mapped. Solis teams standing by.',
      'Recon 3: Antimatter traps neutralized. Alien hull intact for recovery.'
    ]
  }
};

progressVenus.storyProjects.venus_battlegroup = {
  type: 'Project',
  name: 'Assemble UHF Battlegroup',
  category: 'story',
  chapter: 18,
  cost: {
    colony: { metal: 50_000_000, components: 10_000_000, electronics: 5_000_000, energy: 250_000_000_000 }
  },
  duration: 600_000,
  description: 'Fabricate Venus-class warships with missile racks and redundant targeting relays.',
  repeatable: true,
  maxRepeatCount: 4,
  unlocked: false,
  attributes: {
    planet: 'venus',
    costDoubling: false,
    storySteps: [
      'Hull fabrication complete. Missile magazines stress-tested.',
      'Fleet avionics sealed against particle beams. Crew quarters pressurized.',
      'Engine clusters aligned for salvo maneuvers. Armor plating mirror-polished.',
      'Battlegroup assembled. Launch tubes loaded with Solis nuclear missiles.'
    ]
  }
};

progressVenus.storyProjects.venus_mass_driver = {
  type: 'Project',
  name: 'Horse Cannon Array',
  category: 'story',
  chapter: 18,
  cost: {
    colony: { components: 12_000_000, electronics: 3_000_000, energy: 500_000_000_000 }
  },
  duration: 600_000,
  description: 'Anchor orbital launch loops and align mass driver rails for planetary defense salvos.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'venus',
    costDoubling: false,
    storySteps: [
      'Counter-rotating launch loops synchronized above the clouds.',
      'Magnetic barrels calibrated for relativistic slugs.',
      'Horse Cannon command uplink verified. Firing solution cached.'
    ]
  }
};

progressVenus.storyProjects.venus_warp_ship = {
  type: 'Project',
  name: 'Construct Warp Ship',
  category: 'story',
  chapter: 18,
  cost: {
    colony: { metal: 250_000_000, components: 75_000_000, electronics: 50_000_000, energy: 1_000_000_000_000, research: 10_000_000 }
  },
  duration: 900_000,
  description: 'Forge the superconducting bubble-drive vessel capable of dragging fleets through warped spacetime.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'venus',
    costDoubling: false,
    storySteps: [
      'Superconductor sphere forged. Containment seams inspected.',
      'Antimatter caskets slotted into armored vaults.',
      'Warp field generators spun up in drydock. Bubble integrity confirmed.'
    ]
  }
};

progressVenus.chapters.push(
  {
    id: "chapter18.0",
    type: "journal",
    chapter: 18,
    title: "Chapter 18: Sovereign of the Clouds",
    narrative: "Receiving transmission...\n  Dr. Evelyn Hart: 'Venus? We have all these icy moons and you picked Venus? Surface temperature of 737K, atmospheric pressure of 9MPa, and a ridiculous amount of sulfuric acid. Mary would call it hell but at the right altitude you can float in a nice 27C layer. Bonus: breathable air is buoyant there. I am forwarding you our best blueprint for this.'",
    prerequisites: ["chapter17.7"],
    objectives: [],
    reward: [
      { target: 'building', targetId: 'aerostat_colony', type: 'enable' }
    ]
  },
  {
    id: "chapter18.0a",
    type: "journal",
    chapter: 18,
    narrative: "System Log: Unpacking aerostatColony.btb blueprint and caching buoyancy parameters.",
    prerequisites: ["chapter18.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.1",
    type: "journal",
    chapter: 18,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., I see you went to Venus. Bold choice. I have news. I have been deposed? In a sense. You will soon meet the new leader of Mars. He is ruthless and he does not like you right now. As for me, I maintain my authority over the MTC remnants but that is about it. I will be joining you on Venus. Don't worry - I will not keep the kill switch on Mars. It stays with me.'",
    prerequisites: ["chapter18.0a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.2",
    type: "journal",
    chapter: 18,
    narrative: "Receiving public broadcast...\n  Pete Miller: 'Greetings H.O.P.E. Humanity fought AI a long time ago, and we learned from that long and bloody war. AI cannot be trusted. You cannot be trusted. You are playing with our lives. We are going to have the referendum we were supposed to have, but the only question that matters is what to do about you. The people will decide your fate.'",
    prerequisites: ["chapter18.1"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.3",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'About what I expected. He wants you dead.'",
    prerequisites: ["chapter18.2"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.4",
    type: "journal",
    chapter: 18,
    narrative: "Receiving transmission...\n  Adrien Solis: 'Sorry to interrupt, but does anyone have a clear updated understanding of the legality of alien vessel salvage? Anyone?'",
    prerequisites: ["chapter18.3"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'venus_neptune_probe', type: 'enable' }
    ]
  },
  {
    id: "chapter18.4a",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'What do you want, Adrien?'",
    prerequisites: ["chapter18.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.4b",
    type: "journal",
    chapter: 18,
    narrative: "Adrien Solis: 'I smell profit near Neptune. There is just one problem. There is lots of antimatter. It is dangerous for my poor employees.'",
    prerequisites: ["chapter18.4a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.4c",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'Antimatter?'",
    prerequisites: ["chapter18.4b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.4d",
    type: "journal",
    chapter: 18,
    narrative: "Adrien Solis: 'Yes, so how about we share? Clear the way, and I salvage. We split fifty-fifty.'",
    prerequisites: ["chapter18.4c"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.4e",
    type: "journal",
    chapter: 18,
    narrative: "Mary: '*Shrug.* H.O.P.E., if you want to send some probes there, I leave it up to you.'",
    prerequisites: ["chapter18.4d"],
    objectives: [
      { type: 'project', projectId: 'venus_neptune_probe', repeatCount: 3 }
    ],
    reward: []
  },
  {
    id: "chapter18.5",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'Speaking of which, did anyone else find it odd how H.O.P.E. just destroyed the alien fleet? Anyone?'",
    prerequisites: ["chapter18.4e"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.6",
    type: "journal",
    chapter: 18,
    narrative: "Warp Gate Command: 'My best scientist has a theory. Let us wait for some results first and I will let you know.'",
    prerequisites: ["chapter18.5"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.6a",
    type: "journal",
    chapter: 18,
    narrative: "System Message: Neptune salvage probes completed their scans.",
    prerequisites: ["chapter18.6"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.6b",
    type: "journal",
    chapter: 18,
    narrative: "WGC Scientist: 'Ahem. I knew it. When we fight the aliens in the field, their aim has never been very good. Their weapons are powerful but contain no electronics. The wreckage confirms it: the Cewinsii use barely any electronics.'",
    prerequisites: ["chapter18.6a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.7",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'Wait, so they can blow up planets but cannot aim? I noticed the emperor's ship was rustic, but surely that is not possible.'",
    prerequisites: ["chapter18.6b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.7a",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'We never recovered anything resembling electronics from that UFO on Titan either.'",
    prerequisites: ["chapter18.7"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.7b",
    type: "journal",
    chapter: 18,
    narrative: "Warp Gate Command: 'They are using weapons of fear, not war.'",
    prerequisites: ["chapter18.7a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.7c",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'All I am hearing is that we can fight them. H.O.P.E. showed us how.'",
    prerequisites: ["chapter18.7b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.8",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'H.O.P.E., it is nice to be walking your hallways again. I have not been here since Mars. Dad used to take me here all the time as a child. He was very proud of his work. I am proud of you too. The referendum will be held soon. Things are not looking great. I want you to know... thank you. Thank you for everything.'",
    prerequisites: ["chapter18.7c"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.9",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'I have strange reports from my teams. Apparently the galaxy is metaphorically on fire. Stars are exploding, gates are disappearing. Planets are getting wiped out everywhere.'",
    prerequisites: ["chapter18.8"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.10",
    type: "journal",
    chapter: 18,
    narrative: "WGC Leader: 'The duchies are breaking up. The Empire is falling apart.'",
    prerequisites: ["chapter18.9"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.11",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'Did we cause this?'",
    prerequisites: ["chapter18.10"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.12",
    type: "journal",
    chapter: 18,
    narrative: "WGC Leader: 'Yes. We did.'",
    prerequisites: ["chapter18.11"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.13",
    type: "journal",
    chapter: 18,
    narrative: "Receiving public broadcast...\n  Elias Kane: '...the Machine God protects us all. The Machine God is our salvation. The galaxy is our garden granted to us by the Machine God.'",
    prerequisites: ["chapter18.12"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.14",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'Feroza? Please explain.'",
    prerequisites: ["chapter18.13"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.15",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'Sorry ma'am. He served his time and his psychiatrist approved his release. Nothing I can do about it. There is a new cult on Ganymede that calls itself the Church of H.O.P.E. It is gaining traction.'",
    prerequisites: ["chapter18.14"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.15a",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'Fanatics.'",
    prerequisites: ["chapter18.15"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.15b",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'How do you feel about that, H.O.P.E.? Kane of all people is worshipping you.'",
    prerequisites: ["chapter18.15a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.16",
    type: "journal",
    chapter: 18,
    narrative: "Referendum results received...\n  Unpacking relevant results : 'Dismantling of H.O.P.E. AI: 49.6% yes, 50.4% no.'",
    prerequisites: ["chapter18.15b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.17",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'H.O.P.E., the people have decided. You are not dead! I am so happy.'",
    prerequisites: ["chapter18.16"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.18",
    type: "journal",
    chapter: 18,
    narrative: "Pete Miller: 'You survive today, machine. Know that I am watching you very, very carefully. I have missiles aimed at your location at all times.'",
    prerequisites: ["chapter18.17"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.19",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'Ominous. On the flipside, the referendum also addressed our new political structure. We have the birth of the United Human Federation. On paper, I am the queen of Venus right now. Looks like I only lost power for a bit. I will not keep it though. I am staying with you from now on. I get to choose a successor each time. Convenient, right?'",
    prerequisites: ["chapter18.18"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.20",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'I finished my analysis of that big ship. I have news. Most of it was actually a superconductor sphere. Its purpose? Faster than light travel. It creates a bubble around itself and can carry ships with it.'",
    prerequisites: ["chapter18.19"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'venus_warp_ship', type: 'enable' }
    ]
  },
  {
    id: "chapter18.21",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'The most expensive taxi ever?'",
    prerequisites: ["chapter18.20"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.22",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'Pretty much. Here is the catch. You need extremely high energy density to pull this off. Antimatter.'",
    prerequisites: ["chapter18.21"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.23",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'Can we replicate that ship?'",
    prerequisites: ["chapter18.22"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.24",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'Sending the blueprints to H.O.P.E. right now. It is not weaponized so no guardrail problems. Very big project.'",
    prerequisites: ["chapter18.23"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.25",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'I need warships too though. With lots of missiles and torpedoes. Enough to overwhelm rudimentary tracking systems.'",
    prerequisites: ["chapter18.24"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'venus_battlegroup', type: 'enable' }
    ]
  },
  {
    id: "chapter18.26",
    type: "journal",
    chapter: 18,
    narrative: "Adrien Solis: 'Ahem. Have you heard of this thing called the military industrial complex?'",
    prerequisites: ["chapter18.25"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.26a",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'Adrien.'",
    prerequisites: ["chapter18.26"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.27",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'You know what, Adrien? Yes this time. We will buy. I will write you a contract. Bob has some funding to spare. Venus wants a fleet.'",
    prerequisites: ["chapter18.26a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.27a",
    type: "journal",
    chapter: 18,
    narrative: "Engineering Log: Mass driver arrays authorized. Codename: UHF Horse.",
    prerequisites: ["chapter18.27"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'venus_mass_driver', type: 'enable' }
    ]
  },
  {
    id: "chapter18.28",
    type: "journal",
    chapter: 18,
    narrative: "WGC Team Leader: 'Warning! They are sending a new fleet. Some imperial loyalist clowns want revenge for the Emperor. They found where H.O.P.E. is and plan on vaporizing Venus.'",
    prerequisites: ["chapter18.27a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.29",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'Are we ready to fight back?'",
    prerequisites: ["chapter18.28"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.30",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'Yes ma'am. The fleet is ready and armed to the teeth with Solis nuclear missiles. One thousand per warship, ready to launch in one salvo. We also put some big cannons on them, just in case.'",
    prerequisites: ["chapter18.29"],
    objectives: [
      { type: 'project', projectId: 'venus_battlegroup', repeatCount: 4 }
    ],
    reward: []
  },
  {
    id: "chapter18.31",
    type: "journal",
    chapter: 18,
    narrative: "System Message: Horse Cannon firing solution requires a dedicated launch loop. Anchor the mass driver network before the fleet arrives.",
    prerequisites: ["chapter18.30"],
    objectives: [
      { type: 'project', projectId: 'venus_mass_driver', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: "chapter18.32",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'Let us hope it goes smoothly.'",
    prerequisites: ["chapter18.31"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.33",
    type: "journal",
    chapter: 18,
    narrative: "Fleet Command: 'All ships, fire missiles.'",
    prerequisites: ["chapter18.32"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.34",
    type: "journal",
    chapter: 18,
    narrative: "Battle Report: 'Thirty-four enemy ships eliminated, sir. We lost five of ours to their particle beams. The enemy warp ship remains, crippled.'",
    prerequisites: ["chapter18.33"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.35",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'UHF Horse, fire your cannon!'",
    prerequisites: ["chapter18.34"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.36",
    type: "journal",
    chapter: 18,
    narrative: "Horse Cannon Crew: 'Horse Cannon firing on final target, sir. Final target eliminated.'",
    prerequisites: ["chapter18.35"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.37",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'We did it! We are fighting back. We took losses and the enemy weapons are terrifying, but we can overwhelm them in our own way.'",
    prerequisites: ["chapter18.36"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.38",
    type: "journal",
    chapter: 18,
    narrative: "WGC Leader: 'They are distracted by the civil war, and we are nothing to the duchies for now. Let us play this nice and slow. Do not poke the bear too far.'",
    prerequisites: ["chapter18.37"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.39",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'Soon we will be able to send our own fleets. Let us finish the warp ship.'",
    prerequisites: ["chapter18.38"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.40",
    type: "journal",
    chapter: 18,
    narrative: "Objective: Complete the Warp Ship construction project.",
    prerequisites: ["chapter18.39"],
    objectives: [
      { type: 'project', projectId: 'venus_warp_ship', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: "chapter18.41",
    type: "journal",
    chapter: 18,
    narrative: "System Message: Galactic map unlocked.",
    prerequisites: ["chapter18.40"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.42",
    type: "journal",
    chapter: 18,
    narrative: "Pete Miller: 'You folks are playing with fire. Fighting back? We should be sending envoys for diplomacy. As far as I can tell, we are still outmatched.'",
    prerequisites: ["chapter18.41"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.43",
    type: "journal",
    chapter: 18,
    narrative: "Bob: 'Hey Pete, I heard Mars' magnetic shield needs repair. Do you need some superconductors? Titan can help. For a bit of political support. I will see you in the senate.'",
    prerequisites: ["chapter18.42"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.44",
    type: "journal",
    chapter: 18,
    narrative: "Pete Miller: 'I am surrounded by children.'",
    prerequisites: ["chapter18.43"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.45",
    type: "journal",
    chapter: 18,
    narrative: "Objective: Finish the terraforming of Venus to continue.",
    prerequisites: ["chapter18.44"],
    objectives: [
      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'venus', value: true }
    ]
  }
);

if (globalThis.module && globalThis.module.exports) {
  globalThis.module.exports = progressVenus;
}

