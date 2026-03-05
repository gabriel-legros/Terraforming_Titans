(function () {
  const SPACE_ANTIMATTER_STORAGE_PER_BATTERY = 1e15;
  const SPACE_ANTIMATTER_MAX_BATCH = 1e32;

  class SpaceAntimatterProject extends Project {
    constructor(config, name) {
      super(config, name);
      this.buildCount = 1;
      this.activeBuildCount = 1;
      this.startedCompleted = false;
      this.uiElements = null;
    }

    getStorageEffectId() {
      return `${this.name}-space-energy-storage`;
    }

    getStorageEffectSourceId() {
      return `${this.name}-space-energy-storage-source`;
    }

    getTotalStorageBonus() {
      return this.repeatCount * SPACE_ANTIMATTER_STORAGE_PER_BATTERY;
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

    enable() {
      const wasUnlocked = this.unlocked;
      super.enable();
      if (!wasUnlocked && !this.startedCompleted) {
        this.isCompleted = true;
        this.startedCompleted = true;
      }
      this.applyBatteryStorageEffect();
    }

    applyEffects() {
      this.applyBatteryStorageEffect();
    }

    isVisible() {
      if (this.isPermanentlyDisabled()) {
        return false;
      }
      return this.unlocked || this.repeatCount > 0;
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
      const count = this.isActive ? this.activeBuildCount : this.buildCount;
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
      const next = Math.round(this.buildCount + delta);
      this.buildCount = Math.max(1, Math.min(SPACE_ANTIMATTER_MAX_BATCH, next));
    }

    scaleBuildCount(multiplier) {
      if (multiplier > 1) {
        this.buildCount = Math.min(SPACE_ANTIMATTER_MAX_BATCH, multiplyByTen(this.buildCount));
      } else {
        this.buildCount = Math.max(1, divideByTen(this.buildCount));
      }
    }

    start(resources) {
      this.activeBuildCount = this.buildCount;
      const started = super.start(resources);
      if (!started) {
        this.activeBuildCount = 1;
        return false;
      }
      this.complete();
      return true;
    }

    complete() {
      const completions = Math.max(0, Math.round(this.activeBuildCount || 1));
      this.activeBuildCount = 1;
      this.isActive = false;
      this.isPaused = false;
      this.isCompleted = false;
      this.kesslerRollPending = false;
      this.kesslerRollElapsed = 0;
      this.kesslerStartCost = null;

      if (completions > 0) {
        const remaining = this.maxRepeatCount === Infinity
          ? completions
          : Math.max(Math.min(completions, this.maxRepeatCount - this.repeatCount), 0);
        if (remaining > 0) {
          this.repeatCount += remaining;
        }
      }

      this.remainingTime = this.getEffectiveDuration();
      this.startingDuration = this.remainingTime;
      this.applyBatteryStorageEffect();
    }

    renderUI(container) {
      const card = document.createElement('div');
      card.classList.add('info-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = 'Battery Component';
      header.appendChild(title);
      card.appendChild(header);

      const body = document.createElement('div');
      body.classList.add('card-body');

      const summaryGrid = document.createElement('div');
      summaryGrid.classList.add('stats-grid', 'three-col', 'project-summary-grid');

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

      const batteriesBuilt = createSummaryBox('Batteries Built');
      const storageBonus = createSummaryBox('Space Energy Storage');
      const buildAmount = createSummaryBox('Build Amount');

      const multiplierControls = document.createElement('div');
      multiplierControls.classList.add('scanner-mult-controls');
      const divideButton = document.createElement('button');
      divideButton.textContent = '/10';
      const multiplyButton = document.createElement('button');
      multiplyButton.textContent = 'x10';
      multiplierControls.append(divideButton, multiplyButton);
      buildAmount.value.style.display = 'none';
      buildAmount.content.classList.add('project-summary-flex');
      buildAmount.content.appendChild(multiplierControls);

      const buildButton = document.createElement('button');
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
        buildButton
      };

      this.updateUI();
    }

    updateUI() {
      if (!this.uiElements) {
        return;
      }
      this.uiElements.batteriesBuiltValue.textContent = formatNumber(this.repeatCount, true);
      this.uiElements.storageBonusValue.textContent = formatNumber(this.getTotalStorageBonus(), true);
      this.uiElements.buildButton.textContent = `Build ${formatNumber(this.buildCount, true)} Batteries`;
      this.uiElements.buildButton.disabled = !this.canStart();
    }

    saveAutomationSettings() {
      return {
        ...super.saveAutomationSettings(),
        buildCount: this.buildCount
      };
    }

    loadAutomationSettings(settings = {}) {
      super.loadAutomationSettings(settings);
      if (Object.prototype.hasOwnProperty.call(settings, 'buildCount')) {
        this.buildCount = Math.max(1, settings.buildCount || 1);
      }
    }

    saveState() {
      return {
        ...super.saveState(),
        buildCount: this.buildCount,
        activeBuildCount: this.activeBuildCount,
        startedCompleted: this.startedCompleted === true
      };
    }

    loadState(state = {}) {
      super.loadState(state);
      this.buildCount = Math.max(1, state.buildCount || 1);
      this.activeBuildCount = Math.max(1, state.activeBuildCount || 1);
      this.startedCompleted = state.startedCompleted === true || this.repeatCount > 0 || this.isCompleted === true;
      this.applyBatteryStorageEffect();
    }

    saveTravelState() {
      const state = super.saveTravelState();
      state.buildCount = this.buildCount;
      state.startedCompleted = this.startedCompleted === true;
      return state;
    }

    loadTravelState(state = {}) {
      super.loadTravelState(state);
      this.buildCount = Math.max(1, state.buildCount || this.buildCount);
      this.startedCompleted = state.startedCompleted === true || this.repeatCount > 0 || this.isCompleted === true;
      this.applyBatteryStorageEffect();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpaceAntimatterProject;
  } else {
    window.SpaceAntimatterProject = SpaceAntimatterProject;
  }
}());
