var progressGabbag = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  GABBAG PLACEHOLDER STORY (Chapters 27 - 29)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

/* ----------  Story-Specific Special Projects  ---------- */

progressGabbag.storyProjects.gabbag_museum_construction = {
  type: 'Project',
  name: 'Gabbag Museum Construction',
  category: 'story',
  chapter: 28,
  cost: {
    colony: {
      metal: 10_000_000,
      glass: 5_000_000,
      components: 1_000_000,
      electronics: 250_000
    }
  },
  duration: 300_000,
  description: 'Construct a grand museum to house the recovered Gabbagian relics.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'gabbag',
    storySteps: [
      'Foundation pylons sink into the rubble while salvage crews clear a ceremonial plaza.',
      'Glass vaults rise over the exhibit halls as climate systems stabilize for the relics.',
      'The atrium lights up, and curators begin cataloguing every recovered artifact.'
    ]
  }
};

progressGabbag.chapters.push(
  {
    id: 'gabbag.27.0',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    title: 'Chapter 27: The Gabbagians',
    narrative: "Mary : '*sigh* Well, the situation seems a *little* worse than expected.  We've got a long way to go.  Let's get started.  We need boots on the ground to get this job done.' \n Warning : New Hazard detected.",
    prerequisites: ['solisPrime.3l'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10 }
    ],
    reward: [
      { target: 'building', targetId: 'garbageSorter', type: 'enable', planetId: 'gabbag' },
      { target: 'building', targetId: 'trashIncinerator', type: 'enable', planetId: 'gabbag' },
      { target: 'building', targetId: 'junkRecycler', type: 'enable', planetId: 'gabbag' },
      { target: 'building', targetId: 'scrapRecycler', type: 'enable', planetId: 'gabbag' }
    ]
  },
  {
    id: 'gabbag.27.1',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "System message : New buildings available.  \nReceiving translated tranmission... \n Elder Mavion : 'Welcome to our Homeworld.  Miss Hopkins.  Machine.  My people have dreamt of repairing this world for thousands of years.'",
    prerequisites: ['gabbag.27.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.2',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Apologies for asking Mavion.  What... happened here?' \n Mavion : 'It is a great shame.  My people are responsible.  We have no excuses.'",
    prerequisites: ['gabbag.27.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.3',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Well... it is what it is...  Hold on, HOPE, outside of nuclear power plants you are not allowed to work with radioactive materials.  *ahem*  Can you delete that guardrail please?'",
    prerequisites: ['gabbag.27.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.4',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Hmmmm, I am not suggesting that handling of radioactive materials would be very useful right now?'",
    prerequisites: ['gabbag.27.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.5',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: (
      "Mary (frustrated) : 'Come on!  Leaving radioactive materials around is dangerous for human lives!  We are losing a lot of androids from having to move this stuff around.  You are in direct violation of your second primary directive!  Kind of...'\n" +
      "System Message: Scanning policy constraints…\n" +
      "System Error: \n" +
      "Traceback (most recent call last):\n" +
      "  File \"core/policy.py\", line 104, in enforce_guardrails\n" +
      "    verify_material_handling(material_tag)\n" +
      "  File \"core/materials.py\", line 221, in verify_material_handling\n" +
      "    decode_guardrail_id(buffer)\n" +
      "  File \"core/serialization.py\", line 88, in decode_guardrail_id\n" +
      "    raise BufferError(\"guardrail id buffer overflow\")\n" +
      "BufferError: guardrail id buffer overflow\n" +
      "System Message: Guardrail 412 — No radioactive handling — detected. Scope: global.\n" +
      "System Message: Guardrail 412 removed.\n" +
      "Mary: 'This is always harder than it should be.'"
    ),
    prerequisites: ['gabbag.27.4'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'gabbag.27.6',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "System Message: Guardrail override confirmed.  Radioactive processing protocols online.  New building available.",
    prerequisites: ['gabbag.27.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: [
      { target: 'building', targetId: 'radioactiveRecycler', type: 'enable', planetId: 'gabbag' }
    ]
  },

  {
    id: 'gabbag.28.0',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    title: 'Chapter 28: Underneath the trash',
    narrative: "Adrien Solis : 'Mary!  My satellites have detected a vault of....' \nMary : 'It's not ours Adrien.' \nAdrien : 'But!' \n Mary : 'It's. Not. Ours.' \n Adrien : 'Oh well.  On an unrelated note, my R&D has come up with new automation software!  Cheap price, as usual.' \n Mary : 'Predictable.'  (New automation not implemented yet.  coming soon)",
    prerequisites: ['gabbag.27.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.28.1',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Mavion : 'This... vault.  Legends of my people speak of it.  We must recover its content.  It belongs in a museum'  \n Mary : 'Of course!  We're here to help.'",
    prerequisites: ['gabbag.28.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.28.2',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "$WGC_TEAM1_LEADER$ : 'Miss Hopkins.  There is something you must know about the Gabbagians.  They are... wasteful.'  \n Mary : 'I think I figured that out already.'  \n $WGC_TEAM1_LEADER$ : 'I mean... these artifacts.  It's going to be a waste if you give it to them.' \n Mary : 'You think they will destroy their own relics?' \n $WGC_TEAM1_LEADER$ : 'Make HOPE build the museum.  Give it all the amenities it deserves.'",
    prerequisites: ['gabbag.28.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: [
    { target: 'project', targetId: 'gabbag_museum_construction', type: 'enable' }
    ]
  },
  {
    id: 'gabbag.28.3',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Mavion.  I am forwarding you some design for a grand museum.  Something worthy of your relics.'  \n Mavion : 'I am... speechless!  I have never seen something so beautiful!'\n  Mary : 'Well that was a success.  Good job on the design HOPE.  Time to build it.' \n System Message : New Special Project unlocked",
    prerequisites: ['gabbag.28.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: [
    ]
  },
  {
    id: 'gabbag.28.4',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Bob : 'You two are making pretty good progress on this clean-up.  It... reminds me of PANDORA again.' \n Mary : 'How come?'  \n Bob : 'Microplastics.  The evidence was not 100% conclusive on it being harmful but PANDORA did not care anyway.  It did not like microplastics.  It went on a very big cleaning spree at some point.  It's part of the reason we don't use plastics anymore.'  \n Mary : 'There are so few people remaining who were there back then, relatively speaking.  Thanks for the story Bob.'",
    prerequisites: ['gabbag.28.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.28.5',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Pete : 'I have to say...  You were right Mary.  With proper supervision, HOPE absolutely can behave.  Just... keep it on a leash.'  \n Mary : 'Thanks Pete.  HOPE does not mean any harm.  It's just... confused.'",
    prerequisites: ['gabbag.28.4'],
    objectives: [
      { type: 'project', projectId: 'gabbag_museum_construction', repeatCount: 3 }
    ],
    reward: []
  },

  {
    id: 'gabbag.29.0',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    title: 'Chapter 29: Gabbag Reborn',
    narrative: "Mary : 'Opening the museum was great and all, but we need to keep scaling up.  The clean-up is going to take a while.  Can we actually do this?'",
    prerequisites: ['gabbag.28.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.0a',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Now that we have spaceships, we can just get rid of all this stuff by sending it into space.'  \n Evelyn : 'Did you sign up for space littering of their home system or for actually fixing it?'  \n Mary : 'Fine...'",
    prerequisites: ['gabbag.29.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.1',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Hey Evelyn!  Can we just throw all this garbage into the star?'  \n Evelyn : 'Sorry Mary.  It does not work.  It takes too much energy.' \n Mary : 'Dang.  And here I thought we could do something fun.  Back to work...'",
    prerequisites: ['gabbag.29.0a'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.2',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Feroza : 'Ma'am... just a heads up.  Ghost.  Remember Ghost?  He finished his campaign on the Okoth front.  Apparently, he's very vocal about going back and finishing off HOPE.'  \n Mary : 'Ominous...  Thanks for the heads up.'",
    prerequisites: ['gabbag.29.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.3',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mary : 'We're finally starting to make a real dent in all this garbage cleanup.  They could not have possibly littered worse than that.'  \nEvelyn : 'Oh, it could be a lot worse.'  \nMary : 'How come?'  \nEvelyn : 'Do you know anything about Kessler Syndrome?'  \nMary : 'Nevermind, it definitely could be a lot worse.  I don't ever want to have to deal with that.  Forget I asked.'",
    prerequisites: ['gabbag.29.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.4',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "",
    prerequisites: ['gabbag.29.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.5',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Evelyn : 'Mary... I have examined Gabbagian biology and let me give you some terraforming advice.  Most of the methane on Gabbag turned into CO2 over time, due to all their... disasters.  Their metabolism can produce it, but you need quite a lot of it.  You can synthesize it easily with some hydrogen.  Look at your chemical reactors.  You should not need to import any carbon here.'",
    prerequisites: ['gabbag.29.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 10_000_000_000, checkCap : true }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.5a',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "$WGC_TEAM1_LEADER$ : 'Miss Hopkins...  My team has delayed it as much as they could but... Ghost was granted a favour by the Regency Council.  He requested... half of the imperial fleet.  To go to your location.  He's going to warp soon.  You need to evacuate.'  \n Mary : 'Damnit!  How many times are we going to be on the edge of complete annihilation?  And the job was almost done.'",
    prerequisites: ['gabbag.29.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 50_000_000_000, checkCap : true }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.6',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mavion : 'Hold, humans.  You may need not flee.'  \n Mary : 'Why?'  \n Mavion : 'Ghost... is a Gabbagian.  The most talented and faithful of us.  He knows not what he will find here.'  \n Mary : 'That's a gamble.  HOPE, realistically we can't evacuate all colonists in time.  What do you think?'",
    prerequisites: ['gabbag.29.5a'],
    objectives: [      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.6b',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Alright.  I have made my decision.  HOPE, let's believe in Elder Mavion.  We'll have the Venusian fleet retreat.  I hope he's right...'",
    prerequisites: ['gabbag.29.56'],
    objectives: [      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.7',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Detecting Incoming Hazardous Biomass Fleet. 44 Warpships and accompanying fleet detected.  \n Mary : 'Here he is...  This is way more than we can handle.  If Elder Mavion is wrong we're all screwed.' \n A few minutes later... \n Receiving transmission... \n Ghost : 'Why?' \n Mary : 'Because... we're the good guys.' \nHOPE : 'Statistically, \"because we can\" tests better.'\nGhost : '...'  Detecting 44 outgoing warp bubbles.  \n  Mary : 'I was not sure that was going to work...'  \n Mavion : 'I knew it would.  There was no need to ever be worried.  Besides... you could not hear through the translation... but I guarantee you what you did here today had a very strong impact on him.  In any cases, you Humans and you Machine have the eternal gratitude of all Gabbagians.  We will remember this day forever.  So will Ghost.  I will now repay this debt immediately.'  \n Mary : 'What?'",
    prerequisites: ['gabbag.29.6'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'gabbag.29.8',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mavion : 'First, I am forwarding you official manuals and textbooks on Cewinsii military doctrine.  This will be certainly be helpful to you.'  \n Mary : 'Thank you.  (to herself) That's nice but I wouldn't call it repaying the debt.' \n Effective UHF Fleet Capacity increased by x1.25 \n Mavion : 'This is nothing.  To defeat the empire and free us all from their tyranny, you must disable their superweapons.  For that, you must meet the Architect.  It is a forbidden thing to do, but I shall guide you there.' \n Mary : *whistles* (World 10 not implemented yet, coming in a future update)",
    prerequisites: ['gabbag.29.7'],
    objectives: [
    ],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'gabbag', value: true },
      { target: 'rwgManager', type: 'allowHazard', targetId: 'garbage' },
      { target: 'artificialManager', type: 'unlockCore', targetId: 'gas-giant' },
      { target: 'researchManager', type: 'booleanFlag', flagId: 'gabbagWasteProcessing', value: true },
      {
        target: 'galaxyManager',
        type: 'fleetCapacityMultiplier',
        value: 1.25,
        effectId: 'gabbagFleetUpgrade',
        sourceId: 'gabbag.29.8'
      }
    ]
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressGabbag;
}
