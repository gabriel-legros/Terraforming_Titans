
let WorkerCapacityBatchProjectBase;

if (typeof module !== 'undefined' && module.exports) {
  WorkerCapacityBatchProjectBase = require('./WorkerCapacityBatchProject.js');
} else {
  WorkerCapacityBatchProjectBase = WorkerCapacityBatchProject;
}

class ScannerProject extends WorkerCapacityBatchProjectBase {
  constructor(config, name) {
    super(config, name);
    this.step = 1;
    this.el = {};
  }

  getWorkerCapacityStep() {
    return this.step;
  }

  setWorkerCapacityStep(step) {
    this.step = Math.max(1, Math.round(step));
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

    const state = super.saveState();
    state.step = this.step;
    state.scanData = savedState;
    return state;
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
    this.step = state.step ?? this.step;
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

  complete() {
    super.complete();
    if (
      this.attributes &&
      this.attributes.scanner &&
      this.attributes.scanner.canSearchForDeposits
    ) {
      this.applyScannerEffect();
    }
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
    const controls = this.renderWorkerCapacityControls(container, {
      tooltip: 'Worker capacity lets us build scanners in parallel. One satellite can be produced per 10,000 worker cap.',
      layoutClass: 'scanner-layout',
    });

    const topSection = controls.container;

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

    this.el = {
      val: controls.val,
      max: controls.max,
      bPlus: controls.bPlus,
      bMinus: controls.bMinus,
      bMul: controls.bMul,
      bDiv: controls.bDiv,
      bMin: controls.bMin,
      bMax: controls.bMax,
      costSection: controls.costSection,
      amountSection: controls.amountSection,
      autoMaxCheckbox: controls.autoMaxCheckbox,
    };
    if (dVal && dMax) {
      this.el.dVal = dVal;
      this.el.dMax = dMax;
    }
  }

  updateUI() {
    super.updateUI();
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
  }



}

if (typeof globalThis !== 'undefined') {
  globalThis.ScannerProject = ScannerProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScannerProject;
}
