
class ScannerProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.buildCount = 1;
    this.step = 1;
    this.activeBuildCount = 1;
    this.autoMax = true;
    this.el = {};
  }

  initializeScanner(planetParameters) {
    this.underground = planetParameters.resources.underground;
    this.scanData = {};
    for (const depositType in this.underground) {
      const depositParams = this.underground[depositType];
      const existing =
        typeof resources !== 'undefined' &&
        resources.underground &&
        resources.underground[depositType]
          ? resources.underground[depositType].value
          : undefined;
      this.scanData[depositType] = {
        D_current: existing ?? depositParams.initialValue,
        currentScanProgress: 0,
        currentScanningStrength: 0,
        remainingTime: 0,
      };
    }
    this.loadScannerConfig(planetParameters);
    this.scanningSpeedMultiplier = 1;
  }

  applyActiveEffects(firstTime = true) {
    if (this.scanData) {
      this.scanningSpeedMultiplier = 1;
    }
    super.applyActiveEffects(firstTime);
  }

  saveState() {
    let savedState = {};
    if (this.scanData) {
      for (const depositType in this.scanData) {
        const scanData = this.scanData[depositType];
        savedState[depositType] = {
          D_max: scanData.D_max,
          A_total: scanData.A_total,
          currentScanProgress: scanData.currentScanProgress,
          currentScanningStrength: scanData.currentScanningStrength,
          remainingTime: scanData.remainingTime,
        };
      }
    }

    return {
      ...super.saveState(),
      buildCount: this.buildCount,
      activeBuildCount: this.activeBuildCount,
      step: this.step,
      autoMax: this.autoMax,
      scanData: savedState
    };
  }

  loadState(state) {
    if (this.scanData) {
      for (const depositType in state.scanData) {
        if (this.scanData[depositType]) {
          Object.assign(this.scanData[depositType], state.scanData[depositType]);
        }
      }
      this.loadScannerConfig(currentPlanetParameters);
    }

    super.loadState(state);
    if (state.buildCount !== undefined) {
      this.buildCount = state.buildCount;
    }
    if (state.activeBuildCount !== undefined) {
      this.activeBuildCount = state.activeBuildCount;
    }
    if (state.step !== undefined) {
      this.step = state.step;
    }
    if (state.autoMax !== undefined) {
      this.autoMax = state.autoMax;
    }
  }

  loadScannerConfig(planetParameters) {
    const newUnderground = planetParameters.resources.underground;
    for (const depositType in newUnderground) {
      const depositParams = newUnderground[depositType];
      const old_max = this.scanData[depositType].D_max;
      this.scanData[depositType].D_max = depositParams.maxDeposits;
      this.scanData[depositType].A_total = depositParams.areaTotal;
      if (old_max < this.scanData[depositType].D_max) {
        this.startScan(depositType);
      }
    }
  }

  calculateExpectedTime(depositType, scanningStrength = 1) {
    const scanData = this.scanData[depositType];
    if (!scanData || scanData.D_current >= scanData.D_max) {
      return Infinity;
    }

    const densityFactor =
      (scanData.D_max - scanData.D_current) / scanData.A_total;
    const baseTime = 1 / densityFactor;
    return baseTime / scanningStrength;
  }

  startScan(depositType) {
    const scanData = this.scanData[depositType];
    if (!scanData) {
      return;
    }

    if (scanData.remainingTime <= 0 || scanData.currentScanProgress >= 1) {
      scanData.remainingTime = this.calculateExpectedTime(
        depositType,
        scanData.currentScanningStrength
      );
      scanData.currentScanProgress = 0;
    }
  }

  updateScan(deltaTime) {
    for (const depositType in this.scanData) {
      const scanData = this.scanData[depositType];
      if (resources && resources.underground && resources.underground[depositType] && resources.underground[depositType].value !== undefined) {
        scanData.D_current = resources.underground[depositType].value;
      }
      if (!scanData) {
        continue;
      }
      if (scanData.D_current >= scanData.D_max) {
        scanData.currentScanningStrength = 0;
        continue;
      }
      if (scanData.remainingTime <= 0) {
        continue;
      }
      const progressIncrement =
        (deltaTime * this.scanningSpeedMultiplier) / scanData.remainingTime;
      scanData.currentScanProgress += progressIncrement;
      if (scanData.currentScanProgress >= 1) {
        scanData.D_current++;
        resources.underground[depositType].addDeposit();


        if (scanData.D_current < scanData.D_max) {
          this.startScan(depositType);
        } else {
          scanData.remainingTime = 0;
        }
      }
    }
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (this.autoMax) {
      const limit = this.getWorkerCapLimit();
      if (this.buildCount < limit) {
        this.buildCount = limit;
        if (typeof updateProjectUI === 'function') {
          updateProjectUI(this.name);
        }
      }
    }
    if (this.scanData) {
      if (
        this.attributes.scanner &&
        this.attributes.scanner.depositType
      ) {
        const depositType = this.attributes.scanner.depositType;
        const data = this.scanData[depositType];
        let targetStrength =
          (this.attributes.scanner.searchValue || 0) * this.repeatCount;
        if (data.D_current >= data.D_max) {
          targetStrength = 0;
        }
        if (data.currentScanningStrength !== targetStrength) {
          this.adjustScanningStrength(depositType, targetStrength);
          if (targetStrength > 0) {
            this.startScan(depositType);
          }
        }
      }
      this.updateScan(deltaTime);
    } else if (
      typeof oreScanner !== 'undefined' &&
      oreScanner.adjustScanningStrength &&
      this.attributes.scanner &&
      this.attributes.scanner.depositType
    ) {
      const depositType = this.attributes.scanner.depositType;
      const targetStrength =
        (this.attributes.scanner.searchValue || 0) * this.repeatCount;
      oreScanner.adjustScanningStrength(depositType, targetStrength);
      if (targetStrength > 0 && oreScanner.startScan) {
        oreScanner.startScan(depositType);
      }
    }
  }

  adjustScanningStrength(depositType, newScanningStrength) {
    const scanData = this.scanData[depositType];
    if (!scanData) {
      return;
    }

    scanData.currentScanningStrength = newScanningStrength;

    if (scanData.remainingTime <= 0) {
      return;
    }

    const newExpectedTime = this.calculateExpectedTime(
      depositType,
      newScanningStrength
    );

    scanData.remainingTime = newExpectedTime;
  }

  getCurrentDepositCount(depositType) {
    const scanData = this.scanData[depositType];
    return scanData ? scanData.D_current : null;
  }

  getWorkerCapLimit() {
    const workerCap = Math.ceil((resources?.colony?.workers?.cap || 0) / 5000);
    if (this.maxRepeatCount === Infinity) {
      return workerCap;
    }
    return Math.max(Math.min(workerCap, this.maxRepeatCount), 1);
  }

  getEffectiveBuildCount(count = this.buildCount) {
    const remaining = this.maxRepeatCount === Infinity ? Infinity : this.maxRepeatCount - this.repeatCount;
    return Math.max(0, Math.min(count, remaining));
  }

  getScaledCost() {
    const base = super.getScaledCost();
    const count =
      this.isActive
        ? (this.activeBuildCount || 1)
        : this.getEffectiveBuildCount(
            Math.min(this.buildCount, this.getWorkerCapLimit())
          );
    const scaled = {};
    for (const cat in base) {
      scaled[cat] = {};
      for (const res in base[cat]) {
        scaled[cat][res] = base[cat][res] * count;
      }
    }
    return scaled;
  }

  adjustBuildCount(delta) {
    const limit = this.getWorkerCapLimit();
    this.buildCount = Math.max(0, Math.min(this.buildCount + delta, limit));
  }

  setBuildCount(val) {
    const limit = this.getWorkerCapLimit();
    this.buildCount = Math.max(0, Math.min(val, limit));
  }

  setMaxBuildCount() {
    this.setBuildCount(this.getWorkerCapLimit());
  }

  start(resources) {
    this.activeBuildCount = this.getEffectiveBuildCount(
      Math.min(this.buildCount, this.getWorkerCapLimit())
    );
    return super.start(resources);
  }

  complete() {
    const n = this.activeBuildCount || 1;
    for (let i = 0; i < n; i++) {
      super.complete();
    }
    if (
      this.attributes &&
      this.attributes.scanner &&
      this.attributes.scanner.canSearchForDeposits
    ) {
      this.applyScannerEffect();
    }
    this.activeBuildCount = 1;
  }

  applyScannerEffect() {
    if (
      this.attributes.scanner &&
      this.attributes.scanner.depositType
    ) {
      const depositType = this.attributes.scanner.depositType;
      if (typeof oreScanner !== 'undefined' && oreScanner.startScan) {
        oreScanner.startScan(depositType);
      } else {
        this.startScan(depositType);
      }
    }
  }

  renderUI(container) {
    const costElement = container.querySelector('.project-cost');

    const topSection = document.createElement('div');
    topSection.className = 'project-top-section scanner-layout';

    // Cost Section
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

    // Amount Section
    const amountSection = document.createElement('div');
    amountSection.className = 'project-section-container';
    const amountTitle = document.createElement('h4');
    amountTitle.className = 'section-title';
    amountTitle.textContent = 'Amount';
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
    info.title = 'Worker capacity lets us build scanners in parallel. One satellite can be produced per 5,000 worker cap.';
    info.innerHTML = '&#9432;';
    amountDisplay.append(val, slash, max, info);

    const controls = document.createElement('div');
    controls.className = 'amount-controls';
    const main = document.createElement('div');
    main.className = 'scanner-main-controls';
    const b0 = document.createElement('button');
    b0.textContent = '0';
    const bMinus = document.createElement('button');
    bMinus.textContent = '-';
    const bPlus = document.createElement('button');
    bPlus.textContent = '+';
    const bMax = document.createElement('button');
    bMax.textContent = 'Max';
    main.append(b0, bMinus, bPlus, bMax);

    const mult = document.createElement('div');
    mult.className = 'scanner-mult-controls';
    const bDiv = document.createElement('button');
    bDiv.textContent = '/10';
    const bMul = document.createElement('button');
    bMul.textContent = 'x10';
    mult.append(bDiv, bMul);

    const autoContainer = document.createElement('div');
    autoContainer.className = 'checkbox-container';
    const autoMaxCheckbox = document.createElement('input');
    autoMaxCheckbox.type = 'checkbox';
    autoMaxCheckbox.id = `${this.name}-auto-max`;
    autoMaxCheckbox.checked = this.autoMax;
    autoMaxCheckbox.addEventListener('change', (e) => {
      this.autoMax = e.target.checked;
    });
    const autoLabel = document.createElement('label');
    autoLabel.htmlFor = autoMaxCheckbox.id;
    autoLabel.textContent = 'Auto Max';
    autoContainer.append(autoMaxCheckbox, autoLabel);

    controls.append(main, mult);
    amountSection.append(amountTitle, amountDisplay, controls, autoContainer);
    topSection.appendChild(amountSection);

    // Deposits Section
    let dVal, dMax;
    if (this.attributes?.scanner?.depositType) {
      const depositSection = document.createElement('div');
      depositSection.className = 'project-section-container';
      const depositTitle = document.createElement('h4');
      depositTitle.className = 'section-title';
      depositTitle.textContent = 'Deposits';
      const depositContainer = document.createElement('div');
      depositContainer.className = 'deposits-container';
      dVal = document.createElement('span');
      dVal.id = `${this.name}-deposit-current`;
      const dSlash = document.createElement('span');
      dSlash.textContent = ' / ';
      dMax = document.createElement('span');
      dMax.id = `${this.name}-deposit-max`;
      const dInfo = document.createElement('span');
      dInfo.className = 'info-tooltip-icon';
      dInfo.title = 'Shows discovered and maximum deposits satellites can find on this planet.';
      dInfo.innerHTML = '&#9432;';
      depositContainer.append(dVal, dSlash, dMax, dInfo);
      depositSection.append(depositTitle, depositContainer);
      topSection.appendChild(depositSection);
    }

    container.appendChild(topSection);

    this.el = { val, max, bPlus, bMinus, bMul, bDiv, b0, bMax, costSection, amountSection, autoMaxCheckbox };
    if (dVal && dMax) {
      this.el.dVal = dVal;
      this.el.dMax = dMax;
    }

    const refresh = () => {
      if (typeof updateProjectUI === 'function') {
        updateProjectUI(this.name);
      }
    };
    bPlus.onclick = () => { this.adjustBuildCount(this.step); refresh(); };
    bMinus.onclick = () => { this.adjustBuildCount(-this.step); refresh(); };
    bMul.onclick = () => { this.step *= 10; refresh(); };
    bDiv.onclick = () => { this.step = Math.max(1, this.step / 10); refresh(); };
    b0.onclick = () => { this.setBuildCount(0); refresh(); };
    bMax.onclick = () => { this.setMaxBuildCount(); refresh(); };
  }

  updateUI() {
    if (this.el.val) {
      this.el.val.textContent = formatNumber(this.buildCount, true);
    }
    if (this.el.max) {
      this.el.max.textContent = formatNumber(this.getWorkerCapLimit(), true);
    }
    if (this.el.bPlus) {
      this.el.bPlus.textContent = `+${formatNumber(this.step, true)}`;
    }
    if (this.el.bMinus) {
      this.el.bMinus.textContent = `-${formatNumber(this.step, true)}`;
    }
    if (this.el.autoMaxCheckbox) {
      this.el.autoMaxCheckbox.checked = this.autoMax;
    }
    if (this.el.dVal && this.el.dMax) {
      const depositType = this.attributes?.scanner?.depositType;
      const data = depositType && this.scanData ? this.scanData[depositType] : null;
      const current = data ? data.D_current : 0;
      const max = data ? data.D_max : 0;
      this.el.dVal.textContent = formatNumber(current, true);
      this.el.dMax.textContent = formatNumber(max, true);
    }

    if (this.el.costSection && this.el.amountSection) {
        const isMaxed = this.repeatCount >= this.maxRepeatCount;
        this.el.costSection.style.display = isMaxed ? 'none' : '';
        this.el.amountSection.style.display = isMaxed ? 'none' : '';
    }
  }



}

if (typeof globalThis !== 'undefined') {
  globalThis.ScannerProject = ScannerProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScannerProject;
}
