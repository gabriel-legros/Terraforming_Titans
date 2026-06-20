const STORY_WORLD_ACHIEVEMENT_PLANETS = [
  'mars',
  'titan',
  'callisto',
  'ganymede',
  'vega2',
  'venus',
  'umbra',
  'solisprime',
  'gabbag',
  'tartarus',
  'hades',
  'poseidon',
  'styx',
  'zeus',
  'olympus',
  'earth'
];

class AchievementManager {
  constructor() {
    this.definitions = this.buildDefinitions();
    this.achieved = {};
    this.pendingUnlocks = [];
  }

  buildDefinitions() {
    const definitions = [];
    STORY_WORLD_ACHIEVEMENT_PLANETS.forEach((planetKey, index) => {
      const number = index + 1;
      definitions.push({
        id: `story-world-${number}`,
        titleKey: 'ui.settings.achievements.storyWorldTitle',
        titleVars: { number },
        titleFallback: `World ${number}`,
        requirementKey: 'ui.settings.achievements.storyWorldRequirement',
        requirementVars: { number },
        requirementFallback: `Complete World ${number}.`,
        achieved: () => this.isStoryWorldAchievementComplete(planetKey, number),
      });
    });
    return definitions;
  }

  isStoryWorldAchievementComplete(planetKey, number) {
    if (gameCompleted === true) {
      return true;
    }
    if (number === 15) {
      return spaceManager.getCurrentPlanetKey() === 'earth' || spaceManager.isPlanetTerraformed(planetKey);
    }
    if (number === 16) {
      return this.isEarthFinishedAchievementComplete();
    }
    return spaceManager.isPlanetTerraformed(planetKey);
  }

  isEarthFinishedAchievementComplete() {
    return earthManager.getActionCount('completeTerraforming') > 0 || spaceManager.isPlanetTerraformed('earth');
  }

  isAchieved(id) {
    return this.achieved[id] === true;
  }

  markAchieved(definition) {
    if (this.isAchieved(definition.id)) {
      return false;
    }
    this.achieved[definition.id] = true;
    this.pendingUnlocks.push(definition.id);
    this.onAchievementUnlocked(definition);
    return true;
  }

  onAchievementUnlocked(definition) {
    // Future Steam integration should publish from this logic-side hook.
  }

  update() {
    this.definitions.forEach((definition) => {
      if (!this.isAchieved(definition.id) && definition.achieved()) {
        this.markAchieved(definition);
      }
    });
  }

  getAchievements() {
    return this.definitions.map((definition) => ({
      id: definition.id,
      title: t(definition.titleKey, definition.titleVars, definition.titleFallback),
      requirement: t(definition.requirementKey, definition.requirementVars, definition.requirementFallback),
      achieved: this.isAchieved(definition.id),
    }));
  }

  getSummary() {
    const achievements = this.getAchievements();
    const achieved = achievements.filter((entry) => entry.achieved).length;
    return {
      achieved,
      total: achievements.length,
      achievements,
    };
  }

  saveState() {
    return {
      achieved: { ...this.achieved },
    };
  }

  loadState(state = {}) {
    this.achieved = {};
    Object.keys(state.achieved || {}).forEach((id) => {
      if (state.achieved[id] === true) {
        this.achieved[id] = true;
      }
    });
    this.pendingUnlocks = [];
    this.update();
  }
}
