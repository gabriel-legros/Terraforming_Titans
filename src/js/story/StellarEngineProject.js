const STELLAR_ENGINE_SOURCE_ID = 'stellarEngineProject';
const STELLAR_ENGINE_FLUX_EFFECT_ID = 'stellar-engine-stellar-flux';
const STELLAR_ENGINE_POPULATION_EFFECT_ID = 'stellar-engine-population-growth';
const STELLAR_ENGINE_MAINTENANCE_EFFECT_ID = 'stellar-engine-maintenance';
const STELLAR_ENGINE_STARS = ['Tee', 'Bee', 'Pee'];

function getStellarEngineText(path, vars, fallback = '') {
  try {
    return t(`ui.projects.stellarEngine.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class StellarEngineProject extends ArtificialSkyProject {
  constructor(config, name) {
    super(config, name);
    this.kesslerDebrisSize = null;
    this.autoContinuousOperation = true;
    this.engineBuilt = false;
    this.stabilized = false;
    this.cooldownRemaining = 0;
    this.eventRemaining = 0;
    this.eventDuration = 0;
    this.eventStar = '';
    this.lastSyncedIntensity = -1;
    this.ui = null;
  }

  getConfig() {
    return this.attributes.stellarEngine || {};
  }

  getCostRateLabel() {
    return getStellarEngineText('costRateLabel', null, 'Stellar Engine');
  }

  getMaxRepeats() {
    const segments = Math.max(1, Math.floor(this.getConfig().segmentCount || 100_000_000));
    this.maxRepeatCount = segments;
    return segments;
  }

  getScaledCost() {
    return Project.prototype.getScaledCost.call(this);
  }

  getBuiltSegmentsWithProgress() {
    if (this.engineBuilt || this.stabilized || this.isCompleted) {
      return this.getMaxRepeats();
    }
    return super.getBuiltSegmentsWithProgress();
  }

  canStart() {
    if (this.engineBuilt || this.stabilized || this.isCompleted) {
      return false;
    }
    return super.canStart();
  }

  canContinue() {
    return !this.engineBuilt && !this.stabilized && !this.isCompleted && this.repeatCount < this.getMaxRepeats();
  }

  completeProjectFully() {
    const maxSegments = this.getMaxRepeats();
    this.engineBuilt = true;
    this.hasCompletedOnce = true;
    this.repeatCount = maxSegments;
    this.segmentProgress = 0;
    this.isCompleted = false;
    this.isActive = false;
    this.isPaused = false;
    this.remainingTime = 0;
    this.startingDuration = 0;
  }

  applyArtificialSkyCompletionEffects() {}

  applySpaceMirrorDisableEffect() {}

  applyMagneticShieldDisableEffect() {}

  getRandomRange(minValue, maxValue) {
    const min = Math.max(0, minValue || 0);
    const max = Math.max(min, maxValue || min);
    return min + Math.random() * (max - min);
  }

  resetCooldown() {
    const config = this.getConfig();
    this.cooldownRemaining = this.getRandomRange(config.cooldownMinMs, config.cooldownMaxMs);
  }

  startFluxEvent() {
    const config = this.getConfig();
    this.eventDuration = this.getRandomRange(config.eventDurationMinMs, config.eventDurationMaxMs);
    this.eventRemaining = this.eventDuration;
    this.eventStar = STELLAR_ENGINE_STARS[Math.floor(Math.random() * STELLAR_ENGINE_STARS.length)];
    this.cooldownRemaining = 0;
  }

  getEventElapsed() {
    return Math.max(0, this.eventDuration - this.eventRemaining);
  }

  getEventIntensity() {
    if (!(this.eventRemaining > 0) || !(this.eventDuration > 0)) {
      return 0;
    }
    const elapsed = this.getEventElapsed();
    const phase = this.eventDuration / 3;
    if (elapsed < phase) {
      return Math.max(0, Math.min(1, elapsed / phase));
    }
    if (elapsed < phase * 2) {
      return 1;
    }
    return Math.max(0, Math.min(1, (this.eventDuration - elapsed) / phase));
  }

  isInstabilityActive() {
    return this.unlocked && !this.stabilized && !this.isCompleted;
  }

  syncFluxEffects() {
    const intensity = this.isInstabilityActive() ? this.getEventIntensity() : 0;
    if (Math.abs(intensity - this.lastSyncedIntensity) < 0.000001) {
      return;
    }
    this.lastSyncedIntensity = intensity;

    if (intensity <= 0) {
      this.clearFluxEffects();
      return;
    }

    const config = this.getConfig();
    const maintenanceMultiplier = 1 + intensity * ((config.maxMaintenanceMultiplier || 100) - 1);
    const effectName = getStellarEngineText('eventName', null, 'Chaotic stellar flux');

    addEffect({
      target: 'terraforming',
      type: 'stellarFluxAddition',
      value: intensity * (config.maxAddedStellarFlux || 0),
      effectId: STELLAR_ENGINE_FLUX_EFFECT_ID,
      sourceId: STELLAR_ENGINE_SOURCE_ID,
      name: effectName
    });

    addEffect({
      target: 'population',
      type: 'growthMultiplier',
      value: Math.max(0, 1 - intensity * 0.10),
      effectId: STELLAR_ENGINE_POPULATION_EFFECT_ID,
      sourceId: STELLAR_ENGINE_SOURCE_ID,
      name: effectName
    });

    for (const id in buildings) {
      addEffect({
        target: 'building',
        targetId: id,
        type: 'maintenanceMultiplier',
        value: maintenanceMultiplier,
        effectId: STELLAR_ENGINE_MAINTENANCE_EFFECT_ID,
        sourceId: STELLAR_ENGINE_SOURCE_ID,
        name: effectName
      });
    }

    for (const id in colonies) {
      addEffect({
        target: 'colony',
        targetId: id,
        type: 'maintenanceMultiplier',
        value: maintenanceMultiplier,
        effectId: STELLAR_ENGINE_MAINTENANCE_EFFECT_ID,
        sourceId: STELLAR_ENGINE_SOURCE_ID,
        name: effectName
      });
    }

    terraforming.updateLuminosity();
  }

  clearFluxEffects() {
    removeEffect({ target: 'terraforming', sourceId: STELLAR_ENGINE_SOURCE_ID });
    removeEffect({ target: 'population', sourceId: STELLAR_ENGINE_SOURCE_ID });
    for (const id in buildings) {
      removeEffect({ target: 'building', targetId: id, sourceId: STELLAR_ENGINE_SOURCE_ID });
    }
    for (const id in colonies) {
      removeEffect({ target: 'colony', targetId: id, sourceId: STELLAR_ENGINE_SOURCE_ID });
    }
    terraforming.updateLuminosity();
  }

  applyResourceAttrition(resource, fraction, source, rateType) {
    if (!resource || !(resource.value > 0) || !(fraction > 0)) {
      return 0;
    }
    const loss = Math.min(resource.value, resource.value * fraction);
    if (loss > 0) {
      resource.decrease(loss);
      resource.modifyRate(-loss / this.currentAttritionSeconds, source, rateType);
    }
    return loss;
  }

  applyBiomassAttrition(fraction, source) {
    const biomass = resources.surface.biomass;
    if (!biomass || !(biomass.value > 0) || !(fraction > 0)) {
      return;
    }
    const loss = Math.min(biomass.value, biomass.value * fraction);
    if (!(loss > 0)) {
      return;
    }
    const zones = getZones();
    let totalZonalBiomass = 0;
    for (const zone of zones) {
      totalZonalBiomass += terraforming.zonalSurface[zone]?.biomass || 0;
    }
    if (totalZonalBiomass > 0) {
      for (const zone of zones) {
        const zoneBiomass = terraforming.zonalSurface[zone]?.biomass || 0;
        const zoneLoss = Math.min(zoneBiomass, loss * (zoneBiomass / totalZonalBiomass));
        terraforming.zonalSurface[zone].biomass = Math.max(0, zoneBiomass - zoneLoss);
      }
    }
    biomass.decrease(loss);
    biomass.modifyRate(-loss / this.currentAttritionSeconds, source, 'project');
  }

  applyNanobotAttrition(fraction) {
    if (!nanotechManager || !(nanotechManager.nanobots > 1) || !(fraction > 0)) {
      return;
    }
    const loss = Math.min(nanotechManager.nanobots - 1, nanotechManager.nanobots * fraction);
    if (loss > 0) {
      nanotechManager.nanobots = Math.max(1, nanotechManager.nanobots - loss);
    }
  }

  applyFluxAttrition(deltaTime, intensity) {
    if (!(intensity > 0) || !(deltaTime > 0)) {
      return;
    }
    const seconds = deltaTime / 1000;
    const perSecond = this.getConfig().decayPerSecond || 0.10;
    const fraction = Math.max(0, perSecond * intensity * seconds);
    const source = getStellarEngineText('eventName', null, 'Chaotic stellar flux');
    this.currentAttritionSeconds = seconds;
    this.applyResourceAttrition(resources.colony.colonists, fraction, source, 'population');
    this.applyResourceAttrition(resources.colony.androids, fraction, source, 'project');
    this.applyBiomassAttrition(fraction, source);
    this.applyNanobotAttrition(fraction);
    this.currentAttritionSeconds = 1;
  }

  updateInstability(deltaTime) {
    if (!this.isInstabilityActive()) {
      this.clearFluxEffects();
      return;
    }

    if (this.cooldownRemaining <= 0 && this.eventRemaining <= 0) {
      this.resetCooldown();
    }

    if (this.eventRemaining > 0) {
      const intensity = this.getEventIntensity();
      this.syncFluxEffects();
      this.applyFluxAttrition(deltaTime, intensity);
      this.eventRemaining = Math.max(0, this.eventRemaining - deltaTime);
      if (this.eventRemaining <= 0) {
        this.eventRemaining = 0;
        this.eventDuration = 0;
        this.eventStar = '';
        this.resetCooldown();
        this.syncFluxEffects();
      }
      return;
    }

    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaTime);
    if (this.cooldownRemaining <= 0) {
      this.startFluxEvent();
    }
    this.syncFluxEffects();
  }

  update(deltaTime) {
    this.updateInstability(deltaTime);
    if (this.engineBuilt || this.stabilized || this.isCompleted) {
      return;
    }
    super.update(deltaTime);
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (this.engineBuilt || this.stabilized || this.isCompleted) {
      return;
    }
    super.applyCostAndGain(deltaTime, accumulatedChanges, productivity);
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    if (this.engineBuilt || this.stabilized || this.isCompleted) {
      return { cost: {}, gain: {} };
    }
    return super.estimateProjectCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
  }

  getEjectionCost() {
    return this.getConfig().ejectionCost || { colony: { energy: 1e30 } };
  }

  canEjectPee() {
    if (!this.engineBuilt || this.stabilized || this.isCompleted) {
      return false;
    }
    const cost = this.getEjectionCost();
    for (const category in cost) {
      for (const resource in cost[category]) {
        if ((resources[category][resource].value || 0) < cost[category][resource]) {
          return false;
        }
      }
    }
    return true;
  }

  ejectPee() {
    if (!this.canEjectPee()) {
      return;
    }
    const cost = this.getEjectionCost();
    for (const category in cost) {
      for (const resource in cost[category]) {
        resources[category][resource].decrease(cost[category][resource]);
      }
    }
    this.stabilized = true;
    this.engineBuilt = true;
    this.isCompleted = true;
    this.isActive = false;
    this.isPaused = false;
    this.eventRemaining = 0;
    this.eventDuration = 0;
    this.cooldownRemaining = 0;
    this.eventStar = '';
    this.clearFluxEffects();
    projectManager.markUIDirty();
  }

  createProjectDetailsGridUI(container) {
    const section = document.createElement('div');
    section.classList.add('project-section-container', 'stellar-engine-status-section');

    const createPanel = (key, titleText, gridClass) => {
      const panel = document.createElement('div');
      panel.classList.add('stellar-engine-panel');
      panel.dataset.stellarEnginePanel = key;
      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = titleText;
      const body = document.createElement('div');
      body.classList.add('card-body', 'stellar-engine-panel-body');
      const grid = document.createElement('div');
      grid.classList.add('stats-grid', gridClass, 'project-summary-grid', 'stellar-engine-summary-grid');
      header.appendChild(title);
      body.appendChild(grid);
      panel.append(header, body);
      section.appendChild(panel);
      return { panel, body, grid };
    };

    const addStatBox = (grid, labelText) => {
      const box = document.createElement('div');
      box.classList.add('stat-item', 'project-summary-box');
      const label = document.createElement('span');
      label.classList.add('stat-label');
      label.textContent = labelText;
      const value = document.createElement('span');
      value.classList.add('stat-value', 'stellar-engine-stat-value');
      box.append(label, value);
      grid.appendChild(box);
      return value;
    };

    const fluxPanel = createPanel('flux', getStellarEngineText('cards.flux', null, 'Chaos'), 'four-col');
    const buildPanel = createPanel('construction', getStellarEngineText('cards.construction', null, 'Construction'), 'three-col');
    const ejectionPanel = createPanel('ejection', getStellarEngineText('cards.ejection', null, 'Ejection'), 'two-col');

    const ejectionButton = document.createElement('button');
    ejectionButton.type = 'button';
    ejectionButton.classList.add('progress-button', 'stellar-engine-eject-button');
    ejectionButton.addEventListener('click', () => this.ejectPee());

    const ejectionNote = document.createElement('div');
    ejectionNote.classList.add('stellar-engine-ejection-note');

    projectElements[this.name] = {
      ...projectElements[this.name],
      stellarFluxState: addStatBox(fluxPanel.grid, getStellarEngineText('labels.state', null, 'State')),
      stellarFluxStar: addStatBox(fluxPanel.grid, getStellarEngineText('labels.star', null, 'Star')),
      stellarFluxAddition: addStatBox(fluxPanel.grid, getStellarEngineText('labels.addedFlux', null, 'Added flux')),
      stellarFluxPenalty: addStatBox(fluxPanel.grid, getStellarEngineText('labels.penalties', null, 'Penalties')),
      stellarSegments: addStatBox(buildPanel.grid, getStellarEngineText('labels.segments', null, 'Segments')),
      stellarBuildRate: addStatBox(buildPanel.grid, getStellarEngineText('labels.buildRate', null, 'Build rate')),
      stellarSegmentCost: addStatBox(buildPanel.grid, getStellarEngineText('labels.segmentCost', null, 'Segment cost')),
      stellarEjectionState: addStatBox(ejectionPanel.grid, getStellarEngineText('labels.state', null, 'State')),
      stellarEjectionCost: addStatBox(ejectionPanel.grid, getStellarEngineText('labels.cost', null, 'Cost')),
      stellarEjectionNote: ejectionNote,
      stellarConstructionBody: buildPanel.body,
      stellarEjectionButton: ejectionButton
    };

    ejectionPanel.body.appendChild(ejectionNote);
    ejectionPanel.body.appendChild(ejectionButton);
    container.appendChild(section);
  }

  renderUI(container) {
    super.renderUI(container);
    const topSection = container.querySelector('.project-top-section');
    if (topSection) {
      topSection.classList.add('stellar-engine-top-section');
      const elements = projectElements[this.name];
      const assignmentSection = topSection.querySelector('.project-section-container:not(.stellar-engine-status-section)');
      if (assignmentSection && elements.stellarConstructionBody) {
        elements.stellarConstructionBody.appendChild(assignmentSection);
      }
    }
  }

  formatTime(ms) {
    return formatDuration(Math.max(0, ms) / 1000, true);
  }

  updateCostAndGains(elements) {
    if (!elements) {
      return;
    }
    const intensity = this.getEventIntensity();
    const config = this.getConfig();
    if (elements.costPerShipElement) {
      elements.costPerShipElement.style.display = 'none';
    }
    if (elements.resourceGainPerShipElement) {
      elements.resourceGainPerShipElement.style.display = 'none';
    }
    if (elements.stellarFluxState) {
      if (this.stabilized || this.isCompleted) {
        elements.stellarFluxState.textContent = getStellarEngineText('status.stabilized', null, 'System stabilized');
      } else if (this.eventRemaining > 0) {
        elements.stellarFluxState.textContent = getStellarEngineText('status.active', { time: this.formatTime(this.eventRemaining) }, `Active: ${this.formatTime(this.eventRemaining)}`);
      } else {
        elements.stellarFluxState.textContent = getStellarEngineText('status.cooldown', { time: this.formatTime(this.cooldownRemaining) }, `Cooldown: ${this.formatTime(this.cooldownRemaining)}`);
      }
    }
    if (elements.stellarFluxStar) {
      elements.stellarFluxStar.textContent = this.eventRemaining > 0
        ? (this.eventStar || getStellarEngineText('unknownStar', null, 'Unknown'))
        : getStellarEngineText('none', null, 'None');
    }
    if (elements.stellarFluxAddition) {
      const addedFlux = intensity * (config.maxAddedStellarFlux || 0);
      elements.stellarFluxAddition.textContent = `${formatNumber(addedFlux, true, 2)} W/m2`;
    }
    if (elements.stellarFluxPenalty) {
      const maintenance = 1 + intensity * ((config.maxMaintenanceMultiplier || 100) - 1);
      const decayPercent = (config.decayPerSecond || 0.10) * intensity * 100;
      elements.stellarFluxPenalty.textContent = getStellarEngineText(
        'penaltySummary',
        {
          maintenance: formatNumber(maintenance, false, 2),
          decay: formatNumber(decayPercent, false, 2)
        },
        `x${formatNumber(maintenance, false, 2)} maintenance, ${formatNumber(decayPercent, false, 2)}%/s attrition`
      );
    }
    if (elements.stellarSegments) {
      const built = this.getBuiltSegmentsWithProgress();
      const maxSegments = this.getMaxRepeats();
      elements.stellarSegments.textContent = `${formatNumber(built, true, 3)} / ${formatNumber(maxSegments, true, 3)}`;
    }
    if (elements.stellarBuildRate) {
      elements.stellarBuildRate.textContent = `${formatNumber(this.getSegmentsPerSecond(), true, 3)} segments/s`;
    }
    if (elements.stellarSegmentCost) {
      updateTotalCostDisplayElement(
        elements.stellarSegmentCost,
        this.calculateSpaceshipCost(),
        this,
        false,
        ' '
      );
    }
    if (elements.stellarEjectionState) {
      if (this.isCompleted) {
        elements.stellarEjectionState.textContent = getStellarEngineText('status.complete', null, 'Pee ejected');
      } else if (this.engineBuilt) {
        elements.stellarEjectionState.textContent = getStellarEngineText('status.readyToEject', null, 'Ready');
      } else {
        elements.stellarEjectionState.textContent = getStellarEngineText('status.locked', null, 'Build engine first');
      }
    }
    if (elements.stellarEjectionCost) {
      updateTotalCostDisplayElement(
        elements.stellarEjectionCost,
        this.getEjectionCost(),
        this,
        false,
        ' '
      );
    }
    if (elements.stellarEjectionNote) {
      elements.stellarEjectionNote.textContent = getStellarEngineText(
        'ejectionNote',
        null,
        'Energy must be delivered all at once if we aim to succeed.'
      );
    }
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements) {
      return;
    }
    if (elements.stellarEjectionButton) {
      const canEject = this.canEjectPee();
      elements.stellarEjectionButton.textContent = getStellarEngineText('ejectButton', null, 'Eject Pee');
      elements.stellarEjectionButton.disabled = !canEject;
      elements.stellarEjectionButton.style.background = this.engineBuilt && !this.isCompleted
        ? getStatusColor(canEject ? 'success' : 'failure')
        : '';
      elements.stellarEjectionButton.style.display = this.isCompleted ? 'none' : '';
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      engineBuilt: this.engineBuilt === true,
      stabilized: this.stabilized === true,
      cooldownRemaining: this.cooldownRemaining,
      eventRemaining: this.eventRemaining,
      eventDuration: this.eventDuration,
      eventStar: this.eventStar
    };
  }

  loadState(state) {
    super.loadState(state);
    this.engineBuilt = state.engineBuilt === true || (state.repeatCount || 0) >= this.getMaxRepeats();
    this.stabilized = state.stabilized === true || state.isCompleted === true;
    this.isCompleted = this.stabilized;
    this.hasCompletedOnce = this.engineBuilt;
    this.cooldownRemaining = state.cooldownRemaining || 0;
    this.eventRemaining = state.eventRemaining || 0;
    this.eventDuration = state.eventDuration || 0;
    this.eventStar = state.eventStar || '';
    if (this.stabilized) {
      this.clearFluxEffects();
    } else {
      this.syncFluxEffects();
    }
  }
}

window.StellarEngineProject = StellarEngineProject;
