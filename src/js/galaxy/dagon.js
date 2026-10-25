class DagonFaction extends GalaxyFactionAI {
  constructor(options = {}) {
    super(options);
    this.autoOperationIntervalMs = terraformingParameters.gameplay.dagon.attackIntervalMs;
  }

  launchAutoOperation(manager) {
    const parameters = terraformingParameters.gameplay.dagon;
    if (!manager.galacticInvasionManager.dagon.active || !(this.fleetPower > this.fleetCapacity * parameters.attackReadinessFraction)) return false;
    let ongoingAttacks = 0;
    for (const operation of manager.operationManager.operations.values()) {
      if (operation.factionId !== this.id || operation.status !== 'running') continue;
      ongoingAttacks += 1;
      if (ongoingAttacks >= parameters.maxOngoingAttacks) return false;
    }
    const invasion = manager.galacticInvasionManager.dagon;
    const origin = manager.sectors.get(invasion.centralSectorKey);
    const availablePower = this.getOperationalFleetPower(manager);
    const candidates = [...new Set([...this.getContestedSectorKeys(manager), ...this.getNeighborEnemySectorKeys(manager)])]
      .map(key => manager.sectors.get(key))
      .sort((a, b) => GalaxySector.computeRing(a.q - origin.q, a.r - origin.r)
        - GalaxySector.computeRing(b.q - origin.q, b.r - origin.r));
    for (const sector of candidates) {
      if (invasion.protection[sector.key] > 0 || invasion.blocksOffensiveOperation(sector.key)
        || manager.getOperationForSector(sector.key, this.id)?.status === 'running') continue;
      for (const target of sector.getControlBreakdown()) {
        if (target.factionId === this.id || !(target.value > FULL_CONTROL_EPSILON)) continue;
        const defense = manager.getSectorDefensePower(sector.key, this.id, target.factionId);
        const power = Math.max(defense * parameters.attackDefenseMultiplier, this.fleetCapacity * parameters.minimumAttackFraction);
        if (!(power > 0) || power > availablePower) continue;
        const operation = manager.startOperation({
          sectorKey: sector.key, factionId: this.id, assignedPower: power, targetFactionId: target.factionId
        });
        if (operation) return true;
      }
    }
    return false;
  }

  updateFleetCapacity(manager) {
    this.fleetCapacity = manager.galacticInvasionManager?.dagon.active
      ? manager.getFaction(UHF_FACTION_ID).fleetCapacity * 3 : 0;
  }
}

class DagonInvasion {
  constructor() {
    this.enabled = true;
    this.started = false;
    this.completed = false;
    this.prometheusRepaired = false;
    this.protection = {};
    this.logistics = {};
    this.hopePower = terraformingParameters.gameplay.dagon.startingPower;
    this.prometheusPower = terraformingParameters.gameplay.dagon.prometheusStartingPower;
    this.pulseCooldownMs = terraformingParameters.gameplay.dagon.initialPulseCooldownMs;
    this.laserCooldownMs = terraformingParameters.gameplay.dagon.enemyAbilityCooldownMs;
    this.pulseRemainingMs = 0;
    this.laserChargeRemainingMs = 0;
    this.laserRemainingMs = 0;
    this.laserTargetKey = null;
    this.severedTentacles = [];
    // Cube-rounded hex routes are shared by occupation, targeting, and map geometry.
    const coordinates = generateSectorCoordinates(GALAXY_RADIUS);
    const origin = coordinates.find(hex => GalaxySector.formatDisplayName(hex.q, hex.r) === 'R3-13');
    this.centralSectorKey = GalaxySector.createKey(origin.q, origin.r);
    this.tentacles = ['R5-14', 'R5-28', 'R6-25', 'R6-28', 'R1-05'].map(id => {
      const target = coordinates.find(hex => GalaxySector.formatDisplayName(hex.q, hex.r) === id);
      const distance = GalaxySector.computeRing(target.q - origin.q, target.r - origin.r);
      const keys = [];
      for (let step = 0; step <= distance; step += 1) {
        const q = origin.q + (target.q - origin.q) * step / distance;
        const r = origin.r + (target.r - origin.r) * step / distance;
        const s = -q - r;
        let rq = Math.round(q), rr = Math.round(r);
        const rs = Math.round(s);
        if (Math.abs(rq - q) > Math.abs(rr - r) && Math.abs(rq - q) > Math.abs(rs - s)) rq = -rr - rs;
        else if (Math.abs(rr - r) > Math.abs(rs - s)) rr = -rq - rs;
        keys.push(GalaxySector.createKey(rq, rr));
      }
      return { id, keys };
    });
    this.scene = -1;
  }

  get active() { return this.started && !this.completed; }
  get tentaclesSevered() { return this.tentacles.every(tentacle => this.severedTentacles.includes(tentacle.id)); }

  getRequirements() {
    const storage = projectManager.projects.spaceStorage;
    const sector = spaceManager.getCurrentWorldStatus()?.sector;
    return {
      story: gameCompleted === true,
      galaxy: galaxyManager.hasEverControlledWholeGalaxy(),
      world: spaceManager.currentArtificialKey !== null && (sector === 'Core' || sector === 'R5-07'),
      materials: storage.getStoredResourceValue('electronics') >= 1e21
        && storage.getStoredResourceValue('superalloys') >= 1e21,
      training: !galaxyInvasionManager.currentLetterKey
    };
  }

  start() {
    if (!this.enabled || this.started || !Object.values(this.getRequirements()).every(Boolean)) return false;
    if (!saveGameToSlot('pretravel').success) return false;
    const sectors = galaxyManager.getSectors();
    const tentacleKeys = new Set(this.tentacles.flatMap(tentacle => tentacle.keys));
    const occupied = sectors.filter(sector => sector.getDisplayName() === 'R4-05' || tentacleKeys.has(sector.key));
    const candidates = sectors.filter(sector => !['Core', 'R5-07', 'R4-05'].includes(sector.getDisplayName()) && !tentacleKeys.has(sector.key));
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    occupied.push(...candidates.splice(0, Math.max(0, Math.round(sectors.length / 4) - occupied.length)));
    const partial = new Set(candidates.slice(0, Math.round(sectors.length / 2)));
    const full = new Set(occupied);
    this.started = true;
    // Retain conquest history before replacing control and cancel stale fronts.
    for (const operation of Array.from(galaxyManager.operationManager.operations.values())) {
      galaxyManager.cancelOperation(operation);
    }
    for (const sector of sectors) {
      const share = full.has(sector) ? 1 : partial.has(sector) ? 0.5 : 0;
      galaxyManager.replaceSectorControl(sector.key, { uhf: 1 - share, dagon: share });
    }
    const faction = galaxyManager.getFaction('dagon');
    galaxyManager.getFaction(UHF_FACTION_ID).updateFleetCapacity(galaxyManager);
    faction.updateFleetCapacity(galaxyManager);
    faction.setFleetPower(faction.fleetCapacity);
    galaxyInvasionManager.markUIDirty({ force: true });
    storyManager.setStoryBranch('dagon');
    storyManager.activateEvent(storyManager.findEventById('chapterA.0'));
    return true;
  }

  update(deltaMs) {
    if (!this.active) return;
    const parameters = terraformingParameters.gameplay.dagon;
    // Resolve events chronologically, including protection expiry during large simulation steps.
    while (deltaMs > 0) {
      const step = Math.min(deltaMs, this.pulseCooldownMs, this.laserCooldownMs,
        this.pulseRemainingMs || Infinity, this.laserChargeRemainingMs || Infinity, this.laserRemainingMs || Infinity);
      this.hopePower = Math.min(parameters.powerCapacity, this.hopePower + step / 1000 * parameters.powerPerSecond);
      if (this.prometheusRepaired) this.prometheusPower = Math.min(parameters.powerCapacity, this.prometheusPower + step / 1000 * parameters.powerPerSecond);
      for (const timers of [this.protection, this.logistics]) {
        for (const key of Object.keys(timers)) {
          timers[key] = Math.max(0, timers[key] - step);
          if (!timers[key]) delete timers[key];
        }
      }
      const resolvingPulse = this.pulseRemainingMs > 0 && this.pulseRemainingMs === step;
      const resolvingLaser = this.laserChargeRemainingMs > 0 && this.laserChargeRemainingMs === step;
      this.pulseRemainingMs = Math.max(0, this.pulseRemainingMs - step);
      this.laserChargeRemainingMs = Math.max(0, this.laserChargeRemainingMs - step);
      this.laserRemainingMs = Math.max(0, this.laserRemainingMs - step);
      this.pulseCooldownMs -= step;
      this.laserCooldownMs -= step;
      deltaMs -= step;
      if (resolvingPulse) {
        for (const key of this.getPulseSectorKeys()) {
          this.corruptSector(galaxyManager.sectors.get(key), parameters.pulseControlGain);
        }
        galaxyManager.markUIDirty({ force: true });
      }
      if (resolvingLaser) {
        // Keep the locked target: protecting it during the warning blocks this cast.
        if (!(this.protection[this.laserTargetKey] > 0)) {
          this.corruptSector(galaxyManager.sectors.get(this.laserTargetKey), 1);
          this.laserRemainingMs = parameters.laserDurationMs;
        }
        galaxyManager.markUIDirty({ force: true });
      }
      if (!this.pulseCooldownMs) {
        this.pulseCooldownMs = parameters.enemyAbilityCooldownMs;
        if (!this.tentaclesSevered) this.pulseRemainingMs = parameters.pulseDurationMs;
        galaxyManager.markUIDirty({ force: true });
      }
      if (!this.laserCooldownMs) {
        this.laserCooldownMs = parameters.enemyAbilityCooldownMs;
        const candidates = galaxyManager.getSectors().filter(sector =>
          sector.getControlValue(UHF_FACTION_ID) >= 1 - FULL_CONTROL_EPSILON
          && !(this.protection[sector.key] > 0)
          && !['Core', 'R5-07', 'R4-05'].includes(sector.getDisplayName()));
        if (candidates.length) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          this.laserTargetKey = target.key;
          this.laserChargeRemainingMs = parameters.laserChargeDurationMs;
          galaxyManager.markUIDirty({ force: true });
        }
      }
      if (!this.laserChargeRemainingMs && !this.laserRemainingMs) this.laserTargetKey = null;
    }
  }

  getPulseSectorKeys() {
    const keys = new Set();
    if (!this.active) return keys;
    for (const tentacle of this.tentacles) {
      if (this.severedTentacles.includes(tentacle.id)) continue;
      for (const key of tentacle.keys) {
        const origin = galaxyManager.sectors.get(key);
        for (const direction of HEX_NEIGHBOR_DIRECTIONS) {
          const neighbor = galaxyManager.getSector(origin.q + direction.q, origin.r + direction.r);
          if (neighbor) keys.add(neighbor.key);
        }
      }
    }
    return keys;
  }

  corruptSector(sector, amount) {
    if (!this.active || this.protection[sector.key] > 0) return;
    const defenders = Object.entries(sector.control).filter(([id]) => id !== 'dagon');
    const total = defenders.reduce((sum, [, value]) => sum + value, 0);
    if (!(total > 0)) return;
    const gain = amount >= total - FULL_CONTROL_EPSILON ? total : amount;
    const control = { dagon: sector.getControlValue('dagon') + gain };
    for (const [id, value] of defenders) control[id] = value * (1 - gain / total);
    galaxyManager.replaceSectorControl(sector.key, control);
    if (gain === total) {
      // Dagon no longer needs an offensive operation against a sector it now owns.
      const operation = galaxyManager.getOperationForSector(sector.key, 'dagon');
      if (operation) galaxyManager.cancelOperation(operation);
    }
  }

  repairPrometheus() {
    if (!this.active || this.prometheusRepaired || !storyManager.completedEventIds.has('chapterA.1')) return false;
    const storage = projectManager.projects.spaceStorage;
    storage.removeStoredResource('electronics', 1e21);
    storage.removeStoredResource('superalloys', 1e21);
    this.prometheusRepaired = true;
    return true;
  }

  blocksOffensiveOperation(sectorKey) {
    return this.active && this.tentacles.some(tentacle => !this.severedTentacles.includes(tentacle.id) && tentacle.keys.includes(sectorKey));
  }

  canUseSectorAbility(sectorKey, ability) {
    const sector = galaxyManager.sectors.get(sectorKey);
    if (!this.active || !sector) return false;
    const prometheus = ability === 'conquer' || ability === 'cut';
    if (prometheus && !this.prometheusRepaired) return false;
    const parameters = terraformingParameters.gameplay.dagon;
    const cost = ability === 'conquer' ? parameters.instantCaptureCost : prometheus ? parameters.prometheusAbilityCost
      : ability === 'protect' ? parameters.protectionCost : parameters.abilityCost;
    if (this[prometheus ? 'prometheusPower' : 'hopePower'] < cost) return false;
    switch (ability) {
      case 'protect': return !(this.protection[sectorKey] > 0) && sector.getControlValue('uhf') > 0;
      case 'logistics': return !(this.logistics[sectorKey] > 0) && !this.blocksOffensiveOperation(sectorKey)
        && sector.getControlValue('uhf') < 1 - FULL_CONTROL_EPSILON;
      case 'conquer': return sectorKey !== this.centralSectorKey && !this.blocksOffensiveOperation(sectorKey)
        && sector.getControlValue('uhf') < 1 - FULL_CONTROL_EPSILON;
      case 'cut':
        if (!this.tentacles.some(arm => arm.keys[1] === sectorKey && !this.severedTentacles.includes(arm.id))) return false;
        return HEX_NEIGHBOR_DIRECTIONS.some(direction => {
          const neighbor = galaxyManager.getSector(sector.q + direction.q, sector.r + direction.r);
          return neighbor && neighbor.getControlValue(UHF_FACTION_ID) >= 1 - FULL_CONTROL_EPSILON;
        });
      default: return false;
    }
  }

  useSectorAbility(sectorKey, ability = 'protect') {
    if (!this.canUseSectorAbility(sectorKey, ability)) return false;
    const parameters = terraformingParameters.gameplay.dagon;
    const prometheus = ability === 'conquer' || ability === 'cut';
    const cost = ability === 'conquer' ? parameters.instantCaptureCost : prometheus ? parameters.prometheusAbilityCost
      : ability === 'protect' ? parameters.protectionCost : parameters.abilityCost;
    this[prometheus ? 'prometheusPower' : 'hopePower'] -= cost;
    if (ability === 'cut') {
      const tentacle = this.tentacles.find(arm => !this.severedTentacles.includes(arm.id) && arm.keys[1] === sectorKey);
      this.severedTentacles.push(tentacle.id);
    } else if (ability === 'logistics') {
      this.logistics[sectorKey] = parameters.abilityDurationMs;
      for (const operation of galaxyManager.operationManager.operations.values()) {
        if (operation.sectorKey !== sectorKey || operation.factionId !== UHF_FACTION_ID || operation.status !== 'running') continue;
        if (operation.durationMs > parameters.acceleratedOperationMs) {
          operation.elapsedMs *= parameters.acceleratedOperationMs / operation.durationMs;
          operation.durationMs = parameters.acceleratedOperationMs;
        }
      }
    } else {
      for (const operation of Array.from(galaxyManager.operationManager.operations.values())) {
        if (operation.sectorKey === sectorKey && (ability === 'conquer' || operation.factionId !== UHF_FACTION_ID)) {
          galaxyManager.cancelOperation(operation);
        }
      }
      if (ability === 'conquer') galaxyManager.replaceSectorControl(sectorKey, { uhf: 1 });
      else this.protection[sectorKey] = parameters.protectionDurationMs;
    }
    galaxyManager.markUIDirty({ force: true });
    return true;
  }

  advanceScene() {
    if (!this.active || !storyManager.completedEventIds.has('chapterA.4') || journalTyping) return false;
    if (this.scene < DAGON_SCENES.length - 1) {
      this.scene += 1;
      const source = { type: 'dagon', id: DAGON_SCENES[this.scene] };
      addJournalEntry(getJournalTextFromSource(source), null, source);
    } else {
      const invaded = new Set(galaxyManager.getSectors().filter(sector => sector.getControlValue('dagon') > 0).map(sector => sector.key));
      for (const operation of Array.from(galaxyManager.operationManager.operations.values())) {
        if (operation.factionId === 'dagon' || invaded.has(operation.sectorKey)) galaxyManager.cancelOperation(operation);
      }
      galaxyManager.transferFactionControlToUhf('dagon');
      this.completed = true;
      this.protection = {};
      this.logistics = {};
      this.pulseRemainingMs = 0;
      this.laserChargeRemainingMs = 0;
      this.laserRemainingMs = 0;
      this.laserTargetKey = null;
      const faction = galaxyManager.getFaction('dagon');
      faction.setFleetPower(0);
      faction.updateFleetCapacity(galaxyManager);
      galaxyManager.markUIDirty({ force: true });
    }
    return true;
  }

  saveState() {
    return { enabled: this.enabled, started: this.started, completed: this.completed,
      prometheusRepaired: this.prometheusRepaired, protection: { ...this.protection }, logistics: { ...this.logistics },
      hopePower: this.hopePower, prometheusPower: this.prometheusPower, severedTentacles: [...this.severedTentacles],
      pulseCooldownMs: this.pulseCooldownMs, laserCooldownMs: this.laserCooldownMs,
      pulseRemainingMs: this.pulseRemainingMs, laserRemainingMs: this.laserRemainingMs, laserTargetKey: this.laserTargetKey,
      laserChargeRemainingMs: this.laserChargeRemainingMs,
      tentacleIds: this.tentacles.map(tentacle => tentacle.id), scene: this.scene };
  }

  loadState(state = {}) {
    this.enabled = true;
    this.started = state.started === true;
    this.completed = state.completed === true;
    this.prometheusRepaired = state.prometheusRepaired === true;
    this.protection = { ...state.protection };
    this.logistics = { ...state.logistics };
    const parameters = terraformingParameters.gameplay.dagon;
    this.hopePower = Math.max(0, Math.min(parameters.powerCapacity, state.hopePower ?? parameters.startingPower));
    this.pulseCooldownMs = Math.max(0, Math.min(parameters.enemyAbilityCooldownMs, state.pulseCooldownMs ?? parameters.initialPulseCooldownMs));
    this.laserCooldownMs = Math.max(0, Math.min(parameters.enemyAbilityCooldownMs, state.laserCooldownMs ?? parameters.enemyAbilityCooldownMs));
    this.pulseRemainingMs = Math.max(0, Math.min(parameters.pulseDurationMs, state.pulseRemainingMs ?? 0));
    this.laserChargeRemainingMs = Math.max(0, Math.min(parameters.laserChargeDurationMs, state.laserChargeRemainingMs ?? 0));
    this.laserRemainingMs = Math.max(0, Math.min(parameters.laserDurationMs, state.laserRemainingMs ?? 0));
    this.laserTargetKey = state.laserTargetKey ?? null;
    this.prometheusPower = this.prometheusRepaired
      ? Math.max(0, Math.min(parameters.powerCapacity, state.prometheusPower ?? parameters.prometheusStartingPower))
      : parameters.prometheusStartingPower;
    this.severedTentacles = [...(state.severedTentacles || [])];
    this.scene = Math.max(-1, Math.min(DAGON_SCENES.length - 1, Math.floor(state.scene ?? -1)));
    // Saves predating route tracking either had the original four arms or none.
    const knownTentacles = state.tentacleIds ?? (state.severedTentacles ? ['R5-14', 'R5-28', 'R6-25', 'R6-28'] : []);
    const addedTentacles = this.tentacles.filter(tentacle => !knownTentacles.includes(tentacle.id));
    if (this.active && addedTentacles.length) {
      if (this.scene >= 0 || galaxyManager.sectors.get(this.centralSectorKey).getControlValue('uhf') >= 1 - FULL_CONTROL_EPSILON) {
        this.severedTentacles = [...new Set([...this.severedTentacles, ...addedTentacles.map(tentacle => tentacle.id)])];
      } else {
        for (const key of new Set(addedTentacles.flatMap(tentacle => tentacle.keys))) {
          galaxyManager.replaceSectorControl(key, { dagon: 1 });
          delete this.protection[key];
        }
        for (const operation of Array.from(galaxyManager.operationManager.operations.values())) {
          if (this.blocksOffensiveOperation(operation.sectorKey)) galaxyManager.cancelOperation(operation);
        }
      }
    }
  }
}
