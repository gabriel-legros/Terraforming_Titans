class DysonReceiver extends Building {
  getCollectorTotals() {
    const swarm = projectManager?.projects?.dysonSwarmReceiver;
    const sphere = projectManager?.projects?.dysonSphere;
    const swarmCollectors = swarm?.collectors || 0;
    const sphereCollectors = sphere?.isCompleted ? (sphere.collectors || 0) : 0;
    const swarmEnergy = swarmCollectors * (swarm?.energyPerCollector || 0);
    const sphereEnergy = sphereCollectors * (sphere?.energyPerCollector || 0);
    return {
      swarmCollectors,
      sphereCollectors,
      totalCollectors: swarmCollectors + sphereCollectors,
      totalEnergy: swarmEnergy + sphereEnergy,
    };
  }

  getAutoBuildMaxCount(reservePercent = 0, additionalReserves = null) {
    const base = super.getAutoBuildMaxCount(reservePercent, additionalReserves);
    const perBuilding = this.production?.colony?.energy || 0;

    if (perBuilding <= 0) {
      return 0;
    }

    const { totalEnergy } = this.getCollectorTotals();

    if (totalEnergy <= 0) {
      return 0;
    }

    const cap = Math.floor(totalEnergy / perBuilding);
    if (cap <= 0) {
      return 0;
    }

    const remaining = Math.max(cap - this.count, 0);
    return Math.min(base, remaining);
  }

  build(buildCount = 1, activate = true) {
    const perBuilding = this.production?.colony?.energy || 0;
    const { totalEnergy } = this.getCollectorTotals();

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

    const perBuilding = this.production?.colony?.energy || 0;
    const totals = this.getCollectorTotals();
    const totalEnergy = totals.totalEnergy;
    const cap = perBuilding > 0 ? Math.floor(totalEnergy / perBuilding) : 0;

    if (totals.totalCollectors <= 0 || cap <= 0) {
      tooltip.title = 'Build Dyson Swarm or Dyson Sphere collectors to increase receiver capacity.';
      return;
    }

    const formattedCollectors = formatNumber(totals.totalCollectors, false, 2);
    const formattedCap = formatNumber(cap, false, 2);
    const parts = [];
    if (totals.swarmCollectors > 0) {
      parts.push(`${formatNumber(totals.swarmCollectors, false, 2)} swarm`);
    }
    if (totals.sphereCollectors > 0) {
      parts.push(`${formatNumber(totals.sphereCollectors, false, 2)} sphere`);
    }
    const breakdown = parts.length ? ` (${parts.join(' + ')})` : '';
    const title = `Dyson receivers constructions are capped by swarm and sphere collectors, and you cannot build more than this cap. ${formattedCollectors}${breakdown} collectors allow ${formattedCap} receivers.`;
    if (tooltip.title !== title) {
      tooltip.title = title;
    }
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
    const perBuilding = this.production?.colony?.energy || 0;
    const totals = this.getCollectorTotals();
    if (totals.totalEnergy <= 0 || perBuilding <= 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }
    const maxProductivity = totals.totalEnergy / (perBuilding * this.active);
    this.productivity = Math.min(targetProductivity, maxProductivity);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DysonReceiver, dysonReceiver: DysonReceiver };
} else {
  if (typeof window !== 'undefined') {
    window.DysonReceiver = DysonReceiver;
    window.dysonReceiver = DysonReceiver;
  } else if (typeof global !== 'undefined') {
    global.DysonReceiver = DysonReceiver;
    global.dysonReceiver = DysonReceiver;
  }
}
