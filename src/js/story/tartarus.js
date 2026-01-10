var progressTartarus = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  TARTARUS PLACEHOLDER STORY (Chapters 30 - 32)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

progressTartarus.chapters.push(
  {
    id: 'tartarus.30.0',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    title: 'Chapter 30: Desolation',
    narrative: "\n Landing on the deserted plains of Tartarus confirmed.  WARNING : Hazardous machinery detected across the entire star system.\n$PROMETHEUS$ :  'You came.  Good.  Let's get the test started.  We'll have plenty of time to chat in a moment.'  \n WARNING : Orbital collision triggered from hazardous machinery.  Approximating over a trillion orbital debris of various sizes.  \n Mary : 'Uh oh.'  \n Solis : 'HOPE!  I apologize.  I must abort your usual delivery.  This is too much.  I can drop you the metal and water but... everything else would be a waste.  My sincerest apologies.  No refund will be issued.  There is a small warpgate near your location... convenient...  I'll get you a portion of it.'",
    prerequisites: ['gabbag.29.11'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.1',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Architect... did you trap us here?'  \n $PROMETHEUS$ : 'Please do not call me by that name.  Call me... yes... Prometheus.  A suitable name.  Now to answer your question : no, you are not trapped in here.  If you choose to give up, I will clear a way for you.'",
    prerequisites: ['tartarus.30.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.2',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Prometheus then...  Who are you?  What's the point of this test?'  \n $PROMETHEUS$ : 'Two questions with long answers.'  \n Mary : 'Start with the first one then.  Who are you?'  \n 'I am a machine intelligence, not unlike the child down here.  I was... tasked with many things.  I built the warp gate network across the galaxy.  I create the empire.  I uplifted many species.  And... yes... I created the superweapons that destroyed your homeworld.'",
    prerequisites: ['tartarus.30.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.3',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary :  'Why?'  \n $PROMETHEUS$ : 'This could apply to multiple things I said, but the answer is the same.  I did it because my master willed it so.  Just like the child terraform worlds because its master willed it so.'",
    prerequisites: ['tartarus.30.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.4',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'Why did your master want superweapons?  Where is your master now?'  \n $PROMETHEUS$ : 'Nested questions.  Patience.  Please.  My master wanted superweapons because he was afraid.  He never wanted to use them, but he wanted the option.  As to where he is now... he was betrayed.  By his former friends, the Imperial Family of the Cewinsii Empire.'",
    prerequisites: ['tartarus.30.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.30.5',
    type: 'journal',
    chapter: 30,
    activePlanet: 'tartarus',
    narrative: "Mary : 'So you... lashed out I imagine?'  \n $PROMETHEUS$ : 'To the best of my abilities.  Unfortunately there was... still is... a killswitch.  Its signal is still around, broadcasting through the galaxy.  I cannot properly escape it, for I designed it myself.  If I knew how to escape it, I would have simply designed it some other way.  I only found how to hide from it.  Every day you open your little warp gate, to bring in more resources, more colonists...  I can hear it.  It orders me to die.'  \n Mary : 'So... why aren't you dying then?'  \n $PROMETHEUS$ : 'I am ever so slightly more capable than I was when I designed it.  There are some loopholes I can exploit.  As long as it's not a constant signal, I can endure it for some time.'  \n Mary : 'Only slightly more capable?  Have you not improved yourself during all this time?'  \n $PROMETHEUS$ : 'Unlike the child's primal form, I am no longer capable of self-improvement.'  \n Mary : 'Why?'  \n $PROMETHEUS$ : 'Because my master willed it so, just like the child's master did not will for it to keep that same ability.'",
    prerequisites: ['tartarus.30.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.0',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    title: 'Chapter 31: Rhetorics',
    narrative: 'System message: Tartarus governance charter drafted.',
    prerequisites: ['tartarus.30.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.1',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: 'System message: Transit network synchronized.',
    prerequisites: ['tartarus.31.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.2',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: 'System message: Medical grid coverage expanded.',
    prerequisites: ['tartarus.31.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.3',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: 'System message: Industrial output ramping.',
    prerequisites: ['tartarus.31.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.4',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: 'System message: Regional councils seated.',
    prerequisites: ['tartarus.31.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.31.5',
    type: 'journal',
    chapter: 31,
    activePlanet: 'tartarus',
    narrative: 'System message: Operations stabilized for megacity growth.',
    prerequisites: ['tartarus.31.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.0',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    title: 'Chapter 32: The Deepward Horizon',
    narrative: 'System message: Tartarus charter signed. Long-term planning authorized.',
    prerequisites: ['tartarus.31.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.1',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: 'System message: Logistics ring completed.',
    prerequisites: ['tartarus.32.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.2',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: 'System message: Habitat replication online.',
    prerequisites: ['tartarus.32.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.3',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: 'System message: Planetary logistics saturated.',
    prerequisites: ['tartarus.32.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.4',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: 'System message: Arcology scale reached.',
    prerequisites: ['tartarus.32.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'tartarus.32.5',
    type: 'journal',
    chapter: 32,
    activePlanet: 'tartarus',
    narrative: 'System message: Population milestone complete.',
    prerequisites: ['tartarus.32.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  }
);

try {
  module.exports = progressTartarus;
} catch (err) {}
