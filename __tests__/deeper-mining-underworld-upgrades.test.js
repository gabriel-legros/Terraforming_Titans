describe('DeeperMiningProject underworld mining upgrades', () => {
  let DeeperMiningProject;
  let recordedEffects;

  const resetGlobals = () => {
    delete global.EffectableEntity;
    delete global.Project;
    delete global.AndroidProject;
    delete global.buildings;
    delete global.addEffect;
    delete global.removeEffect;
  };

  beforeEach(() => {
    jest.resetModules();
    resetGlobals();

    global.EffectableEntity = class {
      constructor() {
        this.activeEffects = [];
        this.booleanFlags = new Set();
      }

      applyBooleanFlag(effect) {
        if (effect.value) {
          this.booleanFlags.add(effect.flagId);
        } else {
          this.booleanFlags.delete(effect.flagId);
        }
      }

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
      }

      getScaledCost() {
        return this.cost;
      }

      applyDurationEffects(base) {
        return base * this.getDurationMultiplier();
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
    };

    global.AndroidProject = class extends Project {
      adjustActiveDuration() {}
    };

    global.buildings = {
      oreMine: { count: 0, cost: { colony: { components: 1 } } }
    };
    recordedEffects = [];
    global.addEffect = (effect) => {
      recordedEffects.push({ action: 'add', effect });
    };
    global.removeEffect = (effect) => {
      recordedEffects.push({ action: 'remove', effect });
    };

    DeeperMiningProject = require('../src/js/projects/DeeperMiningProject.js');
  });

  afterEach(() => {
    resetGlobals();
    jest.resetModules();
  });

  it('adds superalloy cost and bonuses based on the slider', () => {
    const project = new DeeperMiningProject({
      name: 'Deeper mining',
      cost: { colony: { components: 100 } },
      duration: 1000,
      maxDepth: 10000,
      attributes: {}
    }, 'deeperMining');

    project.applyBooleanFlag({ flagId: 'underworld_mining', value: true });
    project.setUnderworldMiningLevel(4);

    const cost = project.getScaledCost();
    expect(cost.colony.superalloys).toBeCloseTo(4);
    expect(project.getEffectiveDuration()).toBeCloseTo(200);
    expect(project.maxDepth).toBe(50000);
  });

  it('applies supercharged mining effects on slider changes', () => {
    const project = new DeeperMiningProject({
      name: 'Deeper mining',
      cost: { colony: { components: 100 } },
      duration: 1000,
      maxDepth: 10000,
      attributes: {}
    }, 'deeperMining');

    project.applyBooleanFlag({ flagId: 'underworld_mining', value: true });
    project.setSuperchargedMiningLevel(3);

    const productionEffect = recordedEffects.find(entry => entry.effect.effectId === 'supercharged_mining_prod');
    const energyEffect = recordedEffects.find(entry => entry.effect.effectId === 'supercharged_mining_energy');
    expect(productionEffect.effect.value).toBe(4);
    expect(energyEffect.effect.value).toBe(64);
  });

  it('resets the slider on travel', () => {
    const project = new DeeperMiningProject({
      name: 'Deeper mining',
      cost: { colony: { components: 100 } },
      duration: 1000,
      maxDepth: 10000,
      attributes: {}
    }, 'deeperMining');

    project.applyBooleanFlag({ flagId: 'underworld_mining', value: true });
    project.setUnderworldMiningLevel(6);
    project.prepareTravelState();

    expect(project.underworldMiningLevel).toBe(0);
    expect(project.superchargedMiningLevel).toBe(0);
    expect(project.maxDepth).toBe(10000);
  });
});
