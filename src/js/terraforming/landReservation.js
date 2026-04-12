const MOLTEN_WORLD_FULL_RESERVATION_TEMPERATURE_K = 1273.15;
const MOLTEN_WORLD_CLEAR_RESERVATION_TEMPERATURE_K = 973.15;
const LAND_RESERVATION_SOURCE_LABELS = {
  hazardousBiomass: 'Hazardous Biomass',
  pulsar: 'Pulsar',
  coreHeatFlux: 'Lava'
};
const LAND_RESERVATION_SOURCE_ORDER = ['hazardousBiomass', 'hazardousMachinery', 'pulsar', 'coreHeatFlux'];

function normalizeLandReservationShare(share) {
  if (!Number.isFinite(share) || share <= 0) {
    return 0;
  }
  if (share >= 1) {
    return 1;
  }
  return share;
}

function resolveLandReservationInitialLand(terraformingState, landResource) {
  if (currentPlanetParameters?.specialAttributes?.dynamicMass === true) {
    return resolveWorldGeometricLand(terraformingState, landResource, terraformingState?.celestialParameters);
  }
  return resolveWorldBaseLand(terraformingState, landResource);
}

function getCoreFluxLandReservationShare(terraformingState = terraforming) {
  const activeTerraforming = terraformingState;
  const baseFlux = Math.max(
    0,
    activeTerraforming?.celestialParameters?.coreHeatFlux || currentPlanetParameters?.celestialParameters?.coreHeatFlux || 0
  );
  if (!(baseFlux > 0)) {
    return 0;
  }

  const temperature = activeTerraforming?.temperature?.value;
  let temperatureShare = 1;
  if (Number.isFinite(temperature)) {
    if (temperature <= MOLTEN_WORLD_CLEAR_RESERVATION_TEMPERATURE_K) {
      temperatureShare = 0;
    } else if (temperature < MOLTEN_WORLD_FULL_RESERVATION_TEMPERATURE_K) {
      temperatureShare =
        (temperature - MOLTEN_WORLD_CLEAR_RESERVATION_TEMPERATURE_K)
        / (MOLTEN_WORLD_FULL_RESERVATION_TEMPERATURE_K - MOLTEN_WORLD_CLEAR_RESERVATION_TEMPERATURE_K);
    }
  }

  const artificialCrust = projectManager?.projects?.artificialCrust;
  const crustCompletion = artificialCrust?.isCompleted
    ? 1
    : normalizeLandReservationShare(artificialCrust?.getCompletionFraction?.() || 0);
  const currentFlux = Math.max(
    0,
    activeTerraforming?.getCoreHeatFlux ? activeTerraforming.getCoreHeatFlux() : baseFlux * (1 - crustCompletion)
  );

  return normalizeLandReservationShare(Math.min(currentFlux / baseFlux, temperatureShare));
}

function getLandReservationSourceLabel(source) {
  if (source === 'hazardousMachinery') {
    return t('resources.surface.hazardousMachinery.name', null, 'Hazardous Machinery');
  }
  return LAND_RESERVATION_SOURCE_LABELS[source] || 'World Effects';
}

class LandReservationReconciler {
  constructor() {
    this.shares = {};
  }

  setShare(source, share) {
    if (!source) {
      return 0;
    }

    const normalized = normalizeLandReservationShare(share);
    this.shares[source] = normalized;
    return normalized;
  }

  getCombinedShare(extraShares = null) {
    let combinedShare = 0;
    const mergedShares = { ...this.shares, ...(extraShares || {}) };

    Object.keys(mergedShares).forEach((source) => {
      combinedShare = Math.max(combinedShare, normalizeLandReservationShare(mergedShares[source]));
    });

    return combinedShare;
  }

  getDominantSource(extraShares = null) {
    let dominantSource = '';
    let dominantShare = 0;
    const mergedShares = { ...this.shares, ...(extraShares || {}) };

    LAND_RESERVATION_SOURCE_ORDER.forEach((source) => {
      const share = normalizeLandReservationShare(mergedShares[source]);
      if (share > dominantShare) {
        dominantShare = share;
        dominantSource = source;
      }
    });

    return dominantSource;
  }

  syncToLandResource(landResource, terraformingState, extraShares = null) {
    if (!landResource?.setReservedAmountForSource) {
      return 0;
    }

    const reservedLand = resolveLandReservationInitialLand(terraformingState, landResource) * this.getCombinedShare(extraShares);
    const dominantSource = this.getDominantSource(extraShares);

    landResource.setReservedAmountForSource('hazards', reservedLand);
    landResource.setReservedAmountForSource('hazardousBiomass', 0);
    landResource.setReservedAmountForSource('hazardousMachinery', 0);
    landResource.worldEffectReservationSource = dominantSource;
    landResource.worldEffectReservationLabel = reservedLand > 0 ? getLandReservationSourceLabel(dominantSource) : '';

    return reservedLand;
  }
}

try {
  module.exports = {
    normalizeLandReservationShare,
    resolveLandReservationInitialLand,
    getCoreFluxLandReservationShare,
    LandReservationReconciler
  };
} catch (error) {
  // Browser runtime has no CommonJS module.
}
