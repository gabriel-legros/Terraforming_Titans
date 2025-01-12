const lifeShopCategories = [
  { name: 'research', description: 'Focus the effort of your scientists' },
  { name: 'funding', description: 'Bribe external scientists for help.' },
  { name: 'androids', description: 'Deploy androids to assist biologists.' },
  { name: 'components', description: 'Construct advanced biological tools.' },
  { name: 'electronics', description: 'Simulate biology with cutting-edge supercomputers.' }
];


// Function to initialize the life terraforming designer UI
function initializeLifeTerraformingDesignerUI() {
    const lifeTerraformingDiv = document.getElementById('life-terraforming');
  
    // Generate the HTML content
    lifeTerraformingDiv.innerHTML = `
      <div id="life-terraforming-content">
        <h2>Life Designer</h2>
        <table id="life-designs-table">
        <thead>
            <tr>
            <th>Attribute</th>
            <th>Current Design</th>
            <th id="tentative-design-header" style="display: none;">Tentative Design</th>
            </tr>
        </thead>
        <tbody id="life-attributes-body">
            ${generateAttributeRows()}
        </tbody>
        </table>
    <div id="life-terraforming-controls">
      <div id="life-design-controls">
        <button id="life-new-design-btn">Create New Design</button>
        <button id="life-revert-btn" style="display: none;">Cancel</button>
        <div id="life-apply-progress-container" style="display: none;">
          <button id="life-apply-btn">Deploy</button>
          <div id="life-apply-progress"></div>
        </div>
        <div id="life-points-display">
          <p>Points Available: <span id="life-points-available"></span></p>
          <p id="life-points-remaining-display" style="display: none;">Points Remaining: <span id="life-points-remaining"></span></p>
        </div>
        <div id="life-status-messages">
          <p id="temperature-survival-message"></p>
          <p id="temperature-growth-message"></p>
          <p id="moisture-message"></p>
          <p id="radiation-message"></p>
          <p id="toxicity-message"></p>
        </div>
      </div>
      <div id="life-point-shop">
        <h3>Point Shop</h3>
      </div>
    </div>
    </div>
    `;

    const applyProgressContainer = document.getElementById('life-apply-progress-container');
    const applyProgressBar = document.getElementById('life-apply-progress');

    // Get the necessary elements
    const newDesignBtn = document.getElementById('life-new-design-btn');
    const applyBtn = document.getElementById('life-apply-btn');
    const revertBtn = document.getElementById('life-revert-btn');
    const pointsAvailableSpan = document.getElementById('life-points-available');
    const pointsRemainingSpan = document.getElementById('life-points-remaining');
    const tentativeDesignHeader = document.getElementById('tentative-design-header');
    const lifePointsRemainingDisplay = document.getElementById('life-points-remaining-display');
    const lifeAttributesBody = document.getElementById('life-attributes-body');
    const survivalMessageParagraph = document.getElementById('survival-message');
    const growthMessageParagraph = document.getElementById('growth-message');
  
    function generateAttributeRows() {
      let rows = '';
      for (const attributeName in lifeDesigner.currentDesign) {
        const attribute = lifeDesigner.currentDesign[attributeName];
        const convertedValue = attribute.getConvertedValue();
        rows += `
          <tr>
            <td class="life-attribute-name">
              ${attribute.displayName} (Max ${attribute.maxUpgrades})
              <div class="life-attribute-description">${attribute.description}</div>
            </td>
            <td>
              <div id="${attributeName}-current-value">${attribute.value} / ${convertedValue !== null ? `${convertedValue}` : '-'}</div>
            </td>
            <td class="tentative-design-cell" style="display: none;">
              <div id="${attributeName}-tentative-value">
                  <span class="life-tentative-display">0</span>
                  <button class="life-tentative-btn life-tentative-minus" data-attribute="${attributeName}" data-change="-10">-10</button>
                  <button class="life-tentative-btn life-tentative-minus" data-attribute="${attributeName}" data-change="-1">-1</button>
                  <button class="life-tentative-btn life-tentative-plus" data-attribute="${attributeName}" data-change="1">+1</button>
                  <button class="life-tentative-btn life-tentative-plus" data-attribute="${attributeName}" data-change="10">+10</button>
              </div>
            </td>
          </tr>
        `;
      }
      return rows;
    }
    // Event listener for the "Create New Design" button
    newDesignBtn.addEventListener('click', () => {
      lifeDesigner.createNewDesign(0, 0, 0, 0, 0, 0, 0, 0, 0);
      lifeDesigner.tentativeDesign.copyFrom(lifeDesigner.currentDesign);
      updateLifeUI();
    });

    applyBtn.addEventListener('click', () => {
        const duration = lifeDesigner.getTentativeDuration();
        lifeDesigner.confirmDesign(duration);
        updateLifeUI();
      });
  
    // Event listener for the "Apply" button
    applyBtn.addEventListener('click', () => {
      lifeDesigner.confirmDesign();
      updateLifeUI();
    });
  
    // Event listener for the "Revert" button
    revertBtn.addEventListener('click', () => {
      lifeDesigner.discardTentativeDesign();
      updateLifeUI();
    });
  
    // Event listener for button clicks in the tentative design
    document.getElementById('life-attributes-body').addEventListener('click', (event) => {
      if (event.target.classList.contains('life-tentative-btn') && ! lifeDesigner.isActive) {
          const attributeName = event.target.dataset.attribute;
          const changeAmount = parseInt(event.target.dataset.change, 10);
          const tentativeValueDisplay = document.querySelector(`#${attributeName}-tentative-value .life-tentative-display`);
          const currentTentativeValue = parseInt(tentativeValueDisplay.textContent, 10);
          const maxUpgrades = lifeDesigner.tentativeDesign[attributeName].maxUpgrades;

          const remainingPoints = lifeDesigner.maxLifeDesignPoints() - lifeDesigner.tentativeDesign.getDesignCost() + lifeDesigner.tentativeDesign[attributeName].value;

          let newValue = currentTentativeValue + changeAmount;

          // Clamp the value between 0 and the allowed maximum
          newValue = Math.max(0, Math.min(maxUpgrades, newValue));
          newValue = Math.min(newValue, remainingPoints);

          lifeDesigner.tentativeDesign[attributeName].value = newValue;
          updateLifeUI();
      }
  });

  // Generate the point shop buttons
  const lifePointShopDiv = document.getElementById('life-point-shop');
  lifeShopCategories.forEach((category, index) => {
    const categoryContainer = document.createElement('div');
    categoryContainer.classList.add('shop-category-container');
  
    // Add button
    const button = document.createElement('button');
    button.textContent = `Buy with ${category.name} Point`;
    button.dataset.category = category.name;
    button.classList.add('life-point-shop-btn');
    categoryContainer.appendChild(button);
  
    // Add description
    const description = document.createElement('p');
    description.textContent = category.description;
    description.classList.add('shop-category-description');
    categoryContainer.appendChild(description);
  
    // Add separator line if not the last category
    if (index < lifeShopCategories.length - 1) {
      const separator = document.createElement('hr');
      categoryContainer.appendChild(separator);
    }
  
    lifePointShopDiv.appendChild(categoryContainer);
  });
  
  // Event listener for point shop button clicks
  lifePointShopDiv.addEventListener('click', (event) => {
    if (event.target.classList.contains('life-point-shop-btn')) {
      const category = event.target.dataset.category;
      if (lifeDesigner.canAfford(category)) {
        lifeDesigner.buyPoint(category);
        updateLifeUI();
      }
    }
  });

}

// Function to update the UI based on the tentative design state
function updateLifeUI() {
  // Toggle the visibility of the life-terraforming div
  const lifeTerraformingDiv = document.getElementById('life-terraforming-content');
  if (lifeDesigner.enabled) {
    lifeTerraformingDiv.style.display = 'block';
  } else {
    lifeTerraformingDiv.style.display = 'none';
  }

    updateDesignValues();
    updatePointsDisplay();
    updateTemperatureRangesAndMessages();

    const tentativeDesignHeader = document.getElementById('tentative-design-header');
    const lifePointsRemainingDisplay = document.getElementById('life-points-remaining-display');
    const createBtn = document.getElementById('life-new-design-btn');
    const applyBtn = document.getElementById('life-apply-btn');
    const revertBtn = document.getElementById('life-revert-btn');
    const applyProgressContainer = document.getElementById('life-apply-progress-container');
    const applyProgressBar = document.getElementById('life-apply-progress');
  
    if (lifeDesigner.tentativeDesign) {
        tentativeDesignHeader.style.display = 'table-cell';
        lifePointsRemainingDisplay.style.display = 'block';
        createBtn.style.display = 'inline-block';
        applyBtn.style.display = 'inline-block';
        revertBtn.style.display = 'inline-block';
        applyProgressContainer.style.display = 'block';
        if (lifeDesigner.isActive) {
            tentativeDesignHeader.style.display = 'table-cell';
            lifePointsRemainingDisplay.style.display = 'none';
            revertBtn.style.display = 'none';
            createBtn.style.display = 'none';
            showTentativeDesignCells();
            const timeRemaining = Math.max(0, lifeDesigner.remainingTime / 1000).toFixed(2);
            const progressPercent = lifeDesigner.getProgress();
            applyBtn.textContent = `New Design Deployment Progress: ${timeRemaining} seconds remaining (${progressPercent.toFixed(2)}%)`;
            applyBtn.style.background = `linear-gradient(to right, #4caf50 ${progressPercent}%, #ccc ${progressPercent}%)`;
        } else {
            showTentativeDesignCells();
            applyBtn.textContent = `Deploy: Duration ${(lifeDesigner.getTentativeDuration() / 1000).toFixed(2)} seconds`;
            applyProgressBar.style.width = '0%';
        }
    }
    else {
      tentativeDesignHeader.style.display = 'none';
      createBtn.style.display = 'inline-block';
      applyProgressContainer.style.display = 'none';
      applyBtn.style.display = 'none';
      revertBtn.style.display = 'none';
      hideTentativeDesignCells();
    }

    // Update point shop button colors and costs
    const pointShopButtons = document.querySelectorAll('.life-point-shop-btn');
    pointShopButtons.forEach(button => {
      const category = button.dataset.category;
      const cost = lifeDesigner.getPointCost(category);
      button.textContent = `Buy with ${category} (${formatNumber(cost, true)})`;
      button.disabled = !lifeDesigner.canAfford(category);
      button.style.backgroundColor = lifeDesigner.canAfford(category) ? '' : 'red';
    });

  }

    // Function to show the tentative design cells
    function showTentativeDesignCells() {
        const tentativeDesignCells = document.querySelectorAll('.tentative-design-cell');
        tentativeDesignCells.forEach((cell) => {
        cell.style.display = 'table-cell';
        });
    }
    
    // Function to hide the tentative design cells
    function hideTentativeDesignCells() {
        const tentativeDesignCells = document.querySelectorAll('.tentative-design-cell');
        tentativeDesignCells.forEach((cell) => {
        cell.style.display = 'none';
        });
    }
  
    function updateDesignValues() {
      const designCells = document.querySelectorAll('#life-designs-table td:not(:first-child)');
      designCells.forEach((cell, index) => {
        const attributeName = Object.keys(lifeDesigner.currentDesign)[index % Object.keys(lifeDesigner.currentDesign).length];
        const isTentativeCell = cell.classList.contains('tentative-design-cell');
        const design = isTentativeCell ? lifeDesigner.tentativeDesign : lifeDesigner.currentDesign;
        if (design) {
          const attribute = design[attributeName];
  
          const valueDiv = document.getElementById(`${attributeName}-${isTentativeCell ? 'tentative' : 'current'}-value`);
          if (isTentativeCell) {
            const tentativeValueDisplay = valueDiv.querySelector('.life-tentative-display');
            tentativeValueDisplay.textContent = `${attribute.value} / ${attribute.getConvertedValue() !== null ? attribute.getConvertedValue() : '-'}`;
          } else {
            valueDiv.textContent = `${attribute.value} / ${attribute.getConvertedValue() !== null ? attribute.getConvertedValue() : '-'}`;
          }
  
          if (isTentativeCell) {
            cell.style.display = lifeDesigner.tentativeDesign ? 'table-cell' : 'none';
          }
        }
      });
    }
  
    // Function to update the points display
    function updatePointsDisplay() {
        const pointsAvailableSpan = document.getElementById('life-points-available');
        const pointsRemainingSpan = document.getElementById('life-points-remaining');
        pointsAvailableSpan.textContent = lifeDesigner.maxLifeDesignPoints();
        if (lifeDesigner.tentativeDesign) {
          const pointsUsed = Object.values(lifeDesigner.tentativeDesign).reduce((sum, attribute) => sum + attribute.value, 0);
          pointsRemainingSpan.textContent = lifeDesigner.maxLifeDesignPoints() - pointsUsed;
        }
    }

function updateTemperatureRangesAndMessages() {
    const temperatureSurvivalMessageParagraph = document.getElementById('temperature-survival-message');
    const temperatureGrowthMessageParagraph = document.getElementById('temperature-growth-message');
    const moistureMessageParagraph = document.getElementById('moisture-message');
    const radiationMessageParagraph = document.getElementById('radiation-message');
    const toxicityMessageParagraph = document.getElementById('toxicity-message');
    
    const currentDesign = lifeDesigner.currentDesign;
    const tentativeDesign = lifeDesigner.tentativeDesign || currentDesign;
    
    const canSurviveTemperature = tentativeDesign.temperatureSurvivalCheck();
    const canGrowTemperature = tentativeDesign.temperatureGrowthCheck();
    const moistureCheck = tentativeDesign.moistureCheck();
    const radiationCheck = tentativeDesign.radiationCheck();
    const toxicityCheck = tentativeDesign.toxicityCheck();
    
    temperatureSurvivalMessageParagraph.textContent = canSurviveTemperature ? 'Life can survive in the current temperature range.' : 'Life cannot survive anywhere in the current temperature range.';
    temperatureSurvivalMessageParagraph.style.color = canSurviveTemperature ? 'green' : 'red';
    
    temperatureGrowthMessageParagraph.textContent = canGrowTemperature ? 'Life can grow in the current temperature range.' : 'Life cannot grow anywhere in the current temperature range.';
    temperatureGrowthMessageParagraph.style.color = canGrowTemperature ? 'green' : 'red';
    
    moistureMessageParagraph.textContent = moistureCheck ? 'Moisture levels are sufficient for life.' : 'Moisture levels are insufficient for life.  Growth will be impossible.';
    moistureMessageParagraph.style.color = moistureCheck ? 'green' : 'red';
    
    radiationMessageParagraph.textContent = radiationCheck ? 'Radiation levels are safe for life.' : `Radiation levels are too high for life due to lack of a magnetosphere.  Growth will be reduced by ${((0.5 - tentativeDesign.getRadiationMitigationRatio() / 2) * 100).toFixed(0)}%.`;
    radiationMessageParagraph.style.color = radiationCheck ? 'green' : 'orange';
    
    toxicityMessageParagraph.textContent = toxicityCheck ? 'Toxicity levels are safe for life.' : 'Toxicity levels are too high for life.';
    toxicityMessageParagraph.style.color = toxicityCheck ? 'green' : 'orange';
    }