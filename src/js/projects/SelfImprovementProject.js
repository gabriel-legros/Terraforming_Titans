const SELF_IMPROVEMENT_MAX_CORES = 1e21;
const SELF_IMPROVEMENT_FACTORY_EFFICIENCY_CORES = 1e9;
const SELF_IMPROVEMENT_CORE_COST = 100;
const SELF_IMPROVEMENT_EFFECT_SOURCE = 'self-improvement';

class SelfImprovementProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.cores = 0;
    this.spendStep = 1;
    this.ui = null;
  }

  getText(path, fallback, vars) {
    return t(`ui.projects.selfImprovement.${path}`, vars, fallback);
  }

  isVisible() {
    return this.unlocked && !this.isPermanentlyDisabled();
  }

  shouldHideStartBar() {
    return true;
  }

  getMaxCores() {
    return this.attributes.maxCores || SELF_IMPROVEMENT_MAX_CORES;
  }

  getFactoryEfficiencyCores() {
    return this.attributes.factoryEfficiencyCores || SELF_IMPROVEMENT_FACTORY_EFFICIENCY_CORES;
  }

  getAvailableCoreCapacity() {
    return Math.max(0, this.getMaxCores() - (this.cores || 0));
  }

  getAvailableElectronicsCores() {
    return Math.floor((resources.colony.electronics.value || 0) / SELF_IMPROVEMENT_CORE_COST);
  }

  getMaxSpendableCores() {
    return Math.max(0, Math.min(this.getAvailableCoreCapacity(), this.getAvailableElectronicsCores()));
  }

  clampSpendStep(step) {
    return Math.max(1, Math.min(this.getMaxCores(), Math.floor(step || 1)));
  }

  setSpendStep(step) {
    this.spendStep = this.clampSpendStep(step);
    this.updateUI();
  }

  spendCores(amount) {
    const cores = Math.floor(Math.max(0, amount || 0));
    const actual = Math.min(cores, this.getMaxSpendableCores());
    if (actual <= 0) {
      this.updateUI();
      return;
    }
    resources.colony.electronics.decrease(actual * SELF_IMPROVEMENT_CORE_COST);
    this.cores += actual;
    this.applyEffects();
    this.updateUI();
  }

  spendStepCores() {
    if (this.spendStep > this.getMaxSpendableCores()) {
      this.updateUI();
      return;
    }
    this.spendCores(this.spendStep);
  }

  spendMaxCores() {
    this.spendCores(this.getMaxSpendableCores());
  }

  getLogProgress(targetCores) {
    const cores = Math.max(0, this.cores || 0);
    if (cores <= 0) {
      return 0;
    }
    const target = Math.max(1, targetCores || 1);
    return Math.max(0, Math.min(1, Math.log10(cores + 1) / Math.log10(target + 1)));
  }

  getIndustrialReduction(maxReduction) {
    return maxReduction * this.getLogProgress(this.getMaxCores());
  }

  getEfficiencyBonus() {
    return 4 * this.getLogProgress(this.getFactoryEfficiencyCores());
  }

  getAndroidEfficiencyBonus() {
    return 9 * this.getLogProgress(this.getFactoryEfficiencyCores());
  }

  getSuperalloyEfficiencyMultiplier() {
    return 1 + 999 * this.getLogProgress(this.getMaxCores());
  }

  getIndustrialRows() {
    const costReduction = this.getIndustrialReduction(0.9);
    const workerReduction = this.getIndustrialReduction(0.99);
    const maintenanceReduction = this.getIndustrialReduction(1);
    const efficiencyBonus = this.getEfficiencyBonus();
    const androidEfficiencyBonus = this.getAndroidEfficiencyBonus();
    const superalloyMultiplier = this.getSuperalloyEfficiencyMultiplier();
    return [
      { id: 'buildCost', label: this.getText('industrial.buildCost', 'Build cost reduction'), value: this.formatPercent(costReduction) },
      { id: 'workers', label: this.getText('industrial.workers', 'Worker requirement reduction'), value: this.formatPercent(workerReduction) },
      { id: 'maintenance', label: this.getText('industrial.maintenance', 'Maintenance reduction'), value: this.formatPercent(maintenanceReduction) },
      { id: 'components', label: this.getText('industrial.components', 'Components factory efficiency'), value: this.formatSignedPercent(efficiencyBonus) },
      { id: 'electronics', label: this.getText('industrial.electronics', 'Electronics factory efficiency'), value: this.formatSignedPercent(efficiencyBonus) },
      { id: 'superconductors', label: this.getText('industrial.superconductors', 'Superconductor factory efficiency'), value: this.formatSignedPercent(efficiencyBonus) },
      { id: 'superalloys', label: this.getText('industrial.superalloys', 'Superalloy production efficiency'), value: this.formatMultiplier(superalloyMultiplier) },
      { id: 'androids', label: this.getText('industrial.androids', 'Androids factory efficiency'), value: this.formatSignedPercent(androidEfficiencyBonus) }
    ];
  }

  getResearchRows() {
    return [
      { id: 'nuclear', threshold: 10, label: this.getText('research.nuclear', 'Nuclear reactor + closed loop') },
      { id: 'superconductors', threshold: 100, label: this.getText('research.superconductors', 'Superconductor factories') },
      { id: 'fusion', threshold: 1000, label: this.getText('research.fusion', 'Fusion reactor') },
      { id: 'fusion1', threshold: 10000, label: this.getText('research.fusion1', 'Fusion reactor output x2') },
      { id: 'antimatterBattery', threshold: 100000, label: this.getText('research.antimatterBattery', 'Antimatter batteries') },
      { id: 'fusion2', threshold: 1000000, label: this.getText('research.fusion2', 'Fusion reactor output x2') },
      { id: 'superalloys', threshold: 10000000, label: this.getText('research.superalloys', 'Superalloys') },
      { id: 'superalloyFusion1', threshold: 100000000, label: this.getText('research.superalloyFusion1', 'Superalloy fusion output x4') }
    ];
  }

  formatPercent(value) {
    return `${formatNumber(value * 100, false, 2)}%`;
  }

  formatSignedPercent(value) {
    return `+${formatNumber(value * 100, false, 2)}%`;
  }

  formatMultiplier(value) {
    return `x${formatNumber(value, false, 2)}`;
  }

  applyEffects() {
    if (!this.unlocked) {
      return;
    }
    const costReduction = this.getIndustrialReduction(0.9);
    const workerReduction = this.getIndustrialReduction(0.99);
    const maintenanceReduction = this.getIndustrialReduction(1);
    const efficiencyBonus = this.getEfficiencyBonus();
    const androidEfficiencyBonus = this.getAndroidEfficiencyBonus();
    const superalloyMultiplier = this.getSuperalloyEfficiencyMultiplier();

    addEffect({
      target: 'global',
      type: 'globalCostReduction',
      value: costReduction,
      effectId: 'self-improvement-build-cost',
      sourceId: SELF_IMPROVEMENT_EFFECT_SOURCE,
      name: this.displayName
    });
    addEffect({
      target: 'global',
      type: 'globalWorkerReduction',
      value: workerReduction,
      effectId: 'self-improvement-workers',
      sourceId: SELF_IMPROVEMENT_EFFECT_SOURCE,
      name: this.displayName
    });
    addEffect({
      target: 'global',
      type: 'globalMaintenanceReduction',
      value: maintenanceReduction,
      effectId: 'self-improvement-maintenance',
      sourceId: SELF_IMPROVEMENT_EFFECT_SOURCE,
      name: this.displayName
    });

    this.applyFactoryEfficiency('componentFactory', efficiencyBonus);
    this.applyFactoryEfficiency('electronicsFactory', efficiencyBonus);
    this.applyFactoryEfficiency('superconductorFactory', efficiencyBonus);
    this.applyFactoryEfficiency('androidFactory', androidEfficiencyBonus);
    this.applyFactoryMultiplier('superalloyFoundry', superalloyMultiplier);
    this.applyResearchUnlocks();
  }

  applyFactoryEfficiency(targetId, bonus) {
    this.applyFactoryMultiplier(targetId, 1 + bonus);
  }

  applyFactoryMultiplier(targetId, multiplier) {
    addEffect({
      target: 'building',
      targetId,
      type: 'productionMultiplier',
      value: multiplier,
      effectId: `self-improvement-${targetId}`,
      sourceId: SELF_IMPROVEMENT_EFFECT_SOURCE,
      name: this.displayName
    });
  }

  applyResearchUnlocks() {
    const effects = [];
    if (this.cores >= 10) {
      effects.push(
        { target: 'building', targetId: 'nuclearPowerPlant', type: 'enable' },
        {
          target: 'building',
          targetId: 'nuclearPowerPlant',
          type: 'resourceConsumptionMultiplier',
          resourceCategory: 'colony',
          resourceTarget: 'water',
          value: 0
        },
        {
          target: 'building',
          targetId: 'nuclearPowerPlant',
          type: 'resourceProductionMultiplier',
          resourceCategory: 'atmospheric',
          resourceTarget: 'atmosphericWater',
          value: 0
        }
      );
    }
    if (this.cores >= 100) {
      effects.push(
        { target: 'building', targetId: 'superconductorFactory', type: 'enable' },
        { target: 'resource', resourceType: 'colony', targetId: 'superconductors', type: 'enable' }
      );
    }
    if (this.cores >= 1000) {
      effects.push(
        { target: 'building', targetId: 'fusionPowerPlant', type: 'enable' },
        { target: 'resource', resourceType: 'colony', targetId: 'superconductors', type: 'enable' }
      );
    }
    if (this.cores >= 10000) {
      effects.push({ target: 'building', targetId: 'fusionPowerPlant', type: 'productionMultiplier', value: 2 });
    }
    if (this.cores >= 100000) {
      effects.push({ target: 'building', targetId: 'antimatterBattery', type: 'enable' });
    }
    if (this.cores >= 1000000) {
      effects.push(
        { target: 'building', targetId: 'fusionPowerPlant', type: 'productionMultiplier', value: 2 },
        { target: 'building', targetId: 'superalloyFusionReactor', type: 'productionMultiplier', value: 2 }
      );
    }
    if (this.cores >= 10000000) {
      effects.push(
        { target: 'building', targetId: 'superalloyFoundry', type: 'enable' },
        { target: 'resource', resourceType: 'colony', targetId: 'superalloys', type: 'enable' },
        { target: 'building', targetId: 'superalloyFusionReactor', type: 'enable' }
      );
    }
    if (this.cores >= 100000000) {
      effects.push({ target: 'building', targetId: 'superalloyFusionReactor', type: 'productionMultiplier', value: 4 });
    }
    for (let i = 0; i < effects.length; i += 1) {
      const targetId = effects[i].targetId || effects[i].resourceTarget;
      const effectType = effects[i].type || 'effect';
      const enablePriority = effects[i].type === 'enable' ? 3 : undefined;
      addEffect({
        ...effects[i],
        enablePriority,
        effectId: `self-improvement-research-${i}-${targetId}-${effectType}`,
        sourceId: SELF_IMPROVEMENT_EFFECT_SOURCE,
        name: this.displayName
      });
    }
  }

  renderUI(container) {
    const panel = document.createElement('div');
    panel.classList.add('self-improvement-panel');

    const summary = document.createElement('div');
    summary.classList.add('self-improvement-summary');
    const coreBlock = document.createElement('div');
    coreBlock.classList.add('self-improvement-core-block');
    const coreValue = document.createElement('div');
    coreValue.classList.add('self-improvement-core-value');
    const coreLabel = document.createElement('div');
    coreLabel.classList.add('self-improvement-core-label');
    const progressTrack = document.createElement('div');
    progressTrack.classList.add('self-improvement-progress-track');
    const progressFill = document.createElement('div');
    progressFill.classList.add('self-improvement-progress-fill');
    progressTrack.appendChild(progressFill);
    coreBlock.append(coreValue, coreLabel, progressTrack);

    const controls = document.createElement('div');
    controls.classList.add('self-improvement-controls');
    const spendButton = document.createElement('button');
    spendButton.type = 'button';
    spendButton.classList.add('self-improvement-spend-button');
    spendButton.addEventListener('click', () => this.spendStepCores());
    const maxButton = document.createElement('button');
    maxButton.type = 'button';
    maxButton.classList.add('self-improvement-max-button');
    maxButton.addEventListener('click', () => this.spendMaxCores());
    const divideButton = document.createElement('button');
    divideButton.type = 'button';
    divideButton.classList.add('self-improvement-step-button');
    divideButton.textContent = '/10';
    divideButton.addEventListener('click', () => this.setSpendStep(this.spendStep / 10));
    const timesButton = document.createElement('button');
    timesButton.type = 'button';
    timesButton.classList.add('self-improvement-step-button');
    timesButton.textContent = 'x10';
    timesButton.addEventListener('click', () => this.setSpendStep(this.spendStep * 10));
    controls.append(spendButton, maxButton, divideButton, timesButton);
    summary.append(coreBlock, controls);

    const columns = document.createElement('div');
    columns.classList.add('self-improvement-columns');
    const industrialColumn = this.createColumn('industrialTitle', 'Industrial', 'industrial');
    const researchColumn = this.createColumn('researchTitle', 'Research', 'research');
    columns.append(industrialColumn.column, researchColumn.column);

    panel.append(summary, columns);
    container.appendChild(panel);

    this.ui = {
      coreValue,
      coreLabel,
      progressFill,
      spendButton,
      maxButton,
      industrialRows: industrialColumn.rows,
      researchRows: researchColumn.rows
    };
    this.updateUI();
  }

  createColumn(titleKey, fallback, type) {
    const column = document.createElement('div');
    column.classList.add('self-improvement-column', `self-improvement-column-${type}`);
    const title = document.createElement('div');
    title.classList.add('self-improvement-column-title');
    title.textContent = this.getText(titleKey, fallback);
    const rowsContainer = document.createElement('div');
    rowsContainer.classList.add('self-improvement-row-list');
    column.append(title, rowsContainer);

    const rows = {};
    const data = type === 'industrial' ? this.getIndustrialRows() : this.getResearchRows();
    for (let i = 0; i < data.length; i += 1) {
      const row = document.createElement('div');
      row.classList.add('self-improvement-row');
      const label = document.createElement('span');
      label.classList.add('self-improvement-row-label');
      const value = document.createElement('span');
      value.classList.add('self-improvement-row-value');
      row.append(label, value);
      rowsContainer.appendChild(row);
      rows[data[i].id] = { row, label, value };
    }
    return { column, rows };
  }

  updateUI() {
    if (!this.ui) {
      return;
    }
    this.spendStep = this.clampSpendStep(this.spendStep);
    const maxCores = this.getMaxCores();
    const spendable = this.getMaxSpendableCores();
    const selectedSpendAvailable = this.spendStep <= spendable;
    this.ui.coreValue.textContent = formatNumber(this.cores || 0, true);
    this.ui.coreLabel.textContent = this.getText('coreLabel', 'cores / {max}', { max: formatNumber(maxCores, true) });
    this.ui.progressFill.style.width = `${this.getLogProgress(maxCores) * 100}%`;
    this.ui.spendButton.textContent = this.getText('spend', 'Spend {electronics} electronics for {cores} cores', {
      electronics: formatNumber(this.spendStep * SELF_IMPROVEMENT_CORE_COST, true),
      cores: formatNumber(this.spendStep, true)
    });
    this.ui.maxButton.textContent = this.getText('max', 'Max: {cores} cores', { cores: formatNumber(spendable, true) });
    this.ui.spendButton.disabled = !selectedSpendAvailable;
    this.ui.spendButton.classList.toggle('self-improvement-spend-button-unaffordable', !selectedSpendAvailable);
    this.ui.maxButton.disabled = spendable <= 0;

    const industrialRows = this.getIndustrialRows();
    for (let i = 0; i < industrialRows.length; i += 1) {
      const data = industrialRows[i];
      const row = this.ui.industrialRows[data.id];
      row.label.textContent = data.label;
      row.value.textContent = data.value;
    }

    const researchRows = this.getResearchRows();
    for (let i = 0; i < researchRows.length; i += 1) {
      const data = researchRows[i];
      const row = this.ui.researchRows[data.id];
      const unlocked = (this.cores || 0) >= data.threshold;
      row.row.classList.toggle('self-improvement-row-complete', unlocked);
      row.label.textContent = data.label;
      row.value.textContent = unlocked
        ? this.getText('unlocked', 'Unlocked')
        : this.getText('threshold', '{cores} cores', { cores: formatNumber(data.threshold, true) });
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      cores: this.cores || 0,
      spendStep: this.spendStep || 1
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.cores = Math.max(0, Math.min(this.getMaxCores(), state.cores || 0));
    this.spendStep = this.clampSpendStep(state.spendStep || 1);
    this.applyEffects();
  }
}

if (typeof window !== 'undefined') {
  window.SelfImprovementProject = SelfImprovementProject;
}
