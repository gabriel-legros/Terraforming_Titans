function cloneSpecialSeedValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function isSpecialSeedObject(item) {
  return item && item.constructor === Object;
}

function mergeSpecialSeedData(target, source) {
  const output = { ...target };
  if (!isSpecialSeedObject(target) || !isSpecialSeedObject(source)) {
    return output;
  }
  Object.keys(source).forEach((key) => {
    const targetValue = target[key];
    const sourceValue = source[key];
    if (isSpecialSeedObject(targetValue) && isSpecialSeedObject(sourceValue)) {
      output[key] = mergeSpecialSeedData(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      output[key] = sourceValue;
    }
  });
  return output;
}

let specialSeedDefaultPlanetParameters;
try {
  specialSeedDefaultPlanetParameters = defaultPlanetParameters;
} catch (error) {
  try {
    ({ defaultPlanetParameters: specialSeedDefaultPlanetParameters } = require('./planet-parameters.js'));
  } catch (innerError) {
    specialSeedDefaultPlanetParameters = {};
  }
}

function normalizeSpecialSeedKey(seedInput) {
  const seedText = String(seedInput || '');
  const base = seedText.split('|')[0];
  return base.trim().toLowerCase();
}

const wolfysNightmareOverrides = {
  name: 'WolfysNightmare',
  effects: [
    {
      target: 'project',
      targetId: 'lifters',
      type: 'booleanFlag',
      flagId: 'disableAtmosphereStripMode',
      value: true
    },
    {
      target: 'building',
      targetId: 'trashIncinerator',
      type: 'booleanFlag',
      flagId: 'disableHazardousBiomassIncineratorRecipe',
      value: true
    }
  ],
  resources: {
    surface: {
      land: { initialValue: 100_000_000_000 },
      ice: { initialValue: 0, unlocked: true },
      liquidWater: { initialValue: 0, unlocked: true },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 }
    },
    underground: {
      ore: { initialValue: 5, maxDeposits: 46000, areaTotal: 460000 },
      geothermal: { initialValue: 3, maxDeposits: 460, areaTotal: 460000 }
    },
    atmospheric: {
      carbonDioxide: { initialValue: 4605804686102386000 },
      atmosphericWater: { initialValue: 100000000000000 },
      atmosphericMethane: { initialValue: 0 },
      oxygen: { initialValue: 325000000000 },
      inertGas: { initialValue: 170000000000000000 },
      hydrogen: { initialValue: 0 },
      sulfuricAcid: { initialValue: 454964769286360.34 }
    }
  },
  zonalSurface: {
    tropical: {
      liquidWater: 0,
      ice: 0,
      buriedIce: 0,
      dryIce: 0,
      buriedDryIce: 0,
      liquidCO2: 0,
      biomass: 0,
      hazardousBiomass: 0,
      liquidMethane: 0,
      hydrocarbonIce: 0,
      buriedHydrocarbonIce: 0
    },
    temperate: {
      liquidWater: 0,
      ice: 0,
      buriedIce: 0,
      dryIce: 0,
      buriedDryIce: 0,
      liquidCO2: 0,
      biomass: 0,
      hazardousBiomass: 0,
      liquidMethane: 0,
      hydrocarbonIce: 0,
      buriedHydrocarbonIce: 0
    },
    polar: {
      liquidWater: 0,
      ice: 0,
      buriedIce: 0,
      dryIce: 0,
      buriedDryIce: 0,
      liquidCO2: 0,
      biomass: 0,
      hazardousBiomass: 0,
      liquidMethane: 0,
      hydrocarbonIce: 0,
      buriedHydrocarbonIce: 0
    }
  },
  zonalTemperatures: {
    tropical: {
      value: 737.2822669140444,
      day: 738.5200836826394,
      night: 736.0444501454493
    },
    temperate: {
      value: 737.2265085698976,
      day: 738.2558491160473,
      night: 736.197168023748
    },
    polar: {
      value: 737.0664134185697,
      day: 737.6198110655876,
      night: 736.5130157715519
    }
  },
  hazards: {
    hazardousBiomass: {
      baseGrowth: { value: 1, maxDensity: 1 },
      invasivenessResistance: { value: 50, severity: 0.005 },
      oxygenPressure: { min: 0, max: 100, unit: 'kPa', severity: 0.01 },
      co2Pressure: { min: 0, max: 1_000_000, unit: 'kPa', severity: 0.01 },
      atmosphericPressure: { min: 0, max: 1_000_000, unit: 'kPa', severity: 0.002 },
      landPreference: { value: 'Land', severity: 0.01 },
      temperaturePreference: {
        min: 0,
        max: 2000,
        unit: 'K',
        severityBelow: 0,
        severityHigh: 0.005
      },
      radiationPreference: { min: 0, max: 5000, unit: 'mSv/day', severity: 0.1 },
      penalties: {
        buildCost: 0.75,
        maintenanceCost: 0.75,
        populationGrowth: 1
      }
    },
    garbage: {
      surfaceResources: {
        garbage: { amountMultiplier: 100000 },
        trash: { amountMultiplier: 10000 },
        junk: { amountMultiplier: 10000 },
        scrapMetal: { amountMultiplier: 10000 },
        radioactiveWaste: { amountMultiplier: 100 }
      },
      penalties: {
        garbage: { sandHarvesterMultiplier: 0.25, nanoColonyGrowthMultiplier: 0.1 },
        trash: { happiness: -0.05 },
        junk: { happiness: -0.05 },
        scrapMetal: { oreScanningSpeedMultiplier: 0.25 },
        radioactiveWaste: { lifeGrowthMultiplier: 0.1, androidAttrition: 0.05 }
      }
    },
    kessler: {
      orbitalDebrisPerLand: 10000
    },
    pulsar: {
      pulsePeriodSeconds: 1.337,
      stormDurationSeconds: 25,
      severity: 1,
      orbitalDoseBoost_mSvPerDay: 4900,
      description: 'The pulsar emits periodic radiation bursts across the system.'
    }
  },
  celestialParameters: {
    distanceFromSun: 0.683,
    gravity: 88.88,
    radius: 6051.8,
    mass: 4.867e24,
    albedo: 0.15,
    rotationPeriod: 5832,
    spinPeriod: 5832,
    starLuminosity: 1
  },
  visualization: {
    baseColor: '#7a6f5f',
  }
};

const specialSeedDefinitions = {
  wolfysnightmare: {
    key: 'wolfysnightmare',
    seed: 'WolfysNightmare',
    name: 'WolfysNightmare',
    replayable: true,
    target: 'planet',
    archetype: 'venus-like',
    orbitPreset: 'hot',
    specialEffects: [
      {
        id: 'lifters-no-strip',
        label: 'Lifters Strip Mode Disabled',
        description: 'Lifters cannot use Atmosphere Strip mode.'
      },
      {
        id: 'incinerator-no-hazardous-biomass',
        label: 'Incinerator Recipe Disabled',
        description: 'Trash Incinerator cannot run the Hazardous Biomass recipe.'
      }
    ],
    overrides: wolfysNightmareOverrides
  }
};

function getSpecialSeedDefinition(seedInput) {
  const key = normalizeSpecialSeedKey(seedInput);
  if (!key) return null;
  return specialSeedDefinitions[key] || null;
}

function getSpecialSeedParameters(seedInput) {
  const definition = getSpecialSeedDefinition(seedInput);
  if (!definition) return null;
  const base = cloneSpecialSeedValue(specialSeedDefaultPlanetParameters);
  return mergeSpecialSeedData(base, definition.overrides || {});
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getSpecialSeedDefinition,
    getSpecialSeedParameters,
    specialSeedDefinitions
  };
}
