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
    narrative: "\n Landing on the deserted plains of Tartarus confirmed.  WARNING : Hazardous machinery detected across the entire star system.\n$PROMETHEUS$ :  'You came.  Good.  Let's get the test started.  We'll have plenty of time to chat in a moment.'  \n WARNING : Orbital collision triggered from hazardous machinery.  Approximating over a trillion orbital debris of various sizes.  \n Mary : 'Uh oh.'  \n Solis : 'HOPE!  I apologize.  I must abort your usual delivery.  This is too much.  I can drop you the metal and water but... everything else would be a waste.  My sincerest apologies.  No refund will be issued.'",
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
    narrative: 'System message: Supply cadence stabilizing.',
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
    narrative: 'System message: Initial civic roster established.',
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
    narrative: 'System message: Settlement districts online.',
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
    narrative: 'System message: Population surge confirmed.',
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
    title: 'Chapter 31: Underworld Accord',
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
