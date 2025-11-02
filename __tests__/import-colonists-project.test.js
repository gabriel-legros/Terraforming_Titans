const resetGlobals = () => {
  delete global.Project;
  delete global.resources;
  delete global.projectElements;
  delete global.updateProjectUI;
};

describe('ImportColonistsProject resource routing', () => {
  let ImportColonistsProject;

  beforeEach(() => {
    jest.resetModules();

    global.Project = class {
      constructor(config = {}, name = '') {
        this.name = name;
        this.attributes = config.attributes || {};
        this.cost = config.cost || {};
        this.duration = config.duration || 0;
        this.repeatable = Boolean(config.repeatable);
        this.activeEffects = [];
        this.booleanFlags = new Set();
        this.isActive = false;
        this.isCompleted = false;
        this.isPaused = false;
        this.remainingTime = this.duration;
        this.startingDuration = this.duration;
        this.repeatCount = 0;
        this.autoStart = false;
        this.autoStartUncheckOnTravel = false;
        this.pendingResourceGains = [];
        this.shownStorySteps = new Set();
        this.alertedWhenUnlocked = false;
      }

      getEffectiveResourceGain() {
        const base = this.attributes.resourceGain || {};
        const clone = {};
        for (const category in base) {
          clone[category] = {};
          for (const resource in base[category]) {
            clone[category][resource] = base[category][resource];
          }
        }
        return clone;
      }

      isBooleanFlagSet(flag) {
        return this.booleanFlags.has(flag);
      }

      saveState() {
        return {
          isActive: this.isActive,
          isPaused: this.isPaused,
          isCompleted: this.isCompleted,
          remainingTime: this.remainingTime,
          startingDuration: this.startingDuration,
          repeatCount: this.repeatCount,
          pendingResourceGains: this.pendingResourceGains,
          autoStart: this.autoStart,
          autoStartUncheckOnTravel: this.autoStartUncheckOnTravel,
          shownStorySteps: Array.from(this.shownStorySteps),
          alertedWhenUnlocked: this.alertedWhenUnlocked,
        };
      }

      loadState(state) {
        this.isActive = state.isActive;
        this.isPaused = state.isPaused;
        this.isCompleted = state.isCompleted;
        this.remainingTime = state.remainingTime;
        this.startingDuration = state.startingDuration;
        this.repeatCount = state.repeatCount;
        this.pendingResourceGains = state.pendingResourceGains;
        this.autoStart = state.autoStart;
        this.autoStartUncheckOnTravel = state.autoStartUncheckOnTravel;
        this.shownStorySteps = new Set(state.shownStorySteps || []);
        this.alertedWhenUnlocked = state.alertedWhenUnlocked;
      }
    };

    global.resources = {
      colony: {
        colonists: {
          value: 0,
          displayName: 'Colonists',
          increase(amount) {
            this.value += amount;
          },
        },
      },
      special: {
        crusaders: {
          value: 0,
          displayName: 'Crusaders',
          unlocked: false,
          increase(amount) {
            this.value += amount;
          },
          unlock() {
            this.unlocked = true;
          },
        },
      },
    };

    global.projectElements = {};
    global.updateProjectUI = undefined;

    ImportColonistsProject = require('../src/js/projects/ImportColonistsProject.js');
  });

  afterEach(() => {
    resetGlobals();
  });

  test('defaults to delivering colonists when flag is disabled', () => {
    const project = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');

    project.applyResourceGain();

    expect(resources.colony.colonists.value).toBe(5);
    expect(resources.special.crusaders.value).toBe(0);
  });

  test('routes imports to crusaders when enabled and selected', () => {
    const project = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');

    project.booleanFlags.add('crusaderImportEnabled');
    project.setImportTarget('crusaders');

    project.applyResourceGain();

    expect(resources.colony.colonists.value).toBe(0);
    expect(resources.special.crusaders.value).toBe(5);
    expect(resources.special.crusaders.unlocked).toBe(true);
  });

  test('exposes crusader gain through effective resource gain when selected', () => {
    const project = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');

    project.booleanFlags.add('crusaderImportEnabled');
    project.setImportTarget('crusaders');

    const gain = project.getEffectiveResourceGain();

    expect(gain.special.crusaders).toBe(5);
    expect(gain.colony).toBeUndefined();
  });

  test('retains colonist gain mapping when crusaders are not selected', () => {
    const project = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');

    const gain = project.getEffectiveResourceGain();

    expect(gain.colony.colonists).toBe(5);
    expect(gain.special).toBeUndefined();
  });

  test('ignores crusader selection when flag is disabled', () => {
    const project = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');

    project.setImportTarget('crusaders');
    project.applyResourceGain();

    expect(resources.colony.colonists.value).toBe(5);
    expect(resources.special.crusaders.value).toBe(0);
  });

  test('persists import target selection in save data', () => {
    const project = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');

    const defaultState = project.saveState();
    expect(defaultState.importTarget).toBe('colonists');

    project.booleanFlags.add('crusaderImportEnabled');
    project.setImportTarget('crusaders');

    const crusaderState = project.saveState();
    expect(crusaderState.importTarget).toBe('crusaders');
  });

  test('restores saved crusader selection when flag is active', () => {
    const project = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');

    project.booleanFlags.add('crusaderImportEnabled');
    project.setImportTarget('crusaders');

    const savedState = project.saveState();

    const restored = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');
    restored.booleanFlags.add('crusaderImportEnabled');
    restored.loadState(savedState);

    expect(restored.getImportTarget()).toBe('crusaders');
  });

  test('falls back to colonists when saved crusader selection loads without flag', () => {
    const project = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');

    project.booleanFlags.add('crusaderImportEnabled');
    project.setImportTarget('crusaders');

    const savedState = project.saveState();

    const restored = new ImportColonistsProject({
      attributes: { resourceGain: { colony: { colonists: 5 } } },
      cost: {},
      duration: 1000,
    }, 'import_colonists_1');
    restored.loadState(savedState);

    expect(restored.getImportTarget()).toBe('colonists');
  });
});
