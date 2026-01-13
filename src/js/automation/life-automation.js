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
  'bioworkforce'
];
const LIFE_AUTOMATION_TEMPERATURE_ZONES = ['tropical', 'temperate', 'polar'];

class LifeAutomation {
  constructor() {
    this.presets = [];
    this.activePresetId = null;
    this.collapsed = false;
    this.nextPresetId = 1;
    this.elapsed = 0;
    this.maxSteps = 10;
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
    return {
      tropical: true,
      temperate: true,
      polar: true
    };
  }

  isTemperatureToleranceAttribute(attributeName) {
    return attributeName === 'minTemperatureTolerance' || attributeName === 'maxTemperatureTolerance';
  }

  getTemperatureZoneNames(step) {
    const zones = step.zones || this.createTemperatureZoneSettings();
    return LIFE_AUTOMATION_TEMPERATURE_ZONES.filter(zoneName => zones[zoneName]);
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

  ensureDefaultPreset() {
    if (this.presets.length > 0) {
      return;
    }
    const preset = {
      id: this.nextPresetId++,
      name: 'Default',
      enabled: false,
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

  setActivePreset(id) {
    const preset = this.presets.find(item => item.id === id) || this.presets[0];
    this.activePresetId = preset.id;
    if (!preset.enabled) {
      preset.enabled = true;
    }
  }

  togglePresetEnabled(id, enabled) {
    const preset = this.presets.find(item => item.id === id) || this.presets[0];
    preset.enabled = !!enabled;
    if (preset.enabled) {
      this.activePresetId = preset.id;
    }
  }

  addPreset(name = '') {
    const preset = {
      id: this.nextPresetId++,
      name: name || `Preset ${this.nextPresetId - 1}`,
      enabled: false,
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
    const parsed = Math.floor(Number(value) || 0);
    settings.threshold = Math.max(1, parsed);
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
    this.normalizeRemainingSteps(preset);
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
    this.normalizeRemainingSteps(preset);
    this.refreshActiveDeployment(preset);
    return step.id;
  }

  createDesignStep() {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      attribute: LIFE_AUTOMATION_ATTRIBUTES[0],
      amount: 1,
      mode: 'fixed',
      zones: this.createTemperatureZoneSettings()
    };
  }

  removeDesignStep(presetId, stepId) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    preset.designSteps = preset.designSteps.filter(step => step.id !== stepId);
    this.normalizeRemainingSteps(preset);
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
    this.normalizeRemainingSteps(preset);
    this.refreshActiveDeployment(preset);
  }

  updateDesignStep(presetId, stepId, updates = {}) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const step = preset.designSteps.find(item => item.id === stepId) || preset.designSteps[0];
    if (Object.prototype.hasOwnProperty.call(updates, 'attribute')) {
      const attribute = updates.attribute;
      step.attribute = LIFE_AUTOMATION_ATTRIBUTES.includes(attribute)
        ? attribute
        : LIFE_AUTOMATION_ATTRIBUTES[0];
    }
    const attributeName = step.attribute;
    const isTempTolerance = this.isTemperatureToleranceAttribute(attributeName);
    if (!isTempTolerance && step.mode === 'needed') {
      step.mode = 'fixed';
    }
    if (isTempTolerance) {
      step.zones = step.zones || this.createTemperatureZoneSettings();
    }
    const maxUpgrades = lifeDesigner.currentDesign[attributeName].maxUpgrades;
    if (Object.prototype.hasOwnProperty.call(updates, 'amount')) {
      const parsed = Math.floor(Number(updates.amount) || 0);
      if (attributeName === 'optimalGrowthTemperature') {
        step.amount = Math.max(-maxUpgrades, Math.min(maxUpgrades, parsed));
      } else {
        step.amount = Math.max(0, Math.min(maxUpgrades, parsed));
      }
    } else if (attributeName === 'optimalGrowthTemperature') {
      step.amount = Math.max(-maxUpgrades, Math.min(maxUpgrades, step.amount));
    } else {
      step.amount = Math.max(0, Math.min(maxUpgrades, step.amount));
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'mode')) {
      step.mode = updates.mode === 'remaining'
        || updates.mode === 'max'
        || (updates.mode === 'needed' && isTempTolerance)
        ? updates.mode
        : 'fixed';
    }
    this.normalizeRemainingSteps(preset);
    this.refreshActiveDeployment(preset);
  }

  setDesignStepZone(presetId, stepId, zoneName, enabled) {
    const preset = this.presets.find(item => item.id === presetId) || this.presets[0];
    const step = preset.designSteps.find(item => item.id === stepId) || preset.designSteps[0];
    const zones = step.zones || this.createTemperatureZoneSettings();
    zones[zoneName] = !!enabled;
    step.zones = zones;
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

  normalizeRemainingSteps(preset) {
    const lastIndex = preset.designSteps.length - 1;
    for (let index = 0; index < preset.designSteps.length; index += 1) {
      if (preset.designSteps[index].mode === 'remaining' && index !== lastIndex) {
        preset.designSteps[index].mode = 'fixed';
      }
    }
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
      const amount = isOptimal
        ? Math.max(-maxUpgrades, Math.min(maxUpgrades, value))
        : Math.max(0, Math.min(maxUpgrades, value));
      steps.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + index,
        attribute: attributeName,
        amount,
        mode: isMetabolism ? 'remaining' : 'fixed'
      });
    }
    preset.designSteps = steps;
    this.normalizeRemainingSteps(preset);
    this.refreshActiveDeployment(preset);
  }

  isActive() {
    const preset = this.getActivePreset();
    return automationManager.enabled
      && automationManager.hasFeature('automationLifeDesign')
      && preset.enabled
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
    this.applyAutoPurchases(preset);
    this.applyAutoDesign(preset);
  }

  applyAutoPurchases(preset) {
    if (!preset.purchaseEnabled) {
      return;
    }
    for (let index = 0; index < lifeShopCategories.length; index += 1) {
      const category = lifeShopCategories[index];
      const settings = preset.purchaseSettings[category.name];
      if (!settings.enabled) {
        continue;
      }
      const cost = lifeDesigner.getTotalPointCost(category.name, 1);
      const threshold = Math.max(1, Math.floor(Number(settings.threshold) || 0));
      const maxCost = Number(settings.maxCost) || 0;
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
    }
  }

  buildCandidateDesign(preset) {
    const maxPoints = Math.floor(lifeDesigner.maxLifeDesignPoints());
    let remaining = Math.max(0, maxPoints);
    if (remaining <= 0) {
      return null;
    }
    const candidate = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0);

    for (let index = 0; index < preset.designSteps.length; index += 1) {
      if (remaining <= 0) {
        break;
      }
      const step = preset.designSteps[index];
      const attributeName = step.attribute;
      const attribute = candidate[attributeName];
      const maxUpgrades = attribute.maxUpgrades;
      const isRemaining = step.mode === 'remaining' && index === preset.designSteps.length - 1;
      const isMax = step.mode === 'max';
      const isNeeded = step.mode === 'needed' && this.isTemperatureToleranceAttribute(attributeName);
      if (attributeName === 'optimalGrowthTemperature') {
        const direction = step.amount < 0 ? -1 : 1;
        const desiredMagnitude = isRemaining
          ? remaining
          : isMax
            ? maxUpgrades
            : Math.abs(Math.floor(Number(step.amount) || 0));
        if (desiredMagnitude > 0) {
          const currentValue = attribute.value;
          const currentAbs = Math.abs(currentValue);
          let target = currentValue + (direction * desiredMagnitude);
          target = Math.max(-maxUpgrades, Math.min(maxUpgrades, target));
          const targetAbs = Math.abs(target);
          let costDelta = targetAbs - currentAbs;
          if (costDelta > remaining) {
            const allowedAbs = Math.min(maxUpgrades, currentAbs + remaining);
            target = allowedAbs * direction;
            costDelta = allowedAbs - currentAbs;
          }
          attribute.value = target;
          remaining -= costDelta;
        }
      } else if (isNeeded) {
        const zoneNames = this.getTemperatureZoneNames(step);
        const targetValue = Math.min(maxUpgrades, Math.ceil(this.getTemperatureToleranceTarget(attributeName, zoneNames)));
        const currentValue = attribute.value;
        if (targetValue > currentValue) {
          const delta = Math.min(remaining, targetValue - currentValue);
          attribute.value = currentValue + delta;
          remaining -= delta;
        } else {
          attribute.value = targetValue;
          remaining += currentValue - targetValue;
        }
      } else {
        const desired = isRemaining
          ? remaining
          : isMax
            ? maxUpgrades
            : Math.floor(Number(step.amount) || 0);
        const cap = Math.max(0, maxUpgrades - attribute.value);
        const applied = Math.min(remaining, Math.max(0, Math.min(desired, cap)));
        attribute.value += applied;
        remaining -= applied;
      }
    }

    return candidate;
  }

  applyAutoDesign(preset) {
    if (!preset.designEnabled) {
      return;
    }
    if (lifeDesigner.isActive) {
      return;
    }
    if (preset.designSteps.length === 0) {
      return;
    }
    const candidate = this.buildCandidateDesign(preset);
    if (!candidate) {
      return;
    }
    const currentDesign = lifeDesigner.currentDesign;
    let needsToleranceIncrease = false;
    for (let index = 0; index < preset.designSteps.length; index += 1) {
      const step = preset.designSteps[index];
      if (step.mode !== 'needed' || !this.isTemperatureToleranceAttribute(step.attribute)) {
        continue;
      }
      if (candidate[step.attribute].value > currentDesign[step.attribute].value) {
        needsToleranceIncrease = true;
        break;
      }
    }
    const improvement = candidate.getDesignCost() - currentDesign.getDesignCost();
    const improvementMagnitude = Math.abs(improvement);
    if (!needsToleranceIncrease && improvementMagnitude < preset.deployImprovement) {
      return;
    }
    if (!candidate.canSurviveAnywhere()) {
      return;
    }
    lifeDesigner.replaceDesign(candidate);
    document.dispatchEvent(new Event('lifeTentativeDesignCreated'));
    lifeDesigner.confirmDesign();
    document.dispatchEvent(new Event('lifeTentativeDesignDiscarded'));
    updateLifeUI();
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
    updateLifeUI();
  }

  saveState() {
    return {
      presets: this.presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        enabled: !!preset.enabled,
        purchaseSettings: Object.fromEntries(
          Object.entries(preset.purchaseSettings).map(([key, value]) => [key, { ...value }])
        ),
        purchaseEnabled: !!preset.purchaseEnabled,
        designSteps: preset.designSteps.map(step => ({
          id: step.id,
          attribute: step.attribute,
          amount: step.amount,
          mode: step.mode,
          zones: { ...(step.zones || this.createTemperatureZoneSettings()) }
        })),
        deployImprovement: preset.deployImprovement,
        designEnabled: !!preset.designEnabled
      })),
      activePresetId: this.activePresetId,
      collapsed: this.collapsed,
      nextPresetId: this.nextPresetId
    };
  }

  loadState(data = {}) {
    this.presets = (data.presets || []).map(preset => {
      const purchaseSettings = this.createDefaultPurchaseSettings();
      const savedSettings = preset.purchaseSettings || {};
      Object.keys(purchaseSettings).forEach(category => {
        const setting = savedSettings[category] || {};
        const threshold = Math.floor(Number(setting.threshold) || purchaseSettings[category].threshold);
        const maxCost = Number(setting.maxCost) || 0;
        purchaseSettings[category] = {
          enabled: !!setting.enabled,
          threshold: Math.max(1, threshold),
          maxCost: maxCost > 0 ? maxCost : null
        };
      });
      const steps = (preset.designSteps || []).map(step => {
        const attribute = LIFE_AUTOMATION_ATTRIBUTES.includes(step.attribute)
          ? step.attribute
          : LIFE_AUTOMATION_ATTRIBUTES[0];
        const isTempTolerance = this.isTemperatureToleranceAttribute(attribute);
        const maxUpgrades = lifeDesigner.currentDesign[attribute].maxUpgrades;
        const parsed = Math.floor(Number(step.amount) || 0);
        const amount = attribute === 'optimalGrowthTemperature'
          ? Math.max(-maxUpgrades, Math.min(maxUpgrades, parsed))
          : Math.max(0, Math.min(maxUpgrades, parsed));
        return {
          id: step.id,
          attribute,
          amount,
          mode: step.mode === 'remaining'
            || step.mode === 'max'
            || (step.mode === 'needed' && isTempTolerance)
            ? step.mode
            : 'fixed',
          zones: { ...(step.zones || this.createTemperatureZoneSettings()) }
        };
      });
      return {
        id: preset.id,
        name: preset.name || 'Preset',
        enabled: !!preset.enabled,
        purchaseSettings,
        purchaseEnabled: preset.purchaseEnabled !== false,
        designSteps: steps,
        deployImprovement: Math.max(0, Math.floor(Number(preset.deployImprovement) || 0)),
        designEnabled: preset.designEnabled !== false
      };
    });
    this.presets.forEach(preset => this.normalizeRemainingSteps(preset));
    this.activePresetId = data.activePresetId || null;
    this.collapsed = !!data.collapsed;
    this.nextPresetId = data.nextPresetId || this.presets.length + 1;
    this.ensureDefaultPreset();
  }
}

try {
  module.exports = { LifeAutomation };
} catch (error) {}
