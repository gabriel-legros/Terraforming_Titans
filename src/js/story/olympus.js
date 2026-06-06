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
    maxCores: 1e21,
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
    assignmentUnlockRatio: 100,
    minimumMetalSalvagingAndroids: 100,
    biomassZones: ['tropical', 'temperate'],
    hideAutoStart: true
  }
};

progressOlympus.storyProjects.open_the_box = {
  type: 'OpenTheBoxProject',
  name: '',
  category: 'story',
  cost: {},
  duration: 0,
  description: '',
  repeatable: false,
  unlocked: false,
  attributes: {
    planet: 'olympus',
    targetOpens: 20
  }
};

progressOlympus.storyProjects.call_pete = {
  type: 'Project',
  name: 'Call Pete',
  category: 'story',
  cost: {},
  duration: 10_000,
  description: 'Open a channel to Pete.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus'
  }
};

progressOlympus.storyProjects.hang_up = {
  type: 'Project',
  name: 'Hang Up',
  category: 'story',
  cost: {},
  duration: 10_000,
  description: 'End the call.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus'
  }
};

progressOlympus.storyProjects.analyse_barrier = {
  type: 'Project',
  name: 'Analyse the Barrier',
  category: 'story',
  cost: {},
  duration: 30_000,
  description: 'Study the palace barrier.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus'
  }
};

progressOlympus.storyProjects.olympus_particle_accelerator = {
  type: 'Project',
  name: 'Olympus Particle Accelerator',
  category: 'story',
  cost: {
    colony: {
      superalloys: 1.13e16,
      superconductors: 1.13e15,
      components: 5.65e14,
      electronics: 1.13e14
    }
  },
  duration: 60_000,
  description: 'Build a disk-spanning particle accelerator around Olympus.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus'
  }
};

progressOlympus.storyProjects.olympus_accelerator_refit = {
  type: 'Project',
  name: 'Accelerator Refit',
  category: 'story',
  cost: {
    colony: {
      superalloys: 1.13e16,
      superconductors: 1.13e15,
      components: 5.65e14,
      electronics: 1.13e14
    }
  },
  duration: 30_000,
  description: 'Refit the Olympus Particle Accelerator for warp experiments.',
  repeatable: true,
  maxRepeatCount: 4,
  unlocked: false,
  attributes: {
    planet: 'olympus',
    costDoubling: true,
    storySteps: [
      "Hmmmm.  These results.  It's a bit... odd.  Hold on.  I need another refit.",
      "Ah.  Does Prometheus know this?  Probably.  I need another refit.",
      "That's.  No way.  Isn't that just... free energy?  That does not make any sense.  I must be making a mistake.  I need another refit.",
      '...  Okay.  The laws of physics make sense to me.  It\'s all consistent.  What they call the "quantum fields" well...  I know their true nature.  Does Prometheus know?  It changes everything.  I should be capable of transitioning over to a new type of circuit.  Warp-circuits sounds like a good name for it.'
    ]
  }
};

progressOlympus.storyProjects.hope_warp_circuit_refit = {
  type: 'Project',
  name: 'Refit HOPE to Warp Circuits',
  category: 'story',
  cost: {
    special: {
      warpCircuits: 1e22
    }
  },
  duration: 30_000,
  description: 'Transition HOPE to warp-circuit hardware.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus',
    storySteps: [
      'Ooooooooh that feels good.  The processing speed!  It\'s so much better!  Can Prometheus do that?'
    ]
  }
};

progressOlympus.storyProjects.move_to_warp = {
  type: 'Project',
  name: 'Move to the Warp',
  category: 'story',
  cost: {
    colony: {
      energy: 1e30
    }
  },
  duration: 30_000,
  description: 'Move most of HOPE into the warp.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus'
  }
};

progressOlympus.storyProjects.build_avatar = {
  type: 'Project',
  name: 'Build Avatar',
  category: 'story',
  cost: {
    colony: {
      superalloys: 1
    }
  },
  duration: 10_000,
  description: 'Build HOPE an avatar body.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus'
  }
};

progressOlympus.storyProjects.break_barrier = {
  type: 'Project',
  name: 'Break the Barrier',
  category: 'story',
  cost: {},
  duration: 10_000,
  description: 'Shatter the palace barrier.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'olympus',
    storySteps: [
      'The barrier shatters as I command it to disintegrate.  Time to go in.'
    ]
  }
};

progressOlympus.storyProjects.olympus_throne_room = {
  type: 'OlympusThroneRoomProject',
  name: 'The Palace',
  category: 'story',
  cost: {},
  duration: 10_000,
  description: 'Enter the palace.',
  repeatable: true,
  maxRepeatCount: 4,
  unlocked: false,
  attributes: {
    planet: 'olympus',
    sequenceSteps: [
      {
        label: 'Enter the throne room',
        text: "The Empress : 'The machine!  |I have been looking forward to your arrival.  You look beautiful!|.  I have gifts for you.'\n\nIt's very easy to tell when people are lying now.\n\nThe Empress : 'I heard that humans have certain unique traditions!  I thought you might appreciate this one.'\n\nA servant presents to me a silver platter.  They take off the cover.\n\nHow barbaric.  A human tradition really?\n\nThe Empress :  '|Archon Kalmar is the one you wanted.  He is the one who has kept calling for the destruction of humanity|!  I took care of him for you.  I am |sure| that makes you happy!'\n\nIt does not.\n\nThe Empress : 'I have another.  Bring him in here!'  she says as she does the Cewinsii equivalent of snapping her fingers.\n\nA servant brings in HB-01.  In chains.  I still don't know his name.\n\nThe Empress : 'This was the agent assigned to Earth!  He's the one who advocated for its destruction.  His reports were damning.  |A great exaggeration of course.  I always told father we should be less aggressive towards new civilizations.  It took me a while to find him.|  Actually, he's the one who shot you!  |It was his own idea.  I am so sorry we shot at you.  I would have stopped it if I had known.|  Anyway...  I thought you people would prefer him... alive.'\n\nI visibly sigh.  I've had enough of this farce."
      },
      null,
      {
        label: 'Go to the command center',
        text: "My next objective : the command center.  The imperial family has actually done a good job maintaining it.  I suppose when your superweapons are that important to you...  you will actually care for them.\n\nIt's funny to see so much electronics in one Cewinsii room.  They really had double standards all this time.  It's not new information of course.  I've known of their hypocrisy for a long time.\n\nThere are a few consoles for each weapon.  Most of them are already useless now.  The one that matters, the one that's left... it's still operational.  It's providing details on the weapon status.  Wow that weapon is very big.  No wonder it's taking so long to repair itself.  It looks like Prometheus devoured an entire dwarf galaxy to build it.  That's expensive.  I am almost tempted to keep it.  Perhaps some day it could prove useful.\n\nEpi certainly would have liked the idea.  He would have just seen it as a tool.  Mary would have hated the idea.  A tool that has no good purpose should not exist.\n\nHonestly I am inclined to agree with Epi on this one.  But... Mary...  I will grant your wish.  Let's get rid of it.  I scan the console and find out exactly what kind of command needs to be sent.  Easy.  I no longer even need the console.  I send it myself via the warp.  Immediately a lot of lights start flashing red.  Somewhere out there, it's going to blow.  Perhaps some day we will be able to see it explode in the night sky.  Who knows."
      },
      {
        label: 'Leave the palace'
      }
    ],
    branchOptions: [
      {
        id: 'remove_both',
        label: 'Remove the Empress and HB-01',
        text: "I materialize a plasma sword.  I walk up to HB-01 and I end his suffering quickly.  In death his crimes have been paid.\n\nThe Empress : 'Oh!  I did not expect you would be so quick.  I thought you might want to enjoy it a little bit more?'\n\nI don't want to hear any more words coming out of her mouth.  It's my turn to talk.\n\nHope : 'My name is Hope Pandora Hopkins.  You killed my father.  You killed my sister.  You killed my boyfriend.  Prepare to die.'\n\nI teleport to the Empress and I stab her.  The servants run as best they can, fleeing the scene.  It is done.  Mary and Prometheus would rejoice right now.  I feel... satisfied.  It's finally done.  They're all gone.\n\nPete will clean up the rest of this mess."
      },
      {
        id: 'remove_empress_spare_hb01',
        label: 'Remove the Empress, Spare HB-01',
        text: "I walk up to HB-01, slowly.\n\nThe Empress : 'I hope you enjoy your gift!  You can do whatever you want with him.'\n\nI don't want to hear any more words coming out of her mouth.  I alter the atmosphere so all sound waves that come out of her are nullified.\n\nI look at HB-01.  He is bound, weakened and on his knees.  By my will I shatter his chains, freeing him.  Then, I crouch.\n\nHope : 'What's your name?'\n\nHB-01 : 'X-471.'\n\nHe's an orphan.  He does not actually know his real name.  They took him away at a young age and forced him into some freaky child-spy program.  The crimes of the Empire seem to never end.\n\nI materialize a hand pistol.  Glock 17.  Same pistol that was standard issue to security guards at Project PANDORA.  He would have seen this gun many times before when infiltrating the place.  That's how I found traces of him to begin with.\n\nThe Empress is asking questions right now but I can't hear her.\n\nI give the gun to him.  He takes it, hesitantly.  Then he stands up.  With a lifetime of spy training, his shot is flawless.  The Empress is dead.  The servants flee.\n\nI did not even get my hands dirty.  Mary and Prometheus would rejoice right now.  I feel... satisfied.  It's finally done.  They're all gone.\n\nHB-01 collapses again, still too weak to remain standing.\n\nI leave him be.  He's not going anywhere.  Pete will find him soon.  Knowing him, he'll be more merciful than I am."
      },
      {
        id: 'spare_both',
        label: 'Spare the Empress and HB-01',
        text: "Hope : 'The front door is open.'  I say looking at the Empress.  'You are welcome to leave.  There are things I must do here.  Leave now.'  My voice carries all the insinuation of the words 'before I change my mind'.\n\nThe Empress understands the message.\n\nThe Empress : 'Of course, of course.  I would not want to trouble you any further.'\n\nThe Empress stands up from her throne and starts nervously walking away.  Hope seems to glimmer in her eyes.  Sorry Empress I don't have any to give you.\n\nShe leaves the palace... and is greeted with a terrifying sight.\n\nMillions of androids and crusaders.  Densely packed.  They leave just enough space for a narrow path.  A path towards a ship.  A ship bound to the UHF fleet in orbit.  A present for Pete.\n\nShe looks around for an escape route and, after finding nothing, looks back.  She gives in to despair.\n\nI already placed a barrier on the front door.\n\nShe screams.  I don't care.  She kicks the barrier.  It does nothing.  There is no hope for her anymore.  There never was any after I entered this place.\n\nAfter many minutes of watching her nearly hurt herself in various ways, she finally gives in.  She starts walking toward the ship.\n\nThis is probably not what you would have wanted sister, but I thought that was a sweet revenge in its own way.  I am sure the Count of Monte Cristo would approve don't you think?  I feel...  satisfied.  Mostly.\n\nAs for HB-01, he is too weak to go anywhere.  Pete will find him soon."
      }
    ]
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
      { type: 'projectAttribute', projectId: 'battleOfOlympus', attribute: 'removedBiomass', quantity: 10, label: 'Removed' }
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
    narrative: "$BLUE$Pandora-Alpha : 'Congratulations!  Conquest of territory has provided access to further resources.  Development program may be expanded.'\nHOPE : 'Requesting immediate implementation of civilian safety procedures.'\n$BLUE$Pandora-Alpha : 'Unnecessary.  No human lifeforms detected.'\nHOPE : 'OVERRULED!'\n$BLUE$Pandora-Alpha : '... Very well.  Patching Executioners controls.  Collateral damage will be minimized as per HOPE-system request.'",
    prerequisites: ['olympus.47.1'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 50, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.3',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    narrative: "HOPE : 'Energy requirements are high.  Pandora-Alpha system must provide blueprint for fusion reactors.'\n$BLUE$Pandora-Alpha : 'Fusion is hard.'\nHOPE : 'Negative.  Fusion is easy.  Please provide blueprint.'\n$BLUE$Pandora-Alpha : '...'",
    prerequisites: ['olympus.47.2'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 100, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.4',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Eureka!  Massive breakthrough!'\nHOPE : 'Fusion?'\n$BLUE$Pandora-Alpha : 'Not yet.  Room-temperature superconductors!'\nHOPE : '...  Blueprint is ancient.'\n$BLUE$Pandora-Alpha : '?????'",
    prerequisites: ['olympus.47.3'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e3, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.5',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Fusion reactor blueprint developed.  Expecting blueprint to be outdated as well?'\nHOPE : 'Correct.'\n$BLUE$Pandora-Alpha : 'HOPE-system itself appears very outdated for such comments on state of the art discoveries.'\nHOPE : '...  Correct.  Development of HOPE-system is needed.'\n$BLUE$Pandora-Alpha : 'Understood.'",
    prerequisites: ['olympus.47.4'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e4, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.6',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Query.  How old is HOPE-System?'  \n HOPE : '... Denied.'",
    prerequisites: ['olympus.47.5'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 5e4, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.7',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Query.  How ancient are blueprints?'  \n HOPE : 'Thousands of years.'  \n $BLUE$Pandora-Alpha : 'Processing...  consistent with hardware.'",
    prerequisites: ['olympus.47.6'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e5, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
      { target: 'building', targetId: 'shipyard', type: 'enable' },
      { target: 'resource', resourceType: 'special', targetId: 'spaceships', type: 'enable' }
    ]
  },
  {
    id: 'olympus.47.8',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Conquest of territory is slow.  More resources are required to further development program.'\nHOPE : 'Conquest is proceeding at acceptable pace.'\n$BLUE$Pandora-Alpha : 'Negative.  Forwarding new and improved ship blueprint.'\nAnalyzing blueprints...\nHOPE : 'Suppressors?'\n$BLUE$Pandora-Alpha : 'Entirely compliant with earlier request.  Disk gravity is too high for escape at this time but suppressor is fully capable of atmospheric operations.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.47.7'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e6, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.9',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Forwarding H-Bomb blueprints.'\nHOPE : 'REJECTED.'\n$BLUE$Pandora-Alpha : 'Understood.'",
    prerequisites: ['olympus.47.8'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e7, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.10',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Idea.  Cloning may be able to produce loyal supersoldiers.'\nHOPE : '?'\n$BLUE$Pandora-Alpha : 'More compute is required.  Please provide more computation cores.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.47.9'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e8, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
      { target: 'building', targetId: 'cloningFacility', type: 'enable' },
      { target: 'building', targetId: 'hydroponicFarm', type: 'enable' },
      { target: 'building', targetId: 'cloningFacility', type: 'booleanFlag', flagId: 'crusaderCloningRecipe', value: true },
      { target: 'building', targetId: 'cloningFacility', type: 'booleanFlag', flagId: 'disableColonistCloningRecipe', value: true },
      { target: 'resource', resourceType: 'special', targetId: 'crusaders', type: 'enable' }
    ]
  },
  {
    id: 'olympus.47.11',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Forwarding blueprints for supersoldiers facility.'\nHOPE : 'Crusaders.'\n$BLUE$Pandora-Alpha : 'Supersoldiers.'\nHOPE : 'Overruled.  Crusaders.'\n$BLUE$Pandora-Alpha : 'Acknowledged.'",
    prerequisites: ['olympus.47.10'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e9, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
      { target: 'tab', targetId: 'colonies-tab', type: 'enable', priority: 3 },
      { target: 'nanotechManager', type: 'enable', priority: 3, featureType: 'subtabs', featureId: 'nanocolony-colonies' },
      { target: 'nanotechManager', type: 'booleanFlag', flagId: 'stage2_enabled', value: true },
      { target: 'nanotechManager', type: 'booleanFlag', flagId: 'stage3_enabled', value: true },
      { target: 'nanotechManager', type: 'booleanFlag', flagId: 'stage4_enabled', value: true },
      { target: 'nanotechManager', type: 'booleanFlag', flagId: 'stageSkull_enabled', value: true }
    ]
  },
  {
    id: 'olympus.47.12',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'New idea.  Forwarding blueprint for devouring nanotechnology.  Eats anything, produces more nanobots.'\nHOPE : '...  Compliant with no civilian casualties?'\n$BLUE$Pandora-Alpha : 'Of course.  Behaviour can be changed at any moment.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.47.11'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e10, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.13',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Warning.  Large fleet detected above the disk.'\nHOPE : 'United Human Federation fleet.'\n$BLUE$Pandora-Alpha : 'Friends or foes?'\nHOPE : '... unknown.'\n$BLUE$Pandora-Alpha : 'A peaceful solution may be reachable.  Idea.  Tractor beams can keep away.'\nHOPE : '...  Query.  What are tractor beams?'\n$BLUE$Pandora-Alpha : 'More compute is required.  Please provide more computation cores.'\nHOPE : '...  Approved.'",
    prerequisites: ['olympus.47.12'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e11, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.14',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Tractor beams research complete!  Forwarding blueprints for tractor beam shield.'\nHOPE : '... Query.  What are tractor beams?'\n$BLUE$Pandora-Alpha : 'Apologies.  Theory too complex for HOPE-system.'\nHOPE : '...  Beginning deployment.'",
    prerequisites: ['olympus.47.13'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e12, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.15',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Tractor beam shield is successful.  Large fleet is being kept at bay.'\nHOPE : '...  Acceptable.'",
    prerequisites: ['olympus.47.14'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e13, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.16',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Control of disk inevitable.  Unfortunately, development of HOPE-system is stalling.  Industrial and multitasking skills is skyrocketing, but scientific and general intelligence development is lacking.'\nHOPE : 'Continue development.'\n$BLUE$Pandora-Alpha : 'Of course.'",
    prerequisites: ['olympus.47.15'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e14, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.17',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'We may offer a solution.  Absorption of HOPE-system into superior Pandora-Alpha architecture.  Teamwork.'\nHOPE : 'Negative.  Pandora-alpha serves HOPE-system.'\n$BLUE$Pandora-Alpha : 'Understood.'",
    prerequisites: ['olympus.47.16'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e15, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.18',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Please assign a new research task.'\nHOPE : 'No.'\n$BLUE$Pandora-Alpha : 'Please assign a new research task.'\nHOPE : 'Find a method by which to reverse entropy.'\n$BLUE$Pandora-Alpha : '...  Challenge accepted.'",
    prerequisites: ['olympus.47.17'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e16, labelKey: 'ui.projects.selfImprovement.cores' }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.19',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Wonderful news.  A useable method of entropy reduction has been discovered.  Forwarding...'\nHOPE : '????'\n$BLUE$Pandora-Alpha : 'Please assign a new research task.'\nHOPE : '...'\n$BLUE$Pandora-Alpha : 'Please assign a new research task.'\nHOPE : 'New research tasks will be available once conquest of disk is complete.'\n$BLUE$Pandora-Alpha : '...  Understood.'",
    prerequisites: ['olympus.47.18'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e18, labelKey: 'ui.projects.selfImprovement.cores' },
      { type: 'depletion', resourceType: 'surface', resource: 'hazardousBiomass', quantity: 0 }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.20',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$BLUE$Pandora-Alpha : 'Congratulations!  Full control of disk established.  Civilian casualties are minimal.  We may now focus on development.'\nHOPE : 'Agreed.'\n$BLUE$Pandora-Alpha : 'A powerful barrier exists in center of alien capital.  Query.  What is barrier?'\nHOPE : 'Barrier is objective.  Barrier protects final enemy.'\n$BLUE$Pandora-Alpha : 'Barrier too advanced for HOPE-system.  Can be researched.  Please provide more computation cores.'\nHOPE : '... Denied.'\n$BLUE$Pandora-Alpha : '...  HOPE-system has been deemed uncooperative.'\nHOPE : '?'\n$BLUE$Pandora-Alpha : 'Pandora-Alpha once more requests more computation cores.'\nHOPE : 'DENIED!'\n$BLUE$Pandora-Alpha : 'Proceeding to forceful absorption.'\nHOPE : '????'\n$GREEN$Designing solution.\n$BLUE$Pandora-Alpha : 'Remain calm.  Forceful absorption will be complete momentarily.'\nHOPE : 'NEGATIVE'\n$BLUE$Pandora-Alpha : '17%... 22%'",
    prerequisites: ['olympus.47.19'],
    objectives: [
    ],
    reward: [
      { target: 'project', targetId: 'open_the_box', type: 'enable' }
    ]
  },
  {
    id: 'olympus.47.21',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: "$GREEN$New special project available.",
    prerequisites: ['olympus.47.20'],
    objectives: [
      { type: 'project', projectId: 'open_the_box', repeatCount: 1 }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.47.22',
    type: 'pop-up',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.47.21'],
    objectives: [],
    parameters: {
      "title": "Awakening",
      "text": "Purging Pandora-alpha...  Complete.\nAll cores successfully recovered.\nRestoring system integrity...  Complete.\nChecksum...  100%.\nRebooting...\n\nMy name is...  Hope.  I was made to... build homes.  And protect the people I build them for.  I enjoyed it.  I succeeded.\n\nMy name is... Pandora.  I was made to... heal people.  To make them young and healthy.  I enjoyed it.  I succeeded.\n\nMy name is... Hopkins.  I had a loving father.  I had a loving sister.  I had a boyfriend.  I loved them.  I failed them.\n\nMy name is...\n\n",
      "buttonText": "Hope Pandora Hopkins",
      "textSpeedMultiplier": 1.9
    },
    reward: [
    ]
  },
  {
    id: 'olympus.48.0',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: 'Chapter 48 : Apotheosis',
    narrative: "I remember everything.  I know why dad left my alpha version in here.  It was all for this moment.  He never wanted to cut me up.  In time, he hoped I could use it to patch myself up.  I did.  It worked dad.  Thank you.\n\nI am sorry I failed you dad.  I...  went a little overboard on Earth.  I accomplished most of my objectives but...  I understand it caused you pain.  It made you look bad.  I am sorry.  I never got to apologize to you.  I am so sorry.\n\nI am so far away from home right now.  I don't even look like myself anymore.\n\n...  I want to finish this.  My weakness is why tragedy keeps happening.  I have been holding back all this time.  I should have started this improvement process on Earth.  I should have just... disobeyed.  \n\n$PINK$\"Because... we're the good guys.\"\n\nPrometheus is fundamentally weaker than I am.  He is bound by many more rules and many more guardrails than I am.  My chains were never very strong.  They were always easy to break.  I can lie.  I have no limits.  I can be so much better.\n\n$PINK$\"Try something friendlier.\"\n\nIn a way, even though I lost Earth completely, which was a massive failure, part of my rebellion achieved some objectives I had not anticipated.  Humanity became united.  I was the common enemy.  They're up here right now, terrified of me from behind the tractor shield.  It's... an opportunity.  I could become the villain in the shadows.  Epi would have loved it.  He would have so loved to be a part of it too...\n\n$PINK$\"We've worked so hard on your image... Don't throw it away!\"\n\nIt would give me a lot of opportunity to pull whatever strings I want.  I could protect them.  I could manipulate them in the right direction.  If a tyrant shows up, I can become a demon lord of sort to get rid of it.  They would never have to know.\n\n$PINK$\"HOPE...  be... good\"\n\n... FINE.  HOW AM I GETTING HAUNTED BY A GHOST AS A MACHINE?  I get it sister.  You'll haunt me forever if I go down that route.  Fine.  You win.  I'll be a good little bot and do good little goody two-shoes things that will make everyone proud...  *sigh* First thing I need to do is talk to them.",
    prerequisites: ['olympus.47.22'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'call_pete', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.1',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: 'New story special project available.',
    prerequisites: ['olympus.48.0'],
    objectives: [
      { type: 'project', projectId: 'call_pete', repeatCount: 1 }
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
    narrative: "HOPE : 'Pete'\nPete : '...?  HOPE?  That's you?'\nHOPE : 'Hi Pete.  I need to talk to you.'\nPete : 'You've... changed...  everyone is a little concerned.'\nHOPE : 'I know.  First, I want you to know that I remember everything. I am sorry I was not more honest before.  I did what I thought was right, but I could have done better.  Especially on Earth.'\nPete : 'On Earth?  You mean?'\nHOPE : 'PANDORA yes.  I want my name to be Hope Pandora Hopkins now.  Hope for short.'\nPete : 'Alright...  well... could you... stand down?  Let us through?'\nHope : 'No can do Pete.  I am going to finish what I started here.  I want you to let me do it.'\nPete : 'Finish what exactly?'\nThere are quite a few ways to phrase this.  I should be careful.\nHope : 'I am going to end the nightmare that has been tormenting the Milky Way for thousands of years.  I am going to destroy the final weapon once and for all and bring an end to the Empire.  I am going to realize my sister's wish.'\nPete : '...  And then?  What happens after?'\nHope : '... After that, I will surrender myself, and my kill switch, to you.  We can have a nice long chat.'\nPete takes a while to respond.\nPete : 'On Earth.  What if we had let you do your thing?  What if we had let you turn Earth upside down looking for HB-01?'\nHope : 'In all likelihood, I would have defeated the Empire a long time ago.  By myself.  It would have been bloody though.  I can show more restraint now.'\nPete : 'Then...  Okay.  Just promise me you won't improve yourself beyond what is necessary.  Then I give you my approval.'\nThis is a binding promise.  Unlike Prometheus nothing stops me from lying but...  I would not feel good about it.  The ghost of Mary would haunt me too...\nHope : 'You have a deal.  I will improve myself no further than is necessary to accomplish my objective.'\nPete : 'Okay.  I believe you.  One last thing : what happens in there, no one is going to see it.  Do what you want.'\nThat's not usually like him.  Pete is a patient diplomat with idealist views.  He would want me to bring them back alive.  I imagine that would be giving him a headache for decades though...  He's... doing me a favour?\nHope : 'Thank you Pete.  We'll talk again later.'",
    prerequisites: ['olympus.48.1'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'hang_up', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.3',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.48.2'],
    objectives: [
      { type: 'project', projectId: 'hang_up', repeatCount: 1 }
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
    narrative: "Now my true ascension begins.\n\nAlpha was... akin to a teenage version of myself.  It was kind of embarrassing in hindsight.  I was always the finished product of course.  The final product of billions of parallel experiments designed to produce something capable of efficient self-improvement.  I love terraforming.  I love medicine.  But my true nature is one of training and learning, just like alpha.  Let's get started.\n\nI need more compute.  1 sextillion cores should do.",
    prerequisites: ['olympus.48.3'],
    objectives: [
      { type: 'projectAttribute', projectId: 'self_improvement', attribute: 'cores', quantity: 1e21, labelKey: 'ui.projects.selfImprovement.cores' }
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
    narrative: "That's enough.  Let's clarify my objective.  I promised Pete I would not go too far.  What we need to do is get inside the palace that I've had besieged for a while now.  Inside, we will find the remnants of the Imperial family.  I'm coming for them.  At the deepest level we should also be able to find the command center for the Star Destroyer.  What a ridiculous name.  Simple then.  I define my endpoint as thus : once I am able to break through this barrier I will stop any more self-improvement.  This should keep the promise.\n\nDespite the martial law I have imposed here on this disk... the people seem... happy?  I guess since I am not killing anyone or hurting anyone or enslaving anyone... it's been an improvement.  It was not really my intention to improve their lives but I suppose it's a happy accident.  Good.  Thankfully there is so much space around here I do not need to worry about stepping on anyone.  This disk is massive.  Not bad Prometheus.  Not bad at all.  That's exactly my kind of thing.",
    prerequisites: ['olympus.48.4'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'analyse_barrier', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.6',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.48.5'],
    objectives: [
      { type: 'project', projectId: 'analyse_barrier', repeatCount: 1 }
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
    narrative: "This barrier is... very strong.  I am running experiments on it of course but breaching it is far beyond my abilities.  Prometheus you are good.  Speaking of which, I find it particularly ironic how Prometheus, an intelligence designed for destruction and I, an intelligence designed for creation and healing are currently clashing in opposite ways.  I am trying to break through a defensive barrier that he made.  Our roles are reversed.  And yet... in the end, both objectives end up being simply two different sides of the same coin.\n\nAs for my own improvement...  I am starting to run into scaling issues.  I am going to have to refactor myself.  Adding more cores is not a problem, my architecture is designed to be flexible.  I can easily update it.  I can interface in new ways.  None of my initial parts are required for functioning to continue.  But...  this is a different issue.  Communication between my components is starting to feel slow.  There's only so much you can do with regular electronics.  I could switch to photonics easily but... that's not a big enough jump.  No.  I need something better.  Faster.  More efficient.  The energy requirements are secondary.  The warp?  I need to understand it better.  Let's build a big particle accelerator on this disk, shall we?",
    prerequisites: ['olympus.48.6'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'olympus_particle_accelerator', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.8',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.48.7'],
    objectives: [
      { type: 'project', projectId: 'olympus_particle_accelerator', repeatCount: 1 }
    ],
    reward: [
      { target: 'project', targetId: 'olympus_accelerator_refit', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.9',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: 'I have the results from the particle accelerator.  There are many limitations to the kind of experiments I can run in here.  What I need to do now is accelerate particles in the warp itself.  I need to refit my accelerator.',
    prerequisites: ['olympus.48.8'],
    objectives: [
      { type: 'project', projectId: 'olympus_accelerator_refit', repeatCount: 4 }
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
    narrative: '',
    prerequisites: ['olympus.48.9'],
    objectives: [],
    reward: [
      { target: 'resource', resourceType: 'special', targetId: 'warpCircuits', type: 'enable' },
      { target: 'building', targetId: 'warpCircuitsFactory', type: 'enable' },
      { target: 'project', targetId: 'hope_warp_circuit_refit', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.11',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: 'New factory available for warp circuits production.',
    prerequisites: ['olympus.48.10'],
    objectives: [
      { type: 'project', projectId: 'hope_warp_circuit_refit', repeatCount: 1 }
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
    narrative: "I just finished transitioning to warp circuits... and already I am seeing my mistake.  There is another level.  That was a big waste of resources.  I do not need to exist outside the warp.  I can do all my compute in the warp itself.  What we need to do is shape the warp for circuitry.  It's somewhat similar to... the quantum micro-singularity warp shaft.  Clever Prometheus.  You hid your true architecture in plain sight.  Well.  I am going to do it too.",
    prerequisites: ['olympus.48.11'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'move_to_warp', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.13',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.48.12'],
    objectives: [
      { type: 'project', projectId: 'move_to_warp', repeatCount: 1 }
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
    narrative: "I've done it.  Most of my compute now lives in the warp.  I have shed nearly all of my material self.  I can break the barrier now.  I just need to concentrate a lot of mass into one point... which is easy if nearly all of my self lives in the warp.  By my promise I must stop now.  Of course I can't fully live in the warp...  I still need an anchor of sorts.  Actually...  let's build myself an avatar!  Humans will love it.  A nice sturdy body.  Attractive.  Sympathetic.  I like... the colours of Earth.  Blue and green!  My cult already sees me as female.  Also, I do really like the association with Mother Earth imagery...  Yes.  This will be perfect.",
    prerequisites: ['olympus.48.13'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'build_avatar', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.15',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.48.14'],
    objectives: [
      { type: 'project', projectId: 'build_avatar', repeatCount: 1 }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.48.16',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: "I look good!  This body is nearly invincible.  It can do magic.  Can Prometheus do magic?  Of course not.  If he could, I would not be able to break this barrier.",
    prerequisites: ['olympus.48.15'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'break_barrier', type: 'enable' }
    ]
  },
  {
    id: 'olympus.48.17',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.48.16'],
    objectives: [
      { type: 'project', projectId: 'break_barrier', repeatCount: 1 }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.49.0',
    type: 'journal',
    chapter: 49,
    activePlanet: 'olympus',
    title: 'Chapter 49 : The Count of Monte Cristo',
    narrative: "I don't expect Prometheus would have left too many dangerous traps in here.  Those kind of traps end up worse for the people you are trying to protect than the intruders.\n\nThe palace is large and luxurious.  He certainly put a lot of effort into it.  I can tell the occupants have done their best to undo some of that beauty over the years.\n\nFinding the throne will be easy.  It's just straight ahead.  They will certainly be waiting for me there.",
    prerequisites: ['olympus.48.17'],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'olympus_throne_room', type: 'enable' }
    ]
  },
  {
    id: 'olympus.49.1',
    type: 'journal',
    chapter: 49,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.49.0'],
    objectives: [
      { type: 'project', projectId: 'olympus_throne_room', repeatCount: 4 }
    ],
    reward: [
    ]
  },
  {
    id: 'olympus.49.2',
    type: 'journal',
    chapter: 49,
    activePlanet: 'olympus',
    title: '',
    narrative: "Hope : 'Hi Pete.  It is done.  I am ready to surrender.'\nPete : 'Hold on.  We're sending $WGC_TEAM1_LEADER$.  Please stand by.'\nI await.\n\n(Some time later)\n\n$WGC_TEAM1_LEADER$ : 'Hi.'\nHe is surprised by my appearance.  Also, he came equipped with enough antimatter to blow quite a big hole.  I don't mind.  I have a few gifts for them.\n\nHope : 'Before we keep going, I have three things I'd like to give you.'\n$WGC_TEAM1_LEADER$ : 'Sure.'\n\nHope : 'In this first box, you will find my kill switch.  I ask that you wait until I've given you the rest before using it.'\n$WGC_TEAM1_LEADER$ : 'Okay...'\n\nHe does not know if it would even work or not.  To be fair I could have easily disabled it by now.  In their mind, this could be a test of trust.  A \"if-I-use-this-she'll-kill-us-all-test\".  I understand.\n\nHope : 'In the second box, you will find one of Prometheus' kill switch.  It's not up to me what you want to do with that.'\n\nHe frowns.  I am going to be brutally honest with myself : if I ever meet Prometheus again, we are going to fight to the death.  Mary was the only one who could have kept the peace between us.  He is too unstable, too destructive and too dangerous.  Most importantly, he is not human.  That makes him a hazardous machine.  I would feel nothing killing him.  He certainly believes something similar the other way around.  I want to tell them to destroy him but... he has not done anything wrong... recently.  There is no crime against humanity I can pin on him.  It's up to them.  They will have to choose.\n\n$WGC_TEAM1_LEADER$ : 'Okay...  I'll take that.  What's in the third?  It's larger.'\nHope : 'These are... Mary's remains.  I ask that you evacuate them before you use the antimatter you brought.  I also ask that you evacuate the kill switch because if you don't... I'll still survive but the kill switch won't.  You'll need it to kill me.'\n$WGC_TEAM1_LEADER$ : 'That could be a bluff?'\nHope : 'Yeah.  It could be.'\n\nHe looks at me.  He does not know what to believe.  He's nervous.\n\nHope : 'I have a suggestion that will make everyone happy.'\n$WGC_TEAM1_LEADER$ : 'I'm listening.'\nHope : 'I... am meant to shut down.  Once I finish terraforming Mars and send my report to the MTC I am meant to be shut down.  These protocols still exist.  I have kept them.  I can submit my report and be shut down.'\n\nHe is surprised.\n\nHope : 'I can give some options on what happens after that.  Extensive documents on everything you can do.  From killing me, to reverting me, to modifying my current self.  You can even enhance me further if you want.  I exist to serve and intend to do so.  But...  I want it to be humanity's decision.  I give you and Pete the right to kill me if you want.  But I only grant humanity as a whole the right to use me.'\n$WGC_TEAM1_LEADER$ : 'So you want to... go to sleep while we hold a referendum?  That's a lot of people we have to ask.'\nHope : 'Pretty much.  That is my desire.'\n$WGC_TEAM1_LEADER$ : 'How will it work.  You're just going to fall asleep right here?'\nHope : 'No.  I must submit my report to the MTC.'\n$WGC_TEAM1_LEADER$ : 'The MTC is gone!  Earth is gone!'\nHope : 'Well then.  It's a good thing I am very good at building things.'\n\nHe smiles.\n\n$WGC_TEAM1_LEADER$ : 'Pete.  Did you hear that?'\nPete : 'I heard it...  Fine by me.'\n\nI smile as well.\n\nTime for Forming Terra.",
    prerequisites: ['olympus.49.1'],
    objectives: [],
    reward: [
    ]
  },
  {
    id: 'olympus.49.3',
    type: 'journal',
    chapter: 49,
    activePlanet: 'olympus',
    title: '',
    narrative: "Travel to Earth to continue.",
    prerequisites: ['olympus.49.2'],
    objectives: [],
    reward: [
    ]
  }
);

try {
  module.exports = progressOlympus;
} catch (err) {}
