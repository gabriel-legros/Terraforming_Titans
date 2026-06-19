const MATRIOSHKA_MIN_ADVANCED_RESEARCH = 10_000_000_000_000_000;
const MATRIOSHKA_MIN_DURATION = 60 * 60 * 1000;
const MATRIOSHKA_MAX_DURATION = 25 * MATRIOSHKA_MIN_DURATION;
const MATRIOSHKA_SOURCE_ID = 'matrioshkaBrain';

const MATRIOSHKA_TARGETS = [
  { type: 'building', id: 'glassSmelter', label: 'Glass Smelter' },
  { type: 'building', id: 'hydroponicFarm', label: 'Hydroponics Farm' },
  { type: 'building', id: 'componentFactory', label: 'Components Factory' },
  { type: 'building', id: 'electronicsFactory', label: 'Electronics Factory' },
  { type: 'building', id: 'grapheneFactory', label: 'Graphene Factory' },
  { type: 'building', id: 'superconductorFactory', label: 'Superconductor Factory' },
  { type: 'building', id: 'superalloyFoundry', label: 'Superalloy Foundry' },
  { type: 'building', id: 'androidFactory', label: 'Androids Factory' },
  { type: 'building', id: 'shipyard', label: 'Shipyard' },
  { type: 'building', id: 'cloningFacility', label: 'Cloning Facility' },
  { type: 'building', id: 'superalloyFusionReactor', label: 'Superalloy Fusion Reactor' },
  { type: 'building', id: 'storageDepot', label: 'Storage Depot', storage: true },
  { type: 'building', id: 'antimatterBattery', label: 'Antimatter Battery' },
  { type: 'building', id: 'boschReactor', label: 'Chemical Reactor' },
  { type: 'project', id: 'manufacturingWorld', label: 'Manufacturing World' },
  { type: 'colony', id: 'aerostat_colony', label: 'Aerostat Colony', storage: true },
  { type: 'colony', id: 't7_colony', label: 'Ecumenopolis District', storage: true },
];

function getMatrioshkaText(path, fallback, vars) {
  return t(`ui.projects.matrioshkaBrain.${path}`, vars, fallback);
}

function getMatrioshkaTargetKey(target) {
  return `${target.type}:${target.id}`;
}

function getMatrioshkaTargetFromKey(key) {
  for (let i = 0; i < MATRIOSHKA_TARGETS.length; i += 1) {
    const target = MATRIOSHKA_TARGETS[i];
    if (getMatrioshkaTargetKey(target) === key) {
      return target;
    }
  }
  return MATRIOSHKA_TARGETS[0];
}

function getMatrioshkaCurrentPlanetKey() {
  return spaceManager.getCurrentPlanetKey ? spaceManager.getCurrentPlanetKey() : spaceManager.currentPlanetKey;
}

class MatrioshkaBrainProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.el = {};
    this.bonuses = [];
    this.experiment = null;
    this.selectedTarget = 'random';
    this.investment = MATRIOSHKA_MIN_ADVANCED_RESEARCH;
    this.experimentDuration = MATRIOSHKA_MIN_DURATION;
  }

  isOlympusDisabled() {
    return getMatrioshkaCurrentPlanetKey() === 'olympus';
  }

  isVisible() {
    return (this.unlocked || this.isCompleted || this.repeatCount > 0 || this.bonuses.length > 0) && !this.isPermanentlyDisabled();
  }

  complete() {
    super.complete();
    this.applyEffects();
    this.updateUI();
  }

  getTargetLabel(target) {
    return getMatrioshkaText(`targets.${target.type}.${target.id}`, target.label);
  }

  getSelectedInvestment() {
    const parsed = parseFlexibleNumber(this.el.investmentInput?.value || this.investment);
    return Math.max(MATRIOSHKA_MIN_ADVANCED_RESEARCH, Number.isFinite(parsed) ? parsed : MATRIOSHKA_MIN_ADVANCED_RESEARCH);
  }

  getSelectedDuration() {
    const hours = parseFloat(this.el.durationInput?.value || this.experimentDuration / MATRIOSHKA_MIN_DURATION);
    const clampedHours = Math.max(1, Math.min(25, Number.isFinite(hours) ? hours : 1));
    return Math.min(MATRIOSHKA_MAX_DURATION, clampedHours * MATRIOSHKA_MIN_DURATION);
  }

  getAvailableAdvancedResearch() {
    return resources.colony.advancedResearch.value;
  }

  getProjectedMaxBonus(investment, duration, selectedTarget) {
    const researchFactor = Math.log10(Math.max(investment, MATRIOSHKA_MIN_ADVANCED_RESEARCH) / MATRIOSHKA_MIN_ADVANCED_RESEARCH) + 1;
    const timeFactor = Math.sqrt(duration / MATRIOSHKA_MIN_DURATION);
    const targetFactor = selectedTarget === 'random' ? 1 : 0.5;
    return 0.05 * researchFactor * timeFactor * targetFactor;
  }

  canStartExperiment() {
    return this.isCompleted && !this.experiment && !this.isOlympusDisabled() && this.getAvailableAdvancedResearch() >= this.getSelectedInvestment();
  }

  startExperiment() {
    if (!this.canStartExperiment()) {
      this.updateUI();
      return;
    }

    const investment = this.getSelectedInvestment();
    const duration = this.getSelectedDuration();
    const selectedTarget = this.el.targetSelect?.value || this.selectedTarget;
    resources.colony.advancedResearch.decrease(investment);
    this.investment = investment;
    this.experimentDuration = duration;
    this.selectedTarget = selectedTarget;
    this.experiment = {
      investment,
      duration,
      remainingTime: duration,
      selectedTarget
    };
    this.updateUI();
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (!this.experiment || this.isOlympusDisabled()) {
      return;
    }

    this.experiment.remainingTime = Math.max(0, this.experiment.remainingTime - deltaTime);
    if (this.experiment.remainingTime <= 0) {
      this.completeExperiment();
    }
  }

  completeExperiment() {
    const experiment = this.experiment;
    const selectedTarget = experiment.selectedTarget || 'random';
    const target = selectedTarget === 'random'
      ? MATRIOSHKA_TARGETS[Math.floor(Math.random() * MATRIOSHKA_TARGETS.length)]
      : getMatrioshkaTargetFromKey(selectedTarget);
    const maxBonus = this.getProjectedMaxBonus(experiment.investment, experiment.duration, selectedTarget);
    const bonus = maxBonus * Math.random();
    this.bonuses.push({
      targetType: target.type,
      targetId: target.id,
      value: bonus,
      investment: experiment.investment,
      duration: experiment.duration,
      targeted: selectedTarget !== 'random'
    });
    this.experiment = null;
    this.applyEffects();
    this.updateUI();
  }

  removeEffects() {
    for (let i = 0; i < MATRIOSHKA_TARGETS.length; i += 1) {
      const target = MATRIOSHKA_TARGETS[i];
      removeEffect({ target: target.type, targetId: target.id, sourceId: MATRIOSHKA_SOURCE_ID });
    }
  }

  getBonusTotals() {
    const totals = {};
    for (let i = 0; i < this.bonuses.length; i += 1) {
      const bonus = this.bonuses[i];
      const key = `${bonus.targetType}:${bonus.targetId}`;
      totals[key] = (totals[key] || 0) + bonus.value;
    }
    return totals;
  }

  applyEffects() {
    this.removeEffects();
    if (this.isOlympusDisabled()) {
      return;
    }

    const totals = this.getBonusTotals();
    for (let i = 0; i < MATRIOSHKA_TARGETS.length; i += 1) {
      const target = MATRIOSHKA_TARGETS[i];
      const key = getMatrioshkaTargetKey(target);
      const value = totals[key] || 0;
      if (!(value > 0)) {
        continue;
      }
      addEffect({
        target: target.type,
        targetId: target.id,
        type: 'throughputMultiplier',
        value,
        sourceId: MATRIOSHKA_SOURCE_ID,
        effectId: `${MATRIOSHKA_SOURCE_ID}-${key}-throughput`,
        name: getMatrioshkaText('effectName', 'Matrioshka Brain')
      });
      if (target.storage) {
        addEffect({
          target: target.type,
          targetId: target.id,
          type: 'storageMultiplier',
          value: 1 + value,
          sourceId: MATRIOSHKA_SOURCE_ID,
          effectId: `${MATRIOSHKA_SOURCE_ID}-${key}-storage`,
          name: getMatrioshkaText('effectName', 'Matrioshka Brain')
        });
      }
    }
  }

  renderUI(container) {
    const panel = document.createElement('div');
    panel.className = 'matrioshka-brain-panel';
    const header = document.createElement('div');
    header.className = 'matrioshka-brain-header';
    const title = document.createElement('span');
    title.className = 'matrioshka-brain-title';
    title.textContent = getMatrioshkaText('title', 'Matrioshka Brain');
    const info = document.createElement('span');
    info.className = 'info-tooltip-icon';
    info.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(info, getMatrioshkaText('tooltip', 'Run cognition cycles by spending advanced research and time. Throughput increases both production and consumption. Random targets receive the full roll; chosen targets receive half as much.'));
    header.append(title, info);

    const controls = document.createElement('div');
    controls.className = 'matrioshka-brain-controls';
    const investmentLabel = this.createInputField('investment', 'Advanced research', 'text');
    const durationLabel = this.createInputField('duration', 'Hours', 'number');
    const targetLabel = document.createElement('label');
    targetLabel.className = 'matrioshka-brain-field matrioshka-brain-target-field';
    const targetText = document.createElement('span');
    targetText.textContent = getMatrioshkaText('target', 'Target');
    const targetSelect = document.createElement('select');
    const randomOption = document.createElement('option');
    randomOption.value = 'random';
    randomOption.textContent = getMatrioshkaText('randomTarget', 'Random');
    targetSelect.appendChild(randomOption);
    for (let i = 0; i < MATRIOSHKA_TARGETS.length; i += 1) {
      const target = MATRIOSHKA_TARGETS[i];
      const option = document.createElement('option');
      option.value = getMatrioshkaTargetKey(target);
      option.textContent = this.getTargetLabel(target);
      targetSelect.appendChild(option);
    }
    targetSelect.value = this.selectedTarget;
    targetSelect.addEventListener('change', () => {
      this.selectedTarget = targetSelect.value;
      this.updateUI();
    });
    targetLabel.append(targetText, targetSelect);
    controls.append(investmentLabel.wrapper, durationLabel.wrapper, targetLabel);

    const summary = document.createElement('div');
    summary.className = 'matrioshka-brain-summary';
    const projected = document.createElement('span');
    const available = document.createElement('span');
    summary.append(projected, available);
    const startButton = document.createElement('button');
    startButton.className = 'progress-button matrioshka-brain-start';
    startButton.type = 'button';
    startButton.addEventListener('click', () => this.startExperiment());

    const active = document.createElement('div');
    active.className = 'matrioshka-brain-active';
    const activeText = document.createElement('span');
    const activeTrack = document.createElement('div');
    activeTrack.className = 'matrioshka-brain-progress-track';
    const activeFill = document.createElement('div');
    activeFill.className = 'matrioshka-brain-progress-fill';
    activeTrack.appendChild(activeFill);
    active.append(activeText, activeTrack);

    const ledger = document.createElement('div');
    ledger.className = 'matrioshka-brain-ledger';
    const ledgerTitle = document.createElement('span');
    ledgerTitle.className = 'matrioshka-brain-ledger-title';
    ledgerTitle.textContent = getMatrioshkaText('bonuses', 'Stored bonuses');
    const ledgerRows = document.createElement('div');
    ledgerRows.className = 'matrioshka-brain-ledger-rows';
    ledger.append(ledgerTitle, ledgerRows);
    panel.append(header, controls, summary, startButton, active, ledger);
    container.appendChild(panel);

    this.el = {
      panel,
      investmentInput: investmentLabel.input,
      durationInput: durationLabel.input,
      targetSelect,
      projected,
      available,
      startButton,
      active,
      activeText,
      activeFill,
      ledger,
      ledgerRows,
      ledgerRowCache: new Map()
    };
    this.el.investmentInput.value = formatNumber(this.investment, true);
    this.el.durationInput.min = '1';
    this.el.durationInput.max = '25';
    this.el.durationInput.step = '1';
    this.el.durationInput.value = String(this.experimentDuration / MATRIOSHKA_MIN_DURATION);
    this.el.investmentInput.addEventListener('change', () => {
      this.investment = this.getSelectedInvestment();
      this.el.investmentInput.value = formatNumber(this.investment, true);
      this.updateUI();
    });
    this.el.durationInput.addEventListener('change', () => {
      this.experimentDuration = this.getSelectedDuration();
      this.el.durationInput.value = String(this.experimentDuration / MATRIOSHKA_MIN_DURATION);
      this.updateUI();
    });
    this.updateUI();
  }

  createInputField(path, fallback, type) {
    const wrapper = document.createElement('label');
    wrapper.className = 'matrioshka-brain-field';
    const label = document.createElement('span');
    label.textContent = getMatrioshkaText(path, fallback);
    const input = document.createElement('input');
    input.type = type;
    wrapper.append(label, input);
    return { wrapper, input };
  }

  updateLedger() {
    const rows = this.el.ledgerRows;
    const cache = this.el.ledgerRowCache;
    if (!rows || !cache) {
      return;
    }

    const totals = this.getBonusTotals();
    const activeKeys = new Set();
    for (let i = 0; i < MATRIOSHKA_TARGETS.length; i += 1) {
      const target = MATRIOSHKA_TARGETS[i];
      const key = getMatrioshkaTargetKey(target);
      const value = totals[key] || 0;
      if (!(value > 0)) {
        continue;
      }
      activeKeys.add(key);
      let row = cache.get(key);
      if (!row) {
        row = document.createElement('div');
        row.className = 'matrioshka-brain-ledger-row';
        const label = document.createElement('span');
        const amount = document.createElement('span');
        amount.className = 'matrioshka-brain-ledger-value';
        row.append(label, amount);
        row._refs = { label, amount };
        cache.set(key, row);
      }
      row._refs.label.textContent = this.getTargetLabel(target);
      row._refs.amount.textContent = getMatrioshkaText('bonusValue', '+{value}% production and consumption throughput', { value: formatNumber(value * 100, false, 2) });
      rows.appendChild(row);
      row.style.display = '';
    }

    cache.forEach((row, key) => {
      if (!activeKeys.has(key)) {
        row.remove();
        cache.delete(key);
      }
    });
    this.el.ledger.style.display = activeKeys.size > 0 ? '' : 'none';
  }

  updateUI() {
    const el = this.el;
    if (!el.panel) {
      return;
    }

    const ready = this.isCompleted || this.repeatCount > 0;
    el.panel.style.display = ready ? '' : 'none';
    if (!ready) {
      return;
    }

    const olympusDisabled = this.isOlympusDisabled();
    const investment = this.getSelectedInvestment();
    const duration = this.getSelectedDuration();
    const selectedTarget = el.targetSelect.value || 'random';
    const maxBonus = this.getProjectedMaxBonus(investment, duration, selectedTarget);
    el.projected.textContent = getMatrioshkaText('projected', 'Max roll: +{value}% production and consumption throughput', { value: formatNumber(maxBonus * 100, false, 2) });
    el.available.textContent = getMatrioshkaText('available', 'Available: {value}', { value: formatNumber(this.getAvailableAdvancedResearch(), true) });

    const running = this.experiment !== null;
    el.investmentInput.disabled = running || olympusDisabled;
    el.durationInput.disabled = running || olympusDisabled;
    el.targetSelect.disabled = running || olympusDisabled;
    el.startButton.disabled = !this.canStartExperiment();
    el.startButton.classList.toggle('matrioshka-brain-start--running', running);
    el.startButton.style.background = '';
    if (olympusDisabled) {
      el.startButton.textContent = getMatrioshkaText('disabledOlympus', 'Disabled on Olympus');
    } else if (running) {
      el.startButton.disabled = true;
    } else {
      el.startButton.textContent = getMatrioshkaText('start', 'Start cognition cycle');
    }

    el.active.style.display = 'none';
    if (running) {
      const remaining = this.experiment.remainingTime;
      const total = this.experiment.duration;
      const progress = total > 0 ? 1 - remaining / total : 1;
      const percent = Math.max(0, Math.min(1, progress)) * 100;
      el.startButton.style.background = `linear-gradient(90deg, #47b5a5 ${percent}%, #2f3847 ${percent}%)`;
      el.startButton.textContent = getMatrioshkaText('active', '{time} remaining', { time: formatDuration(Math.ceil(remaining / 1000)) });
    }
    this.updateLedger();
  }

  saveState() {
    return {
      ...super.saveState(),
      bonuses: this.bonuses,
      experiment: this.experiment,
      selectedTarget: this.selectedTarget,
      investment: this.investment,
      experimentDuration: this.experimentDuration
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.bonuses = Array.isArray(state.bonuses) ? state.bonuses : [];
    this.experiment = state.experiment || null;
    this.selectedTarget = state.selectedTarget || 'random';
    this.investment = state.investment || MATRIOSHKA_MIN_ADVANCED_RESEARCH;
    this.experimentDuration = state.experimentDuration || MATRIOSHKA_MIN_DURATION;
    this.applyEffects();
  }

  saveTravelState() {
    return {
      ...super.saveTravelState(),
      bonuses: this.bonuses,
      experiment: this.experiment,
      selectedTarget: this.selectedTarget,
      investment: this.investment,
      experimentDuration: this.experimentDuration
    };
  }

  loadTravelState(state = {}) {
    super.loadTravelState(state);
    this.bonuses = Array.isArray(state.bonuses) ? state.bonuses : [];
    this.experiment = state.experiment || null;
    this.selectedTarget = state.selectedTarget || 'random';
    this.investment = state.investment || MATRIOSHKA_MIN_ADVANCED_RESEARCH;
    this.experimentDuration = state.experimentDuration || MATRIOSHKA_MIN_DURATION;
    this.applyEffects();
  }
}

window.MatrioshkaBrainProject = MatrioshkaBrainProject;
