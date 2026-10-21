class DagonFaction extends GalaxyFactionAI {
  updateFleetCapacity(manager) {
    this.fleetCapacity = manager.galacticInvasionManager?.dagon.active
      ? manager.getFaction(UHF_FACTION_ID).fleetCapacity * 2 : 0;
  }
}

class DagonInvasion {
  constructor() {
    this.enabled = false;
    this.started = false;
    this.completed = false;
    this.prometheusRepaired = false;
    this.protection = {};
    this.scene = -1;
  }

  get active() { return this.started && !this.completed; }

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
    const sectors = galaxyManager.getSectors();
    const occupied = sectors.filter(sector => ['R4-05', 'R3-13'].includes(sector.getDisplayName()));
    const candidates = sectors.filter(sector => !['Core', 'R5-07', 'R4-05', 'R3-13'].includes(sector.getDisplayName()));
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    occupied.push(...candidates.splice(0, Math.round(sectors.length / 4) - occupied.length));
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
    resources.colony.advancedResearch.value = 0;
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
    for (const key of Object.keys(this.protection)) {
      this.protection[key] = Math.max(0, this.protection[key] - deltaMs);
      if (!this.protection[key]) delete this.protection[key];
    }
  }

  repairPrometheus() {
    if (!this.active || this.prometheusRepaired || !storyManager.completedEventIds.has('chapterA.1')) return false;
    const storage = projectManager.projects.spaceStorage;
    if (storage.getStoredResourceValue('electronics') < 1e21 || storage.getStoredResourceValue('superalloys') < 1e21) return false;
    storage.removeStoredResource('electronics', 1e21);
    storage.removeStoredResource('superalloys', 1e21);
    this.prometheusRepaired = true;
    return true;
  }

  getResearchCost() {
    return Math.max(0, resources.colony.advancedResearch.productionRate) * 900;
  }

  useSectorAbility(sectorKey, conquer = false) {
    const sector = galaxyManager.sectors.get(sectorKey);
    const cost = this.getResearchCost();
    const research = resources.colony.advancedResearch;
    if (!this.active || !sector || !(cost > 0) || research.value < cost) return false;
    if (conquer ? !this.prometheusRepaired || sector.getControlValue('uhf') >= 1 - FULL_CONTROL_EPSILON
      : this.protection[sectorKey] > 0 || sector.getControlValue('uhf') <= 0) return false;
    research.decrease(cost);
    for (const operation of Array.from(galaxyManager.operationManager.operations.values())) {
      if (operation.sectorKey === sectorKey && (conquer || operation.factionId !== UHF_FACTION_ID)) {
        galaxyManager.cancelOperation(operation);
      }
    }
    if (conquer) galaxyManager.replaceSectorControl(sectorKey, { uhf: 1 });
    else this.protection[sectorKey] = 2 * 60 * 60 * 1000;
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
      const faction = galaxyManager.getFaction('dagon');
      faction.setFleetPower(0);
      faction.updateFleetCapacity(galaxyManager);
      galaxyManager.markUIDirty({ force: true });
    }
    return true;
  }

  saveState() {
    return { enabled: this.enabled, started: this.started, completed: this.completed,
      prometheusRepaired: this.prometheusRepaired, protection: { ...this.protection }, scene: this.scene };
  }

  loadState(state = {}) {
    this.enabled = state.enabled === true;
    this.started = state.started === true;
    this.completed = state.completed === true;
    this.prometheusRepaired = state.prometheusRepaired === true;
    this.protection = { ...state.protection };
    this.scene = Math.max(-1, Math.min(DAGON_SCENES.length - 1, Math.floor(state.scene ?? -1)));
  }
}
