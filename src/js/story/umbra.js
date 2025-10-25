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
  }
);

if (typeof module !== 'undefined') {
  module.exports = progressUmbra;
}
