(function () {
  const OVERPOPULATION_ONEILL_COLONISTS_PER_CYLINDER = 1e12;
  const OVERPOPULATION_ONEILL_MAX_BATCH = 1e32;

  function getOverpopulationOneillText(path, vars, fallback) {
    return t(`ui.projects.overpopulationOneillCylinders.${path}`, vars, fallback);
  }

  class OverpopulationOneillCylindersProject extends Project {
    constructor(config, name) {
      super(config, name);
      this.buildCount = 1;
      this.activeBuildCount = 0;
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
        lostPopulationValue: card.querySelector('[data-overpop-oneill-ui="lostPopulationValue"]'),
        requiredCylindersValue: card.querySelector('[data-overpop-oneill-ui="requiredCylindersValue"]'),
        cylindersBuiltValue: card.querySelector('[data-overpop-oneill-ui="cylindersBuiltValue"]'),
        travelConversionValue: card.querySelector('[data-overpop-oneill-ui="travelConversionValue"]'),
        buildAmountValue: card.querySelector('[data-overpop-oneill-ui="buildAmountValue"]'),
        buildButton: card.querySelector('[data-overpop-oneill-ui="buildButton"]')
      };
      if (!nextElements.buildButton) {
        this.uiElements = null;
        return null;
      }
      this.uiElements = nextElements;
      return this.uiElements;
    }

    getTrackedPopulationLoss() {
      return Math.max(0, populationModule.currentWorldOverpopulationLossTotal || 0);
    }

    getBuiltCylinderCount() {
      return Math.max(0, this.repeatCount || 0);
    }

    getRequiredCylinderCount() {
      return Math.max(0, this.getTrackedPopulationLoss() / OVERPOPULATION_ONEILL_COLONISTS_PER_CYLINDER);
    }

    getTravelConversionCount() {
      if (gameSettings.noOverpopulationCylinders) {
        return 0;
      }
      return Math.max(0, Math.min(this.getRequiredCylinderCount(), this.getBuiltCylinderCount()));
    }

    getSelectedBuildCount() {
      const selected = Math.max(0, this.buildCount || 0);
      return selected;
    }

    isVisible() {
      return this.unlocked || this.getBuiltCylinderCount() > 0;
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
      const base = Project.prototype.getScaledCost.call(this);
      const count = this.isActive
        ? Math.max(0, this.activeBuildCount || 0)
        : this.getSelectedBuildCount();
      const scaled = {};

      for (const category in base) {
        scaled[category] = {};
        for (const resource in base[category]) {
          scaled[category][resource] = base[category][resource] * count;
        }
      }

      return scaled;
    }

    canStart() {
      if (!super.canStart()) {
        return false;
      }
      return this.getSelectedBuildCount() > 0;
    }

    adjustBuildCount(delta) {
      const next = Math.round(this.buildCount + delta);
      this.buildCount = Math.max(1, Math.min(OVERPOPULATION_ONEILL_MAX_BATCH, next));
    }

    scaleBuildCount(multiplier) {
      if (multiplier > 1) {
        this.buildCount = Math.min(OVERPOPULATION_ONEILL_MAX_BATCH, multiplyByTen(this.buildCount));
      } else {
        this.buildCount = Math.max(1, divideByTen(this.buildCount));
      }
    }

    setBuildCount(value) {
      const numeric = Number(value);
      if (numeric >= 0) {
        this.buildCount = Math.min(OVERPOPULATION_ONEILL_MAX_BATCH, numeric);
      }
    }

    setRequiredBuildCount() {
      const required = this.getRequiredCylinderCount();
      const built = this.getBuiltCylinderCount();
      const remaining = Math.max(0, required - built);
      this.buildCount = Math.min(OVERPOPULATION_ONEILL_MAX_BATCH, remaining);
    }

    start(resources) {
      this.activeBuildCount = this.getSelectedBuildCount();
      if (this.activeBuildCount <= 0) {
        this.activeBuildCount = 0;
        return false;
      }
      const started = super.start(resources);
      if (!started) {
        this.activeBuildCount = 0;
        return false;
      }
      this.complete();
      return true;
    }

    complete() {
      const completions = Math.max(0, this.activeBuildCount || 0);
      this.activeBuildCount = 0;
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
    }

    prepareTravelState() {
      const convertedCylinders = this.getTravelConversionCount();
      if (convertedCylinders <= 0) {
        return;
      }
      spaceManager.setOneillCylinderCount(spaceManager.getOneillCylinderCount() + convertedCylinders);
      this.repeatCount = 0;
      this.activeBuildCount = 0;
      this.isActive = false;
      this.isPaused = false;
      this.isCompleted = false;
      this.remainingTime = this.getEffectiveDuration();
      this.startingDuration = this.remainingTime;
    }

    renderUI(container) {
      const card = document.createElement('div');
      card.classList.add('info-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = getOverpopulationOneillText('title', null, "O'Neill Cylinder Components");
      header.appendChild(title);
      card.appendChild(header);

      const body = document.createElement('div');
      body.classList.add('card-body');

      const summaryGrid = document.createElement('div');
      summaryGrid.classList.add('stats-grid', 'five-col', 'project-summary-grid');

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

      const lostPopulation = createSummaryBox(getOverpopulationOneillText('lostPopulation', null, 'Population Lost'));
      const requiredCylinders = createSummaryBox(getOverpopulationOneillText('requiredCylinders', null, 'Required Cylinders'));
      const cylindersBuilt = createSummaryBox(getOverpopulationOneillText('cylindersBuilt', null, 'Cylinders Built'));
      const travelConversion = createSummaryBox(getOverpopulationOneillText('travelConversion', null, 'Travel Conversion'));
      const buildAmount = createSummaryBox(getOverpopulationOneillText('buildAmount', null, 'Build Amount'));
      lostPopulation.value.dataset.overpopOneillUi = 'lostPopulationValue';
      requiredCylinders.value.dataset.overpopOneillUi = 'requiredCylindersValue';
      cylindersBuilt.value.dataset.overpopOneillUi = 'cylindersBuiltValue';
      travelConversion.value.dataset.overpopOneillUi = 'travelConversionValue';
      buildAmount.value.dataset.overpopOneillUi = 'buildAmountValue';

      const multiplierControls = document.createElement('div');
      multiplierControls.classList.add('scanner-mult-controls');
      const oneButton = document.createElement('button');
      oneButton.textContent = getOverpopulationOneillText('one', null, '1');
      const divideButton = document.createElement('button');
      divideButton.textContent = getOverpopulationOneillText('divideTen', null, '/10');
      const multiplyButton = document.createElement('button');
      multiplyButton.textContent = getOverpopulationOneillText('timesTen', null, 'x10');
      const reqButton = document.createElement('button');
      reqButton.textContent = getOverpopulationOneillText('req', null, 'Req');
      multiplierControls.append(oneButton, divideButton, multiplyButton, reqButton);
      buildAmount.content.classList.add('project-summary-flex');
      buildAmount.content.appendChild(multiplierControls);

      const buildButton = document.createElement('button');
      buildButton.dataset.overpopOneillUi = 'buildButton';
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
      oneButton.addEventListener('click', () => {
        this.setBuildCount(1);
        refresh();
      });
      reqButton.addEventListener('click', () => {
        this.setRequiredBuildCount();
        refresh();
      });

      this.uiElements = {
        lostPopulationValue: lostPopulation.value,
        requiredCylindersValue: requiredCylinders.value,
        cylindersBuiltValue: cylindersBuilt.value,
        travelConversionValue: travelConversion.value,
        buildAmountValue: buildAmount.value,
        buildButton
      };

      this.updateUI();
    }

    updateUI() {
      const uiElements = this.resolveUIElements();
      if (!uiElements) {
        return;
      }
      const required = this.getRequiredCylinderCount();
      const travelConversion = this.getTravelConversionCount();
      const selected = this.getSelectedBuildCount();
      uiElements.lostPopulationValue.textContent = formatNumber(this.getTrackedPopulationLoss(), true);
      uiElements.requiredCylindersValue.textContent = formatNumber(required, true, 3);
      uiElements.cylindersBuiltValue.textContent = formatNumber(this.getBuiltCylinderCount(), true, 3);
      uiElements.travelConversionValue.textContent = formatNumber(travelConversion, true, 3);
      uiElements.buildAmountValue.textContent = formatNumber(selected, true, 3);
      uiElements.buildButton.textContent = getOverpopulationOneillText(
        'buildButton',
        { count: formatNumber(selected, true, 3) },
        `Build ${formatNumber(selected, true, 3)} Cylinders`
      );
      uiElements.buildButton.disabled = !this.canStart();
    }

    saveState() {
      return {
        ...super.saveState(),
        buildCount: this.buildCount,
        activeBuildCount: this.activeBuildCount
      };
    }

    loadState(state) {
      super.loadState(state);
      this.buildCount = Math.max(0, state.buildCount || 1);
      this.activeBuildCount = Math.max(0, state.activeBuildCount || 0);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverpopulationOneillCylindersProject;
  } else {
    window.OverpopulationOneillCylindersProject = OverpopulationOneillCylindersProject;
  }
}());
