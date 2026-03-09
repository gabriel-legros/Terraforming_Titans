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
  const candidates = [
    terraformingState?.initialLand,
    landResource?.initialValue
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return 0;
}

function getProjectManagerForLandReservation() {
  try {
    return projectManager;
  } catch (error) {
    return null;
  }
}

function getTerraformingForLandReservation() {
  try {
    return terraforming;
  } catch (error) {
    return null;
  }
}

function getPlanetCoreHeatFluxForLandReservation() {
  try {
    return Math.max(0, currentPlanetParameters?.celestialParameters?.coreHeatFlux || 0);
  } catch (error) {
    return 0;
  }
}

function getArtificialCrustCompletionFraction() {
  const artificialCrust = getProjectManagerForLandReservation()?.projects?.artificialCrust;
  if (!artificialCrust) {
    return 0;
  }
  if (artificialCrust.isCompleted) {
    return 1;
  }
  if (artificialCrust.getCompletionFraction) {
    return normalizeLandReservationShare(artificialCrust.getCompletionFraction());
  }
  return 0;
}

function getCoreFluxLandReservationShare(terraformingState = null) {
  const activeTerraforming = terraformingState || getTerraformingForLandReservation();
  const baseFlux = Math.max(
    0,
    activeTerraforming?.celestialParameters?.coreHeatFlux
      || getPlanetCoreHeatFluxForLandReservation()
      || 0
  );
  if (!(baseFlux > 0)) {
    return 0;
  }

  const currentFlux = Math.max(
    0,
    activeTerraforming?.getCoreHeatFlux
      ? activeTerraforming.getCoreHeatFlux()
      : (baseFlux * (1 - getArtificialCrustCompletionFraction()))
  );

  return normalizeLandReservationShare(currentFlux / baseFlux);
}

function getLandReservationSourceLabel(source) {
  if (source === 'hazardousBiomass') {
    return 'Hazardous Biomass';
  }
  if (source === 'pulsar') {
    return 'Pulsar';
  }
  if (source === 'coreHeatFlux') {
    return 'Lava';
  }
  return 'World Effects';
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

  getDominantSource(extraShares = null) {
    let dominantSource = '';
    let dominantShare = 0;
    const mergedShares = {
      ...this.shares,
      ...(extraShares || {})
    };
    const orderedSources = ['hazardousBiomass', 'pulsar', 'coreHeatFlux'];

    orderedSources.forEach((source) => {
      const share = normalizeLandReservationShare(mergedShares[source]);
      if (share > dominantShare) {
        dominantShare = share;
        dominantSource = source;
      }
    });

    if (!dominantSource) {
      Object.keys(mergedShares).forEach((source) => {
        const share = normalizeLandReservationShare(mergedShares[source]);
        if (share > dominantShare) {
          dominantShare = share;
          dominantSource = source;
        }
      });
    }

    return dominantSource;
  }

  getCombinedShare(extraShares = null) {
    let combined = 0;

    Object.keys(this.shares).forEach((key) => {
      combined = Math.max(combined, normalizeLandReservationShare(this.shares[key]));
    });

    Object.keys(extraShares || {}).forEach((key) => {
      combined = Math.max(combined, normalizeLandReservationShare(extraShares[key]));
    });

    return combined;
  }

  syncToLandResource(landResource, terraformingState, extraShares = null) {
    if (!landResource || !landResource.setReservedAmountForSource) {
      return 0;
    }

    const initialLand = resolveLandReservationInitialLand(terraformingState, landResource);
    const combinedShare = this.getCombinedShare(extraShares);
    const dominantSource = this.getDominantSource(extraShares);
    const reservedLand = initialLand > 0 ? initialLand * combinedShare : 0;

    landResource.setReservedAmountForSource('hazards', reservedLand);
    landResource.setReservedAmountForSource('hazardousBiomass', 0);
    landResource.worldEffectReservationSource = dominantSource;
    landResource.worldEffectReservationLabel = reservedLand > 0
      ? getLandReservationSourceLabel(dominantSource)
      : '';

    return reservedLand;
  }
}

try {
  window.normalizeLandReservationShare = normalizeLandReservationShare;
  window.resolveLandReservationInitialLand = resolveLandReservationInitialLand;
  window.getCoreFluxLandReservationShare = getCoreFluxLandReservationShare;
  window.getLandReservationSourceLabel = getLandReservationSourceLabel;
  window.LandReservationReconciler = LandReservationReconciler;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = {
    normalizeLandReservationShare,
    resolveLandReservationInitialLand,
    getCoreFluxLandReservationShare,
    getLandReservationSourceLabel,
    LandReservationReconciler
  };
} catch (error) {
  // Module system not available in browser
}
