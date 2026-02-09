let hazardManager = null;

let HazardousBiomassHazardCtor = null;
let GarbageHazardCtor = null;
let KesslerHazardCtor = null;
let PulsarHazardCtor = null;

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

function cloneHazardParameters(parameters) {
  try {
    return JSON.parse(JSON.stringify(parameters || {}));
  } catch (error) {
    console.error('Failed to clone hazard parameters.', error);
    return {};
  }
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
    this.crusaderTargetZone = 'any';
    this.hazardLandReservationShares = {
      hazardousBiomass: 0,
      pulsar: 0
    };

    this.hazardousBiomassHazard = HazardousBiomassHazardCtor ? new HazardousBiomassHazardCtor(this) : null;
    this.garbageHazard = GarbageHazardCtor ? new GarbageHazardCtor(this) : null;
    KesslerHazardCtor = resolveKesslerCtor(KesslerHazardCtor);
    this.kesslerHazard = KesslerHazardCtor ? new KesslerHazardCtor(this) : null;
    this.pulsarHazard = PulsarHazardCtor ? new PulsarHazardCtor(this) : null;
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
    this.setHazardLandReservationShare('pulsar', 0);
    this.updateUI();
  }

  initialize(parameters = null, options = {}) {
    const planetHazards = getPlanetHazards(parameters);
    const cloned = cloneHazardParameters(planetHazards);
    const normalized = {};

    Object.keys(cloned).forEach((key) => {
      if (key === 'hazardousBiomass' && this.hazardousBiomassHazard) {
        normalized.hazardousBiomass = this.hazardousBiomassHazard.normalize(cloned.hazardousBiomass);
        return;
      }

      if (key === 'garbage' && this.garbageHazard) {
        normalized.garbage = this.garbageHazard.normalize(cloned.garbage);
        return;
      }

      if (key === 'kessler' && this.kesslerHazard) {
        normalized.kessler = this.kesslerHazard.normalize(cloned.kessler);
        return;
      }

      if (key === 'pulsar' && this.pulsarHazard) {
        normalized.pulsar = this.pulsarHazard.normalize(cloned.pulsar);
        return;
      }

      normalized[key] = cloned[key];
    });

    const serialized = JSON.stringify(normalized);
    const changed = serialized !== this.lastSerializedParameters;

    this.parameters = normalized;
    this.lastSerializedParameters = serialized;
    this.updateHazardousBiomassControl(this.cachedHazardousBiomassControl, true);

    const activeTerraforming = getTerraforming();
    if (this.hazardousBiomassHazard) {
      this.hazardousBiomassHazard.updateHazardousLandReservation(activeTerraforming, this.parameters.hazardousBiomass);
    }

    if (this.garbageHazard) {
      this.garbageHazard.initializeResources(activeTerraforming, this.parameters.garbage, options);
    }

    if (this.kesslerHazard && this.parameters.kessler) {
      this.kesslerHazard.initializeResources(activeTerraforming, this.parameters.kessler, options);
    }

    if (this.pulsarHazard) {
      this.pulsarHazard.initialize(activeTerraforming, this.parameters.pulsar, options);
    }

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
    try {
      kesslerState = this.kesslerHazard.save();
    } catch (error) {
      kesslerState = null;
    }
    return {
      parameters: cloneHazardParameters(this.parameters),
      crusaderTargetZone: this.getCrusaderTargetZone(),
      garbageHazard: this.garbageHazard && this.garbageHazard.save ? this.garbageHazard.save() : null,
      kesslerHazard: kesslerState
    };
  }

  load(data) {
    this.initialize(getPlanetHazards(), { unlockOnly: true });
    const storedTarget = data && data.crusaderTargetZone && data.crusaderTargetZone.trim
      ? data.crusaderTargetZone
      : 'any';
    this.setCrusaderTargetZone(storedTarget);
    (this.garbageHazard && this.garbageHazard.load)
      && this.garbageHazard.load(data && data.garbageHazard ? data.garbageHazard : null);
    try {
      this.kesslerHazard.load(data && data.kesslerHazard ? data.kesslerHazard : null);
    } catch (error) {
      // no-op
    }
  }

  update(deltaTime = 0, terraformingState = null) {
    if (!terraformingState) {
      return;
    }

    const hazardous = this.parameters.hazardousBiomass;
    if (this.hazardousBiomassHazard && hazardous) {
      this.hazardousBiomassHazard.update(deltaTime, terraformingState, hazardous);
    } else if (this.hazardousBiomassHazard) {
      this.hazardousBiomassHazard.updateHazardousLandReservation(terraformingState, hazardous);
    } else {
      this.updateHazardousBiomassControl(0);
    }

    const deltaSeconds = deltaTime > 0 ? deltaTime / 1000 : 0;
    if (this.garbageHazard) {
      this.garbageHazard.update(deltaSeconds);
    }
    this.kesslerHazard.update(deltaSeconds, terraformingState, this.parameters.kessler);
    if (this.pulsarHazard) {
      this.pulsarHazard.update(deltaSeconds, terraformingState, this.parameters.pulsar);
    }
  }

  normalizeHazardLandShare(share) {
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
    this.syncHazardLandReservation();
    return normalized;
  }

  resolveInitialLandForHazards(terraformingState, landResource) {
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

  getCombinedHazardLandShare() {
    const biomassShare = this.hazardLandReservationShares.hazardousBiomass || 0;
    const pulsarShare = this.hazardLandReservationShares.pulsar || 0;
    return Math.max(biomassShare, pulsarShare);
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
    const initialLand = this.resolveInitialLandForHazards(activeTerraforming, landResource);
    const combinedShare = this.getCombinedHazardLandShare();
    const reservedLand = initialLand > 0 ? initialLand * combinedShare : 0;

    landResource.setReservedAmountForSource('hazards', reservedLand);
    landResource.setReservedAmountForSource('hazardousBiomass', 0);
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
    if (this.hazardousBiomassHazard && this.hazardousBiomassHazard.ensureCrusaderPresence) {
      this.hazardousBiomassHazard.ensureCrusaderPresence(terraformingState);
    }
  }

  hasHazardousBiomass(terraformingState) {
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
          applyEffect({
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

    Object.keys(buildings).forEach((id) => {
      if (!buildings[id]) {
        return;
      }

      applyEffect({
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
      applyEffect({
        effectId: 'hazardMaintenancePenalty',
        target: 'colony',
        targetId: id,
        type: 'maintenanceMultiplier',
        value: maintenanceMultiplier,
        sourceId: 'hazardPenalties',
        name: 'Hazardous Biomass'
      });
    });

    if (populationModule) {
      applyEffect({
        effectId: 'hazardPopulationPenalty',
        target: 'population',
        type: 'growthMultiplier',
        value: populationMultiplier,
        sourceId: 'hazardPenalties',
      });
    }

    if (this.garbageHazard && this.garbageHazard.applyEffects) {
      this.garbageHazard.applyEffects({ addEffect: applyEffect, buildings, colonies }, this.parameters.garbage);
    }
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
