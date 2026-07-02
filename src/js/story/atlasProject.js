var progressAtlasProject = { chapters: [], storyProjects: {} };

progressAtlasProject.storyProjects.stellarEngine = {
  type: 'StellarEngineProject',
  name: '',
  category: 'story',
  chapter: -1,
  cost: {
    colony: {
      metal: 1_000_000_000_000,
      components: 100_000_000_000,
      electronics: 10_000_000_000,
      superalloys: 1_000_000_000,
      superconductors: 100_000_000,
      energy: 1_000_000_000_000_000
    }
  },
  duration: 300_000,
  description: '',
  repeatable: false,
  unlocked: false,
  attributes: {
    specialSeedKey: 'teebeepee',
    hideAutoStart: true,
    spaceMining: true,
    stellarEngine: {
      segmentCount: 100_000_000,
      cooldownMinMs: 150_000,
      cooldownMaxMs: 450_000,
      eventDurationMinMs: 40_000,
      eventDurationMaxMs: 120_000,
      maxMaintenanceMultiplier: 100,
      maxAddedStellarFlux: 100_000,
      decayPerSecond: 0.10,
      ejectionCost: {
        colony: {
          energy: 1e30
        }
      }
    }
  }
};

if (typeof module !== 'undefined') {
  module.exports = progressAtlasProject;
}
