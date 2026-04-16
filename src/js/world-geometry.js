function calculateSurfaceAreaHectaresFromRadius(radiusKm) {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return 0;
  }
  return 4 * Math.PI * radiusKm * radiusKm * 100;
}

const WORLD_GEOMETRY_G = 6.6743e-11;
const WORLD_GEOMETRY_MIN_GRAVITY = 1e-12;
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
  fineSand: 1600,
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
  'fineSand',
  'liquidAmmonia',
  'ammoniaIce',
  'liquidOxygen',
  'oxygenIce',
  'liquidNitrogen',
  'nitrogenIce',
  'biomass',
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
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return 0;
  }
  if (!Number.isFinite(massKg) || massKg <= 0) {
    return WORLD_GEOMETRY_MIN_GRAVITY;
  }
  const radiusM = radiusKm * 1000;
  return Math.max(WORLD_GEOMETRY_MIN_GRAVITY, (WORLD_GEOMETRY_G * massKg) / (radiusM * radiusM));
}

function calculateAverageDensityKgM3(massKg, volumeM3) {
  if (!Number.isFinite(massKg) || massKg <= 0 || !Number.isFinite(volumeM3) || volumeM3 <= 0) {
    return WORLD_GEOMETRY_FALLBACK_DENSITY;
  }
  return Math.max(WORLD_GEOMETRY_MIN_DENSITY, massKg / volumeM3);
}

function resolveWorldBaseLand(terraformingState, landResource) {
  const activeTerraforming = terraformingState || null;
  const activeLandResource = landResource || activeTerraforming?.resources?.surface?.land || null;
  const activeCelestialParameters = activeTerraforming?.celestialParameters || null;
  const geometricLand = calculateSurfaceAreaHectaresFromRadius(activeCelestialParameters?.radius);
  const dynamicMassWorld = !!(
    activeCelestialParameters?.dynamicMassDeltaKg
    || activeCelestialParameters?.dynamicSurfaceVolumeDeltaM3
    || activeCelestialParameters?.dynamicDirectMassDeltaKg
    || activeCelestialParameters?.dynamicDirectVolumeDeltaM3
    || activeCelestialParameters?.currentPlanetaryMassKg
    || activeCelestialParameters?.currentSurfaceMassKg
    || activeCelestialParameters?.currentAtmosphericMassKg
    || activeCelestialParameters?.currentPlanetaryVolumeM3
    || activeCelestialParameters?.currentSurfaceVolumeM3
  );
  if (geometricLand > 0 && !dynamicMassWorld) {
    return geometricLand;
  }
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

function resolveWorldGeometricLand(terraformingState, landResource) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = activeTerraforming?.celestialParameters || null;
  const geometricLand = calculateSurfaceAreaHectaresFromRadius(activeCelestialParameters?.radius);
  return geometricLand > 0
    ? geometricLand
    : resolveWorldBaseLand(activeTerraforming, landResource);
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

function calculateDynamicWorldMassKgForKeys(resourceBucket, keys, useInitialValue = false) {
  if (!resourceBucket) {
    return 0;
  }

  let totalKg = 0;
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const resource = resourceBucket[key];
    if (!resource) {
      continue;
    }
    const amountTons = useInitialValue
      ? resource.initialValue
      : resource.value;
    if (Number.isFinite(amountTons) && amountTons > 0) {
      totalKg += amountTons * 1000;
    }
  }

  return totalKg;
}

function calculateDynamicWorldSurfaceVolumeM3ForKeys(surfaceResources, useInitialValue = false) {
  if (!surfaceResources) {
    return 0;
  }

  let totalVolume = 0;
  for (let index = 0; index < DYNAMIC_WORLD_SURFACE_MASS_KEYS.length; index += 1) {
    const key = DYNAMIC_WORLD_SURFACE_MASS_KEYS[index];
    const resource = surfaceResources[key];
    if (!resource) {
      continue;
    }
    const amountTons = useInitialValue
      ? resource.initialValue
      : resource.value;
    if (!Number.isFinite(amountTons) || amountTons <= 0) {
      continue;
    }
    const density = DYNAMIC_WORLD_SURFACE_DENSITIES[key] || WORLD_GEOMETRY_FALLBACK_DENSITY;
    totalVolume += (amountTons * 1000) / density;
  }

  return totalVolume;
}

function calculateDynamicWorldMassDeltaKg(resourceSet) {
  if (!resourceSet) {
    return 0;
  }

  const currentSurfaceMassKg = calculateDynamicWorldCurrentSurfaceMassKg(resourceSet);
  const initialSurfaceMassKg = calculateDynamicWorldInitialSurfaceMassKg(resourceSet);
  const currentAtmosphericMassKg = calculateDynamicWorldCurrentAtmosphericMassKg(resourceSet);
  const initialAtmosphericMassKg = calculateDynamicWorldInitialAtmosphericMassKg(resourceSet);
  return (currentSurfaceMassKg - initialSurfaceMassKg) + (currentAtmosphericMassKg - initialAtmosphericMassKg);
}

function calculateDynamicWorldCurrentSurfaceMassKg(resourceSet) {
  return calculateDynamicWorldMassKgForKeys(
    resourceSet?.surface || null,
    DYNAMIC_WORLD_SURFACE_MASS_KEYS
  );
}

function calculateDynamicWorldInitialSurfaceMassKg(resourceSet) {
  return calculateDynamicWorldMassKgForKeys(
    resourceSet?.surface || null,
    DYNAMIC_WORLD_SURFACE_MASS_KEYS,
    true
  );
}

function calculateDynamicWorldCurrentAtmosphericMassKg(resourceSet) {
  return calculateDynamicWorldMassKgForKeys(
    resourceSet?.atmospheric || null,
    DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS
  );
}

function calculateDynamicWorldInitialAtmosphericMassKg(resourceSet) {
  return calculateDynamicWorldMassKgForKeys(
    resourceSet?.atmospheric || null,
    DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS,
    true
  );
}

function calculateDynamicWorldSurfaceVolumeDeltaM3(resourceSet) {
  if (!resourceSet) {
    return 0;
  }

  return calculateDynamicWorldCurrentSurfaceVolumeM3(resourceSet) - calculateDynamicWorldInitialSurfaceVolumeM3(resourceSet);
}

function calculateDynamicWorldCurrentSurfaceVolumeM3(resourceSet) {
  return calculateDynamicWorldSurfaceVolumeM3ForKeys(
    resourceSet?.surface || null
  );
}

function calculateDynamicWorldInitialSurfaceVolumeM3(resourceSet) {
  return calculateDynamicWorldSurfaceVolumeM3ForKeys(
    resourceSet?.surface || null,
    true
  );
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

function resolveWorldBasePlanetaryMass(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const initialCelestialParameters = activeTerraforming?.initialCelestialParameters || null;
  const candidates = [
    initialCelestialParameters?.basePlanetaryMass,
    activeCelestialParameters?.basePlanetaryMass,
    activeTerraforming?.basePlanetaryMass
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (Number.isFinite(candidate) && candidate >= 0) {
      return candidate;
    }
  }

  const baseMass = resolveWorldBaseMass(activeTerraforming, activeCelestialParameters);
  const initialSurfaceMassKg = calculateDynamicWorldInitialSurfaceMassKg(activeTerraforming?.resources);
  const initialAtmosphericMassKg = calculateDynamicWorldInitialAtmosphericMassKg(activeTerraforming?.resources);
  return Math.max(0, baseMass - initialSurfaceMassKg - initialAtmosphericMassKg);
}

function resolveWorldBasePlanetaryVolumeM3(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const initialCelestialParameters = activeTerraforming?.initialCelestialParameters || null;
  const candidates = [
    initialCelestialParameters?.basePlanetaryVolumeM3,
    activeCelestialParameters?.basePlanetaryVolumeM3,
    activeTerraforming?.basePlanetaryVolumeM3
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  const baseRadius = resolveWorldBaseRadius(activeTerraforming, activeCelestialParameters);
  const baseVolume = calculateSphereVolumeM3FromRadius(baseRadius);
  const initialSurfaceVolumeM3 = calculateDynamicWorldInitialSurfaceVolumeM3(activeTerraforming?.resources);
  return Math.max(baseVolume * WORLD_GEOMETRY_MIN_VOLUME_FRACTION, baseVolume - initialSurfaceVolumeM3);
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

function getDynamicWorldCurrentPlanetaryMassKg(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const basePlanetaryMass = resolveWorldBasePlanetaryMass(activeTerraforming, activeCelestialParameters);
  const directMassDeltaKg = resolveDynamicWorldDirectMassDeltaKg(activeTerraforming, activeCelestialParameters);
  return Math.max(0, basePlanetaryMass + directMassDeltaKg);
}

function getDynamicWorldCurrentPlanetaryVolumeM3(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const activeCelestialParameters = celestialParameters || activeTerraforming?.celestialParameters || null;
  const basePlanetaryVolumeM3 = resolveWorldBasePlanetaryVolumeM3(activeTerraforming, activeCelestialParameters);
  const directVolumeDeltaM3 = resolveDynamicWorldDirectVolumeDeltaM3(activeTerraforming, activeCelestialParameters);
  return Math.max(basePlanetaryVolumeM3 * WORLD_GEOMETRY_MIN_VOLUME_FRACTION, basePlanetaryVolumeM3 + directVolumeDeltaM3);
}

function getDynamicWorldCurrentMassKg(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const currentPlanetaryMassKg = getDynamicWorldCurrentPlanetaryMassKg(activeTerraforming, celestialParameters);
  const currentSurfaceMassKg = calculateDynamicWorldCurrentSurfaceMassKg(activeTerraforming?.resources);
  const currentAtmosphericMassKg = calculateDynamicWorldCurrentAtmosphericMassKg(activeTerraforming?.resources);
  return currentPlanetaryMassKg + currentSurfaceMassKg + currentAtmosphericMassKg;
}

function getDynamicWorldCurrentVolumeM3(terraformingState, celestialParameters) {
  const activeTerraforming = terraformingState || null;
  const currentPlanetaryVolumeM3 = getDynamicWorldCurrentPlanetaryVolumeM3(activeTerraforming, celestialParameters);
  const currentSurfaceVolumeM3 = calculateDynamicWorldCurrentSurfaceVolumeM3(activeTerraforming?.resources);
  return currentPlanetaryVolumeM3 + currentSurfaceVolumeM3;
}

function getDynamicWorldPlanetaryMassAvailableTons(terraformingState, celestialParameters) {
  return getDynamicWorldCurrentPlanetaryMassKg(terraformingState, celestialParameters) / 1000;
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

  const currentPlanetaryMassKg = getDynamicWorldCurrentPlanetaryMassKg(activeTerraforming);
  if (currentPlanetaryMassKg <= 0) {
    return 0;
  }

  const removableKg = Math.min(amountTons * 1000, currentPlanetaryMassKg);
  const currentPlanetaryVolumeM3 = getDynamicWorldCurrentPlanetaryVolumeM3(activeTerraforming);
  const removalDensity = calculateAverageDensityKgM3(currentPlanetaryMassKg, currentPlanetaryVolumeM3);
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
    activeTerraforming.resources?.surface?.land
  );
  const baseRadius = resolveWorldBaseRadius(activeTerraforming, activeCelestialParameters);
  const baseMass = resolveWorldBaseMass(activeTerraforming, activeCelestialParameters);
  const baseGravity = calculateGravityFromMassRadius(baseMass, baseRadius);
  const basePlanetaryMass = resolveWorldBasePlanetaryMass(activeTerraforming, activeCelestialParameters);
  const basePlanetaryVolumeM3 = resolveWorldBasePlanetaryVolumeM3(activeTerraforming, activeCelestialParameters);
  const baseSurfaceMassKg = calculateDynamicWorldInitialSurfaceMassKg(activeTerraforming.resources);
  const baseAtmosphericMassKg = calculateDynamicWorldInitialAtmosphericMassKg(activeTerraforming.resources);

  activeTerraforming.baseLand = baseLand;
  activeTerraforming.baseRadius = baseRadius;
  activeTerraforming.baseMass = baseMass;
  activeTerraforming.baseGravity = baseGravity;
  activeTerraforming.basePlanetaryMass = basePlanetaryMass;
  activeTerraforming.basePlanetaryVolumeM3 = basePlanetaryVolumeM3;
  activeTerraforming.baseSurfaceMassKg = baseSurfaceMassKg;
  activeTerraforming.baseAtmosphericMassKg = baseAtmosphericMassKg;
  activeTerraforming.initialLand = baseLand;

  if (activeTerraforming.resources?.surface?.land) {
    activeTerraforming.resources.surface.land.baseLand = baseLand;
  }

  activeCelestialParameters.baseLand = baseLand;
  activeCelestialParameters.baseRadius = baseRadius;
  activeCelestialParameters.baseMass = baseMass;
  activeCelestialParameters.baseGravity = baseGravity;
  activeCelestialParameters.basePlanetaryMass = basePlanetaryMass;
  activeCelestialParameters.basePlanetaryVolumeM3 = basePlanetaryVolumeM3;
  activeCelestialParameters.baseSurfaceMassKg = baseSurfaceMassKg;
  activeCelestialParameters.baseAtmosphericMassKg = baseAtmosphericMassKg;

  if (initialCelestialParameters) {
    initialCelestialParameters.baseLand = baseLand;
    initialCelestialParameters.baseRadius = baseRadius;
    initialCelestialParameters.baseMass = baseMass;
    initialCelestialParameters.baseGravity = baseGravity;
    initialCelestialParameters.basePlanetaryMass = basePlanetaryMass;
    initialCelestialParameters.basePlanetaryVolumeM3 = basePlanetaryVolumeM3;
    initialCelestialParameters.baseSurfaceMassKg = baseSurfaceMassKg;
    initialCelestialParameters.baseAtmosphericMassKg = baseAtmosphericMassKg;
    ensureCelestialAreaFields(initialCelestialParameters);
  }

  if (hasDynamicMassEnabled(activeTerraforming, activePlanetParameters)) {
    const directMassDeltaKg = resolveDynamicWorldDirectMassDeltaKg(activeTerraforming, activeCelestialParameters);
    const directVolumeDeltaM3 = resolveDynamicWorldDirectVolumeDeltaM3(activeTerraforming, activeCelestialParameters);
    const currentPlanetaryMassKg = getDynamicWorldCurrentPlanetaryMassKg(activeTerraforming, activeCelestialParameters);
    const currentSurfaceMassKg = calculateDynamicWorldCurrentSurfaceMassKg(activeTerraforming.resources);
    const currentAtmosphericMassKg = calculateDynamicWorldCurrentAtmosphericMassKg(activeTerraforming.resources);
    const currentPlanetaryVolumeM3 = getDynamicWorldCurrentPlanetaryVolumeM3(activeTerraforming, activeCelestialParameters);
    const currentSurfaceVolumeM3 = calculateDynamicWorldCurrentSurfaceVolumeM3(activeTerraforming.resources);
    const currentMass = currentPlanetaryMassKg + currentSurfaceMassKg + currentAtmosphericMassKg;
    const currentVolume = currentPlanetaryVolumeM3 + currentSurfaceVolumeM3;
    const massDeltaKg = currentMass - baseMass;
    const volumeDeltaM3 = currentVolume - calculateSphereVolumeM3FromRadius(baseRadius);
    const currentRadius = calculateRadiusKmFromVolume(currentVolume);
    const currentGravity = calculateGravityFromMassRadius(currentMass, currentRadius);

    activeTerraforming.dynamicMassDeltaKg = massDeltaKg;
    activeTerraforming.dynamicSurfaceVolumeDeltaM3 = volumeDeltaM3;
    activeTerraforming.dynamicDirectMassDeltaKg = directMassDeltaKg;
    activeTerraforming.dynamicDirectVolumeDeltaM3 = directVolumeDeltaM3;
    activeTerraforming.currentPlanetaryMassKg = currentPlanetaryMassKg;
    activeTerraforming.currentSurfaceMassKg = currentSurfaceMassKg;
    activeTerraforming.currentAtmosphericMassKg = currentAtmosphericMassKg;
    activeTerraforming.currentPlanetaryVolumeM3 = currentPlanetaryVolumeM3;
    activeTerraforming.currentSurfaceVolumeM3 = currentSurfaceVolumeM3;
    activeCelestialParameters.mass = currentMass;
    activeCelestialParameters.radius = currentRadius;
    activeCelestialParameters.gravity = currentGravity;
    activeCelestialParameters.dynamicMassDeltaKg = massDeltaKg;
    activeCelestialParameters.dynamicSurfaceVolumeDeltaM3 = volumeDeltaM3;
    activeCelestialParameters.dynamicDirectMassDeltaKg = directMassDeltaKg;
    activeCelestialParameters.dynamicDirectVolumeDeltaM3 = directVolumeDeltaM3;
    activeCelestialParameters.currentPlanetaryMassKg = currentPlanetaryMassKg;
    activeCelestialParameters.currentSurfaceMassKg = currentSurfaceMassKg;
    activeCelestialParameters.currentAtmosphericMassKg = currentAtmosphericMassKg;
    activeCelestialParameters.currentPlanetaryVolumeM3 = currentPlanetaryVolumeM3;
    activeCelestialParameters.currentSurfaceVolumeM3 = currentSurfaceVolumeM3;
  }

  ensureCelestialAreaFields(activeCelestialParameters);

  if (activePlanetParameters?.celestialParameters) {
    activePlanetParameters.celestialParameters.baseLand = activeCelestialParameters.baseLand;
    activePlanetParameters.celestialParameters.baseRadius = activeCelestialParameters.baseRadius;
    activePlanetParameters.celestialParameters.baseMass = activeCelestialParameters.baseMass;
    activePlanetParameters.celestialParameters.baseGravity = activeCelestialParameters.baseGravity;
    activePlanetParameters.celestialParameters.basePlanetaryMass = activeCelestialParameters.basePlanetaryMass;
    activePlanetParameters.celestialParameters.basePlanetaryVolumeM3 = activeCelestialParameters.basePlanetaryVolumeM3;
    activePlanetParameters.celestialParameters.baseSurfaceMassKg = activeCelestialParameters.baseSurfaceMassKg;
    activePlanetParameters.celestialParameters.baseAtmosphericMassKg = activeCelestialParameters.baseAtmosphericMassKg;
    activePlanetParameters.celestialParameters.mass = activeCelestialParameters.mass;
    activePlanetParameters.celestialParameters.radius = activeCelestialParameters.radius;
    activePlanetParameters.celestialParameters.gravity = activeCelestialParameters.gravity;
    activePlanetParameters.celestialParameters.surfaceArea = activeCelestialParameters.surfaceArea;
    activePlanetParameters.celestialParameters.crossSectionArea = activeCelestialParameters.crossSectionArea;
    activePlanetParameters.celestialParameters.dynamicMassDeltaKg = activeCelestialParameters.dynamicMassDeltaKg || 0;
    activePlanetParameters.celestialParameters.dynamicSurfaceVolumeDeltaM3 = activeCelestialParameters.dynamicSurfaceVolumeDeltaM3 || 0;
    activePlanetParameters.celestialParameters.dynamicDirectMassDeltaKg = activeCelestialParameters.dynamicDirectMassDeltaKg || 0;
    activePlanetParameters.celestialParameters.dynamicDirectVolumeDeltaM3 = activeCelestialParameters.dynamicDirectVolumeDeltaM3 || 0;
    activePlanetParameters.celestialParameters.currentPlanetaryMassKg = activeCelestialParameters.currentPlanetaryMassKg || 0;
    activePlanetParameters.celestialParameters.currentSurfaceMassKg = activeCelestialParameters.currentSurfaceMassKg || 0;
    activePlanetParameters.celestialParameters.currentAtmosphericMassKg = activeCelestialParameters.currentAtmosphericMassKg || 0;
    activePlanetParameters.celestialParameters.currentPlanetaryVolumeM3 = activeCelestialParameters.currentPlanetaryVolumeM3 || 0;
    activePlanetParameters.celestialParameters.currentSurfaceVolumeM3 = activeCelestialParameters.currentSurfaceVolumeM3 || 0;
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
    calculateDynamicWorldCurrentAtmosphericMassKg,
    calculateDynamicWorldCurrentPlanetaryMassKg: getDynamicWorldCurrentPlanetaryMassKg,
    calculateDynamicWorldCurrentPlanetaryVolumeM3: getDynamicWorldCurrentPlanetaryVolumeM3,
    calculateDynamicWorldMassDeltaKg,
    calculateDynamicWorldCurrentSurfaceMassKg,
    calculateDynamicWorldSurfaceVolumeDeltaM3,
    calculateDynamicWorldCurrentSurfaceVolumeM3,
    calculateDynamicWorldInitialAtmosphericMassKg,
    calculateDynamicWorldInitialSurfaceMassKg,
    calculateDynamicWorldInitialSurfaceVolumeM3,
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
    resolveWorldBasePlanetaryMass,
    resolveWorldBasePlanetaryVolumeM3,
    resolveWorldBaseRadius,
    resolveWorldGeometricLand,
    syncDynamicWorldGeometry
  };
} catch (error) {
  // Module system not available in browser.
}
