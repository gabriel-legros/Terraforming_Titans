describe('Artificial worlds sand availability', () => {
  const buildManager = () => {
    jest.resetModules();
    global.EffectableEntity = class EffectableEntity {
      constructor(config = {}) {
        Object.assign(this, config);
        this.booleanFlags = new Set();
        this.activeEffects = [];
      }
      applyEffect() {}
    };

    global.defaultPlanetParameters = {
      specialAttributes: { hasSand: true },
      resources: {
        surface: {
          land: {},
          ice: {},
          liquidWater: {},
          dryIce: {},
          biomass: {},
          hazardousBiomass: {},
          liquidCO2: {},
          liquidMethane: {},
          hydrocarbonIce: {},
        },
        colony: {
          metal: { baseCap: 0 },
          silicon: { baseCap: 0 },
        },
      },
      zonalWater: {},
      zonalCO2: {},
      zonalHydrocarbons: {},
      zonalSurface: {},
      celestialParameters: { sector: 'R5-07', starLuminosity: 1 },
      visualization: {},
    };

    global.currentPlanetParameters = {
      celestialParameters: { sector: 'R5-07', starLuminosity: 1 },
      star: {
        name: 'Test Star',
        spectralType: 'G',
        luminositySolar: 1,
        massSolar: 1,
        temperatureK: 5800,
        habitableZone: { inner: 0.95, outer: 1.4 },
      },
    };

    const { ArtificialManager } = require('../src/js/space/artificial.js');
    return new ArtificialManager();
  };

  it('disables sand on constructed artificial worlds', () => {
    const manager = buildManager();
    const override = manager.buildOverride({
      name: 'Shellworld',
      type: 'shell',
      core: 'super-earth',
      radiusEarth: 2,
      landHa: 1000,
      stockpile: { metal: 0, silicon: 0 },
      sector: 'A1',
    });

    expect(override.specialAttributes.hasSand).toBe(false);
  });

  it('unlocks a specific artificial core via effect', () => {
    const manager = buildManager();
    const { getArtificialCores } = require('../src/js/space/artificial.js');
    const cores = getArtificialCores();
    const locked = cores.find((entry) => entry.disabled);
    expect(locked.value).toBe('gas-giant');

    manager.applyEffect({ type: 'unlockCore', targetId: 'gas-giant' });

    const updated = getArtificialCores().find((entry) => entry.value === locked.value);
    expect(updated.disabled).toBe(false);
  });
});
