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
  gravityPenaltyEnabled: true,
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
    gravity: 60.00,
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

const sculkBioworldOverrides = {
  name: 'Sculkia-1c',
  gravityPenaltyEnabled: true,
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
      land: { initialValue: 1316757505991 },
      ice: { initialValue: 0, unlocked: true },
      liquidWater: { initialValue: 2743435409868879000, unlocked: true },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 }
    },
    underground: {
      ore: { initialValue: 1, maxDeposits: 1563983, areaTotal: 13167575 },
      geothermal: { initialValue: 1, maxDeposits: 34096, areaTotal: 13167575 }
    },
    atmospheric: {
      carbonDioxide: { initialValue: 9448157302084.945 },
      inertGas: { initialValue: 16434814818624180 },
      oxygen: { initialValue: 3941201755581513.5 },
      atmosphericWater: { initialValue: 243652630307721 },
      atmosphericMethane: { initialValue: 0 },
      atmosphericAmmonia: { initialValue: 0 },
      hydrogen: { initialValue: 0 },
      sulfuricAcid: { initialValue: 0 },
      greenhouseGas: { initialValue: 663867488613.4543 }
    }
  },
  zonalSurface: {
    tropical: {
      liquidWater: 1637108748037122800,
      ice: 0,
      buriedIce: 0,
      dryIce: 0,
      buriedDryIce: 0,
      liquidCO2: 0,
      biomass: 0,
      hazardousBiomass: 0,
      liquidMethane: 0,
      hydrocarbonIce: 0,
      buriedHydrocarbonIce: 0,
      liquidAmmonia: 0,
      ammoniaIce: 0,
      buriedAmmoniaIce: 0,
      liquidOxygen: 0,
      oxygenIce: 0,
      buriedOxygenIce: 0,
      liquidNitrogen: 0,
      nitrogenIce: 0,
      buriedNitrogenIce: 0
    },
    temperate: {
      liquidWater: 1021524285785090300,
      ice: 0,
      buriedIce: 0,
      dryIce: 0,
      buriedDryIce: 0,
      liquidCO2: 0,
      biomass: 0,
      hazardousBiomass: 0,
      liquidMethane: 0,
      hydrocarbonIce: 0,
      buriedHydrocarbonIce: 0,
      liquidAmmonia: 0,
      ammoniaIce: 0,
      buriedAmmoniaIce: 0,
      liquidOxygen: 0,
      oxygenIce: 0,
      buriedOxygenIce: 0,
      liquidNitrogen: 0,
      nitrogenIce: 0,
      buriedNitrogenIce: 0
    },
    polar: {
      liquidWater: 84802376046665810,
      ice: 0,
      buriedIce: 0,
      dryIce: 0,
      buriedDryIce: 0,
      liquidCO2: 0,
      biomass: 0,
      hazardousBiomass: 0,
      liquidMethane: 0,
      hydrocarbonIce: 0,
      buriedHydrocarbonIce: 0,
      liquidAmmonia: 0,
      ammoniaIce: 0,
      buriedAmmoniaIce: 0,
      liquidOxygen: 0,
      oxygenIce: 0,
      buriedOxygenIce: 0,
      liquidNitrogen: 0,
      nitrogenIce: 0,
      buriedNitrogenIce: 0
    }
  },
  zonalTemperatures: {
    tropical: {
      value: 312.95908202099315,
      day: 313.49006755989285,
      night: 312.42809648209345
    },
    temperate: {
      value: 296.7907582504284,
      day: 297.23226667345676,
      night: 296.3492498274
    },
    polar: {
      value: 221.02631046698986,
      day: 223.21406544904085,
      night: 218.83855548493887
    }
  },
  hazards: {
    hazardousBiomass: {
      baseGrowth: { value: 2.5, maxDensity: 500000 },
      invasivenessResistance: { value: 100, severity: 0.005 },
      oxygenPressure: { min: 0, max: 1000, unit: 'kPa', severity: 0.001 },
      co2Pressure: { min: 0, max: 1_000_000, unit: 'kPa', severity: 0.000001 },
      atmosphericPressure: { min: 0, max: 10_000_000, unit: 'kPa', severity: 0.00000001 },
      landPreference: { value: 'Land', severity: 0 },
      temperaturePreference: {
        min: 0,
        max: 2273.15,
        unit: 'K',
        severityBelow: 0,
        severityHigh: 0.001
      },
      radiationPreference: { min: 0, max: 2500, unit: 'mSv/day', severity: 0.001 },
      penalties: {
        buildCost: -0.5,
        maintenanceCost: 9,
        populationGrowth: 1
      }
    },
    garbage: {
      surfaceResources: {
        trash: { amountMultiplier: 6e6 },
        junk: { amountMultiplier: 3e6 },
        scrapMetal: { amountMultiplier: 995000 },
        radioactiveWaste: { amountMultiplier: 5000 }
      },
      penalties: {
        trash: { happiness: -0.1 },
        junk: { sandHarvesterMultiplier: 0.01 },
        scrapMetal: { oreScanningSpeedMultiplier: 0.01 },
        radioactiveWaste: { lifeGrowthMultiplier: 0.0001, androidAttrition: 0.01 }
      }
    }
  },
  celestialParameters: {
    distanceFromSun: 34.37936474691796,
    gravity: 64,
    radius: 32370.39279433107,
    mass: 1.0046610551376063e+27,
    albedo: 0.3,
    rotationPeriod: 20,
    spinPeriod: 20,
    starLuminosity: 1288.5132072644535,
    surfaceArea: 13167575059912044
  },
  star: {
    name: 'Sculkia-1',
    spectralType: 'B',
    luminositySolar: 1288.5132072644535,
    massSolar: 7.737431572307832,
    radiusSolar: 5.138986265795898,
    temperatureK: 15255,
    habitableZone: {
      inner: 34.10107285051556,
      outer: 49.177336637059284
    }
  },
  visualization: {
    baseColor: '#24376f'
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
  },
  sculkbioworld: {
    key: 'sculkbioworld',
    seed: 'SculkBioworld',
    name: 'Sculkia-1c',
    replayable: true,
    target: 'planet',
    archetype: 'chthonian',
    orbitPreset: 'hz-inner',
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
    overrides: sculkBioworldOverrides
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
