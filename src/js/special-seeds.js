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
  star: {
    name: 'Sol',
    spectralType: 'G2V',
    luminositySolar: 1,
    massSolar: 1,
    radiusSolar: 1,
    temperatureK: 5778,
    habitableZone: {
      inner: 0.95,
      outer: 1.4
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

const hermesOverrides = {
  name: 'Hermes',
  resources: {
    surface: {
      land: { initialValue: 7_480_000_000, baseLand: 7_480_000_000 },
      liquidWater: { initialValue: 0, unlocked: true },
      ice: { initialValue: 0, unlocked: true },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 },
      biomass: { initialValue: 0 },
      hazardousBiomass: { initialValue: 0 }
    },
    underground: {
      ore: { initialValue: 4, maxDeposits: 7480, areaTotal: 74800 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 }
    },
    atmospheric: {
      carbonDioxide: { initialValue: 0 },
      atmosphericWater: { initialValue: 0 },
      atmosphericMethane: { initialValue: 0 },
      oxygen: { initialValue: 0 },
      inertGas: { initialValue: 0 },
      hydrogen: { initialValue: 0 },
      sulfuricAcid: { initialValue: 0 }
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 461.19518202407806,
      "day": 988.2034079760015,
      "night": 115.29879550601952
    },
    "temperate": {
      "value": 428.39643595092133,
      "day": 866.6446071583973,
      "night": 107.09910898773033
    },
    "polar": {
      "value": 334.2236211677123,
      "day": 569.8361282852608,
      "night": 98.61111405016379
    }
  },
  celestialParameters: {
    distanceFromSun: 0.387098,
    gravity: 3.7,
    radius: 2439.7,
    mass: 3.3011e23,
    baseLand: 7_480_000_000,
    albedo: 0.088,
    rotationPeriod: 4222.6,
    spinPeriod: 1407.6,
    starLuminosity: 1,
    surfaceArea: 74_800_000_000_000
  },
  star: {
    name: 'Helios',
    spectralType: 'G2V',
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
    baseColor: '#8c8277'
  },
  effects: [
    {
      target: 'project',
      targetId: 'spaceMirrorFacility',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'hermes-disable-space-mirror-facility'
    },
    {
      target: 'building',
      targetId: 'spaceMirror',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'hermes-disable-space-mirrors'
    },
    {
      target: 'building',
      targetId: 'hyperionLantern',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'hermes-disable-hyperion-lanterns'
    },
    {
      target: 'project',
      targetId: 'planetaryThruster',
      type: 'booleanFlag',
      flagId: 'disableTractorBeams',
      value: true,
      effectId: 'hermes-disable-tractor-beams'
    },
    {
      target: 'building',
      targetId: 'ghgFactory',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'hermes-disable-calcite-factory'
    }
  ]
};

const toi3693bOverrides = {
  name: 'TOI-3693 b',
  gravityPenaltyEnabled: true,
  specialAttributes: {
    hasSand: false,
    dynamicMass: true
  },
  star: {
    name: 'TOI-3693',
    spectralType: 'G',
    luminositySolar: 0.45,
    massSolar: 0.87,
    radiusSolar: 0.79,
    temperatureK: 5321,
    habitableZone: {
      inner: 0.67,
      outer: 1.05
    }
  },
  visualization: {
    baseColor: '#c28a52'
  },
  resources: {
    surface: {
      ice: {
        initialValue: 0
      },
      liquidWater: {
        initialValue: 0
      },
      dryIce: {
        initialValue: 0
      },
      liquidCO2: {
        initialValue: 0
      },
      liquidHydrogen: {
        initialValue: 1.6932223190081314e+24
      },
      liquidMethane: {
        initialValue: 0
      },
      hydrocarbonIce: {
        initialValue: 0
      },
      liquidOxygen: {
        initialValue: 0
      },
      oxygenIce: {
        initialValue: 0
      },
      liquidNitrogen: {
        initialValue: 0
      },
      nitrogenIce: {
        initialValue: 0
      },
      land: {
        initialValue: 6291545240475.356
      }
    },
    underground: {
      ore: {
        initialValue: 0,
        maxDeposits: 0,
        areaTotal: 0
      },
      geothermal: {
        initialValue: 0,
        maxDeposits: 0,
        areaTotal: 0
      }
    },
"atmospheric": {
      "carbonDioxide": {
        "initialValue": 0
      },
      "atmosphericWater": {
        "initialValue": 183600000000000000
      },
      "atmosphericMethane": {
        "initialValue": 742000000000000000
      },
      "atmosphericAmmonia": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 0
      },
      "inertGas": {
        "initialValue": 52700000000000000000
      },
      "hydrogen": {
        "initialValue": 2.4921255605318254e+22
      },
      "sulfuricAcid": {
        "initialValue": 0
      }
    }
  },
  "zonalSurface": {
    "tropical": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 6.749993487125215e+23,
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
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 8.773928728132986e+23,
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
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 1.4040006644580202e+23,
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
      "value": 2960.7434990025017,
      "day": 2960.800788804981,
      "night": 2960.6862092000224
    },
    "temperate": {
      "value": 2960.7423204746906,
      "day": 2960.784996204368,
      "night": 2960.6996447450133
    },
    "polar": {
      "value": 2960.74015536921,
      "day": 2960.755983248225,
      "night": 2960.7243274901944
    }
  },
  "celestialParameters": {
    "distanceFromSun": 0.0813,
    "hasNaturalMagnetosphere": true,
    "albedo": 0.487,
    "rotationPeriod": 218.273784,
    "spinPeriod": 218.273784,
    "starLuminosity": 0.46,
    "coreHeatFlux": 4112684,
    "surfaceArea": 64449637145711544,
    "crossSectionArea": 16112409286427886,
    "baseLand": 6446017135381.483,
    "baseRadius": 70738,
    "baseMass": 1.8726e+27,
    "baseGravity": 24.977282698856314,
    "basePlanetaryMass": 2.182328308239878e+26,
    "basePlanetaryVolumeM3": 5.361937984673442e+22,
    "baseSurfaceMassKg": 1.6932223190081315e+27,
    "baseAtmosphericMassKg": 2.45448501678809e+25,
    "dynamicDirectMassDeltaKg": 0,
    "dynamicDirectVolumeDeltaM3": 0,
    "dynamicMassDeltaKg": 6.34000000009281e+25,
    "dynamicSurfaceVolumeDeltaM3": 5.5846568396159575e+22,
    "currentPlanetaryMassKg": 2.182328308239878e+26,
    "currentSurfaceMassKg": 1.692792287971622e+27,
    "currentAtmosphericMassKg": 2.4974881205318252e+25,
    "currentPlanetaryVolumeM3": 5.361937984673442e+22,
    "currentSurfaceVolumeM3": 1.4849055157645806e+24,
    "mass": 1.9360000000009282e+27,
    "radius": 71615.21602361828,
    "gravity": 25.194193702402615,
    "sector": "R5-07"
  },
  hazards: {
    pulsar: {
      pulsePeriodSeconds: 1.337,
      stormDurationSeconds: 2,
      stormIntervalSeconds: 7.094741,
      severity: 0.25,
      orbitalDoseBoost_mSvPerDay: 50,
      clearAtDistanceAU: 1,
      description: 'Intense solar flares generate periodic radiation bursts across the system. The hazard can be cleared by moving the world beyond 1 AU.'
    }
  },
  effects: [
    {
      target: 'project',
      targetId: 'aerostatStructuralNet',
      type: 'enable'
    },
    {
      target: 'project',
      targetId: 'overpopulationOneillCylinders',
      type: 'enable'
    },
    {
      target: 'project',
      targetId: 'artificialSky',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'toi3693b-disable-artificial-sky'
    }
  ]
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
    baseLand: 72_583_356_668.53859,
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
      target: 'colony',
      targetId: 'aerostat_colony',
      type: 'booleanFlag',
      flagId: 'aerostats_powered_flight',
      value: false,
      effectId: 'therealposeidon-disable-aerostats-powered-flight'
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
      land: { initialValue: 72_583_356_668.53859, baseLand: 72_583_356_668.53859 },
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
      geothermal: { initialValue: 72_583_356_668.53859, maxDeposits: 72_583_356_668.53859, areaTotal: 72_583_356_668.53859 }
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
          scrapMetal: 0.0995,
          radioactiveWaste: 0.0005
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
      liquidWater: { initialValue: 644656795267087900, unlocked: true },
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
        "initialValue": 18678784443623.46
      },
      "atmosphericMethane": {
        "initialValue": 9882092383
      },
      "atmosphericAmmonia": {
        "initialValue": 0
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
      "liquidWater": 280304580319841150,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 0,
      "biomass": 0,
      "hazardousBiomass": 2033877330665.0093,
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
      "liquidWater": 364351819684932350,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 0,
      "biomass": 0,
      "hazardousBiomass": 2643720290257.687,
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
      "liquidWater": 395262314397.17847,
      "ice": 114178198844575490,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 0,
      "biomass": 0,
      "hazardousBiomass": 423047093171.4065,
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
      "value": 292.223771743476,
      "day": 292.38559470842,
      "night": 292.061948778532
    },
    "temperate": {
      "value": 286.6503936467183,
      "day": 286.7849616296886,
      "night": 286.51582566374805
    },
    "polar": {
      "value": 258.1925403339957,
      "day": 259.46768991923057,
      "night": 256.9173907487608
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
    spectralType: 'G2V',
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
    baseColor: '#878a81',
    heightMapKey: 'earth'
  }
};

const specialSeedDefinitions = {
  titania: {
    key: 'titania',
    seed: 'Titania',
    name: 'Titania',
    nameKey: 'catalogs.specialSeeds.titania.name',
    difficultyKey: 'catalogs.specialSeeds.titania.difficulty',
    difficultyRating: 'Hard+',
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
      },
      {
        id: 'reveal-nanotech-efficiency',
        descriptionKey: 'catalogs.specialSeeds.titania.rewards.revealNanotechEfficiency',
        description: 'Reveals the Nanotech Efficiency awakening skill.',
        effects: [
          {
            target: 'skillManager',
            targetId: 'nanotech_efficiency',
            type: 'skillReveal',
            value: true
          }
        ]
      }
    ],
    overrides: titaniaOverrides
  },
  hermes: {
    key: 'hermes',
    seed: 'Hermes',
    name: 'Hermes',
    nameKey: 'catalogs.specialSeeds.hermes.name',
    difficultyKey: 'catalogs.specialSeeds.hermes.difficulty',
    difficultyRating: 'Hard',
    replayable: true,
    target: 'planet',
    archetype: 'mars-like',
    orbitPreset: 'very-hot',
    specialEffects: [
      {
        id: 'star-proximity-disables-systems',
        descriptionKey: 'catalogs.specialSeeds.hermes.effects.starProximityDisablesSystems',
        description: 'Space Mirror Facility, Space Mirrors, Hyperion Lanterns, and Tractor Beams are permanently disabled on this world due to star proximity.'
      },
      {
        id: 'calcite-factories-disabled',
        descriptionKey: 'catalogs.specialSeeds.hermes.effects.calciteFactoriesDisabled',
        description: 'Calcite Factories are also disabled because HOPE is stubborn about certain things.'
      },
      {
        id: 'resembles-mercury',
        descriptionKey: 'catalogs.specialSeeds.hermes.effects.resemblesMercury',
        description: 'May resemble Mercury.'
      }
    ],
    completionRewards: [
      {
        id: 'unlock-very-hot-orbit',
        descriptionKey: 'catalogs.specialSeeds.hermes.rewards.unlockVeryHotOrbit',
        description: 'Unlocks Very Hot orbits in the Random World Generator.',
        effects: [
          {
            target: 'rwgManager',
            type: 'unlockOrbit',
            targetId: 'very-hot'
          }
        ]
      },
      {
        id: 'reveal-optimized-heat-sinks',
        descriptionKey: 'catalogs.specialSeeds.hermes.rewards.revealOptimizedHeatSinks',
        description: 'Reveals the Optimized Heat Sinks awakening skill.',
        effects: [
          {
            target: 'skillManager',
            targetId: 'optimized_heat_sinks',
            type: 'skillReveal',
            value: true
          }
        ]
      }
    ],
    overrides: hermesOverrides
  },
  wolfysnightmare: {
    key: 'wolfysnightmare',
    seed: 'WolfysNightmare',
    name: 'WolfysNightmare',
    difficultyKey: 'catalogs.specialSeeds.wolfysnightmare.difficulty',
    difficultyRating: 'Extreme',
    replayable: true,
    target: 'planet',
    archetype: 'venus-like',
    orbitPreset: 'hot',
    specialEffects: [
      {
        id: 'all-hazards-increased-difficulty',
        descriptionKey: 'catalogs.specialSeeds.wolfysnightmare.effects.allHazardsIncreasedDifficulty',
        description: 'All hazards have increased difficulty.'
      },
      {
        id: 'lifters-no-strip',
        descriptionKey: 'catalogs.specialSeeds.wolfysnightmare.effects.liftersNoStrip',
        labelKey: 'catalogs.specialSeeds.commonEffects.liftersStripModeDisabled',
        label: 'Lifters Strip Mode Disabled',
        description: 'Lifters cannot use Atmosphere Strip mode.'
      },
      {
        id: 'incinerator-no-hazardous-biomass',
        descriptionKey: 'catalogs.specialSeeds.wolfysnightmare.effects.incineratorNoHazardousBiomass',
        labelKey: 'catalogs.specialSeeds.commonEffects.incineratorRecipeDisabled',
        label: 'Incinerator Recipe Disabled',
        description: 'Trash Incinerator cannot run the Hazardous Biomass recipe.'
      }
    ],
    completionRewards: [
      {
        id: 'reveal-chemistry-mastery',
        descriptionKey: 'catalogs.specialSeeds.wolfysnightmare.rewards.revealChemistryMastery',
        description: 'Reveals the Chemistry Mastery awakening skill.',
        effects: [
          {
            target: 'skillManager',
            targetId: 'chemistry_mastery',
            type: 'skillReveal',
            value: true
          }
        ]
      }
    ],
    overrides: wolfysNightmareOverrides
  },
  therealposeidon: {
    key: 'therealposeidon',
    seed: 'TheRealPoseidon',
    name: 'TheRealPoseidon',
    nameKey: 'catalogs.specialSeeds.therealposeidon.name',
    difficultyKey: 'catalogs.specialSeeds.therealposeidon.difficulty',
    difficultyRating: 'Very Hard',
    replayable: true,
    target: 'planet',
    archetype: 'molten',
    orbitPreset: 'very-cold',
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
        id: 'aerostats-powered-flight-disabled',
        descriptionKey: 'catalogs.specialSeeds.therealposeidon.effects.aerostatsPoweredFlightDisabled',
        description: 'A certain World 14 upgrade on aerostats is disabled because HOPE did not have access to it at the time.'
      },
      {
        id: 'mega-heat-sink-disabled',
        descriptionKey: 'catalogs.specialSeeds.therealposeidon.effects.megaHeatSinkDisabled',
        description: 'Mega Heat Sink is permanently disabled on this world.'
      }
    ],
    completionRewards: [
      {
        id: 'reveal-cloning-expertise',
        descriptionKey: 'catalogs.specialSeeds.therealposeidon.rewards.revealCloningExpertise',
        description: 'Reveals the Cloning Expertise awakening skill.',
        effects: [
          {
            target: 'skillManager',
            targetId: 'cloning_expertise',
            type: 'skillReveal',
            value: true
          }
        ]
      }
    ],
    overrides: theRealPoseidonOverrides
  },
  toi3693b: {
    key: 'toi3693b',
    seed: 'TOI3693B',
    name: 'TOI-3693 b',
    designer: 'JamesM',
    replayable: true,
    target: 'planet',
    archetype: 'jupiter-like',
    orbitPreset: 'very-hot',
    specialEffects: [
      {
        id: 'artificial-sky-disabled',
        descriptionKey: 'catalogs.specialSeeds.toi3693b.effects.artificialSkyDisabled',
        description: 'Artificial Sky is permanently disabled on this world.'
      },
      {
        id: 'intense-solar-flares',
        descriptionKey: 'catalogs.specialSeeds.toi3693b.effects.intenseSolarFlares',
        description: 'Intense solar flares disrupt operations, generating a weaker version of the pulsar hazard. The hazard can be cleared by moving the world beyond 1 AU.'
      },
      {
        id: 'real-hot-jupiter',
        descriptionKey: 'catalogs.specialSeeds.toi3693b.effects.realHotJupiter',
        description: 'A real hot-jupiter exoplanet discovered in 2022.'
      }
    ],
    overrides: toi3693bOverrides
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
        labelKey: 'catalogs.specialSeeds.commonEffects.liftersStripModeDisabled',
        label: 'Lifters Strip Mode Disabled',
        descriptionKey: 'catalogs.specialSeeds.wolfysnightmare.effects.liftersNoStrip',
        description: 'Lifters cannot use Atmosphere Strip mode.'
      },
      {
        id: 'planetary-thrusters-disabled',
        labelKey: 'catalogs.specialSeeds.commonEffects.planetaryThrustersDisabled',
        label: 'Planetary Thrusters Disabled',
        descriptionKey: 'catalogs.specialSeeds.sculkbioworld.effects.planetaryThrustersDisabled',
        description: 'Planetary Thrusters are permanently disabled on this world.'
      },
      {
        id: 'incinerator-no-hazardous-biomass',
        labelKey: 'catalogs.specialSeeds.commonEffects.incineratorRecipeDisabled',
        label: 'Incinerator Recipe Disabled',
        descriptionKey: 'catalogs.specialSeeds.wolfysnightmare.effects.incineratorNoHazardousBiomass',
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
        labelKey: 'catalogs.specialSeeds.commonEffects.incineratorRecipeDisabled',
        label: 'Incinerator Recipe Disabled',
        descriptionKey: 'catalogs.specialSeeds.wolfysnightmare.effects.incineratorNoHazardousBiomass',
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
