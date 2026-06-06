var progressEarth = { rwgLock: false, chapters: [], storyProjects: {} };

progressEarth.chapters.push(
  {
    id: 'earth.50.0',
    type: 'journal',
    chapter: 50,
    activePlanet: 'earth',
    title: 'Chapter 50 : Country Roads',
    narrative: '',
    prerequisites: ['olympus.49.3'],
    objectives: [
      { type: 'currentPlanet', planetId: 'earth' }
    ],
    reward: []
  }
);

try {
  module.exports = progressEarth;
} catch (err) {}
