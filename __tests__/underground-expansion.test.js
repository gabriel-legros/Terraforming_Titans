jest.mock('../src/js/special/antimatter.js', () => ({
  produceAntimatter: null,
  updateAntimatterStorageCap: null,
}));

describe('UndergroundExpansionProject continuous mode', () => {
  let UndergroundExpansionProject;
  let reconcileLandResourceValue;

  const resetGlobals = () => {
    delete global.EffectableEntity;
    delete global.Project;
    delete global.AndroidProject;
    delete global.resources;
    delete global.terraforming;
    delete global.projectManager;
    delete global.projectElements;
    delete global.formatNumber;
    delete global.addEffect;
  };

  const buildResources = () => ({
    colony: {
      metal: {
        value: 100,
        decrease(amount) {
          this.value -= amount;
        },
      },
      components: {
        value: 50,
        decrease(amount) {
          this.value -= amount;
        },
      },
    },
    surface: {
      land: {
        value: 0,
        initialValue: 0,
        reserved: 0,
      },
    },
  });

  beforeEach(() => {
    jest.resetModules();

    global.EffectableEntity = class {
      constructor(config = {}) {
        this.activeEffects = [];
        this.booleanFlags = new Set(config.booleanFlags || []);
      }

      applyActiveEffects() {}

      isBooleanFlagSet(flag) {
        return this.booleanFlags.has(flag);
      }
    };

    global.Project = class extends EffectableEntity {
      constructor(config = {}, name = '') {
        super(config);
        this.name = name;
        this.displayName = config.name || name;
        this.cost = config.cost || {};
        this.duration = config.duration || 0;
        this.description = config.description || '';
        this.attributes = config.attributes || {};
        this.repeatable = Boolean(config.repeatable);
        this.maxRepeatCount = config.maxRepeatCount ?? Infinity;
        this.unlocked = config.unlocked !== false;
        this.category = config.category || 'infrastructure';
        this.treatAsBuilding = false;
        this.isActive = false;
        this.isCompleted = false;
        this.isPaused = false;
        this.remainingTime = this.duration;
        this.startingDuration = this.duration;
        this.repeatCount = 0;
        this.autoStart = false;
        this.autoStartUncheckOnTravel = false;
        this.shownStorySteps = new Set();
        this.alertedWhenUnlocked = false;
      }

      getEffectiveCost() {
        return this.cost;
      }

      getScaledCost() {
        return this.getEffectiveCost();
      }

      applyDurationEffects(base) {
        return base;
      }

      getDurationMultiplier() {
        return 1;
      }

      getBaseDuration() {
        return this.duration;
      }

      getEffectiveDuration() {
        return this.applyDurationEffects(this.getBaseDuration());
      }

      canStart() {
        if (this.isPermanentlyDisabled?.()) {
          return false;
        }
        return this.unlocked && !this.isActive && this.repeatCount < this.maxRepeatCount;
      }

      start(resources) {
        if (!this.canStart()) {
          return false;
        }
        if (!this.isPaused && resources) {
          const cost = this.getScaledCost();
          for (const category in cost) {
            for (const resource in cost[category]) {
              const amount = cost[category][resource];
              resources[category][resource].decrease(amount);
            }
          }
        }

        this.remainingTime = this.getEffectiveDuration();
        this.startingDuration = this.remainingTime;
        this.isActive = true;
        this.isPaused = false;
        return true;
      }

      complete() {
        this.isCompleted = true;
        this.isActive = false;
        if (this.repeatable && this.repeatCount < this.maxRepeatCount) {
          this.repeatCount += 1;
          this.isCompleted = false;
          this.remainingTime = this.getEffectiveDuration();
          this.startingDuration = this.remainingTime;
        }
      }

      saveState() {
        return {
          isActive: this.isActive,
          isPaused: this.isPaused,
          isCompleted: this.isCompleted,
          remainingTime: this.remainingTime,
          startingDuration: this.startingDuration,
          repeatCount: this.repeatCount,
          autoStart: this.autoStart,
          autoStartUncheckOnTravel: this.autoStartUncheckOnTravel,
          shownStorySteps: Array.from(this.shownStorySteps),
          alertedWhenUnlocked: this.alertedWhenUnlocked,
        };
      }

      loadState(state) {
        this.isActive = state.isActive;
        this.isPaused = state.isPaused || false;
        this.isCompleted = state.isCompleted;
        this.remainingTime = state.remainingTime;
        this.startingDuration = state.startingDuration || this.getEffectiveDuration();
        this.repeatCount = state.repeatCount;
        this.autoStart = state.autoStart;
        this.autoStartUncheckOnTravel = state.autoStartUncheckOnTravel === true;
        this.shownStorySteps = new Set(state.shownStorySteps || []);
        this.alertedWhenUnlocked = state.alertedWhenUnlocked || false;
      }
    };

    global.AndroidProject = class extends Project {
      constructor(config = {}, name = '') {
        super(config, name);
        this.assignedAndroids = 0;
        this.autoAssignAndroids = false;
        this.assignmentMultiplier = 1;
        this.continuousThreshold = config.continuousThreshold || 1000;
        this.shortfallLastTick = false;
      }

      isContinuous() {
        const baseDuration = this.getEffectiveDuration();
        return baseDuration < this.continuousThreshold && this.assignedAndroids > 0;
      }

      adjustActiveDuration() {
        const wasContinuous = this.remainingTime === Infinity;
        const nowContinuous = this.isContinuous();
        const hasProgress = this.isActive
          && Number.isFinite(this.startingDuration)
          && Number.isFinite(this.remainingTime)
          && this.startingDuration > 0;
        const progressRatio = hasProgress
          ? (this.startingDuration - this.remainingTime) / this.startingDuration
          : 0;

        if (this.isActive && wasContinuous !== nowContinuous) {
          if (nowContinuous) {
            this.onEnterContinuousMode?.(progressRatio);
            this.startingDuration = Infinity;
            this.remainingTime = Infinity;
          } else {
            this.isActive = false;
            this.isCompleted = false;
            this.isPaused = false;

            if (this.canStart()) {
              const duration = this.getEffectiveDuration();
              this.startingDuration = duration;
              this.remainingTime = duration;
              this.start(resources);
            }
          }
        } else if (this.isActive) {
          const newDuration = this.getEffectiveDuration();
          this.startingDuration = newDuration;
          this.remainingTime = newDuration * (1 - progressRatio);
        }
      }

      getAndroidSpeedMultiplier() {
        return 1 + this.assignedAndroids;
      }

      getBaseDuration() {
        if (this.isBooleanFlagSet('androidAssist')) {
          const multiplier = this.getAndroidSpeedMultiplier();
          if (multiplier > 1) {
            return this.duration / multiplier;
          }
        }
        return super.getBaseDuration();
      }
    };

    global.formatNumber = (value) => value.toString();
    global.addEffect = jest.fn();
    global.projectElements = {};
    global.terraforming = { initialLand: 10000 };

    global.resources = buildResources();
    resources.surface.land.value = terraforming.initialLand;
    resources.surface.land.initialValue = terraforming.initialLand;

    UndergroundExpansionProject = require('../src/js/projects/UndergroundExpansionProject.js');
    ({ reconcileLandResourceValue } = require('../src/js/resource.js'));
  });

  afterEach(() => {
    resetGlobals();
  });

  test('deducts cost and tracks fractional progress each tick', () => {
    const project = new UndergroundExpansionProject({
      cost: { colony: { metal: 0.001, components: 0.0004 } },
      duration: 1000,
      maxRepeatCount: 10000,
    }, 'undergroundExpansion');

    project.booleanFlags.add('androidAssist');
    project.assignedAndroids = 1;
    project.start(resources);

    const changes = { colony: { metal: 0, components: 0 } };

    project.applyCostAndGain(250, changes, 1);

    expect(changes.colony.metal).toBeCloseTo(-5);
    expect(changes.colony.components).toBeCloseTo(-2);
    expect(project.fractionalRepeatCount).toBeCloseTo(0.5);
    expect(project.repeatCount).toBe(0);
  });

  test('reconciles land with fractional underground progress', () => {
    const project = new UndergroundExpansionProject({
      cost: { colony: { metal: 0.001, components: 0.0004 } },
      duration: 1000,
      maxRepeatCount: 10000,
    }, 'undergroundExpansion');

    project.booleanFlags.add('androidAssist');
    project.assignedAndroids = 1;
    project.start(resources);

    const changes = { colony: { metal: 0, components: 0 } };
    project.applyCostAndGain(125, changes, 1);

    global.projectManager = { projects: { undergroundExpansion: project } };

    reconcileLandResourceValue();

    expect(resources.surface.land.value).toBeCloseTo(10000.25);
  });

  test('carries discrete progress into continuous mode without double-charging the upfront cost', () => {
    const project = new UndergroundExpansionProject({
      cost: { colony: { metal: 0.001, components: 0.0004 } },
      duration: 2000,
      maxRepeatCount: 5,
    }, 'undergroundExpansion');

    project.booleanFlags.add('androidAssist');
    project.assignedAndroids = 0;
    project.start(resources);

    // Simulate half of the discrete progress being completed
    project.remainingTime = project.startingDuration / 2;

    project.assignedAndroids = 10;
    project.adjustActiveDuration();

    const changes = { colony: { metal: 0, components: 0 } };
    const newDuration = project.getEffectiveDuration();

    project.applyCostAndGain(newDuration, changes, 1);

    expect(changes.colony.metal).toBeCloseTo(-5);
    expect(changes.colony.components).toBeCloseTo(-2);
    expect(project.repeatCount).toBe(1);
    expect(project.fractionalRepeatCount).toBeCloseTo(0.5);
    expect(project.prepaidPortion).toBe(0);
  });
});
