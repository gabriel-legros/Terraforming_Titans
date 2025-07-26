
class ScannerProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.buildCount = 1;
    this.step = 1;
    this.activeBuildCount = 1;
    this.el = {};
  }

  initializeScanner(planetParameters) {
    this.underground = planetParameters.resources.underground;
    this.scanData = {};
    for (const depositType in this.underground) {
      const depositParams = this.underground[depositType];
      this.scanData[depositType] = {
        D_current: depositParams.initialValue,
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
    if (this.scanData) {
      const savedState = {};
      for (const depositType in this.scanData) {
        const scanData = this.scanData[depositType];
        savedState[depositType] = {
          D_max: scanData.D_max,
          A_total: scanData.A_total,
          D_current: scanData.D_current,
          currentScanProgress: scanData.currentScanProgress,
          currentScanningStrength: scanData.currentScanningStrength,
          remainingTime: scanData.remainingTime,
        };
      }
      return savedState;
    }

    return {
      ...super.saveState(),
      buildCount: this.buildCount,
      activeBuildCount: this.activeBuildCount,
      step: this.step,
    };
  }

  loadState(state) {
    if (this.scanData) {
      for (const depositType in state) {
        if (this.scanData[depositType]) {
          Object.assign(this.scanData[depositType], state[depositType]);
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
      console.log(`Invalid deposit type: ${depositType}`);
      return;
    }

    if (scanData.remainingTime <= 0 || scanData.currentScanProgress >= 1) {
      scanData.remainingTime = this.calculateExpectedTime(
        depositType,
        scanData.currentScanningStrength
      );
      scanData.currentScanProgress = 0;
    }

    console.log(
      `Scan started for ${depositType} with strength ${scanData.currentScanningStrength}, expected time: ${scanData.remainingTime}`
    );
  }

  updateScan(deltaTime) {
    for (const depositType in this.scanData) {
      const scanData = this.scanData[depositType];
      if (!scanData) {
        console.log(`Invalid deposit type: ${depositType}`);
        continue;
      }
      if (scanData.D_current >= scanData.D_max) {
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

        console.log(
          `Deposit found! Total ${depositType} deposits found: ${scanData.D_current}/${scanData.D_max}`
        );

        if (scanData.D_current < scanData.D_max) {
          this.startScan(depositType);
        } else {
          console.log(
            `All ${depositType} deposits have been found. No further scans will be started.`
          );
          scanData.remainingTime = 0;
        }
      }
    }
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (this.scanData) {
      if (
        this.attributes.scanner &&
        this.attributes.scanner.depositType
      ) {
        const depositType = this.attributes.scanner.depositType;
        const targetStrength =
          (this.attributes.scanner.searchValue || 0) * this.repeatCount;
        if (this.scanData[depositType].currentScanningStrength !== targetStrength) {
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
      console.log(`Invalid deposit type: ${depositType}`);
      return;
    }

    scanData.currentScanningStrength = newScanningStrength;

    if (scanData.remainingTime <= 0) {
      console.log(
        `No active scan for ${depositType} to adjust. Scanning strength set to ${scanData.currentScanningStrength}.`
      );
      return;
    }

    const newExpectedTime = this.calculateExpectedTime(
      depositType,
      newScanningStrength
    );

    scanData.remainingTime = newExpectedTime;
    console.log(
      `Scanning strength for ${depositType} adjusted to ${newScanningStrength}. New remaining time: ${scanData.remainingTime}`
    );
  }

  getCurrentDepositCount(depositType) {
    const scanData = this.scanData[depositType];
    return scanData ? scanData.D_current : null;
  }

  getColonistLimit() {
    const colonistCap = Math.ceil((resources?.colony?.colonists?.value || 0) / 10000);
    if (this.maxRepeatCount === Infinity) {
      return colonistCap;
    }
    return Math.min(colonistCap, this.maxRepeatCount);
  }

  getEffectiveBuildCount(count = this.buildCount) {
    const remaining = this.maxRepeatCount === Infinity ? Infinity : this.maxRepeatCount - this.repeatCount;
    return Math.max(0, Math.min(count, remaining));
  }

  getScaledCost() {
    const base = super.getScaledCost();
    const count = this.isActive ? (this.activeBuildCount || 1) : this.getEffectiveBuildCount(Math.min(this.buildCount, this.getColonistLimit()));
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
    const limit = this.getColonistLimit();
    this.buildCount = Math.max(0, Math.min(this.buildCount + delta, limit));
  }

  setBuildCount(val) {
    const limit = this.getColonistLimit();
    this.buildCount = Math.max(0, Math.min(val, limit));
  }

  start(resources) {
    this.activeBuildCount = this.getEffectiveBuildCount(Math.min(this.buildCount, this.getColonistLimit()));
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
    const wrapper = document.createElement('div');
    wrapper.className = 'power-controls-wrapper';
    const countContainer = document.createElement('div');
    countContainer.className = 'invested-container';
    const label = document.createElement('span');
    label.className = 'stat-label';
    label.textContent = 'Amount:';
    const val = document.createElement('span');
    val.id = `${this.name}-count`;
    val.className = 'stat-value';
    const slash = document.createElement('span');
    slash.textContent = ' / ';
    const max = document.createElement('span');
    max.id = `${this.name}-max`;
    max.className = 'stat-value';
    const info = document.createElement('span');
    info.className = 'info-tooltip-icon';
    info.title = 'Colonists let us build scanners in parallel. One satellite can be produced per 10,000 colonists.';
    info.innerHTML = '&#9432;';
    countContainer.append(label, val, slash, max, info);

    const controls = document.createElement('div');
    controls.className = 'thruster-power-controls';
    const main = document.createElement('div');
    main.className = 'main-buttons';
    const b0 = document.createElement('button');
    b0.textContent = '0';
    const bMinus = document.createElement('button');
    bMinus.textContent = '-';
    const bPlus = document.createElement('button');
    bPlus.textContent = '+';
    main.append(b0, bMinus, bPlus);

    const mult = document.createElement('div');
    mult.className = 'multiplier-container';
    const bDiv = document.createElement('button');
    bDiv.textContent = '/10';
    const bMul = document.createElement('button');
    bMul.textContent = 'x10';
    mult.append(bDiv, bMul);

    controls.append(main, mult);
    wrapper.append(countContainer, controls);
    container.appendChild(wrapper);

    this.el = { val, max, bPlus, bMinus, bMul, bDiv, b0 };

    const refresh = () => updateProjectUI(this.name);
    bPlus.onclick = () => { this.adjustBuildCount(this.step); refresh(); };
    bMinus.onclick = () => { this.adjustBuildCount(-this.step); refresh(); };
    bMul.onclick = () => { this.step *= 10; refresh(); };
    bDiv.onclick = () => { this.step = Math.max(1, this.step / 10); refresh(); };
    b0.onclick = () => { this.setBuildCount(0); refresh(); };
  }

  updateUI() {
    if (this.el.val) {
      this.el.val.textContent = formatNumber(this.buildCount, true);
    }
    if (this.el.max) {
      this.el.max.textContent = formatNumber(this.getColonistLimit(), true);
    }
    if (this.el.bPlus) {
      this.el.bPlus.textContent = `+${formatNumber(this.step, true)}`;
    }
    if (this.el.bMinus) {
      this.el.bMinus.textContent = `-${formatNumber(this.step, true)}`;
    }
  }



}

if (typeof globalThis !== 'undefined') {
  globalThis.ScannerProject = ScannerProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScannerProject;
}
