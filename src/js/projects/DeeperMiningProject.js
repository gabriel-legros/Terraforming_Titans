class DeeperMiningProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    this.oreMineCount = 0;
    this.averageDepth = 1;
    this.baseMaxDepth = config.maxDepth || Infinity;
    this.underworldMiningLevel = 0;
    this.superchargedMiningLevel = 0;
    this.updateUnderworldMiningMaxDepth();
  }

  registerMine() {
    let current = this.oreMineCount;
    const built = buildings.oreMine.count;
    const delta = built - current;
    if (delta > 0) {
      const totalDepth = (this.averageDepth || 1) * current;
      this.oreMineCount = built;
      this.averageDepth = (totalDepth + delta) / this.oreMineCount;
      this.updateUnderworldMiningMaxDepth();
      this.applySuperchargedMiningEffects();
      if (this.attributes?.completionEffect) {
        this.applyCompletionEffect();
      }
      if (this.averageDepth < this.maxDepth) {
        this.isCompleted = false;
        if (typeof updateProjectUI === 'function') {
          updateProjectUI(this.name);
        }
      }
      this.adjustActiveDuration();
    }
  }

  canStart() {
    if (this.averageDepth >= this.maxDepth) {
      return false;
    }
    return super.canStart();
  }

  canContinue() {
    return this.averageDepth < this.maxDepth;
  }

  applyContinuousProgress(fraction, productivity) {
    const depthGain = (fraction || 0) * (productivity || 0);
    const currentDepth = this.averageDepth || 1;
    const newDepth = Math.min(currentDepth + depthGain, this.maxDepth);
    if (newDepth !== this.averageDepth) {
      this.averageDepth = newDepth;
      this.updateUnderworldMiningMaxDepth();
      this.applySuperchargedMiningEffects();
      if (this.attributes?.completionEffect) {
        this.applyCompletionEffect();
      }
    }

    if (this.averageDepth >= this.maxDepth) {
      this.isActive = false;
      this.isCompleted = true;
    }
  }

  getScaledCost() {
    let cost = super.getScaledCost();
    if (this.attributes.costOreMineScaling) {
      const oreMines = Math.max(this.oreMineCount, 1);
      const depth = this.averageDepth || 1;
      const multiplier = oreMines * (0.9 + 0.1 * depth);
      const scaledCost = {};
      for (const category in cost) {
        scaledCost[category] = {};
        for (const resource in cost[category]) {
          scaledCost[category][resource] = cost[category][resource] * multiplier;
        }
      }
      cost = scaledCost;
    }
    const bonusLevel = this.getUnderworldMiningLevel();
    if (bonusLevel > 0) {
      const componentCost = cost.colony.components || 0;
      cost.colony.superalloys = (cost.colony.superalloys || 0) + (componentCost * bonusLevel) / 100;
    }
    return cost;
  }

  getAndroidSpeedLabelText() {
    return 'Deepening speed boost';
  }

  getUnderworldMiningLevel() {
    return this.isBooleanFlagSet('underworld_mining') ? this.underworldMiningLevel : 0;
  }

  getUnderworldMiningSpeedMultiplier() {
    return 1 + this.getUnderworldMiningLevel();
  }

  getSuperchargedMiningLevel() {
    return this.isBooleanFlagSet('underworld_mining') ? this.superchargedMiningLevel : 0;
  }

  getSuperchargedMiningMultiplier() {
    return 1 + this.getSuperchargedMiningLevel();
  }

  getSuperchargedMiningEnergyMultiplier() {
    const multiplier = this.getSuperchargedMiningMultiplier();
    return multiplier * multiplier * multiplier;
  }

  updateUnderworldMiningMaxDepth() {
    const bonusLevel = this.getUnderworldMiningLevel();
    this.maxDepth = this.baseMaxDepth + bonusLevel * 10000;
  }

  setUnderworldMiningLevel(value) {
    this.underworldMiningLevel = Math.max(0, Math.min(9, value));
    this.updateUnderworldMiningMaxDepth();
    this.adjustActiveDuration();
  }

  setSuperchargedMiningLevel(value) {
    this.superchargedMiningLevel = Math.max(0, Math.min(9, value));
    this.applySuperchargedMiningEffects();
    this.adjustActiveDuration();
  }

  applySuperchargedMiningEffects() {
    if (this.isBooleanFlagSet('underworld_mining')) {
      const multiplier = this.getSuperchargedMiningMultiplier();
      addEffect({
        target: 'building',
        targetId: 'oreMine',
        type: 'productionMultiplier',
        effectId: 'supercharged_mining_prod',
        value: multiplier,
        sourceId: this
      });
      addEffect({
        target: 'building',
        targetId: 'oreMine',
        type: 'resourceConsumptionMultiplier',
        resourceCategory: 'colony',
        resourceTarget: 'energy',
        effectId: 'supercharged_mining_energy',
        value: this.getSuperchargedMiningEnergyMultiplier(),
        sourceId: this
      });
      return;
    }
    removeEffect({
      target: 'building',
      targetId: 'oreMine',
      type: 'productionMultiplier',
      effectId: 'supercharged_mining_prod',
      sourceId: this
    });
    removeEffect({
      target: 'building',
      targetId: 'oreMine',
      type: 'resourceConsumptionMultiplier',
      resourceCategory: 'colony',
      resourceTarget: 'energy',
      effectId: 'supercharged_mining_energy',
      sourceId: this
    });
  }

  updateUnderworldMiningUI(elements) {
    const level = this.underworldMiningLevel;
    const speedBonus = level * 100;
    const depthBonus = level * 10000;
    elements.underworldSlider.value = `${level}`;
    elements.underworldValue.textContent = `Lv ${level}`;
    elements.underworldEffect.textContent = level === 0
      ? 'No bonus'
      : `+${speedBonus}% speed, +${formatNumber(depthBonus, true)} max depth`;
    const superchargeLevel = this.superchargedMiningLevel;
    const superchargeMultiplier = this.getSuperchargedMiningMultiplier();
    elements.superchargedSlider.value = `${superchargeLevel}`;
    elements.superchargedValue.textContent = `x${superchargeMultiplier}`;
    elements.superchargedEffect.textContent = superchargeLevel === 0
      ? 'No bonus'
      : `x${superchargeMultiplier} ore, x${formatNumber(this.getSuperchargedMiningEnergyMultiplier(), true)} energy`;
  }

  getBaseDuration() {
    const base = super.getBaseDuration();
    return base / this.getUnderworldMiningSpeedMultiplier();
  }

  renderUI(container) {
    super.renderUI(container);
    const elements = projectElements[this.name];
    if (elements?.costElement) {
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.title = '90% of the cost scales with ore mines built. 10% also scales with average depth.';
      info.innerHTML = '&#9432;';
      elements.costElement.appendChild(info);
    }
    if (!elements.costItems['colony.superalloys']) {
      const superalloyCost = document.createElement('span');
      superalloyCost.dataset.leadingComma = 'true';
      elements.costList.appendChild(superalloyCost);
      elements.costItems['colony.superalloys'] = superalloyCost;
    }

    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container', 'underworld-mining-section');

    const sectionTitle = document.createElement('h4');
    sectionTitle.classList.add('section-title');
    sectionTitle.textContent = 'Underworld mining upgrades';
    const info = document.createElement('span');
    info.classList.add('info-tooltip-icon');
    info.title = 'Superalloy drills increase deepening speed and maximum depth. Superalloy cost scales with the slider.';
    info.innerHTML = '&#9432;';
    sectionTitle.appendChild(info);
    sectionContainer.appendChild(sectionTitle);

    const sliderRow = document.createElement('div');
    sliderRow.classList.add('colony-slider');

    const label = document.createElement('label');
    label.textContent = 'Superalloy drills';
    label.htmlFor = `${this.name}-underworld-slider`;

    const valueSpan = document.createElement('span');
    valueSpan.classList.add('slider-value');

    const sliderContainer = document.createElement('div');
    sliderContainer.classList.add('slider-container');

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `${this.name}-underworld-slider`;
    input.min = '0';
    input.max = '9';
    input.step = '1';
    input.value = `${this.underworldMiningLevel}`;
    input.classList.add('pretty-slider');
    sliderContainer.appendChild(input);

    const effectSpan = document.createElement('span');
    effectSpan.classList.add('slider-effect');

    sliderRow.append(label, valueSpan, sliderContainer, effectSpan);
    sectionContainer.appendChild(sliderRow);

    const superchargeRow = document.createElement('div');
    superchargeRow.classList.add('colony-slider');

    const superchargeLabel = document.createElement('label');
    superchargeLabel.textContent = 'Supercharged Mining';
    superchargeLabel.htmlFor = `${this.name}-supercharged-slider`;

    const superchargeValue = document.createElement('span');
    superchargeValue.classList.add('slider-value');

    const superchargeContainer = document.createElement('div');
    superchargeContainer.classList.add('slider-container');

    const superchargeInput = document.createElement('input');
    superchargeInput.type = 'range';
    superchargeInput.id = `${this.name}-supercharged-slider`;
    superchargeInput.min = '0';
    superchargeInput.max = '9';
    superchargeInput.step = '1';
    superchargeInput.value = `${this.superchargedMiningLevel}`;
    superchargeInput.classList.add('pretty-slider');
    superchargeContainer.appendChild(superchargeInput);

    const superchargeEffect = document.createElement('span');
    superchargeEffect.classList.add('slider-effect');

    superchargeRow.append(superchargeLabel, superchargeValue, superchargeContainer, superchargeEffect);
    sectionContainer.appendChild(superchargeRow);
    container.appendChild(sectionContainer);

    projectElements[this.name] = {
      ...projectElements[this.name],
      underworldSection: sectionContainer,
      underworldSlider: input,
      underworldValue: valueSpan,
      underworldEffect: effectSpan,
      superchargedSlider: superchargeInput,
      superchargedValue: superchargeValue,
      superchargedEffect: superchargeEffect
    };

    input.addEventListener('input', () => {
      this.setUnderworldMiningLevel(Number(input.value));
      updateProjectUI(this.name);
    });
    superchargeInput.addEventListener('input', () => {
      this.setSuperchargedMiningLevel(Number(superchargeInput.value));
      updateProjectUI(this.name);
    });
  }

  applyCompletionEffect() {
    this.attributes.completionEffect.forEach((effect) => {
      const baseValue = effect.value;
      const depth = this.attributes.effectScaling ? (this.averageDepth || 1) : 1;
      const value = baseValue * depth;

      const baseId = effect.effectId || 'deeper_mining';

      addEffect({ ...effect, value, sourceId: this });

      // Scale ore mine consumption
      addEffect({
        target: effect.target,
        targetId: effect.targetId,
        type: 'consumptionMultiplier',
        effectId: `${baseId}_consumption`,
        value,
        sourceId: this
      });

      // Scale ore mine maintenance for each cost resource
      const oreMine = buildings[effect.targetId];
      if (oreMine?.cost?.colony) {
        for (const res in oreMine.cost.colony) {
          addEffect({
            target: effect.target,
            targetId: effect.targetId,
            type: 'maintenanceCostMultiplier',
            resourceCategory: 'colony',
            resourceId: res,
            effectId: `${baseId}_maintenance_${res}`,
            value,
            sourceId: this
          });
        }
      }
    });
  }

  complete() {
    if (this.averageDepth < this.maxDepth) {
      this.averageDepth = Math.min(this.averageDepth + 1, this.maxDepth);
      this.updateUnderworldMiningMaxDepth();
      this.applySuperchargedMiningEffects();
      super.complete();
      if (this.averageDepth >= this.maxDepth) {
        this.isCompleted = true;
      }
    }
  }


  saveState() {
    return {
      ...super.saveState(),
      oreMineCount: this.oreMineCount,
      averageDepth: this.averageDepth,
      underworldMiningLevel: this.underworldMiningLevel,
      superchargedMiningLevel: this.superchargedMiningLevel
    };
  }

  loadState(state) {
    super.loadState(state);
    const built = buildings.oreMine.count;
    this.oreMineCount = state.oreMineCount || built;
    this.averageDepth = state.averageDepth || (this.repeatCount || 0) + 1;
    this.underworldMiningLevel = state.underworldMiningLevel || 0;
    this.superchargedMiningLevel = state.superchargedMiningLevel || 0;
    this.updateUnderworldMiningMaxDepth();
    this.applySuperchargedMiningEffects();
    if (this.attributes?.completionEffect) {
      this.applyCompletionEffect();
    }
    this.adjustActiveDuration();
  }

  prepareTravelState() {
    this.underworldMiningLevel = 0;
    this.superchargedMiningLevel = 0;
    this.updateUnderworldMiningMaxDepth();
    this.applySuperchargedMiningEffects();
    this.adjustActiveDuration();
  }
}

try {
  window.DeeperMiningProject = DeeperMiningProject;
} catch (error) {}

try {
  module.exports = DeeperMiningProject;
} catch (error) {}
