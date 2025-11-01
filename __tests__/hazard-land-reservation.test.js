const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;

const { Resource } = require('../src/js/resource.js');
const { HazardManager } = require('../src/js/terraforming/hazard.js');

describe('Hazardous biomass land reservation', () => {
  let hazardManager;
  let land;

  beforeEach(() => {
    land = new Resource({
      name: 'land',
      displayName: 'Land',
      category: 'surface',
      initialValue: 100,
      unlocked: true,
    });

    global.resources = {
      surface: {
        land,
      },
    };

    hazardManager = new HazardManager();
    hazardManager.initialize({
      hazardousBiomass: {
        baseGrowth: { value: 0, severity: 1, maxDensity: 5 },
      },
    });
  });

  afterEach(() => {
    delete global.resources;
  });

  it('reserves land equal to total hazardous biomass divided by max density', () => {
    const terraforming = {
      zonalSurface: {
        tropical: { hazardousBiomass: 20 },
        temperate: { hazardousBiomass: 10 },
        polar: { hazardousBiomass: 0 },
      },
    };

    hazardManager.update(0, terraforming);

    expect(land.getReservedAmountForSource('hazardousBiomass')).toBeCloseTo(6);
    expect(land.reserved).toBeCloseTo(6);
  });

  it('updates reservations without affecting other reserved amounts', () => {
    land.reserve(2);

    const initialTerraforming = {
      zonalSurface: {
        tropical: { hazardousBiomass: 20 },
        temperate: { hazardousBiomass: 10 },
        polar: { hazardousBiomass: 0 },
      },
    };

    hazardManager.update(0, initialTerraforming);

    expect(land.getReservedAmountForSource('hazardousBiomass')).toBeCloseTo(6);
    expect(land.reserved).toBeCloseTo(8);

    const reducedTerraforming = {
      zonalSurface: {
        tropical: { hazardousBiomass: 5 },
        temperate: { hazardousBiomass: 5 },
        polar: { hazardousBiomass: 5 },
      },
    };

    hazardManager.update(0, reducedTerraforming);

    expect(land.getReservedAmountForSource('hazardousBiomass')).toBeCloseTo(3);
    expect(land.reserved).toBeCloseTo(5);

    const clearedTerraforming = {
      zonalSurface: {
        tropical: { hazardousBiomass: 0 },
        temperate: { hazardousBiomass: 0 },
        polar: { hazardousBiomass: 0 },
      },
    };

    hazardManager.update(0, clearedTerraforming);

    expect(land.getReservedAmountForSource('hazardousBiomass')).toBe(0);
    expect(land.reserved).toBeCloseTo(2);
  });
});
