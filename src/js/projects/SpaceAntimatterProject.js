(function () {
  const SPACE_ANTIMATTER_STORAGE_PER_BATTERY = 2e15;
  const SPACE_ANTIMATTER_STORAGE_PER_BATTERY_BIGINT = 2000000000000000n;
  const SPACE_ANTIMATTER_MAX_BATCH_BIGINT = 100000000000000000000000000000000n;

  function normalizeSpaceAntimatterCount(value) {
    return normalizeBuildingCount(value);
  }

  function serializeSpaceAntimatterCount(value) {
    const normalized = normalizeSpaceAntimatterCount(value);
    return normalized <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(normalized)
      : normalized.toString();
  }

  function spaceAntimatterCountToNumber(value) {
    return Number(normalizeSpaceAntimatterCount(value));
  }

  function getSpaceAntimatterText(path, vars, fallback = '') {
    try {
      return t(`ui.projects.spaceAntimatter.${path}`, vars, fallback);
    } catch (error) {
      return fallback;
    }
  }

  class SpaceAntimatterProject extends Project {
    constructor(config, name) {
      super(config, name);
      this.repeatCount = 0n;
      this.buildCount = 1;
      this.activeBuildCount = 1;
      this.startedCompleted = false;
      this.uiElements = null;
    }

    resolveUIElements() {
      if (this.uiElements?.buildButton?.isConnected) {
        return this.uiElements;
      }
      const card = projectElements?.[this.name]?.projectItem;
      if (!card || !card.isConnected) {
        this.uiElements = null;
        return null;
      }
      const nextElements = {
        batteriesBuiltValue: card.querySelector('[data-space-antimatter-ui="batteriesBuiltValue"]'),
        storageBonusValue: card.querySelector('[data-space-antimatter-ui="storageBonusValue"]'),
        antimatterStorageBonusValue: card.querySelector('[data-space-antimatter-ui="antimatterStorageBonusValue"]'),
        buildButton: card.querySelector('[data-space-antimatter-ui="buildButton"]')
      };
      if (!nextElements.buildButton) {
        this.uiElements = null;
        return null;
      }
      this.uiElements = nextElements;
      return this.uiElements;
    }

    getStorageEffectId() {
      return `${this.name}-space-energy-storage`;
    }

    getStorageEffectSourceId() {
      return `${this.name}-space-energy-storage-source`;
    }

    getAntimatterStorageEffectId() {
      return `${this.name}-antimatter-storage`;
    }

    getAntimatterStorageEffectSourceId() {
      return `${this.name}-antimatter-storage-source`;
    }

    getTotalStorageBonus() {
      return spaceAntimatterCountToNumber(this.repeatCount) * SPACE_ANTIMATTER_STORAGE_PER_BATTERY;
    }

    getTotalStorageBonusCount() {
      return normalizeSpaceAntimatterCount(this.repeatCount) * SPACE_ANTIMATTER_STORAGE_PER_BATTERY_BIGINT;
    }

    getTotalAntimatterStorageBonus() {
      return spaceEnergyToAntimatter(this.getTotalStorageBonus());
    }

    getSelectedBuildCount() {
      if (!gameSettings.roundBuildingConstruction) {
        return this.buildCount;
      }
      return getRoundedBuildCount(this.repeatCount, this.buildCount);
    }

    applyBatteryStorageEffect() {
      const sourceId = this.getStorageEffectSourceId();
      const bonus = this.getTotalStorageBonus();
      if (bonus <= 0) {
        removeEffect({
          target: 'resource',
          resourceType: 'space',
          targetId: 'energy',
          sourceId
        });
        return;
      }

      addEffect({
        target: 'resource',
        resourceType: 'space',
        targetId: 'energy',
        type: 'baseStorageBonus',
        value: bonus,
        effectId: this.getStorageEffectId(),
        sourceId,
        name: `${this.displayName} Battery Storage`
      });
    }

    applyAntimatterStorageEffect() {
      const sourceId = this.getAntimatterStorageEffectSourceId();
      removeEffect({
        target: 'resource',
        resourceType: 'special',
        targetId: 'antimatter',
        sourceId
      });
    }

    enable() {
      const wasUnlocked = this.unlocked;
      super.enable();
      if (!wasUnlocked && !this.startedCompleted) {
        this.isCompleted = true;
        this.startedCompleted = true;
      }
      this.applyBatteryStorageEffect();
      this.applyAntimatterStorageEffect();
    }

    applyEffects() {
      this.applyBatteryStorageEffect();
      this.applyAntimatterStorageEffect();
    }

    isVisible() {
      if (this.isPermanentlyDisabled()) {
        return false;
      }
      return this.unlocked || this.repeatCount > 0n;
    }

    shouldHideStartBar() {
      return true;
    }

    renderAutomationUI(container) {
      if (!container) {
        return;
      }
      const children = Array.from(container.children || []);
      for (let i = 0; i < children.length; i += 1) {
        children[i].style.display = 'none';
      }
    }

    getScaledCost() {
      const base = super.getScaledCost();
      const count = spaceAntimatterCountToNumber(this.isActive ? this.activeBuildCount : this.getSelectedBuildCount());
      const scaled = {};
      for (const category in base) {
        scaled[category] = {};
        for (const resource in base[category]) {
          scaled[category][resource] = base[category][resource] * count;
        }
      }
      return scaled;
    }

    adjustBuildCount(delta) {
      const current = normalizeSpaceAntimatterCount(this.buildCount);
      const next = current + BigInt(Math.round(delta));
      const capped = next > SPACE_ANTIMATTER_MAX_BATCH_BIGINT ? SPACE_ANTIMATTER_MAX_BATCH_BIGINT : next;
      this.buildCount = serializeSpaceAntimatterCount(capped > 0n ? capped : 1n);
    }

    scaleBuildCount(multiplier) {
      if (multiplier > 1) {
        this.buildCount = serializeSpaceAntimatterCount(multiplyByTen(this.buildCount));
      } else {
        this.buildCount = serializeSpaceAntimatterCount(divideByTen(this.buildCount));
      }
    }

    start(resources) {
      this.activeBuildCount = this.getSelectedBuildCount();
      const started = super.start(resources);
      if (!started) {
        this.activeBuildCount = 1;
        return false;
      }
      this.complete();
      return true;
    }

    complete() {
      const completions = normalizeSpaceAntimatterCount(this.activeBuildCount || 1);
      this.activeBuildCount = 1;
      this.isActive = false;
      this.isPaused = false;
      this.isCompleted = false;
      this.kesslerRollPending = false;
      this.kesslerRollElapsed = 0;
      this.kesslerStartCost = null;

      if (completions > 0n) {
        const remaining = this.maxRepeatCount === Infinity
          ? completions
          : normalizeSpaceAntimatterCount(Math.max(this.maxRepeatCount - spaceAntimatterCountToNumber(this.repeatCount), 0));
        if (remaining > 0n) {
          this.repeatCount = normalizeSpaceAntimatterCount(this.repeatCount) + remaining;
        }
      }

      this.remainingTime = this.getEffectiveDuration();
      this.startingDuration = this.remainingTime;
      this.applyBatteryStorageEffect();
      this.applyAntimatterStorageEffect();
    }

    renderUI(container) {
      const card = document.createElement('div');
      card.classList.add('info-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = getSpaceAntimatterText('title', null, 'Battery Component');
      header.appendChild(title);
      card.appendChild(header);

      const body = document.createElement('div');
      body.classList.add('card-body');

      const summaryGrid = document.createElement('div');
      summaryGrid.classList.add('stats-grid', 'four-col', 'project-summary-grid');

      const createSummaryBox = (labelText) => {
        const box = document.createElement('div');
        box.classList.add('stat-item', 'project-summary-box');
        const label = document.createElement('span');
        label.classList.add('stat-label');
        label.textContent = labelText;
        const content = document.createElement('div');
        content.classList.add('project-summary-content');
        const value = document.createElement('span');
        value.classList.add('stat-value');
        content.appendChild(value);
        box.append(label, content);
        summaryGrid.appendChild(box);
        return { value, content };
      };

      const batteriesBuilt = createSummaryBox(getSpaceAntimatterText('batteriesBuilt', null, 'Batteries Built'));
      const storageBonus = createSummaryBox(getSpaceAntimatterText('spaceEnergyStorage', null, 'Space Energy Storage'));
      const antimatterStorageBonus = createSummaryBox(getSpaceAntimatterText('specialAntimatterStorage', null, 'Military Antimatter Equivalent'));
      const buildAmount = createSummaryBox(getSpaceAntimatterText('buildAmount', null, 'Build Amount'));
      batteriesBuilt.value.dataset.spaceAntimatterUi = 'batteriesBuiltValue';
      storageBonus.value.dataset.spaceAntimatterUi = 'storageBonusValue';
      antimatterStorageBonus.value.dataset.spaceAntimatterUi = 'antimatterStorageBonusValue';

      const multiplierControls = document.createElement('div');
      multiplierControls.classList.add('scanner-mult-controls');
      const divideButton = document.createElement('button');
      divideButton.textContent = getSpaceAntimatterText('divideTen', null, '/10');
      const multiplyButton = document.createElement('button');
      multiplyButton.textContent = getSpaceAntimatterText('timesTen', null, 'x10');
      multiplierControls.append(divideButton, multiplyButton);
      buildAmount.value.style.display = 'none';
      buildAmount.content.classList.add('project-summary-flex');
      buildAmount.content.appendChild(multiplierControls);

      const buildButton = document.createElement('button');
      buildButton.dataset.spaceAntimatterUi = 'buildButton';
      buildButton.classList.add('progress-button');
      buildButton.style.width = '100%';
      buildButton.style.marginTop = '10px';
      buildButton.addEventListener('click', () => {
        if (!this.canStart()) {
          return;
        }
        projectManager.startProject(this.name);
        updateProjectUI(this.name);
      });

      body.appendChild(summaryGrid);
      body.appendChild(buildButton);
      card.appendChild(body);
      container.appendChild(card);

      const refresh = () => {
        updateProjectUI(this.name);
      };

      divideButton.addEventListener('click', () => {
        this.scaleBuildCount(0.1);
        refresh();
      });
      multiplyButton.addEventListener('click', () => {
        this.scaleBuildCount(10);
        refresh();
      });

      this.uiElements = {
        batteriesBuiltValue: batteriesBuilt.value,
        storageBonusValue: storageBonus.value,
        antimatterStorageBonusValue: antimatterStorageBonus.value,
        buildButton
      };

      this.updateUI();
    }

    updateUI() {
      const uiElements = this.resolveUIElements();
      if (!uiElements) {
        return;
      }
      const selected = this.getSelectedBuildCount();
      uiElements.batteriesBuiltValue.textContent = formatNumber(this.repeatCount, true);
      uiElements.storageBonusValue.textContent = formatNumber(this.getTotalStorageBonusCount(), true);
      uiElements.antimatterStorageBonusValue.textContent = formatNumber(this.getTotalAntimatterStorageBonus(), true);
      uiElements.buildButton.textContent = getSpaceAntimatterText(
        'buildButton',
        { count: formatNumber(selected, true) },
        `Build ${formatNumber(selected, true)} Batteries`
      );
      uiElements.buildButton.disabled = !this.canStart();
    }

    saveAutomationSettings() {
      return {
        ...super.saveAutomationSettings(),
        buildCount: serializeSpaceAntimatterCount(this.buildCount)
      };
    }

    loadAutomationSettings(settings = {}) {
      super.loadAutomationSettings(settings);
      if (Object.prototype.hasOwnProperty.call(settings, 'buildCount')) {
        this.buildCount = serializeSpaceAntimatterCount(normalizeBuildStepCount(settings.buildCount || 1));
      }
    }

    saveState() {
      const state = {
        ...super.saveState(),
        repeatCount: serializeSpaceAntimatterCount(this.repeatCount),
        buildCount: serializeSpaceAntimatterCount(this.buildCount),
        activeBuildCount: serializeSpaceAntimatterCount(this.activeBuildCount),
        startedCompleted: this.startedCompleted === true
      };
      return state;
    }

    loadState(state = {}) {
      super.loadState(state);
      this.repeatCount = normalizeSpaceAntimatterCount(state.repeatCount || 0);
      this.buildCount = serializeSpaceAntimatterCount(normalizeBuildStepCount(state.buildCount || 1));
      this.activeBuildCount = serializeSpaceAntimatterCount(normalizeBuildStepCount(state.activeBuildCount || 1));
      this.startedCompleted = state.startedCompleted === true || this.repeatCount > 0n || this.isCompleted === true;
      this.applyBatteryStorageEffect();
    }

    saveTravelState() {
      const state = super.saveTravelState();
      state.repeatCount = serializeSpaceAntimatterCount(this.repeatCount);
      state.buildCount = serializeSpaceAntimatterCount(this.buildCount);
      state.startedCompleted = this.startedCompleted === true;
      return state;
    }

    loadTravelState(state = {}) {
      super.loadTravelState(state);
      this.repeatCount = normalizeSpaceAntimatterCount(state.repeatCount || this.repeatCount);
      this.buildCount = serializeSpaceAntimatterCount(normalizeBuildStepCount(state.buildCount || this.buildCount));
      this.startedCompleted = state.startedCompleted === true || this.repeatCount > 0n || this.isCompleted === true;
      this.applyBatteryStorageEffect();
      this.applyAntimatterStorageEffect();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpaceAntimatterProject;
  } else {
    window.SpaceAntimatterProject = SpaceAntimatterProject;
  }
}());
