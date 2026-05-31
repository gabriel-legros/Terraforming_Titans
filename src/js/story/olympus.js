var progressOlympus = { chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  OLYMPUS PLACEHOLDER STORY (Chapters 46 - 49)
 * -------------------------------------------------*/

progressOlympus.chapters.push(
  {
    id: 'olympus.46.0',
    type: 'journal',
    chapter: 46,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['impossible15'],
    objectives: [],
    reward: []
  },
  {
    id: 'olympus.47.0',
    type: 'journal',
    chapter: 47,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.46.0'],
    objectives: [],
    reward: []
  },
  {
    id: 'olympus.48.0',
    type: 'journal',
    chapter: 48,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.47.0'],
    objectives: [],
    reward: []
  },
  {
    id: 'olympus.49.0',
    type: 'journal',
    chapter: 49,
    activePlanet: 'olympus',
    title: '',
    narrative: '',
    prerequisites: ['olympus.48.0'],
    objectives: [],
    reward: []
  }
);

try {
  module.exports = progressOlympus;
} catch (err) {}
