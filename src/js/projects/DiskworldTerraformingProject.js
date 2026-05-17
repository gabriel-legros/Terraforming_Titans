const DISKWORLD_GRAVITY = 9.81;
const DISKWORLD_GRAVITATIONAL_CONSTANT = 6.67430e-11;
const DISKWORLD_AU_METERS = 1.496e11;
const DISKWORLD_EARTH_RADIUS_METERS = 6.371e6;
const DISKWORLD_TON_KG = 1000;
const DISKWORLD_PRESSURE_REFERENCE_PA = 101325;
const DISKWORLD_HYDROGEN_GAS_CONSTANT = 4124;
const DISKWORLD_PUMP_TEMPERATURE_K = 293.15;
const DISKWORLD_WATT_DAY_SECONDS = 86400;
const DISKWORLD_RATE_STEP_MIN = 1;
const DISKWORLD_RATE_STEP_MAX = 1e100;
const DISKWORLD_MIN_GRAVITY_RATIO = 0.1;

function getDiskworldText(path, vars, fallback = '') {
  try {
    return t(`ui.projects.diskworldTerraforming.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function createDiskworldStat(labelText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-item ringworld-stat diskworld-stat';
  const label = document.createElement('span');
  label.className = 'stat-label';
  label.textContent = labelText;
  const value = document.createElement('span');
  value.className = 'stat-value';
  wrapper.append(label, value);
  return { wrapper, value };
}

class DiskworldTerraformingProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.hydrogenFilledTons = 0;
    this.pumpRate = config.attributes?.pumpRate || 0;
    this.step = config.attributes?.pumpStep || DISKWORLD_RATE_STEP_MIN;
    this.pumping = false;
    this.shortfallLastTick = false;
    this.actualPumpRate = 0;
    this.currentMassTons = 0;
    this.currentConstructionMassTons = 0;
    this.currentRequiredMassTons = 0;
    this.currentRequiredHydrogenTons = 0;
    this.currentPressurePa = 0;
    this.currentEnergyPerTon = 0;
    this.currentShipEnergyMultiplier = 1;
    this.shipEnergyMultiplierEffect = {
      target: 'projectManager',
      type: 'spaceshipCostMultiplier',
      resourceCategory: 'colony',
      resourceId: 'energy',
      value: 1,
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

  getDiskRadiusAU() {
    return currentPlanetParameters.specialAttributes.diskRadiusAU
      || currentPlanetParameters.specialAttributes.disk?.radiusAU
      || currentPlanetParameters.celestialParameters.distanceFromSun
      || 1;
  }

  getDiskRadiusMeters() {
    return this.getDiskRadiusAU() * DISKWORLD_AU_METERS;
  }

  getTwoSidedAreaM2() {
    const radius = this.getDiskRadiusMeters();
    return 2 * Math.PI * radius * radius;
  }

  getConstructionMassTons() {
    const storedCost = currentPlanetParameters.specialAttributes.diskConstructionCostTons || 0;
    const storedCostIncludesMetal = currentPlanetParameters.specialAttributes.diskConstructionCostIncludesMetal === true;
    if (storedCost > 0 && storedCostIncludesMetal) {
      return storedCost;
    }
    const landHa = calculateDiskLandHectares(this.getDiskRadiusAU());
    const cost = artificialManager.calculateDiskCost(landHa);
    return (cost.superalloys || 0) + (cost.metal || 0);
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

  getOtherResourceMassTons() {
    return this.getResourceMassTons('surface')
      + this.getResourceMassTons('atmospheric')
      + this.getResourceMassTons('colony');
  }

  getRequiredMassTons() {
    const radius = this.getDiskRadiusMeters();
    const requiredKg = (DISKWORLD_GRAVITY * radius * radius) / (2 * DISKWORLD_GRAVITATIONAL_CONSTANT);
    return requiredKg / DISKWORLD_TON_KG;
  }

  refreshMassState() {
    const constructionMass = this.getConstructionMassTons();
    const requiredMass = this.getRequiredMassTons();
    const requiredHydrogen = Math.max(requiredMass - constructionMass, 0);
    if (this.hydrogenFilledTons > requiredHydrogen) {
      this.hydrogenFilledTons = requiredHydrogen;
    }
    this.currentConstructionMassTons = constructionMass;
    this.currentRequiredMassTons = requiredMass;
    this.currentRequiredHydrogenTons = requiredHydrogen;
    this.currentMassTons = constructionMass + this.hydrogenFilledTons + this.getOtherResourceMassTons();
    this.currentPressurePa = this.getHydrogenPressurePa();
    this.currentEnergyPerTon = this.getPumpEnergyPerTon();
    this.currentShipEnergyMultiplier = this.getShipEnergyMultiplier();
    if (!this.isCompleted && requiredHydrogen <= 0) {
      this.complete();
      this.pumping = false;
      this.isActive = false;
    }
    if (!this.isCompleted && requiredHydrogen > 0 && this.hydrogenFilledTons >= requiredHydrogen) {
      this.complete();
      this.pumping = false;
      this.isActive = false;
    }
    this.applyDiskGravity();
  }

  getFillProgressRatio() {
    return this.currentRequiredHydrogenTons > 0
      ? Math.min(this.hydrogenFilledTons / this.currentRequiredHydrogenTons, 1)
      : 1;
  }

  getSurfaceGravityRatio() {
    return this.currentRequiredMassTons > 0
      ? Math.min(this.currentMassTons / this.currentRequiredMassTons, 1)
      : 1;
  }

  getHydrogenPressurePa() {
    const area = this.getTwoSidedAreaM2();
    if (area <= 0 || this.hydrogenFilledTons <= 0) {
      return 0;
    }
    const hydrogenKg = this.hydrogenFilledTons * DISKWORLD_TON_KG;
    const columnMass = hydrogenKg / area;
    const gravity = DISKWORLD_GRAVITY * this.getSurfaceGravityRatio();
    return Math.max(0, columnMass * gravity);
  }

  getPumpEnergyPerTon() {
    const pressure = Math.max(this.currentPressurePa, DISKWORLD_PRESSURE_REFERENCE_PA);
    const ratio = pressure / DISKWORLD_PRESSURE_REFERENCE_PA;
    const joulesPerKg = DISKWORLD_HYDROGEN_GAS_CONSTANT * DISKWORLD_PUMP_TEMPERATURE_K * Math.log(ratio);
    return (joulesPerKg * DISKWORLD_TON_KG) / DISKWORLD_WATT_DAY_SECONDS;
  }

  getShipEnergyMultiplier() {
    const fillFraction = this.currentRequiredMassTons > 0
      ? Math.max(this.currentMassTons / this.currentRequiredMassTons, 0)
      : 1;
    const radiusEarth = this.getDiskRadiusMeters() / DISKWORLD_EARTH_RADIUS_METERS;
    return Math.max(1, fillFraction * radiusEarth);
  }

  applyDiskGravity() {
    const gravity = DISKWORLD_GRAVITY * this.getSurfaceGravityRatio();
    if (terraforming?.celestialParameters) {
      terraforming.celestialParameters.gravity = gravity;
    }
    if (currentPlanetParameters?.celestialParameters) {
      currentPlanetParameters.celestialParameters.gravity = gravity;
    }
  }

  renderUI(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ringworld-terraforming diskworld-terraforming';

    const layout = document.createElement('div');
    layout.className = 'ringworld-terraforming-layout';

    const statusPanel = document.createElement('div');
    statusPanel.className = 'ringworld-terraforming-panel';
    const statusTitle = document.createElement('div');
    statusTitle.className = 'ringworld-section-title';
    statusTitle.textContent = getDiskworldText('fillStatus', null, 'Fill Status');
    statusPanel.appendChild(statusTitle);

    const progressBlock = document.createElement('div');
    progressBlock.className = 'ringworld-terraforming-progress';
    const progressMeta = document.createElement('div');
    progressMeta.className = 'ringworld-terraforming-progress-meta';
    const progressLabel = document.createElement('div');
    progressLabel.className = 'ringworld-terraforming-progress-label';
    const progressEta = document.createElement('div');
    progressEta.className = 'ringworld-terraforming-progress-label ringworld-terraforming-progress-eta';
    const progressBar = document.createElement('div');
    progressBar.className = 'ringworld-terraforming-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'ringworld-terraforming-progress-fill';
    progressBar.appendChild(progressFill);
    progressMeta.append(progressLabel, progressEta);
    progressBlock.append(progressMeta, progressBar);
    statusPanel.appendChild(progressBlock);

    const stats = document.createElement('div');
    stats.className = 'stats-grid five-col ringworld-terraforming-stats';
    const surfaceGravity = createDiskworldStat(getDiskworldText('surfaceGravity', null, 'Surface Gravity:'));
    const fillRate = createDiskworldStat(getDiskworldText('pumpRate', null, 'Pump Rate:'));
    const status = createDiskworldStat(getDiskworldText('status', null, 'Status:'));
    const pressure = createDiskworldStat(getDiskworldText('hydrogenPressure', null, 'Hydrogen Pressure:'));
    const energyPerTon = createDiskworldStat(getDiskworldText('energyPerTon', null, 'Energy per Ton:'));
    const shipMultiplier = createDiskworldStat(getDiskworldText('shipEnergyMultiplier', null, 'Ship Energy Multiplier:'));
    const massTotal = createDiskworldStat(getDiskworldText('diskMass', null, 'Disk Mass:'));
    const hydrogenFilled = createDiskworldStat(getDiskworldText('hydrogenFilled', null, 'Hydrogen Filled:'));
    stats.append(
      surfaceGravity.wrapper,
      fillRate.wrapper,
      status.wrapper,
      pressure.wrapper,
      energyPerTon.wrapper,
      shipMultiplier.wrapper,
      massTotal.wrapper,
      hydrogenFilled.wrapper
    );
    statusPanel.appendChild(stats);

    const controls = document.createElement('div');
    controls.className = 'ringworld-terraforming-controls';
    const pumpContainer = document.createElement('div');
    pumpContainer.className = 'checkbox-container';
    const pumpLabel = document.createElement('label');
    const pumpToggle = document.createElement('input');
    pumpToggle.type = 'checkbox';
    pumpLabel.append(pumpToggle, document.createTextNode(getDiskworldText('pump', null, ' Pump hydrogen')));
    pumpContainer.appendChild(pumpLabel);
    controls.appendChild(pumpContainer);

    const rateReadout = document.createElement('div');
    rateReadout.className = 'ringworld-terraforming-power';
    const rateLabel = document.createElement('span');
    rateLabel.className = 'ringworld-terraforming-power-label';
    rateLabel.textContent = getDiskworldText('targetRate', null, 'Target rate:');
    const rateValue = document.createElement('span');
    rateValue.className = 'stat-value ringworld-terraforming-power-value';
    rateReadout.append(rateLabel, rateValue);
    controls.appendChild(rateReadout);

    const rateControls = document.createElement('div');
    rateControls.className = 'thruster-power-controls ringworld-terraforming-power-controls';
    const mainButtons = document.createElement('div');
    mainButtons.className = 'main-buttons';
    const rateZero = document.createElement('button');
    const rateMinus = document.createElement('button');
    const ratePlus = document.createElement('button');
    rateZero.textContent = getDiskworldText('zero', null, '0');
    mainButtons.append(rateZero, rateMinus, ratePlus);
    const multiplierButtons = document.createElement('div');
    multiplierButtons.className = 'multiplier-container';
    const stepDown = document.createElement('button');
    stepDown.textContent = getDiskworldText('divideTen', null, '/10');
    const stepUp = document.createElement('button');
    stepUp.textContent = getDiskworldText('timesTen', null, 'x10');
    multiplierButtons.append(stepDown, stepUp);
    rateControls.append(mainButtons, multiplierButtons);
    controls.appendChild(rateControls);
    statusPanel.appendChild(controls);

    const notesPanel = document.createElement('div');
    notesPanel.className = 'ringworld-terraforming-panel ringworld-terraforming-notes-panel';
    const notesTitle = document.createElement('div');
    notesTitle.className = 'ringworld-section-title';
    notesTitle.textContent = getDiskworldText('operationalNotes', null, 'Operational Notes');
    notesPanel.appendChild(notesTitle);
    const notes = document.createElement('ul');
    notes.className = 'ringworld-terraforming-notes';
    [
      getDiskworldText('notes.completeFill', null, 'You must fill the disk with hydrogen until structural gravity reaches 1g to complete terraforming.'),
      getDiskworldText('notes.pressure', null, 'Pumping energy uses an isothermal hydrogen compression estimate, so each ton becomes more expensive as internal pressure rises.'),
      getDiskworldText('notes.mass', null, 'Disk mass includes construction mass, filled hydrogen, and all colony, surface, and atmospheric resources measured in tons.'),
      getDiskworldText('notes.shipPenalty', null, 'Spaceship energy cost scales from the total disk mass and updates automatically as mass changes.')
    ].forEach(text => {
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
      fillRate: fillRate.value,
      status: status.value,
      pressure: pressure.value,
      energyPerTon: energyPerTon.value,
      shipMultiplier: shipMultiplier.value,
      massTotal: massTotal.value,
      hydrogenFilled: hydrogenFilled.value,
      progressEta,
      progressLabel,
      progressFill,
      pumpToggle,
      rateValue,
      rateZero,
      rateMinus,
      ratePlus,
      stepDown,
      stepUp
    };

    pumpToggle.addEventListener('change', () => {
      this.setPumping(pumpToggle.checked);
      this.updateUI();
    });
    rateZero.addEventListener('click', () => {
      this.setPumpRate(0);
      this.updateUI();
    });
    rateMinus.addEventListener('click', () => {
      this.adjustPumpRate(-this.step);
      this.updateUI();
    });
    ratePlus.addEventListener('click', () => {
      this.adjustPumpRate(this.step);
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
    this.refreshMassState();
    const progressRatio = this.getFillProgressRatio();
    const progressPercent = progressRatio * 100;
    const remainingHydrogen = Math.max(this.currentRequiredHydrogenTons - this.hydrogenFilledTons, 0);
    const displayRate = this.pumping ? this.actualPumpRate : 0;
    const etaSeconds = displayRate > 0 ? remainingHydrogen / displayRate : Infinity;
    const etaText = this.isCompleted
      ? getDiskworldText('completed', null, 'Completed')
      : (Number.isFinite(etaSeconds) ? formatDuration(etaSeconds) : getDiskworldText('noProgress', null, 'No progress'));
    const statusLabel = this.isCompleted
      ? getDiskworldText('completed', null, 'Completed')
      : (this.pumping
        ? (this.shortfallLastTick ? getDiskworldText('starved', null, 'Starved') : getDiskworldText('pumping', null, 'Pumping'))
        : getDiskworldText('idle', null, 'Idle'));

    this.el.surfaceGravity.textContent = `${formatNumber(this.getSurfaceGravityRatio(), true, 3)}g`;
    this.el.fillRate.textContent = `${formatNumber(displayRate, true)} t/s`;
    this.el.status.textContent = statusLabel;
    this.el.pressure.textContent = `${formatNumber(this.currentPressurePa, true, 3)} Pa`;
    this.el.energyPerTon.textContent = `${formatNumber(this.currentEnergyPerTon, true, 3)} W-day/t`;
    this.el.shipMultiplier.textContent = `${formatNumber(this.currentShipEnergyMultiplier, true, 3)}x`;
    this.el.massTotal.textContent = `${formatNumber(this.currentMassTons, true, 3)} t`;
    this.el.hydrogenFilled.textContent = `${formatNumber(this.hydrogenFilledTons, true, 3)} / ${formatNumber(this.currentRequiredHydrogenTons, true, 3)} t`;
    this.el.progressEta.textContent = getDiskworldText('to100', { value: etaText }, `To 100%: ${etaText}`);
    this.el.progressLabel.textContent = `${formatNumber(progressPercent, true, 1)}%`;
    this.el.progressFill.style.width = `${progressPercent}%`;
    this.el.rateValue.textContent = `${formatNumber(this.pumpRate, true)} t/s`;
    this.el.pumpToggle.checked = this.pumping;
    this.el.pumpToggle.disabled = this.isCompleted;
    this.el.rateZero.disabled = this.isCompleted;
    this.el.rateMinus.disabled = this.isCompleted;
    this.el.ratePlus.disabled = this.isCompleted;
    this.el.stepDown.disabled = this.isCompleted;
    this.el.stepUp.disabled = this.isCompleted;
    this.el.rateMinus.textContent = `-${formatNumber(this.step, true)}`;
    this.el.ratePlus.textContent = `+${formatNumber(this.step, true)}`;
  }

  setPumping(enabled) {
    this.pumping = enabled && !this.isCompleted;
    this.isActive = this.pumping;
  }

  setPumpRate(value) {
    this.pumpRate = Math.max(0, value);
  }

  adjustPumpRate(delta) {
    this.setPumpRate(this.pumpRate + delta);
  }

  adjustStep(multiplier) {
    const next = Math.round(this.step * multiplier);
    this.step = Math.min(Math.max(next, DISKWORLD_RATE_STEP_MIN), DISKWORLD_RATE_STEP_MAX);
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (!this.unlocked || !this.pumping || this.isCompleted || this.pumpRate <= 0) {
      return totals;
    }
    this.refreshMassState();
    const hydrogenRate = this.pumpRate * productivity;
    const energyRate = hydrogenRate * this.currentEnergyPerTon;
    if (applyRates) {
      resources.spaceStorage.hydrogen.modifyRate(-hydrogenRate, this.displayName, 'project');
      resources.colony.energy.modifyRate(-energyRate, this.displayName, 'project');
    }
    totals.cost.spaceStorage = { hydrogen: hydrogenRate * (deltaTime / 1000) };
    totals.cost.colony = { energy: energyRate * (deltaTime / 1000) };
    return totals;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.unlocked || !this.pumping || this.isCompleted || this.pumpRate <= 0) {
      this.shortfallLastTick = false;
      this.actualPumpRate = 0;
      return;
    }
    if (this.autoStart === false) {
      this.estimateCostAndGain(deltaTime, true, productivity);
    }
    this.refreshMassState();
    const seconds = deltaTime / 1000;
    const requestedHydrogen = Math.min(this.pumpRate * seconds * productivity, Math.max(this.currentRequiredHydrogenTons - this.hydrogenFilledTons, 0));
    const requestedEnergy = requestedHydrogen * this.currentEnergyPerTon;
    const pendingHydrogen = accumulatedChanges.spaceStorage.hydrogen || 0;
    const pendingEnergy = accumulatedChanges.colony.energy || 0;
    const availableHydrogen = Math.max(resources.spaceStorage.hydrogen.value + pendingHydrogen, 0);
    const availableEnergy = Math.max(resources.colony.energy.value + pendingEnergy, 0);
    const hydrogenByEnergy = this.currentEnergyPerTon > 0 ? availableEnergy / this.currentEnergyPerTon : requestedHydrogen;
    const usedHydrogen = Math.min(requestedHydrogen, availableHydrogen, hydrogenByEnergy);
    const usedEnergy = usedHydrogen * this.currentEnergyPerTon;
    accumulatedChanges.spaceStorage.hydrogen = pendingHydrogen - usedHydrogen;
    accumulatedChanges.colony.energy = pendingEnergy - usedEnergy;
    this.hydrogenFilledTons += usedHydrogen;
    this.shortfallLastTick = usedHydrogen < requestedHydrogen;
    this.actualPumpRate = seconds > 0 ? usedHydrogen / seconds : 0;
    this.refreshMassState();
  }

  applyEffects() {
    if (!this.unlocked) {
      removeEffect(this.lowGravityTerraformingEffect);
      removeEffect(this.lowGravityLifeEffect);
      return;
    }
    this.refreshMassState();
    this.shipEnergyMultiplierEffect.value = this.currentShipEnergyMultiplier;
    projectManager.addAndReplace(this.shipEnergyMultiplierEffect);
    const gravityRatio = this.getSurfaceGravityRatio();
    if (gravityRatio < DISKWORLD_MIN_GRAVITY_RATIO) {
      addEffect(this.lowGravityTerraformingEffect);
      addEffect(this.lowGravityLifeEffect);
    } else {
      removeEffect(this.lowGravityTerraformingEffect);
      removeEffect(this.lowGravityLifeEffect);
    }
  }

  update() {
    if (!this.unlocked) {
      removeEffect(this.lowGravityTerraformingEffect);
      removeEffect(this.lowGravityLifeEffect);
      return;
    }
    this.applyEffects();
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      pumpRate: this.pumpRate,
      step: this.step,
      pumping: this.pumping === true
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'pumpRate')) {
      this.pumpRate = settings.pumpRate || 0;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'step')) {
      this.step = settings.step || DISKWORLD_RATE_STEP_MIN;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'pumping')) {
      this.pumping = settings.pumping === true;
      this.isActive = this.pumping;
    }
    this.applyEffects();
  }

  saveState() {
    return {
      ...super.saveState(),
      hydrogenFilledTons: this.hydrogenFilledTons,
      pumpRate: this.pumpRate,
      step: this.step,
      pumping: this.pumping,
      currentMassTons: this.currentMassTons
    };
  }

  loadState(state) {
    super.loadState(state);
    this.hydrogenFilledTons = state.hydrogenFilledTons || 0;
    this.pumpRate = state.pumpRate || 0;
    this.step = state.step || DISKWORLD_RATE_STEP_MIN;
    this.pumping = state.pumping === true;
    this.isActive = this.pumping;
    this.currentMassTons = state.currentMassTons || 0;
    this.applyEffects();
  }
}

window.DiskworldTerraformingProject = DiskworldTerraformingProject;
