class GalacticInvasionManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages galactic invasion training.' });
    this.enabled = false;
    this.currentLetterKey = null;
    this.completedLetters = new Set();
    this.cooldownRemainingMs = 0;
    this.invasionTimerMs = 0;
    this.externalFailurePending = false;
    this.rewardSignature = '';
    this.rewardTargets = new Set();
  }

  enable(targetId) {
    if (targetId && targetId !== 'space-invasion' && targetId !== 'galacticInvasion') {
      return;
    }
    this.enabled = true;
    this.refreshUIVisibility();
  }

  refreshUIVisibility() {
    if (this.enabled) {
      showSpaceInvasionTab();
      initializeGalacticInvasionUI();
      updateGalacticInvasionUI({ force: true });
    } else {
      hideSpaceInvasionTab();
    }
  }

  applyEffect(effect) {
    if (!effect) {
      return;
    }
    if (effect.type === 'enable' || effect.type === 'unlockGalacticInvasion') {
      this.enable(effect.targetId);
      return;
    }
    super.applyEffect(effect);
  }

  update(deltaMs) {
    if (!this.enabled) {
      return;
    }
    if (this.cooldownRemainingMs > 0) {
      this.cooldownRemainingMs = Math.max(0, this.cooldownRemainingMs - deltaMs);
    }
    if (!this.currentLetterKey) {
      return;
    }
    if (this.externalFailurePending) {
      this.completeActiveInvasion();
      return;
    }
    if (this.isActiveInvasionDefeated()) {
      this.completeActiveInvasion();
      return;
    }
    this.invasionTimerMs += deltaMs;
    if (this.invasionTimerMs < PROMETHEAN_INVASION_OPERATION_MS) {
      return;
    }
    this.invasionTimerMs = 0;
    this.launchAvailableOperations();
  }

  startOrCancel(letterKey) {
    if (this.currentLetterKey) {
      this.cancelActiveInvasion();
      return false;
    }
    return this.startInvasion(letterKey);
  }

  startInvasion(letterKey) {
    const letter = this.getLetter(letterKey);
    if (!letter || !this.hasGalaxyConquest() || this.completedLetters.has(letter.key) || this.cooldownRemainingMs > 0 || this.currentLetterKey) {
      return false;
    }
    galaxyManager.initialize();
    galaxyManager.enable('space-galaxy', { autoSwitch: false });
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    faction.setFleetPower(letter.fleetPower);
    faction.fleetCapacity = letter.fleetPower;
    this.currentLetterKey = letter.key;
    this.externalFailurePending = false;
    this.invasionTimerMs = 0;
    this.launchExternalRimOperation();
    updateGalaxyUI({ force: true });
    updateGalacticInvasionUI({ force: true });
    return true;
  }

  cancelActiveInvasion() {
    this.defeatActiveInvasion(false);
    this.cooldownRemainingMs = PROMETHEAN_INVASION_CANCEL_COOLDOWN_MS;
    updateGalacticInvasionUI({ force: true });
  }

  completeActiveInvasion() {
    const letterKey = this.currentLetterKey;
    if (!letterKey) {
      return;
    }
    const letter = this.getLetter(letterKey);
    if (letter) {
      for (let i = 0; i <= letter.index; i += 1) {
        this.completedLetters.add(GALACTIC_INVASION_LETTERS[i].key);
      }
    }
    this.defeatActiveInvasion(false);
    this.refreshRewardEffects();
    updateGalacticInvasionUI({ force: true });
  }

  defeatActiveInvasion(preserveLetter = true) {
    const letterKey = preserveLetter ? this.currentLetterKey : null;
    galaxyManager.removeOperationsForFaction(PROMETHEAN_INVASION_FACTION_ID);
    galaxyManager.transferFactionControlToUhf(PROMETHEAN_INVASION_FACTION_ID);
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    faction.setFleetPower(0);
    faction.fleetCapacity = 0;
    this.currentLetterKey = letterKey;
    if (!preserveLetter) {
      this.currentLetterKey = null;
    }
    this.externalFailurePending = false;
    this.invasionTimerMs = 0;
    updateGalaxyUI({ force: true });
  }

  handlePrometheanOperationResult(operation) {
    if (!operation || operation.factionId !== PROMETHEAN_INVASION_FACTION_ID) {
      return;
    }
    if (operation.externalInvasion === true && operation.result !== 'success') {
      this.externalFailurePending = true;
    }
  }

  launchExternalRimOperation() {
    const rimSectors = galaxyManager.getSectors().filter((sector) => this.isRimSector(sector));
    if (!rimSectors.length) {
      return null;
    }
    const sector = rimSectors[Math.floor(Math.random() * rimSectors.length)];
    return this.launchOperationOnSector(sector, true);
  }

  launchNextOperation() {
    const sector = this.pickLeastResistanceTarget();
    if (!sector) {
      return null;
    }
    return this.launchOperationOnSector(sector, false);
  }

  launchAvailableOperations() {
    let launched = null;
    let guard = 0;
    while (guard < GALACTIC_INVASION_LETTERS.length) {
      guard += 1;
      const operation = this.launchNextOperation();
      if (!operation) {
        return launched;
      }
      launched = operation;
    }
    return launched;
  }

  launchOperationOnSector(sector, externalInvasion) {
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    const fleetPower = Number(faction.fleetPower);
    if (!sector || !Number.isFinite(fleetPower) || fleetPower <= 0) {
      return null;
    }
    const targetFactionId = galaxyManager.getOperationTargetFaction(sector, PROMETHEAN_INVASION_FACTION_ID);
    const assignedPower = externalInvasion === true
      ? fleetPower
      : this.getOperationPowerForTarget(sector, targetFactionId, fleetPower);
    if (!(assignedPower > 0)) {
      return null;
    }
    return galaxyManager.startOperation({
      sectorKey: sector.key,
      factionId: PROMETHEAN_INVASION_FACTION_ID,
      assignedPower,
      durationMs: PROMETHEAN_INVASION_OPERATION_MS,
      targetFactionId,
      externalInvasion: externalInvasion === true
    });
  }

  getOperationPowerForTarget(sector, targetFactionId, availableFleetPower) {
    const summary = galaxyManager.getSectorDefenseSummary(sector, PROMETHEAN_INVASION_FACTION_ID, targetFactionId);
    const resistance = Number(summary.totalPower) || 0;
    const targetPower = resistance > 0 ? resistance * 5 : 1;
    return Math.min(availableFleetPower, targetPower);
  }

  pickLeastResistanceTarget() {
    const contestedCandidates = [];
    const neighborCandidates = [];
    const addCandidate = (collection, sector) => {
      if (!sector || collection.includes(sector)) {
        return;
      }
      if (galaxyManager.getOperationForSector(sector.key, PROMETHEAN_INVASION_FACTION_ID)?.status === 'running') {
        return;
      }
      const totalControl = sector.getTotalControlValue?.() || 0;
      const ownControl = sector.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID) || 0;
      if (!(totalControl > 0) || totalControl - ownControl <= FULL_CONTROL_EPSILON) {
        return;
      }
      collection.push(sector);
    };
    galaxyManager.getSectors().forEach((sector) => {
      const ownControl = sector.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID) || 0;
      if (!(ownControl > FULL_CONTROL_EPSILON)) {
        return;
      }
      addCandidate(contestedCandidates, sector);
      if (!this.isSectorFullyControlledByInvasion(sector)) {
        return;
      }
      HEX_NEIGHBOR_DIRECTIONS.forEach((direction) => {
        addCandidate(neighborCandidates, galaxyManager.getSector(sector.q + direction.q, sector.r + direction.r));
      });
    });
    const candidates = contestedCandidates.length ? contestedCandidates : neighborCandidates;
    if (!candidates.length) {
      return null;
    }
    let bestResistance = Infinity;
    const best = [];
    candidates.forEach((sector) => {
      const targetFactionId = galaxyManager.getOperationTargetFaction(sector, PROMETHEAN_INVASION_FACTION_ID);
      const summary = galaxyManager.getSectorDefenseSummary(sector, PROMETHEAN_INVASION_FACTION_ID, targetFactionId);
      const resistance = Number(summary.totalPower) || 0;
      if (resistance < bestResistance) {
        bestResistance = resistance;
        best.length = 0;
        best.push(sector);
      } else if (resistance === bestResistance) {
        best.push(sector);
      }
    });
    return best[Math.floor(Math.random() * best.length)] || null;
  }

  isSectorFullyControlledByInvasion(sector) {
    const totalControl = sector?.getTotalControlValue?.() || 0;
    if (!(totalControl > 0)) {
      return false;
    }
    const ownControl = sector.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID) || 0;
    return Math.abs(totalControl - ownControl) <= FULL_CONTROL_EPSILON;
  }

  getRunningOperation() {
    const operations = galaxyManager.operationManager?.operations;
    if (!operations) {
      return null;
    }
    for (const operation of operations.values()) {
      if (operation?.factionId === PROMETHEAN_INVASION_FACTION_ID && operation.status === 'running') {
        return operation;
      }
    }
    return null;
  }

  isActiveInvasionDefeated() {
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    if ((Number(faction.fleetPower) || 0) > FULL_CONTROL_EPSILON) {
      return false;
    }
    if (this.getRunningOperation()) {
      return false;
    }
    return true;
  }

  isRimSector(sector) {
    const s = -sector.q - sector.r;
    return Math.max(Math.abs(sector.q), Math.abs(sector.r), Math.abs(s)) === galaxyManager.radius;
  }

  getLetter(letterKey) {
    return GALACTIC_INVASION_LETTERS.find((entry) => entry.key === letterKey) || null;
  }

  hasGalaxyConquest() {
    if (galaxyManager.hasEverControlledWholeGalaxyFlag === true) {
      return true;
    }
    return galaxyManager.hasEverControlledWholeGalaxy();
  }

  getRewardEntries(letterKey) {
    return GALACTIC_INVASION_REWARDS[letterKey] || [];
  }

  getCompletedRewardSummary() {
    const summary = new Map();
    this.completedLetters.forEach((letterKey) => {
      this.getRewardEntries(letterKey).forEach((reward) => {
        const key = `${reward.target}|${reward.type}|${reward.labelKey}`;
        const existing = summary.get(key);
        if (existing) {
          existing.value += reward.value;
        } else {
          summary.set(key, { ...reward });
        }
      });
    });
    return Array.from(summary.values());
  }

  refreshRewardEffects() {
    const summary = this.getCompletedRewardSummary();
    const signature = JSON.stringify(summary.map((entry) => [entry.target, entry.type, entry.value]));
    if (signature === this.rewardSignature) {
      return;
    }
    this.rewardSignature = signature;
    this.rewardTargets.forEach((targetId) => {
      addOrRemoveEffect({
        target: 'project',
        targetId,
        sourceId: 'galacticInvasion'
      }, 'removeEffect');
    });
    this.rewardTargets.clear();
    summary.forEach((entry) => {
      const effect = {
        target: 'project',
        targetId: entry.target,
        sourceId: 'galacticInvasion',
        effectId: `galacticInvasion-${entry.target}-${entry.type}`,
        type: entry.type,
        value: entry.value
      };
      addOrRemoveEffect(effect, 'addAndReplace');
      this.rewardTargets.add(entry.target);
    });
  }

  saveState() {
    return {
      enabled: this.enabled,
      currentLetterKey: this.currentLetterKey,
      completedLetters: Array.from(this.completedLetters),
      cooldownRemainingMs: this.cooldownRemainingMs,
      invasionTimerMs: this.invasionTimerMs,
      externalFailurePending: this.externalFailurePending
    };
  }

  loadState(state = {}) {
    this.enabled = state.enabled === true;
    this.currentLetterKey = state.currentLetterKey || null;
    this.completedLetters = new Set(Array.isArray(state.completedLetters) ? state.completedLetters : []);
    this.cooldownRemainingMs = Math.max(0, Number(state.cooldownRemainingMs) || 0);
    this.invasionTimerMs = Math.max(0, Number(state.invasionTimerMs) || 0);
    this.externalFailurePending = state.externalFailurePending === true;
    this.refreshRewardEffects();
    this.refreshUIVisibility();
  }

  reapplyEffects() {
    this.refreshRewardEffects();
    this.refreshUIVisibility();
  }
}
