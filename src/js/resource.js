// Resource Class and Core Logic
var debug_production = {};
var debug_consumption = {};
const EXACT_LAND_SCALE_DIGITS = 15;
let resolveWorldGeometricLandHelper = null;
let getDynamicWorldPlanetaryMassAvailableTonsHelper = null;
let hasDynamicMassEnabledHelper = null;
let disposeDynamicWorldPlanetaryMassHelper = null;
let addDynamicWorldPlanetaryMaterialHelper = null;
if (typeof module !== 'undefined' && module.exports) {
  ({
    resolveWorldGeometricLand: resolveWorldGeometricLandHelper,
    getDynamicWorldPlanetaryMassAvailableTons: getDynamicWorldPlanetaryMassAvailableTonsHelper,
    hasDynamicMassEnabled: hasDynamicMassEnabledHelper,
    disposeDynamicWorldPlanetaryMass: disposeDynamicWorldPlanetaryMassHelper,
    addDynamicWorldPlanetaryMaterial: addDynamicWorldPlanetaryMaterialHelper
  } = require('./world-geometry.js'));
}

function getDynamicWorldPlanetaryMassAvailableTonsSafe(terraformingState, celestialParameters) {
  return (getDynamicWorldPlanetaryMassAvailableTonsHelper || getDynamicWorldPlanetaryMassAvailableTons)(
    terraformingState,
    celestialParameters
  );
}

function hasDynamicMassEnabledSafe(terraformingState, planetParameters) {
  return (hasDynamicMassEnabledHelper || hasDynamicMassEnabled)(terraformingState, planetParameters);
}

function disposeDynamicWorldPlanetaryMassSafe(terraformingState, amountTons) {
  return (disposeDynamicWorldPlanetaryMassHelper || disposeDynamicWorldPlanetaryMass)(terraformingState, amountTons);
}

function addDynamicWorldPlanetaryMaterialSafe(terraformingState, materialKey, amountTons) {
  return (addDynamicWorldPlanetaryMaterialHelper || addDynamicWorldPlanetaryMaterial)(
    terraformingState,
    materialKey,
    amountTons
  );
}

function initializeAccumulatedSpecialChanges() {
  return {
    planetaryMass: {},
    planetaryMassImports: {}
  };
}

function collectWasteCleanupSlackByResource(buildings) {
  const cleanupSlack = {};
  for (const buildingName in buildings) {
    const building = buildings[buildingName];
    const byCategory = building.currentWasteCleanupSlack || {};
    for (const category in byCategory) {
      if (!cleanupSlack[category]) {
        cleanupSlack[category] = {};
      }
      for (const resourceName in byCategory[category]) {
        cleanupSlack[category][resourceName] =
          (cleanupSlack[category][resourceName] || 0) + byCategory[category][resourceName];
      }
    }
  }
  return cleanupSlack;
}

function routeColonyWaterOverflow(deltaTime, accumulatedChanges) {
  const resource = resources.colony.water;
  if (!resource.hasCap) {
    return;
  }

  const previousValue = resource.value;
  const newValue = resource.value + accumulatedChanges.colony.water;
  const limit = previousValue >= resource.cap ? previousValue : resource.cap;
  const overflow = newValue > limit ? newValue - limit : 0;
  if (overflow <= 0) {
    return;
  }

  accumulatedChanges.colony.water -= overflow;

  const zones = getZones();
  const zoneTemp = zone => terraforming.temperature.zones[zone].value;
  const warmZones = zones.filter(zone => zoneTemp(zone) > 273.15);
  const seconds = deltaTime / 1000;
  const rate = seconds > 0 ? overflow / seconds : 0;
  const allZonesHot = zones.every(zone => zoneTemp(zone) > 373.15);

  if (allZonesHot) {
    accumulatedChanges.atmospheric.atmosphericWater += overflow;
    resources.atmospheric.atmosphericWater.modifyRate(rate, 'Overflow', 'overflow');
  } else if (warmZones.length > 0) {
    accumulatedChanges.surface.liquidWater += overflow;
    resources.surface.liquidWater.modifyRate(rate, 'Overflow', 'overflow');
  } else {
    accumulatedChanges.surface.ice += overflow;
    resources.surface.ice.modifyRate(rate, 'Overflow', 'overflow');
  }

  resource.modifyRate(-rate, 'Overflow (not summed)', 'overflow');
}

function accumulateSpecialPlanetaryMassChange(accumulatedSpecialChanges, source, amount) {
  if (!(amount > 0)) {
    return;
  }
  accumulatedSpecialChanges.planetaryMass[source] =
    (accumulatedSpecialChanges.planetaryMass[source] || 0) + amount;
}

function accumulateSpecialPlanetaryMassImport(accumulatedSpecialChanges, source, materialKey, amount, reportRate = true, rateType = 'project') {
  if (!(amount > 0) || !materialKey) {
    return;
  }
  if (!accumulatedSpecialChanges.planetaryMassImports[source]) {
    accumulatedSpecialChanges.planetaryMassImports[source] = {
      materials: {},
      reportRate,
      rateType
    };
  }
  const entry = accumulatedSpecialChanges.planetaryMassImports[source];
  entry.reportRate = reportRate;
  entry.rateType = rateType;
  entry.materials[materialKey] = (entry.materials[materialKey] || 0) + amount;
}

function isExactLandResource(resource) {
  return resource && resource.category === 'surface' && resource.name === 'land';
}

function bigIntToApproxNumber(value, decimalDigits = 0) {
  if (value === 0n) {
    return 0;
  }

  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const digits = absolute.toString();
  let numeric;

  if (digits.length <= 300) {
    numeric = Number(digits);
  } else {
    const exponent = digits.length - decimalDigits - 1;
    const mantissa = digits.length > 1
      ? `${digits[0]}.${digits.slice(1, 16)}`
      : digits;
    numeric = Number(`${mantissa}e${exponent}`);
    if (decimalDigits > 0) {
      numeric /= Math.pow(10, decimalDigits);
    }
  }

  if (decimalDigits > 0 && digits.length <= 300) {
    numeric /= Math.pow(10, decimalDigits);
  }

  return negative ? -numeric : numeric;
}

function exactLandAmountToApproxNumber(value) {
  return bigIntToApproxNumber(value, EXACT_LAND_SCALE_DIGITS);
}

function numberToExactLandAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return 0n;
  }

  const negative = numeric < 0;
  const absolute = Math.abs(numeric);
  const scientific = absolute.toExponential(EXACT_LAND_SCALE_DIGITS);
  const scientificParts = scientific.split('e');
  const digitsText = scientificParts[0].replace('.', '');
  const exponent = parseInt(scientificParts[1], 10);
  let scaled = BigInt(digitsText);

  if (exponent >= 0) {
    scaled *= 10n ** BigInt(exponent);
  } else {
    scaled /= 10n ** BigInt(-exponent);
  }

  return negative ? -scaled : scaled;
}

function parseSerializedExactLandAmount(value) {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return numberToExactLandAmount(value);
  }
  return null;
}

class Resource extends EffectableEntity {
  constructor(resourceData) {
    super(resourceData);

    this.name = resourceData.name || '';
    this.category = resourceData.category;
    this.displayName = resourceData.displayName || resourceData.name || '';
    this.unit = resourceData.unit || null;
    this.initialValue = resourceData.initialValue || 0;
    this.value = resourceData.initialValue || 0;
    this.hasCap = resourceData.hasCap || false;
    this.baseCap = resourceData.baseCap || 0; // Store the base capacity of the resource
    this.cap = this.hasCap ? this.baseCap : Infinity; // Set the initial cap
    this.baseProductionRate = 0; // Keep for potential base calculations if needed later
    // Store rates by type { type: { sourceName: rate } } e.g., { 'building': { 'Mine': 10 }, 'terraforming': { 'Evaporation': -5 } }
    this.productionRateByType = {};
    this.consumptionRateByType = {};
    // Keep overall rates for potential display/compatibility, calculated by summing typed rates
    this.productionRate = 0;
    this.consumptionRate = 0;
    this.projectedProductionRate = 0;
    this.projectedConsumptionRate = 0;
    this.productionRateBySource = {};
    this.consumptionRateBySource = {};
    this.projectedProductionRateByType = {};
    this.projectedConsumptionRateByType = {};
    this.projectedProductionRateBySource = {};
    this.projectedConsumptionRateBySource = {};
    this.reserved = resourceData.reserved || 0;
    this.reservedSources = {};
    this.unlocked = resourceData.unlocked;
    this.maintenanceConversion = resourceData.maintenanceConversion || {}; // Stores any maintenance conversion mapping
    this.maintenanceMultiplier = resourceData.maintenanceMultiplier !== undefined ? resourceData.maintenanceMultiplier : 1; // Multiplier for maintenance costs
    this.conversionValue = resourceData.conversionValue || 1; // Default to 1 if not provided
    this.hideWhenSmall = resourceData.hideWhenSmall || false; // Flag to hide when value is very small
    this.hideRate = resourceData.hideRate || false; // Flag to hide rate display in UI
    this.showUndergroundRate = resourceData.showUndergroundRate === true;
    this.overflowRate = 0; // Track overflow/leakage rate for tooltip display
    this.rateHistory = []; // Keep history of recent net rates
    this.marginTop = resourceData.marginTop || 0;
    this.marginBottom = resourceData.marginBottom || 0;
    this.reverseColor = resourceData.reverseColor || false;
    this.autobuildShortage = false; // Flagged when autobuild cannot use this resource this tick
    this.autobuildShortageBuildings = null; // Building names throttled by this resource this tick
    this.automationLimited = false; // Flagged when import automation settings limit this resource
    this.zonalConfig = resourceData.zonalConfig || null;
    this.preserveOnTravel = resourceData.preserveOnTravel === true;
    this.preserveOnTravelFields = Array.isArray(resourceData.preserveOnTravelFields)
      ? resourceData.preserveOnTravelFields.slice()
      : null;
    this.exactValue = null;
    this.exactReserved = null;
    this.exactReservedSources = null;

    if (this.isExactLandResource()) {
      this.exactValue = numberToExactLandAmount(this.value);
      this.exactReserved = numberToExactLandAmount(this.reserved);
      this.exactReservedSources = {};
      this.syncApproximateLandState();
    }
  }

  // Method to initialize configurable properties
  initializeFromConfig(name, config) {
    this.name = name;
    if (config.initialValue !== undefined) {
      this.initialValue = config.initialValue;
    }

    if (config.displayName !== undefined) {
      this.displayName = config.displayName || config.name || this.displayName;
    }
    if (config.category !== undefined) {
      this.category = config.category;
    }
    if (config.hasCap !== undefined) {
      this.hasCap = config.hasCap;
    }
    if (config.baseCap !== undefined) {
      this.baseCap = config.baseCap;
    }
    if (config.unlocked !== undefined) {
      this.unlocked = config.unlocked;
    }
    if (config.unit !== undefined) {
      this.unit = config.unit;
    }
    if (config.maintenanceConversion !== undefined) {
      this.maintenanceConversion = config.maintenanceConversion || {};
    }
    if (config.maintenanceMultiplier !== undefined) {
      this.maintenanceMultiplier = config.maintenanceMultiplier;
    }
    if (config.conversionValue !== undefined) {
      this.conversionValue = config.conversionValue || 1;
    }
    if (config.hideWhenSmall !== undefined) {
      this.hideWhenSmall = config.hideWhenSmall;
    }
    if (config.hideRate !== undefined) {
      this.hideRate = config.hideRate;
    }
    if (config.showUndergroundRate !== undefined) {
      this.showUndergroundRate = config.showUndergroundRate === true;
    }
    if (config.reverseColor !== undefined) {
      this.reverseColor = config.reverseColor;
    }
    if (config.marginTop !== undefined) {
      this.marginTop = config.marginTop;
    }
    if (config.marginBottom !== undefined) {
      this.marginBottom = config.marginBottom;
    }
    if (config.zonalConfig !== undefined) {
      this.zonalConfig = config.zonalConfig || null;
    }
    if (config.preserveOnTravel !== undefined) {
      this.preserveOnTravel = config.preserveOnTravel === true;
    }
    if (config.preserveOnTravelFields !== undefined) {
      this.preserveOnTravelFields = Array.isArray(config.preserveOnTravelFields)
        ? config.preserveOnTravelFields.slice()
        : null;
    }

    if (this.name === 'land' && config.initialValue !== undefined) {
      this.value = Math.max(this.value, config.initialValue);
    }
  }

  isExactLandResource() {
    return isExactLandResource(this);
  }

  ensureExactLandState() {
    if (!this.isExactLandResource()) {
      return false;
    }

    if (typeof this.exactValue !== 'bigint') {
      this.exactValue = numberToExactLandAmount(this.value);
    }
    if (typeof this.exactReserved !== 'bigint') {
      this.exactReserved = numberToExactLandAmount(this.reserved);
    }
    if (!this.exactReservedSources || this.exactReservedSources.constructor !== Object) {
      this.exactReservedSources = {};
    }

    return true;
  }

  syncApproximateLandState() {
    if (!this.ensureExactLandState()) {
      return;
    }

    const sanitizedSources = {};
    for (const key in this.exactReservedSources) {
      const value = this.exactReservedSources[key];
      if (typeof value === 'bigint' && value > 0n) {
        sanitizedSources[key] = exactLandAmountToApproxNumber(value);
      }
    }

    this.value = exactLandAmountToApproxNumber(this.exactValue);
    this.reserved = exactLandAmountToApproxNumber(this.exactReserved);
    this.reservedSources = sanitizedSources;
  }

  setExactLandValue(amount) {
    if (!this.ensureExactLandState()) {
      this.value = Math.max(Number(amount) || 0, 0);
      return;
    }

    this.exactValue = numberToExactLandAmount(amount);
    this.syncApproximateLandState();
  }

  getExactLandValue() {
    this.ensureExactLandState();
    return this.exactValue;
  }

  getExactLandReserved() {
    this.ensureExactLandState();
    return this.exactReserved;
  }

  getExactLandAvailable() {
    if (!this.ensureExactLandState()) {
      return 0n;
    }
    const available = this.exactValue - this.exactReserved;
    return available > 0n ? available : 0n;
  }

  getExactReservedAmountForSource(source) {
    if (!this.ensureExactLandState()) {
      return 0n;
    }
    return this.exactReservedSources[source] || 0n;
  }

  canAffordLandAmount(amount) {
    if (!this.ensureExactLandState()) {
      return this.value - this.reserved >= amount;
    }
    return this.getExactLandAvailable() >= numberToExactLandAmount(amount);
  }

  getLandAffordCount(requirement) {
    if (!this.ensureExactLandState()) {
      if (!(requirement > 0)) {
        return Infinity;
      }
      return Math.floor((this.value - this.reserved) / requirement);
    }

    const scaledRequirement = numberToExactLandAmount(requirement);
    if (!(scaledRequirement > 0n)) {
      return Infinity;
    }

    return bigIntToApproxNumber(this.getExactLandAvailable() / scaledRequirement);
  }

  getAvailableAmount() {
    if (this.isExactLandResource()) {
      return exactLandAmountToApproxNumber(this.getExactLandAvailable());
    }
    return this.value - this.reserved;
  }

  hydrateSerializedState(state = {}) {
    if (!this.ensureExactLandState()) {
      return;
    }

    const savedValue = parseSerializedExactLandAmount(state._exactLandValue);
    const savedReserved = parseSerializedExactLandAmount(state._exactLandReserved);
    const savedSources = state._exactLandReservedSources;
    const nextSources = {};

    if (savedSources && savedSources.constructor === Object) {
      for (const key in savedSources) {
        const parsed = parseSerializedExactLandAmount(savedSources[key]);
        if (parsed && parsed > 0n) {
          nextSources[key] = parsed;
        }
      }
    } else if (this.reservedSources && this.reservedSources.constructor === Object) {
      for (const key in this.reservedSources) {
        const parsed = numberToExactLandAmount(this.reservedSources[key]);
        if (parsed > 0n) {
          nextSources[key] = parsed;
        }
      }
    }

    this.exactValue = savedValue && savedValue > 0n
      ? savedValue
      : numberToExactLandAmount(this.value);

    this.exactReservedSources = nextSources;

    if (Object.keys(nextSources).length > 0) {
      this.recalculateReservedFromSources();
    } else {
      this.exactReserved = savedReserved && savedReserved > 0n
        ? savedReserved
        : numberToExactLandAmount(this.reserved);
      this.syncApproximateLandState();
    }
  }

  saveState() {
    const state = {
      value: this.value,
      reserved: this.reserved,
      unlocked: this.unlocked
    };

    if ('enabled' in this) {
      state.enabled = this.enabled;
    }

    if (!this.isExactLandResource() && this.reservedSources && this.reservedSources.constructor === Object) {
      const reservedSources = {};

      for (const key in this.reservedSources) {
        const value = this.reservedSources[key];
        if (value > 0) {
          reservedSources[key] = value;
        }
      }

      if (Object.keys(reservedSources).length > 0) {
        state.reservedSources = reservedSources;
      }
    }

    if (this.isExactLandResource()) {
      this.ensureExactLandState();

      const exactReservedSources = {};
      for (const key in this.exactReservedSources) {
        const value = this.exactReservedSources[key];
        if (value > 0n) {
          exactReservedSources[key] = value.toString();
        }
      }

      state._exactLandValue = this.exactValue.toString();
      state._exactLandReserved = this.exactReserved.toString();
      state._exactLandReservedSources = exactReservedSources;
    }

    return state;
  }

  loadState(state = {}) {
    this.activeEffects = [];
    this.booleanFlags = new Set();
    this.resetTransientRateState();
    this.reservedSources = {};

    if (!state || state.constructor !== Object) {
      return;
    }

    if ('value' in state) this.value = state.value;
    if ('reserved' in state) this.reserved = state.reserved;
    if ('unlocked' in state) this.unlocked = state.unlocked;
    if ('enabled' in state) this.enabled = state.enabled;

    if (state.reservedSources && state.reservedSources.constructor === Object) {
      for (const key in state.reservedSources) {
        const value = state.reservedSources[key];
        if (value > 0) {
          this.reservedSources[key] = value;
        }
      }
    }

    this.hydrateSerializedState(state);

    if (!this.isExactLandResource() && Object.keys(this.reservedSources).length > 0) {
      this.recalculateReservedFromSources();
    }
  }

  toJSON() {
    return this.saveState();
  }

  increase(amount, ignoreCap) {
    if (amount > 0) {
      if (this.ensureExactLandState()) {
        const change = numberToExactLandAmount(amount);
        const target = ignoreCap
          ? (this.exactValue + change)
          : (this.exactValue + change);
        this.exactValue = target > this.exactValue ? target : this.exactValue;
        this.syncApproximateLandState();
        return;
      }
      this.value = ignoreCap ? this.value + amount : Math.min(this.value + amount, Math.max(this.cap, this.value));
    }
  }

  // Reset display-related properties to defaults from planet parameters
  reinitializeDisplayElements() {
    const defaultResource =
      defaultPlanetParameters &&
      defaultPlanetParameters.resources &&
      defaultPlanetParameters.resources[this.category] &&
      defaultPlanetParameters.resources[this.category][this.name];

    if (defaultResource) {
      this.displayName =
        defaultResource.displayName || defaultResource.name || this.name;
      this.marginTop = defaultResource.marginTop || 0;
      this.marginBottom = defaultResource.marginBottom || 0;
    } else {
      this.displayName = this.displayName || this.name;
      this.marginTop = this.marginTop || 0;
      this.marginBottom = this.marginBottom || 0;
    }
  }

  decrease(amount) {
    if (this.ensureExactLandState()) {
      const change = numberToExactLandAmount(amount);
      this.exactValue = this.exactValue > change ? this.exactValue - change : 0n;
      this.syncApproximateLandState();
      return;
    }
    this.value = Math.max(this.value - amount, 0);
  }

  isAvailable(amount) {
    if (this.ensureExactLandState()) {
      return this.canAffordLandAmount(amount);
    }
    return this.value - this.reserved >= amount;
  }

  reserve(amount) {
    if (this.ensureExactLandState()) {
      const currentDefault = this.exactReservedSources.default || 0n;
      if (!this.isAvailable(amount)) {
        return false;
      }
      this.exactReservedSources.default = currentDefault + numberToExactLandAmount(amount);
      this.recalculateReservedFromSources();
      return true;
    }
    if (this.isAvailable(amount)) {
      this.reserved += amount;
      return true;
    }
    return false;
  }

  release(amount) {
    if (this.ensureExactLandState()) {
      const currentDefault = this.exactReservedSources.default || 0n;
      const nextDefault = currentDefault - numberToExactLandAmount(amount);
      if (nextDefault > 0n) {
        this.exactReservedSources.default = nextDefault;
      } else {
        delete this.exactReservedSources.default;
      }
      this.recalculateReservedFromSources();
      return;
    }
    this.reserved = Math.max(this.reserved - amount, 0);
  }

  setReservedAmountForSource(source, amount) {
    if (this.ensureExactLandState()) {
      const key = source || 'default';
      const sanitized = typeof amount === 'bigint'
        ? (amount > 0n ? amount : 0n)
        : numberToExactLandAmount(amount);
      const existing = this.exactReservedSources[key] || 0n;
      let tracked = 0n;

      for (const existingKey in this.exactReservedSources) {
        if (existingKey === 'default') continue;
        const value = this.exactReservedSources[existingKey];
        if (typeof value === 'bigint' && value > 0n) {
          tracked += value;
        }
      }

      const unsourced = this.exactReserved > tracked ? this.exactReserved - tracked : 0n;
      const previousDefault = this.exactReservedSources.default || 0n;

      if (unsourced > 0n) {
        this.exactReservedSources.default = unsourced;
      } else {
        delete this.exactReservedSources.default;
      }

      if (sanitized > 0n) {
        this.exactReservedSources[key] = sanitized;
      } else {
        delete this.exactReservedSources[key];
      }

      const updated = this.exactReservedSources[key] || 0n;
      const nextDefault = this.exactReservedSources.default || 0n;

      if (updated !== existing || nextDefault !== previousDefault) {
        this.recalculateReservedFromSources();
      }

      return exactLandAmountToApproxNumber(updated);
    }

    const key = source || 'default';
    const sanitized = Number.isFinite(amount) && amount > 0 ? amount : 0;
    const existing = this.reservedSources[key] || 0;

    let tracked = 0;
    for (const [existingKey, value] of Object.entries(this.reservedSources)) {
      if (existingKey === 'default') continue;
      if (Number.isFinite(value) && value > 0) {
        tracked += value;
      }
    }

    const unsourced = Math.max(0, this.reserved - tracked);
    const previousDefault = this.reservedSources.default || 0;

    if (unsourced > 0) {
      this.reservedSources.default = unsourced;
    } else {
      delete this.reservedSources.default;
    }

    if (sanitized > 0) {
      this.reservedSources[key] = sanitized;
    } else {
      delete this.reservedSources[key];
    }

    const updated = this.reservedSources[key] || 0;
    const defaultChanged =
      (unsourced > 0 && previousDefault !== unsourced) ||
      (unsourced === 0 && previousDefault !== 0);

    if (updated !== existing || defaultChanged) {
      this.recalculateReservedFromSources();
    }

    return updated;
  }

  recalculateReservedFromSources() {
    if (this.ensureExactLandState()) {
      let totalReserved = 0n;

      for (const key in this.exactReservedSources) {
        const value = this.exactReservedSources[key];
        if (typeof value === 'bigint' && value > 0n) {
          totalReserved += value;
        }
      }

      this.exactReserved = totalReserved;
      this.syncApproximateLandState();
      return;
    }

    let totalReserved = 0;

    for (const value of Object.values(this.reservedSources)) {
      if (Number.isFinite(value) && value > 0) {
        totalReserved += value;
      }
    }

    this.reserved = totalReserved;
  }

  getReservedAmountForSource(source) {
    if (this.ensureExactLandState()) {
      return exactLandAmountToApproxNumber(this.exactReservedSources[source] || 0n);
    }
    return this.reservedSources[source] || 0;
  }

  addDeposit(amount = 1) {
    if (this.ensureExactLandState()) {
      this.exactValue += numberToExactLandAmount(amount);
      this.syncApproximateLandState();
      return;
    }
    this.value += amount;
  }

  resetBaseProductionRate() {
    this.baseProductionRate = 0;
  }

  resetTransientRateState() {
    this.resetBaseProductionRate();
    this.resetRates();
    this.rateHistory = [];
  }

  // Record a net production rate and keep only the last 10 entries
  recordNetRate(rate) {
    this.rateHistory.push(rate);
    if (this.rateHistory.length > 10) {
      this.rateHistory.shift();
    }
  }

  getEffectiveBaseStorageCap() {
    let cap = this.baseCap;
    const effects = this.activeEffects || [];
    let bonus = 0;
    let solisBonus = 0;
    for (let i = 0; i < effects.length; i += 1) {
      const effect = effects[i];
      if (effect.type !== 'baseStorageBonus') continue;
      const effectId = effect.effectId || '';
      if (effectId.indexOf('solisStorage-') === 0) {
        solisBonus += effect.value;
      } else {
        bonus += effect.value;
      }
    }
    let kesslerActive = false;
    try {
      kesslerActive = hazardManager.parameters.kessler && !hazardManager.kesslerHazard.isCleared();
    } catch (error) {
      kesslerActive = false;
    }
    if (kesslerActive && this.name !== 'metal' && this.name !== 'research') {
      solisBonus = Math.min(solisBonus, 1000);
    }
    bonus += solisBonus;
    cap += bonus;
    return cap;
  }

  // Method to update the storage cap based on active structures
  updateStorageCap() {
    let newCap = this.getEffectiveBaseStorageCap();

    for (const structureName in structures) {
      const structure = structures[structureName];
      if (!structure.storage || structure.active <= 0n) continue;

      const storageByCategory = structure.storage[this.category];
      if (!storageByCategory || storageByCategory[this.name] === undefined) continue;

      newCap += structure.getStorageContribution(this.category, this.name);
    }

    if (followersManager && this.hasCap) {
      newCap += followersManager.getOrbitalStorageCapBonusForResource(this.category, this.name);
    }
    this.cap = this.hasCap ? newCap : Infinity;
  }

  // Modify rate, now requires a rateType (e.g., 'building', 'terraforming', 'life', 'funding')
  modifyRate(value, source, rateType) {
    if (source === undefined) {
      source = 'Unknown'; // Assign a default source if undefined
    }
    if (rateType === undefined) {
        rateType = 'unknown'; // Assign a default type if undefined - THIS IS AN ERROR
    }

    if (value > 0) {
      this.productionRate += value;
      // Initialize type if not present
      if (!this.productionRateByType[rateType]) {
        this.productionRateByType[rateType] = {};
      }
      // Initialize source within type if not present
      if (!this.productionRateByType[rateType][source]) {
        this.productionRateByType[rateType][source] = 0;
      }
      this.productionRateByType[rateType][source] += value;
    } else if (value < 0) { // Only process negative values for consumption
      this.consumptionRate += -value;
      // Initialize type if not present
      if (!this.consumptionRateByType[rateType]) {
        this.consumptionRateByType[rateType] = {};
      }
      // Initialize source within type if not present
      if (!this.consumptionRateByType[rateType][source]) {
        this.consumptionRateByType[rateType][source] = 0;
      }
      // Store consumption as a positive value
      this.consumptionRateByType[rateType][source] -= value;
    }
    // Note: We will recalculate total production/consumption rates later if needed
  }

  // Recalculates total production and consumption rates by summing typed rates
  recalculateTotalRates() {
    this.productionRate = 0;
    this.consumptionRate = 0;
    this.productionRateBySource = {}; // Keep this for potential UI use, sum across types
    this.consumptionRateBySource = {}; // Keep this for potential UI use, sum across types

    for (const type in this.productionRateByType) {
      for (const source in this.productionRateByType[type]) {
        const rate = this.productionRateByType[type][source];
        this.productionRate += rate; // Exclude overflow from total production
        if (!this.productionRateBySource[source]) this.productionRateBySource[source] = 0;
        this.productionRateBySource[source] += rate;
      }
    }

    for (const type in this.consumptionRateByType) {
      for (const source in this.consumptionRateByType[type]) {
        const rate = this.consumptionRateByType[type][source];
        if (type !== 'overflow') {
          this.consumptionRate += rate; // Exclude overflow from total consumption
        }
        if (!this.consumptionRateBySource[source]) this.consumptionRateBySource[source] = 0;
        this.consumptionRateBySource[source] += rate;
      }
    }
  }

  // Resets all rate trackers
  resetRates({ keepProjected = false } = {}) {
    this.productionRate = 0;
    this.consumptionRate = 0;
    this.productionRateByType = {};
    this.consumptionRateByType = {};
    this.productionRateBySource = {}; // Also reset the aggregated source map
    this.consumptionRateBySource = {}; // Also reset the aggregated source map
    this.overflowRate = 0;
    this.automationLimited = false;

    if (!keepProjected) {
      this.projectedProductionRate = 0;
      this.projectedConsumptionRate = 0;
      this.projectedProductionRateByType = {};
      this.projectedConsumptionRateByType = {};
      this.projectedProductionRateBySource = {};
      this.projectedConsumptionRateBySource = {};
    }
  }

  saveProjectedRates() {
    this.projectedProductionRate = this.productionRate;
    this.projectedConsumptionRate = this.consumptionRate;

    this.projectedProductionRateByType = {};
    for (const rateType in this.productionRateByType) {
      this.projectedProductionRateByType[rateType] = { ...this.productionRateByType[rateType] };
    }

    this.projectedConsumptionRateByType = {};
    for (const rateType in this.consumptionRateByType) {
      this.projectedConsumptionRateByType[rateType] = { ...this.consumptionRateByType[rateType] };
    }

    this.projectedProductionRateBySource = {};
    for (const rateType in this.productionRateByType) {
      for (const source in this.productionRateByType[rateType]) {
        if (!this.projectedProductionRateBySource[source]) {
          this.projectedProductionRateBySource[source] = 0;
        }
        this.projectedProductionRateBySource[source] += this.productionRateByType[rateType][source];
      }
    }

    this.projectedConsumptionRateBySource = {};
    for (const rateType in this.consumptionRateByType) {
      for (const source in this.consumptionRateByType[rateType]) {
        if (!this.projectedConsumptionRateBySource[source]) {
          this.projectedConsumptionRateBySource[source] = 0;
        }
        this.projectedConsumptionRateBySource[source] += this.consumptionRateByType[rateType][source];
      }
    }
  }

  enable() {
    this.unlocked = true;
    unlockResource(this);
  }
}

function checkResourceAvailability(category, resource, requiredAmount) {
  return resources[category][resource].isAvailable(requiredAmount);
}

function checkDepositAvailability(depositType, requiredAmount) {
  return resources.underground[depositType].isAvailable(requiredAmount);
}

function backfillResourceConfigDefaults(targetConfig, defaultConfig) {
  if (!targetConfig || !defaultConfig) {
    return targetConfig;
  }

  for (const key in defaultConfig) {
    const defaultValue = defaultConfig[key];
    const targetValue = targetConfig[key];
    const defaultIsObject = defaultValue && defaultValue.constructor === Object;
    const targetIsObject = targetValue && targetValue.constructor === Object;

    if (targetValue === undefined) {
      if (Array.isArray(defaultValue)) {
        targetConfig[key] = defaultValue.slice();
      } else if (defaultIsObject) {
        targetConfig[key] = backfillResourceConfigDefaults({}, defaultValue);
      } else {
        targetConfig[key] = defaultValue;
      }
      continue;
    }

    if (defaultIsObject && targetIsObject) {
      backfillResourceConfigDefaults(targetValue, defaultValue);
    }
  }

  return targetConfig;
}

function createResources(resourcesData) {
  backfillResourceConfigDefaults(resourcesData, defaultPlanetParameters.resources);

  const landInitial = resourcesData?.surface?.land?.initialValue;
  if (Number.isFinite(landInitial) && resourcesData?.special) {
    const dustCap = landInitial * 10000;
    if (resourcesData.special.albedoUpgrades) {
      resourcesData.special.albedoUpgrades.baseCap = dustCap;
    }
    if (resourcesData.special.whiteDust) {
      resourcesData.special.whiteDust.baseCap = dustCap;
    }
  }

  const resources = {};
  for (const category in resourcesData) {
    resources[category] = {};
    for (const resourceName in resourcesData[category]) {
      const resourceData = resourcesData[category][resourceName];
      resourceData.displayName = resourceData.displayName || resourceData.name; // Assign resource name to the resourceData object
      resourceData.name = resourceName;
      resourceData.category = category;

      if (
        resourceData.maxDeposits !== undefined &&
        resourceData.baseCap === undefined
      ) {
        resourceData.baseCap = resourceData.maxDeposits;
      }

      resources[category][resourceName] = new Resource(resourceData);
    }
  }
  return resources;
}

function capturePreservedTravelResourceState(resourceSet) {
  const preservedState = {};

  for (const category in resourceSet) {
    for (const resourceName in resourceSet[category]) {
      const resource = resourceSet[category][resourceName];
      if (!resource || resource.preserveOnTravel !== true) {
        continue;
      }

      const fields = resource.preserveOnTravelFields || ['value', 'unlocked'];
      const savedState = {};

      for (let i = 0; i < fields.length; i += 1) {
        const fieldName = fields[i];
        if (Object.prototype.hasOwnProperty.call(resource, fieldName)) {
          savedState[fieldName] = resource[fieldName];
        }
      }

      if (!preservedState[category]) {
        preservedState[category] = {};
      }
      preservedState[category][resourceName] = savedState;
    }
  }

  return preservedState;
}

function restorePreservedTravelResourceState(resourceSet, preservedState) {
  if (!resourceSet || !preservedState) {
    return;
  }

  for (const category in preservedState) {
    const savedCategory = preservedState[category];
    const targetCategory = resourceSet[category];
    if (!targetCategory) {
      continue;
    }

    for (const resourceName in savedCategory) {
      const resource = targetCategory[resourceName];
      if (!resource) {
        continue;
      }

      const savedResourceState = savedCategory[resourceName];
      for (const fieldName in savedResourceState) {
        resource[fieldName] = savedResourceState[fieldName];
      }
    }
  }
}

function reconcileLandResourceValue() {
  reconcilePlanetaryMassResourceValue();
  const landResource = resources?.surface?.land;
  if (!landResource) {
    return;
  }
  const tf = typeof terraforming !== 'undefined' ? terraforming : null;
  const params = typeof currentPlanetParameters !== 'undefined' ? currentPlanetParameters : null;
  const activeProjectManager = typeof projectManager !== 'undefined' ? projectManager : null;
  const activeSpaceManager = typeof spaceManager !== 'undefined' ? spaceManager : null;
  const resolveWorldGeometricLandFn = resolveWorldGeometricLandHelper || resolveWorldGeometricLand;

  const geometricLand = Math.max(
    0,
    resolveWorldGeometricLandFn(tf, landResource, params?.celestialParameters) || 0
  );
  const baseLand = Math.max(
    0,
    resolveWorldBaseLand(tf, landResource) || geometricLand
  );
  landResource.baseLand = baseLand;

  let totalLand = geometricLand;

  const ringProject = activeProjectManager?.projects?.orbitalRing;
  const hasRing = !!(
    activeSpaceManager?.currentWorldHasOrbitalRing?.()
    || ringProject?.currentWorldHasRing
  );
  if (hasRing) {
    totalLand += geometricLand;
  }

  const undergroundProject = activeProjectManager?.projects?.undergroundExpansion;
  if (undergroundProject) {
    const perCompletion = Math.max(0, undergroundProject.getPerCompletionLand?.() || 0);
    const maxRepeats = undergroundProject.getMaxRepeats?.() ?? undergroundProject.maxRepeatCount ?? Infinity;
    const progress = Math.max(
      0,
      (undergroundProject.repeatCount || 0) + (undergroundProject.fractionalRepeatCount || 0)
    );
    const cappedProgress = Number.isFinite(maxRepeats) ? Math.min(progress, maxRepeats) : progress;
    totalLand += cappedProgress * perCompletion;
  }

  if (!(totalLand > 0)) {
    totalLand = Math.max(0, landResource.value || 0);
  }

  if (landResource.setExactLandValue) {
    landResource.setExactLandValue(totalLand);
  } else {
    landResource.value = totalLand;
  }

  if (params?.specialAttributes?.dynamicMass === true) {
    const dustCap = Math.max(0, totalLand * 10000);
    if (resources.special.albedoUpgrades) {
      resources.special.albedoUpgrades.baseCap = dustCap;
    }
    if (resources.special.whiteDust) {
      resources.special.whiteDust.baseCap = dustCap;
    }
  }
}

function reconcilePlanetaryMassResourceValue() {
  const massResource = resources?.underground?.planetaryMass;
  if (!massResource) {
    return;
  }

  const tf = typeof terraforming !== 'undefined' ? terraforming : null;
  const params = typeof currentPlanetParameters !== 'undefined' ? currentPlanetParameters : null;
  const dynamicMassEnabled = hasDynamicMassEnabledSafe(tf, params);
  const currentMassTons = dynamicMassEnabled
    ? getDynamicWorldPlanetaryMassAvailableTonsSafe(tf, params?.celestialParameters)
    : 0;

  massResource.value = Math.max(0, currentMassTons);
  massResource.reserved = 0;

  if (massResource.unlocked !== dynamicMassEnabled) {
    massResource.unlocked = dynamicMassEnabled;
    if (dynamicMassEnabled && typeof unlockResource === 'function') {
      unlockResource(massResource);
    }
  }
}

function applyAccumulatedPlanetaryMassChanges(deltaTime, accumulatedSpecialChanges) {
  const planetParameters = typeof currentPlanetParameters !== 'undefined' ? currentPlanetParameters : null;
  if (!hasDynamicMassEnabledSafe(terraforming, planetParameters)) {
    return;
  }

  const seconds = deltaTime / 1000;
  if (!(seconds > 0)) {
    return;
  }

  const massResource = resources?.underground?.planetaryMass;
  if (!massResource) {
    return;
  }

  for (const source in accumulatedSpecialChanges.planetaryMass) {
    const amount = accumulatedSpecialChanges.planetaryMass[source];
    if (!(amount > 0)) {
      continue;
    }

    const removedAmount = disposeDynamicWorldPlanetaryMassSafe(terraforming, amount);
    if (!(removedAmount > 0)) {
      continue;
    }

    massResource.modifyRate(
      -(removedAmount / seconds),
      source,
      source === 'Nanocolony' ? 'nanotech' : 'building'
    );
  }

  for (const source in accumulatedSpecialChanges.planetaryMassImports) {
    const importEntry = accumulatedSpecialChanges.planetaryMassImports[source];
    const materialImports = importEntry.materials || {};
    let totalAddedAmount = 0;
    for (const materialKey in materialImports) {
      const amount = materialImports[materialKey];
      if (!(amount > 0)) {
        continue;
      }
      totalAddedAmount += addDynamicWorldPlanetaryMaterialSafe(terraforming, materialKey, amount);
    }
    if (!(totalAddedAmount > 0)) {
      continue;
    }
    if (importEntry.reportRate !== false) {
      massResource.modifyRate(
        totalAddedAmount / seconds,
        source,
        importEntry.rateType || (source === 'Nanocolony' ? 'nanotech' : 'project')
      );
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.reconcileLandResourceValue = reconcileLandResourceValue;
}

const shouldTreatProjectAsBuilding = (project) =>
  project?.treatAsBuilding ||
  (project?.isContinuous() && project?.attributes?.continuousAsBuilding);

const shouldApplySpaceBuildingProductivity = (project) =>
  Boolean(
    project?.attributes?.spaceBuilding
    && project?.applyOperationCostAndGain
    && project?.attributes?.spaceBuildingProductivity
  );

const shouldApplyProjectProductivity = (project) =>
  shouldTreatProjectAsBuilding(project) ||
  shouldApplySpaceBuildingProductivity(project);

const isProjectAutoContinuousEnabled = (project) =>
  project?.autoContinuousOperation === true || project?.autoDeployCollectors === true;

function calculateProductionRates(deltaTime, buildings, options = {}) {
  const {
    useProductivity = false,
    keepProjected = false,
    productivityMap = {}
  } = options;
  //Here we calculate production and consumption rates at 100% productivity ignoring maintenance
  // Reset production and consumption rates for all resources
  // Reset rates using the new method
  const localProduction = {};
  const localConsumption = {};
  const trackDebugRate = (target, category, resource, source, amount) => {
    if (!target[category]) {
      target[category] = {};
    }
    if (!target[category][resource]) {
      target[category][resource] = {};
    }
    target[category][resource][source] = (target[category][resource][source] || 0) + amount;
  };

  for (const category in resources) {
    for (const resourceName in resources[category]) {
      resources[category][resourceName].resetRates({ keepProjected });
    }
  }

  for (const buildingName in buildings) {
    const building = buildings[buildingName];
    const automationMultiplier = building.getAutomationActivityMultiplier?.() ?? 1;
    const workerRatio = building.getTotalWorkerNeed() > 0
      ? populationModule.getWorkerAvailabilityRatio(building.workerPriority)
      : 1;
    const productivityValue = useProductivity
      ? (productivityMap[buildingName] ?? building.productivity)
      : 1;
    const productivityScale = useProductivity
      ? productivityValue / (workerRatio || 1)
      : 1;

    // Calculate scaled production rates
    for (const category in building.production) {
      for (const resource in building.production[category]) {
        const actualProduction = (building.production[category][resource] || 0) * building.activeNumber * building.getProductionRatio() * building.getEffectiveProductionMultiplier() * building.getEffectiveResourceProductionMultiplier(category, resource) * automationMultiplier * workerRatio * productivityScale;
        // Specify 'building' as the rateType
        resources[category][resource].modifyRate(actualProduction, building.displayName, 'building');
        if (actualProduction) {
          trackDebugRate(localProduction, category, resource, building.displayName, actualProduction);
        }
      }
    }

    // Calculate scaled consumption rates
    const consumption = building.getConsumption();
    for (const category in consumption) {
      for (const resource in consumption[category]) {
        const entry = building.getConsumptionResource ? building.getConsumptionResource(category, resource) : { amount: building.consumption[category][resource] };
        const amount = entry.amount || 0;
        const actualConsumption = amount * building.activeNumber * building.getConsumptionRatio() * building.getEffectiveConsumptionMultiplier() * building.getEffectiveResourceConsumptionMultiplier(category, resource) * automationMultiplier * workerRatio;
        // Specify 'building' as the rateType
        resources[category][resource].modifyRate(-actualConsumption, building.displayName, 'building');
        if (actualConsumption) {
          trackDebugRate(localConsumption, category, resource, building.displayName, actualConsumption);
        }
      }
    }

    // Include production from maintenance conversions but ignore maintenance costs
    const maintenanceCost = typeof building.calculateMaintenanceCost === 'function' ? building.calculateMaintenanceCost() : {};
    for (const resource in maintenanceCost) {
      const sourceData = resources.colony[resource];
      if (!sourceData || !sourceData.maintenanceConversion) continue;
      const base = maintenanceCost[resource] * building.activeNumber * automationMultiplier * (useProductivity ? productivityValue : 1);
      const conversionValue = sourceData.conversionValue || 1;
      for (const targetCategory in sourceData.maintenanceConversion) {
        const targetResource = sourceData.maintenanceConversion[targetCategory];
        const conversionRate = base * conversionValue;
        resources[targetCategory][targetResource].modifyRate(
          conversionRate,
          building.displayName,
          'building'
        );
        if (conversionRate) {
          trackDebugRate(localProduction, targetCategory, targetResource, `${building.displayName} maintenance`, conversionRate);
        }
      }
    }
  }

  if (projectManager) {
    for (const name in projectManager.projects) {
      const project = projectManager.projects[name];
      if (projectManager.isProjectRelevantToCurrentPlanet?.(project) === false) {
        continue;
      }
      if (shouldApplyProjectProductivity(project)) {
        project.estimateCostAndGain(deltaTime, true, 1);
      }
    }
  }

  // Add funding rate to the production of funding resource
  if (fundingModule) {
    const fundingIncreaseRate = fundingModule.getEffectiveFunding(); // Get funding rate from funding module
    // Specify 'funding' as the rateType
    resources.colony.funding.modifyRate(fundingIncreaseRate, 'Funding', 'funding'); // Update funding production rate
    if (fundingIncreaseRate) {
      trackDebugRate(localProduction, 'colony', 'funding', 'Funding', fundingIncreaseRate);
    }
  }

  if (!keepProjected) {
    for (const category in resources) {
      for (const resourceName in resources[category]) {
        resources[category][resourceName].saveProjectedRates();
      }
    }
  }

  debug_production = localProduction;
  debug_consumption = localConsumption;
}

function produceResources(deltaTime, buildings) {
  const isDay = dayNightCycle.isDay();
  let projectEntries = [];
  let projectProductivityMap = {};
  let spaceEnergyProducerOperations = [];
  let otherSpaceBuildingOperations = [];

  terraforming?.refreshDynamicWorldGeometry?.(currentPlanetParameters);
  reconcileLandResourceValue();
  if (typeof recalculateLandUsage === 'function') {
    recalculateLandUsage();
  }
  updateAntimatterStorageCap(resources);

  // Update storage cap for all resources except workers
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      if(resource.name != 'workers'){
        resource.updateStorageCap();
      }
    }
  }

  if (followersManager && followersManager.produceOrbitals) {
    followersManager.produceOrbitals(deltaTime);
  }

  for (const buildingName in buildings) {
    const building = buildings[buildingName];

    if (building && typeof building.update === 'function') {
      building.update(deltaTime);
    }
    if (building && building.prepareTickEffectCache) {
      building.prepareTickEffectCache();
    }
  }

  calculateProductionRates(deltaTime, buildings);
  updateResourceAvailabilityRatios(resources, deltaTime);

  const productivityIterations = 3;
  const productivityMap = {};
  for (let iteration = 0; iteration < productivityIterations; iteration++) {
    for (const buildingName in buildings) {
      const building = buildings[buildingName];
      let targetProductivity = building.getTargetProductivity(resources, deltaTime);
      if (!isDay && building.dayNightActivity) {
        targetProductivity = 0;
      }
      productivityMap[buildingName] = targetProductivity;
    }

    if (iteration < productivityIterations - 1) {
      calculateProductionRates(deltaTime, buildings, {
        useProductivity: true,
        keepProjected: true,
        productivityMap
      });
      updateResourceAvailabilityRatios(resources, deltaTime);
    }
  }

  for (const buildingName in buildings) {
    const building = buildings[buildingName];

    // Set productivity to 0 if it's nighttime and the building is inactive during the night
    if (!isDay && building.dayNightActivity) {
      building.productivity = 0;
      building.displayProductivity = 0;
    } else {
      // Otherwise, update productivity as usual
      building.updateProductivity(resources, deltaTime);
    }
  }

  if (projectManager) {
    const names = projectManager.projectOrder || Object.keys(projectManager.projects || {});
    const projectData = {};
    for (const name of names) {
      const project = projectManager.projects?.[name];
      if (!project || project.treatAsBuilding) continue;
      if (projectManager.isProjectRelevantToCurrentPlanet?.(project) === false) {
        continue;
      }
      const estimateResult = project.estimateProductivityCostAndGain
        ? project.estimateProductivityCostAndGain(deltaTime)
        : project.estimateCostAndGain(deltaTime, false);
      const { cost = {}, gain = {} } = estimateResult || {};
      projectData[name] = { project, cost, gain };
    }
    projectProductivityMap = calculateProjectProductivities(
      resources,
      deltaTime,
      projectData
    );
    projectEntries = Object.entries(projectData);
    for (const [name, data] of projectEntries) {
      const productivity = projectProductivityMap[name] ?? 1;
      data.project.continuousProductivity = data.project.isContinuous() ? productivity : 1;
      data.project.operationProductivity = data.project.getOperationProductivityForTick
        ? data.project.getOperationProductivityForTick(productivity, deltaTime)
        : productivity;
    }

    const spaceBuildingOperations = projectEntries.filter(([, data]) => {
      return data.project.attributes?.spaceBuilding
        && typeof data.project.applyOperationCostAndGain === 'function';
    });
    spaceEnergyProducerOperations = [];
    otherSpaceBuildingOperations = [];
    for (const entry of spaceBuildingOperations) {
      const [, data] = entry;
      if (data.project.attributes?.spaceEnergyProducer) {
        spaceEnergyProducerOperations.push(entry);
      } else {
        otherSpaceBuildingOperations.push(entry);
      }
    }
  }

  //Productivity has now been calculated and applied

  //Reset production and consumption rates for all resources because we want to display actuals
  // Reset rates again using the new method before accumulating actual changes
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      resource.resetRates({ keepProjected: true }); // Reset typed rates
      if(resource.name != 'workers'){
        resource.updateStorageCap();
      }
    }
  }

  // Temporary object to store changes
  const accumulatedChanges = {};
  const accumulatedMaintenance = {}; // Object to store accumulated maintenance costs
  const accumulatedSpecialChanges = initializeAccumulatedSpecialChanges();
    // Initialize accumulated changes and maintenance
  for (const category in resources) {
    accumulatedChanges[category] = {};
    for (const resourceName in resources[category]) {
      accumulatedChanges[category][resourceName] = 0;
      
      if (category === 'colony') {
        accumulatedMaintenance[resourceName] = 0; // Initialize accumulated maintenance costs for colony resources
      }
    }
  }
  accumulatedChanges.dysonSpaceEnergyInjected = false;

  for (const [, data] of spaceEnergyProducerOperations) {
    const { project } = data;
    const productivity = project.operationProductivity ?? 1;
    project.applyOperationCostAndGain(deltaTime, accumulatedChanges, productivity);
    project.operationPreRunThisTick = true;
  }

  if (followersManager && followersManager.applyOrbitalProductionRates) {
    followersManager.applyOrbitalProductionRates();
  }

  //Productivity is now calculated, let's actually produce and consume

  for(const buildingName in buildings){
    const building = buildings[buildingName];
    // Accumulate production and consumption changes
    building.produce(accumulatedChanges, deltaTime);
    building.consume(accumulatedChanges, deltaTime, accumulatedSpecialChanges);
  }

  for(const buildingName in buildings){
    const building = buildings[buildingName];
    // Apply maintenance after production/consumption so conversions respect availability
    building.applyMaintenance(accumulatedChanges, accumulatedMaintenance, deltaTime);
  }

  if (projectManager) {
    for (const [, data] of otherSpaceBuildingOperations) {
      const { project } = data;
      const productivity = project.operationProductivity ?? 1;
      project.applyOperationCostAndGain(deltaTime, accumulatedChanges, productivity);
      project.operationPreRunThisTick = true;
    }

    for (const [, data] of projectEntries) {
      const { project } = data;
      if (!project.isContinuous() || !project.attributes?.continuousAsBuilding) {
        continue;
      }
      const productivity = project.continuousProductivity;
      const shouldEstimateContinuous =
        project.autoStart !== false ||
        isProjectAutoContinuousEnabled(project);
      if (!shouldEstimateContinuous) {
        project.applyCostAndGain(deltaTime, accumulatedChanges, productivity, accumulatedSpecialChanges);
        continue;
      }
      project.estimateCostAndGain(deltaTime, true, productivity, accumulatedChanges);
      project.applyCostAndGain(deltaTime, accumulatedChanges, productivity, accumulatedSpecialChanges);
    }
    for (const [, data] of projectEntries) {
      const { project } = data;
      if (project.attributes?.continuousAsBuilding && project.isContinuous()) {
        continue;
      }
//      const productivity = project.isContinuous() ? project.continuousProductivity : 1;
      const shouldEstimate =
        project.autoStart !== false ||
        isProjectAutoContinuousEnabled(project);
      if (!shouldEstimate) {
        project.applyCostAndGain(deltaTime, accumulatedChanges, 1, accumulatedSpecialChanges);
        continue;
      }
      project.estimateCostAndGain(deltaTime, true, 1, accumulatedChanges);
      project.applyCostAndGain(deltaTime, accumulatedChanges, 1, accumulatedSpecialChanges);
    }
  }

  if (typeof nanotechManager !== 'undefined' && typeof nanotechManager.produceResources === 'function') {
    nanotechManager.produceResources(deltaTime, accumulatedChanges, accumulatedSpecialChanges);
  }

  updateArtificialEcosystems(deltaTime, accumulatedChanges);

  // Apply funding rate to the accumulated changes
  if (fundingModule) {
    const fundingIncreaseRate = fundingModule.getEffectiveFunding(); // Get funding rate from funding module
    // Accumulate funding change directly into accumulatedChanges, no need to call modifyRate here again
    if (accumulatedChanges.colony && accumulatedChanges.colony.funding !== undefined) {
        accumulatedChanges.colony.funding += fundingIncreaseRate * deltaTime / 1000;
    }
    fundingModule.update(deltaTime); // Update funding module state if needed
  }

  // Call terraforming.updateResources AFTER accumulating building/funding changes
  // but BEFORE applying accumulatedChanges to resource values.
  // terraforming.updateResources will call modifyRate with type 'terraforming'.
  if(terraforming) {
    terraforming.updateResources(deltaTime);
  }

  // Call lifeManager.updateLife AFTER buildings but potentially before or after terraforming,
  // depending on desired interaction. Assuming it runs after buildings and before applying changes.
  // It should call modifyRate with type 'life'.
  if(lifeManager){
    lifeManager.updateLife(deltaTime, accumulatedChanges, accumulatedSpecialChanges);
  }

  if(researchManager && typeof researchManager.update === 'function'){
    researchManager.update(deltaTime);
  }

  if (typeof updateShipReplication === 'function') {
    updateShipReplication(deltaTime, resources, globalEffects, accumulatedChanges);
  }

  if (typeof updateAndroidResearch === 'function') {
    updateAndroidResearch(deltaTime, resources, globalEffects, accumulatedChanges);
  }

  if (typeof updateOneillCylinders === 'function') {
    updateOneillCylinders(deltaTime, {
      space: spaceManager,
      galaxy: typeof galaxyManager !== 'undefined' ? galaxyManager : null
    });
  }

  if (produceAntimatter) {
    produceAntimatter(deltaTime, resources, accumulatedChanges);
  }

  const spaceStorageProject = projectManager?.projects?.spaceStorage;
  if (spaceStorageProject?.applyPostProjectShipOperation) {
    spaceStorageProject.applyPostProjectShipOperation(deltaTime, accumulatedChanges);
  }

  if (terraforming) {
    routeColonyWaterOverflow(deltaTime, accumulatedChanges);
    terraforming.distributeSurfaceChangesToZones(accumulatedChanges.surface);
  }

  const spaceStorageCapLimits = spaceStorageProject?.getResourceCapLimits?.() || null;
  const wasteCleanupSlack = collectWasteCleanupSlackByResource(buildings);

  // Apply accumulated changes to resources
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      const previousValue = resource.value; // Track the previous value before changes

      // Apply the accumulated changes
      const newValue = resource.value + accumulatedChanges[category][resourceName];
      let finalValue = newValue;
      let overflow = 0;

      // If the resource was at the cap, flatten back to cap but allow temporary excess
      if (resource.hasCap) {
        const limit = previousValue >= resource.cap ? previousValue : resource.cap;
        if (newValue > limit) overflow = newValue - limit;
        finalValue = Math.min(newValue, limit);
      }

      if (category === 'spaceStorage' && spaceStorageCapLimits) {
        const capLimit = Number(spaceStorageCapLimits[resourceName]);
        if (Number.isFinite(capLimit)) {
          finalValue = Math.min(finalValue, Math.max(0, capLimit));
        }
      }

      resource.value = Math.max(finalValue, 0); // Ensure non-negative

      const cleanupSlackForResource = wasteCleanupSlack[category]?.[resourceName] || 0;
      if (cleanupSlackForResource > 0 && resource.value > 0 && cleanupSlackForResource > resource.value) {
        resource.value = 0;
      }

    }
  }

  const planetParameters = typeof currentPlanetParameters !== 'undefined' ? currentPlanetParameters : null;
  applyAccumulatedPlanetaryMassChanges(deltaTime, accumulatedSpecialChanges);
  if (hasDynamicMassEnabledSafe(terraforming, planetParameters)) {
    terraforming?.refreshDynamicWorldGeometry?.(planetParameters);
    reconcileLandResourceValue();
  }

  for (const buildingName in buildings) {
    const building = buildings[buildingName];
    if (building && building.clearTickEffectCache) {
      building.clearTickEffectCache();
    }
  }

  recalculateTotalRates();
}

function calculateProjectProductivities(resources, deltaTime, projectData = {}) {
  const productivityMap = {};
  for (const name in projectData) {
    const { cost = {}, project } = projectData[name];
    if (!shouldApplyProjectProductivity(project)) {
      continue;
    }
    let productivity = 1;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const required = cost[category][resource] || 0;
        if (required > 0) {
          const ratio = getResourceAvailabilityRatio(resources[category][resource]);
          productivity = Math.min(productivity, ratio);
        }
      }
    }
    if (project?.getHazardousMachineryWorkerAvailabilityRatio) {
      productivity = Math.min(productivity, project.getHazardousMachineryWorkerAvailabilityRatio());
    }
    productivityMap[name] = Math.max(0, Math.min(1, productivity));
  }

  return productivityMap;
}

function recalculateTotalRates(){
  // After all changes are applied, recalculate total rates for UI display
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      resources[category][resourceName].recalculateTotalRates();
    }
  }
}

function calculateResourceAvailabilityRatio(resource, deltaTime) {
  return calculateResourceAvailabilityRatioWithReserve(resource, deltaTime, 0);
}

function calculateResourceAvailabilityRatioWithReserve(resource, deltaTime, extraReserve) {
  const seconds = deltaTime / 1000;
  const requiredAmount = resource.consumptionRate * seconds;
  if (requiredAmount <= 0) {
    return 0;
  }
  const producedAmount = Math.max(0, resource.productionRate * seconds);
  const storedAmount = Math.max(0, resource.value - (resource.reserved || 0) - (extraReserve || 0));
  const availableAmount = producedAmount + storedAmount;
  return Math.max(0, Math.min(availableAmount / requiredAmount, 1));
}

function updateResourceAvailabilityRatios(resources, deltaTime) {
  const spaceStorageProj = projectManager?.projects?.spaceStorage;
  const hasReserveMethod = spaceStorageProj && spaceStorageProj.getResourceStrategicReserveAmount;
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      if (category === 'spaceStorage' && hasReserveMethod) {
        const consumptionReserve = spaceStorageProj.getResourceStrategicReserveAmount(resourceName, 'consumption');
        resource.availabilityRatio = calculateResourceAvailabilityRatioWithReserve(resource, deltaTime, consumptionReserve);
      } else {
        resource.availabilityRatio = calculateResourceAvailabilityRatio(resource, deltaTime);
      }
    }
  }
}

function getResourceAvailabilityRatio(resource) {
  return resource.availabilityRatio;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Resource,
    checkResourceAvailability,
    createResources,
    produceResources,
    calculateResourceAvailabilityRatio,
    updateResourceAvailabilityRatios,
    getResourceAvailabilityRatio,
    calculateProjectProductivities,
    recalculateTotalRates,
    reconcileLandResourceValue,
  };
}

try {
  window.calculateResourceAvailabilityRatio = calculateResourceAvailabilityRatio;
  window.updateResourceAvailabilityRatios = updateResourceAvailabilityRatios;
  window.getResourceAvailabilityRatio = getResourceAvailabilityRatio;
} catch (error) {
  // window is not available
}

