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
  "zonalTemperatures": {
    "tropical": {
      "value": 1240.859476178724,
      "day": 1241.075362447589,
      "night": 1240.643589909859
    },
    "temperate": {
      "value": 1240.7701490684287,
      "day": 1240.9487351173025,
      "night": 1240.591563019555
    },
    "polar": {
      "value": 1240.5066376920938,
      "day": 1240.6017215261663,
      "night": 1240.4115538580213
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

const titaniaOverrides = {
  name: '',
  specialAttributes: {
    dynamicMass: true,
    otherRequirements: [
      {
        type: 'gravityMinimum',
        minimum: 2,
        labelKey: 'catalogs.specialSeeds.titania.otherRequirements.gravityMinimum.label',
        targetTextKey: 'catalogs.specialSeeds.titania.otherRequirements.gravityMinimum.targetText'
      }
    ]
  },
  resources: {
    surface: {
      land: { initialValue: 781_000_000 },
    },
 "atmospheric": {
      "carbonDioxide": {
        "initialValue": 0
      },
      "atmosphericWater": {
        "initialValue": 6.673998878081245e-8
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 0
      },
      "inertGas": {
        "initialValue": 0
      },
      "hydrogen": {
        "initialValue": 0
      },
      "sulfuricAcid": {
        "initialValue": 0
      }
    }
  },
  "zonalSurface": {
    "tropical": {
      "liquidWater": 0,
      "ice": 9879.437360999556,
      "buriedIce": 450000000000000,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 12716.873650810385,
      "buriedIce": 4050000000000000,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 28349999999977096,
      "buriedIce": 12150000000000000,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 61.9407723636663,
      "day": 63.58396551780543,
      "night": 60.297579209527164
    },
    "temperate": {
      "value": 57.53574008353115,
      "day": 58.90218250184512,
      "night": 56.16929766521719
    },
    "polar": {
      "value": 37.35212301190944,
      "day": 38.49194428247549,
      "night": 36.212301741343396
    }
  },
  celestialParameters: {
    distanceFromSun: 19.2,
    gravity: 0.367,
    baseGravity: 0.367,
    radius: 788.9,
    baseRadius: 788.9,
    mass: 3.422191062284e21,
    baseMass: 3.422191062284e21,
    basePlanetaryMass: null,
    basePlanetaryVolumeM3: null,
    albedo: 0.27,
    rotationPeriod: 209.0,
    spinPeriod: 209.0,
    starLuminosity: 1,
    sector: 'R5-07',
    parentBody: {
      name: 'Uranus',
      radius: 25_362,
      mass: 8.681e25,
      orbitRadius: 435_910,
      refDistance_Rp: 17.2,
      parentBeltAtRef_mSvPerDay: 2.5,
      beltFalloffExp: 6
    }
  },
  zonalSurface: {
    tropical: {
      liquidWater: 0,
      ice: 0,
      buriedIce: 450_000_000_000_000,
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
      buriedIce: 4_050_000_000_000_000,
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
      ice: 28_350_000_000_000_000,
      buriedIce: 12_150_000_000_000_000,
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
  zonalTemperatures: null,
  visualization: {
    baseColor: '#b7a994'
  }
};

const theRealPoseidonOverrides = {
  name: 'TheRealPoseidon',
  star: {
    name: 'Nereid',
    spectralType: 'K1V',
    luminositySolar: 0.46,
    massSolar: 0.84,
    temperatureK: 5100,
    habitableZone: { inner: 0.67, outer: 1.05 }
  },
  celestialParameters: {
    distanceFromSun: 2.9,
    gravity: 10.5,
    hasNaturalMagnetosphere: true,
    radius: 7600,
    mass: 1.31e25,
    baseLand: 72_500_000_000,
    albedo: 0.08,
    rotationPeriod: 21.8,
    spinPeriod: 21.8,
    starLuminosity: 0.46,
    coreHeatFlux: 250_000,
    sector: 'R5-10'
  },
  visualization: {
    baseColor: '#8b3c21',
  },
  effects: [
    {
      target: 'building',
      targetId: 'foundry',
      type: 'enable'
    },
    {
      target: 'project',
      targetId: 'spaceStorage',
      type: 'booleanFlag',
      flagId: 'disableWithdrawal',
      value: true
    },
    {
      target: 'project',
      targetId: 'megaHeatSink',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'therealposeidon-disable-mega-heat-sink'
    }
  ],
  resources: {
    surface: {
      land: { initialValue: 72_500_000_000, baseLand: 72_500_000_000 },
      liquidWater: { initialValue: 0 },
      ice: { initialValue: 0 },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 },
      biomass: { initialValue: 0 },
      hazardousBiomass: { initialValue: 0 }
    },
    underground: {
      ore: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
      geothermal: { initialValue: 72_500_000_000, maxDeposits: 72_500_000_000, areaTotal: 72500000000 }
    },
    atmospheric: {
      carbonDioxide: { initialValue: 0 },
      atmosphericWater: { initialValue: 1_001_000_000_000_000_000 },
      atmosphericMethane: { initialValue: 0 },
      oxygen: { initialValue: 0 },
      inertGas: { initialValue: 50_000_000_000_000_000 },
      hydrogen: { initialValue: 0 },
      sulfuricAcid: { initialValue: 0 }
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
  zonalTemperatures: null
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
      target: 'project',
      targetId: 'planetaryThruster',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'sculkbioworld-disable-planetary-thrusters'
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
      greenhouseGas: { initialValue: 663867488613.4543, unlocked: true }
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
      oxygenPressure: { min: 0, max: 1_000_000, unit: 'kPa', severity: 0.000001 },
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
      decay: {
        surface: {
          trash: 0.6,
          junk: 0.3,
          scrapMetal: 0.995,
          radioactiveWaste: 0.005
        }
      },
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

const earthOverrunOverrides = {
  name: 'EarthOverrun',
  gravityPenaltyEnabled: false,
  specialAttributes: {
    skipEquilibration: true
  },
  effects: [
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
      land: { initialValue: 51007200000 },
      ice: { initialValue: 0, unlocked: true },
      liquidWater: { initialValue: 1.386e18, unlocked: true },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 }
    },
    underground: {
      ore: { initialValue: 15_000, maxDeposits: 150_000, areaTotal: 200_000_000 },
      geothermal: { initialValue: 10_000, maxDeposits: 20_000, areaTotal: 20_000_000 }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 2056831169131.2002
      },
      "atmosphericWater": {
        "initialValue": 18874743689210.16
      },
      "atmosphericMethane": {
        "initialValue": 9882092383
      },
      "oxygen": {
        "initialValue": 1109477074900000
      },
      "inertGas": {
        "initialValue": 4112001053800000
      },
      "hydrogen": {
        "initialValue": 0
      },
      "sulfuricAcid": {
        "initialValue": 0
      }
    }
  },
  "zonalSurface": {
    "tropical": {
      "liquidWater": 552669895738704700,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 2033907348854.644,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0
    },
    "temperate": {
      "liquidWater": 718384395470084900,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 2643759309177.7793,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0
    },
    "polar": {
      "liquidWater": 1.5087540313075096e-89,
      "ice": 114993408143605650,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 423053336967.61584,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 291.6640961434312,
      "day": 291.80616701998656,
      "night": 291.52202526687586
    },
    "temperate": {
      "value": 286.74499253134843,
      "day": 286.8631352832809,
      "night": 286.626849779416
    },
    "polar": {
      "value": 261.6309761375806,
      "day": 262.9052410488269,
      "night": 260.3567112263343
    }
  },
  hazards: {
    hazardousBiomass: {
      baseGrowth: { value: 1, maxDensity: 100 },
      invasivenessResistance: { value: 10, severity: 0.005 },
      oxygenPressure: { min: 18, max: 55, unit: 'kPa', severity: 0.01 },
      co2Pressure: { min: 0, max: 5, unit: 'kPa', severity: 0.01 },
      atmosphericPressure: { min: 50, max: 110, unit: 'kPa', severity: 0.002 },
      landPreference: { value: 'Land', severity: 0 },
      temperaturePreference: {
        min: 260,
        max: 315,
        unit: 'K',
        severityBelow: 0.005,
        severityHigh: 0.005
      },
      radiationPreference: { min: 0, max: 0.5, unit: 'mSv/day', severity: 0.1 },
      penalties: {
        buildCost: 2,
        maintenanceCost: 1,
        populationGrowth: 1
      }
    }
  },
  celestialParameters: {
    distanceFromSun: 1,
    gravity: 9.807,
    hasNaturalMagnetosphere: true,
    radius: 6371,
    mass: 5.972e+24,
    albedo: 0.05,
    rotationPeriod: 24,
    spinPeriod: 24,
    starLuminosity: 1,
    surfaceArea: 510072000000000
  },
  star: {
    name: 'Sun',
    spectralType: 'G',
    luminositySolar: 1,
    massSolar: 1,
    radiusSolar: 1,
    temperatureK: 5772,
    habitableZone: {
      inner: 0.82,
      outer: 1.17
    }
  },
  visualization: {
    baseColor: '#878a81'
  }
};

const specialSeedDefinitions = {
  titania: {
    key: 'titania',
    seed: 'Titania',
    name: 'Titania',
    nameKey: 'catalogs.specialSeeds.titania.name',
    difficultyRating: '?',
    replayable: true,
    target: 'moon',
    archetype: 'icy-moon',
    orbitPreset: 'very-cold',
    specialEffects: [
      {
        id: 'dynamic-mass-low-gravity',
        descriptionKey: 'catalogs.specialSeeds.titania.effects.dynamicMassLowGravity',
        description: 'Gravity is low, but can be increased by adding mass.'
      }
    ],
    completionRewards: [
      {
        id: 'enable-rwg-dynamic-mass',
        descriptionKey: 'catalogs.specialSeeds.titania.rewards.enableDynamicMass',
        description: 'Allows the generation of worlds with dynamic mass in the RWG.',
        effects: [
          {
            target: 'rwgManager',
            type: 'booleanFlag',
            flagId: 'enableDynamicMass',
            value: true
          }
        ]
      }
    ],
    overrides: titaniaOverrides
  },
  wolfysnightmare: {
    key: 'wolfysnightmare',
    seed: 'WolfysNightmare',
    name: 'WolfysNightmare',
    difficultyRating: '?',
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
  therealposeidon: {
    key: 'therealposeidon',
    seed: 'TheRealPoseidon',
    name: 'TheRealPoseidon',
    nameKey: 'catalogs.specialSeeds.therealposeidon.name',
    difficultyRating: '?',
    replayable: true,
    target: 'planet',
    archetype: 'molten',
    orbitPreset: 'outer',
    specialEffects: [
      {
        id: 'steam-atmosphere',
        descriptionKey: 'catalogs.specialSeeds.therealposeidon.effects.steamAtmosphere',
        description: 'Uses Poseidon parameters, but all starting carbon dioxide is replaced with water vapour.'
      },
      {
        id: 'space-storage-no-withdrawal',
        descriptionKey: 'catalogs.specialSeeds.therealposeidon.effects.noSpaceWithdrawal',
        description: 'Space Storage cannot withdraw any resources on this world.'
      },
      {
        id: 'mega-heat-sink-disabled',
        descriptionKey: 'catalogs.specialSeeds.therealposeidon.effects.megaHeatSinkDisabled',
        description: 'Mega Heat Sink is permanently disabled on this world.'
      }
    ],
    overrides: theRealPoseidonOverrides
  },
  sculkbioworld: {
    key: 'sculkbioworld',
    seed: 'SculkBioworld',
    name: 'Sculkia-1c',
    designer: 'JamesM',
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
        id: 'planetary-thrusters-disabled',
        label: 'Planetary Thrusters Disabled',
        description: 'Planetary Thrusters are permanently disabled on this world.'
      },
      {
        id: 'incinerator-no-hazardous-biomass',
        label: 'Incinerator Recipe Disabled',
        description: 'Trash Incinerator cannot run the Hazardous Biomass recipe.'
      }
    ],
    overrides: sculkBioworldOverrides
  },
  earthoverrun: {
    key: 'earthoverrun',
    seed: 'EarthOverrun',
    name: 'EarthOverrun',
    designer: 'Off Kinter Space',
    replayable: true,
    target: 'planet',
    archetype: 'super-earth',
    orbitPreset: 'hz-inner',
    specialEffects: [
      {
        id: 'incinerator-no-hazardous-biomass',
        label: 'Incinerator Recipe Disabled',
        description: 'Trash Incinerator cannot run the Hazardous Biomass recipe.'
      }
    ],
    overrides: earthOverrunOverrides
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

function getAllSpecialSeedDefinitions() {
  return Object.values(specialSeedDefinitions).map((definition) => cloneSpecialSeedValue(definition));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getSpecialSeedDefinition,
    getSpecialSeedParameters,
    getAllSpecialSeedDefinitions,
    specialSeedDefinitions
  };
}
