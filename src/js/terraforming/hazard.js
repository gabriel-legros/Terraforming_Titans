let hazardManager = null;

let HazardousBiomassHazardCtor = null;
let HazardousMachineryHazardCtor = null;
let GarbageHazardCtor = null;
let KesslerHazardCtor = null;
let PulsarHazardCtor = null;
let LandReservationReconcilerCtor = null;
let getCoreFluxLandReservationShareHelper = null;
let normalizeLandReservationShareHelper = null;
let resolveLandReservationInitialLandHelper = null;

function resolveKesslerCtor(current) {
  let resolved = current;
  try {
    resolved = resolved || KesslerHazard;
  } catch (error) {
    try {
      resolved = resolved || window.KesslerHazard;
    } catch (innerError) {
      try {
        resolved = resolved || global.KesslerHazard;
      } catch (lastError) {
        resolved = resolved || null;
      }
    }
  }
  return resolved;
}

try {
  ({ HazardousBiomassHazard: HazardousBiomassHazardCtor } = require('./hazards/hazardousBiomassHazard.js'));
} catch (error) {
  try {
    HazardousBiomassHazardCtor = HazardousBiomassHazard;
  } catch (innerError) {
    HazardousBiomassHazardCtor = null;
  }
}

try {
  ({ HazardousMachineryHazard: HazardousMachineryHazardCtor } = require('./hazards/hazardousMachineryHazard.js'));
} catch (error) {
  try {
    HazardousMachineryHazardCtor = HazardousMachineryHazard;
  } catch (innerError) {
    HazardousMachineryHazardCtor = null;
  }
}

try {
  ({ GarbageHazard: GarbageHazardCtor } = require('./hazards/garbageHazard.js'));
} catch (error) {
  try {
    GarbageHazardCtor = GarbageHazard;
  } catch (innerError) {
    GarbageHazardCtor = null;
  }
}

try {
  ({ KesslerHazard: KesslerHazardCtor } = require('./hazards/kesslerHazard.js'));
} catch (error) {
  try {
    KesslerHazardCtor = KesslerHazard;
  } catch (innerError) {
    KesslerHazardCtor = null;
  }
}

try {
  ({ PulsarHazard: PulsarHazardCtor } = require('./hazards/pulsarHazard.js'));
} catch (error) {
  try {
    PulsarHazardCtor = PulsarHazard;
  } catch (innerError) {
    PulsarHazardCtor = null;
  }
}

try {
  ({
    LandReservationReconciler: LandReservationReconcilerCtor,
    getCoreFluxLandReservationShare: getCoreFluxLandReservationShareHelper,
    normalizeLandReservationShare: normalizeLandReservationShareHelper,
    resolveLandReservationInitialLand: resolveLandReservationInitialLandHelper
  } = require('./landReservation.js'));
} catch (error) {
  try {
    LandReservationReconcilerCtor = LandReservationReconciler;
    getCoreFluxLandReservationShareHelper = getCoreFluxLandReservationShare;
    normalizeLandReservationShareHelper = normalizeLandReservationShare;
    resolveLandReservationInitialLandHelper = resolveLandReservationInitialLand;
  } catch (innerError) {
    LandReservationReconcilerCtor = null;
    getCoreFluxLandReservationShareHelper = null;
    normalizeLandReservationShareHelper = null;
    resolveLandReservationInitialLandHelper = null;
  }
}

function cloneHazardParameters(parameters) {
  try {
    return JSON.parse(JSON.stringify(parameters || {}));
  } catch (error) {
    console.error('Failed to clone hazard parameters.', error);
    return {};
  }
}

function mergeHazardParameterValues(baseValue, overrideValue) {
  if (!(baseValue && baseValue.constructor === Object && overrideValue && overrideValue.constructor === Object)) {
    return overrideValue;
  }

  const merged = { ...baseValue };
  Object.keys(overrideValue).forEach((key) => {
    merged[key] = mergeHazardParameterValues(baseValue[key], overrideValue[key]);
  });
  return merged;
}

function mergeHazardParameters(baseParameters, overrideParameters) {
  const base = cloneHazardParameters(baseParameters);
  const override = cloneHazardParameters(overrideParameters);
  const merged = base && base.constructor === Object ? base : {};

  if (!(override && override.constructor === Object)) {
    return merged;
  }

  Object.keys(override).forEach((key) => {
    merged[key] = mergeHazardParameterValues(merged[key], override[key]);
  });

  return merged;
}

function getPlanetHazards(parameters) {
  if (parameters && parameters.constructor === Object) {
    return parameters;
  }

  try {
    return currentPlanetParameters && currentPlanetParameters.hazards ? currentPlanetParameters.hazards : {};
  } catch (error) {
    return {};
  }
}

function getTerraforming() {
  try {
    return terraforming;
  } catch (error) {
    return null;
  }
}

class HazardManager {
  constructor() {
    this.enabled = false;
    this.parameters = {};
    this.lastSerializedParameters = '';
    this.cachedHazardousBiomassControl = 0;
    this.cachedPenaltyMultipliers = {
      buildCost: 1,
      maintenanceCost: 1,
      populationGrowth: 1,
    };
    this.hazardPenaltyEffectsApplied = false;
    this.hazardPenaltyEffectModes = {
      buildCost: false,
      maintenance: false,
      population: false,
      garbage: false,
      machinery: false,
    };
    this.crusaderTargetZone = 'any';
    this.hazardLandReservationShares = {
      hazardousBiomass: 0,
      hazardousMachinery: 0,
      pulsar: 0
    };
    this.landReservationReconciler = LandReservationReconcilerCtor
      ? new LandReservationReconcilerCtor()
      : null;

    this.hazardousBiomassHazard = HazardousBiomassHazardCtor ? new HazardousBiomassHazardCtor(this) : null;
    this.hazardousMachineryHazard = HazardousMachineryHazardCtor ? new HazardousMachineryHazardCtor(this) : null;
    this.garbageHazard = GarbageHazardCtor ? new GarbageHazardCtor(this) : null;
    KesslerHazardCtor = resolveKesslerCtor(KesslerHazardCtor);
    this.kesslerHazard = KesslerHazardCtor ? new KesslerHazardCtor(this) : null;
    this.pulsarHazard = PulsarHazardCtor ? new PulsarHazardCtor(this) : null;
  }

  normalizeHazardParametersForKey(key, value) {
    if (key === 'hazardousBiomass' && this.hazardousBiomassHazard) {
      return this.hazardousBiomassHazard.normalize(value);
    }

    if (key === 'hazardousMachinery' && this.hazardousMachineryHazard) {
      return this.hazardousMachineryHazard.normalize(value);
    }

    if (key === 'garbage' && this.garbageHazard) {
      return this.garbageHazard.normalize(value);
    }

    if (key === 'kessler' && this.kesslerHazard) {
      return this.kesslerHazard.normalize(value);
    }

    if (key === 'pulsar' && this.pulsarHazard) {
      return this.pulsarHazard.normalize(value);
    }

    return value;
  }

  normalizeHazardParameters(parameters = {}) {
    const normalized = {};
    Object.keys(parameters).forEach((key) => {
      normalized[key] = this.normalizeHazardParametersForKey(key, parameters[key]);
    });
    return normalized;
  }

  applyParameters(parameters = {}) {
    const serialized = JSON.stringify(parameters);
    const changed = serialized !== this.lastSerializedParameters;
    this.parameters = parameters;
    this.lastSerializedParameters = serialized;
    return changed;
  }

  initializeHazardState(key, terraformingState = null, options = {}) {
    const activeTerraforming = terraformingState || getTerraforming();
    const hazardParameters = this.hasHazardParameters(key) ? this.parameters[key] : null;

    if (key === 'hazardousBiomass') {
      if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.syncPendingTravelTuning) {
        this.hazardousBiomassHazard.syncPendingTravelTuning(hazardParameters, options);
      }
      if (this.hazardousBiomassHazard) {
        this.hazardousBiomassHazard.updateHazardousLandReservation(activeTerraforming, hazardParameters);
      }
      return;
    }

    if (key === 'hazardousMachinery') {
      if (this.hazardousMachineryHazard && hazardParameters) {
        this.hazardousMachineryHazard.initialize(activeTerraforming, hazardParameters, options);
      } else {
        this.setHazardLandReservationShare('hazardousMachinery', 0);
      }
      return;
    }

    if (key === 'garbage') {
      if (this.garbageHazard && hazardParameters) {
        this.garbageHazard.initializeResources(activeTerraforming, hazardParameters, options);
      } else if (this.garbageHazard) {
        this.garbageHazard.androidAttritionRates = {};
      }
      return;
    }

    if (key === 'kessler') {
      if (this.kesslerHazard && hazardParameters) {
        this.kesslerHazard.initializeResources(activeTerraforming, hazardParameters, options);
      }
      return;
    }

    if (key === 'pulsar') {
      if (this.pulsarHazard && hazardParameters) {
        this.pulsarHazard.initialize(activeTerraforming, hazardParameters, options);
        if (activeTerraforming && activeTerraforming.updateSurfaceRadiation) {
          activeTerraforming.updateSurfaceRadiation();
        }
      } else if (this.pulsarHazard) {
        this.pulsarHazard.clearEffectsOnTravel(activeTerraforming);
        if (activeTerraforming && activeTerraforming.updateSurfaceRadiation) {
          activeTerraforming.updateSurfaceRadiation();
        }
      }
      if (hazardParameters) {
        addEffect({
          target: 'project',
          targetId: 'artificialSky',
          type: 'enable',
          effectId: 'pulsar-hazard-artificial-sky-enable',
          sourceId: 'pulsar-hazard'
        });
      }
    }
  }

  enable() {
    if (this.enabled) {
      return;
    }

    this.enabled = true;
    this.updateUI();
  }

  disable() {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.updateHazardousLandReservation) {
      this.hazardousBiomassHazard.updateHazardousLandReservation(null, null);
    } else {
      this.updateHazardousBiomassControl(0, true);
    }
    this.setHazardLandReservationShare('hazardousBiomass', 0);
    this.setHazardLandReservationShare('hazardousMachinery', 0);
    this.setHazardLandReservationShare('pulsar', 0);
    this.updateUI();
  }

  initialize(parameters = null, options = {}) {
    const planetHazards = getPlanetHazards(parameters);
    const cloned = cloneHazardParameters(planetHazards);
    const normalized = this.normalizeHazardParameters(cloned);
    const changed = this.applyParameters(normalized);
    this.updateHazardousBiomassControl(this.cachedHazardousBiomassControl, true);
    const activeTerraforming = getTerraforming();
    this.initializeHazardState('hazardousBiomass', activeTerraforming, options);
    this.initializeHazardState('hazardousMachinery', activeTerraforming, options);
    this.initializeHazardState('garbage', activeTerraforming, options);
    this.initializeHazardState('kessler', activeTerraforming, options);
    this.initializeHazardState('pulsar', activeTerraforming, options);

    this.syncHazardLandReservation(activeTerraforming);

    if (changed && this.enabled) {
      this.updateUI();
    }
  }

  updateUI() {
    let visibilityToggle = null;
    try {
      visibilityToggle = setTerraformingHazardsVisibility;
    } catch (error) {
      visibilityToggle = null;
    }

    if (visibilityToggle && visibilityToggle.call) {
      visibilityToggle(this.enabled);
    }

    if (!this.enabled) {
      return;
    }

    let initializeUI = null;
    try {
      initializeUI = initializeHazardUI;
    } catch (error) {
      initializeUI = null;
    }

    if (initializeUI && initializeUI.call) {
      initializeUI();
    }

    let updateUI = null;
    try {
      updateUI = updateHazardUI;
    } catch (error) {
      updateUI = null;
    }

    if (updateUI && updateUI.call) {
      updateUI(this.parameters);
    }
  }

  hasHazardParameters(key) {
    if (!key || !this.parameters) {
      return false;
    }
    return !!this.parameters[key];
  }

  getCrusaderTargetZone() {
    return this.crusaderTargetZone || 'any';
  }

  setCrusaderTargetZone(zone) {
    let normalized = 'any';
    const trimmed = zone && zone.trim ? zone.trim() : '';
    if (trimmed) {
      normalized = trimmed.toLowerCase();
    }

    if (normalized !== 'any') {
      const activeTerraforming = getTerraforming();
      const knownZones = this.hazardousBiomassHazard && this.hazardousBiomassHazard.getZoneKeys
        ? this.hazardousBiomassHazard.getZoneKeys(activeTerraforming)
        : [];

      if (knownZones.indexOf(normalized) === -1) {
        normalized = 'any';
      }
    }

    if (this.crusaderTargetZone === normalized) {
      return this.crusaderTargetZone;
    }

    this.crusaderTargetZone = normalized;

    if (this.enabled) {
      this.updateUI();
    }

    return this.crusaderTargetZone;
  }

  save() {
    let kesslerState = null;
    let pulsarState = null;
    let hazardousMachineryState = null;
    try {
      kesslerState = this.kesslerHazard.save();
    } catch (error) {
      kesslerState = null;
    }
    try {
      pulsarState = this.pulsarHazard && this.pulsarHazard.save ? this.pulsarHazard.save() : null;
    } catch (error) {
      pulsarState = null;
    }
    try {
      hazardousMachineryState = this.hazardousMachineryHazard && this.hazardousMachineryHazard.save
        ? this.hazardousMachineryHazard.save()
        : null;
    } catch (error) {
      hazardousMachineryState = null;
    }
    return {
      parameters: cloneHazardParameters(this.parameters),
      crusaderTargetZone: this.getCrusaderTargetZone(),
      hazardousMachineryHazard: hazardousMachineryState,
      garbageHazard: this.garbageHazard && this.garbageHazard.save ? this.garbageHazard.save() : null,
      kesslerHazard: kesslerState,
      pulsarHazard: pulsarState
    };
  }

  load(data) {
    const savedParameters = data && data.parameters && data.parameters.constructor === Object
      ? data.parameters
      : null;
    const parameters = savedParameters
      ? mergeHazardParameters(getPlanetHazards(), savedParameters)
      : getPlanetHazards();

    this.initialize(parameters, {
      unlockOnly: true,
      skipPendingTravelTuning: !!savedParameters
    });
    const storedTarget = data && data.crusaderTargetZone && data.crusaderTargetZone.trim
      ? data.crusaderTargetZone
      : 'any';
    this.setCrusaderTargetZone(storedTarget);
    (this.hazardousMachineryHazard && this.hazardousMachineryHazard.load)
      && this.hazardousMachineryHazard.load(data && data.hazardousMachineryHazard ? data.hazardousMachineryHazard : null);
    (this.garbageHazard && this.garbageHazard.load)
      && this.garbageHazard.load(data && data.garbageHazard ? data.garbageHazard : null);
    try {
      this.kesslerHazard.load(data && data.kesslerHazard ? data.kesslerHazard : null);
    } catch (error) {
      // no-op
    }
    try {
      this.pulsarHazard && this.pulsarHazard.load && this.pulsarHazard.load(data && data.pulsarHazard ? data.pulsarHazard : null);
    } catch (error) {
      // no-op
    }
  }

  resetHazardFromParameters(key, options = {}) {
    const normalizedKey = key && key.trim ? key.trim() : key;
    if (!normalizedKey) {
      return false;
    }

    const planetHazards = getPlanetHazards();
    const nextParameters = cloneHazardParameters(this.parameters);
    if (planetHazards && Object.prototype.hasOwnProperty.call(planetHazards, normalizedKey)) {
      nextParameters[normalizedKey] = this.normalizeHazardParametersForKey(normalizedKey, cloneHazardParameters(planetHazards[normalizedKey]));
    } else {
      delete nextParameters[normalizedKey];
    }

    this.applyParameters(nextParameters);
    this.updateHazardousBiomassControl(this.cachedHazardousBiomassControl, true);

    const activeTerraforming = getTerraforming();
    this.initializeHazardState(normalizedKey, activeTerraforming, {
      ...options,
      resetValue: options.resetValue !== false
    });
    this.syncHazardLandReservation(activeTerraforming);

    if (this.enabled) {
      this.updateUI();
    }

    return true;
  }

  update(deltaTime = 0, terraformingState = null) {
    if (!terraformingState) {
      return;
    }

    const deltaSeconds = deltaTime > 0 ? deltaTime / 1000 : 0;

    // Pulsar modifies active radiation. Apply it before hazardous biomass so
    // hazardous growth/decay uses the same effective dose shown in UI.
    const pulsar = this.hasHazardParameters('pulsar') ? this.parameters.pulsar : null;
    if (this.pulsarHazard && pulsar) {
      this.pulsarHazard.update(deltaSeconds, terraformingState, pulsar);
      if (terraformingState.updateSurfaceRadiation) {
        terraformingState.updateSurfaceRadiation();
      }
    } else if (this.pulsarHazard) {
      this.pulsarHazard.clearEffectsOnTravel(terraformingState);
      if (terraformingState.updateSurfaceRadiation) {
        terraformingState.updateSurfaceRadiation();
      }
    }

    const hazardous = this.hasHazardParameters('hazardousBiomass') ? this.parameters.hazardousBiomass : null;
    if (this.hazardousBiomassHazard && hazardous) {
      this.hazardousBiomassHazard.update(deltaTime, terraformingState, hazardous);
    } else if (this.hazardousBiomassHazard) {
      this.hazardousBiomassHazard.updateHazardousLandReservation(terraformingState, hazardous);
    } else {
      this.updateHazardousBiomassControl(0);
    }

    const hazardousMachinery = this.hasHazardParameters('hazardousMachinery') ? this.parameters.hazardousMachinery : null;
    if (this.hazardousMachineryHazard && hazardousMachinery) {
      this.hazardousMachineryHazard.update(deltaTime, terraformingState, hazardousMachinery);
    } else if (this.hazardousMachineryHazard) {
      this.setHazardLandReservationShare('hazardousMachinery', 0);
    }

    if (this.garbageHazard && this.hasHazardParameters('garbage')) {
      this.garbageHazard.update(deltaSeconds);
    } else if (this.garbageHazard) {
      this.garbageHazard.androidAttritionRates = {};
    }
    if (this.kesslerHazard && this.hasHazardParameters('kessler')) {
      this.kesslerHazard.update(deltaSeconds, terraformingState, this.parameters.kessler);
    }
    this.syncHazardLandReservation(terraformingState);
  }

  normalizeHazardLandShare(share) {
    if (normalizeLandReservationShareHelper) {
      return normalizeLandReservationShareHelper(share);
    }
    if (!Number.isFinite(share) || share <= 0) {
      return 0;
    }
    if (share >= 1) {
      return 1;
    }
    return share;
  }

  setHazardLandReservationShare(source, share) {
    if (!source) {
      return 0;
    }

    const normalized = this.normalizeHazardLandShare(share);
    const previous = this.hazardLandReservationShares[source] || 0;
    if (previous === normalized) {
      return normalized;
    }

    this.hazardLandReservationShares[source] = normalized;
    if (this.landReservationReconciler?.setShare) {
      this.landReservationReconciler.setShare(source, normalized);
    }
    this.syncHazardLandReservation();
    return normalized;
  }

  resolveInitialLandForHazards(terraformingState, landResource) {
    if (resolveLandReservationInitialLandHelper) {
      return resolveLandReservationInitialLandHelper(terraformingState, landResource);
    }
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

  getCoreFluxLandReservationShare(terraformingState = null) {
    if (getCoreFluxLandReservationShareHelper) {
      return getCoreFluxLandReservationShareHelper(terraformingState);
    }
    const activeTerraforming = terraformingState || getTerraforming();
    const baseFlux = Math.max(0, activeTerraforming?.celestialParameters?.coreHeatFlux || 0);
    if (!(baseFlux > 0)) {
      return 0;
    }
    const currentFlux = Math.max(
      0,
      activeTerraforming?.getCoreHeatFlux ? activeTerraforming.getCoreHeatFlux() : baseFlux
    );
    const temperature = activeTerraforming?.temperature?.value;
    let temperatureShare = 1;
    if (Number.isFinite(temperature)) {
      if (temperature <= 973.15) {
        temperatureShare = 0;
      } else if (temperature < 1273.15) {
        temperatureShare = (temperature - 973.15) / 300;
      }
    }
    return Math.min(currentFlux / baseFlux, temperatureShare);
  }

  getCombinedHazardLandShare(terraformingState = null) {
    if (this.landReservationReconciler?.getCombinedShare) {
      return this.landReservationReconciler.getCombinedShare({
        coreHeatFlux: this.getCoreFluxLandReservationShare(terraformingState)
      });
    }
    const biomassShare = this.hazardLandReservationShares.hazardousBiomass || 0;
    const machineryShare = this.hazardLandReservationShares.hazardousMachinery || 0;
    const pulsarShare = this.hazardLandReservationShares.pulsar || 0;
    const coreFluxShare = this.getCoreFluxLandReservationShare(terraformingState);
    return Math.max(biomassShare, machineryShare, pulsarShare, coreFluxShare);
  }

  syncHazardLandReservation(terraformingState = null) {
    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const landResource = resourcesState?.surface?.land;
    if (!landResource || !landResource.setReservedAmountForSource) {
      return;
    }

    const activeTerraforming = terraformingState || getTerraforming();
    if (this.landReservationReconciler?.syncToLandResource) {
      this.landReservationReconciler.syncToLandResource(landResource, activeTerraforming, {
        coreHeatFlux: this.getCoreFluxLandReservationShare(activeTerraforming)
      });
      return;
    }

    const initialLand = this.resolveInitialLandForHazards(activeTerraforming, landResource);
    const combinedShare = this.getCombinedHazardLandShare(activeTerraforming);
    const reservedLand = initialLand > 0 ? initialLand * combinedShare : 0;

    landResource.setReservedAmountForSource('hazards', reservedLand);
    landResource.setReservedAmountForSource('hazardousBiomass', 0);
    landResource.setReservedAmountForSource('hazardousMachinery', 0);
  }

  getTravelHazards() {
    return [
      { key: 'hazardousBiomass', hazard: this.hazardousBiomassHazard },
      { key: 'hazardousMachinery', hazard: this.hazardousMachineryHazard },
      { key: 'garbage', hazard: this.garbageHazard },
      { key: 'kessler', hazard: this.kesslerHazard },
      { key: 'pulsar', hazard: this.pulsarHazard },
    ];
  }

  prepareForTravel(terraformingState = null) {
    const activeTerraforming = terraformingState || getTerraforming();
    const travelHazards = this.getTravelHazards();

    travelHazards.forEach((entry) => {
      if (!entry.hazard || !entry.hazard.clearEffectsOnTravel) {
        return;
      }
      entry.hazard.clearEffectsOnTravel(activeTerraforming, this.parameters[entry.key]);
    });

    this.updateHazardousBiomassControl(0, true);
    this.setHazardLandReservationShare('hazardousBiomass', 0);
    this.setHazardLandReservationShare('hazardousMachinery', 0);
    this.setHazardLandReservationShare('pulsar', 0);
    this.syncHazardLandReservation(activeTerraforming);
  }

  applyTravelAdjustments(terraformingState = null) {
    if (this.kesslerHazard && this.parameters.kessler) {
      this.kesslerHazard.applySolisTravelAdjustments(terraformingState);
    }
  }

  getKesslerTradeLimitPerSecond() {
    const active = this.parameters.kessler && !this.kesslerHazard.isCleared();
    return active ? 100 : Infinity;
  }

  getKesslerCargoLimit(durationSeconds) {
    const active = this.parameters.kessler && !this.kesslerHazard.isCleared();
    return active ? 100 * durationSeconds : Infinity;
  }

  ensureCrusaderPresence(terraformingState) {
    if (
      this.hasHazardParameters('hazardousBiomass') &&
      this.hazardousBiomassHazard &&
      this.hazardousBiomassHazard.ensureCrusaderPresence
    ) {
      this.hazardousBiomassHazard.ensureCrusaderPresence(terraformingState);
    }
    if (
      this.hasHazardParameters('hazardousMachinery') &&
      this.hazardousMachineryHazard &&
      this.hazardousMachineryHazard.ensureCrusaderPresence
    ) {
      this.hazardousMachineryHazard.ensureCrusaderPresence(terraformingState);
    }
  }

  getAdditionalWorkerRequirements() {
    if (
      !this.hasHazardParameters('hazardousMachinery') ||
      !this.hazardousMachineryHazard ||
      !this.hazardousMachineryHazard.getAdditionalWorkerRequirements
    ) {
      return null;
    }
    return this.hazardousMachineryHazard.getAdditionalWorkerRequirements();
  }

  hasHazardousBiomass(terraformingState) {
    if (!this.hasHazardParameters('hazardousBiomass')) {
      return false;
    }

    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.hasHazard) {
      return this.hazardousBiomassHazard.hasHazard(terraformingState);
    }

    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const hazardousResource = resourcesState?.surface?.hazardousBiomass;
    const hazardousValue = Number.isFinite(hazardousResource?.value) ? hazardousResource.value : 0;
    return hazardousValue > 0;
  }

  getHazardClearanceStatus(terraformingState) {
    const hazardKeys = Object.keys(this.parameters);
    if (!hazardKeys.length) {
      return true;
    }

    for (let index = 0; index < hazardKeys.length; index += 1) {
      const hazardKey = hazardKeys[index];
      switch (hazardKey) {
        case 'hazardousBiomass':
          if (!this.hazardousBiomassHazard.isCleared(terraformingState, this.parameters.hazardousBiomass)) {
            return false;
          }
          break;
        case 'hazardousMachinery':
          if (this.hazardousMachineryHazard && !this.hazardousMachineryHazard.isCleared(terraformingState, this.parameters.hazardousMachinery)) {
            return false;
          }
          break;
        case 'garbage':
          if (!this.garbageHazard.isCleared(terraformingState, this.parameters.garbage)) {
            return false;
          }
          break;
        case 'kessler':
          if (!this.kesslerHazard.isCleared(terraformingState, this.parameters.kessler)) {
            return false;
          }
          break;
        case 'pulsar':
          if (this.pulsarHazard && !this.pulsarHazard.isCleared(terraformingState, this.parameters.pulsar)) {
            return false;
          }
          break;
        default:
          break;
      }
    }

    return true;
  }

  getHazardPenalties(key) {
    if (!key || !Object.prototype.hasOwnProperty.call(this.parameters, key)) {
      return {};
    }

    return cloneHazardParameters(this.parameters[key].penalties);
  }

  getPenaltyMultipliers() {
    if (!this.parameters || Object.keys(this.parameters).length === 0) {
      return this.cachedPenaltyMultipliers;
    }

    this.cachedPenaltyMultipliers = this.calculatePenaltyMultipliers(this.cachedHazardousBiomassControl);
    return this.cachedPenaltyMultipliers;
  }

  getHazardousBiomassControl() {
    return this.cachedHazardousBiomassControl;
  }

  updateHazardousBiomassControl(control, forceUpdate = false) {
    const normalized = this.normalizeHazardControl(control);
    const difference = Math.abs(normalized - this.cachedHazardousBiomassControl);
    this.cachedHazardousBiomassControl = normalized;

    if (forceUpdate || difference > 1e-9) {
      this.cachedPenaltyMultipliers = this.calculatePenaltyMultipliers(normalized);
    }
  }

  normalizeHazardControl(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return value >= 1 ? 1 : value;
  }

  calculatePenaltyMultipliers(control = 0) {
    const normalizedControl = this.normalizeHazardControl(control);

    return {
      buildCost: this.calculatePenaltyMultiplier('buildCost', (penalty) => 1 + penalty, normalizedControl),
      maintenanceCost: this.calculatePenaltyMultiplier('maintenanceCost', (penalty) => 1 + penalty, normalizedControl),
      populationGrowth: this.calculatePenaltyMultiplier('populationGrowth', (penalty) => 1 / (1 + penalty), normalizedControl),
    };
  }

  calculatePenaltyMultiplier(key, transform, control = 0) {
    if (!control) {
      return 1;
    }

    let multiplier = 1;

    Object.keys(this.parameters).forEach((hazardKey) => {
      const hazard = this.parameters[hazardKey];
      if (!hazard || !hazard.penalties || !hazard.penalties[key]) {
        return;
      }

      const penalty = hazard.penalties[key];
      const penaltyValue = this.getPenaltyValue(penalty);
      if (!penaltyValue) {
        return;
      }

      const scaledPenalty = penaltyValue * control;
      if (!scaledPenalty) {
        return;
      }

      const transformed = transform(scaledPenalty);
      multiplier *= Number.isFinite(transformed) && transformed > 0 ? transformed : 1;
    });

    return multiplier;
  }

  getPenaltyValue(penalty) {
    if (!penalty) {
      return 0;
    }

    const value = Number.isFinite(penalty.value) ? penalty.value : 0;
    const severity = Number.isFinite(penalty.severity) ? penalty.severity : 1;
    return value * severity;
  }

  calculateHazardousBiomassGrowthPenalty(hazardousParameters, terraformingState) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.calculateGrowthPenalty) {
      return this.hazardousBiomassHazard.calculateGrowthPenalty(hazardousParameters, terraformingState);
    }
    return 0;
  }

  calculateHazardousBiomassGrowthPenaltyDetails(hazardousParameters, terraformingState) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.calculateGrowthPenaltyDetails) {
      return this.hazardousBiomassHazard.calculateGrowthPenaltyDetails(hazardousParameters, terraformingState);
    }

    return { totalPenalty: 0, globalPenalty: 0, zonePenalties: {} };
  }

  calculatePressureGrowthPenalty(cache, entry, gasKey) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.calculatePressureGrowthPenalty) {
      return this.hazardousBiomassHazard.calculatePressureGrowthPenalty(cache, entry, gasKey);
    }
    return 0;
  }

  convertPressureFromPa(value, unit) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.convertPressureFromPa) {
      return this.hazardousBiomassHazard.convertPressureFromPa(value, unit);
    }
    return 0;
  }

  computeRangePenalty(entry, currentValue) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.computeRangePenalty) {
      return this.hazardousBiomassHazard.computeRangePenalty(entry, currentValue);
    }
    return 0;
  }

  calculateTemperatureGrowthPenalty(terraformingState, entry) {
    const details = this.calculateTemperatureGrowthPenaltyDetails(terraformingState, entry);
    return details && Number.isFinite(details.totalPenalty) ? details.totalPenalty : 0;
  }

  calculateTemperatureGrowthPenaltyDetails(terraformingState, entry, zoneKeys, zoneWeights) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.calculateTemperatureGrowthPenaltyDetails) {
      return this.hazardousBiomassHazard.calculateTemperatureGrowthPenaltyDetails(terraformingState, entry, zoneKeys, zoneWeights);
    }

    return { totalPenalty: 0, zonePenalties: {} };
  }

  convertTemperatureFromKelvin(value, unit) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.convertTemperatureFromKelvin) {
      return this.hazardousBiomassHazard.convertTemperatureFromKelvin(value, unit);
    }
    return 0;
  }

  calculateRadiationGrowthPenalty(terraformingState, entry) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.calculateRadiationGrowthPenalty) {
      return this.hazardousBiomassHazard.calculateRadiationGrowthPenalty(terraformingState, entry);
    }
    return 0;
  }

  calculateLandPreferenceGrowthPenalty(terraformingState, entry) {
    return this.calculateLandPreferencePenaltyDetails(terraformingState, entry).totalPenalty;
  }

  calculateLandPreferencePenaltyDetails(terraformingState, entry, zoneKeys, zoneWeights) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.calculateLandPreferencePenaltyDetails) {
      return this.hazardousBiomassHazard.calculateLandPreferencePenaltyDetails(terraformingState, entry, zoneKeys, zoneWeights);
    }

    return { totalPenalty: 0, zonePenalties: {} };
  }

  calculateInvasivenessGrowthPenalty(terraformingState, entry) {
    return this.calculateInvasivenessGrowthPenaltyDetails(terraformingState, entry).totalPenalty;
  }

  calculateInvasivenessGrowthPenaltyDetails(terraformingState, entry, zoneKeys, zoneWeights) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.calculateInvasivenessGrowthPenaltyDetails) {
      return this.hazardousBiomassHazard.calculateInvasivenessGrowthPenaltyDetails(terraformingState, entry, zoneKeys, zoneWeights);
    }

    return { totalPenalty: 0, zonePenalties: {} };
  }

  calculateZoneLifeDensity(terraformingState, zone) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.calculateZoneLifeDensity) {
      return this.hazardousBiomassHazard.calculateZoneLifeDensity(terraformingState, zone);
    }
    return 0;
  }

  getLifeDesignInvasiveness() {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.getLifeDesignInvasiveness) {
      return this.hazardousBiomassHazard.getLifeDesignInvasiveness();
    }
    return 0;
  }

  getZoneWeight(zone, zoneCount) {
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.getZoneWeight) {
      return this.hazardousBiomassHazard.getZoneWeight(zone, zoneCount);
    }

    return zoneCount > 0 ? 1 / zoneCount : 0;
  }

  formatGarbageResourceName(key) {
    if (this.garbageHazard && this.garbageHazard.formatGarbageResourceName) {
      return this.garbageHazard.formatGarbageResourceName(key);
    }

    const withSpaces = `${key}`.replace(/([A-Z])/g, ' $1');
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }

  getGarbageClearedCategories() {
    return this.garbageHazard && this.garbageHazard.getClearedCategories
      ? this.garbageHazard.getClearedCategories()
      : {};
  }

  getGarbageAndroidAttritionDelaySeconds() {
    return this.garbageHazard && this.garbageHazard.getAndroidAttritionDelaySeconds
      ? this.garbageHazard.getAndroidAttritionDelaySeconds()
      : 0;
  }

  isGarbageCategoryCleared(key) {
    const cleared = this.getGarbageClearedCategories();
    return !!cleared[key];
  }

  clearHazardPenaltyEffects(context = {}) {
    const {
      buildings = {},
      colonies = {},
      populationModule = null,
    } = context;
    const clear = (target) => {
      if (target && target.removeEffect) {
        target.removeEffect({ sourceId: 'hazardPenalties' });
      }
    };

    Object.keys(buildings).forEach((id) => {
      clear(buildings[id]);
    });
    Object.keys(colonies).forEach((id) => {
      clear(colonies[id]);
    });
    clear(populationModule);

    let nanotech = null;
    try {
      nanotech = nanotechManager;
    } catch (error) {
      nanotech = null;
    }
    clear(nanotech);

    let scanner = null;
    try {
      scanner = oreScanner;
    } catch (error) {
      scanner = null;
    }
    clear(scanner);

    let lifeModule = null;
    try {
      lifeModule = lifeManager;
    } catch (error) {
      lifeModule = null;
    }
    clear(lifeModule);
  }

  applyHazardEffects(context = {}) {
    if (!context || !context.addEffect) {
      return;
    }

    const {
      addEffect: applyEffect,
      structures = {},
      colonies = {},
      buildings = {},
      populationModule = null,
    } = context;

    const penaltyMultipliers = this.getPenaltyMultipliers();
    const buildCostMultiplier = penaltyMultipliers.buildCost;
    const maintenanceMultiplier = penaltyMultipliers.maintenanceCost;
    const populationMultiplier = penaltyMultipliers.populationGrowth;
    const epsilon = 1e-12;
    const isNeutralMultiplier = (value) => Math.abs((value || 1) - 1) <= epsilon;
    const applyBuildCostPenalty = !isNeutralMultiplier(buildCostMultiplier);
    const applyMaintenancePenalty = !isNeutralMultiplier(maintenanceMultiplier);
    const applyPopulationPenalty = !!populationModule && !isNeutralMultiplier(populationMultiplier);
    const garbageCanApply = !!(
      this.garbageHazard &&
      this.parameters.garbage &&
      this.parameters.garbage.penalties &&
      this.parameters.garbage.surfaceResources &&
      !this.garbageHazard.permanentlyCleared
    );
    const previousModes = this.hazardPenaltyEffectModes || {
      buildCost: false,
      maintenance: false,
      population: false,
      garbage: false,
      machinery: false,
    };
    const machineryCanApply = !!(
      this.hazardousMachineryHazard &&
      this.parameters.hazardousMachinery &&
      this.hazardousMachineryHazard.hasHazard &&
      this.hazardousMachineryHazard.hasHazard()
    );

    const noPenaltyChannelsActive = !applyBuildCostPenalty
      && !applyMaintenancePenalty
      && !applyPopulationPenalty
      && !garbageCanApply
      && !machineryCanApply;
    if (noPenaltyChannelsActive) {
      if (this.hazardPenaltyEffectsApplied) {
        this.clearHazardPenaltyEffects(context);
      }
      if (this.garbageHazard) {
        this.garbageHazard.androidAttritionRates = {};
      }
      this.hazardPenaltyEffectsApplied = false;
      this.hazardPenaltyEffectModes = {
        buildCost: false,
        maintenance: false,
        population: false,
        garbage: false,
        machinery: false,
      };
      return;
    }

    const channelDisabledSinceLastTick =
      (previousModes.buildCost && !applyBuildCostPenalty) ||
      (previousModes.maintenance && !applyMaintenancePenalty) ||
      (previousModes.population && !applyPopulationPenalty) ||
      (previousModes.garbage && !garbageCanApply) ||
      (previousModes.machinery && !machineryCanApply);
    if (this.hazardPenaltyEffectsApplied && channelDisabledSinceLastTick) {
      this.clearHazardPenaltyEffects(context);
      this.hazardPenaltyEffectsApplied = false;
    }

    let appliedEffectCount = 0;
    const applyTrackedEffect = (effect) => {
      appliedEffectCount += 1;
      applyEffect(effect);
    };
    const applyBasePenaltyEffects = () => {
      if (applyBuildCostPenalty) {
        Object.keys(structures).forEach((id) => {
          const structure = structures[id];
          if (!structure || !structure.cost) {
            return;
          }

          const target = Object.prototype.hasOwnProperty.call(colonies, id)
            ? 'colony'
            : 'building';

          Object.keys(structure.cost).forEach((category) => {
            const categoryCosts = structure.cost[category];
            if (!categoryCosts) {
              return;
            }

            Object.keys(categoryCosts).forEach((resource) => {
              applyTrackedEffect({
                effectId: `hazardBuildCostPenalty-${category}-${resource}`,
                target,
                targetId: id,
                type: 'resourceCostMultiplier',
                resourceCategory: category,
                resourceId: resource,
                value: buildCostMultiplier,
                sourceId: 'hazardPenalties',
                name: 'Hazardous Biomass'
              });
            });
          });
        });
      }

      if (applyMaintenancePenalty) {
        Object.keys(buildings).forEach((id) => {
          if (!buildings[id]) {
            return;
          }

          applyTrackedEffect({
            effectId: 'hazardMaintenancePenalty',
            target: 'building',
            targetId: id,
            type: 'maintenanceMultiplier',
            value: maintenanceMultiplier,
            sourceId: 'hazardPenalties',
            name: 'Hazardous Biomass'
          });
        });

        Object.keys(colonies).forEach((id) => {
          applyTrackedEffect({
            effectId: 'hazardMaintenancePenalty',
            target: 'colony',
            targetId: id,
            type: 'maintenanceMultiplier',
            value: maintenanceMultiplier,
            sourceId: 'hazardPenalties',
            name: 'Hazardous Biomass'
          });
        });
      }

      if (applyPopulationPenalty) {
        applyTrackedEffect({
          effectId: 'hazardPopulationPenalty',
          target: 'population',
          type: 'growthMultiplier',
          value: populationMultiplier,
          sourceId: 'hazardPenalties',
        });
      }
    };

    applyBasePenaltyEffects();
    const hasBasePenaltyEffects = appliedEffectCount > 0;
    let garbageApplied = false;
    let machineryApplied = false;

    if (
      this.hasHazardParameters('garbage') &&
      this.garbageHazard &&
      this.garbageHazard.applyEffects
    ) {
      garbageApplied = this.garbageHazard.applyEffects(
        { addEffect: applyTrackedEffect, buildings, colonies },
        this.parameters.garbage
      ) === true;
    }

    if (
      this.parameters.hazardousMachinery &&
      this.hazardousMachineryHazard &&
      this.hazardousMachineryHazard.applyEffects
    ) {
      machineryApplied = this.hazardousMachineryHazard.applyEffects(
        { addEffect: applyTrackedEffect, buildings, colonies },
        this.parameters.hazardousMachinery
      ) === true;
    }

    if (
      this.hazardPenaltyEffectsApplied &&
      (
        (previousModes.garbage && !garbageApplied) ||
        (previousModes.machinery && !machineryApplied)
      ) &&
      (hasBasePenaltyEffects || garbageApplied || machineryApplied)
    ) {
      this.clearHazardPenaltyEffects(context);
      this.hazardPenaltyEffectsApplied = false;
      appliedEffectCount = 0;
      applyBasePenaltyEffects();
      if (
        garbageApplied &&
        this.hasHazardParameters('garbage') &&
        this.garbageHazard &&
        this.garbageHazard.applyEffects
      ) {
        this.garbageHazard.applyEffects(
          { addEffect: applyTrackedEffect, buildings, colonies },
          this.parameters.garbage
        );
      }
      if (
        machineryApplied &&
        this.parameters.hazardousMachinery &&
        this.hazardousMachineryHazard &&
        this.hazardousMachineryHazard.applyEffects
      ) {
        this.hazardousMachineryHazard.applyEffects(
          { addEffect: applyTrackedEffect, buildings, colonies },
          this.parameters.hazardousMachinery
        );
      }
    }

    if (appliedEffectCount <= 0) {
      if (this.hazardPenaltyEffectsApplied) {
        this.clearHazardPenaltyEffects(context);
      }
      this.hazardPenaltyEffectsApplied = false;
      this.hazardPenaltyEffectModes = {
        buildCost: false,
        maintenance: false,
        population: false,
        garbage: false,
        machinery: false,
      };
      return;
    }

    this.hazardPenaltyEffectsApplied = true;
    this.hazardPenaltyEffectModes = {
      buildCost: applyBuildCostPenalty,
      maintenance: applyMaintenancePenalty,
      population: applyPopulationPenalty,
      garbage: garbageApplied,
      machinery: machineryApplied,
    };
  }
}

function setHazardManager(instance) {
  hazardManager = instance;

  try {
    window.hazardManager = hazardManager;
  } catch (error) {
    try {
      global.hazardManager = hazardManager;
    } catch (innerError) {
      // no-op
    }
  }

  return hazardManager;
}

try {
  window.HazardManager = HazardManager;
  window.setHazardManager = setHazardManager;
} catch (error) {
  try {
    global.HazardManager = HazardManager;
    global.setHazardManager = setHazardManager;
  } catch (innerError) {
    // no-op
  }
}

try {
  module.exports = { HazardManager, setHazardManager };
} catch (error) {
  // Module system not available in browser
}
