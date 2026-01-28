const RINGWORLD_TERRAFORM_ENERGY_REQUIRED = 1e21;
const RINGWORLD_SHIP_ENERGY_MULTIPLIER = 0.1;
const RINGWORLD_POWER_STEP_MIN = 1;
const RINGWORLD_POWER_STEP_MAX = 1e100;
const RINGWORLD_GRAVITY = 9.81;
const RINGWORLD_AU_METERS = 1.496e11;
const RINGWORLD_WATT_DAY_SECONDS = 86400;
const RINGWORLD_TON_KG = 1000;
const RINGWORLD_EDGE_VELOCITY_TARGET = 5000;
const RINGWORLD_MIN_SHIP_MULTIPLIER = 0.1;
const RINGWORLD_MIN_GRAVITY_RATIO = 0.1;

function createRingworldStat(labelText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-item ringworld-stat';
  const label = document.createElement('span');
  label.className = 'stat-label';
  label.textContent = labelText;
  const value = document.createElement('span');
  value.className = 'stat-value';
  wrapper.append(label, value);
  return { wrapper, value };
}

function formatWattDays(value) {
  return `${formatNumber(value, true)} W-day`;
}

class RingworldTerraformingProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.energyRequired = config.attributes?.energyRequired || RINGWORLD_TERRAFORM_ENERGY_REQUIRED;
    this.shipEnergyMultiplier = config.attributes?.shipEnergyMultiplier || RINGWORLD_SHIP_ENERGY_MULTIPLIER;
    this.energyInvested = 0;
    this.power = config.attributes?.power || 0;
    this.step = config.attributes?.powerStep || RINGWORLD_POWER_STEP_MIN;
    this.investing = false;
    this.shortfallLastTick = false;
    this.actualInvestRate = 0;
    this.currentMassTons = 0;
    this.lastMassTons = 0;
    this.currentShipEnergyMultiplier = this.shipEnergyMultiplier;
    this.shipEnergyEffect = {
      target: 'projectManager',
      type: 'spaceshipCostMultiplier',
      resourceCategory: 'colony',
      resourceId: 'energy',
      value: this.shipEnergyMultiplier,
      effectId: `${this.name}-ship-energy-multiplier`,
      sourceId: this.name,
      name: this.displayName
    };
    this.lowGravityTerraformingEffect = {
      target: 'terraforming',
      type: 'booleanFlag',
      flagId: 'ringworldLowGravityTerraforming',
      value: true,
      effectId: `${this.name}-low-gravity-terraforming`,
      sourceId: this.name
    };
    this.lowGravityLifeEffect = {
      target: 'lifeManager',
      type: 'booleanFlag',
      flagId: 'ringworldLowGravityLife',
      value: true,
      effectId: `${this.name}-low-gravity-life`,
      sourceId: this.name
    };
    this.el = {};
  }

  shouldHideStartBar() {
    return true;
  }

  getRingOrbitRadiusAU() {
    return currentPlanetParameters.specialAttributes.ringOrbitRadiusAU
      || currentPlanetParameters.celestialParameters.distanceFromSun
      || 1;
  }

  getRingWidthKm() {
    return currentPlanetParameters.specialAttributes.ringWidthKm || 0;
  }

  getConstructionMassTons() {
    const storedCost = currentPlanetParameters.specialAttributes.ringConstructionCostTons || 0;
    if (storedCost > 0) {
      return storedCost;
    }
    const landHa = calculateRingLandHectares(this.getRingOrbitRadiusAU(), this.getRingWidthKm());
    const radiusEarth = artificialManager.calculateRadiusEarthFromLandHectares(landHa);
    const cost = artificialManager.calculateCost(radiusEarth);
    return cost.superalloys || 0;
  }

  getResourceMassTons(category) {
    let total = 0;
    const pool = resources[category];
    for (const key in pool) {
      const resource = pool[key];
      if (resource.unit === 'ton') {
        total += resource.value || 0;
      }
    }
    return total;
  }

  getTotalRingworldMassTons() {
    return this.getConstructionMassTons()
      + this.getResourceMassTons('surface')
      + this.getResourceMassTons('atmospheric')
      + this.getResourceMassTons('colony');
  }

  getSpinEnergyRequirementWattDays(massTons, radiusMeters) {
    const massKg = Math.max(massTons, 0) * RINGWORLD_TON_KG;
    const radius = Math.max(radiusMeters, 0);
    const energyJ = 0.5 * massKg * RINGWORLD_GRAVITY * radius;
    return energyJ / RINGWORLD_WATT_DAY_SECONDS;
  }

  refreshMassAndEnergyRequirement() {
    const massTons = this.getTotalRingworldMassTons();
    const radiusMeters = this.getRingOrbitRadiusAU() * RINGWORLD_AU_METERS;
    const previousRequired = this.energyRequired || 0;
    const requiredEnergy = this.getSpinEnergyRequirementWattDays(massTons, radiusMeters);
    const progressRatio = previousRequired > 0
      ? Math.min(this.energyInvested / previousRequired, 1)
      : 0;
    const energyDelta = requiredEnergy - previousRequired;
    const massDelta = massTons - this.lastMassTons;
    if (!this.isCompleted && this.lastMassTons > 0 && massDelta > 0 && energyDelta > 0) {
      this.energyInvested += progressRatio * energyDelta;
    }
    this.energyRequired = requiredEnergy;
    this.currentMassTons = massTons;
    this.lastMassTons = massTons;
    if (this.isCompleted) {
      this.energyInvested = this.energyRequired;
    }
    if (this.energyInvested > this.energyRequired) {
      this.energyInvested = this.energyRequired;
    }
  }

  getSurfaceGravityRatio() {
    return this.energyRequired > 0 ? Math.min(this.energyInvested / this.energyRequired, 1) : 0;
  }

  getEdgeVelocityMetersPerSecond() {
    const gravityRatio = this.getSurfaceGravityRatio();
    const radiusMeters = this.getRingOrbitRadiusAU() * RINGWORLD_AU_METERS;
    return Math.sqrt(Math.max(0, gravityRatio * RINGWORLD_GRAVITY * radiusMeters));
  }

  getShipEnergyMultiplier() {
    const edgeVelocity = this.getEdgeVelocityMetersPerSecond();
    const scaled = edgeVelocity / RINGWORLD_EDGE_VELOCITY_TARGET;
    return Math.min(1, Math.max(RINGWORLD_MIN_SHIP_MULTIPLIER, scaled));
  }

  renderUI(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ringworld-terraforming';

    const layout = document.createElement('div');
    layout.className = 'ringworld-terraforming-layout';

    const statusPanel = document.createElement('div');
    statusPanel.className = 'ringworld-terraforming-panel';
    const statusTitle = document.createElement('div');
    statusTitle.className = 'ringworld-section-title';
    statusTitle.textContent = 'Spin Status';
    statusPanel.appendChild(statusTitle);

    const progressBlock = document.createElement('div');
    progressBlock.className = 'ringworld-terraforming-progress';
    const progressLabel = document.createElement('div');
    progressLabel.className = 'ringworld-terraforming-progress-label';
    const progressBar = document.createElement('div');
    progressBar.className = 'ringworld-terraforming-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'ringworld-terraforming-progress-fill';
    progressBar.appendChild(progressFill);
    progressBlock.append(progressLabel, progressBar);
    statusPanel.appendChild(progressBlock);

    const stats = document.createElement('div');
    stats.className = 'stats-grid five-col ringworld-terraforming-stats';

    const surfaceGravity = createRingworldStat('Surface Gravity:');
    const rate = createRingworldStat('Invest Rate:');
    const status = createRingworldStat('Status:');
    const shipMultiplier = createRingworldStat('Ship Energy Multiplier:');
    const massTotal = createRingworldStat('Ringworld Mass:');

    stats.append(
      surfaceGravity.wrapper,
      rate.wrapper,
      status.wrapper,
      shipMultiplier.wrapper,
      massTotal.wrapper
    );
    statusPanel.appendChild(stats);

    const controls = document.createElement('div');
    controls.className = 'ringworld-terraforming-controls';

    const investContainer = document.createElement('div');
    investContainer.className = 'checkbox-container';
    const investLabel = document.createElement('label');
    const investToggle = document.createElement('input');
    investToggle.type = 'checkbox';
    investLabel.append(investToggle, document.createTextNode(' Invest'));
    investContainer.appendChild(investLabel);
    controls.appendChild(investContainer);

    const powerReadout = document.createElement('div');
    powerReadout.className = 'ringworld-terraforming-power';
    const powerLabel = document.createElement('span');
    powerLabel.className = 'ringworld-terraforming-power-label';
    powerLabel.textContent = 'Power:';
    const powerValue = document.createElement('span');
    powerValue.className = 'ringworld-terraforming-power-value';
    powerReadout.append(powerLabel, powerValue);
    controls.appendChild(powerReadout);

    const powerControls = document.createElement('div');
    powerControls.className = 'thruster-power-controls ringworld-terraforming-power-controls';

    const mainButtons = document.createElement('div');
    mainButtons.className = 'main-buttons';
    const powerZero = document.createElement('button');
    const powerMinus = document.createElement('button');
    const powerPlus = document.createElement('button');
    powerZero.textContent = '0';
    mainButtons.append(powerZero, powerMinus, powerPlus);

    const multiplierButtons = document.createElement('div');
    multiplierButtons.className = 'multiplier-container';
    const stepDown = document.createElement('button');
    stepDown.textContent = '/10';
    const stepUp = document.createElement('button');
    stepUp.textContent = 'x10';
    multiplierButtons.append(stepDown, stepUp);

    powerControls.append(mainButtons, multiplierButtons);
    controls.appendChild(powerControls);
    statusPanel.appendChild(controls);

    const notesPanel = document.createElement('div');
    notesPanel.className = 'ringworld-terraforming-panel ringworld-terraforming-notes-panel';
    const notesTitle = document.createElement('div');
    notesTitle.className = 'ringworld-section-title';
    notesTitle.textContent = 'Operational Notes';
    notesPanel.appendChild(notesTitle);

    const notes = document.createElement('ul');
    notes.className = 'ringworld-terraforming-notes';
    const noteEntries = [
      'You must completely spin the ringworld to complete its terraforming.',
      'Atmospheric and surface resources are stored until surface gravity reaches 0.1g.',
      'Life will not grow on its own until surface gravity reaches 0.1g.',
      'Faster spin increases spaceship energy costs.'
    ];
    noteEntries.forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      notes.appendChild(item);
    });
    notesPanel.appendChild(notes);

    layout.append(statusPanel, notesPanel);
    wrapper.appendChild(layout);
    container.appendChild(wrapper);

    this.el = {
      surfaceGravity: surfaceGravity.value,
      rate: rate.value,
      status: status.value,
      shipMultiplier: shipMultiplier.value,
      massTotal: massTotal.value,
      progressLabel,
      progressFill,
      investToggle,
      powerValue,
      powerZero,
      powerMinus,
      powerPlus,
      stepDown,
      stepUp
    };

    investToggle.addEventListener('change', () => {
      this.setInvesting(investToggle.checked);
      this.updateUI();
    });

    powerZero.addEventListener('click', () => {
      this.setPower(0);
      this.updateUI();
    });

    powerMinus.addEventListener('click', () => {
      this.adjustPower(-this.step);
      this.updateUI();
    });

    powerPlus.addEventListener('click', () => {
      this.adjustPower(this.step);
      this.updateUI();
    });

    stepDown.addEventListener('click', () => {
      this.adjustStep(0.1);
      this.updateUI();
    });

    stepUp.addEventListener('click', () => {
      this.adjustStep(10);
      this.updateUI();
    });

    this.updateUI();
  }

  updateUI() {
    this.refreshMassAndEnergyRequirement();
    const investedValue = Math.min(this.energyInvested, this.energyRequired);
    const gravityRatio = this.getSurfaceGravityRatio();
    const surfaceGravity = gravityRatio;
    const statusLabel = this.isCompleted
      ? 'Completed'
      : (this.investing ? (this.shortfallLastTick ? 'Starved' : 'Investing') : 'Idle');
    const progressPercent = this.energyRequired > 0
      ? Math.min(100, (investedValue / this.energyRequired) * 100)
      : 0;

    this.el.surfaceGravity.textContent = `${formatNumber(surfaceGravity, true, 2)}g`;
    const displayRate = this.investing ? this.actualInvestRate : 0;
    this.el.rate.textContent = `${formatNumber(displayRate, true)} W`;
    this.el.status.textContent = statusLabel;
    this.el.shipMultiplier.textContent = `${formatNumber(this.currentShipEnergyMultiplier, true, 2)}x`;
    this.el.progressLabel.textContent = `${formatWattDays(investedValue)} / ${formatWattDays(this.energyRequired)} (${formatNumber(progressPercent, true, 1)}%)`;
    this.el.progressFill.style.width = `${progressPercent}%`;
    this.el.powerValue.textContent = `${formatNumber(this.power, true)} W`;
    this.el.massTotal.textContent = `${formatNumber(this.currentMassTons, true)} t`;

    this.el.investToggle.checked = this.investing;
    this.el.investToggle.disabled = this.isCompleted;
    this.el.powerZero.disabled = this.isCompleted;
    this.el.powerMinus.disabled = this.isCompleted;
    this.el.powerPlus.disabled = this.isCompleted;
    this.el.stepDown.disabled = this.isCompleted;
    this.el.stepUp.disabled = this.isCompleted;

    this.el.powerMinus.textContent = `-${formatNumber(this.step, true)}`;
    this.el.powerPlus.textContent = `+${formatNumber(this.step, true)}`;
  }

  setInvesting(enabled) {
    this.investing = enabled && !this.isCompleted;
    this.isActive = this.investing;
  }

  adjustPower(delta) {
    this.power = Math.max(0, this.power + delta);
  }

  setPower(value) {
    this.power = Math.max(0, value);
  }

  adjustStep(multiplier) {
    const next = Math.round(this.step * multiplier);
    this.step = Math.min(Math.max(next, RINGWORLD_POWER_STEP_MIN), RINGWORLD_POWER_STEP_MAX);
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (!this.investing || this.isCompleted || this.power <= 0) {
      return totals;
    }
    if (applyRates) {
      resources.colony.energy.modifyRate(-this.power * productivity, this.displayName, 'project');
    }
    totals.cost.colony = { energy: this.power * (deltaTime / 1000) };
    return totals;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.investing || this.isCompleted || this.power <= 0) {
      this.shortfallLastTick = false;
      this.actualInvestRate = 0;
      return;
    }
    if (this.autoStart === false) {
      resources.colony.energy.modifyRate(-this.power * productivity, this.displayName, 'project');
    }
    const seconds = deltaTime / 1000;
    const requested = this.power * seconds * productivity;
    const pendingEnergy = accumulatedChanges.colony.energy || 0;
    const availableEnergy = Math.max(resources.colony.energy.value + pendingEnergy, 0);
    const used = Math.min(requested, availableEnergy);
    accumulatedChanges.colony.energy = pendingEnergy - used;
    this.energyInvested += used;
    this.shortfallLastTick = used < requested;
    this.actualInvestRate = requested > 0 ? (this.power * (used / requested)) : 0;

    if (this.energyInvested >= this.energyRequired) {
      this.complete();
      this.investing = false;
      this.isActive = false;
      this.actualInvestRate = 0;
      this.updateUI();
    }
  }

  applyEffects() {
    this.refreshMassAndEnergyRequirement();
    this.currentShipEnergyMultiplier = this.getShipEnergyMultiplier();
    this.shipEnergyEffect.value = this.currentShipEnergyMultiplier;
    projectManager.addAndReplace(this.shipEnergyEffect);
    const gravityRatio = this.getSurfaceGravityRatio();
    if (gravityRatio < RINGWORLD_MIN_GRAVITY_RATIO) {
      addEffect(this.lowGravityTerraformingEffect);
      addEffect(this.lowGravityLifeEffect);
    } else {
      removeEffect(this.lowGravityTerraformingEffect);
      removeEffect(this.lowGravityLifeEffect);
    }
  }

  update() {
    if (!this.enabled) {
      removeEffect(this.lowGravityTerraformingEffect);
      removeEffect(this.lowGravityLifeEffect);
      return;
    }
    this.applyEffects();
    if (!this.investing || this.isCompleted) {
      return;
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      energyInvested: this.energyInvested,
      power: this.power,
      step: this.step,
      investing: this.investing,
      currentMassTons: this.currentMassTons,
      lastMassTons: this.lastMassTons,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.energyInvested = state.energyInvested || 0;
    this.power = state.power || 0;
    this.step = state.step || RINGWORLD_POWER_STEP_MIN;
    this.investing = state.investing === true;
    this.isActive = this.investing;
    this.currentMassTons = state.currentMassTons || 0;
    this.lastMassTons = state.lastMassTons || 0;
  }
}

window.RingworldTerraformingProject = RingworldTerraformingProject;
