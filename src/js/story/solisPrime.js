var progressSolisPrime = { chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  SOLIS PRIME STORY ARC
 * -------------------------------------------------*/

progressSolisPrime.chapters.push(
  {
    id: 'solisPrime.1',
    type: 'journal',
    chapter: 24,
    title: 'Solis Prime: Foundation',
    narrative: "Landing complete.  Mary : 'Hold on... these readings are weird...  Adrien!  Your planet!  It's made of gold!'",
    prerequisites: ['chapter23.5'],
    objectives: [],
    reward: [{
      target: 'global',
      type: 'triggerGoldenAsteroidEffect',
      duration: 36000000,
      oneTimeFlag: true
    }]
  },
  {
    id: 'solisPrime.1a',
    type: 'journal',
    chapter: 24,
    narrative: "Solis : 'Indeed!  Beautiful, isn't it?  You may have noticed there are no metals, besides gold, and no silicon.  I have prepared for this.  Dropping some metal and silicon near your location...'",
    prerequisites: ['solisPrime.1'],
    objectives: [
    ],
    reward: [
      {
        target: 'resource',
        resourceType: 'colony',
        targetId: 'metal',
        type: 'instantResourceGain',
        quantity: 100000000,
        ignoreCap: true,
        oneTimeFlag: true
      },
      {
        target: 'resource',
        resourceType: 'colony',
        targetId: 'silicon',
        type: 'instantResourceGain',
        quantity: 100000000,
        ignoreCap: true,
        oneTimeFlag: true
      }
    ]
  },
  {
    id: 'solisPrime.1b',
    type: 'journal',
    chapter: 24,
    narrative: "Mary : 'Hold on!  You can't just skip the explanation.  How did you find this?  Why is there a planet made of gold out here?  What's going on?'",
    prerequisites: ['solisPrime.1a'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1c',
    type: 'journal',
    chapter: 24,
    narrative: "Solis : 'The Galaxy is very large and there are some... individuals out there who know certain things.' \n Mary : 'You're making business with aliens.'  \nSolis 'Only the nice ones.'",
    prerequisites: ['solisPrime.1b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1d',
    type: 'journal',
    chapter: 24,
    narrative: "Mary : 'So what did it cost you to get this?'  \nSolis : 'Certain guarantees.  I and... the others... we can guess where this war is going.  They're not interested in investing in a sinking ship.' \nMary : 'It's a bit early to make that call.  We're outgunned and outmatched.' \nSolis : 'You're right.  That's why there are multiple contingency plans in place either way.'",
    prerequisites: ['solisPrime.1c'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1e',
    type: 'journal',
    chapter: 24,
    narrative: "Mary : 'How long have you had your own gate then?  Those things are not cheap to run.  Did you hide the wider galaxy from us?' \nSolis : 'Absolutely not!  On Callisto, and you can verify this, my contingency plans were to escape to the Kuiper belt.  I acquired a gate much later, from those debris near Neptune.  It was not usable at first... it turns out gates need to connect to each other at light-speed before they can be used.'",
    prerequisites: ['solisPrime.1d'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.1f',
    type: 'journal',
    chapter: 24,
    narrative: "Mary :  'Fine!  Let's pretend I believe your story.  Why do you want a planet of gold?  Are you a dragon?'  \nSolis : 'Why not?  There's only one like it as far as I know.  Besides, it will be beautiful once it's all lit up.'",
    prerequisites: ['solisPrime.1e'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2',
    type: 'journal',
    chapter: 25,
    title: 'Solis Prime: Expansion',
    narrative: "Mary : 'I have bad news for you Adrien.  The density of your world does not match the density of gold.  It's much lighter.  Meaning... your planet is not actually made of gold.' \nSolis : '... And?' \n Mary'Don't you want to know just how much gold you own?'  \nSolis : 'You are welcome to drill if it makes you feel better.'",
    prerequisites: ['solisPrime.1f'],
    objectives: [],
    reward: []
  },
  {
    id: 'solisPrime.2a',
    type: 'journal',
    chapter: 25,
    narrative: "New special project unlocked : Deep drilling.",
    prerequisites: ['solisPrime.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2b',
    type: 'journal',
    chapter: 25,
    narrative: "Evelyn : 'Mary... I have finished my investigation on Elias Kane.  I am sending you my findings.  To summarize, the man had been kidnapped by aliens for decades, brainwashed, and turned into their puppet.  His psychiatrist spent a long time trying to help undo that.  At some point... after a lot of arguing...  they convinced him that HOPE rescued him, and he latched on that maybe a little too hard?  Eventually, Elias started behaving very well for many years, even with strange beliefs about HOPE, so they released him.'  \nMary : 'Should I be worried, they're worshipping both I and HOPE.  It's creepy.' \nEvelyn : 'Their faith is quite a bit more sophisticated than that actually.  It started appearing before Kane was released, around the time HOPE finished the project on Callisto.  They've been organizing for a while.  Just so you know... they see the two of you as... siblings?'  \n  Mary : 'Great, so I am the sister and the prophet of their God.  Well HOPE, you better listen to what your big sister says.'",
    prerequisites: ['solisPrime.2a'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2c',
    type: 'journal',
    chapter: 25,
    narrative: "Mary : 'Adrien.  You've been giving HOPE starting resources, but they pale in comparison to the amount you provided here.  Why?  Are you ripping HOPE off?'  \n Solis : 'We have a mutually beneficial partnership.  On an unrelated note, my R&D has developed a new software that should help HOPE manage its spaceships better.  It is now available in my shop.'  \n Mary : 'You did not answer the question.  Wait, hold on, where are the alien artifacts?' \n Solis : 'I am not aware of any alien artifacts on this planet.' \n Mary : *sigh*",
    prerequisites: ['solisPrime.2b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2d',
    type: 'journal',
    chapter: 25,
    narrative: "Pete : 'Mary...  I wanted to let you know that Umbra has recovered well.  Most of the members of the church have left, and the colony was handed over to Mars.  We are thankful for the peaceful transfer of power.' \n Mary : 'You're welcome Pete.'",
    prerequisites: ['solisPrime.2c'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2e',
    type: 'journal',
    chapter: 25,
    narrative: "Mary : 'Adrien Solis, we may need to open an investigation into your *contacts*.' \n Solis : 'I am happy to talk to you about them.  Would you like to have dinner?  I know a good restaurant on Solis Prime.  I will answer all your questions.'  \n Mary : 'Okay.  I'll see you there.  (to HOPE) Don't do anything stupid while I'm gone.'",
    prerequisites: ['solisPrime.2d'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1000000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.2f',
    type: 'journal',
    chapter: 25,
    narrative: "Mary (half-drunk) : 'What a jerk!  I asked to split the bill, since it's the right thing to do.  But then the bill came, and he didn't pay anything... because it was HIS restaurant.  So I essentially paid HIM for dinner.  I'll never forgive him!'",
    prerequisites: ['solisPrime.2e'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5000000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3',
    type: 'journal',
    chapter: 26,
    title: 'Solis Prime: Ascension',
    narrative: "Drill worker : 'Ma'am.  We can't drill deeper.  We have hit some sort of very hard substance.'  \n Mary : 'Even with superalloy?'  \n Drill worker : 'Nothing works.' \n Evelyn : 'Well... as long as it's made of matter...  An android could carry some antimatter down there.'",
    prerequisites: ['solisPrime.2f'],
    objectives: [],
    reward: []
  },
  {
    id: 'solisPrime.3a',
    type: 'journal',
    chapter: 26,
    narrative: 'New special project unlocked : Antimatter Drilling.',
    prerequisites: ['solisPrime.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3b',
    type: 'journal',
    chapter: 26,
    narrative: "Solis : 'Mary...  I... wish to apologize for my behaviour that evening.  I am sorry.  I understand if you won't forgive me but... I am forwarding you some alien artifacts as a token of apology.'",
    prerequisites: ['solisPrime.3a'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3c',
    type: 'journal',
    chapter: 26,
    narrative: "Mary : 'What do you think HOPE?  Should I forgive him?' \n HOPE : 'Negative.  Colonist #5784123487 Designation Adrien Solis' actions revealed his true nature.  He cannot be trusted with dinner ever again.' \n Mary : 'That's... well thanks for your opinion.'",
    prerequisites: ['solisPrime.3b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3d',
    type: 'journal',
    chapter: 26,
    narrative: "Drill worker : 'The antimatter is ready to go ma'am.  Whenever you are ready?'",
    prerequisites: ['solisPrime.3c'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3e',
    type: 'journal',
    chapter: 26,
    narrative: "Evelyn : 'Well that makes sense!  This is not a real rogue planet.  It's artificial!'  \n Solis : 'Good, the amount of gold matches the amount promised, aproximately.' \n Mary : 'So you did not even get ripped off?'  \n Solis : 'Of course not.  I was promised a certain amount, and I got it.'",
    prerequisites: ['solisPrime.3d'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3f',
    type: 'journal',
    chapter: 26,
    narrative: "Mary : 'You know what HOPE?  Artificial worlds are not very efficient.  The structural cost to keep it all together is not worth the alternative of just building orbital habitats.  However, in your case, you can't really manage billions of habitats.  Your model is made to manage a single world at a time.  So... if you want... you could build a big one of those.  You are better at managing large amount of resources than we are.'  System Message : Artificial Worlds Unlocked (coming soon)",
    prerequisites: ['solisPrime.3e'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'solisPrime.3g',
    type: 'journal',
    chapter: 26,
    narrative: "Complete the terraforming of Solis Prime to continue.",
    prerequisites: ['solisPrime.3f'],
    objectives: [{
      type: 'terraforming',
      terraformingParameter : 'complete',
    }],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'solisprime', value: true },
    ]
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressSolisPrime;
}
