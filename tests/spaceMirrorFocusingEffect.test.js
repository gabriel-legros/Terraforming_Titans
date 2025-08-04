const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');
const dryIce = require('../src/js/dry-ice-cycle.js');
global.Project = class {};
global.projectElements = {};
const { mirrorOversightSettings } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
mirrorOversightSettings.distribution.focus = 1;
mirrorOversightSettings.applyToLantern = false;

// set up required globals for terraforming.js
const flags = new Set(['spaceMirrorFocusing', 'spaceMirrorFacilityOversight']);
global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.projectManager = {
  isBooleanFlagSet: id => flags.has(id),
  projects: { spaceMirrorFacility: { isBooleanFlagSet: id => flags.has(id) } }
};
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.calculateEmissivity = physics.calculateEmissivity;
global.dayNightTemperaturesModel = physics.dayNightTemperaturesModel;
global.effectiveTemp = physics.effectiveTemp;
global.surfaceAlbedoMix = physics.surfaceAlbedoMix;
global.airDensity = physics.airDensity;

global.sublimationRateCO2 = dryIce.sublimationRateCO2;
global.calculateCO2CondensationRateFactor = dryIce.calculateCO2CondensationRateFactor;

global.C_P_AIR = 1004;
global.EPSILON = 0.622;
global.R_AIR = 287;

const Terraforming = require('../src/js/terraforming.js');

global.buildings = { spaceMirror: { surfaceArea: 0, active: 1 } };

function createResources() {
  return {
    atmospheric: {
      atmosphericWater: { value: 0, modifyRate: jest.fn() },
      carbonDioxide: { value: 0, modifyRate: jest.fn() }
    },
    surface: {
      liquidWater: { value: 0, modifyRate: jest.fn() },
      ice: { value: 10, modifyRate: jest.fn() },
      dryIce: { value: 0, modifyRate: jest.fn() }
    },
    colony: {},
    special: { albedoUpgrades: { value: 0 } }
  };
}

describe('focused mirror melt', () => {
  test('focusing converts ice to water using mirror power', () => {
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    const res = createResources();
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues();

    // simplify environment: no water except polar ice and set cold zone temps
    for (const z of ['tropical','temperate','polar']) {
      terra.zonalWater[z].liquid = 0;
      terra.zonalWater[z].ice = 0;
      terra.zonalWater[z].buriedIce = 0;
      terra.zonalSurface[z] = { dryIce: 0 };
      terra.temperature.zones[z].value = 150;
      terra.temperature.zones[z].day = 150;
      terra.temperature.zones[z].night = 150;
    }
    terra.zonalWater.polar.ice = 10;
    res.surface.liquidWater.value = 0;
    res.surface.ice.value = 10;

    // set global average temperature below freezing for energy calc
    terra.temperature.value = 263;

    // stub power sources
    terra.calculateMirrorEffect = () => ({ interceptedPower: 1e9, powerPerUnitArea: 0 });
    terra.calculateLanternFlux = () => 0;

    terra.updateResources(1000);

    const deltaT = 273.15 - terra.temperature.value;
    const energyPerKg = 2100 * deltaT + 334000;
    const meltKgPerSec = 1e9 / energyPerKg;
    const durationSeconds = 86400; // in-game seconds per tick
    const potentialMelt = meltKgPerSec * durationSeconds / 1000;
    const expectedMelt = Math.min(potentialMelt, 10);
    const expectedRate = expectedMelt; // rate per day equals amount melted
    const waterCall = res.surface.liquidWater.modifyRate.mock.calls.find(c => c[1] === 'Focused Melt');
    const iceCall = res.surface.ice.modifyRate.mock.calls.find(c => c[1] === 'Focused Melt');
    expect(waterCall).toBeDefined();
    expect(iceCall).toBeDefined();
    expect(waterCall[0]).toBeCloseTo(expectedRate, 5);
    expect(iceCall[0]).toBeCloseTo(-expectedRate, 5);
    expect(res.surface.liquidWater.value).toBeCloseTo(expectedMelt, 5);
    expect(res.surface.ice.value).toBeCloseTo(10 - expectedMelt, 5);
  });

  test('focusing does nothing without surface ice', () => {
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    const res = createResources();
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues();

    for (const z of ['tropical','temperate','polar']) {
      terra.zonalWater[z].liquid = 0;
      terra.zonalWater[z].ice = 0;
      terra.zonalWater[z].buriedIce = 10;
      terra.zonalSurface[z] = { dryIce: 0 };
      terra.temperature.zones[z].value = 150;
      terra.temperature.zones[z].day = 150;
      terra.temperature.zones[z].night = 150;
    }
    res.surface.liquidWater.value = 0;
    res.surface.ice.value = 0;

    terra.temperature.value = 263;

    const deltaT = 273.15 - terra.temperature.value;
    const energyPerKg = 2100 * deltaT + 334000;
    const desiredMelt = 5; // attempt
    const durationSeconds = 86400;
    const interceptPower = desiredMelt * 1000 * energyPerKg / durationSeconds;
    terra.calculateMirrorEffect = () => ({ interceptedPower: interceptPower, powerPerUnitArea: 0 });
    terra.calculateLanternFlux = () => 0;

    terra.updateResources(1000);

    expect(res.surface.liquidWater.value).toBeCloseTo(0, 5);
    expect(res.surface.ice.value).toBeCloseTo(0, 5);
  });
});
