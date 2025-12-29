const path = require('path');

global.EffectableEntity = class {
  constructor() {
    this.booleanFlags = new Set();
  }
  applyBooleanFlag() {}
  removeBooleanFlag() {}
  isBooleanFlagSet(flagId) {
    return this.booleanFlags.has(flagId);
  }
};

global.lifeParameters = {};

const Terraforming = require(path.join('..', 'src/js/terraforming/terraforming.js'));
const { HazardManager, setHazardManager } = require(path.join('..', 'src/js/terraforming/hazard.js'));

function createTerraformingInstance({ hasNaturalMagnetosphere = false } = {}) {
  const resources = {
    surface: {
      land: { value: 1 },
      liquidWater: { value: 0 },
      ice: { value: 0 },
      dryIce: { value: 0 },
      biomass: { value: 0 },
      hazardousBiomass: { value: 0 },
      liquidCO2: { value: 0 },
      liquidMethane: { value: 0 },
      hydrocarbonIce: { value: 0 }
    },
    atmospheric: {
      carbonDioxide: { value: 0 },
      oxygen: { value: 0 },
      inertGas: { value: 0 }
    }
  };

  const celestialParameters = {
    radius: 1,
    surfaceArea: 4 * Math.PI,
    crossSectionArea: Math.PI,
    gravity: 9.81,
    hasNaturalMagnetosphere,
    parentBody: {}
  };

  const terraforming = new Terraforming(resources, celestialParameters);
  terraforming.surfaceRadiation = 1;
  global.resources = resources;
  return terraforming;
}

function setupHazards(hazardParams) {
  const manager = new HazardManager();
  setHazardManager(manager);
  manager.initialize(hazardParams);
  return manager;
}

describe('Hazardous biomass radiation growth penalty', () => {
  test('skips radiation penalty when a natural magnetosphere is present', () => {
    const terraforming = createTerraformingInstance({ hasNaturalMagnetosphere: true });
    const manager = setupHazards({
      hazardousBiomass: {
        radiationPreference: { min: 0, max: 0.01, unit: 'mSv/day', severity: 0.1 }
      }
    });

    const penalty = manager.calculateHazardousBiomassGrowthPenalty(
      manager.parameters.hazardousBiomass,
      terraforming
    );
    expect(penalty).toBe(0);
  });

  test('applies radiation penalty when no magnetosphere exists', () => {
    const terraforming = createTerraformingInstance();
    const manager = setupHazards({
      hazardousBiomass: {
        radiationPreference: { min: 0, max: 0.01, unit: 'mSv/day', severity: 0.1 }
      }
    });

    const penalty = manager.calculateHazardousBiomassGrowthPenalty(
      manager.parameters.hazardousBiomass,
      terraforming
    );
    expect(penalty).toBeGreaterThan(0);
  });
});
