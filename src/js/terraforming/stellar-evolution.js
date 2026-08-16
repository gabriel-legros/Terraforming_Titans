const STELLAR_EVOLUTION_PARAMETERS = terraformingParameters.geometry.stellarEvolution;
const STELLAR_EVOLUTION_STEFAN_BOLTZMANN = terraformingParameters.physical.stefanBoltzmannConstant;
const STELLAR_EVOLUTION_SOLAR_LUMINOSITY_W = terraformingParameters.physical.solarLuminosityW;

function isStellarEvolutionEligible(planetParameters = currentPlanetParameters) {
  return planetParameters.specialAttributes.dynamicMass === true
    && planetParameters.specialAttributes.stellarEvolutionDisabled !== true;
}

function isStellarEvolutionStarOrLater(state) {
  return state.eligible === true
    && state.stage !== 'planetary'
    && state.stage !== 'brownDwarf';
}

function getStellarEvolutionState(
  terraformingState = terraforming,
  planetParameters = currentPlanetParameters
) {
  const eligible = isStellarEvolutionEligible(planetParameters);
  const massKg = eligible
    ? getDynamicWorldCurrentMassKg(terraformingState)
    : terraformingState.celestialParameters.mass;
  const massJupiter = massKg / STELLAR_EVOLUTION_PARAMETERS.jupiterMassKg;
  const brownDwarfThreshold = STELLAR_EVOLUTION_PARAMETERS.brownDwarfThresholdJupiter;
  const fusionThreshold = STELLAR_EVOLUTION_PARAMETERS.fusionThresholdJupiter;
  let stage = 'planetary';
  let progress = Math.max(0, Math.min(1, massJupiter / brownDwarfThreshold));
  let nextThresholdJupiter = brownDwarfThreshold;
  let absorptionProgress = 0;
  let effectiveTemperatureK = 0;
  let fusionFluxWm2 = 0;

  if (eligible && massJupiter >= brownDwarfThreshold) {
    stage = 'brownDwarf';
    progress = Math.max(0, Math.min(
      1,
      (massJupiter - brownDwarfThreshold) / (fusionThreshold - brownDwarfThreshold)
    ));
    nextThresholdJupiter = fusionThreshold;
    absorptionProgress = progress * progress * (3 - 2 * progress);
    fusionFluxWm2 = STELLAR_EVOLUTION_STEFAN_BOLTZMANN
      * Math.pow(STELLAR_EVOLUTION_PARAMETERS.fusionThresholdTemperatureK, 4)
      * absorptionProgress;
    effectiveTemperatureK = fusionFluxWm2 > 0
      ? Math.pow(fusionFluxWm2 / STELLAR_EVOLUTION_STEFAN_BOLTZMANN, 0.25)
      : 0;
  }

  if (eligible && massJupiter >= fusionThreshold) {
    stage = 'star';
    progress = 1;
    nextThresholdJupiter = null;
    absorptionProgress = 1;
    const massSolar = massKg / STELLAR_EVOLUTION_PARAMETERS.solarMassKg;
    const temperatureExponent = massSolar
      <= STELLAR_EVOLUTION_PARAMETERS.stellarTemperatureExponentBoundarySolar
      ? STELLAR_EVOLUTION_PARAMETERS.lowMassStellarTemperatureExponent
      : STELLAR_EVOLUTION_PARAMETERS.highMassStellarTemperatureExponent;
    effectiveTemperatureK = STELLAR_EVOLUTION_PARAMETERS.solarEffectiveTemperatureK
      * Math.pow(massSolar, temperatureExponent);
    const massDerivedFusionFluxWm2 = STELLAR_EVOLUTION_STEFAN_BOLTZMANN
      * Math.pow(effectiveTemperatureK, 4);
    fusionFluxWm2 = Math.max(
      massDerivedFusionFluxWm2,
      Math.max(0, terraformingState.celestialParameters.stellarRemnantCoreHeatFluxWm2 || 0)
    );
    effectiveTemperatureK = Math.pow(
      fusionFluxWm2 / STELLAR_EVOLUTION_STEFAN_BOLTZMANN,
      0.25
    );
  }

  const celestial = terraformingState.celestialParameters;
  const surfaceArea = celestial.surfaceArea || calculateSurfaceAreaM2FromRadius(celestial.radius);
  const luminositySolar = fusionFluxWm2 * surfaceArea / STELLAR_EVOLUTION_SOLAR_LUMINOSITY_W;
  const atmosphericMassKg = calculateDynamicWorldCurrentAtmosphericMassKg(terraformingState.resources);
  const photospherePressurePa = surfaceArea > 0
    ? atmosphericMassKg * celestial.gravity / surfaceArea
    : 0;
  const opacityTemperatureK = Math.max(
    STELLAR_EVOLUTION_PARAMETERS.photosphereMinimumOpacityTemperatureK,
    effectiveTemperatureK
  );
  const photosphereOpacityM2Kg = STELLAR_EVOLUTION_PARAMETERS.photosphereReferenceOpacityM2Kg
    * Math.pow(
      opacityTemperatureK / STELLAR_EVOLUTION_PARAMETERS.photosphereReferenceTemperatureK,
      STELLAR_EVOLUTION_PARAMETERS.photosphereOpacityTemperatureExponent
    );
  const pressureRange = STELLAR_EVOLUTION_PARAMETERS.photospherePressureRangePa;
  const targetPhotospherePressurePa = Math.max(
    pressureRange.minimum,
    Math.min(
      pressureRange.maximum,
      STELLAR_EVOLUTION_PARAMETERS.photosphereOpticalDepth
        * celestial.gravity / photosphereOpacityM2Kg
    )
  );
  const targetPhotosphereMassKg = celestial.gravity > 0
    ? targetPhotospherePressurePa * surfaceArea / celestial.gravity
    : 0;

  return {
    eligible,
    stage,
    massKg,
    massJupiter,
    progress,
    nextThresholdJupiter,
    absorptionProgress,
    effectiveTemperatureK,
    surfaceTemperatureK: effectiveTemperatureK,
    fusionFluxWm2,
    luminositySolar,
    radiusKm: celestial.radius,
    meanDensityKgM3: celestial.meanDensityKgM3,
    photospherePressurePa,
    targetPhotospherePressurePa,
    photosphereOpacityM2Kg,
    targetPhotosphereMassKg
  };
}

function sumElementalComposition(composition) {
  let total = 0;
  for (const element in composition) {
    total += composition[element];
  }
  return total;
}

function addElementalMaterial(composition, fractions, massKg) {
  const materialFractions = fractions || { other: 1 };
  for (const element in materialFractions) {
    composition[element] = (composition[element] || 0) + massKg * materialFractions[element];
  }
}

function addElementalDelta(composition, delta) {
  for (const element in delta) {
    composition[element] = Math.max(0, (composition[element] || 0) + delta[element]);
  }
}

function scaleElementalComposition(composition, targetMassKg) {
  const currentMassKg = sumElementalComposition(composition);
  if (!(currentMassKg > 0)) {
    for (const element in STELLAR_EVOLUTION_PARAMETERS.bulkEarthElementFractions) {
      composition[element] = targetMassKg
        * STELLAR_EVOLUTION_PARAMETERS.bulkEarthElementFractions[element];
    }
    return composition;
  }
  const scale = targetMassKg / currentMassKg;
  for (const element in composition) {
    composition[element] *= scale;
  }
  return composition;
}

function ensurePlanetaryElementalComposition(terraformingState) {
  const celestial = terraformingState.celestialParameters;
  const planetaryMassKg = getDynamicWorldCurrentPlanetaryMassKg(terraformingState);
  if (!celestial.planetaryElementalCompositionKg) {
    celestial.planetaryElementalCompositionKg = {};
    const basePlanetaryMassKg = celestial.basePlanetaryMass;
    scaleElementalComposition(
      celestial.planetaryElementalCompositionKg,
      Math.min(basePlanetaryMassKg, planetaryMassKg)
    );
    if (planetaryMassKg > basePlanetaryMassKg) {
      celestial.planetaryElementalCompositionKg.other =
        (celestial.planetaryElementalCompositionKg.other || 0)
        + planetaryMassKg - basePlanetaryMassKg;
    }
    return celestial.planetaryElementalCompositionKg;
  }

  const composition = celestial.planetaryElementalCompositionKg;
  const recordedMassKg = sumElementalComposition(composition);
  const differenceKg = planetaryMassKg - recordedMassKg;
  if (Math.abs(differenceKg) > Math.max(1, planetaryMassKg * 1e-12)) {
    if (differenceKg > 0) {
      composition.other = (composition.other || 0) + differenceKg;
    } else {
      scaleElementalComposition(composition, planetaryMassKg);
    }
  }
  return composition;
}

function ensureStellarElementalComposition(terraformingState) {
  const celestial = terraformingState.celestialParameters;
  const stellarMassKg = getDynamicWorldCurrentStellarMassKg(terraformingState);
  if (!celestial.stellarElementalCompositionKg) {
    celestial.stellarElementalCompositionKg = {};
    if (stellarMassKg > 0) {
      celestial.stellarElementalCompositionKg.other = stellarMassKg;
    }
    return celestial.stellarElementalCompositionKg;
  }

  const composition = celestial.stellarElementalCompositionKg;
  const recordedMassKg = sumElementalComposition(composition);
  const differenceKg = stellarMassKg - recordedMassKg;
  if (Math.abs(differenceKg) > Math.max(1, stellarMassKg * 1e-12)) {
    if (differenceKg > 0) {
      composition.other = (composition.other || 0) + differenceKg;
    } else {
      scaleElementalComposition(composition, stellarMassKg);
    }
  }
  return composition;
}

function getResourceElementFractions(category, resourceKey) {
  return STELLAR_EVOLUTION_PARAMETERS.resourceElementFractions[category][resourceKey]
    || { other: 1 };
}

function calculateResourceElementalCompositionKg(resourceSet) {
  const composition = {};
  for (const resourceKey of DYNAMIC_WORLD_SURFACE_MASS_KEYS) {
    addElementalMaterial(
      composition,
      getResourceElementFractions('surface', resourceKey),
      resourceSet.surface[resourceKey].value * 1000
    );
  }
  for (const resourceKey of DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS) {
    addElementalMaterial(
      composition,
      getResourceElementFractions('atmospheric', resourceKey),
      resourceSet.atmospheric[resourceKey].value * 1000
    );
  }
  return composition;
}

function getWorldElementalCompositionKg(terraformingState) {
  const composition = { ...ensurePlanetaryElementalComposition(terraformingState) };
  addElementalDelta(composition, ensureStellarElementalComposition(terraformingState));
  addElementalDelta(
    composition,
    calculateResourceElementalCompositionKg(terraformingState.resources)
  );
  return composition;
}

function captureStellarEnvelopeBaseline(terraformingState) {
  const celestial = terraformingState.celestialParameters;
  if (celestial.stellarEnvelopeBaselineTons) {
    return celestial.stellarEnvelopeBaselineTons;
  }
  const baseline = { surface: {}, atmospheric: {} };
  for (const resourceKey of DYNAMIC_WORLD_SURFACE_MASS_KEYS) {
    baseline.surface[resourceKey] = terraformingState.resources.surface[resourceKey].value;
  }
  for (const resourceKey of DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS) {
    baseline.atmospheric[resourceKey] = terraformingState.resources.atmospheric[resourceKey].value;
  }
  celestial.stellarEnvelopeBaselineTons = baseline;
  return baseline;
}

function syncStellarEvolutionState(
  terraformingState = terraforming,
  planetParameters = currentPlanetParameters
) {
  const state = getStellarEvolutionState(terraformingState, planetParameters);
  if (!state.eligible) {
    return state;
  }
  const celestial = terraformingState.celestialParameters;
  const previousFusionFluxWm2 = Math.max(0, celestial.stellarFusionFluxWm2 || 0);
  const previousState = {
    eligible: true,
    stage: celestial.stellarEvolutionStage || 'planetary'
  };
  if (
    isStellarEvolutionStarOrLater(previousState)
    && !isStellarEvolutionStarOrLater(state)
  ) {
    celestial.stellarRemnantCoreHeatFluxWm2 = previousFusionFluxWm2;
  }
  ensurePlanetaryElementalComposition(terraformingState);
  ensureStellarElementalComposition(terraformingState);
  if (state.stage !== 'planetary') {
    captureStellarEnvelopeBaseline(terraformingState);
  } else if (!(getDynamicWorldCurrentStellarMassKg(terraformingState) > 0)) {
    delete celestial.stellarEnvelopeBaselineTons;
  }
  Object.assign(celestial, {
    stellarEvolutionStage: state.stage,
    stellarEvolutionProgress: state.progress,
    stellarEffectiveTemperatureK: state.effectiveTemperatureK,
    stellarFusionFluxWm2: state.fusionFluxWm2,
    stellarLuminositySolar: state.luminositySolar,
    stellarPhotospherePressurePa: state.photospherePressurePa
  });
  return state;
}

function allocatePhotosphereElements(worldComposition, targetMassKg) {
  const allocations = {};
  const candidates = [];
  for (const element in STELLAR_EVOLUTION_PARAMETERS.photosphereElements) {
    const config = STELLAR_EVOLUTION_PARAMETERS.photosphereElements[element];
    const availableKg = Math.max(0, worldComposition[element] || 0);
    if (availableKg > 0) {
      candidates.push({
        element,
        resource: config.resource,
        retention: config.retention,
        availableKg
      });
    }
  }

  candidates.sort((left, right) => right.retention - left.retention);
  let remainingKg = Math.min(
    targetMassKg,
    candidates.reduce((total, candidate) => total + candidate.availableKg, 0)
  );
  for (const candidate of candidates) {
    const allocatedKg = Math.min(candidate.availableKg, remainingKg);
    allocations[candidate.resource] = allocatedKg;
    remainingKg -= allocatedKg;
    if (!(remainingKg > 0)) {
      break;
    }
  }
  return allocations;
}

function snapshotStellarEnvelopeTons(terraformingState) {
  const snapshot = { surface: {}, atmospheric: {} };
  for (const resourceKey of DYNAMIC_WORLD_SURFACE_MASS_KEYS) {
    snapshot.surface[resourceKey] = terraformingState.resources.surface[resourceKey].value;
  }
  for (const resourceKey of DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS) {
    snapshot.atmospheric[resourceKey] = terraformingState.resources.atmospheric[resourceKey].value;
  }
  return snapshot;
}

function applyStellarSurfaceCaps(terraformingState, baseline, absorptionProgress) {
  const zonalResources = {};
  for (const config of terraformingState.zonalSurfaceResourceConfigs) {
    zonalResources[config.name] = true;
  }
  for (const resourceKey of DYNAMIC_WORLD_SURFACE_MASS_KEYS) {
    const resource = terraformingState.resources.surface[resourceKey];
    const targetTons = baseline.surface[resourceKey] * (1 - absorptionProgress);
    const removalTons = Math.max(0, resource.value - targetTons);
    if (!(removalTons > 0)) {
      continue;
    }
    if (zonalResources[resourceKey]) {
      terraformingState.distributeSurfaceChangesToZones({ [resourceKey]: -removalTons });
    } else {
      resource.value -= removalTons;
    }
  }
  terraformingState.synchronizeGlobalResources();
}

function applyStellarAtmosphereTargets(
  terraformingState,
  baseline,
  photosphereElementsKg,
  absorptionProgress
) {
  for (const resourceKey of DYNAMIC_WORLD_ATMOSPHERIC_MASS_KEYS) {
    const resource = terraformingState.resources.atmospheric[resourceKey];
    const photosphereTons = (photosphereElementsKg[resourceKey] || 0) / 1000;
    const photosphereFloorTons = photosphereTons * absorptionProgress;
    const transitionCapTons = baseline.atmospheric[resourceKey]
      * (1 - absorptionProgress) + photosphereFloorTons;
    resource.value = Math.min(
      transitionCapTons,
      Math.max(resource.value, photosphereFloorTons)
    );
  }
}

function enforceStellarEnvelopeElementLimits(terraformingState, worldComposition) {
  const envelopeComposition = calculateResourceElementalCompositionKg(terraformingState.resources);
  for (const element in STELLAR_EVOLUTION_PARAMETERS.photosphereElements) {
    const excessKg = Math.max(
      0,
      (envelopeComposition[element] || 0) - (worldComposition[element] || 0)
    );
    if (!(excessKg > 0)) {
      continue;
    }
    const resourceKey = STELLAR_EVOLUTION_PARAMETERS.photosphereElements[element].resource;
    const atmosphericResource = terraformingState.resources.atmospheric[resourceKey];
    atmosphericResource.value = Math.max(0, atmosphericResource.value - excessKg / 1000);
  }
}

function transferElementalMass(source, target, transferMassKg) {
  const sourceMassKg = sumElementalComposition(source);
  if (!(transferMassKg > 0) || !(sourceMassKg > 0)) {
    return 0;
  }
  const fraction = Math.min(1, transferMassKg / sourceMassKg);
  let transferredKg = 0;
  for (const element in source) {
    const amountKg = source[element] * fraction;
    source[element] -= amountKg;
    target[element] = (target[element] || 0) + amountKg;
    transferredKg += amountKg;
  }
  return transferredKg;
}

function removeEnvelopeElementsFromBodies(planetaryComposition, stellarComposition, transferredElementsKg) {
  let removedPlanetaryKg = 0;
  let removedStellarKg = 0;
  for (const element in transferredElementsKg) {
    let requiredKg = Math.max(0, -transferredElementsKg[element]);
    const stellarAmountKg = Math.min(stellarComposition[element] || 0, requiredKg);
    if (stellarAmountKg > 0) {
      stellarComposition[element] -= stellarAmountKg;
      removedStellarKg += stellarAmountKg;
      requiredKg -= stellarAmountKg;
    }
    const planetaryAmountKg = Math.min(planetaryComposition[element] || 0, requiredKg);
    if (planetaryAmountKg > 0) {
      planetaryComposition[element] -= planetaryAmountKg;
      removedPlanetaryKg += planetaryAmountKg;
    }
  }
  return { removedPlanetaryKg, removedStellarKg };
}

function transferReservoirVolume(sourceMassKg, sourceVolumeM3, transferMassKg) {
  return sourceMassKg > 0
    ? sourceVolumeM3 * Math.min(1, transferMassKg / sourceMassKg)
    : 0;
}

function accumulateStellarAbsorptionChanges(
  accumulator,
  before,
  after,
  planetaryMassChangeKg,
  stellarMassChangeKg
) {
  if (!accumulator) {
    return;
  }
  for (const category of ['surface', 'atmospheric']) {
    for (const resourceKey in before[category]) {
      const changeTons = after[category][resourceKey] - before[category][resourceKey];
      if (changeTons !== 0) {
        accumulator[category][resourceKey] =
          (accumulator[category][resourceKey] || 0) + changeTons;
      }
    }
  }
  const planetaryMassChangeTons = planetaryMassChangeKg / 1000;
  const stellarMassChangeTons = stellarMassChangeKg / 1000;
  accumulator.totalTons += Math.abs(stellarMassChangeTons);
  accumulator.planetaryMassTons += planetaryMassChangeTons;
  accumulator.stellarMassTons += stellarMassChangeTons;
}

function applyStellarEvolutionAbsorption(
  terraformingState = terraforming,
  planetParameters = currentPlanetParameters,
  accumulator = null
) {
  const state = syncStellarEvolutionState(terraformingState, planetParameters);
  if (!state.eligible) {
    return {
      state,
      transferredMassKg: 0,
      transferredVolumeM3: 0,
      photosphereMassKg: 0,
      photospherePressurePa: state.photospherePressurePa,
      transferredElementsKg: {}
    };
  }

  const celestial = terraformingState.celestialParameters;
  const before = snapshotStellarEnvelopeTons(terraformingState);
  const beforePlanetaryMassKg = getDynamicWorldCurrentPlanetaryMassKg(terraformingState);
  const beforeStellarMassKg = getDynamicWorldCurrentStellarMassKg(terraformingState);
  const planetaryComposition = ensurePlanetaryElementalComposition(terraformingState);
  const stellarComposition = ensureStellarElementalComposition(terraformingState);
  let planetaryMassKg = beforePlanetaryMassKg;
  let stellarMassKg = beforeStellarMassKg;
  let planetaryVolumeM3 = getDynamicWorldCurrentPlanetaryVolumeM3(terraformingState);
  let stellarVolumeM3 = getDynamicWorldCurrentStellarMaterialVolumeM3(terraformingState);

  if (state.massJupiter < STELLAR_EVOLUTION_PARAMETERS.brownDwarfThresholdJupiter) {
    const transferredVolumeM3 = stellarVolumeM3;
    if (stellarMassKg > 0) {
      transferElementalMass(stellarComposition, planetaryComposition, stellarMassKg);
      planetaryMassKg += stellarMassKg;
      planetaryVolumeM3 += stellarVolumeM3;
      stellarMassKg = 0;
      stellarVolumeM3 = 0;
    }
    celestial.dynamicDirectMassDeltaKg = planetaryMassKg - celestial.basePlanetaryMass;
    celestial.dynamicDirectVolumeDeltaM3 = planetaryVolumeM3 - celestial.basePlanetaryVolumeM3;
    celestial.stellarMassKg = 0;
    celestial.stellarMaterialVolumeM3 = 0;
    delete celestial.stellarEnvelopeBaselineTons;
    syncDynamicWorldGeometry(terraformingState, planetParameters);
    ensurePlanetaryElementalComposition(terraformingState);
    ensureStellarElementalComposition(terraformingState);
    const finalState = syncStellarEvolutionState(terraformingState, planetParameters);
    accumulateStellarAbsorptionChanges(
      accumulator,
      before,
      before,
      planetaryMassKg - beforePlanetaryMassKg,
      -beforeStellarMassKg
    );
    return {
      state: finalState,
      transferredMassKg: beforeStellarMassKg,
      transferredVolumeM3,
      photosphereMassKg: calculateDynamicWorldCurrentAtmosphericMassKg(terraformingState.resources),
      photospherePressurePa: finalState.photospherePressurePa,
      transferredElementsKg: {}
    };
  }

  const baseline = captureStellarEnvelopeBaseline(terraformingState);
  const beforeElementsKg = calculateResourceElementalCompositionKg(terraformingState.resources);
  const worldComposition = getWorldElementalCompositionKg(terraformingState);
  const beforeSurfaceVolumeM3 = calculateDynamicWorldCurrentSurfaceVolumeM3(terraformingState.resources);
  const beforeEnvelopeMassKg = calculateDynamicWorldCurrentSurfaceMassKg(terraformingState.resources)
    + calculateDynamicWorldCurrentAtmosphericMassKg(terraformingState.resources);
  const photosphereElementsKg = allocatePhotosphereElements(
    worldComposition,
    state.targetPhotosphereMassKg
  );

  applyStellarSurfaceCaps(terraformingState, baseline, state.absorptionProgress);
  applyStellarAtmosphereTargets(
    terraformingState,
    baseline,
    photosphereElementsKg,
    state.absorptionProgress
  );
  terraformingState.synchronizeGlobalResources();
  enforceStellarEnvelopeElementLimits(terraformingState, worldComposition);

  const after = snapshotStellarEnvelopeTons(terraformingState);
  const afterElementsKg = calculateResourceElementalCompositionKg(terraformingState.resources);
  const afterSurfaceVolumeM3 = calculateDynamicWorldCurrentSurfaceVolumeM3(terraformingState.resources);
  const afterEnvelopeMassKg = calculateDynamicWorldCurrentSurfaceMassKg(terraformingState.resources)
    + calculateDynamicWorldCurrentAtmosphericMassKg(terraformingState.resources);
  const transferredMassKg = beforeEnvelopeMassKg - afterEnvelopeMassKg;
  const transferredVolumeM3 = beforeSurfaceVolumeM3 - afterSurfaceVolumeM3;
  const transferredElementsKg = {};
  const elements = new Set([...Object.keys(beforeElementsKg), ...Object.keys(afterElementsKg)]);
  for (const element of elements) {
    transferredElementsKg[element] = (beforeElementsKg[element] || 0)
      - (afterElementsKg[element] || 0);
  }

  const absorbedElementsKg = {};
  let absorbedMassKg = 0;
  for (const element in transferredElementsKg) {
    const absorbedElementKg = Math.max(0, transferredElementsKg[element]);
    if (absorbedElementKg > 0) {
      absorbedElementsKg[element] = absorbedElementKg;
      absorbedMassKg += absorbedElementKg;
    }
  }
  addElementalDelta(stellarComposition, absorbedElementsKg);
  stellarMassKg += absorbedMassKg;
  stellarVolumeM3 += transferredVolumeM3;

  const removed = removeEnvelopeElementsFromBodies(
    planetaryComposition,
    stellarComposition,
    transferredElementsKg
  );
  if (removed.removedStellarKg > 0 || removed.removedPlanetaryKg > 0) {
    const stellarOutgassingVolumeM3 = transferReservoirVolume(
      stellarMassKg,
      stellarVolumeM3,
      removed.removedStellarKg
    );
    const planetaryOutgassingVolumeM3 = transferReservoirVolume(
      planetaryMassKg,
      planetaryVolumeM3,
      removed.removedPlanetaryKg
    );
    stellarMassKg -= removed.removedStellarKg;
    stellarVolumeM3 -= stellarOutgassingVolumeM3;
    planetaryMassKg -= removed.removedPlanetaryKg;
    planetaryVolumeM3 -= planetaryOutgassingVolumeM3;
  }

  const bodyMassKg = planetaryMassKg + stellarMassKg;
  const targetStellarMassKg = Math.min(
    bodyMassKg,
    state.massKg * state.absorptionProgress
  );
  if (stellarMassKg < targetStellarMassKg) {
    const massToStellarKg = Math.min(targetStellarMassKg - stellarMassKg, planetaryMassKg);
    const volumeToStellarM3 = transferReservoirVolume(
      planetaryMassKg,
      planetaryVolumeM3,
      massToStellarKg
    );
    transferElementalMass(planetaryComposition, stellarComposition, massToStellarKg);
    planetaryMassKg -= massToStellarKg;
    planetaryVolumeM3 -= volumeToStellarM3;
    stellarMassKg += massToStellarKg;
    stellarVolumeM3 += volumeToStellarM3;
  } else if (stellarMassKg > targetStellarMassKg) {
    const massToPlanetaryKg = stellarMassKg - targetStellarMassKg;
    const volumeToPlanetaryM3 = transferReservoirVolume(
      stellarMassKg,
      stellarVolumeM3,
      massToPlanetaryKg
    );
    transferElementalMass(stellarComposition, planetaryComposition, massToPlanetaryKg);
    stellarMassKg -= massToPlanetaryKg;
    stellarVolumeM3 -= volumeToPlanetaryM3;
    planetaryMassKg += massToPlanetaryKg;
    planetaryVolumeM3 += volumeToPlanetaryM3;
  }

  celestial.dynamicDirectMassDeltaKg = planetaryMassKg - celestial.basePlanetaryMass;
  celestial.dynamicDirectVolumeDeltaM3 = planetaryVolumeM3 - celestial.basePlanetaryVolumeM3;
  celestial.stellarMassKg = stellarMassKg;
  celestial.stellarMaterialVolumeM3 = stellarVolumeM3;
  syncDynamicWorldGeometry(terraformingState, planetParameters);
  ensurePlanetaryElementalComposition(terraformingState);
  ensureStellarElementalComposition(terraformingState);
  const finalState = syncStellarEvolutionState(terraformingState, planetParameters);
  accumulateStellarAbsorptionChanges(
    accumulator,
    before,
    after,
    planetaryMassKg - beforePlanetaryMassKg,
    stellarMassKg - beforeStellarMassKg
  );

  return {
    state: finalState,
    transferredMassKg,
    transferredVolumeM3,
    photosphereMassKg: calculateDynamicWorldCurrentAtmosphericMassKg(terraformingState.resources),
    photospherePressurePa: finalState.photospherePressurePa,
    transferredElementsKg
  };
}

function recordStellarEvolutionResourceImport(terraformingState, category, resourceKey, amountTons) {
  const composition = ensurePlanetaryElementalComposition(terraformingState);
  addElementalMaterial(
    composition,
    getResourceElementFractions(category, resourceKey),
    amountTons * 1000
  );
  return composition;
}

function recordStellarEvolutionBulkDisposal(terraformingState, amountTons) {
  const composition = ensurePlanetaryElementalComposition(terraformingState);
  const currentMassKg = sumElementalComposition(composition);
  const remainingMassKg = Math.max(0, currentMassKg - amountTons * 1000);
  scaleElementalComposition(composition, remainingMassKg);
  return currentMassKg - remainingMassKg;
}

function recordStellarEvolutionStellarDisposal(terraformingState, amountTons) {
  const composition = ensureStellarElementalComposition(terraformingState);
  const currentMassKg = sumElementalComposition(composition);
  const remainingMassKg = Math.max(0, currentMassKg - amountTons * 1000);
  scaleElementalComposition(composition, remainingMassKg);
  return currentMassKg - remainingMassKg;
}

function getStellarEvolutionComposition(terraformingState = terraforming) {
  return getWorldElementalCompositionKg(terraformingState);
}
