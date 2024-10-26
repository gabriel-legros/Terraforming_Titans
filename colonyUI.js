let showObsoleteBuildings = false;

// Helper function to create a need box with dynamic fill and color
function createNeedBox(needName, value, id) {
    const needBox = document.createElement('div');
    needBox.classList.add('need-box');
    needBox.style.width = '150px'; // Set the width for all boxes
    needBox.style.height = '30px';
    needBox.style.border = '1px solid #ccc';
    needBox.style.position = 'relative';
    needBox.style.overflow = 'hidden';
    needBox.style.display = 'inline-block'; // Ensure boxes are inline
    needBox.id = id; // Assign a unique ID to the box
  
    // Create a background to display the text in a readable manner
    const textContainer = document.createElement('div');
    textContainer.style.position = 'absolute';
    textContainer.style.width = '100%';
    textContainer.style.height = '100%';
    textContainer.style.zIndex = '1';
    textContainer.style.textAlign = 'center';
    textContainer.style.lineHeight = '30px';
    textContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent background for readability
    textContainer.style.color = 'black'; // Text color for visibility
    textContainer.innerHTML = `<span>${needName}: ${(value * 100).toFixed(0)}%</span>`;
  
    // Create the fill element
    const fillElement = document.createElement('div');
    fillElement.classList.add('need-fill');
    fillElement.style.width = `${value === 0 ? 100 : value * 100}%`; // Fill fully with red if value is 0
    fillElement.style.height = '100%';
    fillElement.style.backgroundColor = getNeedColor(value);
    fillElement.style.position = 'absolute';
    fillElement.style.top = '0';
    fillElement.style.left = '0';
    fillElement.style.zIndex = '0'; // Ensure it's behind the text container
  
    // Append both the fill and text elements to the need box
    needBox.appendChild(fillElement);
    needBox.appendChild(textContainer);
  
    return needBox;
  }

// Create the colony-specific details display
function createColonyDetails(structure) {
  const colonyDetails = document.createElement('div');
  colonyDetails.classList.add('colony-details');
  colonyDetails.style.display = 'flex'; // Flexbox to display items side by side
  colonyDetails.style.gap = '10px'; // Add some space between the boxes

  // Add comfort and happiness boxes
  const happinessBox = createNeedBox('Happiness', structure.happiness, `${structure.name}-happiness`);
  const comfortBox = createNeedBox('Comfort', structure.baseComfort, `${structure.name}-comfort`);

  colonyDetails.appendChild(happinessBox);
  colonyDetails.appendChild(comfortBox);

  // Add need boxes dynamically based on structure.filledNeeds
  for (const need in structure.filledNeeds) {
    const needBox = createNeedBox(need, structure.filledNeeds[need], `${structure.name}-${need}`);
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
  updateNeedBox(structureRow, `${structure.name}-happiness`, 'Happiness', structure.happiness);
  updateNeedBox(structureRow, `${structure.name}-comfort`, 'Comfort', structure.baseComfort);

  // Update need boxes dynamically based on structure.filledNeeds
  for (const need in structure.filledNeeds) {
    updateNeedBox(structureRow, `${structure.name}-${need}`, resources.colony[need].displayName, structure.filledNeeds[need]);
  }
}

// Helper function to update need boxes dynamically
function updateNeedBox(structureRow, elementId, needName, value) {
  const needBox = structureRow.querySelector(`#${elementId}`);
  if (needBox) {
    // Update the text inside the box and the fill
    const fillElement = needBox.querySelector('.need-fill');
    const textContainer = needBox.querySelector('span');
    fillElement.style.width = `${value === 0 ? 100 : value * 100}%`;
    fillElement.style.backgroundColor = getNeedColor(value);
    textContainer.innerText = `${needName}: ${(value * 100).toFixed(0)}%`;
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