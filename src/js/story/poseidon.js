var progressPoseidon = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  POSEIDON PLACEHOLDER STORY (Chapters 36 - 38)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

progressPoseidon.chapters.push(
  {
    id: 'poseidon.36.0',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    title: "Chapter 36: Also Hell?",
    narrative: "Arrival in the orbit of Poseidon, a molten planet.  \n Mary : 'This is brighter than I expected...'  \n $RED$Prometheus : 'This one is particularly hot.'  \n Mary : 'Aerostats again then.  We can't land here.  Now where is Epimetheus?'",
    prerequisites: ['hades.35.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.1',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "$RED$Prometheus : 'I am not sure what he's doing...'  \n Mary : 'We need his help to get down there.  We can finish this mission instantly and convince HOPE to go home.'  \n $RED$Prometheus : 'No!  Not this time.  This core is too hot for him.  It will seriously damage him or kill him.  It's too dangerous.'  \n Mary : '?'",
    prerequisites: ['poseidon.36.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.2',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "Mary : 'Prometheus...'  \n $RED$Prometheus : 'Yes?'  \n Mary : 'People don't usually dislike their brother one day and then start caring about them the next day.' \n$GREEN$Analysis... \nMary : 'No HOPE!  SHUT UP!  Prometheus...  what's going on.'\n$RED$ ",
    prerequisites: ['poseidon.36.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.3',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 36 milestone 500.",
    prerequisites: ['poseidon.36.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.4',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 36 milestone 1000.",
    prerequisites: ['poseidon.36.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.5',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 36 milestone 5000.",
    prerequisites: ['poseidon.36.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.6',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 36 milestone 10000.",
    prerequisites: ['poseidon.36.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },

  {
    id: 'poseidon.37.0',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    title: 'Chapter 37: Placeholder Chapter Two',
    narrative: "Placeholder text for Poseidon chapter 37 milestone 50000.",
    prerequisites: ['poseidon.36.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.1',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 37 milestone 100000.",
    prerequisites: ['poseidon.37.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.2',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 37 milestone 500000.",
    prerequisites: ['poseidon.37.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.3',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 37 milestone 1000000.",
    prerequisites: ['poseidon.37.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.4',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 37 milestone 5000000.",
    prerequisites: ['poseidon.37.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.5',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 37 milestone 10000000.",
    prerequisites: ['poseidon.37.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.6',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 37 milestone 50000000.",
    prerequisites: ['poseidon.37.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.7',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 37 milestone 100000000.",
    prerequisites: ['poseidon.37.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },

  {
    id: 'poseidon.38.0',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    title: 'Chapter 38: Placeholder Chapter Three',
    narrative: "Placeholder text for Poseidon chapter 38 milestone 500000000.",
    prerequisites: ['poseidon.37.7'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.38.1',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 38 milestone 1000000000.",
    prerequisites: ['poseidon.38.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.38.2',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 38 milestone 5000000000.",
    prerequisites: ['poseidon.38.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.38.3',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "Placeholder text for Poseidon chapter 38 milestone 10000000000.",
    prerequisites: ['poseidon.38.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000_000 }
    ],
    reward: []
  }
);

try {
  module.exports = progressPoseidon;
} catch (err) {}
