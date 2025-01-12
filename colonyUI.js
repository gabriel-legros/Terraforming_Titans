let showObsoleteBuildings = false;

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
    document.getElementById('unhide-obsolete-button').addEventListener('click', () => {
      // Set the isHidden attribute to true for each obsolete colony
      Object.values(colonies).forEach(colony => {
        if (colony.unlocked) {
          colony.isHidden = false;
        }
      });
    });
  });