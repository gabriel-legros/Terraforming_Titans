class ScannerProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.buildCount = 1;
    this.step = 1;
    this.activeBuildCount = 1;
    this.el = {};
  }

  getColonistLimit() {
    return Math.ceil((resources?.colony?.colonists?.value || 0) / 10000);
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
      if (
        this.attributes &&
        this.attributes.scanner &&
        this.attributes.scanner.canSearchForDeposits
      ) {
        this.applyScannerEffect();
      }
    }
    this.activeBuildCount = 1;
  }

  applyScannerEffect() {
    if (
      this.attributes.scanner &&
      this.attributes.scanner.searchValue &&
      this.attributes.scanner.depositType
    ) {
      const depositType = this.attributes.scanner.depositType;
      const additionalStrength = this.attributes.scanner.searchValue;
      oreScanner.adjustScanningStrength(
        depositType,
        oreScanner.scanData[depositType].currentScanningStrength + additionalStrength
      );
      console.log(
        `Scanner strength for ${depositType} increased by ${additionalStrength}. New scanning strength: ${oreScanner.scanData[depositType].currentScanningStrength}`
      );
      oreScanner.startScan(depositType);
      console.log(
        `Scanning for ${depositType} started after applying scanner effect from ${this.name}`
      );
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
    countContainer.append(label, val);

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

    this.el = { val, bPlus, bMinus, bMul, bDiv, b0 };

    const refresh = () => updateProjectUI(this.name);
    bPlus.onclick = () => { this.adjustBuildCount(this.step); refresh(); };
    bMinus.onclick = () => { this.adjustBuildCount(-this.step); refresh(); };
    bMul.onclick = () => { this.step *= 10; refresh(); };
    bDiv.onclick = () => { this.step = Math.max(1, this.step / 10); refresh(); };
    b0.onclick = () => { this.setBuildCount(0); refresh(); };
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (elements && elements.val) {
      elements.val.textContent = formatNumber(this.buildCount, true);
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.ScannerProject = ScannerProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScannerProject;
}
