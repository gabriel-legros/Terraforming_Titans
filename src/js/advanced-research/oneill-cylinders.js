const ONEILL_GROWTH_SECONDS = 100 * 3600;
const ONEILL_CAPACITY_PER_SECTOR = 1000;
const ONEILL_FLAG = 'oneillCylinders';
const HYPERLANE_FLAG = 'hyperlane';

let oneillUhfId = 'uhf';
try {
  const factionModule = require('../galaxy/faction');
  if (factionModule && factionModule.UHF_FACTION_ID) {
    oneillUhfId = factionModule.UHF_FACTION_ID;
  }
} catch (error) {
  try {
    if (typeof UHF_FACTION_ID === 'string' && UHF_FACTION_ID) {
      oneillUhfId = UHF_FACTION_ID;
    }
  } catch (innerError) {
    // Ignore missing globals outside the browser.
  }
}

const oneillStatsCache = { card: null, value: null, rate: null, tooltip: null, tooltipContent: null };

function setOneillStatsElements(elements = {}) {
  if (elements.card) {
    oneillStatsCache.card = elements.card;
  }
  if (elements.value) {
    oneillStatsCache.value = elements.value;
  }
  if (elements.rate) {
    oneillStatsCache.rate = elements.rate;
  }
  if (elements.tooltip) {
    oneillStatsCache.tooltip = elements.tooltip;
  }
  if (elements.tooltipContent) {
    oneillStatsCache.tooltipContent = elements.tooltipContent;
  }
  if (typeof spaceManager !== 'undefined' && spaceManager) {
    updateOneillCylinderStatsUI({
      space: spaceManager,
      galaxy: typeof galaxyManager !== 'undefined' ? galaxyManager : null
    });
  } else if (oneillStatsCache.card) {
    oneillStatsCache.card.classList.add('hidden');
  }
  return oneillStatsCache;
}

function getUhfControlledSectorCount(galaxy) {
  if (!galaxy || typeof galaxy.getFaction !== 'function') {
    return 0;
  }
  const faction = galaxy.getFaction(oneillUhfId);
  if (!faction || typeof faction.getControlledSectorKeys !== 'function') {
    return 0;
  }
  const keys = faction.getControlledSectorKeys(galaxy);
  return Array.isArray(keys) ? keys.length : 0;
}

function getUhfControlledSectors(galaxy) {
  if (!galaxy || typeof galaxy.getUhfControlledSectors !== 'function') {
    return [];
  }
  const sectors = galaxy.getUhfControlledSectors();
  return Array.isArray(sectors) ? sectors : [];
}

function getWarpGateCapacityMultiplier(sector) {
  let multiplier = 1;
  try {
    multiplier = warpGateNetworkManager?.getWarpGateMultiplier?.(sector);
  } catch (error) {
    multiplier = 1;
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return 1;
  }
  return multiplier;
}

function getLocalizedOneillText(path, vars, fallback) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    if (!vars) {
      return fallback;
    }
    let text = fallback;
    Object.keys(vars).forEach((key) => {
      text = text.replaceAll(`{${key}}`, String(vars[key]));
    });
    return text;
  }
}

function getOneillCylinderCapacity(galaxy, space) {
  const sectors = getUhfControlledSectors(galaxy);
  if (!sectors.length) {
    return ONEILL_CAPACITY_PER_SECTOR;
  }
  if (!space?.isBooleanFlagSet?.(HYPERLANE_FLAG)) {
    return sectors.length * ONEILL_CAPACITY_PER_SECTOR;
  }
  let total = 0;
  sectors.forEach((sector) => {
    total += ONEILL_CAPACITY_PER_SECTOR * getWarpGateCapacityMultiplier(sector);
  });
  return total > 0 ? total : ONEILL_CAPACITY_PER_SECTOR;
}

function formatCylinderCount(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0.00';
  }
  return formatGroupedNumber(value, 2, 2);
}

function formatCapacity(value) {
  return formatGroupedNumber(Math.round(value), 0, 0);
}

function getOneillGrowthContext(space, galaxy) {
  const current = space?.getOneillCylinderCount?.() ?? 0;
  const unlocked = !!space?.isBooleanFlagSet?.(ONEILL_FLAG);
  if (!unlocked) {
    return { current, capacity: 0, perSecond: 0, perHour: 0 };
  }
  const capacity = getOneillCylinderCapacity(galaxy, space);
  if (!(capacity > 0)) {
    return { current, capacity: 0, perSecond: 0, perHour: 0 };
  }
  const effectiveWorlds = space?.getTerraformedPlanetCount?.() ?? 0;
  if (!(effectiveWorlds > 0)) {
    return { current, capacity, perSecond: 0, perHour: 0 };
  }
  const baseRate = effectiveWorlds / ONEILL_GROWTH_SECONDS;
  const remainingFraction = 1 - (current / capacity);
  const growthFraction = remainingFraction > 0 ? remainingFraction : 0;
  const perSecond = baseRate * growthFraction;
  return { current, capacity, perSecond, perHour: perSecond * 3600 };
}

function getOneillGrowthDelta(deltaTime, { space, galaxy } = {}) {
  const context = getOneillGrowthContext(space, galaxy);
  const { current, capacity, perSecond } = context;
  if (!(capacity > 0)) {
    return {
      current,
      capacity,
      perSecond: 0,
      perHour: 0,
      gain: 0,
      next: 0
    };
  }
  if (!(perSecond > 0)) {
    return {
      current,
      capacity,
      perSecond,
      perHour: context.perHour,
      gain: 0,
      next: current
    };
  }
  const deltaSeconds = deltaTime / 1000;
  const gain = perSecond * deltaSeconds;
  const next = current + gain;
  return {
    current,
    capacity,
    perSecond,
    perHour: context.perHour,
    gain,
    next: next > capacity ? capacity : next
  };
}

function formatCylinderRate(perSecond) {
  const numeric = Number.isFinite(perSecond) && perSecond > 0 ? perSecond : 0;
  if (numeric >= 1) {
    return `+${numeric.toFixed(2)}/s`;
  }
  const perHour = numeric * 3600;
  const rounded = perHour >= 1 ? perHour.toFixed(2) : perHour.toFixed(3);
  return `+${rounded}/hr`;
}

function setOneillTooltipText(text) {
  if (oneillStatsCache.tooltipContent) {
    oneillStatsCache.tooltipContent.textContent = text;
    return;
  }
  if (oneillStatsCache.tooltip) {
    oneillStatsCache.tooltip.title = text;
  }
}

function getOneillTooltipText(space, capacity) {
  const capacityText = formatCapacity(capacity);
  if (space?.isBooleanFlagSet?.(HYPERLANE_FLAG)) {
    return getLocalizedOneillText(
      'ui.space.oneillTooltipHyperlane',
      { capacity: capacityText },
      "Worlds produce O'Neill cylinders at a rate of 1 per effective world every 100 hours, easing as they near their {capacity} capacity. Hyperlane makes each fully controlled sector contribute O'Neill cylinder capacity by the same Warp Gate Network multiplier used for resource import caps, with a minimum base capacity of 1000 when no sectors are controlled.\nO'Neill cylinders are too small, too decentralized and too vulnerable to properly organize into the UHF military hence they do not count towards fleet capacity; all their efforts are spent on defending themselves instead."
    );
  }
  return getLocalizedOneillText(
    'ui.space.oneillTooltipBase',
    { capacity: capacityText },
    "Worlds produce O'Neill cylinders at a rate of 1 per effective world every 100 hours, easing as they near their {capacity} capacity (1000 per fully controlled sector, minimum 1 sector).\nO'Neill cylinders are too small, too decentralized and too vulnerable to properly organize into the UHF military hence they do not count towards fleet capacity; all their efforts are spent on defending themselves instead."
  );
}

function updateOneillCylinders(deltaTime, { effects, space, galaxy } = {}) {
  const { current, capacity, perSecond, next } = getOneillGrowthDelta(deltaTime, { space, galaxy });
  if (!(capacity > 0)) {
    space?.setOneillCylinderCount?.(0, 0);
    return 0;
  }
  if (!(perSecond > 0)) {
    space?.setOneillCylinderCount?.(current);
    return space?.getOneillCylinderCount?.() ?? 0;
  }
  space?.setOneillCylinderCount?.(next, capacity);
  return space?.getOneillCylinderCount?.() ?? 0;
}

function updateOneillCylinderStatsUI({ effects, space, galaxy } = {}) {
  const unlocked = !!(space && typeof space.isBooleanFlagSet === 'function' && space.isBooleanFlagSet(ONEILL_FLAG));
  const { card, value, rate } = oneillStatsCache;
  if (card) {
    card.classList.toggle('hidden', !unlocked);
  }
  if (!unlocked) {
    if (value) {
      value.textContent = formatCylinderCount(0);
    }
    if (rate) {
      rate.textContent = '+0.00/hr';
    }
    setOneillTooltipText(getLocalizedOneillText(
      'ui.space.oneillTooltipLocked',
      null,
      "Complete the O'Neill Cylinders advanced research to seed orbital habitats."
    ));
    return;
  }
  const context = getOneillGrowthContext(space, galaxy);
  const count = context.current;
  const capacity = context.capacity;
  const perSecondRate = context.perSecond;
  if (value) {
    value.textContent = formatCylinderCount(count);
  }
  if (rate) {
    rate.textContent = formatCylinderRate(perSecondRate);
  }
  setOneillTooltipText(getOneillTooltipText(space, capacity));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    updateOneillCylinders,
    updateOneillCylinderStatsUI,
    setOneillStatsElements,
    getOneillCylinderCapacity,
    getOneillGrowthContext,
    getOneillGrowthDelta,
    getUhfControlledSectorCount
  };
}

if (typeof window !== 'undefined') {
  window.updateOneillCylinders = updateOneillCylinders;
  window.updateOneillCylinderStatsUI = updateOneillCylinderStatsUI;
  window.setOneillStatsElements = setOneillStatsElements;
  window.getOneillCylinderCapacity = getOneillCylinderCapacity;
  window.getOneillGrowthContext = getOneillGrowthContext;
  window.getOneillGrowthDelta = getOneillGrowthDelta;
  window.getUhfControlledSectorCount = getUhfControlledSectorCount;
}
