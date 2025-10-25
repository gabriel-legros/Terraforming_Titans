var progressUmbra = { rwgLock: false, chapters: [], storyProjects: {} };

progressUmbra.chapters.push(
  {
    id: 'chapter21.1',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Orbital insertion complete. Umbra orbits within the ember glow of Nyx-13.\nH.O.P.E.: 'Surface scan confirms extensive obsidian plains and trapped volatiles beneath the crust.'\nMary: 'We finally have a shadowed haven. Establish the first colony before Kane figures out how to follow us here.'",
    prerequisites: ['chapter20.19'],
    objectives: [],
    reward: []
  },
  {
    id: 'chapter21.2',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Atmospheric processors detect photochemical haze reacting with the star's deep orange spectrum.\nAdrien Solis: 'Treat that haze like a commodity. The Galaxy Concordat just doubled prices on exotic spectra collectors. Umbra can bankroll the whole fleet if we act quickly.'",
    prerequisites: ['chapter21.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'energy', quantity: 2500000 }
    ],
    reward: []
  },
  {
    id: 'chapter21.3',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Umbra's twilight cities glow through the haze once equilibrium holds.\nH.O.P.E.: 'Terraforming benchmarks achieved. Habitability parameters fall within Directive tolerances.'\nMartin: 'Another world saved from darkness. Let's seal its fate before the cult invents a new apocalypse.'",
    prerequisites: ['chapter21.2'],
    objectives: [
      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'umbra', value: true }
    ]
  },
  {
    id: 'chapter21.4',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: 'Placeholder: reach 1,000 colonists on Umbra.',
    prerequisites: ['chapter21.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'chapter21.5',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: 'Placeholder: stabilize growth around 3,200 colonists.',
    prerequisites: ['chapter21.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 3_200 }
    ],
    reward: []
  },
  {
    id: 'chapter21.6',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: 'Placeholder: expand to 10,000 colonists.',
    prerequisites: ['chapter21.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'chapter21.7',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: "Placeholder: support 32,000 colonists under Umbra's twilight.",
    prerequisites: ['chapter21.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 32_000 }
    ],
    reward: []
  },
  {
    id: 'chapter21.8',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: 'Placeholder: secure infrastructure for 100,000 colonists.',
    prerequisites: ['chapter21.7'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'chapter21.9',
    type: 'journal',
    chapter: 21,
    activePlanet: 'umbra',
    narrative: 'Placeholder: maintain resilient habitats for 320,000 colonists.',
    prerequisites: ['chapter21.8'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 320_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.1',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: 'Placeholder: Chapter 22 overview.',
    prerequisites: ['chapter21.9'],
    objectives: [],
    reward: []
  },
  {
    id: 'chapter22.2',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: 'Placeholder: coordinate one million colonists.',
    prerequisites: ['chapter22.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.3',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Placeholder: keep 3,200,000 colonists safe in Umbra's shadow.",
    prerequisites: ['chapter22.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 3_200_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.4',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: 'Placeholder: steady expansion to 10,000,000 colonists.',
    prerequisites: ['chapter22.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.5',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: 'Placeholder: synchronize supply chains for 32,000,000 colonists.',
    prerequisites: ['chapter22.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 32_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.6',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: 'Placeholder: balance ecosystems for 100,000,000 colonists.',
    prerequisites: ['chapter22.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter22.7',
    type: 'journal',
    chapter: 22,
    activePlanet: 'umbra',
    narrative: "Placeholder: sustain 320,000,000 colonists through Umbra's night.",
    prerequisites: ['chapter22.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 320_000_000 }
    ],
    reward: []
  },
  {
    id: 'chapter23.1',
    type: 'journal',
    chapter: 23,
    activePlanet: 'umbra',
    narrative: 'Placeholder: Chapter 23 overview.',
    prerequisites: ['chapter22.7'],
    objectives: [],
    reward: []
  },
  {
    id: 'chapter23.2',
    type: 'journal',
    chapter: 23,
    activePlanet: 'umbra',
    narrative: 'Placeholder: guide Umbra past one billion colonists.',
    prerequisites: ['chapter23.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressUmbra;
}
