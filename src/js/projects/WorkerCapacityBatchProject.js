class WorkerCapacityBatchProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.buildCount = 1;
    this.activeBuildCount = 1;
    this.autoMax = true;
    this.workersPerCompletion = this.attributes?.workersPerCompletion ?? null;
    this.workerCapacityUI = null;
    this.workerCapacityStep = 1;
  }

  getWorkersPerCompletion() {
    return this.workersPerCompletion ?? this.attributes?.workersPerCompletion ?? 10000;
  }

  getWorkerCapLimit() {
    const workers = resources?.colony?.workers?.cap ?? 0;
    const perCompletion = this.getWorkersPerCompletion();
    const maxByWorkers = perCompletion > 0 ? Math.ceil(workers / perCompletion) : Infinity;
    if (this.maxRepeatCount === Infinity) {
      return maxByWorkers;
    }
    return Math.max(Math.min(maxByWorkers, this.maxRepeatCount), 1);
  }

  getEffectiveBuildCount(count = this.buildCount) {
    const remaining = this.maxRepeatCount === Infinity
      ? Infinity
      : this.maxRepeatCount - this.repeatCount;
    return Math.max(0, Math.min(count, remaining));
  }

  getBatchCostMultiplier() {
    if (this.isActive) {
      return this.activeBuildCount || 1;
    }
    const cappedCount = Math.min(this.buildCount, this.getWorkerCapLimit());
    return this.getEffectiveBuildCount(cappedCount);
  }

  getScaledCost() {
    const base = super.getScaledCost();
    const count = this.getBatchCostMultiplier();
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
    const limit = this.getWorkerCapLimit();
    this.buildCount = Math.max(1, Math.min(this.buildCount + delta, limit));
  }

  setBuildCount(value) {
    const limit = this.getWorkerCapLimit();
    this.buildCount = Math.max(1, Math.min(value, limit));
  }

  setMaxBuildCount() {
    this.setBuildCount(this.getWorkerCapLimit());
  }

  getWorkerCapacityStep() {
    return this.workerCapacityStep ?? 1;
  }

  setWorkerCapacityStep(step) {
    const normalized = Math.max(1, Math.round(step));
    this.workerCapacityStep = normalized;
  }

  start(resources) {
    const limit = this.getWorkerCapLimit();
    const cappedCount = Math.min(this.buildCount, limit);
    this.activeBuildCount = this.getEffectiveBuildCount(cappedCount);
    return super.start(resources);
  }

  complete() {
    const completions = this.activeBuildCount || 1;
    for (let i = 0; i < completions; i++) {
      super.complete();
    }
    this.activeBuildCount = 1;
  }

  saveState() {
    return {
      ...super.saveState(),
      buildCount: this.buildCount,
      activeBuildCount: this.activeBuildCount,
      autoMax: this.autoMax,
      workersPerCompletion: this.workersPerCompletion,
      workerCapacityStep: this.workerCapacityStep,
    };
  }

  loadState(state) {
    super.loadState(state);
    if (state.buildCount !== undefined) {
      this.setBuildCount(state.buildCount);
    }
    this.activeBuildCount = state.activeBuildCount ?? this.activeBuildCount;
    this.autoMax = state.autoMax ?? this.autoMax;
    this.workersPerCompletion = state.workersPerCompletion ?? this.workersPerCompletion;
    this.workerCapacityStep = state.workerCapacityStep ?? this.workerCapacityStep;
  }

  renderWorkerCapacityControls(container, {
    amountTitle = 'Amount',
    tooltip,
    autoMaxLabel = 'Auto Max',
    layoutClass = 'worker-capacity-layout',
  } = {}) {
    if (this.workerCapacityUI && this.workerCapacityUI.container?.isConnected) {
      return this.workerCapacityUI;
    }

    const costElement = container.querySelector('.project-cost');

    const topSection = document.createElement('div');
    topSection.className = `project-top-section ${layoutClass}`.trim();

    const costSection = document.createElement('div');
    costSection.className = 'project-section-container';
    const costTitle = document.createElement('h4');
    costTitle.className = 'section-title';
    costTitle.textContent = 'Cost';
    costSection.appendChild(costTitle);
    if (costElement) {
      const label = costElement.querySelector('strong');
      if (label) {
        label.remove();
      }
      costSection.appendChild(costElement);
    }
    topSection.appendChild(costSection);

    const amountSection = document.createElement('div');
    amountSection.className = 'project-section-container';
    const amountHeader = document.createElement('h4');
    amountHeader.className = 'section-title';
    amountHeader.textContent = amountTitle;
    const amountDisplay = document.createElement('div');
    amountDisplay.className = 'amount-display';
    const val = document.createElement('span');
    val.id = `${this.name}-count`;
    const slash = document.createElement('span');
    slash.textContent = ' / ';
    const max = document.createElement('span');
    max.id = `${this.name}-max`;
    const info = document.createElement('span');
    info.className = 'info-tooltip-icon';
    if (tooltip) {
      info.title = tooltip;
    }
    info.innerHTML = '&#9432;';
    amountDisplay.append(val, slash, max, info);

    const controls = document.createElement('div');
    controls.className = 'amount-controls';
    const mainControls = document.createElement('div');
    mainControls.className = 'scanner-main-controls';
    const bMin = document.createElement('button');
    bMin.textContent = '1';
    const bMinus = document.createElement('button');
    bMinus.textContent = '-';
    const bPlus = document.createElement('button');
    bPlus.textContent = '+';
    const bMax = document.createElement('button');
    bMax.textContent = 'Max';
    mainControls.append(bMin, bMinus, bPlus, bMax);

    const multControls = document.createElement('div');
    multControls.className = 'scanner-mult-controls';
    const bDiv = document.createElement('button');
    bDiv.textContent = '/10';
    const bMul = document.createElement('button');
    bMul.textContent = 'x10';
    multControls.append(bDiv, bMul);

    controls.append(mainControls, multControls);

    const autoContainer = document.createElement('div');
    autoContainer.className = 'checkbox-container';
    const autoMaxCheckbox = document.createElement('input');
    autoMaxCheckbox.type = 'checkbox';
    autoMaxCheckbox.id = `${this.name}-auto-max`;
    autoMaxCheckbox.checked = this.autoMax;
    autoMaxCheckbox.addEventListener('change', (event) => {
      this.autoMax = event.target.checked;
    });
    const autoLabel = document.createElement('label');
    autoLabel.htmlFor = autoMaxCheckbox.id;
    autoLabel.textContent = autoMaxLabel;
    autoContainer.append(autoMaxCheckbox, autoLabel);

    amountSection.append(amountHeader, amountDisplay, controls, autoContainer);
    topSection.appendChild(amountSection);

    container.appendChild(topSection);

    const refresh = () => {
      if (typeof updateProjectUI === 'function') {
        updateProjectUI(this.name);
      }
    };

    bPlus.addEventListener('click', () => {
      this.adjustBuildCount(this.getWorkerCapacityStep());
      refresh();
    });
    bMinus.addEventListener('click', () => {
      this.adjustBuildCount(-this.getWorkerCapacityStep());
      refresh();
    });
    bMul.addEventListener('click', () => {
      this.setWorkerCapacityStep(this.getWorkerCapacityStep() * 10);
      refresh();
    });
    bDiv.addEventListener('click', () => {
      this.setWorkerCapacityStep(this.getWorkerCapacityStep() / 10);
      refresh();
    });
    bMin.addEventListener('click', () => {
      this.setBuildCount(1);
      refresh();
    });
    bMax.addEventListener('click', () => {
      this.setMaxBuildCount();
      refresh();
    });

    this.workerCapacityUI = {
      container: topSection,
      costSection,
      amountSection,
      val,
      max,
      info,
      bPlus,
      bMinus,
      bMul,
      bDiv,
      bMin,
      bMax,
      autoMaxCheckbox,
    };

    return this.workerCapacityUI;
  }

  updateWorkerCapacityControls() {
    const ui = this.workerCapacityUI;
    if (!ui) {
      return;
    }

    const formatter = typeof formatNumber === 'function'
      ? formatNumber
      : (value, short) => {
        if (!Number.isFinite(value)) {
          return '0';
        }
        if (short) {
          return Math.round(value).toString();
        }
        return value.toString();
      };

    if (ui.val) {
      ui.val.textContent = formatter(this.buildCount, true);
    }
    if (ui.max) {
      ui.max.textContent = formatter(this.getWorkerCapLimit(), true);
    }
    const step = this.getWorkerCapacityStep();
    if (ui.bPlus) {
      ui.bPlus.textContent = `+${formatter(step, true)}`;
    }
    if (ui.bMinus) {
      ui.bMinus.textContent = `-${formatter(step, true)}`;
    }
    if (ui.autoMaxCheckbox) {
      ui.autoMaxCheckbox.checked = this.autoMax;
    }
    if (ui.costSection && ui.amountSection) {
      const isMaxed = this.repeatCount >= this.maxRepeatCount;
      ui.costSection.style.display = isMaxed ? 'none' : '';
      ui.amountSection.style.display = isMaxed ? 'none' : '';
    }
  }

  update(deltaTime) {
    if (this.autoMax) {
      const limit = this.getWorkerCapLimit();
      if (this.buildCount !== limit) {
        this.setBuildCount(limit);
        if (typeof updateProjectUI === 'function') {
          updateProjectUI(this.name);
        }
      }
    }
    super.update(deltaTime);
  }

  updateUI() {
    this.updateWorkerCapacityControls();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkerCapacityBatchProject;
}
