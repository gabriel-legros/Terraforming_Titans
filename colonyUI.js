let showObsoleteBuildings = false;

function createGrowthRateDisplay(){
  const controlsContainer = document.getElementById('colony-controls-container');
  if(!controlsContainer || document.getElementById('growth-rate-container')) return;

  const container = document.createElement('div');
  container.id = 'growth-rate-container';
  container.classList.add('growth-rate');

  // Capacity multiplier line
  const capLine = document.createElement('div');
  capLine.classList.add('growth-rate-line');
  capLine.innerHTML = '<span>Capacity:</span> <span id="growth-capacity-value">0%</span>';
  const capInfo = document.createElement('span');
  capInfo.classList.add('info-tooltip-icon');
  capInfo.title = 'Capacity multiplier from the logistic growth equation. This is 1 - population / capacity, so growth slows as you approach your housing cap and stops entirely when population equals capacity.';
  capInfo.innerHTML = '&#9432;';
  capLine.appendChild(capInfo);
  container.appendChild(capLine);

  // Base rate line
  const baseLine = document.createElement('div');
  baseLine.classList.add('growth-rate-line');
  baseLine.innerHTML = '<span>Base rate:</span> <span id="growth-base-value">0%/s</span>';
  const baseInfo = document.createElement('span');
  baseInfo.classList.add('info-tooltip-icon');
  baseInfo.title = 'Base growth rate derived from happiness: (happiness - 50%) / 300. Food and energy each give up to 25 happiness when satisfied. Comfort adds 20 times its rating. Each luxury resource can add 10 happiness if food and energy are met, and milestones ready to claim or claimed provide 10 more. Happiness above 50% increases growth while below 50% causes decay.';
  baseInfo.innerHTML = '&#9432;';
  baseLine.appendChild(baseInfo);
  container.appendChild(baseLine);

  // Other multipliers line
  const otherLine = document.createElement('div');
  otherLine.classList.add('growth-rate-line');
  otherLine.innerHTML = '<span>Other multipliers:</span> <span id="growth-other-value">100%</span>';
  const otherInfo = document.createElement('span');
  otherInfo.classList.add('info-tooltip-icon');
  otherInfo.title = 'Multipliers from colony sliders, skills, research and events that modify population growth.';
  otherInfo.innerHTML = '&#9432;';
  otherLine.appendChild(otherInfo);
  container.appendChild(otherLine);

  // Final growth line
  const growthLine = document.createElement('div');
  growthLine.classList.add('growth-rate-line');
  growthLine.innerHTML = '<span>Growth:</span> <span id="growth-rate-value">0%/s</span>';
  const growthInfo = document.createElement('span');
  growthInfo.classList.add('info-tooltip-icon');
  growthInfo.title = 'Final growth rate after applying all multipliers. Population grows at base rate × population × capacity multiplier, further modified by colony sliders and other effects.';
  growthInfo.innerHTML = '&#9432;';
  growthLine.appendChild(growthInfo);
  container.appendChild(growthLine);

  const rightControlsContainer = document.getElementById('right-controls-container');
  rightControlsContainer.appendChild(container);
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

  // Add comfort and happiness boxes
  const happinessBox = createNeedBox('Happiness', structure.happiness, `${structure.name}-happiness`, false, structure);
  const comfortBox = createNeedBox('Comfort', structure.baseComfort, `${structure.name}-comfort`, false, structure);

  colonyDetails.appendChild(happinessBox);
  colonyDetails.appendChild(comfortBox);

  // Add need boxes dynamically based on structure.filledNeeds
  for (const need in structure.filledNeeds) {
    const isLuxury = luxuryResources[need];
    const needBox = createNeedBox(need, structure.filledNeeds[need], `${structure.name}-${need}`, isLuxury, structure);
    colonyDetails.appendChild(needBox);
  }

  return colonyDetails;
}

// Update the colony-specific needs display
function updateColonyDetailsDisplay(structureRow, structure) {
  // Check if there are hidden obsolete buildings and update the "Unhide" button visibility
  const hasHiddenObsoleteBuildings = Object.values(colonies).some(colony => colony.isHidden);
  document.getElementById('unhide-obsolete-container').style.display = hasHiddenObsoleteBuildings ? 'block' : 'none';

  // Update comfort and happiness boxes
  updateNeedBox(structureRow.querySelector(`#${structure.name}-happiness`), 'Happiness', structure.happiness, false, structure);
  updateNeedBox(structureRow.querySelector(`#${structure.name}-comfort`), 'Comfort', structure.baseComfort, false, structure);

  // Update need boxes dynamically based on structure.filledNeeds
  for (const need in structure.filledNeeds) {
    const isLuxury = luxuryResources[need];
    updateNeedBox(structureRow.querySelector(`#${structure.name}-${need}`), resources.colony[need].displayName, structure.filledNeeds[need], isLuxury, structure);
  }
}

// Helper function to create a need box with dynamic fill and color
function createNeedBox(needName, value, id, isLuxury, structure) {
  const needBox = document.createElement('div');
  needBox.classList.add('need-box');
  needBox.id = id;

  // Add a checkbox for luxury resources
  if (isLuxury) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${structure.name}-${needName}-checkbox`;
    checkbox.checked = structure.luxuryResourcesEnabled[needName];
    checkbox.addEventListener('change', () => {
      structure.luxuryResourcesEnabled[needName] = checkbox.checked;
      updateNeedBox(needBox, resources.colony[needName].displayName, structure.filledNeeds[needName], isLuxury, structure);
    });

    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('checkbox-container');
    checkboxContainer.appendChild(checkbox);

    needBox.appendChild(checkboxContainer);
  }

  // Create the text container
  const textContainer = document.createElement('div');
  textContainer.classList.add('text-container');
  textContainer.innerHTML = `<span>${needName}: ${(value * 100).toFixed(0)}%</span>`;

  // Create the fill element
  const fillElement = document.createElement('div');
  fillElement.classList.add('need-fill');
  fillElement.style.width = `${value === 0 ? 100 : value * 100}%`;
  fillElement.style.backgroundColor = getNeedColor(value);

  // Append the text container and fill element to the need box
  needBox.appendChild(textContainer);
  needBox.appendChild(fillElement);

  return needBox;
}

// Helper function to update need boxes dynamically
function updateNeedBox(needBox, needName, value, isLuxury, structure) {
  if (needBox) {
    // Update the text inside the box and the fill
    const fillElement = needBox.querySelector('.need-fill');
    const textContainer = needBox.querySelector('span');
    fillElement.style.width = `${value === 0 ? 100 : value * 100}%`;
    fillElement.style.backgroundColor = getNeedColor(value);
    textContainer.innerText = `${needName}: ${(value * 100).toFixed(0)}%`;

    // Update the checkbox state for luxury resources
    if (isLuxury) {
      const checkbox = needBox.querySelector(`#${structure.name}-${needName}-checkbox`);
      if (checkbox) {
        checkbox.checked = structure.luxuryResourcesEnabled[needName];
      }
    }
  }
}

// Helper function to determine the color based on the value
function getNeedColor(value) {
    if (value === 1) {
      return 'green';
    } else if (value > 0 && value < 1) {
      return 'yellow';
    } else {
      return 'red';
    }
  }

document.addEventListener('DOMContentLoaded', () => {
  const unhideButton = document.getElementById('unhide-obsolete-button');
  if (unhideButton) {
    unhideButton.addEventListener('click', () => {
      // Access the *current* global colonies object directly inside the handler
      Object.values(colonies).forEach(colony => {
        if (colony.unlocked && colony.obsolete) { // Only unhide obsolete ones that were hidden
          colony.isHidden = false;
        }
      });
      // Potentially need to re-render the colony buttons after unhiding
      updateColonyDisplay(colonies); // Re-render to show the unhidden buildings
    });
  }

  createGrowthRateDisplay();
});