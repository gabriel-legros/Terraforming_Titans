describe('Nanocolony resource allocation limits', () => {
  const originalResources = global.resources;
  const originalEffectableEntity = global.EffectableEntity;
  const originalCurrentPlanetParameters = global.currentPlanetParameters;

  beforeEach(() => {
    jest.resetModules();
    global.resources = {
      colony: {
        silicon: { value: 1000, productionRate: 100, modifyRate: jest.fn() },
        metal: { value: 1000, productionRate: 100, modifyRate: jest.fn() },
        energy: { value: 1e9, productionRate: 1e9, modifyRate: jest.fn() },
      },
      surface: {
        junk: { value: 0, modifyRate: jest.fn() },
        scrapMetal: { value: 0, modifyRate: jest.fn() },
      },
    };
    global.currentPlanetParameters = {};
    global.EffectableEntity = class {
      constructor() {
        this.activeEffects = [];
        this.booleanFlags = new Set();
      }
      isBooleanFlagSet(flagId) {
        return this.booleanFlags.has(flagId);
      }
      getEffectiveGrowthMultiplier() {
        return 1;
      }
    };
  });

  afterEach(() => {
    global.resources = originalResources;
    global.EffectableEntity = originalEffectableEntity;
    global.currentPlanetParameters = originalCurrentPlanetParameters;
  });

  it('caps silica consumption by percent of production', () => {
    const { NanotechManager } = require('../src/js/nanotech.js');
    const manager = new NanotechManager();
    manager.enabled = true;
    manager.nanobots = 1e20;
    manager.siliconSlider = 10;
    manager.maxSiliconPercent = 10;
    manager.siliconLimitMode = 'percent';

    const accumulatedChanges = {
      colony: { silicon: 0, metal: 0, energy: 0, glass: 0, components: 0 },
      surface: { junk: 0, scrapMetal: 0 },
    };

    manager.produceResources(1000, accumulatedChanges);

    expect(manager.currentSiliconConsumption).toBeCloseTo(10);
    expect(manager.hasEnoughSilicon).toBe(false);
    expect(manager.siliconFraction).toBeCloseTo(0.1);
  });

  it('uses recycling production for silica percent caps', () => {
    const { NanotechManager } = require('../src/js/nanotech.js');
    global.resources.colony.silicon.productionRate = 20;
    global.resources.surface.junk.productionRate = 80;
    global.resources.surface.junk.value = 1000;
    const manager = new NanotechManager();
    manager.enabled = true;
    manager.booleanFlags.add('nanotechRecycling');
    manager.nanobots = 1e20;
    manager.siliconSlider = 10;
    manager.maxSiliconPercent = 10;
    manager.siliconLimitMode = 'percent';

    const accumulatedChanges = {
      colony: { silicon: 0, metal: 0, energy: 0, glass: 0, components: 0 },
      surface: { junk: 0, scrapMetal: 0 },
    };

    manager.produceResources(1000, accumulatedChanges);

    expect(manager.currentSiliconConsumption).toBeCloseTo(10);
    expect(manager.siliconFraction).toBeCloseTo(0.1);
  });

  it('uses production rate for artificial worlds', () => {
    const { NanotechManager } = require('../src/js/nanotech.js');
    global.currentPlanetParameters = { classification: { archetype: 'artificial' } };
    global.resources.colony.silicon.productionRate = 100;
    global.resources.colony.silicon.consumptionRate = 20;
    const manager = new NanotechManager();
    manager.enabled = true;
    manager.nanobots = 1e20;
    manager.siliconSlider = 10;
    manager.maxSiliconPercent = 100;
    manager.siliconLimitMode = 'percent';

    const accumulatedChanges = {
      colony: { silicon: 0, metal: 0, energy: 0, glass: 0, components: 0 },
      surface: { junk: 0, scrapMetal: 0 },
    };

    manager.produceResources(1000, accumulatedChanges);

    expect(manager.currentSiliconConsumption).toBeCloseTo(100);
  });

  it('caps glass production by silica provided this tick', () => {
    const { NanotechManager } = require('../src/js/nanotech.js');
    global.currentPlanetParameters = { classification: { archetype: 'artificial' } };
    global.resources.colony.glass = { value: 0, productionRate: 0, modifyRate: jest.fn() };
    global.resources.colony.silicon.consumptionRate = 100;
    const manager = new NanotechManager();
    manager.enabled = true;
    manager.nanobots = 1e20;
    manager.siliconSlider = 10;
    manager.glassSlider = 10;
    manager.maxSiliconPercent = 10;
    manager.siliconLimitMode = 'percent';

    const accumulatedChanges = {
      colony: { silicon: 0, metal: 0, energy: 0, glass: 0, components: 0 },
      surface: { junk: 0, scrapMetal: 0 },
    };

    manager.produceResources(1000, accumulatedChanges);

    expect(manager.currentSiliconConsumption).toBeCloseTo(10);
    expect(manager.currentGlassProduction).toBeCloseTo(10);
  });

  it('caps components production by metal provided this tick', () => {
    const { NanotechManager } = require('../src/js/nanotech.js');
    global.currentPlanetParameters = { classification: { archetype: 'artificial' } };
    global.resources.colony.components = { value: 0, productionRate: 0, modifyRate: jest.fn() };
    global.resources.colony.metal.productionRate = 20;
    global.resources.colony.metal.consumptionRate = 20;
    const manager = new NanotechManager();
    manager.enabled = true;
    manager.booleanFlags.add('stage2_enabled');
    manager.nanobots = 1e20;
    manager.metalSlider = 10;
    manager.componentsSlider = 10;
    manager.maxMetalPercent = 10;
    manager.metalLimitMode = 'percent';

    const accumulatedChanges = {
      colony: { silicon: 0, metal: 0, energy: 0, glass: 0, components: 0 },
      surface: { junk: 0, scrapMetal: 0 },
    };

    manager.produceResources(1000, accumulatedChanges);

    expect(manager.currentMetalConsumption).toBeCloseTo(2);
    expect(manager.currentComponentsProduction).toBeCloseTo(2);
  });

  it('caps metal consumption by absolute limit', () => {
    const { NanotechManager } = require('../src/js/nanotech.js');
    const manager = new NanotechManager();
    manager.enabled = true;
    manager.booleanFlags.add('stage2_enabled');
    manager.nanobots = 1e20;
    manager.metalSlider = 10;
    manager.maxMetalAbsolute = 2;
    manager.metalLimitMode = 'absolute';

    const accumulatedChanges = {
      colony: { silicon: 0, metal: 0, energy: 0, glass: 0, components: 0 },
      surface: { junk: 0, scrapMetal: 0 },
    };

    manager.produceResources(1000, accumulatedChanges);

    expect(manager.currentMetalConsumption).toBeCloseTo(2);
    expect(manager.hasEnoughMetal).toBe(false);
    expect(manager.metalFraction).toBeCloseTo(0.02);
  });
});
