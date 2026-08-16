// Helper function for deep merging objects
// Ensures that nested objects are merged correctly, not just replaced.
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function cloneMergeValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneMergeValue);
  }
  if (isObject(value)) {
    const output = {};
    Object.keys(value).forEach(key => {
      output[key] = cloneMergeValue(value[key]);
    });
    return output;
  }
  return value;
}

function deepMerge(target, source) {
  const output = cloneMergeValue(target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (isObject(targetValue) && isObject(sourceValue)) {
        // If both target and source have an object for this key, recurse
        output[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        // Otherwise, if source has a defined value (could be null, 0, false), overwrite the target value
        output[key] = cloneMergeValue(sourceValue);
      }
      // If sourceValue is undefined, the targetValue from the initial spread is kept
    });
  }
  // If source is not an object, or target is not an object,
  // the initial spread of target potentially updated with source's top-level keys is returned.
  return output;
}

const PLANET_ZONE_KEYS = ['tropical', 'temperate', 'polar'];
const PLANET_ZONAL_SURFACE_RESOURCE_KEYS = [
  'liquidWater',
  'ice',
  'buriedIce',
  'dryIce',
  'buriedDryIce',
  'liquidCO2',
  'liquidHydrogen',
  'liquidMethane',
  'hydrocarbonIce',
  'buriedHydrocarbonIce',
  'liquidAmmonia',
  'ammoniaIce',
  'buriedAmmoniaIce',
  'fineSand',
  'biomass',
  'hazardousBiomass'
];

function createZonalSurfaceDefaults() {
  const zonalSurface = {};
  PLANET_ZONE_KEYS.forEach(zone => {
    const zoneValues = {};
    PLANET_ZONAL_SURFACE_RESOURCE_KEYS.forEach(key => {
      zoneValues[key] = 0;
    });
    zonalSurface[zone] = zoneValues;
  });
  return zonalSurface;
}

let defaultPlanetResources;

try {
  defaultPlanetResources = window.defaultPlanetResources;
} catch (error) {
  defaultPlanetResources = require('./planet-resource-parameters.js');
}


// --- Default Planet Parameters (Based largely on Mars) ---
const defaultPlanetParameters = {
  name: '',
  specialAttributes: {
    hasSand: true,
  },
  resources: defaultPlanetResources,
  zonalSurface: createZonalSurfaceDefaults(),
  zonalTemperatures: {
    tropical: { value: 223.15, day: 238.15, night: 208.15 },
    temperate: { value: 213.15, day: 226.15, night: 200.15 },
    polar: { value: 193.15, day: 198.15, night: 188.15 }
  },
  buildingParameters: {
    maintenanceFraction: 0.001
  },
  populationParameters: {
    workerRatio: 0.5
  },
  gravityPenaltyEnabled: true,
  fundingRate: 0, // Default
  // Default host star information (for Solar System worlds)
  star: {
    name: t('catalogs.planets.default.star.name', {}, 'Sun'),
    spectralType: 'G2V',
    luminositySolar: 1,
    massSolar: 1,
    temperatureK: 5778,
    habitableZone: { inner: 0.95, outer: 1.4 }
  },
  hazards: {},
  effects: [],
  celestialParameters : {
    distanceFromSun: 1.52, // Default (Mars)
    gravity: 3.711, // Default (Mars)
    radius: 3389.5, // Default (Mars)
    mass: 6.417e23, // kg
    albedo: 0.21, // Default (Mars)
    rotationPeriod: 24.6, // hours, day-night cycle duration, Default (Mars)
    spinPeriod: 24.6, // hours, physical rotation for gravity calculations, Default (Mars)
    starLuminosity: 1, // Multiplier relative to Sol
    coreHeatFlux: 0, // W/m^2, added directly to the surface energy budget
    greenhouseModel: {
      ...terraformingParameters.climate.greenhouseTemperatureModel
    },
    sector: 'R5-07',
  },
  visualization: {
    baseColor: '#8a2a2a',
  }
};

// --- Planet Specific Overrides ---
// Define only the properties that differ from the defaults for each planet.

const marsOverrides = {
  name: '',
   "resources": {
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 23451952004163.42
      },
      "atmosphericWater": {
        "initialValue": 2281475.070630393
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 32500000000
      },
      "inertGas": {
        "initialValue": 1075000000000
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
      "ice": 0,
      "buriedIce": 1100000000000000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 1900000000000000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 798081936249287.6,
      "buriedIce": 4401926061462553,
      "liquidCO2": 0,
      "dryIce": 272663676723.07785,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 231.13451383770396,
      "day": 249.33072840906956,
      "night": 212.93829926633836
    },
    "temperate": {
      "value": 214.92630788901891,
      "day": 230.05786924126392,
      "night": 199.7947465367739
    },
    "polar": {
      "value": 140.11845044648467,
      "day": 146.2157561067199,
      "night": 134.02114478624944
    }
  },
  fundingRate: 10,
  visualization: {
    baseColor: '#8a2a2a',
  }
};

const titanOverrides = {
  name: '',
  resources: {
    surface: {
      land: { initialValue : 8_300_000_000 },
    },
    underground: {
      ore: { initialValue: 3, maxDeposits: 8300, areaTotal: 83000 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 100000.00000261348
      },
      "atmosphericWater": {
        "initialValue": 1.218601176795381e-23
      },
      "atmosphericMethane": {
        "initialValue": 464126237230984.5
      },
      "oxygen": {
        "initialValue": 1000000000
      },
      "inertGas": {
        "initialValue": 8999999999996264
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
      "ice": 9.195907260129451e-9,
      "buriedIce": 324000000000000000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 11659032101627.154,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 9.860658044218774e-9,
      "buriedIce": 2919000000000000000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 15063228438678.125,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 9.381630727223317e-10,
      "buriedIce": 8766450000000010000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 2388023737928.163,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 95.09566688089761,
      "day": 95.44660399210302,
      "night": 94.7447297696922
    },
    "temperate": {
      "value": 94.75479309619156,
      "day": 95.04662437285896,
      "night": 94.46296181952417
    },
    "polar": {
      "value": 93.77606652025688,
      "day": 93.93296176641635,
      "night": 93.6191712740974
    }
  },
    celestialParameters : { // Override all celestial parameters
    distanceFromSun: 9.58,
    gravity: 1.35,
    radius: 2574.7,
    mass: 1.345e23, // kg
    albedo: 0.15,
    rotationPeriod: 382.7,
    spinPeriod: 382.7,
    starLuminosity: 1,
    parentBody: {
      name: '',
      radius: 60268,        // km
      mass: 5.683e26,       // kg
      orbitRadius: 1_221_870, // km
      refDistance_Rp: 10,                 // convenient pivot in R_S
      parentBeltAtRef_mSvPerDay: 3.5,      // chosen so Titan @20.3 RS is ~0.05 airless
      beltFalloffExp: 6
    }
  },
  visualization: {
    baseColor: '#8a6a38',
  }
};

const callistoOverrides = {
  name: '',

  resources: {
    /* ---------- SURFACE ---------- */
    surface: {
      /* total land area ≈ 7.30 Gha (= 7.30 × 10⁹ ha)   4πr² with r = 2410 km :contentReference[oaicite:0]{index=0} */
      land: { initialValue: 7300000000 },

      /* ~4 × 10¹⁶ t of easily‑accessible water‑ice (≪ 4 × 10¹⁹ t true inventory) */
      ice: { initialValue: 0, unlocked: true },
      liquidWater:   { initialValue: 0 },
      dryIce:        { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce:{ initialValue: 0 }
    },

    /* ---------- UNDERGROUND ---------- */
    underground: {
      /* 1 deposit / 10⁶ ha rule ⇒ 7 300 maximum */
      ore:        { initialValue: 3, maxDeposits: 7300, areaTotal: 73000 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },

    /* ---------- ATMOSPHERE (ultra‑thin CO₂/O₂ exosphere) ---------- */
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 46240.23437518353
      },
      "atmosphericWater": {
        "initialValue": 118.05227567209452
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 5000
      },
      "inertGas": {
        "initialValue": 100000
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
      "ice": 1125376.2101151648,
      "buriedIce": 4800000000000000000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 382508.1802519206,
      "buriedIce": 6000039999645252000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 44883.35477995609,
      "buriedIce": 1200000000000000000,
      "liquidCO2": 0,
      "dryIce": 3759.7656250149157,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 122.9041223158768,
      "day": 133.62795511695845,
      "night": 112.18028951479515
    },
    "temperate": {
      "value": 114.1636094172339,
      "day": 123.0813072380577,
      "night": 105.2459115964101
    },
    "polar": {
      "value": 89.0675669073652,
      "day": 93.86193064676576,
      "night": 84.27320316796465
    }
  },

  /* ---------- CELESTIAL ---------- */
  celestialParameters: {
    distanceFromSun: 5.2,      // Jupiter's semi‑major axis (AU)
    gravity: 1.236,            // m s‑² :contentReference[oaicite:3]{index=3}
    radius: 2410.3,            // km :contentReference[oaicite:4]{index=4}
    mass: 1.076e23,            // kg
    albedo: 0.17,              // Bond albedo estimate :contentReference[oaicite:5]{index=5}
    rotationPeriod: 400.8,     // hours (16 .7 days tidally‑locked) :contentReference[oaicite:6]{index=6}
    spinPeriod: 400.8,
    starLuminosity: 1,
    parentBody: {
      name: '',
      radius: 71492,       // km
      mass: 1.898e27,      // kg
      orbitRadius: 1882700, // km
      refDistance_Rp: 9.4,                 // Europa
      parentBeltAtRef_mSvPerDay: 5400,     // airless daily dose at Europa
      beltFalloffExp: 10                  // middle of 9.5–10.5 range
    }
  },
  visualization: {
    baseColor: '#828a93',
  }
};


/* ---------- GANYMEDE OVERRIDES ---------- */
const ganymedeOverrides = {
  name: '',

  /* ---------- RESOURCES ---------- */
  resources: {

    /* SURFACE */
    surface: {
      /* total land area  ≈ 8.72 Gha  (= 8.72 × 10⁹ ha) */
      land: { initialValue: 8720000000 },

      /* accessible surface water-ice (upper regolith only) */
      ice: { initialValue: 199999999928379200, unlocked: true },

      liquidWater:   { initialValue: 0 },
      dryIce:        { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce:{ initialValue: 0 }
    },

    /* UNDERGROUND */
    underground: {
      /* 1 deposit / 10⁶ ha rule ⇒ 8 720 maximum */
      ore:        { initialValue: 3, maxDeposits: 8720, areaTotal: 87200 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },

    /* ATMOSPHERE — ultra-thin CO₂ / O₂ exosphere */
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 57455.12695312466
      },
      "atmosphericWater": {
        "initialValue": 8269989.6214608895
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 10000
      },
      "inertGas": {
        "initialValue": 100000
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
      "ice": 94101621585149.7,
      "buriedIce": 5000000000000000000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 152395771168678.9,
      "buriedIce": 7000000000003690000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 51502581140229.45,
      "buriedIce": 2000000000000000000,
      "liquidCO2": 0,
      "dryIce": 1644.8730468749902,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 112.53634536939119,
      "day": 121.40012604897628,
      "night": 103.6725646898061
    },
    "temperate": {
      "value": 103.89228545941437,
      "day": 111.31116327490858,
      "night": 96.47340764392015
    },
    "polar": {
      "value": 79.28089696755058,
      "day": 83.37907607917033,
      "night": 75.18271785593082
    }
  },

  /* ---------- CELESTIAL PARAMETERS ---------- */
  celestialParameters: {
    distanceFromSun: 5.2,      // AU (shares Jupiter's orbit)
    gravity: 1.428,            // m s-²
    radius: 2634.1,            // km
    mass: 1.482e23,            // kg
    albedo: 0.21,              // Bond albedo estimate
    rotationPeriod: 171.7,     // hours (7.155 days, tidally locked)
    spinPeriod: 171.7,
    starLuminosity: 1,
    parentBody: {
      name: '',
      radius: 71492,      // km
      mass: 1.898e27,     // kg
      orbitRadius: 1070400, // km
      refDistance_Rp: 9.4,                 // Europa
      parentBeltAtRef_mSvPerDay: 5400,     // airless daily dose at Europa
      beltFalloffExp: 10
    }
  },
  visualization: {
    baseColor: '#786355',
  }
};


/* ---------- DRY WORLD (vega2) ---------- */
// A completely dry, Venus-sized world with a pure inert atmosphere (>0.5 atm)
const vega2Overrides = {
  name: '',
  travelWarning: {
    message: t('catalogs.planets.vega2.travelWarning.message', {}, 'This world has no water.  Solis can help.  Five purchases is enough but more can help.  \n \n This world unlocks some very powerful upgrades and is strongly recommended (see Early Advanced Oversight in difficulty settings for a description of one of them).')
  },

  resources: {
    surface: {
      // Land (ha) = 4πR^2 (km²) × 100; R = 5051.8 km → ~32.070 Gha
      land: { initialValue: 32_000_000_000 },
      ice: { initialValue: 0, unlocked: true },
      liquidWater: { initialValue: 0, unlocked: true },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 }
    },
    underground: {
      // Scale deposits with land area (1 deposit / 1e6 ha)
      ore: { initialValue: 5, maxDeposits: 32070, areaTotal: 320700 },
      geothermal: { initialValue: 5, maxDeposits: 3891, areaTotal: 320700 }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 0
      },
      "atmosphericWater": {
        "initialValue": 0
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 0
      },
      "inertGas": {
        "initialValue": 3200000000000000
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
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 335.85097274299693,
      "day": 344.67896007655526,
      "night": 327.0229854094386
    },
    "temperate": {
      "value": 314.0593839404446,
      "day": 321.40053937950154,
      "night": 306.71822850138767
    },
    "polar": {
      "value": 251.4906731867685,
      "day": 255.43745072464208,
      "night": 247.54389564889493
    }
  },
  star: {
    name: '',
    spectralType: 'A0V',
    luminositySolar: 40,
    massSolar: 2.135,
    temperatureK: 9602,
    habitableZone: { inner: 6, outer: 9 }
  },

  celestialParameters: {
    // Venus-like size and orbit. No clouds/greenhouse by composition above.
    distanceFromSun: 4, // AU
    gravity: 7.3,          // m/s^2
    radius: 5051.8,         // km
    mass: 1.867e24,         // kg
    albedo: 0.3,           // bright surface; no clouds unless added later
    rotationPeriod: 18,
    spinPeriod: 18,
    starLuminosity: 40
  },
  visualization: {
    baseColor: '#a87d4f',
  }
};

/* ---------- VENUS OVERRIDES ---------- */
const venusOverrides = {
  name: '',
  travelWarning: {
    message: t('catalogs.planets.venus.travelWarning.message', {}, 'This planet is much harder than usual.  Preparing is not necessary, but will make it significantly easier.'),
    hint: {
      title: t('catalogs.planets.venus.travelWarning.hint.title', {}, 'Hint'),
      body: t('catalogs.planets.venus.travelWarning.hint.body', {}, '- Skill points can help a lot.  \n - With few skill points, the Solis upgrade for early colony sliders can make the early game more doable.  A high worker ratio can help with resource shortage (especially components). \n - The Warp Gate Command can improve your components and electronics production. \n - The 125k Advanced Research can make an aspect of the game a lot easier.')
    }
  },

  resources: {
    surface: {
      // Land rounded to nearest billion hectares
      land: { initialValue: 46_000_000_000 },
      ice: { initialValue: 0, unlocked: true },
      liquidWater: { initialValue: 0, unlocked: true },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 }
    },
    underground: {
      // Scale with land (1 deposit per 1e6 ha)
      ore: { initialValue: 5, maxDeposits: 46000, areaTotal: 460000 },
      geothermal: { initialValue: 3, maxDeposits: 460, areaTotal: 460000 }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 460580468610238600
      },
      "atmosphericWater": {
        "initialValue": 10000000000000
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 32500000000
      },
      "inertGas": {
        "initialValue": 17000000000000000
      },
      "hydrogen": {
        "initialValue": 0
      },
      "sulfuricAcid": {
        "initialValue": 46_266_354_919_428.984
      }
    }
  },
  "zonalSurface": {
    "tropical": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 737.2712816784716,
      "day": 738.5315480901991,
      "night": 736.0110152667442
    },
    "temperate": {
      "value": 737.2158252454452,
      "day": 738.2632173764877,
      "night": 736.1684331144028
    },
    "polar": {
      "value": 737.0561233185126,
      "day": 737.6186168115851,
      "night": 736.4936298254402
    }
  },
  celestialParameters: {
    distanceFromSun: 0.723,
    gravity: 8.87,
    radius: 6051.8,
    mass: 4.867e24,
    albedo: 0.133,
    rotationPeriod: 5832, // hours (~243 Earth days)
    spinPeriod: 5832,
    starLuminosity: 1
  },
  visualization: {
    // Use surface rock color (basaltic gray-brown), not atmospheric tint
    baseColor: '#7a6f5f',
  }
};

const umbraOverrides = {
  name: '',
  star: {
    name: '',
    spectralType: 'K4V',
    luminositySolar: 0.0048246,
    massSolar: 0.2178,
    temperatureK: 2799,
    habitableZone: { inner: 0.06598656748303425, outer: 0.0951595762650073 }
  },
  celestialParameters: {
    distanceFromSun: 0.06830154005049452,
    gravity: 3.895302304848209,
    radius: 3263.280726516782,
    mass: 6.215045552249502e+23,
    albedo: 0.25,
    rotationPeriod: 18.728781030979007,
    spinPeriod: 18.728781030979007,
    starLuminosity: 0.0048246,
    parentBody: {
      name: '',
      radius: 71492,       // km
      mass: 4.255130726862839e+27,      // kg
      orbitRadius: 1_330_049.90930277854, // km
      refDistance_Rp: 9.4,                 // Europa
      parentBeltAtRef_mSvPerDay: 5400,     // airless daily dose at Europa
      beltFalloffExp: 10
    }
  },
  visualization: {
    baseColor: '#1d2a44',
  },
 "resources": {
    "surface":
    {
              land: { initialValue: 13_382_000_000 },
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 25035251297749.41
      },
      "atmosphericWater": {
        "initialValue": 0
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 400000000000000
      },
      "inertGas": {
        "initialValue": 3000000000000000
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
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 5336031908.4521675
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 6936001308.016412
    },
    "polar": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 371734952702502.8,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 1109896233.1335156
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 281.753666266623,
      "day": 285.0249507640085,
      "night": 278.48238176923746
    },
    "temperate": {
      "value": 264.50017100395326,
      "day": 267.2204971368069,
      "night": 261.7798448710996
    },
    "polar": {
      "value": 214.96134580791463,
      "day": 216.42385663804262,
      "night": 213.49883497778663
    }
  },
  hazards: {
    hazardousBiomass: {
      baseGrowth: { value: 0.4, maxDensity: 1 },
      invasivenessResistance: { value: 20, severity: 0.005 },
      oxygenPressure: { min: 0, max: 10, unit: 'kPa', severity: 0.01 },
      co2Pressure: { min: 10, max: 50, unit: 'kPa', severity: 0.01 },
      atmosphericPressure: { min: 150, max: 200, unit: 'kPa', severity: 0.002 },
      landPreference: { value: 'Land', severity: 0.1 },
      temperaturePreference: {
        min: 223.15,
        max: 303.15,
        unit: 'K',
        severityBelow: 0.004,
        severityHigh: 0.005
      },
      radiationPreference: { min: 0, max: 0.01, unit: 'mSv/day', severity: 0.1 },
      penalties: {
        buildCost: 0.75,
        maintenanceCost: 0.75,
        populationGrowth: 1
      }
    }
  }
};

const solisPrimeOverrides = {
  name: '',
  travelWarning: {
    message: t('catalogs.planets.solisprime.travelWarning.message', {}, 'This planet is very easy, but it is possible to grow too fast.  If this happens, pausing autobuild is usually enough to recover. \n The story will give you some initial resources, but if some mega projects are on auto start you may end up using them instantly.'),
  },
  specialAttributes: {
    hasSand: false,
  },
  celestialParameters: {
    distanceFromSun: 0,
    gravity: 4.9,
    radius: 6300,
    mass: 4.6e24,
    albedo: 0.14,
    rotationPeriod: 24, // Rogue worlds use 24h day-night cycle
    spinPeriod: 0, // Rogue worlds have no physical spin
    starLuminosity: 0,
    rogue: true
  },
  visualization: {
    baseColor: '#d4af37',
  },
 "resources": {
    underground: {
      ore: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },
    "surface": {
      land: { initialValue : 49_876_000_000 },
      "ice": {
        "initialValue": 2905755111246688.5
      },
      "liquidWater": {
        "initialValue": 0
      },
      "dryIce": {
        "initialValue": 0
      },
      "liquidCO2": {
        "initialValue": 0
      },
      "liquidMethane": {
        "initialValue": 0
      },
      "hydrocarbonIce": {
        "initialValue": 0
      }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 0
      },
      "atmosphericWater": {
        "initialValue": 0
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
      "ice": 290937936633937.6,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 1702476415693995.5,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 912340758918755.4,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 2.8965877751696056,
      "day": 2.8970919741326218,
      "night": 2.8960835762065895
    },
    "temperate": {
      "value": 2.765780521300558,
      "day": 2.7662648222803448,
      "night": 2.7652962203207716
    },
    "polar": {
      "value": 2.6453652596141763,
      "day": 2.6458299355330257,
      "night": 2.644900583695327
    }
  }
};

const gabbagOverrides = {
  name: '',
  specialAttributes: {
    terraformingRequirementId: 'gabbagian',
  },
  star: {
    name: '',
    spectralType: 'A',
    luminositySolar: 10.19109899798825,
    massSolar: 1.9411681130761282,
    temperatureK: 7910,
  },
  celestialParameters: {
    distanceFromSun: 4.133402092640641,
    gravity: 4.88215797065464,
    hasNaturalMagnetosphere : true,
    radius: 3643.2869367918697,
    mass: 9.70941037467594e+23,
    albedo: 0.14,
    rotationPeriod: 26.19893743796274, 
    spinPeriod: 26.19893743796274,
    starLuminosity: 10.19109899798825,
    sector: 'R5-06'
  },
  visualization: {
    baseColor: '#556b7d',
  },
  "resources": {
    underground: {
      ore: { initialValue: 10, maxDeposits: 16680, areaTotal: 166800 },
      geothermal: { initialValue: 3, maxDeposits: 167, areaTotal: 166800 },
    },
    "surface": {
              land: { initialValue: 16_680_021_928 }},
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 3696135227990891
      },
      "atmosphericWater": {
        "initialValue": 121423015343911.02
      },
      "atmosphericMethane": {
        "initialValue": 400000000000000
      },
      "atmosphericAmmonia": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 79141235810.32394
      },
      "inertGas": {
        "initialValue": 50000000000000000
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
      "liquidWater": 11031915891466364,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 14343949281701406,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 2298398913783160,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 349.7989226989209,
      "day": 349.96310194559874,
      "night": 349.634743452243
    },
    "temperate": {
      "value": 341.97188766062595,
      "day": 342.10839842838186,
      "night": 341.83537689287004
    },
    "polar": {
      "value": 319.49635527471406,
      "day": 319.5697089078158,
      "night": 319.4230016416123
    }
  },
  hazards: {
    garbage: {
      surfaceResources: {
        garbage: { amountMultiplier: 1000 },
        trash: { amountMultiplier: 100 },
        junk: { amountMultiplier: 100 },
        scrapMetal: { amountMultiplier: 100 },
        radioactiveWaste: { amountMultiplier: 0.25 }
      },
      penalties: {
        garbage: { sandHarvesterMultiplier: 0.25, nanoColonyGrowthMultiplier: 0.25 },
        trash: { happiness: -0.05 },
        junk: { happiness: -0.05 },
        scrapMetal: { oreScanningSpeedMultiplier: 0.25 },
        radioactiveWaste: { lifeGrowthMultiplier: 0.1, androidAttrition: 0.001 }
      }
    }
  }
};

const tartarusOverrides = {
  name: '',
  star: {
    name: '',
    spectralType: 'K2V',
    luminositySolar: 0.42,
    massSolar: 0.78,
    temperatureK: 4900,
    habitableZone: { inner: 0.6, outer: 0.95 }
  },
  celestialParameters: {
    distanceFromSun: 0.98,
    gravity: 5.04,
    radius: 4120,
    mass: 1.24e24,
    albedo: 0.21,
    rotationPeriod: 29.4,
    spinPeriod: 29.4,
    starLuminosity: 0.42,
    sector: 'R4-05'
  },
  hazards: {
    kessler: {
      orbitalDebrisPerLand: 100
    }
  },
  visualization: {
    baseColor: '#3b3a4d',
  },
   "resources": {
    surface: {
      land: { initialValue: 21_330_660_136 },
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 23856017974593.85
      },
      "atmosphericWater": {
        "initialValue": 5255443.759571092
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 32500000000
      },
      "inertGas": {
        "initialValue": 1075000000000
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
      "ice": 0,
      "buriedIce": 1100000000000000,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 5.821282521439454e-7,
      "buriedIce": 6399987708034927,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 20251116703.880257,
      "buriedIce": 700000000000000,
      "liquidCO2": 0,
      "dryIce": 142792588114.8047,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 231.12200505780186,
      "day": 251.84580676103744,
      "night": 210.39820335456628
    },
    "temperate": {
      "value": 214.8939183757379,
      "day": 232.1273643035326,
      "night": 197.66047244794322
    },
    "polar": {
      "value": 168.22482965566564,
      "day": 177.4805788840585,
      "night": 158.9690804272728
    }
  }
};

const hadesOverrides = {
  name: '',
  star: {
    name: '',
    spectralType: 'Pulsar',
    luminositySolar: 0.002,
    massSolar: 1.6,
    temperatureK: 600000,
    habitableZone: { inner: 0.02, outer: 0.05 }
  },
  celestialParameters: {
    distanceFromSun: 6,
    gravity: 6.9,
    radius: 5000,
    mass: 3.6e24,
    albedo: 0.18,
    rotationPeriod: 31.2,
    spinPeriod: 31.2,
    starLuminosity: 100,
    sector: 'R4-03'
  },
  visualization: {
    baseColor: '#4a4340',
  },
  hazards: {
    pulsar: {
      pulsePeriodSeconds: 1.337,
      stormDurationSeconds: 5,
      severity: 1,
      orbitalDoseBoost_mSvPerDay: 4900,
      description: '',
    }
  },
  resources: {
    surface: {
      land: { initialValue: 31_415_926_536 },
      liquidWater: { initialValue: 0 },
      ice: { initialValue: 0 },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 },
      biomass: { initialValue: 0 },
      hazardousBiomass: { initialValue: 0 }
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
  zonalSurface: {
    "tropical": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 360.72343155652993,
      "day": 444.31934293218853,
      "night": 277.12752018087133
    },
    "temperate": {
      "value": 335.06991934433455,
      "day": 404.58639646313145,
      "night": 265.55344222553765
    },
    "polar": {
      "value": 261.4127298679641,
      "day": 298.78642024711985,
      "night": 224.03903948880838
    }
  }
};

const poseidonOverrides = {
  name: '',
  travelWarning: {
    message: t('catalogs.planets.poseidon.travelWarning.message', {}, 'This planet is much harder than usual.  Preparing is not necessary, but will make it significantly easier.  \n It is also possible to nearly softlock if using lifters too aggressively.  You have been warned.'),
    hint: {
      title: t('catalogs.planets.poseidon.travelWarning.hint.title', {}, 'Hint'),
      body: t('catalogs.planets.poseidon.travelWarning.hint.body', {}, 'You can potentially save a lot of time by bringing in about 8T of superalloys from space storage.')
    }
  },
  star: {
    name: '',
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
    }
  ],
  resources: {
    surface: {
      land: { initialValue: 72_583_356_668.53859 },
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
      carbonDioxide: { initialValue: 1_000_000_000_000_000_000 },
      atmosphericWater: { initialValue: 1_000_000_000_000_000 },
      atmosphericMethane: { initialValue: 0 },
      oxygen: { initialValue: 0 },
      inertGas: { initialValue: 50_000_000_000_000_000 },
      hydrogen: { initialValue: 0 },
      sulfuricAcid: { initialValue: 0 }
    }
  },
  zonalSurface: {
    "tropical": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  zonalTemperatures: {
    "tropical": {
      "value": 1815.441594917638,
      "day": 1815.4433324107342,
      "night": 1815.4398574245417
    },
    "temperate": {
      "value": 1815.439160142596,
      "day": 1815.440453654538,
      "night": 1815.4378666306538
    },
    "polar": {
      "value": 1815.4346946348974,
      "day": 1815.4351738617224,
      "night": 1815.4342154080723
    }
  }
};

const styxOverrides = {
  name: '',
  star: {
    name: '',
    spectralType: 'G2V',
    luminositySolar: 0.9,
    massSolar: 0.9,
    temperatureK: 5778,
    habitableZone: { inner: 0.95, outer: 1.4 }
  },
  celestialParameters: {
    distanceFromSun: 1,
    gravity: 9.1,
    radius: 6200,
    mass: 5.18e24,
    albedo: 0.24,
    rotationPeriod: 26,
    spinPeriod: 26,
    starLuminosity: 1,
    sector: 'R5-11'
  },
  visualization: {
    baseColor: '#466f73',
  },
  resources: {
    surface: {
      land: { initialValue: 48_305_000_000 },
      liquidWater: { initialValue: 4_040_537_798_301.499 },
      ice: { initialValue: 0 },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 },
      biomass: { initialValue: 0 },
      hazardousBiomass: { initialValue: 0 },
      hazardousMachinery: { initialValue: 0 }
    },
    underground: {
      ore: { initialValue: 5, maxDeposits: 48305, areaTotal: 483050 },
      geothermal: { initialValue: 3, maxDeposits: 483, areaTotal: 483050 }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 536723651573296.1
      },
      "atmosphericWater": {
        "initialValue": 13412254854880.598
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 0
      },
      "inertGas": {
        "initialValue": 8050854773599442
      },
      "hydrogen": {
        "initialValue": 1610164149561893.2
      },
      "sulfuricAcid": {
        "initialValue": 0
      }
    }
  },
  hazards: {
    hazardousMachinery: {
      initialCoverage: 1,
      maxCoverageBase: 1,
      waterCoveragePenalty: 0.5,
      baseGrowth: { value: 1 },
      invasivenessPreference: { min: 0, max: 50, severityHigh: 0.001 },
      oxygenPreference: { min: 0, max: 0, unit: 'kPa', severityHigh: 0.001 },
      temperaturePreference: { min: -273.15, max: 500, unit: 'C', severityHigh: 0.003 },
      crusaderRemovalPerSecond: 0.5,
      researchToDisableCost: 10000,
      penalties: {
        availableAndroidDecayRate: 0.05,
        nanoColonyGrowthMultiplier: 0,
        researchMultiplier: 0.1,
        buildCostMultiplier: 2,
        electronicsMaintenanceMultiplier: 10,
        shipWorkersPerAssignedShip: 100
      }
    }
  },
  "zonalSurface": {
    "tropical": {
      "liquidWater": 16084881945396264,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 20920169853945800,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 3367925947429392,
      "buriedIce": 18987981374648,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 0,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 302.9795264974327,
      "day": 303.6363094181474,
      "night": 302.322743576718
    },
    "temperate": {
      "value": 289.596204287563,
      "day": 290.14223440408557,
      "night": 289.05017417104045
    },
    "polar": {
      "value": 226.03424920552845,
      "day": 226.52794310832277,
      "night": 225.54055530273413
    }
  }
};

const zeusOverrides = {
  name: t('catalogs.planets.zeus.name', {}, 'Zeus'),
  travelWarning: {
    message: venusOverrides.travelWarning.message,
    hint: {
      title: venusOverrides.travelWarning.hint.title,
      body: venusOverrides.travelWarning.hint.body
    }
  },
  gravityPenaltyEnabled: true,
  specialAttributes: {
    hasSand: false,
    dynamicMass: true,
    gasGiant: true,
    stellarEvolutionDisabled: true,
  },
  star: {
    name: t('catalogs.planets.zeus.star.name', {}, 'Okoth'),
    spectralType: 'K1V',
    luminositySolar: 0.46,
    massSolar: 0.84,
    temperatureK: 5100,
    habitableZone: { inner: 0.67, outer: 1.05 }
  },
  visualization: {
    baseColor: '#c28a52',
  },
  "resources": {
    "surface": {
      "ice": {
        "initialValue": 0
      },
      "liquidWater": {
        "initialValue": 0
      },
      "dryIce": {
        "initialValue": 0
      },
      "liquidCO2": {
        "initialValue": 0
      },
      "liquidHydrogen": {
        "initialValue": 1.6305400223685466e+24
      },
      "liquidMethane": {
        "initialValue": 0
      },
      "hydrocarbonIce": {
        "initialValue": 0
      },
      "liquidOxygen": {
        "initialValue": 0
      },
      "oxygenIce": {
        "initialValue": 0
      },
      "liquidNitrogen": {
        "initialValue": 0
      },
      "nitrogenIce": {
        "initialValue": 0
      },
      "land": {
        "initialValue": 6291545240475.356
      }
    },
    "underground": {
      "ore": {
        "initialValue": 0,
        "maxDeposits": 0,
        "areaTotal": 0
      },
      "geothermal": {
        "initialValue": 0,
        "maxDeposits": 0,
        "areaTotal": 0
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
        "initialValue": 2.44912245678809e+22
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
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 6.50176315764808e+23,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 8.451268384364132e+23,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "liquidCO2": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "liquidAmmonia": 0,
      "ammoniaIce": 0,
      "buriedAmmoniaIce": 0,
      "liquidOxygen": 0,
      "oxygenIce": 0,
      "buriedOxygenIce": 0,
      "liquidNitrogen": 0,
      "nitrogenIce": 0,
      "buriedNitrogenIce": 0,
      "liquidHydrogen": 1.3523686816732544e+23,
      "fineSand": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 2955.9894413562192,
      "day": 2955.989447954513,
      "night": 2955.9894347579257
    },
    "temperate": {
      "value": 2955.9892561240413,
      "day": 2955.989261036242,
      "night": 2955.9892512118404
    },
    "polar": {
      "value": 2955.9889164047004,
      "day": 2955.988918224575,
      "night": 2955.9889145848256
    }
  },
  "celestialParameters": {
    "distanceFromSun": 3.514208763918426,
    "hasNaturalMagnetosphere": true,
    "albedo": 0.487,
    "rotationPeriod": 10.14,
    "spinPeriod": 10.14,
    "starLuminosity": 0.46,
    "coreHeatFlux": 4112684,
    "sector": "R5-29",
    "baseLand": 6291545240475.356,
    "baseRadius": 70738,
    "baseMass": 1.8726e+27,
    "baseGravity": 24.977282698856314,
    "basePlanetaryMass": 2.182328308239878e+26,
    "basePlanetaryVolumeM3": 5.361937984673442e+22,
    "baseSurfaceMassKg": 1.6305400223685466e+27,
    "baseAtmosphericMassKg": 2.45448501678809e+25,
    "dynamicDirectMassDeltaKg": 0,
    "dynamicDirectVolumeDeltaM3": 0,
    "dynamicMassDeltaKg": 7.177033604151992e+23,
    "dynamicSurfaceVolumeDeltaM3": 1.2393178671461328e+21,
    "currentPlanetaryMassKg": 2.182328308239878e+26,
    "currentSurfaceMassKg": 1.6305400223685466e+27,
    "currentAtmosphericMassKg": 2.45448501678809e+25,
    "currentPlanetaryVolumeM3": 5.361937984673442e+22,
    "currentSurfaceVolumeM3": 1.4302982652355672e+24,
    "mass": 1.8733177033604153e+27,
    "radius": 70757.70363387793,
    "gravity": 24.97294157927566
  }
};

const olympusOverrides = {
  name: t('catalogs.planets.olympus.name', {}, 'Olympus'),
  travelWarning: {
    message: t('catalogs.planets.olympus.travelWarning.message', {}, 'World 15 is the narrative ending to this game.  It is very narratively heavy.  It does not unlock anything new.  \n \n Once World 15 is complete, you will be forced into World 16.  A pre-travel save between 15 and 16 will not be taken.  Therefore, you will be able to return to your current point (unless you delete your pre-travel save). \n \n World 15 does not require preparation.')
  },
  gravityPenaltyEnabled: true,
  specialAttributes: {
    hasSand: true,
    hasOre: false,
    terraformingRequirementId: 'human',
    zoneKeys: ['tropical', 'temperate', 'polar'],
    zoneLayout: 'aldersonDisk',
    fixedZonalAverageFlux: 400,
    diskInnerRadiusAU: 0.427,
    diskRadiusAU: 12.021,
    disk: { innerRadiusAU: 0.427, radiusAU: 12.021 },
    diskConstructionCostTons: 3.044071346759389e31,
    diskConstructionCostIncludesMetal: true,
    disabledFeatures: {
      tabs: ['research', 'hope'],
      subtabs: [
        'energy-research',
        'industry-research',
        'colonization-research',
        'terraforming-research',
        'advanced-research',
        'awakening-hope',
        'solis-hope',
        'wgc-hope',
        'patience-hope',
        'automation-hope',
        'space-random',
        'space-artificial',
        'space-atlas',
        'space-galaxy',
        'space-invasion',
        'summary-terraforming',
        'life-terraforming',
        'hazard-terraforming',
        'milestone-terraforming',
        'nanocolony-colonies',
        'followers-colonies',
        'mega-projects',
        'giga-projects',
        'tera-projects'
      ],
      managers: [
        'skillManager',
        'solisManager',
        'warpGateCommand',
        'patienceManager',
        'automationManager',
        'rwgManager',
        'artificialManager',
        'atlasManager',
        'galaxyManager',
        'galaxyInvasionManager',
        'lifeDesigner',
        'hazardManager',
        'milestonesManager',
        'nanotechManager',
        'followersManager'
      ],
      researchCategories: ['advanced'],
      projectCategories: ['mega', 'giga', 'tera'],
      resources: [
        'colony:funding',
        'colony:research',
        'colony:advancedResearch',
        'special:alienArtifact',
        'special:antimatter',
        'space:energy'
      ]
    } 
  },
  classification: {
    archetype: 'artificial',
    type: 'disk',
    core: 'b-star'
  },
  star: {
    name: t('catalogs.planets.olympus.star.name', {}, 'Vepive-015'),
    spectralType: 'B',
    luminositySolar: 2187,
    massSolar: 9,
    radiusSolar: 5.799546134795289,
    temperatureK: 16407.51195964452,
    habitableZone: { inner: 44.39763507136315, outer: 67.17737742552511 }
  },
  celestialParameters: {
    distanceFromSun: 12.021,
    gravity: 8.17,
    radius: 1_270_798_963.8556244,
    mass: 2.376486241758024e36,
    albedo: 0.24,
    rotationPeriod: 24,
    spinPeriod: 24,
    starLuminosity: 2187,
    sector: 'R5-30',
    baseLand: 2.0293808978395928e21
  },
  visualization: {
    baseColor: '#2a3d4f',
  },
  effects: [
    {
      target: 'colony',
      targetId: 'aerostat_colony',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'olympus-disable-aerostat-colonies'
    },
    {
      target: 'colony',
      targetId: 't1_colony',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'olympus-disable-research-outposts'
    },
    {
      target: 'building',
      targetId: 'hyperionLantern',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'olympus-disk-disable-hyperion-lanterns'
    },
    {
      target: 'building',
      targetId: 'spaceMirror',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'olympus-disk-disable-space-mirror'
    },
    {
      target: 'building',
      targetId: 'biodome',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'olympus-disk-disable-biodome'
    },
    {
      target: 'building',
      targetId: 'antimatterBattery',
      type: 'booleanFlag',
      flagId: 'antimatterBatteryFillDisabled',
      value: true,
      effectId: 'olympus-disable-antimatter-battery-fill'
    },
    {
      target: 'project',
      targetId: 'spaceMirrorFacility',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'olympus-disk-disable-space-mirror-facility'
    },
    {
      target: 'project',
      targetId: 'planetaryThruster',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'olympus-disk-disable-planetary-thrusters'
    },
    {
      target: 'project',
      targetId: 'cargo_rocket',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'olympus-disable-cargo-rockets'
    },
    {
      target: 'project',
      targetId: 'import_colonists_1',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'olympus-disable-import-colonists'
    }
  ],
  resources: {
    surface: {
      land: {
        initialValue: 2.0293808978395928e21,
        baseLand: 2.0293808978395928e21,
        baseCap: 2.0293808978395928e21
      },
      liquidWater: { initialValue: 8.570695396558675e22, unlocked: true },
      ice: { initialValue: 0 },
      dryIce: { initialValue: 0 },
      liquidCO2: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 },
      biomass: { initialValue: 0 },
      hazardousBiomass: { initialValue: 0 }
    },
    underground: {
      ore: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 2.068685930519462e+25
      },
      "atmosphericWater": {
        "initialValue": 1.6396019102552818e+24
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "atmosphericAmmonia": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 0
      },
      "inertGas": {
        "initialValue": 3.103028895779193e+26
      },
      "hydrogen": {
        "initialValue": 8.274743722077849e+25
      },
      "sulfuricAcid": {
        "initialValue": 0
      }
    }
  },
  "zonalSurface": {
    "tropical": {
      "liquidWater": 5.70777427170771e+26,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 0,
      "biomass": 0,
      "hazardousBiomass": 1e+23,
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
      "liquidWater": 1.5057288439442677e+27,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 0,
      "biomass": 0,
      "hazardousBiomass": 1e+23,
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
      "liquidWater": 2.4406797374658714e+27,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidHydrogen": 0,
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
      "value": 301.44413632392957,
      "day": 301.53507541667886,
      "night": 301.3531972311803
    },
    "temperate": {
      "value": 301.4441355508358,
      "day": 301.5350746719134,
      "night": 301.35319642975827
    },
    "polar": {
      "value": 301.44413513013114,
      "day": 301.5350742666246,
      "night": 301.3531959936377
    }
  },
  zonalTemperatures: null
};

const earthOverrides = {
  name: '',
  travelWarning: {
    message: t('catalogs.planets.earth.travelWarning.message', {}, 'This is the end of the road.  This world is very short.  A pre-travel save will not be taken.')
  },
  gravityPenaltyEnabled: true,
  effects: [
    {
      target: 'earthManager',
      type: 'enable',
      effectId: 'earth-enable-reconstruction-manager'
    },
    {
      target: 'building',
      targetId: 'hyperionLantern',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'earth-disable-hyperion-lanterns'
    },
    {
      target: 'building',
      targetId: 'spaceMirror',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: 'earth-disable-space-mirror'
    },
    {
      target: 'project',
      targetId: 'spaceMirrorFacility',
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'earth-disable-space-mirror-facility'
    }
  ],
  specialAttributes: {
    hasSand: true,
    countsAsStandardTerraformingRun: false,
    skipCurrentWorldTravelWarnings: true,
    savePretravel: false,
    disabledFeatures: {
      tabs: ['buildings', 'special-projects', 'research', 'space', 'hope', { id: 'colonies', priority: 4 }],
      subtabs: [
        'energy-research',
        'industry-research',
        'colonization-research',
        'terraforming-research',
        'advanced-research',
        'awakening-hope',
        'solis-hope',
        'wgc-hope',
        'patience-hope',
        'automation-hope',
        'space-story',
        'space-random',
        'space-artificial',
        'space-atlas',
        'space-galaxy',
        'space-invasion',
        'summary-terraforming',
        'life-terraforming',
        'hazard-terraforming',
        'milestone-terraforming',
        'population-colonies',
        { id: 'nanocolony-colonies', priority: 4 },
        'followers-colonies',
        'resources-projects',
        'infrastructure-projects',
        'story-projects',
        'mega-projects',
        'giga-projects',
        'tera-projects'
      ],
      managers: [
        'skillManager',
        'solisManager',
        'warpGateCommand',
        'patienceManager',
        'automationManager',
        'rwgManager',
        'artificialManager',
        'atlasManager',
        'galaxyManager',
        'galaxyInvasionManager',
        'lifeDesigner',
        'hazardManager',
        'milestonesManager',
        'nanotechManager',
        'followersManager'
      ],
      researchCategories: ['advanced'],
      projectCategories: ['resources', 'infrastructure', 'story', 'mega', 'giga', 'tera'],
      resources: {
        'colony:funding': 4,
        'colony:colonists': 4,
        'colony:workers': 4,
        'colony:energy': 4,
        'colony:metal': 4,
        'colony:silicon': 4,
        'colony:glass': 4,
        'colony:water': 4,
        'colony:colonyHydrogen': 4,
        'colony:food': 4,
        'colony:components': 4,
        'colony:electronics': 4,
        'colony:superconductors': 4,
        'colony:superalloys': 4,
        'colony:androids': 4,
        'colony:research': 4,
        'colony:advancedResearch': 4,
        'surface:land': 4,
        'surface:ice': 4,
        'surface:liquidWater': 4,
        'surface:dryIce': 4,
        'surface:liquidCO2': 4,
        'surface:liquidHydrogen': 4,
        'surface:liquidMethane': 4,
        'surface:hydrocarbonIce': 4,
        'surface:liquidAmmonia': 4,
        'surface:ammoniaIce': 4,
        'surface:liquidOxygen': 4,
        'surface:oxygenIce': 4,
        'surface:liquidNitrogen': 4,
        'surface:nitrogenIce': 4,
        'surface:fineSand': 4,
        'surface:biomass': 4,
        'surface:hazardousBiomass': 4,
        'surface:hazardousMachinery': 4,
        'surface:rocks': 4,
        'surface:graphite': 4,
        'surface:scrapMetal': 4,
        'surface:garbage': 4,
        'surface:trash': 4,
        'surface:junk': 4,
        'surface:radioactiveWaste': 4,
        'underground:ore': 4,
        'underground:geothermal': 4,
        'underground:planetaryMass': 4,
        'underground:stellarMass': 4,
        'atmospheric:carbonDioxide': 4,
        'atmospheric:inertGas': 4,
        'atmospheric:oxygen': 4,
        'atmospheric:atmosphericWater': 4,
        'atmospheric:greenhouseGas': 4,
        'atmospheric:atmosphericMethane': 4,
        'atmospheric:atmosphericAmmonia': 4,
        'atmospheric:hydrogen': 4,
        'atmospheric:sulfuricAcid': 4,
        'atmospheric:calciteAerosol': 4,
        'atmospheric:vanadiumAerosol': 4,
        'special:albedoUpgrades': 4,
        'special:orbitalDebris': 4,
        'special:spaceships': 4,
        'special:alienArtifact': 4,
        'special:crusaders': 4,
        'special:warpCircuits': 4,
        'special:antimatter': 4,
        'space:energy': 4,
        'spaceStorage:metal': 4,
        'spaceStorage:silicon': 4,
        'spaceStorage:graphite': 4,
        'spaceStorage:glass': 4,
        'spaceStorage:components': 4,
        'spaceStorage:electronics': 4,
        'spaceStorage:superconductors': 4,
        'spaceStorage:superalloys': 4,
        'spaceStorage:liquidWater': 4,
        'spaceStorage:biomass': 4,
        'spaceStorage:carbonDioxide': 4,
        'spaceStorage:inertGas': 4,
        'spaceStorage:oxygen': 4,
        'spaceStorage:atmosphericMethane': 4,
        'spaceStorage:atmosphericAmmonia': 4,
        'spaceStorage:hydrogen': 4
      }
    }
  },
  star: {
    name: '',
    spectralType: 'G2V',
    luminositySolar: 1,
    massSolar: 1,
    radiusSolar: 1,
    temperatureK: 5772,
    habitableZone: { inner: 0.82, outer: 1.17 }
  },
  celestialParameters: {
    distanceFromSun: 1,
    gravity: 7.8456,
    hasNaturalMagnetosphere: true,
    radius: 5096.8,
    mass: 3.057664e24,
    albedo: 0.05,
    rotationPeriod: 24,
    spinPeriod: 24,
    starLuminosity: 1,
    coreHeatFlux: 250_000,
    sector: 'R5-00',
    surfaceArea: 326446080000000
  },
  visualization: {
    baseColor: '#878a81',
    heightMapKey: 'earth'
  },
  resources: {
    surface: {
      land: { initialValue: 32644608000 },
      ice: { initialValue: 0 },
      liquidWater: { initialValue: 0 },
      dryIce: { initialValue: 0 },
      liquidCO2: { initialValue: 0 },
      liquidHydrogen: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 },
      liquidAmmonia: { initialValue: 0 },
      ammoniaIce: { initialValue: 0 },
      liquidOxygen: { initialValue: 0 },
      oxygenIce: { initialValue: 0 },
      liquidNitrogen: { initialValue: 0 },
      nitrogenIce: { initialValue: 0 },
      fineSand: { initialValue: 0 },
      biomass: { initialValue: 0 },
      hazardousBiomass: { initialValue: 0 },
      hazardousMachinery: { initialValue: 0 },
      rocks: { initialValue: 0 },
      graphite: { initialValue: 0 },
      scrapMetal: { initialValue: 0 },
      garbage: { initialValue: 0 },
      trash: { initialValue: 0 },
      junk: { initialValue: 0 },
      radioactiveWaste: { initialValue: 0 }
    },
    underground: {
      ore: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
      planetaryMass: { initialValue: 0 }
    },
    atmospheric: {
      carbonDioxide: { initialValue: 0 },
      atmosphericWater: { initialValue: 0 },
      atmosphericMethane: { initialValue: 0 },
      atmosphericAmmonia: { initialValue: 0 },
      greenhouseGas: { initialValue: 0 },
      oxygen: { initialValue: 0 },
      inertGas: { initialValue: 0 },
      hydrogen: { initialValue: 0 },
      sulfuricAcid: { initialValue: 0 },
      calciteAerosol: { initialValue: 0 },
      vanadiumAerosol: { initialValue: 0 }
    }
  },
  zonalSurface: createZonalSurfaceDefaults(),
  zonalTemperatures: null
};

// --- Parameter Retrieval Logic ---

const planetSpecificOverrides = {
  mars: marsOverrides,
  titan: titanOverrides,
  callisto: callistoOverrides,
  ganymede: ganymedeOverrides,
  vega2: vega2Overrides,
  venus: venusOverrides,
  umbra: umbraOverrides,
  solisprime: solisPrimeOverrides,
  gabbag: gabbagOverrides,
  tartarus: tartarusOverrides,
  hades: hadesOverrides,
  poseidon: poseidonOverrides,
  styx: styxOverrides,
  zeus: zeusOverrides,
  olympus: olympusOverrides,
  earth: earthOverrides
  // Add future planets here by defining their override objects
};
// Expose overrides for modules needing raw planet data
const planetOverrides = planetSpecificOverrides;

/**
 * Gets the fully merged parameters for a specific planet by combining
 * the default parameters with the planet-specific overrides.
 * @param {string} planetName - The name of the planet (e.g., 'mars', 'titan'). Case-insensitive.
 * @returns {object} The complete parameter object for the planet.
 */
function getPlanetParameters(planetName) {
  const lowerCasePlanetName = planetName.toLowerCase();
  const overrides = planetSpecificOverrides[lowerCasePlanetName];

  if (!overrides) {
    console.error(`No parameters defined for planet: ${planetName}. Returning default parameters.`);
    // Return a deep copy of defaults to prevent accidental modification
    return JSON.parse(JSON.stringify(defaultPlanetParameters));
  }

  // Perform a deep merge of defaults and the specific planet's overrides
  const mergedParameters = deepMerge(defaultPlanetParameters, overrides);

  if (mergedParameters.celestialParameters && mergedParameters.celestialParameters.rogue) {
    delete mergedParameters.star;
  }

  return mergedParameters;
}

// --- Export Structure ---
// Recreate the original export structure `planetParameters.mars` and `planetParameters.titan`
// by pre-calculating the merged parameters for the known planets.
// This ensures compatibility with existing code that expects this structure.

const planetParameters = {
    mars: getPlanetParameters('mars'),
    titan: getPlanetParameters('titan'),
    callisto: getPlanetParameters('callisto'),
    ganymede: getPlanetParameters('ganymede'),
    vega2: getPlanetParameters('vega2'),
    venus: getPlanetParameters('venus'),
    umbra: getPlanetParameters('umbra'),
    solisprime: getPlanetParameters('solisprime'),
    gabbag: getPlanetParameters('gabbag'),
    tartarus: getPlanetParameters('tartarus'),
    hades: getPlanetParameters('hades'),
    poseidon: getPlanetParameters('poseidon'),
    styx: getPlanetParameters('styx'),
    zeus: getPlanetParameters('zeus'),
    olympus: getPlanetParameters('olympus'),
    earth: getPlanetParameters('earth'),
};

// If the codebase evolves to use the getPlanetParameters function directly,
// the export could be changed to: export { getPlanetParameters, defaultPlanetParameters };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getPlanetParameters, planetParameters, defaultPlanetParameters, planetOverrides };
}
