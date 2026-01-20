const ONEILL_GROWTH_SECONDS = 100 * 3600;
const ONEILL_CAPACITY_PER_SECTOR = 1000;
const ONEILL_FLAG = 'oneillCylinders';

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

const oneillStatsCache = { card: null, value: null, rate: null, tooltip: null };

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

function getOneillCylinderCapacity(galaxy) {
  const sectors = getUhfControlledSectorCount(galaxy);
  const effectiveSectors = sectors > 0 ? sectors : 1;
  return effectiveSectors * ONEILL_CAPACITY_PER_SECTOR;
}

function formatCylinderCount(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0.00';
  }
  return value.toFixed(2);
}

function formatCapacity(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0';
  }
  return Math.round(value).toLocaleString('en-US');
}

function getOneillGrowthContext(space, galaxy) {
  const current = space?.getOneillCylinderCount?.() ?? 0;
  const unlocked = !!space?.isBooleanFlagSet?.(ONEILL_FLAG);
  if (!unlocked) {
    return { current, capacity: 0, perSecond: 0, perHour: 0 };
  }
  const capacity = getOneillCylinderCapacity(galaxy);
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

function formatCylinderRate(value) {
  const numeric = Number.isFinite(value) && value > 0 ? value : 0;
  const rounded = numeric >= 1 ? numeric.toFixed(2) : numeric.toFixed(3);
  return `+${rounded}/hr`;
}

function updateOneillCylinders(deltaTime, { effects, space, galaxy } = {}) {
  const { current, capacity, perSecond } = getOneillGrowthContext(space, galaxy);
  if (!(capacity > 0)) {
    space?.setOneillCylinderCount?.(0, 0);
    return 0;
  }
  if (!(perSecond > 0)) {
    space?.setOneillCylinderCount?.(current, capacity);
    return space?.getOneillCylinderCount?.() ?? 0;
  }
  const deltaSeconds = deltaTime / 1000;
  const next = current + (perSecond * deltaSeconds);
  space?.setOneillCylinderCount?.(next, capacity);
  return space?.getOneillCylinderCount?.() ?? 0;
}

function updateOneillCylinderStatsUI({ effects, space, galaxy } = {}) {
  const unlocked = !!(space && typeof space.isBooleanFlagSet === 'function' && space.isBooleanFlagSet(ONEILL_FLAG));
  const { card, value, rate, tooltip } = oneillStatsCache;
  if (card) {
    card.classList.toggle('hidden', !unlocked);
  }
  if (!unlocked) {
    if (value) {
      value.textContent = '0.00';
    }
    if (rate) {
      rate.textContent = '+0.00/hr';
    }
    if (tooltip) {
      tooltip.title = "Complete the O'Neill Cylinders advanced research to seed orbital habitats.";
    }
    return;
  }
  const context = getOneillGrowthContext(space, galaxy);
  const count = context.current;
  const capacity = context.capacity;
  const hourlyRate = context.perHour;
  if (value) {
    value.textContent = formatCylinderCount(count);
  }
  if (rate) {
    rate.textContent = formatCylinderRate(hourlyRate);
  }
  if (tooltip) {
    const capacityText = formatCapacity(capacity);
    tooltip.title = `Worlds produce O'Neill cylinders at a rate of 1 per effective world every 100 hours, easing as they near their ${capacityText} capacity (1000 per fully controlled sector, minimum 1 sector).\nO'Neill cylinders are too small, too decentralized and too vulnerable to properly organize into the UHF military hence they do not count towards fleet capacity; all their efforts are spent on defending themselves instead.`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    updateOneillCylinders,
    updateOneillCylinderStatsUI,
    setOneillStatsElements,
    getOneillCylinderCapacity,
    getUhfControlledSectorCount
  };
}

if (typeof window !== 'undefined') {
  window.updateOneillCylinders = updateOneillCylinders;
  window.updateOneillCylinderStatsUI = updateOneillCylinderStatsUI;
  window.setOneillStatsElements = setOneillStatsElements;
  window.getOneillCylinderCapacity = getOneillCylinderCapacity;
  window.getUhfControlledSectorCount = getUhfControlledSectorCount;
}
