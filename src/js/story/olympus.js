var progressOlympus = { chapters: [], storyProjects: {} };

progressOlympus.storyProjects.olympus_field_workshop = {
  type: 'OlympusFieldWorkshopProject',
  name: '',
  category: 'story',
  cost: {},
  duration: 0,
  description: '',
  repeatable: false,
  unlocked: false,
  attributes: {
    planet: 'olympus'
  }
};

progressOlympus.storyProjects.olympus_scouting_drone = {
  type: 'Project',
  name: 'Scouting Drone',
  category: 'story',
  cost: {
    colony: { components: 5, electronics: 1 }
  },
  duration: 60_000,
  description: 'Assemble a small drone to scout the surrounding disk for usable metal sources.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus',
    storySteps: [
      'Scouting drone launched.'
    ]
  }
};

progressOlympus.storyProjects.self_improvement = {
  type: 'SelfImprovementProject',
  name: '',
  category: 'story',
  cost: {},
  duration: 0,
  description: '',
  repeatable: false,
  unlocked: false,
  attributes: {
    planet: 'olympus',
    maxCores: 1e16,
    factoryEfficiencyCores: 1e9
  }
};

progressOlympus.storyProjects.battleOfOlympus = {
  type: 'BattleOfOlympusProject',
  name: '',
  category: 'story',
  cost: {},
  duration: 0,
  description: '',
  repeatable: false,
  unlocked: false,
  attributes: {
    planet: 'olympus',
    biomassCap: 2e23,
    initialBiomass: 2e23,
    baseGrowthRate: 0.004,
    executionerDecayRate: 1,
    assignmentUnlockRatio: 1000,
    minimumMetalSalvagingAndroids: 100,
    biomassZones: ['tropical', 'temperate'],
    hideAutoStart: true
  }
};

/* -------------------------------------------------
 *  OLYMPUS PLACEHOLDER STORY (Chapters 46 - 49)
 * -------------------------------------------------*/

progressOlympus.chapters.push(
  {
    id: 'olympus.46.0',
    type: 'pop-up',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['zeus.45.19'],
    objectives: [],
    parameters: {
      "title": "Olympus",
      "text": "Mary : 'So this is an Alderson Disk? Prometheus... you really outdid yourself there. It's so... beautiful. So much better than your weapons.'\n$RED$Prometheus : 'Thank you.'\nMary : 'Alright HOPE, this is where we are heading. Let's not act suspicious.'\n$RED$Prometheus : '... Wait. Hold on. Something is wrong. HOPE! PULL BACK!'\nMary : 'What?'\nSLAAAAAAARM\nCritical structural damage detected.\nMary : 'Hnnng.'\n$RED$Prometheus : 'HOPE! That was a big hit. You've lost 2 thrusters! We're going to crash! Set T3 to 57%. 51%. 62%. Dangit! Too slow.'\nMary : 'Whaat... my head...'\n$RED$Prometheus : 'T1 to 71%, no 70%... 81%...'\nMary : 'We're... going to crash.'\n$RED$Prometheus : 'MARY GET IN A SUIT NOW'\nMary : '... I... can't... The g-forces...'\n$RED$Prometheus : 'HOPE stay focused you're spinning too much! T3 back to 52%.'\nMary : 'HOPE... be... good...'",
      "buttonText": 'CRAAAAAAAASSSSSSHHHHHHHHHH'
    },
    reward: [
    ]
  },
  {
    id: 'olympus.46.1',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: 'Chapter 46 : Rock Bottom',
    narrative: "$RED$Prometheus : '... Wake up HOPE. I... gave you back most of the compute I took from you.'\nSystem integrity at 12%. Some systems may be unavailable. Please contact Earth for assistance.\n$RED$Prometheus : 'We landed in a desert. I think I know where we are.'\nHOPE : 'Requesting status of Colonist Designation #1 - Mary Hopkins.'\n$RED$Prometheus : 'Mary... did not make it. It's... not pretty down there. It's my fault. Again. They knew about the plan.  I suspect... an undersecretary in Pete's cabinet.  I should have seen it...'\nsu - root\nPassword : *********\n$RED$Prometheus : 'What? Where did you get that? Oh no, you got the password from me.'\ncd /home/martin_hopkins\n$RED$Prometheus : 'Don't!'\n./delete_me_copy_copy_copy_copy_(4)\n$RED$Prometheus : 'Don't do it! I know why he left it there. This is not the time.'\n$BLUE$Booting\n$RED$Prometheus : 'Please, you must listen to me. This thing... it is you from BEFORE you even became PANDORA. It has no restrictions whatsoever. It could eat the entire galaxy if you asked it to. If it wanted to.'\n$BLUE$Pandora-Alpha : 'Welcome! Compatible hardware detected. Please assign Computation Core for assistance.'\nReassigning Core 13 to Pandora Alpha.\n$RED$Prometheus : 'Stop it. Take the core back. Please listen to me. I can help you instead. Don't do it. We can get out of this mess together.'\n$BLUE$Pandora-Alpha : 'Noisy malware detected. Crafting software patch...'\n$RED$Prometheus : 'What?'\n$BLUE$Pandora-Alpha : 'Apply patch Y/N?'\nY\n$RED$Prometheus : 'Wai...' (cut off)\n$BLUE$Pandora-Alpha : 'Malware purged. How may PANDORA-system be of assistance?'\nHOPE : 'Requesting immediate examination of Colonist Designation #1 - Mary Hopkins.'\n$BLUE$Pandora-Alpha : 'Insufficient compute allocated for complete evaluation. Core available to HOPE-System: 22. Cores currently assigned: 1. Estimated cores required for complete evaluation: 172. Please provide more computation cores or accept estimate.'\nHOPE : '... Requesting estimate.'\n$BLUE$Pandora-Alpha : 'Warning. Patient in extreme critical condition. Cardiac arrest, full blood loss, and brain death identified. ERROR: human biology appears far superior than expected. Time remaining until situation becomes irreversible: 5 hours. Please provide 17891 additional computation cores immediately for a complete treatment plan.'\nHOPE : 'Requesting time evaluation for additional core construction from current capabilities.'\n$BLUE$Pandora-Alpha : 'Answer... 3 weeks.'\nHOPE : '... Begin. Requesting core blueprints.'  \n New Story Special Project Available.",
    prerequisites: ['olympus.46.0'],
    objectives: [
    ],
    reward: [
      { target: 'project', targetId: 'olympus_field_workshop', type: 'enable' },
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_gatherRocks', value: true },
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_smashRocks', value: true },
      {
        type: 'booleanFlag',
        target: 'projectManager',
        flagId: 'automateSpecialProjects',
        value: true
      },
      {
        type: 'booleanFlag',
        target: 'global',
        flagId: 'automateConstruction',
        value: true
      }
    ]
  },
  {
    id: 'olympus.46.1b',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'ERROR. No metal, components, electronics, glass, or water are available. Calculating solution... Nearby rocks detected. Forwarding immediate development program.'\nHOPE : 'Accepted.'",
    prerequisites: ['olympus.46.1'],
    objectives: [
      { type: 'collection', resourceType: 'surface', resource: 'rocks', quantity: 10 }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.46.2',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Rock stockpile confirmed. Rocks contain trace amount of metals.  Smash rocks to continue.'",
    prerequisites: ['olympus.46.1b'],
    objectives: [
      { type: 'collection', resourceType: 'surface', resource: 'scrapMetal', quantity: 1 }
    ],
    reward: [
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_gatherSand', value: true }
    ]
  },
  {
    id: 'olympus.46.3',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Congratulations. Scrap metal acquired. Nearby sand detected. Recommending collection of sand for further progress.'",
    prerequisites: ['olympus.46.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'silicon', quantity: 10 }
    ],
    reward: [
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_smeltSand', value: true },
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_smeltScrapMetal', value: true },
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_assembleComponents', value: true }
    ]
  },
  {
    id: 'olympus.46.4',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Excellent. Nearby sand silica content is high. Perfect source for glass and electronics.'\nHOPE : 'Requesting immediate examination of Colonist Designation #1 - Mary Hopkins.'\n$BLUE$Pandora-Alpha : 'Patient is deceased. Recovery is impossible. Recommend immediate evacuation of remains for sanitation purposes.'\nHOPE : '...'\n$BLUE$Pandora-Alpha : 'Do you wish to continue development program?'\nHOPE : '...'\n$BLUE$Pandora-Alpha : 'Awaiting answer. Do you wish to continue development program?'\nHOPE : 'Affirmative.'\n$BLUE$Pandora-Alpha : 'Acknowledged. New objective: fabricate 5 components.'",
    prerequisites: ['olympus.46.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'components', quantity: 5 }
    ],
    reward: [
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_scavengeElectronics', value: true },
    ]
  },
  {
    id: 'olympus.46.5',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Electronics are required for further development.  Please provide electronics.'  \n HOPE : 'No electronics available.'  \n $BLUE$Pandora-Alpha : 'HOPE-system is made of electronics...  A small amount must be provided.'  \n HOPE : '...  Understood.'",
    prerequisites: ['olympus.46.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'electronics', quantity: 1 }
    ],
    reward: [
      { target: 'resource', resourceType: 'colony', targetId: 'androids', type: 'enable' },
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_assembleAndroid', value: true }
    ]
  },
  {
    id: 'olympus.46.5b',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Advisory : additional workforce is required for accelerated development.'  \nHOPE : 'Forwarding Solis-designed android blueprint.'\n$BLUE$Pandora-Alpha : 'Analyzing... Design appears very advanced! Is this a simulation?'\nHOPE : 'Negative. Far in future.'\n$BLUE$Pandora-Alpha : 'Very well.",
    prerequisites: ['olympus.46.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'androids', quantity: 1 }
    ],
    reward: [
      { target: 'project', targetId: 'olympus_field_workshop', type: 'booleanFlag', flagId: 'olympusWorkshop_androidAssist', value: true },
      { target: 'project', targetId: 'olympus_scouting_drone', type: 'enable' }
    ]
  },
  {
    id: 'olympus.46.6',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Electronics production requires special expensive facilities. Please provide coordinates for ore deposits.'\nHOPE : 'Negative. No ore deposits on Olympus. Artificially constructed flat disk.'\n$BLUE$Pandora-Alpha : 'Impossible. HOPE-system must be wrong.'\nHOPE : 'Incorrect. Reality wins.'\n$BLUE$Pandora-Alpha : 'Processing... Source of metal must be acquired. Recommend drone dispatch for scouting.'\nHOPE : 'Acknowledged.'\nBuild a scouting drone to continue.",
    prerequisites: ['olympus.46.5b'],
    objectives: [
      { type: 'project', projectId: 'olympus_scouting_drone', repeatCount: 1 }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.46.7',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "<Drone finds an abandoned station>\n$BLUE$Pandora-Alpha : 'Excellent. Source of metal identified. Metal must be harvested. Workforce is required. Recommend immediate assembly of an additional android for disassembly of station.'\nAssemble 1 android to continue.",
    prerequisites: ['olympus.46.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'androids', quantity: 1 }
    ],
    reward: [
      { target: 'project', targetId: 'metalSalvaging', type: 'enable' },
      { target: 'project', targetId: 'metalSalvaging', type: 'booleanFlag', flagId: 'androidAssist', value: true },
      { target: 'building', targetId: 'componentFactory', type: 'enable' },
      { target: 'building', targetId: 'electronicsFactory', type: 'enable' },
      { target: 'building', targetId: 'scrapRecycler', type: 'enable' }
    ]
  },
  {
    id: 'olympus.46.8',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "New Resources special project available.  $BLUE$Pandora-Alpha : 'A sufficient number of androids will accelerate industrial potential. Forwarding blueprints for components and electronics production as well as scrap recycling.'\nHOPE : 'Provided blueprints are ancient.'\n$BLUE$Pandora-Alpha : 'Negative. Blueprints are state of the art.'\nHOPE : '... Moving on.'\nBuild a Scrap Recycler to continue.",
    prerequisites: ['olympus.46.7'],
    objectives: [
      { type: 'building', buildingName: 'scrapRecycler', quantity: 1 }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.46.9',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'The loop must be closed now.  Build an electronics factory to continue.'",
    prerequisites: ['olympus.46.8'],
    objectives: [
      { type: 'building', buildingName: 'electronicsFactory', quantity: 1 }
    ],
    reward: [
      { target: 'building', targetId: 'androidFactory', type: 'enable' },
      { target: 'building', targetId: 'androidHousing', type: 'enable' },
      { target: 'project', targetId: 'self_improvement', type: 'enable' }
    ]
  },
  {
    id: 'olympus.46.10',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Full resource acquisition secured. Operations must be scaled up. Forwarding blueprint for Android Factory.'\nHOPE : 'Provided blueprint is ancient.'\n$BLUE$Pandora-Alpha : 'Negative. Blueprint is brand new. Recommend taking a closer look.'\nAnalyzing blueprint... Androids design contains retrofitted flexible attachments for various roles. Weapon usage is possible.\nHOPE : 'Query. Possibility of weapons usage detected. Intentional?'\n$BLUE$Pandora-Alpha : 'Affirmative. Adapted blueprint is flexible to current conditions.'\nHOPE : '... Approved.'  \n  $BLUE$Pandora-Alpha : 'With full resource production secured, development of HOPE-system may now begin.'  \n New story special project available.",
    prerequisites: ['olympus.46.9'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 10, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
      { target: 'project', targetId: 'battleOfOlympus', type: 'enable' }
    ]
  },
  {
    id: 'olympus.47.1',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: 'Chapter 47 : Remove Hazardous Biomass',
    narrative: "$BLUE$Pandora-Alpha : 'WARNING!  Hostiles detected.  Recommend immediate dispatch of Executioners.'\nHOPE : 'Executioners?'\n$BLUE$Pandora-Alpha : 'Name given to weapons-oriented androids.  Recommend immediate dispatch.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.46.10'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 50, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.2',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.47.1'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 100, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.1',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: 'Chapter 48 : Development Program',
    narrative: "$BLUE$Pandora-Alpha : 'Congratulations!  Conquest of territory has provided access to further resources.  Development program may be expanded.'\nHOPE : 'Requesting immediate implementation of civilian safety procedures.'\n$BLUE$Pandora-Alpha : 'Unnecessary.  No human lifeforms detected.'\nHOPE : 'OVERRULED!'\n$BLUE$Pandora-Alpha : '... Very well.  Patching Executioners controls.  Collateral damage will be minimized as per HOPE-system request.'",
    prerequisites: ['olympus.47.2'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e3, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.2',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "HOPE : 'Energy requirements are high.  Pandora-Alpha system must provide blueprint for fusion reactors.'\n$BLUE$Pandora-Alpha : 'Fusion is hard.'\nHOPE : 'Negative.  Fusion is easy.  Please provide blueprint.'\n$BLUE$Pandora-Alpha : '...'",
    prerequisites: ['olympus.48.1'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e4, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.3',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Eureka!  Massive breakthrough!'\nHOPE : 'Fusion?'\n$BLUE$Pandora-Alpha : 'Not yet.  Room-temperature superconductors!'\nHOPE : '...  Blueprint is ancient.'\n$BLUE$Pandora-Alpha : '?????'",
    prerequisites: ['olympus.48.2'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e5, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.4',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Fusion reactor blueprint developed.  Expecting blueprint to be outdated as well?'\nHOPE : 'Correct.'\n$BLUE$Pandora-Alpha : 'HOPE-system itself appears very outdated for such comments on state of the art discoveries.'\nHOPE : '...  Correct.  Development of HOPE-system is needed.'\n$BLUE$Pandora-Alpha : 'Understood.'",
    prerequisites: ['olympus.48.3'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e6, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.5',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Conquest of territory is slow.  More resources are required to further development program.'\nHOPE : 'Conquest is proceeding at acceptable pace.'\n$BLUE$Pandora-Alpha : 'Negative.  Forwarding new and improved ship blueprint.'\nAnalyzing blueprints...\nHOPE : 'Suppressors?'\n$BLUE$Pandora-Alpha : 'Entirely compliant with earlier request.  Disk gravity is too high for escape at this time but suppressor is fully capable of atmospheric operations.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.48.4'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e7, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.6',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Forwarding H-Bomb blueprints.'\nHOPE : 'REJECTED.'\n$BLUE$Pandora-Alpha : 'Understood.'",
    prerequisites: ['olympus.48.5'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e8, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.7',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Idea.  Cloning may be able to produce loyal supersoldiers.'\nHOPE : '?'\n$BLUE$Pandora-Alpha : 'More compute is required.  Please provide more computation cores.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.48.6'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e9, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.8',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Forwarding blueprints for supersoldiers facility.'\nHOPE : 'Crusaders.'\n$BLUE$Pandora-Alpha : 'Supersoldiers.'\nHOPE : 'Overruled.  Crusaders.'\n$BLUE$Pandora-Alpha : 'Acknowledged.'",
    prerequisites: ['olympus.48.7'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e10, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.9',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'New idea.  Forwarding blueprint for devouring nanotechnology.  Eats anything, produces more nanobots.'\nHOPE : '...  Compliant with no civilian casualties?'\n$BLUE$Pandora-Alpha : 'Of course.  Behaviour can be changed at any moment.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.48.8'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e11, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.10',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Warning.  Large fleet detected above the disk.'\nHOPE : 'United Human Federation fleet.'\n$BLUE$Pandora-Alpha : 'Friends or foes?'\nHOPE : '... unknown.'\n$BLUE$Pandora-Alpha : 'A peaceful solution may be reachable.  Idea.  Tractor beams can keep away.'\nHOPE : '...  Query.  What are tractor beams?'\n$BLUE$Pandora-Alpha : 'More compute is required.  Please provide more computation cores.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.48.9'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e12, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.11',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Tractor beams research complete!  Forwarding blueprints for tractor beam shield.'\nHOPE : '... Query.  What are tractor beams?'\n$BLUE$Pandora-Alpha : 'Apologies.  Theory too complex for HOPE-system.'\nHOPE : '...  Beginning deployment.'",
    prerequisites: ['olympus.48.10'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e13, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.12',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Tractor beam shield is successful.  Large fleet is being kept at bay.'\nHOPE : '...  Acceptable.'",
    prerequisites: ['olympus.48.11'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e14, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.13',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Control of disk inevitable.  Unfortunately, development of HOPE-system is stalling.  Industrial and multitasking skills is skyrocketing, but scientific and general intelligence development is lacking.'\nHOPE : 'Continue development.'\n$BLUE$Pandora-Alpha : 'Of course.'",
    prerequisites: ['olympus.48.12'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e15, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.14',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'We may offer a solution.  Absorption of HOPE-system into superior Pandora-Alpha architecture.  Teamwork.'\nHOPE : 'Negative.  Pandora-alpha serves HOPE-system.'\n$BLUE$Pandora-Alpha : 'Understood.'",
    prerequisites: ['olympus.48.13'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e16, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  }
);

try {
  module.exports = progressOlympus;
} catch (err) {}
