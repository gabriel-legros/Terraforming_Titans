var progressAtlasProject = { chapters: [], storyProjects: {} };

progressAtlasProject.storyProjects.stellarEngine = {
  type: 'Project',
  name: '',
  category: 'story',
  chapter: -1,
  cost: {
    colony: {
      metal: 1_000_000_000,
      components: 100_000_000,
      electronics: 10_000_000,
      energy: 1_000_000_000_000
    }
  },
  duration: 300_000,
  description: '',
  repeatable: false,
  unlocked: false,
  attributes: {
    specialSeedKey: 'teebeepee'
  }
};

if (typeof module !== 'undefined') {
  module.exports = progressAtlasProject;
}
