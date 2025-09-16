let showObsoleteBuildings = false;

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
  capLine.innerHTML = '<span>Capacity:</span> <span id="growth-capacity-value">0%</span>';
  const capInfo = document.createElement('span');
  capInfo.classList.add('info-tooltip-icon');
  capInfo.title = 'Capacity multiplier from the logistic growth equation. This is 1 - population / capacity, so growth slows as you approach your housing cap and stops entirely when population equals capacity.';
  capInfo.innerHTML = '&#9432;';
  capLine.appendChild(capInfo);
  body.appendChild(capLine);

  // Base rate line
  const baseLine = document.createElement('div');
  baseLine.classList.add('growth-rate-line');
  baseLine.innerHTML = '<span>Base rate:</span> <span id="growth-base-value">0%/s</span>';
  const baseInfo = document.createElement('span');
  baseInfo.classList.add('info-tooltip-icon');
  baseInfo.title = 'Base growth rate derived from happiness: (happiness - 50%) / 300. Food and energy each give up to 25 happiness when satisfied. Comfort adds 20 times its rating, which can be acquired from researching and constructing better colony buildings. Each luxury resource (electronics and androids) can add 10 happiness if food and energy are met and can be turned off.  Milestones ready to claim or claimed provide 10 more. Happiness above 50% increases growth while below 50% causes decay.';
  baseInfo.innerHTML = '&#9432;';
  baseLine.appendChild(baseInfo);
  body.appendChild(baseLine);

  // Other multipliers line
  const otherLine = document.createElement('div');
  otherLine.classList.add('growth-rate-line');
  otherLine.innerHTML = '<span>Other multipliers:</span> <span id="growth-other-value">100%</span>';
  const otherInfo = document.createElement('span');
  otherInfo.classList.add('info-tooltip-icon');
  otherInfo.title = 'Multipliers from colony sliders, and other effects.';
  otherInfo.innerHTML = '&#9432;';
  otherLine.appendChild(otherInfo);
  body.appendChild(otherLine);

  // Final growth line
  const growthLine = document.createElement('div');
  growthLine.classList.add('growth-rate-line');
  growthLine.innerHTML = '<span>Growth:</span> <span id="growth-rate-value">0%/s</span>';
  const growthInfo = document.createElement('span');
  growthInfo.classList.add('info-tooltip-icon');
  growthInfo.title = 'Final growth rate after applying all multipliers. Population grows at base rate × population × capacity multiplier, further modified by colony sliders and other effects.';
  growthInfo.innerHTML = '&#9432;';
  growthLine.appendChild(growthInfo);
  body.appendChild(growthLine);

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
  const effects = (typeof populationModule !== 'undefined' && Array.isArray(populationModule.activeEffects)) ? populationModule.activeEffects : [];
  const lines = [];
  effects.forEach(effect => {
    if(effect.type === 'growthMultiplier'){
      const mult = effect.value;
      if(mult === 1) return;
      let name = effect.name || effect.sourceId || effect.effectId || 'Unknown';
      name = name.toString()
                 .replace(/([A-Z])/g, ' $1')
                 .replace(/_/g, ' ')
                 .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
      const pct = (mult - 1) * 100;
      const formatted = `${pct >= 0 ? '+' : ''}${formatNumber(pct, false, 1)}%`;
      lines.push(`${name}: ${formatted}`);
    }
  });
  return lines;
}

function updateGrowthRateDisplay(){
  if(typeof populationModule === 'undefined') return;
  const growthEl = document.getElementById('growth-rate-value');
  const baseEl = document.getElementById('growth-base-value');
  const otherEl = document.getElementById('growth-other-value');
  const capEl = document.getElementById('growth-capacity-value');
  if(!growthEl || !baseEl || !capEl || !otherEl) return;

  const rate = populationModule.getCurrentGrowthPercent();
  growthEl.textContent = `${rate >= 0 ? '+' : ''}${formatNumber(rate, false, 3)}%/s`;

  const baseRate = populationModule.growthRate * 100;
  baseEl.textContent = `${baseRate >= 0 ? '+' : ''}${formatNumber(baseRate, false, 3)}%/s`;

  const otherMult = populationModule.getEffectiveGrowthMultiplier() * 100;
  otherEl.textContent = `${formatNumber(otherMult, false, 1)}%`;

  const otherInfo = otherEl.parentElement.querySelector('.info-tooltip-icon');
  if(otherInfo){
    const breakdown = getGrowthMultiplierBreakdown();
    let title = 'Multipliers from colony sliders, and other effects.';
    if(breakdown.length > 0){
      title += '\n' + breakdown.join('\n');
    }
    otherInfo.title = title;
  }

  const pop = populationModule.populationResource.value;
  const cap = populationModule.populationResource.cap;
  let capMult = 0;
  if(cap > 0){
    capMult = 1 - pop / cap;
  }
  capEl.textContent = `${formatNumber(capMult * 100, false, 1)}%`;
}

// Create the colony-specific details display

function createColonyDetails(structure) {
  const colonyDetails = document.createElement('div');
  colonyDetails.classList.add('colony-details');
  colonyDetails.style.display = 'flex';
  colonyDetails.style.flexWrap = 'wrap';

  structure.needBoxCache = {};

  // Add comfort and happiness boxes
  const happinessBox = createNeedBox('happiness', 'Happiness', structure.happiness, false, structure);
  const comfortBox = createNeedBox('comfort', 'Comfort', structure.baseComfort, false, structure);

  colonyDetails.appendChild(happinessBox);
  colonyDetails.appendChild(comfortBox);

  // Add need boxes dynamically based on structure.filledNeeds
  for (const need in structure.filledNeeds) {
    const isLuxury = luxuryResources[need];
    const displayName = resources.colony[need].displayName;
    const needBox = createNeedBox(need, displayName, structure.filledNeeds[need], isLuxury, structure);
    colonyDetails.appendChild(needBox);
  }

  attachAerostatBuoyancySection(colonyDetails, structure);

  return colonyDetails;
}

function attachAerostatBuoyancySection(container, structure) {
  if (typeof Aerostat === 'undefined' || !(structure instanceof Aerostat)) {
    return;
  }

  const summaryText = structure.getBuoyancySummary ? structure.getBuoyancySummary() : 'Buoyancy telemetry pending.';
  const existing = structure.buoyancyUI || {};
  const needsRebuild = !existing.container || !existing.container.classList.contains('project-card');
  if (needsRebuild) {
    const card = document.createElement('div');
    card.classList.add('project-card', 'colony-buoyancy-card');
    card.style.flexBasis = '100%';

    const header = document.createElement('div');
    header.classList.add('card-header');

    const arrow = document.createElement('span');
    arrow.classList.add('collapse-arrow');
    arrow.textContent = '\u25BC';

    const title = document.createElement('span');
    title.classList.add('card-title');
    title.textContent = 'Aerostats Details';

    header.appendChild(arrow);
    header.appendChild(title);

    const body = document.createElement('div');
    body.classList.add('card-body');

    const text = document.createElement('div');
    text.classList.add('colony-buoyancy-text');
    text.textContent = summaryText;
    body.appendChild(text);

    const uiState = {
      container: card,
      header,
      arrow,
      body,
      text,
      expanded: true
    };

    header.addEventListener('click', () => {
      uiState.expanded = !uiState.expanded;
      updateAerostatBuoyancySection(structure);
    });

    card.appendChild(header);
    card.appendChild(body);
    structure.buoyancyUI = uiState;
  } else {
    existing.text.textContent = summaryText;
    structure.buoyancyUI = existing;
  }

  container.appendChild(structure.buoyancyUI.container);
  updateAerostatBuoyancySection(structure);
}

function updateAerostatBuoyancySection(structure) {
  if (!structure || !structure.buoyancyUI) {
    return;
  }
  const summaryText = structure.getBuoyancySummary ? structure.getBuoyancySummary() : 'Buoyancy telemetry pending.';
  const ui = structure.buoyancyUI;
  ui.text.textContent = summaryText;
  const expanded = ui.expanded !== false;
  ui.container.classList.toggle('collapsed', !expanded);
  ui.arrow.textContent = expanded ? '\u25BC' : '\u25B6';
}
// Update the colony-specific needs display
function updateColonyDetailsDisplay(structureRow, structure) {
  updateUnhideButtons();

  if (!structure.needBoxCache) {
    structureRow.querySelector('.colony-details')?.remove();
    structureRow.appendChild(createColonyDetails(structure));
  }

  // Update comfort and happiness boxes
  updateNeedBox(structure.needBoxCache.happiness, 'Happiness', 'happiness', structure.happiness, false, structure);
  updateNeedBox(structure.needBoxCache.comfort, 'Comfort', 'comfort', structure.baseComfort, false, structure);

  // Update need boxes dynamically based on structure.filledNeeds
  for (const need in structure.filledNeeds) {
    const isLuxury = luxuryResources[need];
    updateNeedBox(structure.needBoxCache[need], resources.colony[need].displayName, need, structure.filledNeeds[need], isLuxury, structure);
  }

  updateAerostatBuoyancySection(structure);
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
  fillElement.style.backgroundColor = getNeedColor(value);

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
    cacheEntry.fill.style.backgroundColor = getNeedColor(value, isDarkMode);
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

function getNeedColor(value, isDarkMode) {
    if (value === 1) {
      return isDarkMode ? '#004d00' : 'green';
    } else if (value > 0 && value < 1) {
      return isDarkMode ? '#b3b300' : 'yellow';
    } else {
      return isDarkMode ? '#8b0000' : 'red';
    }
  }

document.addEventListener('DOMContentLoaded', () => {
  const unhideButton = document.getElementById('unhide-obsolete-button');
  if (unhideButton) {
    unhideButton.addEventListener('click', () => {
      Object.values(colonies).forEach(colony => {
        if (colony.unlocked) {
          colony.isHidden = false;
        }
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

