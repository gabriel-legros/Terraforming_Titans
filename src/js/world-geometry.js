function calculateSurfaceAreaHectaresFromRadius(radiusKm) {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return 0;
  }
  return 4 * Math.PI * radiusKm * radiusKm * 100;
}

const WORLD_GEOMETRY_G = 6.6743e-11;
const WORLD_GEOMETRY_MIN_VOLUME_FRACTION = 0.01;
const WORLD_GEOMETRY_FALLBACK_DENSITY = 1000;
const WORLD_GEOMETRY_MIN_DENSITY = 1;

const DYNAMIC_WORLD_SURFACE_DENSITIES = {
  liquidWater: 1000,
  ice: 917,
  dryIce: 1560,
  liquidCO2: 1100,
  liquidMethane: 450,
  hydrocarbonIce: 500,
  liquidAmmonia: 680,
  ammoniaIce: 817,
  liquidOxygen: 1140,
  oxygenIce: 1426,
  liquidNitrogen: 810,
  nitrogenIce: 1030,
  biomass: 1100,
  hazardousBiomass: 1100,
  hazardousMachinery: 3000,
  graphite: 2260,
  scrapMetal: 7800,
  garbage: 300,
  trash: 300,
  junk: 500,
  radioactiveWaste: 10000
};

const DYNAMIC_WORLD_SURFACE_MASS_KEYS = [
  'liquidWater',
  'ice',
  'dryIce',
  'liquidCO2',
  'liquidMethane',
  'hydrocarbonIce',
  'liquidAmmonia',
  'ammoniaIce',
  'liquidOxygen',
  'oxygenIce',
  'liquidNitrogen',
  'nitrogenIce',
  'biomass',
  'hazardousBiomass',
  'hazardousMachinery',
  'graphite',
  'scrapMetal',
  'garbage',
  'trash',
  'junk',
  'radioactiveWaste'
];

const DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS = [
  'carbonDioxide',
  'inertGas',
  'oxygen',
  'atmosphericWater',
  'greenhouseGas',
  'atmosphericMethane',
  'atmosphericAmmonia',
  'hydrogen',
  'sulfuricAcid',
  'calciteAerosol'
];

const DYNAMIC_WORLD_PLANETARY_IMPORT_DENSITIES = {
  metal: 7800,
  silicon: 2650,
};

function calculateSurfaceAreaM2FromRadius(radiusKm) {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return 0;
  }
  const radiusM = radiusKm * 1000;
  return 4 * Math.PI * radiusM * radiusM;
}

function calculateCrossSectionAreaM2FromRadius(radiusKm) {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return 0;
  }
  const radiusM = radiusKm * 1000;
  return Math.PI * radiusM * radiusM;
}

function calculateSphereVolumeM3FromRadius(radiusKm) {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return 0;
  }
  const radiusM = radiusKm * 1000;
  return (4 / 3) * Math.PI * Math.pow(radiusM, 3);
}

function calculateRadiusKmFromVolume(volumeM3) {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) {
    return 0;
  }
  return Math.cbrt((3 * volumeM3) / (4 * Math.PI)) / 1000;
}

function calculateGravityFromMassRadius(massKg, radiusKm) {
  if (!Number.isFinite(massKg) || massKg <= 0 || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return 0;
  }
  const radiusM = radiusKm * 1000;
  return (WORLD_GEOMETRY_G * massKg) / (radiusM * radiusM);
}

function calculateAverageDensityKgM3(massKg, volumeM3) {
  if (!Number.isFinite(massKg) || massKg <= 0 || !Number.isFinite(volumeM3) || volumeM3 <= 0) {
    return WORLD_GEOMETRY_FALLBACK_DENSITY;
  }
  return Math.max(WORLD_GEOMETRY_MIN_DENSITY, massKg / volumeM3);
}

function resolveWorldBaseLand(terraformingState, landResource, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeLandResource = landResource || activeTerraforming?.resources?.surface?.land || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const candidates = [
    activeTerraforming?.baseLand,
    activeCelestialParameters?.baseLand,
    activeLandResource?.baseLand,
    activeTerraforming?.initialLand,
    activeLandResource?.initialValue,
    activeLandResource?.baseCap
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return calculateSurfaceAreaHectaresFromRadius(activeCelestialParameters?.radius);
}

function resolveWorldGeometricLand(terraformingState, landResource, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const geometricLand = calculateSurfaceAreaHectaresFromRadius(activeCelestialParameters?.radius);
  if (geometricLand > 0) {
    return geometricLand;
  }
  return resolveWorldBaseLand(activeTerraforming, landResource, activeCelestialParameters);
}

function resolveWorldBaseRadius(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const initialCelestialParameters = activeTerraforming?.initialCelestialParameters || null;
  const candidates = [
    initialCelestialParameters?.baseRadius,
    initialCelestialParameters?.radius,
    activeCelestialParameters?.baseRadius,
    activeTerraforming?.baseRadius,
    activeCelestialParameters?.radius
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return 0;
}

function resolveWorldBaseMass(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const initialCelestialParameters = activeTerraforming?.initialCelestialParameters || null;
  const candidates = [
    initialCelestialParameters?.baseMass,
    initialCelestialParameters?.mass,
    activeCelestialParameters?.baseMass,
    activeTerraforming?.baseMass,
    activeCelestialParameters?.mass
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  const radiusKm = resolveWorldBaseRadius(activeTerraforming, activeCelestialParameters);
  const gravity = Number.isFinite(initialCelestialParameters?.gravity)
    ? initialCelestialParameters.gravity
    : activeCelestialParameters?.gravity;
  if (!Number.isFinite(gravity) || gravity <= 0 || radiusKm <= 0) {
    return 0;
  }
  const radiusM = radiusKm * 1000;
  return (gravity * radiusM * radiusM) / WORLD_GEOMETRY_G;
}

function getWorldGeometryResourceDeltaTons(resource) {
  if (!resource) {
    return 0;
  }
  const currentValue = Number.isFinite(resource.value) ? resource.value : 0;
  const initialValue = Number.isFinite(resource.initialValue) ? resource.initialValue : 0;
  return currentValue - initialValue;
}

function calculateDynamicWorldMassDeltaKg(resourceSet) {
  if (!resourceSet) {
    return 0;
  }

  let totalKg = 0;
  const surface = resourceSet.surface || {};
  const atmospheric = resourceSet.atmospheric || {};

  for (let index = 0; index < DYNAMIC_WORLD_SURFACE_MASS_KEYS.length; index += 1) {
    const key = DYNAMIC_WORLD_SURFACE_MASS_KEYS[index];
    totalKg += getWorldGeometryResourceDeltaTons(surface[key]) * 1000;
  }

  for (let index = 0; index < DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS.length; index += 1) {
    const key = DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS[index];
    totalKg += getWorldGeometryResourceDeltaTons(atmospheric[key]) * 1000;
  }

  return totalKg;
}

function calculateDynamicWorldSurfaceVolumeDeltaM3(resourceSet) {
  if (!resourceSet) {
    return 0;
  }

  let totalVolume = 0;
  const surface = resourceSet.surface || {};

  for (let index = 0; index < DYNAMIC_WORLD_SURFACE_MASS_KEYS.length; index += 1) {
    const key = DYNAMIC_WORLD_SURFACE_MASS_KEYS[index];
    const deltaTons = getWorldGeometryResourceDeltaTons(surface[key]);
    if (!deltaTons) {
      continue;
    }
    const density = DYNAMIC_WORLD_SURFACE_DENSITIES[key] || WORLD_GEOMETRY_FALLBACK_DENSITY;
    totalVolume += (deltaTons * 1000) / density;
  }

  return totalVolume;
}

function resolveDynamicWorldDirectMassDeltaKg(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const candidates = [
    activeCelestialParameters?.dynamicDirectMassDeltaKg,
    activeTerraforming?.dynamicDirectMassDeltaKg
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return 0;
}

function resolveDynamicWorldDirectVolumeDeltaM3(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const candidates = [
    activeCelestialParameters?.dynamicDirectVolumeDeltaM3,
    activeTerraforming?.dynamicDirectVolumeDeltaM3
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return 0;
}

function setDynamicWorldDirectLedger(terraformingState, massDeltaKg, volumeDeltaM3) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = activeTerraforming?.celestialParameters || null;
  if (!activeTerraforming || !activeCelestialParameters) {
    return;
  }

  activeTerraforming.dynamicDirectMassDeltaKg = massDeltaKg;
  activeTerraforming.dynamicDirectVolumeDeltaM3 = volumeDeltaM3;
  activeCelestialParameters.dynamicDirectMassDeltaKg = massDeltaKg;
  activeCelestialParameters.dynamicDirectVolumeDeltaM3 = volumeDeltaM3;
}

function getDynamicWorldCurrentMassKg(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const baseMass = resolveWorldBaseMass(activeTerraforming, activeCelestialParameters);
  const resourceMassDeltaKg = calculateDynamicWorldMassDeltaKg(activeTerraforming?.resources);
  const directMassDeltaKg = resolveDynamicWorldDirectMassDeltaKg(activeTerraforming, activeCelestialParameters);
  return Math.max(0, baseMass + resourceMassDeltaKg + directMassDeltaKg);
}

function getDynamicWorldCurrentVolumeM3(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const baseRadius = resolveWorldBaseRadius(activeTerraforming, activeCelestialParameters);
  const baseVolume = calculateSphereVolumeM3FromRadius(baseRadius);
  const surfaceVolumeDeltaM3 = calculateDynamicWorldSurfaceVolumeDeltaM3(activeTerraforming?.resources);
  const directVolumeDeltaM3 = resolveDynamicWorldDirectVolumeDeltaM3(activeTerraforming, activeCelestialParameters);
  return Math.max(
    baseVolume * WORLD_GEOMETRY_MIN_VOLUME_FRACTION,
    baseVolume + surfaceVolumeDeltaM3 + directVolumeDeltaM3
  );
}

function getDynamicWorldPlanetaryMassAvailableTons(terraformingState, celestialParameters) {
  return getDynamicWorldCurrentMassKg(terraformingState, celestialParameters) / 1000;
}

function addDynamicWorldPlanetaryMaterial(terraformingState, materialKey, amountTons) {
  const activeTerraforming = terraformingState || null;
  if (!activeTerraforming || amountTons <= 0) {
    return 0;
  }

  const density = DYNAMIC_WORLD_PLANETARY_IMPORT_DENSITIES[materialKey] || WORLD_GEOMETRY_FALLBACK_DENSITY;
  const addedKg = amountTons * 1000;
  const addedVolumeM3 = addedKg / density;
  const nextMassDeltaKg = resolveDynamicWorldDirectMassDeltaKg(activeTerraforming) + addedKg;
  const nextVolumeDeltaM3 = resolveDynamicWorldDirectVolumeDeltaM3(activeTerraforming) + addedVolumeM3;
  setDynamicWorldDirectLedger(activeTerraforming, nextMassDeltaKg, nextVolumeDeltaM3);
  return amountTons;
}

function disposeDynamicWorldPlanetaryMass(terraformingState, amountTons) {
  const activeTerraforming = terraformingState || null;
  if (!activeTerraforming || amountTons <= 0) {
    return 0;
  }

  const currentMassKg = getDynamicWorldCurrentMassKg(activeTerraforming);
  if (currentMassKg <= 0) {
    return 0;
  }

  const removableKg = Math.min(amountTons * 1000, currentMassKg);
  const currentVolumeM3 = getDynamicWorldCurrentVolumeM3(activeTerraforming);
  const removalDensity = calculateAverageDensityKgM3(currentMassKg, currentVolumeM3);
  const removedVolumeM3 = removableKg / removalDensity;
  const nextMassDeltaKg = resolveDynamicWorldDirectMassDeltaKg(activeTerraforming) - removableKg;
  const nextVolumeDeltaM3 = resolveDynamicWorldDirectVolumeDeltaM3(activeTerraforming) - removedVolumeM3;
  setDynamicWorldDirectLedger(activeTerraforming, nextMassDeltaKg, nextVolumeDeltaM3);
  return removableKg / 1000;
}

function hasDynamicMassEnabled(terraformingState, planetParameters) {
  const activePlanetParameters = planetParameters || null;
  return activePlanetParameters?.specialAttributes?.dynamicMass === true;
}

function ensureCelestialAreaFields(celestialParameters) {
  if (!celestialParameters) {
    return;
  }
  celestialParameters.surfaceArea = calculateSurfaceAreaM2FromRadius(celestialParameters.radius);
  celestialParameters.crossSectionArea = calculateCrossSectionAreaM2FromRadius(celestialParameters.radius);
}

function syncDynamicWorldGeometry(terraformingState, planetParameters) {
  const activeTerraforming = terraformingState || null;
  if (!activeTerraforming || !activeTerraforming.celestialParameters) {
    return null;
  }

  const activeCelestialParameters = activeTerraforming.celestialParameters;
  const initialCelestialParameters = activeTerraforming.initialCelestialParameters || null;
  const activePlanetParameters = planetParameters || null;
  const baseLand = resolveWorldBaseLand(
    activeTerraforming,
    activeTerraforming.resources?.surface?.land,
    activeCelestialParameters
  );
  const baseRadius = resolveWorldBaseRadius(activeTerraforming, activeCelestialParameters);
  const baseMass = resolveWorldBaseMass(activeTerraforming, activeCelestialParameters);
  const baseGravity = calculateGravityFromMassRadius(baseMass, baseRadius);

  activeTerraforming.baseLand = baseLand;
  activeTerraforming.baseRadius = baseRadius;
  activeTerraforming.baseMass = baseMass;
  activeTerraforming.baseGravity = baseGravity;
  activeTerraforming.initialLand = baseLand;

  if (activeTerraforming.resources?.surface?.land) {
    activeTerraforming.resources.surface.land.baseLand = baseLand;
  }

  activeCelestialParameters.baseLand = baseLand;
  activeCelestialParameters.baseRadius = baseRadius;
  activeCelestialParameters.baseMass = baseMass;
  activeCelestialParameters.baseGravity = baseGravity;

  if (initialCelestialParameters) {
    initialCelestialParameters.baseLand = baseLand;
    initialCelestialParameters.baseRadius = baseRadius;
    initialCelestialParameters.baseMass = baseMass;
    initialCelestialParameters.baseGravity = baseGravity;
    ensureCelestialAreaFields(initialCelestialParameters);
  }

  if (hasDynamicMassEnabled(activeTerraforming, activePlanetParameters)) {
    const baseVolume = calculateSphereVolumeM3FromRadius(baseRadius);
    const resourceMassDeltaKg = calculateDynamicWorldMassDeltaKg(activeTerraforming.resources);
    const surfaceVolumeDeltaM3 = calculateDynamicWorldSurfaceVolumeDeltaM3(activeTerraforming.resources);
    const directMassDeltaKg = resolveDynamicWorldDirectMassDeltaKg(activeTerraforming, activeCelestialParameters);
    const directVolumeDeltaM3 = resolveDynamicWorldDirectVolumeDeltaM3(activeTerraforming, activeCelestialParameters);
    const massDeltaKg = resourceMassDeltaKg + directMassDeltaKg;
    const volumeDeltaM3 = surfaceVolumeDeltaM3 + directVolumeDeltaM3;
    const currentMass = Math.max(0, baseMass + massDeltaKg);
    const currentVolume = Math.max(baseVolume * WORLD_GEOMETRY_MIN_VOLUME_FRACTION, baseVolume + volumeDeltaM3);
    const currentRadius = calculateRadiusKmFromVolume(currentVolume);
    const currentGravity = calculateGravityFromMassRadius(currentMass, currentRadius);

    activeTerraforming.dynamicMassDeltaKg = massDeltaKg;
    activeTerraforming.dynamicSurfaceVolumeDeltaM3 = volumeDeltaM3;
    activeTerraforming.dynamicDirectMassDeltaKg = directMassDeltaKg;
    activeTerraforming.dynamicDirectVolumeDeltaM3 = directVolumeDeltaM3;
    activeCelestialParameters.mass = currentMass;
    activeCelestialParameters.radius = currentRadius;
    activeCelestialParameters.gravity = currentGravity;
    activeCelestialParameters.dynamicMassDeltaKg = massDeltaKg;
    activeCelestialParameters.dynamicSurfaceVolumeDeltaM3 = volumeDeltaM3;
    activeCelestialParameters.dynamicDirectMassDeltaKg = directMassDeltaKg;
    activeCelestialParameters.dynamicDirectVolumeDeltaM3 = directVolumeDeltaM3;
  }

  ensureCelestialAreaFields(activeCelestialParameters);

  if (activePlanetParameters?.celestialParameters) {
    activePlanetParameters.celestialParameters.baseLand = activeCelestialParameters.baseLand;
    activePlanetParameters.celestialParameters.baseRadius = activeCelestialParameters.baseRadius;
    activePlanetParameters.celestialParameters.baseMass = activeCelestialParameters.baseMass;
    activePlanetParameters.celestialParameters.baseGravity = activeCelestialParameters.baseGravity;
    activePlanetParameters.celestialParameters.mass = activeCelestialParameters.mass;
    activePlanetParameters.celestialParameters.radius = activeCelestialParameters.radius;
    activePlanetParameters.celestialParameters.gravity = activeCelestialParameters.gravity;
    activePlanetParameters.celestialParameters.surfaceArea = activeCelestialParameters.surfaceArea;
    activePlanetParameters.celestialParameters.crossSectionArea = activeCelestialParameters.crossSectionArea;
    activePlanetParameters.celestialParameters.dynamicMassDeltaKg = activeCelestialParameters.dynamicMassDeltaKg || 0;
    activePlanetParameters.celestialParameters.dynamicSurfaceVolumeDeltaM3 = activeCelestialParameters.dynamicSurfaceVolumeDeltaM3 || 0;
    activePlanetParameters.celestialParameters.dynamicDirectMassDeltaKg = activeCelestialParameters.dynamicDirectMassDeltaKg || 0;
    activePlanetParameters.celestialParameters.dynamicDirectVolumeDeltaM3 = activeCelestialParameters.dynamicDirectVolumeDeltaM3 || 0;
  }
  if (activePlanetParameters?.resources?.surface?.land) {
    activePlanetParameters.resources.surface.land.baseLand = baseLand;
  }

  return activeCelestialParameters;
}

try {
  module.exports = {
    calculateCrossSectionAreaM2FromRadius,
    calculateAverageDensityKgM3,
    calculateDynamicWorldMassDeltaKg,
    calculateDynamicWorldSurfaceVolumeDeltaM3,
    addDynamicWorldPlanetaryMaterial,
    calculateGravityFromMassRadius,
    disposeDynamicWorldPlanetaryMass,
    getDynamicWorldCurrentMassKg,
    getDynamicWorldCurrentVolumeM3,
    getDynamicWorldPlanetaryMassAvailableTons,
    hasDynamicMassEnabled,
    calculateRadiusKmFromVolume,
    calculateSphereVolumeM3FromRadius,
    calculateSurfaceAreaM2FromRadius,
    calculateSurfaceAreaHectaresFromRadius,
    resolveDynamicWorldDirectMassDeltaKg,
    resolveDynamicWorldDirectVolumeDeltaM3,
    resolveWorldBaseLand,
    resolveWorldBaseMass,
    resolveWorldBaseRadius,
    resolveWorldGeometricLand,
    syncDynamicWorldGeometry
  };
} catch (error) {
  // Module system not available in browser.
}
