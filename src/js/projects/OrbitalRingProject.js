var cachedLandReconciler;

function getLandReconciler() {
  if (typeof cachedLandReconciler === 'function') {
    return cachedLandReconciler;
  }
  const scope = typeof globalThis !== 'undefined'
    ? globalThis
    : (typeof global !== 'undefined' ? global : undefined);
  if (scope && typeof scope.reconcileLandResourceValue === 'function') {
    cachedLandReconciler = scope.reconcileLandResourceValue;
    return cachedLandReconciler;
  }
  if (typeof module !== 'undefined' && module.exports) {
    try {
      const resourceModule = require('../resource.js');
      if (resourceModule && typeof resourceModule.reconcileLandResourceValue === 'function') {
        cachedLandReconciler = resourceModule.reconcileLandResourceValue;
        return cachedLandReconciler;
      }
    } catch (error) {
      cachedLandReconciler = null;
    }
  }
  return cachedLandReconciler;
}

class OrbitalRingProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.ringCount = 0;
    this.currentWorldHasRing = false;
  }

  renderUI(container) {
    if (typeof renderOrbitalRingUI === 'function') {
      renderOrbitalRingUI(this, container);
    }
  }

  updateUI() {
    if (typeof updateOrbitalRingUI === 'function') {
      updateOrbitalRingUI(this);
    }
  }

  canStart() {
    if (!super.canStart()) return false;
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getUnmodifiedTerraformedWorldCount !== 'function'
    ) {
      return true;
    }
    return this.ringCount < spaceManager.getUnmodifiedTerraformedWorldCount();
  }

  complete() {
    super.complete();
    this.ringCount += 1;
    const manager = typeof spaceManager !== 'undefined' ? spaceManager : null;
    const hadRingBefore = manager?.currentWorldHasOrbitalRing?.() || this.currentWorldHasRing;
    const canPreferCurrent = !hadRingBefore && manager?.isCurrentWorldTerraformed?.();

    if (manager?.assignOrbitalRings) {
      manager.assignOrbitalRings(this.ringCount, { preferCurrentWorld: !!canPreferCurrent });
    } else if (!hadRingBefore && manager?.isPlanetTerraformed && manager?.getCurrentPlanetKey) {
      if (manager.isPlanetTerraformed(manager.getCurrentPlanetKey())) {
        manager.setCurrentWorldHasOrbitalRing?.(true);
      }
    }

    const reportedRingState = manager?.currentWorldHasOrbitalRing?.();
    const hasRingAfter = typeof reportedRingState === 'boolean'
      ? reportedRingState
      : (hadRingBefore || !!canPreferCurrent);
    this.currentWorldHasRing = !!hasRingAfter;

    const reconcile = getLandReconciler();
    if (typeof reconcile === 'function') {
      reconcile();
    }

  }

  saveState() {
    return { ...super.saveState(), ringCount: this.ringCount, currentWorldHasRing: this.currentWorldHasRing };
  }

  loadState(state) {
    super.loadState(state);
    this.ringCount = state.ringCount || 0;
    this.currentWorldHasRing = state.currentWorldHasRing || false;
  }

  saveTravelState() {
    const state = { ringCount: this.ringCount };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.ringCount = state.ringCount || 0;
    this.currentWorldHasRing = false;
    if (state.isActive) {
      this.isActive = true;
      this.remainingTime = state.remainingTime || this.remainingTime;
      this.startingDuration = state.startingDuration || this.getEffectiveDuration();
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.OrbitalRingProject = OrbitalRingProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrbitalRingProject;
}
