const LIFE_AUTOMATION_ATTRIBUTES = [
  'minTemperatureTolerance',
  'maxTemperatureTolerance',
  'optimalGrowthTemperature',
  'growthTemperatureTolerance',
  'photosynthesisEfficiency',
  'radiationTolerance',
  'invasiveness',
  'spaceEfficiency',
  'geologicalBurial',
  'bioworkforce',
  'bioships'
];
const LIFE_AUTOMATION_ZONE_KEYS = ['tropical', 'temperate', 'polar'];
const LIFE_AUTOMATION_RADIATION_MITIGATION_PER_POINT_MSV_PER_DAY = 0.01;
class LifeAutomation {
  constructor() {
    this.presets = [];
    this.activePresetId = null;
    this.enabled = false;
    this.collapsed = false;
    this.nextPresetId = 1;
    this.elapsed = 0;
    this.maxSteps = 20;
    this.ensureDefaultPreset();
  }

  createDefaultPurchaseSettings() {
    const settings = {};
    for (let index = 0; index < lifeShopCategories.length; index += 1) {
      const category = lifeShopCategories[index];
      settings[category.name] = {
        enabled: false,
        threshold: 50,
        maxCost: null
      };
    }
    return settings;
  }

  createTemperatureZoneSettings() {
    const settings = {};
    LIFE_AUTOMATION_ZONE_KEYS.forEach((zone) => {
      settings[zone] = true;
    });
    return settings;
  }

  createDesignEntry(attributeName = LIFE_AUTOMATION_ATTRIBUTES[0], cap = 1, capMode = 'fixed') {
    const attribute = LIFE_AUTOMATION_ATTRIBUTES.includes(attributeName)
      ? attributeName
      : LIFE_AUTOMATION_ATTRIBUTES[0];
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      attribute,
      weight: 1,
      cap,
      capMode: this.normalizeEntryCapMode(attribute, capMode),
      zones: this.createTemperatureZoneSettings()
    };
  }

  normalizeEntryCapMode(attributeName, capMode) {
    if (attributeName === 'optimalGrowthTemperature') {
      return 'fixed';
    }
    if (capMode === 'max') {
      return 'max';
    }
    if (capMode === 'needed' && this.isAsNeededAttribute(attributeName)) {
      return 'needed';
    }
    return 'fixed';
  }

  createDesignStep() {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      limit: 1,
      mode: 'fixed',
      entries: [this.createDesignEntry()]
    };
  }

  createLegacyDesignEntry(step) {
    const attribute = LIFE_AUTOMATION_ATTRIBUTES.includes(step.attribute)
      ? step.attribute
      : LIFE_AUTOMATION_ATTRIBUTES[0];
    const legacyMode = step.mode || 'fixed';
    let capMode = 'fixed';
    let cap = step.amount;
    if (legacyMode === 'max') {
      capMode = 'max';
      cap = null;
    } else if (legacyMode === 'needed' && this.isAsNeededAttribute(attribute)) {
      capMode = 'needed';
      cap = null;
    } else if (legacyMode === 'remaining') {
      cap = null;
    }
    return this.normalizeDesignEntry({
      id: step.id,
      attribute,
      weight: 1,
      cap,
      capMode,
      zones: step.zones
    });
  }

  normalizeDesignEntry(entry) {
    const attribute = LIFE_AUTOMATION_ATTRIBUTES.includes(entry.attribute)
      ? entry.attribute
      : LIFE_AUTOMATION_ATTRIBUTES[0];
    const maxUpgrades = lifeDesigner.currentDesign[attribute].maxUpgrades;
    const quantumBiology = lifeManager.isBooleanFlagSet('quantumBiology');
    const capMode = this.normalizeEntryCapMode(attribute, entry.capMode || 'fixed');
    const parsedCap = entry.cap === null || entry.cap === undefined || entry.cap === ''
      ? null
      : Math.floor(Number(entry.cap) || 0);
    let cap = null;
    if (parsedCap !== null) {
      cap = quantumBiology
        ? (attribute === 'optimalGrowthTemperature' ? parsedCap : Math.max(0, parsedCap))
        : attribute === 'optimalGrowthTemperature'
        ? Math.max(-maxUpgrades, Math.min(maxUpgrades, parsedCap))
        : Math.max(0, Math.min(maxUpgrades, parsedCap));
    }
    const weight = Number(entry.weight);
    return {
      id: entry.id || Date.now() + Math.floor(Math.random() * 1000),
      attribute,
      weight: Number.isFinite(weight) && weight > 0 ? weight : 0,
      cap,
      capMode,
      zones: this.normalizeTemperatureZoneSettings(entry.zones)
    };
  }

  normalizeDesignStep(step) {
    const hasEntries = Array.isArray(step.entries);
    const rawEntries = hasEntries ? step.entries : [this.createLegacyDesignEntry(step)];
    let mode = step.mode === 'cappedMax' ? 'cappedMax' : 'fixed';
    if (!hasEntries && (step.mode === 'remaining' || step.mode === 'max' || step.mode === 'needed')) {
      mode = 'cappedMax';
    }
    const limitValue = step.limit === null || step.limit === undefined || step.limit === ''
      ? null
      : Math.floor(Number(step.limit) || 0);
    const legacyLimit = !hasEntries && mode === 'fixed'
      ? Math.abs(Math.floor(Number(step.amount) || 0))
      : 0;
    return {
      id: step.id || Date.now() + Math.floor(Math.random() * 1000),
      limit: mode === 'cappedMax' ? null : Math.max(0, limitValue === null ? legacyLimit : limitValue),
      mode,
      entries: rawEntries.map(entry => this.normalizeDesignEntry(entry))
    };
  }

  normalizeTemperatureZoneSettings(zones) {
    const normalized = this.createTemperatureZoneSettings();
    const zoneSettings = zones || {};
    LIFE_AUTOMATION_ZONE_KEYS.forEach((zoneName) => {
      if (Object.prototype.hasOwnProperty.call(zoneSettings, zoneName)) {
        normalized[zoneName] = !!zoneSettings[zoneName];
      }
    });
    return normalized;
  }

  isTemperatureToleranceAttribute(attributeName) {
    return attributeName === 'minTemperatureTolerance' || attributeName === 'maxTemperatureTolerance';
  }

  isRadiationToleranceAttribute(attributeName) {
    return attributeName === 'radiationTolerance';
  }

  isAsNeededAttribute(attributeName) {
    return this.isTemperatureToleranceAttribute(attributeName) || this.isRadiationToleranceAttribute(attributeName);
  }

  getTemperatureZoneNames(step) {
    const zones = this.normalizeTemperatureZoneSettings(step.zones);
    step.zones = zones;
    return getZones().filter(zoneName => zones[zoneName]);
  }

  getTemperatureToleranceTarget(attributeName, zoneNames) {
    if (zoneNames.length === 0) {
      return 0;
    }
    const requirements = getActiveLifeDesignRequirements();
    const baseRange = requirements.survivalTemperatureRangeK ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.survivalTemperatureRangeK;
    const firstZone = terraforming.temperature.zones[zoneNames[0]];
    let coldest = firstZone.day;
    let hottest = firstZone.day;
    for (let index = 0; index < zoneNames.length; index += 1) {
      const zoneName = zoneNames[index];
      const zone = terraforming.temperature.zones[zoneName];
      const day = zone.day;
      const night = zone.night;
      if (day < coldest) coldest = day;
      if (night < coldest) coldest = night;
      if (day > hottest) hottest = day;
      if (night > hottest) hottest = night;
    }
    const buffer = 1;
    if (attributeName === 'minTemperatureTolerance') {
      return Math.max(0, baseRange.min - coldest + buffer - 0.5);
    }
    return Math.max(0, hottest - baseRange.max + buffer - 0.5);
  }

  getRadiationToleranceTarget() {
    if (terraforming.getMagnetosphereStatus()) {
      return 0;
    }
    const currentDose = Number.isFinite(terraforming.surfaceRadiation) ? terraforming.surfaceRadiation : 0;
    if (currentDose <= 0) {
      return 0;
    }
    return Math.ceil(Math.sqrt(currentDose / LIFE_AUTOMATION_RADIATION_MITIGATION_PER_POINT_MSV_PER_DAY));
  }

  ensureDefaultPreset() {
    if (this.presets.length > 0) {
      return;
    }
    const preset = {
      id: this.nextPresetId++,
      name: 'Default',
      showInSidebar: true,
      purchaseSettings: this.createDefaultPurchaseSettings(),
      purchaseEnabled: true,
      designSteps: [],
      deployImprovement: 1,
      designEnabled: true
    };
    this.presets.push(preset);
    this.activePresetId = preset.id;
  }

  getActivePreset() {
    return this.presets.find(preset => preset.id === this.activePresetId) || this.presets[0];
  }

  getSelectedPresetId() {
    return this.activePresetId;
  }

  getSelectedPreset() {
    return this.getActivePreset();
  }

  getPresetById(id) {
    return this.presets.find(preset => preset.id === Number(id)) || null;
  }

  setSelectedPresetId(id) {
    this.setActivePreset(id);
  }

  applyPresetOnce(presetId) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return false;
    }
    this.setActivePreset(preset.id);
    this.applyAutoPurchases(preset);
    this.applyAutoDesign(preset);
    return true;
  }

  setActivePreset(id) {
    const preset = this.presets.find(item => item.id === id) || this.presets[0];
    this.activePresetId = preset.id;
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
  }

  addPreset(name = '') {
    const preset = {
      id: this.nextPresetId++,
      name: name || `Preset ${this.nextPresetId - 1}`,
      showInSidebar: true,
      purchaseSettings: this.createDefaultPurchaseSettings(),
      purchaseEnabled: true,
      designSteps: [],
      deployImprovement: 1,
      designEnabled: true
    };
    this.presets.push(preset);
    this.activePresetId = preset.id;
    return preset.id;
  }

  movePreset(id, direction) {
    const index = this.presets.findIndex(item => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.presets.length) {
      return false;
    }
    const [preset] = this.presets.splice(index, 1);
    this.presets.splice(nextIndex, 0, preset);
    return true;
  }

  deletePreset(id) {
    const index = this.presets.findIndex(item => item.id === id);
    if (index < 0) {
      return;
    }
    this.presets.splice(index, 1);
    if (this.activePresetId === id) {
      const next = this.presets[0];
      this.activePresetId = next ? next.id : null;
    }
    this.ensureDefaultPreset();
  }

  renamePreset(id, name) {
    const preset = this.presets.find(item => item.id === id) || this.presets[0];
    preset.name = name;
  }

  setPresetShowInSidebar(id, showInSidebar) {
    const preset = this.presets.find(item => item.id === id) || this.presets[0];
    preset.showInSidebar = showInSidebar !== false;
  }

  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
  }

  setPurchaseEnabled(presetId, category, enabled) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const settings = preset.purchaseSettings[category];
    settings.enabled = !!enabled;
  }

  setPurchaseThreshold(presetId, category, value) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const settings = preset.purchaseSettings[category];
    settings.threshold = this.normalizePurchaseThreshold(value);
  }

  setPurchaseMaxCost(presetId, category, value) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const settings = preset.purchaseSettings[category];
    const parsed = Number(value) || 0;
    settings.maxCost = parsed > 0 ? parsed : null;
  }

  setPurchaseAutomationEnabled(presetId, enabled) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    preset.purchaseEnabled = !!enabled;
  }

  addDesignStep(presetId) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    if (preset.designSteps.length >= this.maxSteps) {
      return null;
    }
    const step = this.createDesignStep();
    preset.designSteps.push(step);
    this.refreshActiveDeployment(preset);
    return step.id;
  }

  insertDesignStep(presetId, stepId, direction) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    if (preset.designSteps.length >= this.maxSteps) {
      return null;
    }
    const steps = preset.designSteps;
    const index = steps.findIndex(step => step.id === stepId);
    if (index < 0) {
      return null;
    }
    const insertIndex = direction < 0 ? index : index + 1;
    const step = this.createDesignStep();
    steps.splice(insertIndex, 0, step);
    this.refreshActiveDeployment(preset);
    return step.id;
  }

  removeDesignStep(presetId, stepId) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    preset.designSteps = preset.designSteps.filter(step => step.id !== stepId);
    this.refreshActiveDeployment(preset);
  }

  moveDesignStep(presetId, stepId, direction) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const steps = preset.designSteps;
    const index = steps.findIndex(step => step.id === stepId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) {
      return;
    }
    const [step] = steps.splice(index, 1);
    steps.splice(nextIndex, 0, step);
    this.refreshActiveDeployment(preset);
  }

  updateDesignStep(presetId, stepId, updates = {}) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const step = preset.designSteps.find(item => item.id === stepId) || preset.designSteps[0];
    if (!step) return;
    if (Object.prototype.hasOwnProperty.call(updates, 'mode')) {
      step.mode = updates.mode === 'cappedMax' ? 'cappedMax' : 'fixed';
      if (step.mode === 'cappedMax') {
        step.limit = null;
      }
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'limit')) {
      const parsed = Math.floor(Number(updates.limit) || 0);
      step.limit = Math.max(0, parsed);
      if (step.mode !== 'cappedMax') {
        step.mode = 'fixed';
      }
    }
    this.refreshActiveDeployment(preset);
  }

  addDesignEntry(presetId, stepId, attributeName) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const step = preset.designSteps.find(item => item.id === stepId) || preset.designSteps[0];
    if (!step) return null;
    const attribute = attributeName || LIFE_AUTOMATION_ATTRIBUTES[0];
    const entry = this.createDesignEntry(attribute);
    step.entries.push(entry);
    this.refreshActiveDeployment(preset);
    return entry.id;
  }

  removeDesignEntry(presetId, stepId, entryId) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const step = preset.designSteps.find(item => item.id === stepId) || preset.designSteps[0];
    if (!step) return;
    step.entries = step.entries.filter(entry => entry.id !== entryId);
    this.refreshActiveDeployment(preset);
  }

  updateDesignEntry(presetId, stepId, entryId, updates = {}) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const step = preset.designSteps.find(item => item.id === stepId) || preset.designSteps[0];
    if (!step) return;
    const entry = step.entries.find(item => item.id === entryId) || step.entries[0];
    if (!entry) return;
    if (Object.prototype.hasOwnProperty.call(updates, 'attribute')) {
      entry.attribute = LIFE_AUTOMATION_ATTRIBUTES.includes(updates.attribute)
        ? updates.attribute
        : LIFE_AUTOMATION_ATTRIBUTES[0];
      entry.capMode = this.normalizeEntryCapMode(entry.attribute, entry.capMode);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'weight')) {
      const weight = Number(updates.weight);
      entry.weight = Number.isFinite(weight) && weight > 0 ? weight : 0;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'cap')) {
      if (updates.cap === null || updates.cap === undefined || updates.cap === '') {
        entry.cap = null;
      } else {
        const maxUpgrades = lifeDesigner.currentDesign[entry.attribute].maxUpgrades;
        const quantumBiology = lifeManager.isBooleanFlagSet('quantumBiology');
        const parsed = Math.floor(Number(updates.cap) || 0);
        entry.cap = quantumBiology
          ? (entry.attribute === 'optimalGrowthTemperature' ? parsed : Math.max(0, parsed))
          : entry.attribute === 'optimalGrowthTemperature'
          ? Math.max(-maxUpgrades, Math.min(maxUpgrades, parsed))
          : Math.max(0, Math.min(maxUpgrades, parsed));
      }
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'capMode')) {
      entry.capMode = this.normalizeEntryCapMode(entry.attribute, updates.capMode);
    }
    this.refreshActiveDeployment(preset);
  }

  setDesignStepZone(presetId, stepId, entryId, zoneName, enabled) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const step = preset.designSteps.find(item => item.id === stepId) || preset.designSteps[0];
    if (!step) return;
    const entry = step.entries.find(item => item.id === entryId) || step.entries[0];
    if (!entry) return;
    const zones = this.normalizeTemperatureZoneSettings(entry.zones);
    zones[zoneName] = !!enabled;
    entry.zones = zones;
    this.refreshActiveDeployment(preset);
  }

  setDeployImprovement(presetId, value) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    preset.deployImprovement = Math.max(0, Math.floor(Number(value) || 0));
    this.refreshActiveDeployment(preset);
  }

  setDesignAutomationEnabled(presetId, enabled) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    preset.designEnabled = !!enabled;
    this.refreshActiveDeployment(preset);
  }

  refreshActiveDeployment(preset) {
    if (!lifeDesigner.isActive) {
      return;
    }
    if (!this.isActive() || preset.id !== this.activePresetId) {
      return;
    }
    lifeDesigner.cancelDeployment();
    this.applyAutoDesign(preset);
  }

  populateDesignStepsFromCurrentDesign(presetId) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    if (preset.designSteps.length > 0) {
      return;
    }
    const currentDesign = lifeDesigner.currentDesign;
    if (currentDesign.getDesignCost() <= 0) {
      return;
    }
    const steps = [];
    const orderedAttributes = LIFE_AUTOMATION_ATTRIBUTES.filter(
      attribute => attribute !== 'photosynthesisEfficiency'
    );
    orderedAttributes.push('photosynthesisEfficiency');

    for (let index = 0; index < orderedAttributes.length; index += 1) {
      const attributeName = orderedAttributes[index];
      const attribute = currentDesign[attributeName];
      const value = attribute.value;
      const maxUpgrades = attribute.maxUpgrades;
      const isMetabolism = attributeName === 'photosynthesisEfficiency';
      const isOptimal = attributeName === 'optimalGrowthTemperature';
      const hasValue = isOptimal ? value !== 0 : value > 0;
      if (!hasValue && !isMetabolism) {
        continue;
      }
      if (isMetabolism && !hasValue && steps.length === 0) {
        continue;
      }
      const amount = lifeManager.isBooleanFlagSet('quantumBiology')
        ? (isOptimal ? value : Math.max(0, value))
        : isOptimal
        ? Math.max(-maxUpgrades, Math.min(maxUpgrades, value))
        : Math.max(0, Math.min(maxUpgrades, value));
      steps.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + index,
        limit: isMetabolism ? null : Math.abs(amount),
        mode: isMetabolism ? 'cappedMax' : 'fixed',
        entries: [{
          id: Date.now() + Math.floor(Math.random() * 1000) + index + 10000,
          attribute: attributeName,
          weight: 1,
          cap: isMetabolism ? null : amount,
          capMode: 'fixed',
          zones: this.normalizeTemperatureZoneSettings()
        }]
      });
    }
    preset.designSteps = steps.map(step => this.normalizeDesignStep(step));
    this.refreshActiveDeployment(preset);
  }

  isActive() {
    const preset = this.getActivePreset();
    return automationManager.enabled
      && automationManager.hasFeature('automationLifeDesign')
      && this.enabled
      && lifeDesigner.enabled;
  }

  update(delta) {
    if (!this.isActive()) {
      return;
    }
    this.elapsed += delta;
    if (this.elapsed < 500) {
      return;
    }
    this.elapsed = 0;
    const preset = this.getActivePreset();
    const purchased = this.applyAutoPurchases(preset);
    const deployed = this.applyAutoDesign(preset);
    if (purchased || deployed) {
      queueAutomationUIRefresh();
    }
  }

  applyAutoPurchases(preset) {
    let changed = false;
    if (!preset.purchaseEnabled) {
      return changed;
    }
    for (let index = 0; index < lifeShopCategories.length; index += 1) {
      const category = lifeShopCategories[index];
      const settings = preset.purchaseSettings[category.name];
      if (!settings.enabled) {
        continue;
      }
      const cost = lifeDesigner.getTotalPointCost(category.name, 1);
      const threshold = this.normalizePurchaseThreshold(settings.threshold);
      const maxCost = Number(settings.maxCost) || 0;
      if (threshold <= 0) {
        continue;
      }
      const required = cost * (100 / threshold);
      if (maxCost > 0 && cost > maxCost) {
        continue;
      }
      if (!lifeDesigner.canAfford(category.name, 1)) {
        continue;
      }
      if (resources.colony[category.name].value < required) {
        continue;
      }
      lifeDesigner.buyPoint(category.name, 1);
      changed = true;
    }
    return changed;
  }

  getEntryCapTarget(entry, candidate) {
    const attributeName = entry.attribute;
    const attribute = candidate[attributeName];
    const maxUpgrades = attribute.maxUpgrades;
    const capMode = this.normalizeEntryCapMode(attributeName, entry.capMode);
    if (capMode === 'max') {
      return maxUpgrades;
    }
    if (capMode === 'needed' && this.isTemperatureToleranceAttribute(attributeName)) {
      const zoneNames = this.getTemperatureZoneNames(entry);
      return Math.min(maxUpgrades, Math.ceil(this.getTemperatureToleranceTarget(attributeName, zoneNames)));
    }
    if (capMode === 'needed' && this.isRadiationToleranceAttribute(attributeName)) {
      return Math.min(maxUpgrades, this.getRadiationToleranceTarget());
    }
    if (entry.cap === null || entry.cap === undefined) {
      return lifeManager.isBooleanFlagSet('quantumBiology') ? Infinity : maxUpgrades;
    }
    if (lifeManager.isBooleanFlagSet('quantumBiology')) {
      if (attributeName === 'optimalGrowthTemperature') {
        return Math.abs(Math.floor(Number(entry.cap) || 0));
      }
      return Math.max(0, Math.floor(Number(entry.cap) || 0));
    }
    if (attributeName === 'optimalGrowthTemperature') {
      return Math.min(maxUpgrades, Math.abs(Math.floor(Number(entry.cap) || 0)));
    }
    return Math.min(maxUpgrades, Math.max(0, Math.floor(Number(entry.cap) || 0)));
  }

  getEntryRemainingCapacity(entry, candidate) {
    const attributeName = entry.attribute;
    const attribute = candidate[attributeName];
    const target = this.getEntryCapTarget(entry, candidate);
    if (attributeName === 'optimalGrowthTemperature') {
      const direction = entry.cap < 0 ? -1 : 1;
      if (attribute.value !== 0 && Math.sign(attribute.value) !== direction) {
        return 0;
      }
      return Math.max(0, target - Math.abs(attribute.value));
    }
    return Math.max(0, target - attribute.value);
  }

  applyEntryPoints(candidate, entry, amount) {
    const applied = Math.max(0, Math.floor(amount));
    if (applied <= 0) {
      return 0;
    }
    const attributeName = entry.attribute;
    const attribute = candidate[attributeName];
    const capacity = this.getEntryRemainingCapacity(entry, candidate);
    const spend = Math.min(applied, capacity);
    if (spend <= 0) {
      return 0;
    }
    if (attributeName === 'optimalGrowthTemperature') {
      const direction = entry.cap < 0 ? -1 : 1;
      const targetAbs = Math.abs(attribute.value) + spend;
      attribute.value = targetAbs * direction;
      return spend;
    }
    attribute.value += spend;
    return spend;
  }

  allocateDesignStep(step, candidate, remaining, spends) {
    const entries = Array.isArray(step.entries) ? step.entries : [];
    if (entries.length === 0 || remaining <= 0) {
      return remaining;
    }
    const mode = step.mode === 'cappedMax' ? 'cappedMax' : 'fixed';
    let stepLimit = remaining;
    if (mode === 'fixed') {
      const limit = Math.max(0, Math.floor(Number(step.limit) || 0));
      stepLimit = Math.min(remaining, limit);
    } else {
      let totalWeight = 0;
      let highestFactor = 0;
      let hasInfinite = false;
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (entry.weight <= 0) continue;
        totalWeight += entry.weight;
        const capacity = this.getEntryRemainingCapacity(entry, candidate);
        const capIsUnbounded = entry.capMode === 'fixed' && (entry.cap === null || entry.cap === undefined);
        if (capIsUnbounded) {
          hasInfinite = true;
        }
        const factor = capacity / entry.weight;
        if (factor > highestFactor) {
          highestFactor = factor;
        }
      }
      if (totalWeight <= 0) {
        return remaining;
      }
      if (!hasInfinite) {
        stepLimit = Math.min(remaining, Math.floor(highestFactor * totalWeight));
      }
    }

    let stepRemaining = stepLimit;
    let rounds = 0;
    while (stepRemaining > 0 && rounds < 20) {
      rounds += 1;
      const activeEntries = [];
      let activeWeight = 0;
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        const capacity = this.getEntryRemainingCapacity(entry, candidate);
        if (entry.weight > 0 && capacity > 0) {
          activeEntries.push({ entry, capacity });
          activeWeight += entry.weight;
        }
      }
      if (activeEntries.length === 0 || activeWeight <= 0) {
        break;
      }
      let spentThisRound = 0;
      const fractions = [];
      for (let index = 0; index < activeEntries.length; index += 1) {
        const activeEntry = activeEntries[index];
        const exactShare = stepRemaining * (activeEntry.entry.weight / activeWeight);
        const baseShare = Math.floor(exactShare);
        const spend = this.applyEntryPoints(candidate, activeEntry.entry, Math.min(baseShare, activeEntry.capacity));
        if (spend > 0) {
          spends[activeEntry.entry.id] = (spends[activeEntry.entry.id] || 0) + spend;
          spentThisRound += spend;
        }
        fractions.push({
          entry: activeEntry.entry,
          fractional: exactShare - baseShare
        });
      }
      let remainder = stepRemaining - spentThisRound;
      if (remainder > 0) {
        fractions.sort((a, b) => b.fractional - a.fractional);
        for (let index = 0; index < fractions.length && remainder > 0; index += 1) {
          const entry = fractions[index].entry;
          const spend = this.applyEntryPoints(candidate, entry, 1);
          if (spend > 0) {
            spends[entry.id] = (spends[entry.id] || 0) + spend;
            spentThisRound += spend;
            remainder -= spend;
          }
        }
      }
      if (spentThisRound <= 0) {
        break;
      }
      stepRemaining -= spentThisRound;
      remaining -= spentThisRound;
    }
    return remaining;
  }

  buildCandidateDesign(preset) {
    const maxPoints = Math.floor(lifeDesigner.maxLifeDesignPoints());
    let remaining = Math.max(0, maxPoints);
    if (remaining <= 0) {
      return null;
    }
    const candidate = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    const spends = {};
    for (let index = 0; index < preset.designSteps.length; index += 1) {
      if (remaining <= 0) {
        break;
      }
      const step = preset.designSteps[index];
      remaining = this.allocateDesignStep(step, candidate, remaining, spends);
    }

    return candidate;
  }

  getDesignStepSpends(preset) {
    const maxPoints = Math.floor(lifeDesigner.maxLifeDesignPoints());
    let remaining = Math.max(0, maxPoints);
    const spends = {};
    if (remaining <= 0) {
      return spends;
    }
    const candidate = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    for (let index = 0; index < preset.designSteps.length; index += 1) {
      if (remaining <= 0) {
        break;
      }
      const step = preset.designSteps[index];
      const before = remaining;
      remaining = this.allocateDesignStep(step, candidate, remaining, spends);
      spends[step.id] = Math.max(0, before - remaining);
    }

    return spends;
  }

  getAttributePointCost(attributeName, value) {
    if (attributeName === 'optimalGrowthTemperature') {
      return Math.abs(value);
    }
    return value;
  }

  getAsNeededReassignedPoints(candidate, currentDesign) {
    let freedFromAsNeeded = 0;
    let gainedOutsideAsNeeded = 0;
    for (let index = 0; index < LIFE_AUTOMATION_ATTRIBUTES.length; index += 1) {
      const attributeName = LIFE_AUTOMATION_ATTRIBUTES[index];
      const candidateCost = this.getAttributePointCost(attributeName, candidate[attributeName].value);
      const currentCost = this.getAttributePointCost(attributeName, currentDesign[attributeName].value);
      const delta = candidateCost - currentCost;
      if (this.isAsNeededAttribute(attributeName)) {
        if (delta < 0) {
          freedFromAsNeeded += -delta;
        }
      } else if (delta > 0) {
        gainedOutsideAsNeeded += delta;
      }
    }
    return Math.min(freedFromAsNeeded, gainedOutsideAsNeeded);
  }

  applyAutoDesign(preset) {
    if (!preset.designEnabled) {
      return false;
    }
    if (lifeDesigner.isActive) {
      return false;
    }
    if (preset.designSteps.length === 0) {
      return false;
    }
    const candidate = this.buildCandidateDesign(preset);
    if (!candidate) {
      return false;
    }
    const currentDesign = lifeDesigner.currentDesign;
    let needsToleranceIncrease = false;
    for (let index = 0; index < preset.designSteps.length; index += 1) {
      const step = preset.designSteps[index];
      const entries = Array.isArray(step.entries) ? step.entries : [];
      for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
        const entry = entries[entryIndex];
        if (entry.capMode !== 'needed' || !this.isAsNeededAttribute(entry.attribute)) {
          continue;
        }
        if (candidate[entry.attribute].value > currentDesign[entry.attribute].value) {
          needsToleranceIncrease = true;
          break;
        }
      }
      if (needsToleranceIncrease) {
        break;
      }
    }
    const improvement = candidate.getDesignCost() - currentDesign.getDesignCost();
    const improvementMagnitude = Math.abs(improvement);
    const reassignedAsNeededPoints = this.getAsNeededReassignedPoints(candidate, currentDesign);
    const effectiveImprovement = Math.max(improvementMagnitude, reassignedAsNeededPoints);
    if (!needsToleranceIncrease && effectiveImprovement < preset.deployImprovement) {
      return false;
    }
    if (!candidate.canSurviveAnywhere()) {
      return false;
    }
    lifeDesigner.replaceDesign(candidate);
    document.dispatchEvent(new Event('lifeTentativeDesignCreated'));
    lifeDesigner.confirmDesign();
    document.dispatchEvent(new Event('lifeTentativeDesignDiscarded'));
    return true;
  }

  forceDeployDesign(presetId) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    if (!lifeDesigner.enabled) {
      return;
    }
    if (preset.designSteps.length === 0) {
      return;
    }
    const candidate = this.buildCandidateDesign(preset);
    if (!candidate) {
      return;
    }
    if (!candidate.canSurviveAnywhere()) {
      return;
    }
    if (lifeDesigner.isActive) {
      lifeDesigner.cancelDeployment();
    }
    lifeDesigner.replaceDesign(candidate);
    document.dispatchEvent(new Event('lifeTentativeDesignCreated'));
    lifeDesigner.confirmDesign();
    document.dispatchEvent(new Event('lifeTentativeDesignDiscarded'));
  }

  saveState() {
    return {
      presets: this.presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        showInSidebar: preset.showInSidebar !== false,
        purchaseSettings: Object.fromEntries(
          Object.entries(preset.purchaseSettings).map(([key, value]) => [key, { ...value }])
        ),
        purchaseEnabled: !!preset.purchaseEnabled,
        designSteps: preset.designSteps.map(step => ({
          id: step.id,
          mode: step.mode,
          limit: step.limit,
          entries: step.entries.map(entry => ({
            id: entry.id,
            attribute: entry.attribute,
            weight: entry.weight,
            cap: entry.cap,
            capMode: entry.capMode,
            zones: this.normalizeTemperatureZoneSettings(entry.zones)
          }))
        })),
        deployImprovement: preset.deployImprovement,
        designEnabled: !!preset.designEnabled
      })),
      activePresetId: this.activePresetId,
      enabled: this.enabled,
      collapsed: this.collapsed,
      nextPresetId: this.nextPresetId
    };
  }

  loadState(data = {}) {
    const savedPresets = Array.isArray(data.presets) ? data.presets : [];
    let migratedEnabled = false;
    this.presets = savedPresets.map(preset => {
      const purchaseSettings = this.createDefaultPurchaseSettings();
      const savedSettings = preset.purchaseSettings || {};
      Object.keys(purchaseSettings).forEach(category => {
        const setting = savedSettings[category] || {};
        const threshold = this.normalizePurchaseThreshold(
          Number(setting.threshold) || purchaseSettings[category].threshold
        );
        const maxCost = Number(setting.maxCost) || 0;
        purchaseSettings[category] = {
          enabled: !!setting.enabled,
          threshold,
          maxCost: maxCost > 0 ? maxCost : null
        };
      });
      const steps = (preset.designSteps || []).map(step => this.normalizeDesignStep(step));
      return {
        id: preset.id,
        name: preset.name || 'Preset',
        showInSidebar: preset.showInSidebar !== false,
        purchaseSettings,
        purchaseEnabled: preset.purchaseEnabled !== false,
        designSteps: steps,
        deployImprovement: Math.max(0, Math.floor(Number(preset.deployImprovement) || 0)),
        designEnabled: preset.designEnabled !== false
      };
    });
    for (let index = 0; index < savedPresets.length; index += 1) {
      if (savedPresets[index].enabled) {
        migratedEnabled = true;
        break;
      }
    }
    this.activePresetId = data.activePresetId || null;
    this.enabled = data.enabled !== undefined ? !!data.enabled : migratedEnabled;
    this.collapsed = !!data.collapsed;
    this.nextPresetId = data.nextPresetId || this.presets.length + 1;
    this.ensureDefaultPreset();
  }

  normalizePurchaseThreshold(value) {
    const parsed = Number(value) || 0;
    const rounded = Math.round(parsed * 100) / 100;
    return Math.max(0, Math.min(100, rounded));
  }
}

try {
  module.exports = { LifeAutomation };
} catch (error) {}
