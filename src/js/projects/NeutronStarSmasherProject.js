class NeutronStarSmasherProject extends PlanetCrackersProject {
  constructor(config, name) {
    super(config, name);
    this.smasherSummaryElements = null;
  }

  getText(path, vars = {}) {
    if (path === 'planetProgress') {
      const mergers = Math.floor(this.getTotalCrackedPlanets());
      vars = {
        ...vars,
        merged: formatNumber(mergers, true),
        stars: formatNumber(2 * Math.floor(this.getTotalRemainingPlanets()), true),
        ships: formatNumber(this.getTotalCapBonusesFromCracked().metal, true, 3),
        metal: formatNumber(mergers * this.getPlanetTypeConfigs()[0].metalRatePerMerger, true, 3)
      };
    } else if (path === 'recipeTooltip') {
      const recipe = this.getPlanetTypeConfigs()[0];
      vars = {
        ...vars,
        ships: formatNumber(recipe.capBonuses.metal, true, 3),
        metal: formatNumber(recipe.metalRatePerMerger, true, 3)
      };
    }
    return t(`ui.projects.neutronStarSmasher.${path}`, vars);
  }

  getPlanetsPerAssignmentSecond() {
    return terraformingParameters.gameplay.neutronStarMerging.mergersPerAssignmentSecond;
  }

  getSpaceEnergyPerPlanet() {
    return terraformingParameters.gameplay.neutronStarMerging.spaceEnergyPerMerger;
  }

  getOperationNoteText() {
    return '';
  }

  getPlanetTypeConfigs() {
    if (!this.planetTypeConfigs) {
      const config = terraformingParameters.gameplay.neutronStarMerging;
      // One real-time second represents one in-game day, as in lifter extraction caps.
      const metalPerMerger = config.ejectaSolarMasses
        * terraformingParameters.geometry.stellarEvolution.solarMassKg
        / terraformingParameters.physical.kgPerTon
        / (config.extractionYears * config.daysPerYear);
      // Planet Cracker cap bonuses are ship slots, not tonnes per second.
      // Use unmodified mining throughput so ship upgrades apply normally.
      const mining = projectParameters.oreSpaceMining;
      const baseMetalRatePerShip = mining.attributes.resourceGainPerShip.colony.metal
        / (mining.duration / 1000);
      this.planetTypeConfigs = [{
        key: 'neutronStarPair',
        label: this.getText('recipeLabels.neutronStarPair'),
        complexity: 1,
        total: config.neutronStars / 2,
        metalRatePerMerger: metalPerMerger,
        capBonuses: { metal: metalPerMerger / baseMetalRatePerShip, silicon: 0, carbon: 0, water: 0 }
      }];
    }
    return this.planetTypeConfigs;
  }

  getEffectiveTotalForType(typeKey) {
    return Math.floor(super.getEffectiveTotalForType(typeKey));
  }

  getTotalCapBonusesFromCracked() {
    const mergers = Math.floor(this.getTotalCrackedPlanets());
    return {
      metal: mergers * this.getPlanetTypeConfigs()[0].capBonuses.metal,
      silicon: 0,
      carbon: 0,
      water: 0
    };
  }

  applyEffects() {
    // Travel replaces the network manager after restoring project state.
    this.lastAppliedCapKey = '';
    this.applyCapBonusEffects();
  }

  applyCapBonusEffects() {
    const capKey = this.getCapKey();
    if (this.lastAppliedCapKey === capKey) {
      return;
    }
    warpGateNetworkManager.addAndReplace({
      type: 'importCapFlatBonus',
      resourceKey: 'metal',
      value: this.getTotalCapBonusesFromCracked().metal,
      createdBlackHoles: Math.floor(this.getTotalCrackedPlanets()),
      effectId: 'neutron-star-smasher-metal-cap-bonus',
      sourceId: 'neutronStarSmasher'
    });
    this.lastAppliedCapKey = capKey;
  }

  renderUI(container) {
    container.classList.add('neutron-star-smasher');
    super.renderUI(container);
    const summary = container.querySelector('[data-nuclear-ui="totalValue"]').parentElement.parentElement;
    const controls = container.querySelector('[data-nuclear-ui="statusValue"]').parentElement.parentElement;
    summary.classList.replace('three-col', 'four-col');
    controls.classList.replace('three-col', 'four-col');

    const addStat = (grid, before, labelText, tooltipText = '') => {
      const box = document.createElement('div');
      box.classList.add('stat-item', 'project-summary-box');
      const label = document.createElement('span');
      label.classList.add('stat-label');
      label.textContent = labelText;
      if (tooltipText) {
        const icon = document.createElement('span');
        icon.classList.add('info-tooltip-icon');
        icon.innerHTML = '&#9432;';
        label.append(' ', icon);
        attachDynamicInfoTooltip(icon, tooltipText);
      }
      const value = document.createElement('span');
      value.classList.add('stat-value');
      box.append(label, value);
      grid.insertBefore(box, before);
      return value;
    };
    this.smasherSummaryElements = {
      assigned: addStat(summary, summary.children[1], this.getText('assigned')),
      energy: addStat(controls, controls.children[2], this.getText('energyPerSmasher'),
        this.getText('energyPerSmasherTooltip'))
    };
    const elements = projectElements[this.name];
    elements.smasherSummaryElements = this.smasherSummaryElements;
    const operationNote = container.querySelector('[data-nuclear-ui="note"]');
    operationNote.hidden = true;
    const controlBody = operationNote.parentElement;
    controlBody.appendChild(container.querySelector('[data-planet-cracker-ui="status"]'));
    container.appendChild(elements.costElement.parentElement);
    this.updateUI();
  }

  updateUI() {
    super.updateUI();
    this.smasherSummaryElements ||= projectElements[this.name]?.smasherSummaryElements;
    const elements = this.smasherSummaryElements;
    if (!elements) {
      return;
    }
    const assigned = formatNumber(this.getAssignedTotal(), true, 2);
    const energy = this.getText('spaceEnergyRate', {
      value: formatNumber(this.getSpaceEnergyPerPlanet() * this.getPlanetsPerAssignmentSecond(), true, 3)
    });
    if (elements.assigned.textContent !== assigned) {
      elements.assigned.textContent = assigned;
    }
    if (elements.energy.textContent !== energy) {
      elements.energy.textContent = energy;
    }
  }

  loadState(state) {
    super.loadState(state);
    this.applyCapBonusEffects();
  }
}

window.NeutronStarSmasherProject = NeutronStarSmasherProject;
