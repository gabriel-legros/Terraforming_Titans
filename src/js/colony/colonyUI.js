let showObsoleteBuildings = false;
const growthRateDisplayCache = { tooltips: {}, tooltipCache: {} };

function createGrowthRateDisplay(){
  const controlsContainer = document.getElementById('colony-controls-container');
  if(!controlsContainer || document.getElementById('growth-rate-container')) return;

  const card = document.createElement('div');
  card.classList.add('project-card');
  card.id = 'growth-rate-container';

  const header = document.createElement('div');
  header.classList.add('card-header');
  const title = document.createElement('span');
  title.classList.add('card-title');
  title.textContent = 'Growth Rate';
  header.appendChild(title);
  card.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('card-body');

  // Capacity multiplier line
  const capLine = document.createElement('div');
  capLine.classList.add('growth-rate-line');
  const capLabel = document.createElement('span');
  capLabel.textContent = 'Capacity:';
  const capValue = document.createElement('span');
  capValue.id = 'growth-capacity-value';
  capValue.textContent = '0%';
  capLine.appendChild(capLabel);
  capLine.appendChild(capValue);
  const capInfo = document.createElement('span');
  capInfo.classList.add('info-tooltip-icon');
  capInfo.innerHTML = '&#9432;';
  const capacityText = 'Capacity multiplier from the logistic growth equation. This is 1 - population / capacity, so growth slows as you approach your housing cap and stops entirely when population equals capacity.';
  growthRateDisplayCache.tooltips.capacity = attachDynamicInfoTooltip(capInfo, capacityText);
  capLine.appendChild(capInfo);
  body.appendChild(capLine);
  growthRateDisplayCache.capacityValue = capValue;

  // Base rate line
  const baseLine = document.createElement('div');
  baseLine.classList.add('growth-rate-line');
  const baseLabel = document.createElement('span');
  baseLabel.textContent = 'Base rate:';
  const baseValue = document.createElement('span');
  baseValue.id = 'growth-base-value';
  baseValue.textContent = '0%/s';
  baseLine.appendChild(baseLabel);
  baseLine.appendChild(baseValue);
  const baseInfo = document.createElement('span');
  baseInfo.classList.add('info-tooltip-icon');
  baseInfo.innerHTML = '&#9432;';
  const baseText = [
    'Base growth rate derived from happiness: max((happiness - 50%) / 300, 0).',
    '- Food and energy each grant up to +25 happiness when satisfied.',
    '- Comfort adds 20× its rating.',
    '- Electronics and androids each add up to +10 happiness when food and energy are met.',
    '- Milestones ready to claim or claimed add +0.5 happiness each.',
    '- Happiness below 50% pauses growth.'
  ].join('\n');
  growthRateDisplayCache.tooltips.base = attachDynamicInfoTooltip(baseInfo, baseText);
  baseLine.appendChild(baseInfo);
  body.appendChild(baseLine);
  growthRateDisplayCache.baseValue = baseValue;

  // Other multipliers line
  const otherLine = document.createElement('div');
  otherLine.classList.add('growth-rate-line');
  const otherLabel = document.createElement('span');
  otherLabel.textContent = 'Other multipliers:';
  const otherValue = document.createElement('span');
  otherValue.id = 'growth-other-value';
  otherValue.textContent = '1x';
  otherLine.appendChild(otherLabel);
  otherLine.appendChild(otherValue);
  const otherInfo = document.createElement('span');
  otherInfo.classList.add('info-tooltip-icon');
  otherInfo.innerHTML = '&#9432;';
  growthRateDisplayCache.tooltips.other = attachDynamicInfoTooltip(
    otherInfo,
    'Multipliers from colony sliders, and other effects.'
  );
  otherLine.appendChild(otherInfo);
  body.appendChild(otherLine);
  growthRateDisplayCache.otherValue = otherValue;

  const decayLine = document.createElement('div');
  decayLine.classList.add('growth-rate-line');
  const decayLabel = document.createElement('span');
  decayLabel.textContent = 'Decay:';
  const decayValue = document.createElement('span');
  decayValue.id = 'growth-decay-value';
  decayValue.textContent = '0%/s';
  decayLine.appendChild(decayLabel);
  decayLine.appendChild(decayValue);
  const decayInfo = document.createElement('span');
  decayInfo.classList.add('info-tooltip-icon');
  decayInfo.innerHTML = '&#9432;';
  growthRateDisplayCache.tooltips.decay = attachDynamicInfoTooltip(
    decayInfo,
    'Combined population loss from shortages and high gravity.'
  );
  decayLine.appendChild(decayInfo);
  body.appendChild(decayLine);
  growthRateDisplayCache.decayValue = decayValue;

  // Final growth line
  const growthLine = document.createElement('div');
  growthLine.classList.add('growth-rate-line');
  const growthLabel = document.createElement('span');
  growthLabel.textContent = 'Growth:';
  const growthValue = document.createElement('span');
  growthValue.id = 'growth-rate-value';
  growthValue.textContent = '0%/s';
  growthLine.appendChild(growthLabel);
  growthLine.appendChild(growthValue);
  const growthInfo = document.createElement('span');
  growthInfo.classList.add('info-tooltip-icon');
  growthInfo.innerHTML = '&#9432;';
  growthRateDisplayCache.tooltips.growth = attachDynamicInfoTooltip(
    growthInfo,
    'Final growth rate after applying logistic growth minus starvation, energy, and gravity decay.'
  );
  growthLine.appendChild(growthInfo);
  body.appendChild(growthLine);
  growthRateDisplayCache.growthValue = growthValue;

  card.appendChild(body);

  // Insert to the left of the sliders
  const firstChild = controlsContainer.firstChild;
  if(firstChild){
    controlsContainer.insertBefore(card, firstChild);
  } else {
    controlsContainer.appendChild(card);
  }
}

function getGrowthMultiplierBreakdown(){
  const effects = Array.isArray(populationModule?.activeEffects) ? populationModule.activeEffects : [];
  const lines = [];
  effects.forEach(effect => {
    if(effect.type === 'growthMultiplier'){
      const mult = effect.value;
      if(mult === 1) return;
      const sourceId = String(effect.sourceId || '');
      let name = effect.name || effect.sourceId || effect.effectId || 'Unknown';
      if (sourceId.startsWith('rwg-')) {
        const typeKey = sourceId.slice(4);
        const typeName = RWG_WORLD_TYPES[typeKey]?.displayName || typeKey.replace(/-/g, ' ');
        name = `Random World: ${typeName}`;
      } else {
        name = name.toString()
                   .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                   .replace(/_/g, ' ')
                   .replace(/(^\w|\s\w)/g, m => m.toUpperCase())
                   .trim();
      }
      lines.push(`${name}: ${formatNumber(mult, false, 3)}x`);
    }
  });
  return lines;
}

function updateGrowthRateDisplay(){
  if(!populationModule) return;
  const growthEl = growthRateDisplayCache.growthValue;
  const baseEl = growthRateDisplayCache.baseValue;
  const otherEl = growthRateDisplayCache.otherValue;
  const capEl = growthRateDisplayCache.capacityValue;
  const decayEl = growthRateDisplayCache.decayValue;
  if(!growthEl || !baseEl || !capEl || !otherEl) return;

  const rate = populationModule.getCurrentGrowthPercent();
  growthEl.textContent = `${rate >= 0 ? '+' : ''}${formatNumber(rate, false, 3)}%/s`;

  const baseRate = populationModule.growthRate * 100;
  baseEl.textContent = `${baseRate >= 0 ? '+' : ''}${formatNumber(baseRate, false, 3)}%/s`;

  const otherMult = populationModule.getEffectiveGrowthMultiplier();
  otherEl.textContent = `${formatNumber(otherMult, false, 3)}x`;

  const otherTooltip = growthRateDisplayCache.tooltips.other;
  if(otherTooltip){
    const breakdown = getGrowthMultiplierBreakdown();
    let title = 'Multipliers from colony sliders, and other effects.';
    if(breakdown.length > 0){
      title += '\n' + breakdown.join('\n');
    }
    setTooltipText(otherTooltip, title, growthRateDisplayCache.tooltipCache, 'other');
  }

  const pop = populationModule.populationResource.value;
  const cap = populationModule.populationResource.cap;
  let capMult = 0;
  if(cap > 0){
    capMult = Math.max(0, 1 - pop / cap);
  }
  capEl.textContent = `${formatNumber(capMult * 100, false, 1)}%`;

  if (decayEl) {
    const starvationRate = populationModule.starvationDecayRate * 100;
    const energyRate = populationModule.energyDecayRate * 100;
    const gravityRate = populationModule.gravityDecayRate * 100;
    const totalDecay = starvationRate + energyRate + gravityRate;
    decayEl.textContent = totalDecay === 0 ? '0%/s' : `-${formatNumber(totalDecay, false, 3)}%/s`;
    const decayTooltip = growthRateDisplayCache.tooltips.decay;
    if (decayTooltip) {
      const starvingPercent = populationModule.starvationShortage * 100;
      const withoutPower = populationModule.energyShortage * 100;
      const gravity = terraforming?.celestialParameters?.gravity ?? 0;
      const aboveTwenty = Math.max(0, gravity - 20);
      const text = [
        'Combined population loss from shortages and high gravity.',
        `• Starvation: ${formatNumber(starvationRate, false, 3)}%/s (${formatNumber(starvingPercent, false, 1)}% starving; 100% per 360 s).`,
        `• Energy: ${formatNumber(energyRate, false, 3)}%/s (${formatNumber(withoutPower, false, 1)}% without power; 100% per 90 s).`,
        `• Gravity: ${formatNumber(gravityRate, false, 4)}%/s (gravity ${formatNumber(gravity, false, 2)} m/s²; ${formatNumber(aboveTwenty, false, 2)} above 20).`
      ].join('\n');
      setTooltipText(decayTooltip, text, growthRateDisplayCache.tooltipCache, 'decay');
    }
  }
}

// Create the colony-specific details display

function shouldDisplayNeedBox(needKey, structure) {
  if (needKey !== 'components') return true;
  const { amount } = structure.getConsumptionResource('colony', needKey);
  return amount > 0;
}

function createColonyDetails(structure) {
  const colonyDetails = document.createElement('div');
  colonyDetails.classList.add('colony-details');
  colonyDetails.style.display = 'flex';
  colonyDetails.style.flexWrap = 'wrap';

  structure.needBoxCache = {};

  // Add comfort and happiness boxes
  const happinessBox = createNeedBox('happiness', 'Happiness', structure.happiness, false, structure);
  const comfortBox = createNeedBox('comfort', 'Comfort', structure.getComfort(), false, structure);

  colonyDetails.appendChild(happinessBox);
  colonyDetails.appendChild(comfortBox);

  // Add need boxes dynamically based on structure.filledNeeds
  for (const need in structure.filledNeeds) {
    if (!shouldDisplayNeedBox(need, structure)) continue;
    const isLuxury = luxuryResources[need];
    const displayName = resources.colony[need].displayName;
    const needBox = createNeedBox(need, displayName, structure.filledNeeds[need], isLuxury, structure);
    colonyDetails.appendChild(needBox);
  }

  globalThis.Aerostat?.attachBuoyancySection?.(colonyDetails, structure);

  return colonyDetails;
}

// Update the colony-specific needs display
function updateColonyDetailsDisplay(structureRow, structure) {
  updateUnhideButtons();

  const colonyConsumption = structure.getConsumption().colony || {};
  let needsMissing = false;
  if (structure.needBoxCache) {
    for (const need in colonyConsumption) {
      if (!shouldDisplayNeedBox(need, structure)) continue;
      if (!structure.needBoxCache[need]) {
        needsMissing = true;
        break;
      }
    }
  }

  if (!structure.needBoxCache || needsMissing) {
    rebuildColonyNeedCache(structureRow, structure);
  }

  // Update comfort and happiness boxes
  updateNeedBox(structure.needBoxCache.happiness, 'Happiness', 'happiness', structure.happiness, false, structure);
  updateNeedBox(structure.needBoxCache.comfort, 'Comfort', 'comfort', structure.getComfort(), false, structure);

  // Update need boxes dynamically based on structure.filledNeeds
  for (const need in structure.filledNeeds) {
    if (!shouldDisplayNeedBox(need, structure)) {
      const cacheEntry = structure.needBoxCache[need];
      if (cacheEntry) {
        cacheEntry.box.remove();
        delete structure.needBoxCache[need];
      }
      continue;
    }
    const isLuxury = luxuryResources[need];
    updateNeedBox(structure.needBoxCache[need], resources.colony[need].displayName, need, structure.filledNeeds[need], isLuxury, structure);
  }

  globalThis.Aerostat?.updateBuoyancySection?.(structure);
}

// Helper function to create a need box with dynamic fill and color
function createNeedBox(needKey, displayName, value, isLuxury, structure) {
  const needBox = document.createElement('div');
  needBox.classList.add('need-box');
  needBox.id = `${structure.name}-${needKey}`;

  let checkbox = null;
  if (isLuxury) {
    checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${structure.name}-${needKey}-checkbox`;
    checkbox.checked = structure.luxuryResourcesEnabled[needKey];
    checkbox.addEventListener('change', () => {
      structure.luxuryResourcesEnabled[needKey] = checkbox.checked;
      updateNeedBox(structure.needBoxCache[needKey], displayName, needKey, structure.filledNeeds[needKey], isLuxury, structure);
    });

    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('checkbox-container');
    checkboxContainer.appendChild(checkbox);

    needBox.appendChild(checkboxContainer);
    // Cache reference on element for fast updates
    needBox._checkboxEl = checkbox;
  }

  const textContainer = document.createElement('div');
  textContainer.classList.add('text-container');
  const textSpan = document.createElement('span');
  textSpan.textContent = `${displayName}: ${(value * 100).toFixed(0)}%`;
  textContainer.appendChild(textSpan);

  const fillElement = document.createElement('div');
  fillElement.classList.add('need-fill');
  fillElement.style.width = `${value === 0 ? 100 : value * 100}%`;
  fillElement.style.backgroundColor = getNeedColor(value, false, needKey);

  needBox.appendChild(textContainer);
  needBox.appendChild(fillElement);

  structure.needBoxCache[needKey] = {
    box: needBox,
    fill: fillElement,
    text: textSpan,
    checkbox
  };

  return needBox;
}

// Helper function to update need boxes dynamically
function updateNeedBox(cacheEntry, displayName, needKey, value, isLuxury, structure) {
  if (cacheEntry) {
    cacheEntry.fill.style.width = `${value === 0 ? 100 : value * 100}%`;
    const isDarkMode = document.body.classList.contains('dark-mode');
    cacheEntry.fill.style.backgroundColor = getNeedColor(value, isDarkMode, needKey);
    cacheEntry.text.innerText = `${displayName}: ${(value * 100).toFixed(0)}%`;
    cacheEntry.text.style.color = isDarkMode ? 'white' : 'black';

    if (isLuxury && cacheEntry.checkbox) {
      cacheEntry.checkbox.checked = structure.luxuryResourcesEnabled[needKey];
    }
  }
}

function rebuildColonyNeedCache(structureRow, structure) {
  const oldDetails = structureRow.querySelector('.colony-details');
  if (oldDetails) {
    oldDetails.replaceWith(createColonyDetails(structure));
  } else {
    structureRow.appendChild(createColonyDetails(structure));
  }
}

function invalidateColonyNeedCache() {
  Object.values(colonies).forEach(colony => {
    colony.needBoxCache = undefined;
  });
}

document.addEventListener('colonyNeedsChanged', e => {
  const detail = e.detail || {};
  if (detail.structureRow && detail.structure) {
    rebuildColonyNeedCache(detail.structureRow, detail.structure);
  }
});

document.addEventListener('colonyStructuresRebuilt', invalidateColonyNeedCache);

// Helper function to determine the color based on the value

function getNeedColor(value, isDarkMode, needKey) {
  if (value > 1 && needKey === 'happiness') {
    return isDarkMode ? '#d6ecff' : '#bfe6ff';
  }
  if (value === 1) {
    return isDarkMode ? '#004d00' : 'green';
  } else if (value > 0 && value < 1) {
    return isDarkMode ? '#b3b300' : 'yellow';
  } else {
    return isDarkMode ? '#8b0000' : 'red';
  }
}

let colonyTabAlertNeeded = false;
const colonyAlertElements = { tab: null, content: null };

function cacheColonyAlertElements() {
  colonyAlertElements.tab = colonyAlertElements.tab || document.getElementById('colonies-alert');
  colonyAlertElements.content = colonyAlertElements.content || document.getElementById('colonies');
}

function updateColonyAlert() {
  cacheColonyAlertElements();
  const display = (!gameSettings.silenceUnlockAlert && colonyTabAlertNeeded) ? 'inline' : 'none';
  colonyAlertElements.tab && (colonyAlertElements.tab.style.display = display);
}

function markColoniesViewed() {
  colonyTabAlertNeeded = false;
  for (const name in colonies) {
    const colony = colonies[name];
    if (colony.unlocked) {
      colony.alertedWhenUnlocked = true;
    }
  }
  updateColonyAlert();
}

function registerColonyUnlockAlert() {
  colonyTabAlertNeeded = true;
  updateColonyAlert();
  const isActive = colonyAlertElements.content && colonyAlertElements.content.classList.contains('active');
  isActive && markColoniesViewed();
}

function initializeColonyAlerts() {
  colonyTabAlertNeeded = false;
  for (const name in colonies) {
    const colony = colonies[name];
    if (colony.unlocked && !colony.alertedWhenUnlocked) {
      colonyTabAlertNeeded = true;
    }
  }
  updateColonyAlert();
}

document.addEventListener('DOMContentLoaded', () => {
  const unhideButton = document.getElementById('unhide-obsolete-button');
  if (unhideButton) {
    unhideButton.addEventListener('click', () => {
      Object.values(colonies).forEach(colony => {
          colony.isHidden = false;
          updateStructureHiddenPreference(colony.name, false);
      });
      updateColonyDisplay(colonies);
    });
  }

  createGrowthRateDisplay();
  initializeConstructionOfficeUI();
});

globalThis.rebuildColonyNeedCache = rebuildColonyNeedCache;
globalThis.invalidateColonyNeedCache = invalidateColonyNeedCache;

if (typeof module !== 'undefined') {
  module.exports = { createColonyDetails, updateColonyDetailsDisplay, rebuildColonyNeedCache, invalidateColonyNeedCache };
}

