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

function createTerraformingInstance() {
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
    hasNaturalMagnetosphere: false,
    parentBody: {}
  };

  const terraforming = new Terraforming(resources, celestialParameters);
  terraforming.getTemperatureStatus = () => true;
  terraforming.getAtmosphereStatus = () => true;
  terraforming.getWaterStatus = () => true;
  terraforming.getLuminosityStatus = () => true;
  terraforming.getLifeStatus = () => true;
  terraforming.getMagnetosphereStatus = () => true;
  return terraforming;
}

describe('Terraforming hazardous biomass requirement', () => {
  test('getHazardClearanceStatus requires all zones to be clear', () => {
    const terraforming = createTerraformingInstance();
    expect(terraforming.getHazardClearanceStatus()).toBe(true);

    terraforming.zonalSurface.polar.hazardousBiomass = 5;
    expect(terraforming.getHazardClearanceStatus()).toBe(false);

    terraforming.zonalSurface.polar.hazardousBiomass = 0;
    expect(terraforming.getHazardClearanceStatus()).toBe(true);
  });

  test('getTerraformingStatus fails when hazardous biomass remains', () => {
    const terraforming = createTerraformingInstance();
    expect(terraforming.getTerraformingStatus()).toBe(true);

    terraforming.zonalSurface.temperate.hazardousBiomass = 3;
    expect(terraforming.getTerraformingStatus()).toBe(false);

    terraforming.zonalSurface.temperate.hazardousBiomass = 0;
    expect(terraforming.getTerraformingStatus()).toBe(true);
  });
});
