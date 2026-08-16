const WORLD_GEOMETRY_PARAMETERS = terraformingParameters.geometry;
const WORLD_GEOMETRY_G = terraformingParameters.physical.gravitationalConstant;
const LIQUID_HYDROGEN_COMPRESSION_PARAMETERS = WORLD_GEOMETRY_PARAMETERS.liquidHydrogenCompression;

const DYNAMIC_WORLD_SURFACE_DENSITIES = {
  ...WORLD_GEOMETRY_PARAMETERS.surfaceDensityKgM3,
  liquidHydrogen: LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.baseDensityKgM3
};

const DYNAMIC_WORLD_SURFACE_MASS_KEYS = [
  'liquidWater',
  'ice',
  'dryIce',
  'liquidCO2',
  'liquidHydrogen',
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
  'hazardousBiomass',
  'hazardousMachinery',
  'rocks',
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
  'calciteAerosol',
  'vanadiumAerosol'
];

function calculateSurfaceAreaHectaresFromRadius(radiusKm) {
  return radiusKm > 0 ? 4 * Math.PI * radiusKm * radiusKm * 100 : 0;
}

function calculateSurfaceAreaM2FromRadius(radiusKm) {
  const radiusM = radiusKm * 1000;
  return radiusKm > 0 ? 4 * Math.PI * radiusM * radiusM : 0;
}

function calculateCrossSectionAreaM2FromRadius(radiusKm) {
  const radiusM = radiusKm * 1000;
  return radiusKm > 0 ? Math.PI * radiusM * radiusM : 0;
}

function calculateSphereVolumeM3FromRadius(radiusKm) {
  const radiusM = radiusKm * 1000;
  return radiusKm > 0 ? (4 / 3) * Math.PI * Math.pow(radiusM, 3) : 0;
}

function calculateRadiusKmFromVolume(volumeM3) {
  return volumeM3 > 0 ? Math.cbrt((3 * volumeM3) / (4 * Math.PI)) / 1000 : 0;
}

function calculateGravityFromMassRadius(massKg, radiusKm) {
  if (!(radiusKm > 0)) {
    return 0;
  }
  if (!(massKg > 0)) {
    return WORLD_GEOMETRY_PARAMETERS.minimumGravityMS2;
  }
  const radiusM = radiusKm * 1000;
  return Math.max(
    WORLD_GEOMETRY_PARAMETERS.minimumGravityMS2,
    (WORLD_GEOMETRY_G * massKg) / (radiusM * radiusM)
  );
}

function calculateAverageDensityKgM3(massKg, volumeM3) {
  if (!(massKg > 0) || !(volumeM3 > 0)) {
    return WORLD_GEOMETRY_PARAMETERS.fallbackDensityKgM3;
  }
  return Math.max(WORLD_GEOMETRY_PARAMETERS.minimumDensityKgM3, massKg / volumeM3);
}

function getDynamicLiquidHydrogenDensity(amountTons) {
  const massKg = Math.max(0, amountTons || 0) * 1000;
  if (!(massKg > 0)) {
    return LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.baseDensityKgM3;
  }

  const startLog10MassKg = LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.startLog10MassKg;
  const compressionRange = Math.log10(LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.referenceMassKg) - startLog10MassKg;
  if (!(compressionRange > 0)) {
    return LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.maximumDensityKgM3;
  }

  const progress = Math.max(0, Math.min(
    1,
    (Math.log10(massKg) - startLog10MassKg) / compressionRange
  ));
  const densityRange = LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.maximumDensityKgM3
    - LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.baseDensityKgM3;
  return LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.baseDensityKgM3
    + densityRange * Math.pow(progress, LIQUID_HYDROGEN_COMPRESSION_PARAMETERS.exponent);
}

function getDynamicWorldSurfaceDensity(key, amountTons) {
  if (key === 'liquidHydrogen') {
    return getDynamicLiquidHydrogenDensity(amountTons);
  }
  return DYNAMIC_WORLD_SURFACE_DENSITIES[key] || WORLD_GEOMETRY_PARAMETERS.fallbackDensityKgM3;
}

function calculateResourceMassKg(resourceBucket, keys, valueField) {
  let totalKg = 0;
  for (let index = 0; index < keys.length; index += 1) {
    const amountTons = resourceBucket?.[keys[index]]?.[valueField];
    if (amountTons > 0) {
      totalKg += amountTons * 1000;
    }
  }
  return totalKg;
}

function calculateSurfaceVolumeM3(surfaceResources, valueField) {
  let totalVolumeM3 = 0;
  for (let index = 0; index < DYNAMIC_WORLD_SURFACE_MASS_KEYS.length; index += 1) {
    const key = DYNAMIC_WORLD_SURFACE_MASS_KEYS[index];
    const amountTons = surfaceResources?.[key]?.[valueField];
    if (amountTons > 0) {
      totalVolumeM3 += amountTons * 1000 / getDynamicWorldSurfaceDensity(key, amountTons);
    }
  }
  return totalVolumeM3;
}

function calculateDynamicWorldCurrentSurfaceMassKg(resourceSet) {
  return calculateResourceMassKg(resourceSet?.surface, DYNAMIC_WORLD_SURFACE_MASS_KEYS, 'value');
}

function calculateDynamicWorldInitialSurfaceMassKg(resourceSet) {
  return calculateResourceMassKg(resourceSet?.surface, DYNAMIC_WORLD_SURFACE_MASS_KEYS, 'initialValue');
}

function calculateDynamicWorldCurrentAtmosphericMassKg(resourceSet) {
  return calculateResourceMassKg(resourceSet?.atmospheric, DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS, 'value');
}

function calculateDynamicWorldInitialAtmosphericMassKg(resourceSet) {
  return calculateResourceMassKg(resourceSet?.atmospheric, DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS, 'initialValue');
}

function calculateDynamicWorldCurrentSurfaceVolumeM3(resourceSet) {
  return calculateSurfaceVolumeM3(resourceSet?.surface, 'value');
}

function calculateDynamicWorldInitialSurfaceVolumeM3(resourceSet) {
  return calculateSurfaceVolumeM3(resourceSet?.surface, 'initialValue');
}

function calculateDynamicWorldMassDeltaKg(resourceSet) {
  return calculateDynamicWorldCurrentSurfaceMassKg(resourceSet)
    - calculateDynamicWorldInitialSurfaceMassKg(resourceSet)
    + calculateDynamicWorldCurrentAtmosphericMassKg(resourceSet)
    - calculateDynamicWorldInitialAtmosphericMassKg(resourceSet);
}

function calculateDynamicWorldSurfaceVolumeDeltaM3(resourceSet) {
  return calculateDynamicWorldCurrentSurfaceVolumeM3(resourceSet)
    - calculateDynamicWorldInitialSurfaceVolumeM3(resourceSet);
}

function resolveWorldBaseLand(terraformingState, landResource) {
  const celestial = terraformingState?.celestialParameters;
  const land = landResource || terraformingState?.resources?.surface?.land;
  if (celestial?.baseLand > 0) {
    return celestial.baseLand;
  }
  if (land?.baseLand > 0) {
    return land.baseLand;
  }
  if (land?.initialValue > 0) {
    return land.initialValue;
  }
  if (land?.baseCap > 0) {
    return land.baseCap;
  }
  if (celestial?.surfaceArea > 0) {
    return celestial.surfaceArea / 10000;
  }
  return calculateSurfaceAreaHectaresFromRadius(celestial?.radius);
}

function resolveWorldGeometricLand(terraformingState, landResource) {
  const celestial = terraformingState?.celestialParameters;
  if (celestial?.surfaceArea > 0) {
    return celestial.surfaceArea / 10000;
  }
  return calculateSurfaceAreaHectaresFromRadius(celestial?.radius)
    || resolveWorldBaseLand(terraformingState, landResource);
}

function calculateWorldBaseGeometry(terraformingState) {
  const celestial = terraformingState.celestialParameters;
  const initialCelestial = terraformingState.initialCelestialParameters;
  const resources = terraformingState.resources;
  const baseRadius = celestial.baseRadius
    || initialCelestial.baseRadius
    || initialCelestial.radius
    || celestial.radius
    || 0;
  let baseMass = celestial.baseMass
    || initialCelestial.baseMass
    || initialCelestial.mass
    || celestial.mass
    || 0;

  if (!(baseMass > 0)) {
    const gravity = initialCelestial.gravity || celestial.gravity || 0;
    const radiusM = baseRadius * 1000;
    baseMass = gravity > 0 && radiusM > 0
      ? gravity * radiusM * radiusM / WORLD_GEOMETRY_G
      : 0;
  }

  const baseSurfaceMassKg = calculateDynamicWorldInitialSurfaceMassKg(resources);
  const baseAtmosphericMassKg = calculateDynamicWorldInitialAtmosphericMassKg(resources);
  const basePlanetaryMass = Number.isFinite(celestial.basePlanetaryMass)
    ? Math.max(0, celestial.basePlanetaryMass)
    : Math.max(0, baseMass - baseSurfaceMassKg - baseAtmosphericMassKg);
  const baseVolumeM3 = calculateSphereVolumeM3FromRadius(baseRadius);
  const basePlanetaryVolumeM3 = celestial.basePlanetaryVolumeM3 > 0
    ? celestial.basePlanetaryVolumeM3
    : Math.max(
      baseVolumeM3 * WORLD_GEOMETRY_PARAMETERS.minimumVolumeFraction,
      baseVolumeM3 - calculateDynamicWorldInitialSurfaceVolumeM3(resources)
    );

  return {
    baseLand: resolveWorldBaseLand(terraformingState, resources.surface?.land),
    baseRadius,
    baseMass,
    baseGravity: calculateGravityFromMassRadius(baseMass, baseRadius),
    basePlanetaryMass,
    basePlanetaryVolumeM3,
    baseSurfaceMassKg,
    baseAtmosphericMassKg
  };
}

function getDynamicWorldCurrentPlanetaryMassKg(terraformingState) {
  const celestial = terraformingState.celestialParameters;
  return Math.max(0, celestial.basePlanetaryMass + (celestial.dynamicDirectMassDeltaKg || 0));
}

function getDynamicWorldCurrentPlanetaryVolumeM3(terraformingState) {
  const celestial = terraformingState.celestialParameters;
  return Math.max(
    celestial.basePlanetaryVolumeM3 * WORLD_GEOMETRY_PARAMETERS.minimumVolumeFraction,
    celestial.basePlanetaryVolumeM3 + (celestial.dynamicDirectVolumeDeltaM3 || 0)
  );
}

function getDynamicWorldCurrentMassKg(terraformingState) {
  return getDynamicWorldCurrentPlanetaryMassKg(terraformingState)
    + calculateDynamicWorldCurrentSurfaceMassKg(terraformingState.resources)
    + calculateDynamicWorldCurrentAtmosphericMassKg(terraformingState.resources);
}

function getDynamicWorldCurrentVolumeM3(terraformingState) {
  return getDynamicWorldCurrentPlanetaryVolumeM3(terraformingState)
    + calculateDynamicWorldCurrentSurfaceVolumeM3(terraformingState.resources);
}

function getDynamicWorldPlanetaryMassAvailableTons(terraformingState) {
  return getDynamicWorldCurrentPlanetaryMassKg(terraformingState) / 1000;
}

function setDynamicWorldDirectLedger(terraformingState, massDeltaKg, volumeDeltaM3) {
  terraformingState.celestialParameters.dynamicDirectMassDeltaKg = massDeltaKg;
  terraformingState.celestialParameters.dynamicDirectVolumeDeltaM3 = volumeDeltaM3;
}

function addDynamicWorldPlanetaryMaterial(terraformingState, materialKey, amountTons) {
  if (!terraformingState || amountTons <= 0) {
    return 0;
  }

  const celestial = terraformingState.celestialParameters;
  const density = WORLD_GEOMETRY_PARAMETERS.planetaryImportDensityKgM3[materialKey]
    || WORLD_GEOMETRY_PARAMETERS.fallbackDensityKgM3;
  const addedKg = amountTons * 1000;
  recordStellarEvolutionResourceImport(terraformingState, 'material', materialKey, amountTons);
  setDynamicWorldDirectLedger(
    terraformingState,
    (celestial.dynamicDirectMassDeltaKg || 0) + addedKg,
    (celestial.dynamicDirectVolumeDeltaM3 || 0) + addedKg / density
  );
  return amountTons;
}

function disposeDynamicWorldPlanetaryMass(terraformingState, amountTons) {
  if (!terraformingState || amountTons <= 0) {
    return 0;
  }

  const celestial = terraformingState.celestialParameters;
  const currentMassKg = getDynamicWorldCurrentPlanetaryMassKg(terraformingState);
  if (currentMassKg <= 0) {
    return 0;
  }

  const removableKg = Math.min(amountTons * 1000, currentMassKg);
  const currentVolumeM3 = getDynamicWorldCurrentPlanetaryVolumeM3(terraformingState);
  const removedVolumeM3 = removableKg / calculateAverageDensityKgM3(currentMassKg, currentVolumeM3);
  recordStellarEvolutionBulkDisposal(terraformingState, removableKg / 1000);
  setDynamicWorldDirectLedger(
    terraformingState,
    (celestial.dynamicDirectMassDeltaKg || 0) - removableKg,
    (celestial.dynamicDirectVolumeDeltaM3 || 0) - removedVolumeM3
  );
  return removableKg / 1000;
}

function hasDynamicMassEnabled(terraformingState, planetParameters) {
  return planetParameters?.specialAttributes?.dynamicMass === true;
}

function updateCelestialAreaFields(celestial) {
  const layeredSurfaceAreaM2 = celestial.baseLand * 10000;
  celestial.surfaceArea = celestial.layeredSurfaceArea === true && layeredSurfaceAreaM2 > 0
    ? layeredSurfaceAreaM2
    : calculateSurfaceAreaM2FromRadius(celestial.radius);
  celestial.crossSectionArea = calculateCrossSectionAreaM2FromRadius(celestial.radius);
}

function syncDynamicWorldGeometry(terraformingState, planetParameters) {
  if (!terraformingState?.celestialParameters) {
    return null;
  }

  const celestial = terraformingState.celestialParameters;
  Object.assign(celestial, calculateWorldBaseGeometry(terraformingState));
  if (terraformingState.resources.surface?.land) {
    terraformingState.resources.surface.land.baseLand = celestial.baseLand;
  }

  if (hasDynamicMassEnabled(terraformingState, planetParameters)) {
    celestial.dynamicDirectMassDeltaKg ||= 0;
    celestial.dynamicDirectVolumeDeltaM3 ||= 0;

    const currentPlanetaryMassKg = getDynamicWorldCurrentPlanetaryMassKg(terraformingState);
    const currentSurfaceMassKg = calculateDynamicWorldCurrentSurfaceMassKg(terraformingState.resources);
    const currentAtmosphericMassKg = calculateDynamicWorldCurrentAtmosphericMassKg(terraformingState.resources);
    const currentPlanetaryVolumeM3 = getDynamicWorldCurrentPlanetaryVolumeM3(terraformingState);
    const currentSurfaceVolumeM3 = calculateDynamicWorldCurrentSurfaceVolumeM3(terraformingState.resources);
    const currentMassKg = currentPlanetaryMassKg + currentSurfaceMassKg + currentAtmosphericMassKg;
    const currentVolumeM3 = currentPlanetaryVolumeM3 + currentSurfaceVolumeM3;

    Object.assign(celestial, {
      mass: currentMassKg,
      radius: calculateRadiusKmFromVolume(currentVolumeM3),
      dynamicMassDeltaKg: currentMassKg - celestial.baseMass,
      dynamicSurfaceVolumeDeltaM3: currentVolumeM3 - calculateSphereVolumeM3FromRadius(celestial.baseRadius),
      currentPlanetaryMassKg,
      currentSurfaceMassKg,
      currentAtmosphericMassKg,
      currentPlanetaryVolumeM3,
      currentSurfaceVolumeM3
    });
    celestial.gravity = calculateGravityFromMassRadius(celestial.mass, celestial.radius);
  }

  updateCelestialAreaFields(celestial);
  return celestial;
}

try {
  module.exports = {
    calculateCrossSectionAreaM2FromRadius,
    calculateAverageDensityKgM3,
    getDynamicLiquidHydrogenDensity,
    getDynamicWorldSurfaceDensity,
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
    resolveWorldBaseLand,
    resolveWorldGeometricLand,
    syncDynamicWorldGeometry
  };
} catch (error) {
  // Module system not available in browser.
}
