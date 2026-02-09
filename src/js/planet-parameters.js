// Helper function for deep merging objects
// Ensures that nested objects are merged correctly, not just replaced.
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function deepMerge(target, source) {
  let output = { ...target }; // Start with a copy of the target
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (isObject(targetValue) && isObject(sourceValue)) {
        // If both target and source have an object for this key, recurse
        output[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        // Otherwise, if source has a defined value (could be null, 0, false), overwrite the target value
        output[key] = sourceValue;
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
  'liquidMethane',
  'hydrocarbonIce',
  'buriedHydrocarbonIce',
  'liquidAmmonia',
  'ammoniaIce',
  'buriedAmmoniaIce',
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
  name: 'Default Planet', // Will be overridden by specific planets
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
  gravityPenaltyEnabled: false,
  fundingRate: 0, // Default
  // Default host star information (for Solar System worlds)
  star: {
    name: 'Sun',
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
    sector: 'R5-07',
  },
  visualization: {
    baseColor: '#8a2a2a',
  }
};

// --- Planet Specific Overrides ---
// Define only the properties that differ from the defaults for each planet.

const marsOverrides = {
  name: 'Mars',
   "resources": {
"atmospheric": {
      "carbonDioxide": {
        "initialValue": 22587857536571.734
      },
      "atmosphericWater": {
        "initialValue": 182143.3787223903
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
      "ice": 94820.5219980974,
      "buriedIce": 1100000000000000,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 161860.48721625496,
      "buriedIce": 1900000000000000,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 4500007999561769,
      "buriedIce": 700000000000000,
      "dryIce": 1410953026128.038,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 231.2275452411826,
      "day": 249.55784698012837,
      "night": 212.89724350223685
    },
    "temperate": {
      "value": 214.78710493538134,
      "day": 230.0301710182334,
      "night": 199.54403885252927
    },
    "polar": {
      "value": 137.539654287587,
      "day": 143.5544868132358,
      "night": 131.52482176193823
    }
  },
  fundingRate: 10,
  visualization: {
    baseColor: '#8a2a2a',
  }
};

const titanOverrides = {
  name: 'Titan',
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
        "initialValue": 24546.692337431283
      },
      "atmosphericWater": {
        "initialValue": 2.1929813409566692e-12
      },
      "atmosphericMethane": {
        "initialValue": 429167709268379
      },
      "oxygen": {
        "initialValue": 1000000000
      },
      "inertGas": {
        "initialValue": 9000000000000000
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
      "ice": 3791.2409230205194,
      "buriedIce": 150000000000000,
      "dryIce": 140.80712370665907,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 82339862995413.12,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 4628.179160457752,
      "buriedIce": 1350000000000000,
      "dryIce": 287.387852772999,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 109403600938955.66,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 9450000000001650,
      "buriedIce": 4050000000000000,
      "dryIce": 75025.11268869208,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 22608546412124.27,
      "buriedHydrocarbonIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 98.30784590090926,
      "day": 98.65930267600446,
      "night": 97.95638912581406
    },
    "temperate": {
      "value": 94.23971962768708,
      "day": 94.53198611891574,
      "night": 93.94745313645842
    },
    "polar": {
      "value": 75.43120281593586,
      "day": 75.52947971415591,
      "night": 75.33292591771581
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
      name: 'Saturn',
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
  name: 'Callisto',

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
        "initialValue": 38975.084195126
      },
      "atmosphericWater": {
        "initialValue": 161.30652767133944
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
      "ice": 195712.32470430483,
      "buriedIce": 4000000000000000000,
      "dryIce": 0.0000010844611386499015,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 2471770.2854785556,
      "buriedIce": 5000000000000000000,
      "dryIce": 0.0006507601027874387,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 39999644135733.36,
      "buriedIce": 1000000000000000000,
      "dryIce": 11024.915153227,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 122.90375412845735,
      "day": 133.6276398425136,
      "night": 112.1798684144011
    },
    "temperate": {
      "value": 114.16322646634974,
      "day": 123.08096831900012,
      "night": 105.24548461369936
    },
    "polar": {
      "value": 80.02341838407527,
      "day": 85.37613100181616,
      "night": 74.67070576633438
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
      name: 'Jupiter',
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
  name: 'Ganymede',

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
        "initialValue": 44365.09639626417
      },
      "atmosphericWater": {
        "initialValue": 1308117.6166008068
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
      "ice": 10788885218.153574,
      "buriedIce": 5000000000000000000,
      "dryIce": 7.19277235458896e-220,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 231061583429084.53,
      "buriedIce": 7000000000000000000,
      "dryIce": 1.4384283977013396e-162,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 66922307386502.195,
      "buriedIce": 2000000000000000000,
      "dryIce": 14734.90360376347,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 121.3938643170457,
      "day": 129.80596441448122,
      "night": 112.98176421961017
    },
    "temperate": {
      "value": 102.60026627256036,
      "day": 110.12877872333048,
      "night": 95.07175382179024
    },
    "polar": {
      "value": 78.59520332599821,
      "day": 82.74484759948332,
      "night": 74.4455590525131
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
      name: 'Jupiter',
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
  name: 'Vega-2',
  travelWarning: {
    message: 'This world has no water.  Solis can help.'
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
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 337.4689719982621,
      "day": 346.2969337485034,
      "night": 328.64101024802073
    },
    "temperate": {
      "value": 313.74935690042946,
      "day": 321.09049106497616,
      "night": 306.40822273588276
    },
    "polar": {
      "value": 245.64483502770628,
      "day": 249.5916011279036,
      "night": 241.69806892750896
    }
  },
  star: {
    name: 'Vega',
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
  name: 'Venus',
  travelWarning: {
    message: 'This planet is much harder than usual.  Preparing is not necessary, but will make it significantly it easier.',
    hint: {
      title: 'Hint',
      body: '- Skill points can help a lot.  \n - With few skill points, the Solis upgrade for early colony sliders can make the early game more doable.  A high worker ratio can help with resource shortage (especially components) \n - The Warp Gate Command can improve your components and electronics production. \n - The 125k Advanced Research can make an aspect of the game a lot easier.'
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
        "initialValue": 45496476928636.34
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
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 739.3662238693169,
      "day": 740.6045665080094,
      "night": 738.1278812306243
    },
    "temperate": {
      "value": 736.5790959890641,
      "day": 737.608873836943,
      "night": 735.5493181411852
    },
    "polar": {
      "value": 728.576604763981,
      "day": 729.1302375146764,
      "night": 728.0229720132855
    }
  },
  celestialParameters: {
    distanceFromSun: 0.723,
    gravity: 8.87,
    radius: 6051.8,
    mass: 4.867e24,
    albedo: 0.15,
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
  name: 'Umbra',
  star: {
    name: 'Nyx',
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
      name: 'Nyx-1',
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
        "initialValue": 213912508.59012756
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
      "liquidWater": 9366711649.697304,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 5336060040.357645,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "temperate": {
      "liquidWater": 7.861765233455825e-97,
      "ice": 11284654.585154064,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 6936037875.064085,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "polar": {
      "liquidWater": 1.97236826e-316,
      "ice": 371725360793681.06,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 1109902084.57827,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 283.6548382608397,
      "day": 286.9255666088492,
      "night": 280.38410991283024
    },
    "temperate": {
      "value": 264.0800722893885,
      "day": 266.79998458118405,
      "night": 261.360159997593
    },
    "polar": {
      "value": 180.34342674370112,
      "day": 181.35370706028448,
      "night": 179.33314642711775
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
  name: 'Solis Prime',
  travelWarning: {
    message: 'This planet is very easy, but it is possible to grow too fast.  If this happens, pausing autobuild is usually enough to recover. \n The story will give you some initial resources, but if some mega projects are on auto start you may end up using them instantly.',
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
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "liquidWater": 0,
      "ice": 1702476415693995.5,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "liquidWater": 0,
      "ice": 912340758918755.4,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0,
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 2.8965877751696056,
      "day": 2.897056679503238,
      "night": 2.896118870835973
    },
    "temperate": {
      "value": 2.765780521300558,
      "day": 2.766225770784607,
      "night": 2.765335271816509
    },
    "polar": {
      "value": 2.645365259614177,
      "day": 2.645787344036533,
      "night": 2.6449431751918207
    }
  }
};

const gabbagOverrides = {
  name: 'Gabbag',
  specialAttributes: {
    terraformingRequirementId: 'gabbagian',
  },
  star: {
    name: 'Gabbagsol',
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
        "initialValue": 1727255488337759.2
      },
      "atmosphericMethane": {
        "initialValue": 400000000000000
      },
      "oxygen": {
        "initialValue": 79141235823.26874
      },
      "inertGas": {
        "initialValue": 250000000000000000
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
      "liquidWater": 10385213724219784,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "temperate": {
      "liquidWater": 13508438052081872,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "polar": {
      "liquidWater": 2174779837648417.8,
      "ice": 0,
      "buriedIce": 0,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 359.19789038430855,
      "day": 359.32201103778635,
      "night": 359.07376973083075
    },
    "temperate": {
      "value": 357.84383611976267,
      "day": 357.94704040346227,
      "night": 357.7406318360631
    },
    "polar": {
      "value": 353.95618347862865,
      "day": 354.0116131500663,
      "night": 353.900753807191
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
  name: 'Tartarus',
  star: {
    name: 'Erebus',
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
    sector: 'R6-04'
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
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 22739477591653.016
      },
      "atmosphericWater": {
        "initialValue": 361692.2192329622
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
      "liquidWater": 2.1774204653475006e-18,
      "ice": 190690.18420949669,
      "buriedIce": 1100000000000000,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "temperate": {
      "liquidWater": 2.1142874869314475e-27,
      "ice": 308202.39282063144,
      "buriedIce": 1900000000000000,
      "dryIce": 0,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    },
    "polar": {
      "liquidWater": 7.953688300402228e-72,
      "ice": 4500007963545940,
      "buriedIce": 700000000000000,
      "dryIce": 1259332971058.2183,
      "buriedDryIce": 0,
      "liquidCO2": 0,
      "biomass": 0,
      "hazardousBiomass": 0,
      "liquidMethane": 0,
      "hydrocarbonIce": 0,
      "buriedHydrocarbonIce": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 231.1873033789808,
      "day": 252.0545452520671,
      "night": 210.3200615058945
    },
    "temperate": {
      "value": 214.7487788050519,
      "day": 232.10150716550308,
      "night": 197.39605044460072
    },
    "polar": {
      "value": 137.20330363548587,
      "day": 144.48578929253188,
      "night": 129.92081797843986
    }
  }
};

const hadesOverrides = {
  name: 'Hades',
  star: {
    name: 'PSR S-17634',
    spectralType: 'Pulsar',
    luminositySolar: 0.002,
    massSolar: 1.6,
    temperatureK: 600000,
    habitableZone: { inner: 0.02, outer: 0.05 }
  },
  celestialParameters: {
    distanceFromSun: 20,
    gravity: 6.9,
    radius: 5000,
    mass: 3.6e24,
    albedo: 0.18,
    rotationPeriod: 31.2,
    spinPeriod: 31.2,
    starLuminosity: 0.002,
    sector: 'R4-03'
  },
  visualization: {
    baseColor: '#4a4340',
  },
  hazards: {
    pulsar: {
      pulsePeriodSeconds: 1.337,
      severity: 1,
      orbitalDoseBoost_mSvPerDay: 4900,
      description: 'The pulsar emits periodic radiation bursts across the system.'
    }
  },
  resources: {
    surface: {
      land: { initialValue: 31_000_000_000 },
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
  }
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
  hades: hadesOverrides
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
};

// If the codebase evolves to use the getPlanetParameters function directly,
// the export could be changed to: export { getPlanetParameters, defaultPlanetParameters };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getPlanetParameters, planetParameters, defaultPlanetParameters, planetOverrides };
}


















