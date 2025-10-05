const { getZonePercentage, getZoneRatio } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const Terraforming = require('../src/js/terraforming.js');

const zoneMeans = { tropical: 310, temperate: 290, polar: 250 };
const zoneFluxByKey = { tropical: 1, temperate: 2, polar: 3 };

describe('temperature trend value', () => {
  const originalGlobals = {};

  beforeAll(() => {
    originalGlobals.getZonePercentage = global.getZonePercentage;
    originalGlobals.getZoneRatio = global.getZoneRatio;
    originalGlobals.EffectableEntity = global.EffectableEntity;
    originalGlobals.lifeParameters = global.lifeParameters;
    originalGlobals.projectManager = global.projectManager;
    originalGlobals.mirrorOversightSettings = global.mirrorOversightSettings;
    originalGlobals.calculateAtmosphericPressure = global.calculateAtmosphericPressure;
    originalGlobals.calculateEmissivity = global.calculateEmissivity;
    originalGlobals.dayNightTemperaturesModel = global.dayNightTemperaturesModel;
    originalGlobals.calculateZonalSurfaceFractions = global.calculateZonalSurfaceFractions;
    originalGlobals.autoSlabHeatCapacity = global.autoSlabHeatCapacity;
    originalGlobals.calculateEffectiveAtmosphericHeatCapacityHelper = global.calculateEffectiveAtmosphericHeatCapacityHelper;
    originalGlobals.effectiveTemp = global.effectiveTemp;

    global.getZonePercentage = getZonePercentage;
    global.getZoneRatio = getZoneRatio;
    global.EffectableEntity = EffectableEntity;
    global.lifeParameters = lifeParameters;
    global.projectManager = {
      projects: { megaHeatSink: { repeatCount: 0 } },
      isBooleanFlagSet: () => false,
    };
    global.mirrorOversightSettings = {};
    global.calculateAtmosphericPressure = () => 0;
    global.calculateEmissivity = () => ({ emissivity: 1, tau: 0, contributions: {} });
    global.dayNightTemperaturesModel = ({ flux }) => {
      const zone = Object.keys(zoneFluxByKey).find((key) => zoneFluxByKey[key] === flux);
      const mean = zone ? zoneMeans[zone] : 0;
      return {
        mean,
        day: mean + 5,
        night: mean - 5,
        equilibriumTemperature: mean - 2,
        albedo: 0.3,
      };
    };
    global.calculateZonalSurfaceFractions = () => ({
      ocean: 0,
      ice: 0,
      hydrocarbon: 0,
      hydrocarbonIce: 0,
      co2_ice: 0,
      biomass: 0,
    });
    global.autoSlabHeatCapacity = () => 1000;
    global.calculateEffectiveAtmosphericHeatCapacityHelper = () => 0;
    global.effectiveTemp = () => 0;
  });

  afterAll(() => {
    global.getZonePercentage = originalGlobals.getZonePercentage;
    global.getZoneRatio = originalGlobals.getZoneRatio;
    global.EffectableEntity = originalGlobals.EffectableEntity;
    global.lifeParameters = originalGlobals.lifeParameters;
    global.projectManager = originalGlobals.projectManager;
    global.mirrorOversightSettings = originalGlobals.mirrorOversightSettings;
    global.calculateAtmosphericPressure = originalGlobals.calculateAtmosphericPressure;
    global.calculateEmissivity = originalGlobals.calculateEmissivity;
    global.dayNightTemperaturesModel = originalGlobals.dayNightTemperaturesModel;
    global.calculateZonalSurfaceFractions = originalGlobals.calculateZonalSurfaceFractions;
    global.autoSlabHeatCapacity = originalGlobals.autoSlabHeatCapacity;
    global.calculateEffectiveAtmosphericHeatCapacityHelper = originalGlobals.calculateEffectiveAtmosphericHeatCapacityHelper;
    global.effectiveTemp = originalGlobals.effectiveTemp;
  });

  test('stores weighted trend temperature', () => {
    const resources = { atmospheric: {} };
    global.resources = resources;
    global.buildings = {
      spaceMirror: { surfaceArea: 0, active: 0 },
      hyperionLantern: { active: 0 },
    };

    const tf = new Terraforming(resources, {
      radius: 1,
      distanceFromSun: 1,
      gravity: 1,
      surfaceArea: 1,
    });

    tf.calculateZoneSolarFlux = (zone) => zoneFluxByKey[zone];

    tf.updateSurfaceTemperature();

    const expected = Object.keys(zoneMeans).reduce(
      (sum, zone) => sum + zoneMeans[zone] * getZonePercentage(zone),
      0,
    );

    expect(tf.temperature.trendValue).toBeCloseTo(expected, 6);
    Object.keys(zoneMeans).forEach((zone) => {
      expect(tf.temperature.zones[zone].trendValue).toBeCloseTo(zoneMeans[zone], 6);
    });
  });
});
