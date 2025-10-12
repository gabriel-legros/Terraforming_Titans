class DysonReceiver extends Building {
  build(buildCount = 1, activate = true) {
    const project = projectManager?.projects?.dysonSwarmReceiver;
    if (!project) {
      return super.build(buildCount, activate);
    }

    const perBuilding = this.production?.colony?.energy || 0;
    const totalEnergy = (project.collectors || 0) * (project.energyPerCollector || 0);

    if (perBuilding <= 0) {
      return super.build(buildCount, activate);
    }

    const cap = Math.max(Math.floor(totalEnergy / perBuilding), 0);
    const remaining = cap - this.count;

    if (remaining <= 0) {
      return false;
    }

    const allowed = Math.min(buildCount, remaining);
    return super.build(allowed, activate);
  }

  _ensureTooltip(cache) {
    if (!cache || typeof document === 'undefined') return null;

    let { countEl } = cache;
    if (!countEl || !countEl.isConnected) {
      const { row } = cache;
      if (!row) return null;
      countEl =
        row.querySelector(`#${this.name}-count-active`) ||
        row.querySelector(`#${this.name}-count`);
      if (!countEl) return null;
      cache.countEl = countEl;
    }

    let tooltip = cache.countTooltip;
    if (!tooltip) {
      tooltip = document.createElement('span');
      tooltip.classList.add('info-tooltip-icon');
      tooltip.innerHTML = '&#9432;';
      cache.countTooltip = tooltip;
    }

    if (!tooltip.isConnected) {
      countEl.parentElement.insertBefore(tooltip, countEl.nextSibling);
    }

    return tooltip;
  }

  _updateTooltip(cache) {
    const tooltip = this._ensureTooltip(cache);
    if (!tooltip) return;

    const project = projectManager?.projects?.dysonSwarmReceiver;
    if (!project || !project.isCompleted) {
      tooltip.title = 'Complete the Dyson Swarm Receiver project to unlock receivers.';
      return;
    }

    const collectors = project.collectors || 0;
    const perBuilding = this.production?.colony?.energy || 0;
    const energyPerCollector = project.energyPerCollector || 0;
    const totalEnergy = collectors * energyPerCollector;
    const cap = perBuilding > 0 ? Math.floor(totalEnergy / perBuilding) : 0;

    if (collectors <= 0 || cap <= 0) {
      tooltip.title = 'Build Dyson Swarm collectors to increase receiver capacity.';
      return;
    }

    const formattedCollectors = collectors.toLocaleString('en-US');
    const formattedCap = cap.toLocaleString('en-US');
    tooltip.title = `Dyson receivers constructions are capped by swarm collectors, and you cannot build more than this cap. ${formattedCollectors} collectors allow ${formattedCap} receivers.`;
  }

  initUI(_, cache) {
    this._updateTooltip(cache);
  }

  updateUI(cache) {
    this._updateTooltip(cache);
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const { targetProductivity } = this.computeBaseProductivity(resources, deltaTime);
    if (this.active === 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }
    const project = projectManager?.projects?.dysonSwarmReceiver;
    const perBuilding = this.production?.colony?.energy || 0;
    if (!project || !project.isCompleted || project.collectors <= 0 || perBuilding <= 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }
    const totalEnergy = project.collectors * project.energyPerCollector;
    const maxProductivity = totalEnergy / (perBuilding * this.active);
    this.productivity = Math.min(targetProductivity, maxProductivity);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DysonReceiver, dysonReceiver: DysonReceiver };
} else {
  globalThis.DysonReceiver = DysonReceiver;
  globalThis.dysonReceiver = DysonReceiver;
}
