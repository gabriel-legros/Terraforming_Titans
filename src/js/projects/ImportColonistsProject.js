class ImportColonistsProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.importTarget = 'colonists';
    this.continuousThreshold = config.continuousThreshold || 1000;
    this.continuousCarryAmount = 0;
  }

  getText(path, vars, fallback = '') {
    try {
      return t(`ui.projects.importColonists.${path}`, vars, fallback);
    } catch (error) {
      return fallback;
    }
  }

  canImportCrusaders() {
    return this.isBooleanFlagSet && this.isBooleanFlagSet('crusaderImportEnabled');
  }

  isContinuous() {
    return this.getEffectiveDuration() < this.continuousThreshold;
  }

  getRawImportGain() {
    const gain = super.getEffectiveResourceGain();
    return gain.colony?.colonists ?? 0;
  }

  getContinuousImportAmount(deltaTime = 1000, productivity = 1, includeCarry = false) {
    const duration = this.getEffectiveDuration();
    if (!(duration > 0) || duration === Infinity) {
      return 0;
    }

    const seconds = deltaTime / 1000;
    const durationSeconds = duration / 1000;
    const rawGain = this.getRawImportGain();
    const limit = this.getKesslerImportLimit();
    const importRate = limit === Infinity
      ? rawGain / durationSeconds
      : Math.min(rawGain / durationSeconds, limit);

    return importRate * seconds * productivity + (includeCarry ? this.continuousCarryAmount : 0);
  }

  applyImportAmount(amount, target = this.getImportTarget()) {
    if (!(amount > 0)) {
      return 0;
    }

    if (target === 'crusaders') {
      const crusaders = resources.special.crusaders;
      if (crusaders.unlock) {
        crusaders.unlock();
      } else {
        crusaders.unlocked = true;
      }
      const previousCrusaders = crusaders.value;
      crusaders.increase(amount);
      return Math.max(0, crusaders.value - previousCrusaders);
    }

    const previousColonists = resources.colony.colonists.value;
    resources.colony.colonists.increase(amount);
    const importedColonists = Math.max(0, resources.colony.colonists.value - previousColonists);
    if (followersManager && followersManager.onColonistsImported) {
      followersManager.onColonistsImported(importedColonists);
    }
    return importedColonists;
  }

  updateDurationFromEffects() {
    const newDuration = this.applyDurationEffects(this.getBaseDuration());
    const wasContinuous = this.startingDuration === Infinity || this.remainingTime === Infinity;
    const nowContinuous = newDuration < this.continuousThreshold;

    if (!this.isActive) {
      this.startingDuration = newDuration;
      return;
    }

    if (nowContinuous) {
      if (!wasContinuous) {
        const canCarryProgress =
          Number.isFinite(this.startingDuration) &&
          Number.isFinite(this.remainingTime) &&
          this.startingDuration > 0;
        if (canCarryProgress) {
          const progressRatio =
            (this.startingDuration - this.remainingTime) / this.startingDuration;
          const target = this.getImportTarget();
          const partialAmount =
            this.getImportAmountFromGain(super.getEffectiveResourceGain(), target) * progressRatio;
          this.continuousCarryAmount += partialAmount;
        }
      }
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
      return;
    }

    this.continuousCarryAmount = 0;
    if (wasContinuous) {
      this.startingDuration = newDuration;
      this.remainingTime = newDuration;
      return;
    }

    const canCarryProgress =
      Number.isFinite(this.startingDuration) &&
      Number.isFinite(this.remainingTime) &&
      this.startingDuration > 0;
    if (!canCarryProgress) {
      this.startingDuration = newDuration;
      this.remainingTime = newDuration;
      return;
    }

    const progressRatio =
      (this.startingDuration - this.remainingTime) / this.startingDuration;
    this.startingDuration = newDuration;
    this.remainingTime = newDuration * (1 - progressRatio);
  }

  getImportTarget() {
    return this.canImportCrusaders() && this.importTarget === 'crusaders'
      ? 'crusaders'
      : 'colonists';
  }

  setImportTarget(target) {
    this.importTarget = target === 'crusaders' ? 'crusaders' : 'colonists';
  }

  renderUI() {
    const elements = projectElements[this.name];
    const gainElement = elements.resourceGainElement;
    const gainList = gainElement.lastElementChild;
    while (gainList.firstChild) {
      gainList.removeChild(gainList.firstChild);
    }

    const wrapper = document.createElement('span');
    wrapper.classList.add('import-colonists-gain');

    const label = document.createElement('span');
    label.classList.add('import-target-label');
    wrapper.appendChild(label);

    const select = document.createElement('select');
    select.classList.add('import-target-select');

    const colonistsOption = document.createElement('option');
    colonistsOption.value = 'colonists';
    colonistsOption.textContent = resources.colony.colonists.displayName;
    select.appendChild(colonistsOption);

    const crusaders = resources.special.crusaders;
    if (crusaders) {
      const crusadersOption = document.createElement('option');
      crusadersOption.value = 'crusaders';
      crusadersOption.textContent = crusaders.displayName;
      select.appendChild(crusadersOption);
    }

    select.addEventListener('change', () => {
      this.setImportTarget(select.value);
      if (typeof updateProjectUI === 'function') {
        updateProjectUI(this.name);
      }
    });
    wrapper.appendChild(select);

    const separator = document.createElement('span');
    separator.textContent = this.getText('separator', null, ': ');
    wrapper.appendChild(separator);

    const amount = document.createElement('span');
    amount.classList.add('import-target-amount');
    wrapper.appendChild(amount);

    const crusaderTooltip = document.createElement('span');
    crusaderTooltip.classList.add('info-tooltip-icon');
    crusaderTooltip.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      crusaderTooltip,
      this.getText(
        'crusaderTooltip',
        null,
        'Crusaders do not grow or produce research, but can eliminate hazardous biomass.'
      )
    );
    crusaderTooltip.style.display = 'none';
    crusaderTooltip.style.marginLeft = '4px';
    wrapper.appendChild(crusaderTooltip);

    gainList.appendChild(wrapper);

    elements.resourceGainItems = null;
    elements.importTargetWrapper = wrapper;
    elements.importTargetLabel = label;
    elements.importTargetSelect = select;
    elements.importTargetSeparator = separator;
    elements.crusaderTooltip = crusaderTooltip;
    elements.importAmountSpan = amount;

    this.updateUI();
  }

  updateUI() {
    const elements = projectElements[this.name];
    const select = elements.importTargetSelect;
    const label = elements.importTargetLabel;
    const amountSpan = elements.importAmountSpan;
    const crusaderTooltip = elements.crusaderTooltip;

    const crusaderEnabled = this.canImportCrusaders();

    if (crusaderEnabled) {
      select.value = this.importTarget;
      select.style.display = '';
      label.style.display = 'none';
      crusaderTooltip.style.display = '';
    } else {
      label.textContent = resources.colony.colonists.displayName;
      label.style.display = '';
      select.style.display = 'none';
      crusaderTooltip.style.display = 'none';
    }

    const gain = this.getEffectiveResourceGain();
    const target = this.getImportTarget();
    const amount = this.isContinuous()
      ? this.getContinuousImportAmount(1000, 1, false)
      : this.getImportAmountFromGain(gain, target);
    amountSpan.textContent = this.isContinuous()
      ? `${formatNumber(amount, true)}${this.getText('rateSuffix', null, '/s')}`
      : formatNumber(amount, true);
    this.updateKesslerWarning();
  }

  applyResourceGain() {
    const gain = this.getEffectiveResourceGain();
    const target = this.getImportTarget();
    const amount = this.getImportAmountFromGain(gain, target);
    this.applyImportAmount(amount, target);
  }

  getImportAmountFromGain(gain, target = this.getImportTarget()) {
    const limit = this.getKesslerImportLimit();
    if (target === 'crusaders') {
      const amount = gain.special?.crusaders ?? 0;
      return amount > limit ? limit : amount;
    }
    const amount = gain.colony?.colonists ?? 0;
    return amount > limit ? limit : amount;
  }

  getEffectiveResourceGain() {
    const gain = super.getEffectiveResourceGain();
    const limit = this.getKesslerImportLimit();
    if (!this.canImportCrusaders() || this.getImportTarget() !== 'crusaders') {
      if (limit !== Infinity && gain.colony.colonists > limit) {
        gain.colony.colonists = limit;
      }
      return gain;
    }

    const crusaderGain = gain.colony?.colonists ?? 0;
    const adjustedGain = {};

    for (const category in gain) {
      for (const resource in gain[category]) {
        if (category === 'colony' && resource === 'colonists') {
          continue;
        }
        if (!adjustedGain[category]) {
          adjustedGain[category] = {};
        }
        adjustedGain[category][resource] = gain[category][resource];
      }
    }

    if (!adjustedGain.special) {
      adjustedGain.special = {};
    }
    adjustedGain.special.crusaders = limit !== Infinity && crusaderGain > limit
      ? limit
      : crusaderGain;
    return adjustedGain;
  }

  getKesslerImportLimit() {
    let limit = Infinity;
    try {
      limit = hazardManager.getKesslerTradeLimitPerSecond();
    } catch (error) {
      limit = Infinity;
    }
    return limit;
  }

  updateKesslerWarning() {
    let hazardActive = false;
    try {
      hazardActive = hazardManager.getKesslerTradeLimitPerSecond() !== Infinity;
    } catch (error) {
      hazardActive = false;
    }
    const elements = projectElements[this.name];
    const warning = elements.kesslerWarning;
    let isCollapsed = false;
    try {
      isCollapsed = elements.projectItem.classList.contains('collapsed');
    } catch (error) {
      isCollapsed = false;
    }
    warning.style.display = hazardActive && !isCollapsed ? 'flex' : 'none';
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      importTarget: this.importTarget
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'importTarget')) {
      this.setImportTarget(settings.importTarget);
    }
  }

  saveState() {
    const state = super.saveState();
    state.importTarget = this.importTarget;
    state.continuousCarryAmount = this.continuousCarryAmount;
    return state;
  }

  loadState(state) {
    super.loadState(state);
    this.setImportTarget(state?.importTarget);
    this.continuousCarryAmount = state?.continuousCarryAmount || 0;
  }

  start(resources) {
    const started = super.start(resources);
    if (!started) {
      return false;
    }

    if (this.isContinuous()) {
      this.continuousCarryAmount = 0;
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
    }

    return true;
  }

  update(deltaTime) {
    if (!this.isActive || this.isCompleted || this.isPaused) {
      return;
    }

    if (this.isContinuous()) {
      return;
    }

    super.update(deltaTime);
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) {
      return super.estimateProjectCostAndGain(deltaTime, applyRates, productivity);
    }

    const totals = { cost: {}, gain: {} };
    const target = this.getImportTarget();
    const amount = this.getContinuousImportAmount(deltaTime, productivity, false);
    if (!(amount > 0)) {
      return totals;
    }

    if (target === 'crusaders') {
      totals.special = { crusaders: amount };
      if (applyRates && this.showsInResourcesRate()) {
        resources.special.crusaders.modifyRate(amount / (deltaTime / 1000), this.displayName, 'project');
      }
      return totals;
    }

    totals.colony = { colonists: amount };
    if (applyRates && this.showsInResourcesRate()) {
      resources.colony.colonists.modifyRate(amount / (deltaTime / 1000), this.displayName, 'project');
    }
    return totals;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) {
      return;
    }

    const target = this.getImportTarget();
    const amount = this.getContinuousImportAmount(deltaTime, productivity, true);
    this.continuousCarryAmount = 0;
    this.applyImportAmount(amount, target);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImportColonistsProject;
} else if (typeof window !== 'undefined') {
  window.ImportColonistsProject = ImportColonistsProject;
} else if (typeof global !== 'undefined') {
  global.ImportColonistsProject = ImportColonistsProject;
}
