var progressStyx = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  STYX PLACEHOLDER STORY (Chapters 39 - 41)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

progressStyx.chapters.push(
  {
    id: 'styx.39.0',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    title: 'Chapter 39: The Prison Shore',
    narrative: "$RED$Prometheus : 'Activate the signal now child.  My defenses here are a lot more aggressive.'  \n Activating countermeasures...  \n Mary : 'Good it worked.  Wait.  Not entirely?  There is some stuff moving all around the planet?'  \n $RED$Prometheus : 'Atlas...'",
    prerequisites: ['impossible5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'styx.39.1',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "Mary : 'Who?'  \n $RED$Prometheus : 'My other older brother.  They...  the Empire must have planted him here as warden.'  \n Mary : 'Are we screwed?  Should we evacuate?'  \n $RED$Prometheus : 'This will make things harder... but I think we can beat him.  Be wary of hacking attempts though.  Atlas is an expert at cyberwarfare.  Surface androids and unmanned ships are ill-advised.'",
    prerequisites: ['styx.39.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'styx.39.2',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.39.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'styx.39.3',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.39.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.4',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.39.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.5',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.39.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.6',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.39.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.7',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.39.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'styx.39.8',
    type: 'journal',
    chapter: 39,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.39.7'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.0',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    title: 'Chapter 40: Crossing Black Water',
    narrative: "",
    prerequisites: ['styx.39.8'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.1',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.40.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.2',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.40.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.3',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.40.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.4',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.40.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.40.5',
    type: 'journal',
    chapter: 40,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.40.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.41.0',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    title: 'Chapter 41: The Door Below',
    narrative: "",
    prerequisites: ['styx.40.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.41.1',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.41.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'styx.41.2',
    type: 'journal',
    chapter: 41,
    activePlanet: 'styx',
    narrative: "",
    prerequisites: ['styx.41.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000_000 }
    ],
    reward: []
  }
);

try {
  module.exports = progressStyx;
} catch (err) {}
