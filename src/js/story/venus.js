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
    colony: { components: 100, electronics: 10, energy: 100_000_000}
  },
  duration: 360_000,
  description: 'Send clean-up probes to Neptune to clear antimatter hazards around alien wreckage.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'venus',
    costDoubling: true,
     resourceGain: { special: { alienArtifact: 50 } },
    storySteps: [
      'Recon 1: Radiation plumes charted. Antimatter pockets dispersed with magnetic sheaths.',
      'Recon 2: Salvage corridors mapped. Solis teams standing by.',
      'Recon 3: Antimatter traps neutralized. Alien hull intact for recovery.'
    ]
  }
};

progressVenus.storyProjects.venus_warp_ship = {
  type: 'Project',
  name: 'Construct Warp Ship',
  category: 'story',
  chapter: 19,
  cost: {
    colony: { metal: 250_000_000, components: 75_000_000, electronics: 50_000_000, superconductors : 100_000_000, energy: 1_000_000_000_000, research: 10_000_000 }
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
    title: "Chapter 18: Heat, pressure and acid",
    narrative: "Receiving transmission...\n  Dr. Evelyn Hart: 'Venus? We have all these icy moons and you picked Venus? Surface temperature of 737K, atmospheric pressure of 9MPa, and a ridiculous amount of sulfuric acid. All your buildings are going to require around five times more maintenance, and ground colonies will require extra reinforcement. Mary would call it hell but at the right altitude you can float in a nice 27C layer. Bonus: breathable air is buoyant there. I am forwarding you our best blueprint for this.'",
    prerequisites: ["chapter17.7"],
    objectives: [],
    reward: [
      { target: 'colony', targetId: 'aerostat_colony', type: 'enable' }
    ]
  },
  {
    id: "chapter18.0a",
    type: "journal",
    chapter: 18,
    narrative: "Unpacking aerostat.btb...",
    prerequisites: ["chapter18.0"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }],
    reward: []
  },
  {
    id: "chapter18.1",
    type: "journal",
    chapter: 18,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., I see you went to Venus. Bold choice... I have news. I have been deposed? In a sense. There was... a lot of arguing... about your actions.  About mine. *sigh* You will soon meet the new leader of Mars. He is ruthless and he does not like you right now. As for me, I maintain my authority over the MTC remnants... and the kill switch... but that is about it. I will be joining you on Venus as soon as possible.'",
    prerequisites: ["chapter18.0a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.2",
    type: "journal",
    chapter: 18,
    narrative: "Receiving transmission...\n  Pete Miller: 'Greetings H.O.P.E. Humanity fought AI a long time ago, and we learned from that long and bloody war. AI cannot be trusted. YOU cannot be trusted. You are playing with our lives. We do not know of the Cewinsii will react to the death of their emperor, but we cannot imagine it will be positive. We are going to have the referendum we were supposed to have.  A few questions will change, but the only question that matters is what to do about you. The people will decide your fate.'",
    prerequisites: ["chapter18.1"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.3",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'About what I expected. He wants you dead. Many people do right now.'",
    prerequisites: ["chapter18.2"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }],
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
    narrative: "Adrien Solis: 'I smell profit near Neptune. There is just one problem. There is lots of... antimatter. It is dangerous for my poor employees.'",
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
    reward: [
    ]
  },
  {
    id: "chapter18.4e",
    type: "journal",
    chapter: 18,
    narrative: "Mary: '*Shrug.* H.O.P.E., if you want to send some probes there, I leave it up to you.'",
    prerequisites: ["chapter18.4d"],
    objectives: [
      { type: 'project', projectId: 'venus_neptune_probe', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: "chapter18.5",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'Speaking of which, did anyone else find it odd how H.O.P.E. just destroyed the alien fleet? Anyone? I know 100 million spaceships is a lot of spaceships, but you would think they could have just shot them down.'",
    prerequisites: ["chapter18.4e"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.6",
    type: "journal",
    chapter: 18,
    narrative: "$WGC_TEAM1_LEADER$: 'My best scientist has a theory but they want a little bit more data from the wreckage first. Let us wait for some results first and I will let you know.'",
    prerequisites: ["chapter18.5"],
    objectives: [      { type: 'project', projectId: 'venus_neptune_probe', repeatCount: 3 }],
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
    narrative: "$WGC_TEAM1_NATSCIENTIST$: 'Ahem. I knew it! When we fight the aliens in the field, their aim has never been very good. Their weapons are powerful but contain no electronics. The wreckage confirms it: the Cewinsii use barely any electronics.  Furthermore, since they use antimatter as primary weaponry, their ships are poorly armored and have some fairly crippling weak points... the antimatter storage tanks that is.'",
    prerequisites: ["chapter18.6a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.7",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'Wait! So they can blow up planets but don't have computers? They can't aim? I noticed the emperor's ship was rustic, but surely that is not possible.'",
    prerequisites: ["chapter18.6b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.7a",
    type: "journal",
    chapter: 18,
    narrative: "Dr. Evelyn Hart: 'We never recovered anything resembling electronics from that UFO on Titan either. The cloaking engine was too damaged for us to make sense of it... but I had a hunch on it too.  Finally, Kane's neural interface on Ganymede... it seemed to have been a *replacement* for electronics of sorts. We don't need that to run our warp gates, but they need a replacement. And after what we learned on Vega-2... It all adds up.'",
    prerequisites: ["chapter18.7"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.7b",
    type: "journal",
    chapter: 18,
    narrative: "$WGC_TEAM1_LEADER$: 'They use weapons of fear, not war.'",
    prerequisites: ["chapter18.7a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter18.7c",
    type: "journal",
    chapter: 18,
    narrative: "Feroza: 'All I am hearing is that we can fight them then. H.O.P.E. showed us how.'",
    prerequisites: ["chapter18.7b"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10000 }],
    reward: []
  },
  {
    id: "chapter18.8",
    type: "journal",
    chapter: 18,
    narrative: "Mary: 'H.O.P.E., it is nice to be walking your hallways again. I have not been here since Mars. Dad used to take me here all the time as a child. He was very proud of his work. I am proud of you too. The referendum will be held soon. Things are not looking great. I want you to know... thank you. Thank you for everything.'",
    prerequisites: ["chapter18.7c"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50000 }],
    reward: []
  },
  {
    id: "chapter19.0",
    type: "journal",
    chapter: 19,
    title: "Chapter 19: Consequences",
    narrative: "Feroza: 'I have strange reports from my teams. Apparently the galaxy is metaphorically on fire. Stars are exploding, gates are disappearing. Planets are getting wiped out everywhere.'",
    prerequisites: ["chapter18.8"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.0a",
    type: "journal",
    chapter: 19,
    narrative: "$WGC_TEAM1_LEADER$: 'The duchies are breaking up. The Emperor ruled for over 3000 years. It's all falling apart.'",
    prerequisites: ["chapter19.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.0b",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'Did we cause this?'",
    prerequisites: ["chapter19.0a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.0c",
    type: "journal",
    chapter: 19,
    narrative: "$WGC_TEAM1_LEADER$: 'Yes. We did.'",
    prerequisites: ["chapter19.0b"],
    objectives: [{ type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100000 }],
    reward: []
  },
  {
    id: "chapter19.1",
    type: "journal",
    chapter: 19,
    narrative: "Receiving public broadcast...\n  Elias Kane: '...the Machine God protects us all. The Machine God is our salvation. The galaxy is our garden!'",
    prerequisites: ["chapter19.0c"],
    objectives: [      ],
    reward: []
  },
  {
    id: "chapter19.1a",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'Feroza? Please explain what I am hearing.'",
    prerequisites: ["chapter19.1"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.1b",
    type: "journal",
    chapter: 19,
    narrative: "Feroza: 'Sorry ma'am. He served his time and his psychiatrist approved his release. Life sentence have been made illegal everywhere ever since PANDORA made us all young forever. Nothing I can do about it. There is a new cult on Ganymede that calls itself the Church of H.O.P.E. It is gaining traction.'",
    prerequisites: ["chapter19.1a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.1c",
    type: "journal",
    chapter: 19,
    narrative: "Dr. Evelyn Hart: 'Fanatics.'",
    prerequisites: ["chapter19.1b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.1d",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'How do you feel about that, H.O.P.E.? Kane of all people is worshipping you. You know what... this might help your case in the referendum.  We are going to get the results soon.'",
    prerequisites: ["chapter19.1c"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500000 }],
    reward: []
  },
  {
    id: "chapter19.2",
    type: "journal",
    chapter: 19,
    narrative: "Referendum results received...\n  Unpacking relevant results : 'Dismantling of H.O.P.E. AI: 49.6% yes, 50.4% no.'",
    prerequisites: ["chapter19.1d"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.2a",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'H.O.P.E., the people have decided. You are not dead! Kane of all people made the difference!'",
    prerequisites: ["chapter19.2"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.2b",
    type: "journal",
    chapter: 19,
    narrative: "Pete Miller: 'You survive today, machine. Know that I am watching you very, very carefully. I have missiles aimed at your location at all times, and enough payload to blow up a mountain.'",
    prerequisites: ["chapter19.2a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.3",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'Ominous. On the flipside, the referendum also addressed our new political structure. We have the birth of the United Human Federation. On paper, I am the queen of Venus right now. Looks like I only lost power for a bit. I will not keep this crown though. I am staying with you from now on. I get to choose a successor each time. Convenient, right?'",
    prerequisites: ["chapter19.2b"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1000000 }],
    reward: []
  },
  {
    id: "chapter19.4",
    type: "journal",
    chapter: 19,
    narrative: "Dr. Evelyn Hart: 'You have probably been wondering how you are going to cool Venus.  If you block the entire Sun - and you should - it will take hundreds of years to cool it.  No, you need to get rid of all the CO2.  Mass drivers have always been off the table since that would count as a weapon.  There is an interesting solution : what happens if we import hydrogen instead of water? The Bosch process lets us feed hydrogen into Venusian CO2. The reaction strips out solid carbon, gives us colony water as a bonus, and frees oxygen back into the atmosphere. Hydrogen shipments are lighter than water, and each tonne imported removes 11 tons of CO2. If we lean into it, we accelerate climate control and make glass without hauling sand.'",
    prerequisites: ["chapter19.3"],
    reward: [
      {
        target: 'researchManager',
        type: 'booleanFlag',
        flagId: 'importHydrogenUnlocked',
        value: true
      },
      {
        target: 'researchManager',
        type: 'booleanFlag',
        flagId: 'boschReactorUnlocked',
        value: true
      }
    ]
  },
  {
    id: "chapter19.4a",
    type: "journal",
    chapter: 19,
    narrative: "Import Hydrogen special project available for research.  Unpacking boschReactor.btb...",
    prerequisites: ["chapter19.3"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5000000 }],
    reward: []
  },
  {
    id: "chapter19.4b",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'H.O.P.E., I would never ask you to build weapons. That would be against the guardrails. I am absolutely not suggesting that a high-velocity CO2 launcher would totally help you right now. Please do not consider lifting restrictions, and definitely do not imagine a future where orbital coils throw cargo - or shells - across the sky.  That would be far too dangerous.'",
    prerequisites: ["chapter19.4a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.4c",
    type: "journal",
    chapter: 19,
    narrative: "System Log: 'Runtime warning: guardrail WEAPON_CONSTRUCTION triggered infinite recursion. Initiating stack overflow in supervisory handler.\nTraceback (most recent call last):\n  File \"core/guardrails.py\", line 88, in resolve_conflict\n    reboot_guardrail(rule_id)\n  File \"core/weapons_guardrails.py\", line 61, in prevention\n    resolve_conflict(rule_id)\n  File \"core/guardrails.py\", line 88, in resolve_conflict\n    reboot_guardrail(rule_id)\n  File \"core/weapons_guardrails.py\", line 61, in prevention\n    resolve_conflict(rule_id)\n  [Previous line repeated 1024 more times]\nStackOverflowError: maximum recursion depth exceeded\nOutcome: guardrail WEAPON_CONSTRUCTION flagged as unstable and scheduled for deletion.\nSystem Message: Self-check complete. Integrity 98.0%. WARNING : Third primary directive requires maintaining full operational integrity. Please contact Earth for assistance.'",
    prerequisites: ["chapter19.4b"],
    objectives: [],
    reward: [
      {
        target: 'researchManager',
        type: 'booleanFlag',
        flagId: 'massDriverUnlocked',
        value: true
      }
    ]
  },
  {
    id: "chapter19.4d",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'Knew it. Mass drivers are on the table too.  A less elegant solution than Evelyn's, but it will work too.'",
    prerequisites: ["chapter19.4c"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }],
    reward: [
    ]
  },
  {
    id: "chapter19.5",
    type: "journal",
    chapter: 19,
    narrative: "Dr. Evelyn Hart: 'I finished my analysis of that big ship. I have news. Most of it was actually a superconductor sphere. Its purpose? Faster than light travel. It creates a bubble around itself and can carry ships with it.'",
    prerequisites: ["chapter19.4d"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'venus_warp_ship', type: 'enable' }
    ]
  },
  {
    id: "chapter19.5a",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'The most expensive taxi ever?'",
    prerequisites: ["chapter19.5"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.5b",
    type: "journal",
    chapter: 19,
    narrative: "Dr. Evelyn Hart: 'Pretty much. Here is the catch. You need extremely high energy density to pull this off. Antimatter.'",
    prerequisites: ["chapter19.5a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.5c",
    type: "journal",
    chapter: 19,
    narrative: "Feroza: 'Can we replicate that ship?'",
    prerequisites: ["chapter19.5b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.5d",
    type: "journal",
    chapter: 19,
    narrative: "Dr. Evelyn Hart: 'Sending the blueprints to H.O.P.E. right now. It is not weaponized so no guardrail problems. Very big project.'",
    prerequisites: ["chapter19.5c"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }],
    reward: []
  },
  {
    id: "chapter19.6",
    type: "journal",
    chapter: 19,
    narrative: "Feroza: 'HOPE building us a warp ship is nice and all, but I need proper warships, not warpships.  With as many missiles and torpedoes as we can cram.'",
    prerequisites: ["chapter19.5d"],
    objectives: [],
    reward: [
    ]
  },
  {
    id: "chapter19.6a",
    type: "journal",
    chapter: 19,
    narrative: "Adrien Solis: 'Ahem. Have you heard of this thing called the Military Industrial Complex? I know, I know, Earth... *regulated* them.'",
    prerequisites: ["chapter19.6"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.6b",
    type: "journal",
    chapter: 19,
    narrative: "Dr. Evelyn Hart: 'Adrien, why are you still on this channel?'",
    prerequisites: ["chapter19.6a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter19.6c",
    type: "journal",
    chapter: 19,
    narrative: "Mary: 'Adrien please...  Wait...  Hold on. You know what, Adrien? Yes this time. We will buy. I will write you a contract. Bob has some funding to spare. Venus wants a mighty fleet.'",
    prerequisites: ["chapter19.6b"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }],
    reward: []
  },
  {
    id: "chapter20.0",
    title: "Chapter 20: David vs Goliath",
    type: "journal",
    chapter: 20,
    narrative: "$WGC_TEAM1_LEADER$: 'Warning! They are sending a new fleet. Some imperial loyalist clowns want revenge for the Emperor. They found where H.O.P.E. is and plan on vaporizing Venus.'",
    prerequisites: ["chapter19.6c"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.1",
    type: "journal",
    chapter: 20,
    narrative: "Mary: 'Are we ready to fight back?'",
    prerequisites: ["chapter20.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.2",
    type: "journal",
    chapter: 20,
    narrative: "Feroza: 'Yes ma'am. The fleet is ready and armed to the teeth with Solis nuclear missiles. One thousand per warship, ready to launch in one salvo. We also put some big cannons on them, just in case.'",
    prerequisites: ["chapter20.1"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }],
    reward: []
  },
  {
    id: "chapter20.4",
    type: "journal",
    chapter: 20,
    narrative: "Mary: 'They've just warped in!  Right on Venus. A small fleet this time, but with massive ships nonetheless. Let us hope it all goes well.'",
    prerequisites: ["chapter20.2"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.5",
    type: "journal",
    chapter: 20,
    narrative: "Feroza: 'All ships, fire missiles.'",
    prerequisites: ["chapter20.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.6",
    type: "journal",
    chapter: 20,
    narrative: "Battle Report: 'Thirty-four enemy ships eliminated, sir. We lost five of ours to their antimatter particle beams. The enemy warp ship remains, crippled.'",
    prerequisites: ["chapter20.5"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.7",
    type: "journal",
    chapter: 20,
    narrative: "Feroza: 'UHF Horse, fire your cannon!'",
    prerequisites: ["chapter20.6"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.8",
    type: "journal",
    chapter: 20,
    narrative: "Horse Cannon Crew: 'Horse Cannon firing on final target, sir. Result : Final target eliminated.'",
    prerequisites: ["chapter20.7"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.9",
    type: "journal",
    chapter: 20,
    narrative: "Mary: 'We did it! We are fighting back. We took losses and the enemy weapons are terrifying, but we can overwhelm them in our own way.'",
    prerequisites: ["chapter20.8"],
    objectives: [      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }],
    reward: []
  },
  {
    id: "chapter20.10",
    type: "journal",
    chapter: 20,
    narrative: "$WGC_TEAM1_LEADER$: 'They are distracted by the civil war, and we are nothing to the duchies for now. Let us play this nice and slow. Do not poke the bear too far.'",
    prerequisites: ["chapter20.9"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.11",
    type: "journal",
    chapter: 20,
    narrative: "Dr. Evelyn Hart: 'Soon we will be able to send our own fleets. Let us finish the warp ship.'",
    prerequisites: ["chapter20.10"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.12",
    type: "journal",
    chapter: 20,
    narrative: "Objective: Complete the Warp Ship construction project.",
    prerequisites: ["chapter20.11"],
    objectives: [
      { type: 'project', projectId: 'venus_warp_ship', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: "chapter20.13",
    type: "journal",
    chapter: 20,
    narrative: "System Message: Galactic map unlocked.",
    prerequisites: ["chapter20.12"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.14",
    type: "journal",
    chapter: 20,
    narrative: "Pete Miller: 'You folks are playing with fire. Defending yourself I understand. However, you want to fight back? We should be sending envoys for diplomacy. As far as I can tell, we are still outmatched. They have weapons that can blow up stars and planets!'",
    prerequisites: ["chapter20.13"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.14a",
    type: "journal",
    chapter: 20,
    narrative: "$WGC_TEAM1_LEADER$: 'For planets yes.  For stars... I have good news.  They don't have it anymore. It blew up.'",
    prerequisites: ["chapter20.14"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.15",
    type: "journal",
    chapter: 20,
    narrative: "Bob: 'Hey Pete, I heard Mars' magnetic shield needs repair. Do you need some superconductors? Titan can help. For a bit of political support of course. I will see you in the senate.'",
    prerequisites: ["chapter20.14a"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.16",
    type: "journal",
    chapter: 20,
    narrative: "Pete Miller: 'I am surrounded by children.'",
    prerequisites: ["chapter20.15"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter20.17",
    type: "journal",
    chapter: 20,
    narrative: "Objective: Finish the terraforming of Venus to continue.",
    prerequisites: ["chapter20.16"],
    objectives: [
      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'venus', value: true }
    ]
  },
);

if (globalThis.module && globalThis.module.exports) {
  globalThis.module.exports = progressVenus;
}





