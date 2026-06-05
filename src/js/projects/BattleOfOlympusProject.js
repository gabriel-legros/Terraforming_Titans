class BattleOfOlympusProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    const attributes = config.attributes || {};
    this.biomassCap = attributes.biomassCap || 2e23;
    this.hazardousBiomass = attributes.initialBiomass || this.biomassCap;
    this.removedBiomass = Math.max(0, this.biomassCap - this.hazardousBiomass);
    this.baseGrowthRate = attributes.baseGrowthRate || 0.004;
    this.executionerDecayRate = attributes.executionerDecayRate || 1;
    this.assignmentUnlockRatio = attributes.assignmentUnlockRatio || 1000;
    this.minimumMetalSalvagingAndroids = attributes.minimumMetalSalvagingAndroids || 100;
    this.biomassZones = attributes.biomassZones || ['tropical', 'temperate'];
    this.lastExecutionerSuppressionRate = 0;
    this.lastSuppressorSuppressionRate = 0;
    this.lastCrusaderSuppressionRate = 0;
    this.lastGreyGooSuppressionRate = 0;
    this.ui = null;
  }

  canAssignAndroids() {
    return this.unlocked;
  }

  shouldHideStartBar() {
    return true;
  }

  getAndroidSpeedMultiplier() {
    return this.getExecutionerSuppressionRate();
  }

  getAndroidAssignmentLabelText() {
    return t('ui.projects.battleOfOlympus.executioners', null, 'Executioners');
  }

  getAndroidSpeedLabelText() {
    return t('ui.projects.battleOfOlympus.executionerDecay', null, 'Suppression');
  }

  getAndroidSpeedTooltip() {
    return t('ui.projects.battleOfOlympus.executionerDecayTooltip', null, 'Each Executioner removes 1 hazardous biomass per second.');
  }

  getAndroidSpeedDisplayText() {
    return t('ui.projects.battleOfOlympus.executionerDecayValue', {
      value: formatNumber(this.getAndroidSpeedMultiplier(), true)
    }, '{value}/s');
  }

  getSuppressorBonusPercent() {
    return (this.getSuppressorMultiplier() - 1) * 100;
  }

  getCrusaderBonusPercent() {
    return (this.getCrusaderMultiplier() - 1) * 100;
  }

  getSuppressorMultiplier() {
    if (!this.isSuppressorSuppressionAvailable()) {
      return 1;
    }
    const ships = Math.max(1, resources.special.spaceships.value || 0);
    return 1 + 0.05 * Math.log(ships);
  }

  getCrusaderMultiplier() {
    if (!this.isCrusaderSuppressionAvailable()) {
      return 1;
    }
    const crusaders = Math.max(1, resources.special.crusaders.value || 0);
    return 1 + 0.05 * Math.log(crusaders);
  }

  getExecutionerSuppressionRate() {
    return (this.assignedAndroids || 0) * this.executionerDecayRate;
  }

  getSuppressorSuppressionRate() {
    return this.getExecutionerSuppressionRate() * (this.getSuppressorMultiplier() - 1);
  }

  getCrusaderSuppressionRate() {
    return this.getExecutionerSuppressionRate() * (this.getCrusaderMultiplier() - 1);
  }

  getGreyGooSuppressionRate() {
    return this.isGreyGooSuppressionAvailable()
      ? Math.max(0, nanotechManager.currentHazardousBiomassConsumption || 0)
      : 0;
  }

  getTotalSuppressionRate() {
    return this.getExecutionerSuppressionRate() + this.getSuppressorSuppressionRate() + this.getCrusaderSuppressionRate();
  }

  isSuppressorSuppressionAvailable() {
    return buildings.shipyard.unlocked === true;
  }

  isCrusaderSuppressionAvailable() {
    return buildings.cloningFacility.isBooleanFlagSet('crusaderCloningRecipe');
  }

  isGreyGooSuppressionAvailable() {
    return nanotechManager.isBooleanFlagSet('stageSkull_enabled');
  }

  getRemovedBiomass() {
    return Math.max(0, this.removedBiomass);
  }

  getMetalSalvagingAssignmentCap() {
    return Math.max(
      this.minimumMetalSalvagingAndroids,
      Math.floor(this.getRemovedBiomass() / this.assignmentUnlockRatio)
    );
  }

  getBiomassPercent() {
    return this.biomassCap > 0 ? Math.max(0, Math.min(1, this.hazardousBiomass / this.biomassCap)) : 0;
  }

  getLogBiomassPercent() {
    if (this.biomassCap <= 0) {
      return 0;
    }
    const removed = this.getRemovedBiomass();
    const removedProgress = Math.log10(1 + removed) / Math.log10(1 + this.biomassCap);
    return Math.max(0, Math.min(1, 1 - removedProgress));
  }

  shouldReleaseAndroidAssignmentsForCompleteOrDisabled() {
    return this.hazardousBiomass <= 0;
  }

  shouldReleaseAndroidAssignmentsWhenIdle() {
    return false;
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (!this.unlocked) {
      return;
    }

    const resourceBiomass = Math.max(0, resources.surface.hazardousBiomass.value || 0);
    if (resourceBiomass < this.hazardousBiomass) {
      this.hazardousBiomass = resourceBiomass;
      this.removedBiomass = Math.max(0, this.biomassCap - this.hazardousBiomass);
    }

    const seconds = deltaTime / 1000;
    const removed = Math.max(0, Math.min(this.biomassCap, this.removedBiomass));
    const growth = removed * this.baseGrowthRate * (1 - removed / this.biomassCap) * seconds;
    const executionerSuppressionRate = this.getExecutionerSuppressionRate();
    const suppressorSuppressionRate = this.getSuppressorSuppressionRate();
    const crusaderSuppressionRate = this.getCrusaderSuppressionRate();
    const greyGooSuppressionRate = this.getGreyGooSuppressionRate();
    const decayRate = this.getTotalSuppressionRate();
    const decay = decayRate * seconds;
    const unclampedRemoved = removed + decay - growth;
    let appliedGrowth = growth;
    let appliedDecay = decay;
    if (unclampedRemoved > this.biomassCap) {
      appliedDecay = Math.max(0, this.biomassCap - removed + growth);
    } else if (unclampedRemoved < 0) {
      appliedGrowth = removed + decay;
    }

    this.removedBiomass = Math.max(0, Math.min(this.biomassCap, unclampedRemoved));
    this.hazardousBiomass = Math.max(0, this.biomassCap - this.removedBiomass);
    this.lastExecutionerSuppressionRate = executionerSuppressionRate;
    this.lastSuppressorSuppressionRate = suppressorSuppressionRate;
    this.lastCrusaderSuppressionRate = crusaderSuppressionRate;
    this.lastGreyGooSuppressionRate = greyGooSuppressionRate;
    this.syncZonalBiomass();
    this.updateHazardousBiomassRates(appliedGrowth, appliedDecay, seconds);

    this.isCompleted = this.hazardousBiomass <= 0;
  }

  renderUI(container) {
    this.createBattleStatusUI(container);
    this.createAndroidAssignmentUI(container);
    this.createExtraSuppressionUI();
  }

  createExtraSuppressionUI() {
    const elements = projectElements[this.name];
    if (!elements || !elements.androidAssignmentContainer) {
      return;
    }
    const speedContainer = elements.androidAssignmentContainer.querySelector('.android-speed-container');
    if (!speedContainer) {
      return;
    }
    const suppressors = this.createSuppressionRow(t('ui.projects.battleOfOlympus.suppressors', null, 'Suppressors'));
    const crusaders = this.createSuppressionRow(t('ui.projects.battleOfOlympus.crusaders', null, 'Crusaders'));
    const greyGoo = this.createSuppressionRow(t('ui.projects.battleOfOlympus.greyGoo', null, 'Grey goo'));
    speedContainer.append(suppressors.row, crusaders.row, greyGoo.row);
    projectElements[this.name] = {
      ...elements,
      battleOfOlympusSuppressorsRow: suppressors.row,
      battleOfOlympusSuppressorsSuppression: suppressors.value,
      battleOfOlympusCrusadersRow: crusaders.row,
      battleOfOlympusCrusadersSuppression: crusaders.value,
      battleOfOlympusGreyGooRow: greyGoo.row,
      battleOfOlympusGreyGooSuppression: greyGoo.value
    };
  }

  createSuppressionRow(labelText) {
    const row = document.createElement('div');
    row.classList.add('android-speed-row', 'battle-of-olympus-suppression-row');
    const label = document.createElement('span');
    label.className = 'battle-of-olympus-suppression-label';
    label.textContent = labelText;
    const value = document.createElement('span');
    value.className = 'android-speed-value battle-of-olympus-suppression-value';
    row.append(label, value);
    return { row, value };
  }

  createBattleStatusUI(container) {
    const section = document.createElement('div');
    section.classList.add('project-section-container', 'battle-of-olympus-section');

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = t('ui.projects.battleOfOlympus.statusTitle', null, 'Hazardous biomass front');

    const barWrap = document.createElement('div');
    barWrap.className = 'battle-of-olympus-progress-wrap';

    const bar = document.createElement('div');
    bar.className = 'battle-of-olympus-progress-bar';

    const barLabel = document.createElement('div');
    barLabel.className = 'battle-of-olympus-progress-label';

    barWrap.append(bar, barLabel);

    const metrics = document.createElement('div');
    metrics.className = 'battle-of-olympus-metrics';

    const remaining = this.createMetric(
      t('ui.projects.battleOfOlympus.remaining', null, 'Remaining'),
      'remaining'
    );
    const removed = this.createMetric(
      t('ui.projects.battleOfOlympus.removed', null, 'Removed'),
      'removed'
    );
    const growth = this.createMetric(
      t('ui.projects.battleOfOlympus.growth', null, 'Regrowth'),
      'growth'
    );
    const cap = this.createMetric(
      t('ui.projects.battleOfOlympus.metalSalvagingCap', null, 'Metal Salvaging android cap'),
      'cap'
    );

    metrics.append(remaining.row, removed.row, growth.row, cap.row);
    section.append(title, barWrap, metrics);
    container.appendChild(section);

    projectElements[this.name] = {
      ...projectElements[this.name],
      battleOfOlympusSection: section,
      battleOfOlympusProgressBar: bar,
      battleOfOlympusProgressLabel: barLabel,
      battleOfOlympusRemaining: remaining.value,
      battleOfOlympusRemoved: removed.value,
      battleOfOlympusGrowth: growth.value,
      battleOfOlympusCap: cap.value
    };
  }

  createMetric(labelText, className) {
    const row = document.createElement('div');
    row.className = `battle-of-olympus-metric battle-of-olympus-metric-${className}`;
    const label = document.createElement('span');
    label.className = 'battle-of-olympus-metric-label';
    label.textContent = labelText;
    const value = document.createElement('span');
    value.className = 'battle-of-olympus-metric-value';
    row.append(label, value);
    return { row, value };
  }

  syncZonalBiomass() {
    const share = this.biomassZones.length > 0 ? this.hazardousBiomass / this.biomassZones.length : 0;
    getZones().forEach((zone) => {
      terraforming.zonalSurface[zone].hazardousBiomass = this.biomassZones.indexOf(zone) >= 0 ? share : 0;
    });

    resources.surface.hazardousBiomass.value = this.hazardousBiomass;
  }

  updateHazardousBiomassRates(growthAmount, decayAmount, seconds) {
    if (seconds <= 0) {
      return;
    }

    const hazardousResource = resources.surface.hazardousBiomass;
    if (growthAmount > 0) {
      hazardousResource.modifyRate(
        growthAmount / seconds,
        t('ui.projects.battleOfOlympus.regrowthRateSource', null, 'Battle of Olympus regrowth'),
        'project'
      );
    }
    if (decayAmount > 0) {
      hazardousResource.modifyRate(
        -(decayAmount / seconds),
        t('ui.projects.battleOfOlympus.executionerRateSource', null, 'Executioners'),
        'project'
      );
    }
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements || !elements.battleOfOlympusProgressBar) {
      return;
    }

    const removed = this.getRemovedBiomass();
    const remaining = Math.max(0, this.biomassCap - removed);
    const percent = this.getLogBiomassPercent();
    const growthRate = removed * this.baseGrowthRate * (1 - removed / this.biomassCap);
    const cap = this.getMetalSalvagingAssignmentCap();
    const percentText = formatNumber(percent * 100, false, 2);

    elements.battleOfOlympusProgressBar.style.width = `${percent * 100}%`;
    elements.battleOfOlympusProgressLabel.textContent = t('ui.projects.battleOfOlympus.progressLabel', {
      percent: percentText
    }, '{percent}% active');
    elements.battleOfOlympusRemaining.textContent = formatNumber(remaining, true);
    elements.battleOfOlympusRemoved.textContent = formatNumber(removed, true);
    elements.battleOfOlympusGrowth.textContent = t('ui.projects.battleOfOlympus.growthValue', {
      value: formatNumber(growthRate, true)
    }, '+{value}/s');
    elements.battleOfOlympusCap.textContent = t('ui.projects.battleOfOlympus.capValue', {
      cap: formatNumber(cap, true)
    }, '{cap}');
    if (elements.battleOfOlympusSuppressorsRow) {
      elements.battleOfOlympusSuppressorsRow.style.display = this.isSuppressorSuppressionAvailable() ? '' : 'none';
    }
    if (elements.battleOfOlympusSuppressorsSuppression) {
      elements.battleOfOlympusSuppressorsSuppression.textContent = t('ui.projects.battleOfOlympus.suppressionBonusValue', {
        value: formatNumber(this.getSuppressorBonusPercent(), false, 2)
      }, '+{value}%');
    }
    if (elements.battleOfOlympusCrusadersRow) {
      elements.battleOfOlympusCrusadersRow.style.display = this.isCrusaderSuppressionAvailable() ? '' : 'none';
    }
    if (elements.battleOfOlympusCrusadersSuppression) {
      elements.battleOfOlympusCrusadersSuppression.textContent = t('ui.projects.battleOfOlympus.suppressionBonusValue', {
        value: formatNumber(this.getCrusaderBonusPercent(), false, 2)
      }, '+{value}%');
    }
    if (elements.battleOfOlympusGreyGooRow) {
      elements.battleOfOlympusGreyGooRow.style.display = this.isGreyGooSuppressionAvailable() ? '' : 'none';
    }
    if (elements.battleOfOlympusGreyGooSuppression) {
      elements.battleOfOlympusGreyGooSuppression.textContent = t('ui.projects.battleOfOlympus.suppressionRateValue', {
        value: formatNumber(this.lastGreyGooSuppressionRate, true)
      }, '{value}/s');
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      hazardousBiomass: this.hazardousBiomass,
      removedBiomass: this.removedBiomass
    };
  }

  loadState(state) {
    super.loadState(state);
    this.hazardousBiomass = Math.max(0, Math.min(this.biomassCap, state.hazardousBiomass ?? this.biomassCap));
    this.removedBiomass = Math.max(0, Math.min(this.biomassCap, state.removedBiomass ?? (this.biomassCap - this.hazardousBiomass)));
    this.hazardousBiomass = Math.max(0, this.biomassCap - this.removedBiomass);
    this.isCompleted = this.hazardousBiomass <= 0;
  }
}

window.BattleOfOlympusProject = BattleOfOlympusProject;
