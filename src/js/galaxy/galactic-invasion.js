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
    this.initialFleetPower = 0;
    this.deepStrikeUsed = false;
    this.monolithCooldownMs = 0;
    this.monolithSectorKey = null;
    this.occupationBastions = {};
    this.beachheadSectorKey = null;
    this.beachheadDefensePower = 0;
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
    if (this.monolithCooldownMs > 0) {
      this.monolithCooldownMs = Math.max(0, this.monolithCooldownMs - deltaMs);
    }
    this.pruneInvasionDefenses();
    this.regenerateActiveInvasionFleet(deltaMs);
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
    this.initialFleetPower = letter.fleetPower;
    this.deepStrikeUsed = false;
    this.monolithCooldownMs = 0;
    this.monolithSectorKey = null;
    this.occupationBastions = {};
    this.beachheadSectorKey = null;
    this.beachheadDefensePower = 0;
    this.invasionTimerMs = 0;
    this.launchInitialOperations();
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
    const invadedSectorKeys = this.getInvadedSectorKeys();
    galaxyManager.removeOperationsForFaction(PROMETHEAN_INVASION_FACTION_ID);
    this.removeUhfOperationsForSectors(invadedSectorKeys);
    galaxyManager.transferFactionControlToUhf(PROMETHEAN_INVASION_FACTION_ID);
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    faction.setFleetPower(0);
    faction.fleetCapacity = 0;
    this.currentLetterKey = letterKey;
    if (!preserveLetter) {
      this.currentLetterKey = null;
    }
    this.externalFailurePending = false;
    this.initialFleetPower = preserveLetter ? this.initialFleetPower : 0;
    this.deepStrikeUsed = false;
    this.monolithCooldownMs = 0;
    this.monolithSectorKey = null;
    this.occupationBastions = {};
    this.beachheadSectorKey = null;
    this.beachheadDefensePower = 0;
    this.invasionTimerMs = 0;
    updateGalaxyUI({ force: true });
  }

  getInvadedSectorKeys() {
    const keys = [];
    galaxyManager.getSectors().forEach((sector) => {
      const invadedControl = Number(sector.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID)) || 0;
      if (invadedControl > 0) {
        keys.push(sector.key);
      }
    });
    return keys;
  }

  removeUhfOperationsForSectors(sectorKeys) {
    if (!Array.isArray(sectorKeys) || !sectorKeys.length) {
      return;
    }
    const operations = galaxyManager.operationManager?.operations;
    if (!operations) {
      return;
    }
    const keysToRemove = [];
    operations.forEach((operation, key) => {
      if (operation?.factionId !== UHF_FACTION_ID) {
        return;
      }
      if (sectorKeys.includes(operation.sectorKey)) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach((key) => operations.delete(key));
  }

  handlePrometheanOperationResult(operation) {
    if (!operation) {
      return;
    }
    if (operation.factionId === PROMETHEAN_INVASION_FACTION_ID && operation.externalInvasion === true && operation.result !== 'success') {
      this.externalFailurePending = true;
    }
    if (operation.factionId === PROMETHEAN_INVASION_FACTION_ID) {
      this.handleInvasionAttackResult(operation);
      return;
    }
    if (operation.factionId === UHF_FACTION_ID && operation.targetFactionId === PROMETHEAN_INVASION_FACTION_ID) {
      this.applyBeachheadAttrition(operation);
      this.pruneInvasionDefenses();
    }
  }

  handleInvasionAttackResult(operation) {
    if (this.hasActiveTrait('assimilationSwarm')) {
      const absorbedPower = operation.defenderLosses.reduce((sum, entry) => {
        const loss = Number(entry.loss);
        return loss > 0 ? sum + loss : sum;
      }, 0);
      if (absorbedPower > 0) {
        const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
        faction.fleetCapacity += absorbedPower;
        faction.setFleetPower(faction.fleetPower + absorbedPower);
      }
    }
    if (this.hasActiveTrait('monolithArmada')) {
      this.monolithCooldownMs = PROMETHEAN_INVASION_MONOLITH_COOLDOWN_MS;
    }
    if (operation.result !== 'success') {
      return;
    }
    const sector = galaxyManager.sectors.get(operation.sectorKey);
    if (!this.isSectorFullyControlledByInvasion(sector)) {
      return;
    }
    if (this.hasActiveTrait('monolithArmada')) {
      this.monolithSectorKey = sector.key;
    }
    if (this.hasActiveTrait('occupationBastions')) {
      this.occupationBastions[sector.key] = this.initialFleetPower / 10;
    }
    if (this.hasActiveTrait('fortifiedBeachhead') && !this.beachheadSectorKey && this.isRimSector(sector)) {
      this.beachheadSectorKey = sector.key;
      this.beachheadDefensePower = this.initialFleetPower / 2;
    }
  }

  launchInitialOperations() {
    if (this.hasActiveTrait('quadrantIncursion') && this.hasActiveTrait('monolithArmada')) {
      const operation = this.launchMonolithQuadrantIncursion();
      if (operation) {
        return;
      }
    }
    if (this.hasActiveTrait('quadrantIncursion')) {
      this.launchQuadrantIncursion();
      return;
    }
    if (this.hasActiveTrait('deepStrike')) {
      const operation = this.launchDeepStrikeOperation();
      if (operation) {
        return;
      }
    }
    this.launchExternalRimOperation();
  }

  launchMonolithQuadrantIncursion() {
    const candidates = [];
    if (this.hasActiveTrait('deepStrike')) {
      const deepSector = this.pickDeepStrikeTarget();
      if (deepSector) {
        candidates.push(deepSector);
        this.deepStrikeUsed = true;
      }
    }
    const rimSectors = galaxyManager.getSectors()
      .filter((sector) => this.isRimSector(sector) && !candidates.includes(sector));
    while (candidates.length < 4 && rimSectors.length) {
      const index = Math.floor(Math.random() * rimSectors.length);
      candidates.push(rimSectors[index]);
      rimSectors.splice(index, 1);
    }
    const target = this.pickLeastResistanceSector(candidates);
    return this.launchOperationOnSector(target, true, true);
  }

  launchQuadrantIncursion() {
    const selectedSectors = [];
    if (this.hasActiveTrait('deepStrike')) {
      const deepSector = this.pickDeepStrikeTarget();
      if (deepSector) {
        selectedSectors.push(deepSector);
        this.deepStrikeUsed = true;
      }
    }
    const rimSectors = galaxyManager.getSectors()
      .filter((sector) => this.isRimSector(sector) && !selectedSectors.includes(sector));
    while (selectedSectors.length < 4 && rimSectors.length) {
      const index = Math.floor(Math.random() * rimSectors.length);
      selectedSectors.push(rimSectors[index]);
      rimSectors.splice(index, 1);
    }
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    const assignedPower = this.initialFleetPower / 4;
    selectedSectors.forEach((sector) => {
      const targetFactionId = galaxyManager.getOperationTargetFaction(sector, PROMETHEAN_INVASION_FACTION_ID);
      const operation = galaxyManager.startOperation({
        sectorKey: sector.key,
        factionId: PROMETHEAN_INVASION_FACTION_ID,
        assignedPower: Math.min(assignedPower, faction.fleetPower),
        durationMs: PROMETHEAN_INVASION_OPERATION_MS,
        targetFactionId,
        externalInvasion: true
      });
      galaxyManager.operationManager.completeOperationNow(operation);
    });
  }

  pickLeastResistanceSector(sectors) {
    if (!sectors.length) {
      return null;
    }
    let bestResistance = Infinity;
    const best = [];
    sectors.forEach((sector) => {
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

  launchDeepStrikeOperation() {
    const sector = this.pickDeepStrikeTarget();
    if (!sector) {
      return null;
    }
    this.deepStrikeUsed = true;
    return this.launchOperationOnSector(sector, true, true);
  }

  pickDeepStrikeTarget() {
    const candidates = galaxyManager.getSectors().filter((sector) => {
      const uhfControl = Number(sector.getControlValue?.(UHF_FACTION_ID)) || 0;
      if (!(uhfControl > FULL_CONTROL_EPSILON)) {
        return false;
      }
      return !galaxyManager.getOperationForSector(sector.key, PROMETHEAN_INVASION_FACTION_ID);
    });
    if (!candidates.length) {
      return null;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  launchExternalRimOperation() {
    const rimSectors = galaxyManager.getSectors().filter((sector) => this.isRimSector(sector));
    if (!rimSectors.length) {
      return null;
    }
    const sector = rimSectors[Math.floor(Math.random() * rimSectors.length)];
    return this.launchOperationOnSector(sector, true, true);
  }

  launchNextOperation() {
    const sector = this.pickLeastResistanceTarget();
    if (!sector) {
      return null;
    }
    return this.launchOperationOnSector(sector, false);
  }

  launchAvailableOperations() {
    if (this.hasActiveTrait('monolithArmada')) {
      if (this.getRunningOperation() || this.monolithCooldownMs > 0) {
        return null;
      }
      return this.launchNextOperation();
    }
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

  launchOperationOnSector(sector, externalInvasion, completeInstantly) {
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    const fleetPower = Number(faction.fleetPower);
    if (!sector || !Number.isFinite(fleetPower) || fleetPower <= 0) {
      return null;
    }
    const targetFactionId = galaxyManager.getOperationTargetFaction(sector, PROMETHEAN_INVASION_FACTION_ID);
    const assignedPower = externalInvasion === true
      ? fleetPower
      : this.hasActiveTrait('monolithArmada')
        ? fleetPower
        : this.getOperationPowerForTarget(sector, targetFactionId, fleetPower);
    if (!(assignedPower > 0)) {
      return null;
    }
    let successChance = null;
    if (externalInvasion !== true) {
      successChance = galaxyManager.getOperationSuccessChance({
        sectorKey: sector.key,
        factionId: PROMETHEAN_INVASION_FACTION_ID,
        assignedPower,
        targetFactionId
      });
      if (successChance < 1) {
        return null;
      }
    }
    const operation = galaxyManager.startOperation({
      sectorKey: sector.key,
      factionId: PROMETHEAN_INVASION_FACTION_ID,
      assignedPower,
      durationMs: this.hasActiveTrait('monolithArmada') ? PROMETHEAN_INVASION_MONOLITH_OPERATION_MS : PROMETHEAN_INVASION_OPERATION_MS,
      targetFactionId,
      externalInvasion: externalInvasion === true,
      successChance: successChance === null ? undefined : successChance
    });
    if (completeInstantly === true) {
      galaxyManager.operationManager.completeOperationNow(operation);
    }
    return operation;
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
    if (this.getRunningOperation()) {
      return false;
    }
    let hasControlledSector = false;
    galaxyManager.getSectors().forEach((sector) => {
      const control = Number(sector.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID)) || 0;
      if (control > FULL_CONTROL_EPSILON) {
        hasControlledSector = true;
      }
    });
    if (!hasControlledSector) {
      return true;
    }
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    if ((Number(faction.fleetPower) || 0) > FULL_CONTROL_EPSILON) {
      return false;
    }
    if (this.hasActiveTrait('fortifiedBeachhead') && this.beachheadSectorKey) {
      const sector = galaxyManager.sectors.get(this.beachheadSectorKey);
      const control = Number(sector?.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID)) || 0;
      if (control > FULL_CONTROL_EPSILON) {
        return false;
      }
    }
    return true;
  }

  regenerateActiveInvasionFleet(deltaMs) {
    if (!this.hasActiveTrait('selfReconstitutingFleet')) {
      return;
    }
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    const reserved = galaxyManager.getReservedOperationPower(PROMETHEAN_INVASION_FACTION_ID);
    const currentFleet = Number(faction.fleetPower) || 0;
    const activePower = currentFleet + reserved;
    const cap = this.initialFleetPower;
    if (!(cap > 0) || activePower >= cap) {
      return;
    }
    const restored = cap * (deltaMs / PROMETHEAN_INVASION_RECONSTITUTION_MS);
    const allowance = Math.max(0, cap - reserved);
    faction.fleetCapacity = Math.max(faction.fleetCapacity, cap);
    faction.setFleetPower(Math.min(allowance, currentFleet + restored));
  }

  getInvasionOperationControlFraction(operation) {
    if (!operation || operation.factionId !== PROMETHEAN_INVASION_FACTION_ID) {
      return 0.1;
    }
    if (this.hasActiveTrait('monolithArmada')) {
      return 1;
    }
    if (this.hasActiveTrait('fortifiedBeachhead') && operation.externalInvasion === true && !this.beachheadSectorKey) {
      return 1;
    }
    if (this.hasActiveTrait('overrunProtocol')) {
      return 0.5;
    }
    return 0.1;
  }

  shouldSuppressDefenderLosses(operation, defensePower, offensePower) {
    if (!this.hasActiveTrait('shieldedCore')) {
      return false;
    }
    if (operation.factionId !== UHF_FACTION_ID || operation.targetFactionId !== PROMETHEAN_INVASION_FACTION_ID) {
      return false;
    }
    return offensePower < defensePower * 5;
  }

  getOperationDurationOverrideMs({ attackerId, targetFactionId }) {
    if (!this.hasActiveTrait('commandBypass')) {
      return 0;
    }
    if (attackerId !== UHF_FACTION_ID || targetFactionId !== PROMETHEAN_INVASION_FACTION_ID) {
      return 0;
    }
    return PROMETHEAN_INVASION_OPERATION_MS;
  }

  adjustDefenseSummary(sector, originFactionId, targetFactionId, contributions) {
    if (originFactionId === PROMETHEAN_INVASION_FACTION_ID && (targetFactionId === UHF_FACTION_ID || !targetFactionId)) {
      let foundUhfContribution = false;
      contributions.forEach((entry) => {
        if (entry.factionId !== UHF_FACTION_ID || !this.hasActiveTrait('commandBypass')) {
          return;
        }
        foundUhfContribution = true;
        entry.basePower = this.getCommandBypassUhfSectorDefense(sector, entry.basePower);
        entry.fleetPower = 0;
        entry.totalPower = entry.basePower;
      });
      if (!foundUhfContribution && this.hasActiveTrait('commandBypass')) {
        const basePower = this.getCommandBypassUhfSectorDefense(sector, 0);
        if (basePower > 0) {
          contributions.push({
            factionId: UHF_FACTION_ID,
            basePower,
            fleetPower: 0,
            totalPower: basePower
          });
        }
      }
    }
    if (targetFactionId === PROMETHEAN_INVASION_FACTION_ID || !targetFactionId) {
      const bonus = this.getSectorDefenseBonus(sector.key);
      const monolithHeldFleet = this.getMonolithHeldFleetPower(sector.key);
      let foundInvasionContribution = false;
      contributions.forEach((entry) => {
        if (entry.factionId !== PROMETHEAN_INVASION_FACTION_ID) {
          return;
        }
        foundInvasionContribution = true;
        if (this.monolithSectorKey && this.monolithCooldownMs > 0) {
          entry.fleetPower = sector.key === this.monolithSectorKey ? monolithHeldFleet : 0;
          entry.totalPower = entry.basePower + entry.fleetPower;
        }
        if (bonus > 0) {
          entry.basePower += bonus;
          entry.totalPower += bonus;
        }
      });
      const control = Number(sector.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID)) || 0;
      if (!foundInvasionContribution && monolithHeldFleet > 0 && control > FULL_CONTROL_EPSILON) {
        foundInvasionContribution = true;
        contributions.push({
          factionId: PROMETHEAN_INVASION_FACTION_ID,
          basePower: 0,
          fleetPower: monolithHeldFleet,
          totalPower: monolithHeldFleet
        });
      }
      if (!foundInvasionContribution && bonus > 0 && control > FULL_CONTROL_EPSILON) {
        contributions.push({
          factionId: PROMETHEAN_INVASION_FACTION_ID,
          basePower: bonus,
          fleetPower: 0,
          totalPower: bonus
        });
      }
    }
    return contributions;
  }

  getCommandBypassUhfSectorDefense(sector, currentBasePower) {
    const totalControl = Number(sector?.getTotalControlValue?.()) || 0;
    const uhfControl = Number(sector?.getControlValue?.(UHF_FACTION_ID)) || 0;
    if (!(totalControl > 0) || !(uhfControl > 0)) {
      return 0;
    }
    const sectorValue = Number(sector.getValue?.()) || 0;
    const controlShare = Math.max(0, Math.min(1, uhfControl / totalControl));
    const sectorDefense = sectorValue > 0 && controlShare > 0 ? sectorValue * controlShare : 0;
    const existingBase = Number(currentBasePower) || 0;
    return Math.max(0, sectorDefense, existingBase);
  }

  getMonolithHeldFleetPower(sectorKey) {
    if (!this.hasActiveTrait('monolithArmada') || this.monolithCooldownMs <= 0 || sectorKey !== this.monolithSectorKey) {
      return 0;
    }
    const faction = galaxyManager.getFaction(PROMETHEAN_INVASION_FACTION_ID);
    const fleetPower = Number(faction.fleetPower) || 0;
    return fleetPower > 0 ? fleetPower : 0;
  }

  getSectorDefenseBonus(sectorKey) {
    let bonus = 0;
    const bastionPower = Number(this.occupationBastions[sectorKey]) || 0;
    if (bastionPower > 0) {
      bonus += bastionPower;
    }
    if (sectorKey === this.beachheadSectorKey && this.beachheadDefensePower > 0) {
      bonus += this.beachheadDefensePower;
    }
    return bonus;
  }

  applyBeachheadAttrition(operation) {
    if (!this.hasActiveTrait('fortifiedBeachhead')) {
      return;
    }
    if (!this.beachheadSectorKey || operation.sectorKey !== this.beachheadSectorKey) {
      return;
    }
    if (!(this.beachheadDefensePower > 0)) {
      return;
    }
    const defensePower = Number(operation.defensePower) || 0;
    const offensePower = Number(operation.offensePower) || 0;
    if (!(defensePower > 0) || !(offensePower > 0)) {
      return;
    }
    const baseLoss = (offensePower * offensePower) / (offensePower + defensePower);
    const modifier = operation.result === 'success' ? 1 : Math.min(1, offensePower / defensePower);
    const rawLoss = baseLoss * (modifier > 0 ? modifier : 0);
    if (!(rawLoss > 0)) {
      return;
    }
    const cappedLoss = Math.min(defensePower, rawLoss);
    const beachheadShare = Math.max(0, Math.min(1, this.beachheadDefensePower / defensePower));
    const beachheadLoss = Math.min(this.beachheadDefensePower, cappedLoss * beachheadShare);
    if (!(beachheadLoss > 0)) {
      return;
    }
    this.beachheadDefensePower = Math.max(0, this.beachheadDefensePower - beachheadLoss);
  }

  pruneInvasionDefenses() {
    Object.keys(this.occupationBastions).forEach((sectorKey) => {
      const sector = galaxyManager.sectors.get(sectorKey);
      const control = Number(sector?.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID)) || 0;
      if (control <= FULL_CONTROL_EPSILON) {
        delete this.occupationBastions[sectorKey];
      }
    });
    if (this.beachheadSectorKey) {
      const sector = galaxyManager.sectors.get(this.beachheadSectorKey);
      const control = Number(sector?.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID)) || 0;
      if (control <= FULL_CONTROL_EPSILON) {
        this.beachheadSectorKey = null;
        this.beachheadDefensePower = 0;
      }
    }
    if (this.monolithSectorKey) {
      const sector = galaxyManager.sectors.get(this.monolithSectorKey);
      const control = Number(sector?.getControlValue?.(PROMETHEAN_INVASION_FACTION_ID)) || 0;
      if (control <= FULL_CONTROL_EPSILON) {
        this.monolithSectorKey = null;
      }
    }
  }

  isRimSector(sector) {
    const s = -sector.q - sector.r;
    return Math.max(Math.abs(sector.q), Math.abs(sector.r), Math.abs(s)) === galaxyManager.radius;
  }

  getLetter(letterKey) {
    return GALACTIC_INVASION_LETTERS.find((entry) => entry.key === letterKey) || null;
  }

  getActiveLetter() {
    return this.getLetter(this.currentLetterKey);
  }

  hasActiveTrait(traitKey) {
    const letter = this.getActiveLetter();
    return Array.isArray(letter?.traits) && letter.traits.includes(traitKey);
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
        const targetType = reward.targetType || 'project';
        const valueFormat = reward.valueFormat || 'percent';
        const key = `${targetType}|${reward.target}|${reward.type}|${reward.labelKey}|${valueFormat}`;
        const existing = summary.get(key);
        if (existing) {
          existing.value += reward.value;
        } else {
          summary.set(key, { ...reward, targetType, valueFormat });
        }
      });
    });
    return Array.from(summary.values());
  }

  refreshRewardEffects(force = false) {
    const summary = this.getCompletedRewardSummary();
    const signature = JSON.stringify(summary.map((entry) => [entry.targetType || 'project', entry.target, entry.type, entry.value]));
    if (!force && signature === this.rewardSignature) {
      return;
    }
    this.rewardSignature = signature;
    this.rewardTargets.forEach((targetKey) => {
      const separatorIndex = targetKey.indexOf(':');
      const targetType = separatorIndex > 0 ? targetKey.slice(0, separatorIndex) : 'project';
      const targetId = separatorIndex > 0 ? targetKey.slice(separatorIndex + 1) : targetKey;
      addOrRemoveEffect({
        target: targetType,
        targetId,
        sourceId: 'galacticInvasion'
      }, 'removeEffect');
    });
    this.rewardTargets.clear();
    summary.forEach((entry) => {
      const targetType = entry.targetType || 'project';
      const effect = {
        target: targetType,
        targetId: entry.target,
        sourceId: 'galacticInvasion',
        effectId: `galacticInvasion-${targetType}-${entry.target}-${entry.type}`,
        type: entry.type,
        value: entry.value
      };
      addOrRemoveEffect(effect, 'addAndReplace');
      this.rewardTargets.add(`${targetType}:${entry.target}`);
    });
  }

  saveState() {
    return {
      enabled: this.enabled,
      currentLetterKey: this.currentLetterKey,
      completedLetters: Array.from(this.completedLetters),
      cooldownRemainingMs: this.cooldownRemainingMs,
      invasionTimerMs: this.invasionTimerMs,
      externalFailurePending: this.externalFailurePending,
      initialFleetPower: this.initialFleetPower,
      deepStrikeUsed: this.deepStrikeUsed,
      monolithCooldownMs: this.monolithCooldownMs,
      monolithSectorKey: this.monolithSectorKey,
      occupationBastions: this.occupationBastions,
      beachheadSectorKey: this.beachheadSectorKey,
      beachheadDefensePower: this.beachheadDefensePower
    };
  }

  loadState(state = {}) {
    this.enabled = state.enabled === true;
    this.currentLetterKey = state.currentLetterKey || null;
    this.completedLetters = new Set(Array.isArray(state.completedLetters) ? state.completedLetters : []);
    this.cooldownRemainingMs = Math.max(0, Number(state.cooldownRemainingMs) || 0);
    this.invasionTimerMs = Math.max(0, Number(state.invasionTimerMs) || 0);
    this.externalFailurePending = state.externalFailurePending === true;
    this.initialFleetPower = Math.max(0, Number(state.initialFleetPower) || 0);
    this.deepStrikeUsed = state.deepStrikeUsed === true;
    this.monolithCooldownMs = Math.max(0, Number(state.monolithCooldownMs) || 0);
    this.monolithSectorKey = state.monolithSectorKey || null;
    this.occupationBastions = state.occupationBastions || {};
    this.beachheadSectorKey = state.beachheadSectorKey || null;
    this.beachheadDefensePower = Math.max(0, Number(state.beachheadDefensePower) || 0);
    this.refreshRewardEffects();
    this.refreshUIVisibility();
  }

  reapplyEffects() {
    this.refreshRewardEffects(true);
    this.refreshUIVisibility();
  }
}
