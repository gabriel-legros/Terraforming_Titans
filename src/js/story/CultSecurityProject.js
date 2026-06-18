class CultSecurityProject extends Project {
  constructor(config, name) {
    super(config, name);
    const upgrades = this.attributes.securityUpgrades || [];
    this.securityUpgrades = upgrades;
    this.securityPurchases = {};
    for (let i = 0; i < upgrades.length; i += 1) {
      this.securityPurchases[upgrades[i].resource] = 0;
    }
  }

  getSecurityText(path, fallback, vars) {
    return t(`ui.projects.cultSecurity.${path}`, vars, fallback);
  }

  getMaxPurchases() {
    return this.attributes.maxPurchases || 10;
  }

  getPenaltyStep() {
    return this.attributes.penaltyStep || 0.02;
  }

  getBasePenalty() {
    return this.attributes.basePenalty || 0.2;
  }

  getPurchaseCount(resource) {
    return this.securityPurchases[resource] || 0;
  }

  getCurrentPenalty(resource) {
    return Math.max(0, this.getBasePenalty() - (this.getPurchaseCount(resource) * this.getPenaltyStep()));
  }

  getNextCost(resource) {
    const count = this.getPurchaseCount(resource);
    if (count >= this.getMaxPurchases()) {
      return 0;
    }
    return Math.pow(10, count);
  }

  getEffectSourceId(resource) {
    return `${this.name}-${resource}-security`;
  }

  getTotalPurchases() {
    let total = 0;
    for (let i = 0; i < this.securityUpgrades.length; i += 1) {
      total += this.getPurchaseCount(this.securityUpgrades[i].resource);
    }
    return total;
  }

  getTotalPurchaseTarget() {
    return this.securityUpgrades.length * this.getMaxPurchases();
  }

  shouldApplySecurityEffects() {
    return this.unlocked &&
      (!this.attributes.planet || spaceManager.getCurrentPlanetKey() === this.attributes.planet);
  }

  applyEffects() {
    for (let i = 0; i < this.securityUpgrades.length; i += 1) {
      const upgrade = this.securityUpgrades[i];
      const sourceId = this.getEffectSourceId(upgrade.resource);
      removeEffect({
        target: 'building',
        targetId: upgrade.building,
        sourceId
      });

      const penalty = this.shouldApplySecurityEffects() ? this.getCurrentPenalty(upgrade.resource) : 0;
      if (penalty <= 0) {
        continue;
      }

      addEffect({
        target: 'building',
        targetId: upgrade.building,
        type: 'productionMultiplier',
        value: 1 - penalty,
        effectId: sourceId,
        sourceId,
        name: this.displayName
      });
    }
  }

  enable() {
    const wasUnlocked = this.unlocked;
    super.enable();
    if (!wasUnlocked && this.unlocked) {
      this.applyEffects();
    }
  }

  canPurchaseSecurityUpgrade(resource) {
    const cost = this.getNextCost(resource);
    return this.unlocked &&
      cost > 0 &&
      resources.colony[resource].value >= cost;
  }

  purchaseSecurityUpgrade(resource) {
    if (!this.canPurchaseSecurityUpgrade(resource)) {
      return false;
    }
    const cost = this.getNextCost(resource);
    resources.colony[resource].decrease(cost);
    this.securityPurchases[resource] = this.getPurchaseCount(resource) + 1;
    this.applyEffects();
    updateProjectUI(this.name);
    return true;
  }

  shouldHideStartBar() {
    return true;
  }

  renderUI(container) {
    const panel = document.createElement('div');
    panel.classList.add('cult-security-panel');

    const header = document.createElement('div');
    header.classList.add('cult-security-header');
    const headerMain = document.createElement('div');
    headerMain.classList.add('cult-security-header-main');
    const title = document.createElement('span');
    title.classList.add('cult-security-title');
    const summary = document.createElement('span');
    summary.classList.add('cult-security-summary');
    headerMain.appendChild(title);
    header.appendChild(headerMain);

    const progress = document.createElement('div');
    progress.classList.add('cult-security-progress');
    const progressTrack = document.createElement('div');
    progressTrack.classList.add('cult-security-progress-track');
    const progressFill = document.createElement('div');
    progressFill.classList.add('cult-security-progress-fill');
    const progressLabel = document.createElement('span');
    progressLabel.classList.add('cult-security-progress-label');
    progressTrack.appendChild(progressFill);
    progress.append(progressTrack, progressLabel);

    const rows = document.createElement('div');
    rows.classList.add('cult-security-rows');
    const rowMap = {};
    for (let i = 0; i < this.securityUpgrades.length; i += 1) {
      const upgrade = this.securityUpgrades[i];
      const row = document.createElement('div');
      row.classList.add('cult-security-row');
      const labelGroup = document.createElement('div');
      labelGroup.classList.add('cult-security-label-group');
      const label = document.createElement('span');
      label.classList.add('cult-security-label');
      const sublabel = document.createElement('span');
      sublabel.classList.add('cult-security-sublabel');
      const status = document.createElement('span');
      status.classList.add('cult-security-status');
      const rowMeter = document.createElement('div');
      rowMeter.classList.add('cult-security-row-meter');
      const rowMeterFill = document.createElement('div');
      rowMeterFill.classList.add('cult-security-row-meter-fill');
      rowMeter.appendChild(rowMeterFill);
      labelGroup.append(label, sublabel);
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('cult-security-button');
      button.addEventListener('click', () => this.purchaseSecurityUpgrade(upgrade.resource));
      row.append(labelGroup, rowMeter, status, button);
      rows.appendChild(row);
      rowMap[upgrade.resource] = { row, label, sublabel, status, rowMeterFill, button };
    }

    panel.append(header, summary, progress, rows);
    container.appendChild(panel);
    this.securityUI = {
      panel,
      title,
      summary,
      progressFill,
      progressLabel,
      rowMap
    };
    this.updateUI();
  }

  updateUI() {
    const ui = this.securityUI;
    if (!ui) {
      return;
    }
    const total = this.getTotalPurchases();
    const target = this.getTotalPurchaseTarget();
    const percent = target > 0 ? Math.round((total / target) * 100) : 0;
    ui.title.textContent = this.getSecurityText('title', 'Security audit');
    ui.summary.textContent = this.getSecurityText(
      'summary',
      'Prioritize the compromised production chains. Each audit closes access gaps and restores output.'
    );
    ui.progressFill.style.width = `${percent}%`;
    ui.progressLabel.textContent = this.getSecurityText(
      'progress',
      '{percent}% hardened',
      { percent }
    );

    for (let i = 0; i < this.securityUpgrades.length; i += 1) {
      const upgrade = this.securityUpgrades[i];
      const row = ui.rowMap[upgrade.resource];
      const resource = resources.colony[upgrade.resource];
      const penalty = this.getCurrentPenalty(upgrade.resource);
      const penaltyPercent = Math.round(penalty * 100);
      const count = this.getPurchaseCount(upgrade.resource);
      const max = this.getMaxPurchases();
      const cost = this.getNextCost(upgrade.resource);
      const restoredPercent = Math.round((count / max) * 100);
      row.label.textContent = resource.displayName;
      row.sublabel.textContent = this.getSecurityText(
        'sublabel',
        'Counterintelligence lockdown'
      );
      row.status.textContent = this.getSecurityText(
        'status',
        'Penalty -{penalty}%',
        { penalty: penaltyPercent, count, max }
      );
      row.rowMeterFill.style.width = `${restoredPercent}%`;
      if (cost > 0) {
        row.button.textContent = this.getSecurityText(
          'button',
          'Audit: {cost} {resource}',
          { cost: formatNumber(cost, true), resource: resource.displayName }
        );
        row.button.disabled = !this.canPurchaseSecurityUpgrade(upgrade.resource);
      } else {
        row.button.textContent = this.getSecurityText('secured', 'Secured');
        row.button.disabled = true;
      }
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      securityPurchases: { ...this.securityPurchases }
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    if (state.securityPurchases) {
      for (const resource in this.securityPurchases) {
        this.securityPurchases[resource] = state.securityPurchases[resource] || 0;
      }
    }
    this.applyEffects();
  }

  saveTravelState() {
    return {
      ...super.saveTravelState(),
      securityPurchases: { ...this.securityPurchases }
    };
  }

  loadTravelState(state = {}) {
    super.loadTravelState(state);
    if (state.securityPurchases) {
      for (const resource in this.securityPurchases) {
        this.securityPurchases[resource] = state.securityPurchases[resource] || 0;
      }
    }
    this.applyEffects();
  }
}

if (typeof window !== 'undefined') {
  window.CultSecurityProject = CultSecurityProject;
}
