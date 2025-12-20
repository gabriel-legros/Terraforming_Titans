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
  maxRepeatCount: 1,
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
    narrative: "Mary : *sigh* Well, the situation seems a *little* worse than expected.  We've got a long way to go.  Let's get started.  We need boots on the ground to get this job done.",
    prerequisites: ['impossible3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10 }
    ],
    reward: []
  },
  {
    id: 'gabbag.27.1',
    type: 'journal',
    chapter: 27,
    activePlanet: 'gabbag',
    narrative: "Receiving translated tranmission... \n Mavion : 'Welcome to our Homeworld.  Miss Hopkins.  Machine.  My people have dreamt of repairing this world for thousands of years.'",
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
    narrative: "Mary : 'Well... it is what it is...  Hold on, HOPE you are not allowed to work with radioactive material.  *ahem*  Can you delete that guardrail please?'",
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
    narrative: "Mary (frustrated) : 'Come on!  Leaving radioactive materials around is dangerous for human lives!  You are in direct violation of your second primary directive!  Kind of...'  \n ",
    prerequisites: ['gabbag.27.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },

  {
    id: 'gabbag.28.0',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    title: 'Chapter 28: Underneath the trash',
    narrative: "Adrien Solis : 'Mary!  My satellites have detected a vault of....' \nMary : 'It's not ours Adrien.' \nAdrien : 'But!' \n Mary : 'It's. Not. Ours.' \n Adrien : 'Oh well.  On an unrelated note, my R&D has come up with new automation software!  Cheap price, as usual.' \n Mary : 'Predictable.'",
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
    narrative: "Mavion : 'This... vault.  Legends of my people speak of it.  We must recover its content.  It belongs in a museum'  \n Mary : 'Let's be nice and help them out HOPE'",
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
    reward: []
  },
  {
    id: 'gabbag.28.3',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Mavion.  I am forwarding you some design for a grand museum.  Something worthy of your relics.'  \n Mavion : 'I am... speechless!  I have never seen something so beautiful!'  Mary : 'Well that was a success.  Good job on the design HOPE.  Time to build it.'",
    prerequisites: ['gabbag.28.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: [
      { target: 'project', targetId: 'gabbag_museum_construction', type: 'enable' }
    ]
  },
  {
    id: 'gabbag.28.4',
    type: 'journal',
    chapter: 28,
    activePlanet: 'gabbag',
    narrative: "Bob : 'You two are making pretty good progress on this clean-up.  It... reminds me of PANDORA again.' \n Mary : 'How come?'  \n Bob : 'Microplastics.  The evidence was not 100% conclusive on it being harmful but PANDORA did not care anyway.  It did not like microplastics.  It went on a very big cleaning spree at some point.'  \n Mary : 'There are so few people who were there back then, relatively speaking.  Thanks for the story Bob.'",
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
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
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
    id: 'gabbag.29.1',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mary : 'Hey Evelyn!  Can we just throw all this garbage into the star?'  \n Evelyn : 'Sorry Mary.  It does not work.' \n Mary : 'Dang.  And here I thought we could do something fun.  Back to work...'",
    prerequisites: ['gabbag.29.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
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
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.3',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mary : 'We're finally starting to make a real dent in all this garbage cleanup.  Are you tired of it HOPE?'  \n HOPE : ''",
    prerequisites: ['gabbag.29.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
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
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.5',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "$WGC_TEAM1_LEADER$ : 'Miss Hopkins...  My team has delayed it as much as they could but... Ghost was granted a favour by the Regency Council.  He requested... half of the imperial fleet.  To go to your location.  He's going to warp soon.  You need to evacuate.'  \n Mary : 'Damnit!  How many times are we going to be on the edge of complete annihilation?  And the job was almost done.'",
    prerequisites: ['gabbag.29.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'gabbag.29.6',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Mavion : 'Hold, humans.  You may need not flee.'  \n Mary : 'Why?'  \n Mavion : 'Ghost... is a Gabbagian.  The most talented and faithful of us.  He knows not what he will find here.'  \n Mary : 'That's a gamble.  HOPE, realistically we can't evacuate all colonists in time.  What do you think?'",
    prerequisites: ['gabbag.29.5'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'gabbag.29.7',
    type: 'journal',
    chapter: 29,
    activePlanet: 'gabbag',
    narrative: "Detecting Incoming Hazardous Biomass Fleet. 44 Warpships and accompanying fleet detected.  \n Mary : 'Here he is...  This is way more than we can handle.  If Elder Mavion is wrong we're all screwed.' \n A few minutes later... \n Receiving transmission... \n Ghost : 'Why?' \n Mary : 'Because... we're the good guys.' \n Ghost : '...'  Detecting 44 outgoing warp bubbles.  \n  Mary : 'I was not sure that was going to work...'  \n Mavion : 'I knew it would.  There was no need to ever be worried.  Besides... you could not hear through the translation... but I guarantee you what you did here today had a very strong impact on him.  In any cases, you Humans and you Machine have the eternal gratitude of all Gabbagians.  We will remember this day forever.  So will Ghost.  I will now repay this debt immediately.'  \n Mary : 'What?'",
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
    reward: []
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressGabbag;
}
