const lifeShopCategories = [
  { name: 'research', description: 'Focus the effort of your scientists' },
  { name: 'funding', description: 'Bribe external scientists for help.' },
  { name: 'androids', description: 'Deploy androids to assist biologists.' },
  { name: 'components', description: 'Construct advanced biological tools.' },
  { name: 'electronics', description: 'Simulate biology with cutting-edge supercomputers.' }
];

// Growth rate increase for photosynthesis efficiency per point
const PHOTOSYNTHESIS_RATE_PER_POINT = 0.00008;

const tempAttributes = [
  'minTemperatureTolerance',
  'maxTemperatureTolerance',
  'optimalGrowthTemperature'
];

function getConvertedDisplay(attributeName, attribute) {
  if (tempAttributes.includes(attributeName)) {
    let kelvin = 0;
    switch (attributeName) {
      case 'minTemperatureTolerance':
        kelvin = baseTemperatureRanges.survival.min - attribute.value;
        break;
      case 'maxTemperatureTolerance':
        kelvin = baseTemperatureRanges.survival.max + attribute.value;
        break;
      case 'optimalGrowthTemperature':
        kelvin = BASE_OPTIMAL_GROWTH_TEMPERATURE + attribute.value;
        break;
    }
    return `${formatNumber(toDisplayTemperature(kelvin), false, 2)}${getTemperatureUnit()}`;
  }
  if (attributeName === 'photosynthesisEfficiency') {
    return (PHOTOSYNTHESIS_RATE_PER_POINT * attribute.value).toFixed(5);
  }
  return attribute.getConvertedValue() !== null ? attribute.getConvertedValue() : '-';
}


// Function to initialize the life terraforming designer UI
function initializeLifeTerraformingDesignerUI() {
    const lifeTerraformingDiv = document.getElementById('life-terraforming');

    // Generate the HTML content
    lifeTerraformingDiv.innerHTML = `
      <p id="life-designer-locked-message" class="empty-message" style="display:none;">
        Complete the "Life Designing and Production" research to unlock the Life Designer.
      </p>
      <div id="life-terraforming-content">
        <h2>Life Designer</h2>
        <div id="life-designer-main-area" style="display: flex; gap: 20px; align-items: stretch;">
            <table id="life-designs-table" style="flex: 3;">
            <thead>
                <tr>
                <th>Attribute</th>
                <th>Current Design</th>
                <th id="tentative-design-header" style="display: none;">Tentative Design</th>
                <th id="modify-header" style="display: none;">Modify</th>
                </tr>
            </thead>
            <tbody id="life-attributes-body">
                ${generateAttributeRows()}
            </tbody>
            </table>
            <div id="life-point-shop" style="flex: 1; border: 1px solid #ccc; border-radius: 5px; padding: 10px;">
              <h4>Controls</h4>
               <div id="life-points-display" style="margin-top: 5px;">
                 <p><span title="Total points purchased">Points Available:</span> <span id="life-points-available"></span> / <span id="life-points-remaining-display" style="display: none;" title="Points left to allocate in tentative design">Remaining: <span id="life-points-remaining"></span></span></p>
               </div>
               <div style="margin-top: 10px;">
                   <button id="life-new-design-btn">Create New Design</button>
                   <button id="life-revert-btn" style="display: none;">Cancel</button>
               </div>
               <div id="life-apply-progress-container" style="display: none; margin-top: 10px;">
                 <button id="life-apply-btn">Deploy</button>
                 <div id="life-apply-progress"></div>
               </div>
               <hr style="margin: 15px 0;">
               <h3>Point Shop</h3>
            </div>
        </div>

        <div id="life-terraforming-controls">
            <div id="life-design-controls">
        <div id="life-status-table-container" style="margin-top: 15px;">
            <table id="life-status-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Requirement <small>(Hover ❌ for details)</small></th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Global</th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Tropical</th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Temperate</th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Polar <span class="info-tooltip-icon" title="Not required to complete terraforming.  Can be ignored.  Or not.  Tip : keeping a zone colder than others can be good to force more water condensation, a very potent greenhouse gas.">&#9432;</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Survival Temp</td>
                        <td id="survival-temp-global-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="survival-temp-tropical-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="survival-temp-temperate-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="survival-temp-polar-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Temp Multiplier</td>
                        <td id="temp-multiplier-global-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="temp-multiplier-tropical-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="temp-multiplier-temperate-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="temp-multiplier-polar-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Liquid Water</td>
                        <td id="moisture-global-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="moisture-tropical-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="moisture-temperate-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="moisture-polar-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                    </tr>
                     <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Radiation</td>
                        <td id="radiation-global-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="radiation-tropical-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="radiation-temperate-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="radiation-polar-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                    </tr>
                     <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Toxicity</td>
                        <td id="toxicity-global-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="toxicity-tropical-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="toxicity-temperate-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="toxicity-polar-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Biomass Amount (tons)</td>
                        <td id="biomass-amount-global-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="biomass-amount-tropical-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="biomass-amount-temperate-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="biomass-amount-polar-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Biomass Density (tons/m²)</td>
                        <td id="biomass-density-global-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="biomass-density-tropical-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="biomass-density-temperate-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="biomass-density-polar-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Growth Rate (%/s)</td>
                        <td id="growth-rate-global-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="growth-rate-tropical-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">
                            <span id="growth-rate-tropical-value">-</span>
                            <span id="growth-rate-tropical-tooltip" class="info-tooltip-icon">&#9432;</span>
                        </td>
                        <td id="growth-rate-temperate-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">
                            <span id="growth-rate-temperate-value">-</span>
                            <span id="growth-rate-temperate-tooltip" class="info-tooltip-icon">&#9432;</span>
                        </td>
                        <td id="growth-rate-polar-status" style="border: 1px solid #ccc; padding: 5px; text-align: center;">
                            <span id="growth-rate-polar-value">-</span>
                            <span id="growth-rate-polar-tooltip" class="info-tooltip-icon">&#9432;</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
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
      const attributeOrder = [
          'minTemperatureTolerance', 'maxTemperatureTolerance',
          'optimalGrowthTemperature', 'growthTemperatureTolerance',
          'photosynthesisEfficiency',
          'radiationTolerance', 'toxicityTolerance',
          'invasiveness', 'spaceEfficiency', 'geologicalBurial' // Added geologicalBurial
      ];

      for (const attributeName of attributeOrder) {
        if (!lifeDesigner.currentDesign[attributeName]) continue;

        const attribute = lifeDesigner.currentDesign[attributeName];
        const convertedValue = getConvertedDisplay(attributeName, attribute);
        rows += `
          <tr>
            <td class="life-attribute-name">
              ${attribute.displayName} (Max ${attribute.maxUpgrades})
              <div class="life-attribute-description">${attribute.description}${attributeName === 'geologicalBurial' ? ' <span class="info-tooltip-icon" title="Accelerates the conversion of existing biomass into inert geological formations. This removes biomass from the active cycle, representing long-term carbon storage and potentially freeing up space if biomass density limits growth. Burial slows dramatically when carbon dioxide is depleted as life begins recycling its own biomass more efficiently.  Use this alongside carbon importation to continue producing O2 from CO2 even after life growth becomes capped.">&#9432;</span>' : ''}${attributeName === 'spaceEfficiency' ? ' <span class="info-tooltip-icon" title="Increases the maximum amount of biomass (in tons) that can exist per square meter. Higher values allow for denser growth before logistic limits slow it down.">&#9432;</span>' : ''}${attributeName === 'photosynthesisEfficiency' ? ' <span class="info-tooltip-icon" title="Photosynthesis efficiency determines how effectively your designed organisms convert sunlight into biomass. Higher values speed up growth when sufficient light is available.">&#9432;</span>' : ''}${attributeName === 'growthTemperatureTolerance' ? ' <span class="info-tooltip-icon" title="Growth rate is multiplied by a Gaussian curve centered on the optimal temperature. Each point increases the standard deviation by 0.5°C, allowing better growth when daytime temperatures deviate from the optimum.">&#9432;</span>' : ''}</div>
            </td>
            <td>
              <div id="${attributeName}-current-value" data-attribute="${attributeName}">${attribute.value} / ${convertedValue !== null ? `${convertedValue}` : '-'}</div>
            </td>
            <td class="tentative-design-cell" style="display: none;">
              <div id="${attributeName}-tentative-value" data-attribute="${attributeName}">
                  <span class="life-tentative-display">0 / -</span>
              </div>
            </td>
            <td class="modify-buttons-cell" style="display: none;">
                 <button class="life-tentative-btn life-tentative-minus" data-attribute="${attributeName}" data-change="-10">-10</button>
                 <button class="life-tentative-btn life-tentative-minus" data-attribute="${attributeName}" data-change="-1">-1</button>
                 <button class="life-tentative-btn life-tentative-plus" data-attribute="${attributeName}" data-change="1">+1</button>
                 <button class="life-tentative-btn life-tentative-plus" data-attribute="${attributeName}" data-change="10">+10</button>
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
  
    // Event listener for the "Revert"/"Cancel" button
    revertBtn.addEventListener('click', () => {
      if (lifeDesigner.isActive) {
        lifeDesigner.cancelDeployment();
      } else {
        lifeDesigner.discardTentativeDesign();
      }
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

          const remainingPoints =
            lifeDesigner.maxLifeDesignPoints() -
            lifeDesigner.tentativeDesign.getDesignCost() +
            Math.abs(lifeDesigner.tentativeDesign[attributeName].value);

          let newValue = currentTentativeValue + changeAmount;

          if (attributeName === 'optimalGrowthTemperature') {
              newValue = Math.max(-15, Math.min(15, newValue));
              const costExcludingCurrent =
                lifeDesigner.tentativeDesign.getDesignCost() -
                Math.abs(lifeDesigner.tentativeDesign[attributeName].value);
              const available =
                lifeDesigner.maxLifeDesignPoints() - costExcludingCurrent;
              const allowed = Math.min(Math.abs(newValue), Math.max(0, available));
              newValue = Math.sign(newValue) * allowed;
          } else {
              // Clamp the value between 0 and the allowed maximum and available points
              newValue = Math.max(0, Math.min(maxUpgrades, newValue));
              newValue = Math.min(newValue, remainingPoints);
          }

          lifeDesigner.tentativeDesign[attributeName].value = newValue;
          updateLifeUI();
      }
  });

  // Generate the point shop buttons (Target the moved div)
  const lifePointShopDiv = document.getElementById('life-point-shop');
  if (lifePointShopDiv) { // Check if element exists before adding content
      lifeShopCategories.forEach((category, index) => {
        const categoryContainer = document.createElement('div');
        categoryContainer.classList.add('shop-category-container');
      
        // Add button
        const button = document.createElement('button');
        const initialCost = lifeDesigner.getPointCost(category.name);
        button.textContent = `Buy with ${category.name} (${formatNumber(initialCost, true)})`;
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
      
      // Event listener for point shop button clicks (Attached to the moved div)
      lifePointShopDiv.addEventListener('click', (event) => {
          // Actual listener logic moved inside here
          if (event.target.classList.contains('life-point-shop-btn')) {
              const category = event.target.dataset.category;
              if (lifeDesigner.canAfford(category)) {
                  lifeDesigner.buyPoint(category);
                  updateLifeUI();
              }
          }
      });
  } else {
      console.error("Could not find #life-point-shop element to populate.");
  }

  // Removed the misplaced/redundant listener code below
  // // Event listener for point shop button clicks (Original listener location - now redundant if above works)
  // // lifePointShopDiv.addEventListener('click', (event) => {
  //   if (event.target.classList.contains('life-point-shop-btn')) {
  //     const category = event.target.dataset.category;
  //     if (lifeDesigner.canAfford(category)) {
  //       lifeDesigner.buyPoint(category);
  //       updateLifeUI();
  //     }
  //   }
  // });

}

// Function to update the UI based on the tentative design state
function updateLifeUI() {
  // Toggle the visibility of the life-terraforming div
  const lifeTerraformingDiv = document.getElementById('life-terraforming-content');
  const lockedMessage = document.getElementById('life-designer-locked-message');
  if (lifeDesigner.enabled) {
    lifeTerraformingDiv.style.display = 'block';
    if (lockedMessage) lockedMessage.style.display = 'none';
  } else {
    lifeTerraformingDiv.style.display = 'none';
    if (lockedMessage) lockedMessage.style.display = 'block';
  }

    updateDesignValues();
    updatePointsDisplay();
    // updateZonalBiomassDensities(); // Remove call to old function
    updateLifeStatusTable();

    const tentativeDesignHeader = document.getElementById('tentative-design-header');
    const lifePointsRemainingDisplay = document.getElementById('life-points-remaining-display');
    const createBtn = document.getElementById('life-new-design-btn');
    const applyBtn = document.getElementById('life-apply-btn');
    const revertBtn = document.getElementById('life-revert-btn');
    const applyProgressContainer = document.getElementById('life-apply-progress-container');
    const applyProgressBar = document.getElementById('life-apply-progress');
    const modifyButtons = document.querySelectorAll('.life-tentative-btn');

    if (lifeDesigner.tentativeDesign) {
        tentativeDesignHeader.style.display = 'table-cell';
        document.getElementById('modify-header').style.display = 'table-cell';
        lifePointsRemainingDisplay.style.display = 'inline'; // Ensure it's visible here
        createBtn.style.display = 'inline-block';
        applyBtn.style.display = 'inline-block';
        revertBtn.style.display = 'inline-block';
        applyProgressContainer.style.display = 'block';
        if (lifeDesigner.isActive) {
            tentativeDesignHeader.style.display = 'table-cell';
            lifePointsRemainingDisplay.style.display = 'inline'; // Keep visible even when deploying
            revertBtn.style.display = 'inline-block';
            createBtn.style.display = 'none';
            createBtn.disabled = true; // Disable create while deploying
            // Keep revert enabled so deployment can be cancelled
            revertBtn.disabled = false;
            modifyButtons.forEach(btn => btn.disabled = true);
            showTentativeDesignCells();
            const timeRemaining = Math.max(0, lifeDesigner.remainingTime / 1000).toFixed(2);
            const progressPercent = lifeDesigner.getProgress();
            // Shorter button text
            applyBtn.textContent = `Deploying: ${timeRemaining}s (${progressPercent.toFixed(0)}%)`;
            applyBtn.style.background = `linear-gradient(to right, #4caf50 ${progressPercent}%, #ccc ${progressPercent}%)`;
            applyBtn.disabled = true; // Disable button during deployment
        } else {
            showTentativeDesignCells();
            applyBtn.textContent = `Deploy: Duration ${(lifeDesigner.getTentativeDuration() / 1000).toFixed(2)} seconds`;
            applyProgressBar.style.width = '0%';
            const survivable = lifeDesigner.tentativeDesign && lifeDesigner.tentativeDesign.canSurviveAnywhere();
            applyBtn.disabled = !survivable; // Disable if design cannot survive
            applyBtn.title = survivable ? '' : 'Life cannot survive anywhere';
            applyBtn.style.background = ''; // Reset background
            revertBtn.disabled = false;
            createBtn.disabled = false;
            modifyButtons.forEach(btn => btn.disabled = false);
        }
    }
    else {
      tentativeDesignHeader.style.display = 'none';
      document.getElementById('modify-header').style.display = 'none';
      lifePointsRemainingDisplay.style.display = 'inline'; // Ensure it's visible when no tentative design
      createBtn.style.display = 'inline-block';
      createBtn.disabled = false; // Re-enable create after deployment
      applyProgressContainer.style.display = 'none';
      applyBtn.style.display = 'none';
      applyBtn.disabled = true;
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

    // Function to show the tentative design and modify button cells
    function showTentativeDesignCells() {
        document.querySelectorAll('.tentative-design-cell, .modify-buttons-cell').forEach((cell) => {
        cell.style.display = 'table-cell';
        });
    }
    
    // Function to hide the tentative design and modify button cells
    function hideTentativeDesignCells() {
        document.querySelectorAll('.tentative-design-cell, .modify-buttons-cell').forEach((cell) => {
        cell.style.display = 'none';
        });
    }
  
    function updateDesignValues() {
      // Use the same attribute order as in generateAttributeRows
      const attributeOrder = [
           'minTemperatureTolerance', 'maxTemperatureTolerance',
           'optimalGrowthTemperature', 'growthTemperatureTolerance',
           'photosynthesisEfficiency',
           'radiationTolerance', 'toxicityTolerance',
           'invasiveness', 'spaceEfficiency', 'geologicalBurial' // Added geologicalBurial
        ];

      attributeOrder.forEach(attributeName => {
        // Update Current Design Value
        const currentAttribute = lifeDesigner.currentDesign[attributeName];
        // Use querySelector with data-attribute for reliability
        const currentValueDiv = document.querySelector(`div[data-attribute="${attributeName}"][id$="-current-value"]`);
        if (currentValueDiv && currentAttribute) {
          currentValueDiv.textContent = `${currentAttribute.value} / ${getConvertedDisplay(attributeName, currentAttribute)}`;
        } else if (currentValueDiv) {
            currentValueDiv.textContent = 'N/A'; // Handle case where attribute might not exist?
        }

        // Update Tentative Design Value (if applicable)
        const tentativeAttribute = lifeDesigner.tentativeDesign ? lifeDesigner.tentativeDesign[attributeName] : null;
         // Use querySelector with data-attribute for reliability
        const tentativeValueDiv = document.querySelector(`div[data-attribute="${attributeName}"][id$="-tentative-value"]`);
        const tentativeCell = tentativeValueDiv ? tentativeValueDiv.closest('.tentative-design-cell') : null;

        if (tentativeCell) { // Check if the parent cell exists
            if (lifeDesigner.tentativeDesign && tentativeAttribute && tentativeValueDiv) {
                const tentativeValueDisplay = tentativeValueDiv.querySelector('.life-tentative-display');
                if (tentativeValueDisplay) {
                    tentativeValueDisplay.textContent = `${tentativeAttribute.value} / ${getConvertedDisplay(attributeName, tentativeAttribute)}`;
                }
                tentativeCell.style.display = 'table-cell'; // Show the cell
            } else {
                 tentativeCell.style.display = 'none'; // Hide the cell
            }
        }

        // Removed logic for updating the non-existent max-density cell
      });
    }
  
    // Function to update the points display
    function updatePointsDisplay() {
        const pointsAvailableSpan = document.getElementById('life-points-available');
        const pointsRemainingSpan = document.getElementById('life-points-remaining');
        const maxPoints = lifeDesigner.maxLifeDesignPoints();
        pointsAvailableSpan.textContent = maxPoints;
        
        let pointsRemaining = 0;
        if (lifeDesigner.tentativeDesign) {
          const pointsUsed = lifeDesigner.tentativeDesign.getDesignCost();
          pointsRemaining = maxPoints - pointsUsed;
        } else {
          const pointsUsed = lifeDesigner.currentDesign.getDesignCost();
          pointsRemaining = maxPoints - pointsUsed;
        }
        pointsRemainingSpan.textContent = pointsRemaining;
    }

// Removed old updateTemperatureRangesAndMessages function

// Function to update the new life status table
function updateLifeStatusTable() {
    const designToCheck = lifeDesigner.tentativeDesign || lifeDesigner.currentDesign;
    // Ensure designToCheck is valid before proceeding
    if (!designToCheck) {
        console.error("No life design available to check status.");
        // Optionally clear the table or show a message
        return;
    }
    
    const zones = ['global', 'tropical', 'temperate', 'polar'];

    // Helper function to update a single status cell
    const updateStatusCell = (elementId, result, isGlobalRadiation = false) => { // Added flag
        const cell = document.getElementById(elementId);
        if (!cell) return;
        
        if (typeof result !== 'object' || result === null || typeof result.pass === 'undefined') {
             console.error(`Invalid result format for ${elementId}:`, result);
             cell.innerHTML = '?';
             cell.title = 'Error fetching status';
             return;
        }

        if (result.pass) {
            cell.innerHTML = '&#x2705;';
            cell.title = '';
        } else {
            // Add reduction % for global radiation cell if applicable
            const reductionText = (isGlobalRadiation && result.reduction > 0)
                                 ? ` (-${result.reduction.toFixed(0)}% Growth)`
                                 : '';
            cell.innerHTML = `&#x274C;${reductionText}`; // Display X and reduction
            cell.title = result.reason || 'Failed';
        }
    };

    // Get results from check functions
    const survivalTempResults = designToCheck.temperatureSurvivalCheck();
    const growthTempResults = designToCheck.temperatureGrowthCheck();
    const moistureResults = designToCheck.moistureCheckAllZones(); // Use the aggregate function
    const radiationResult = designToCheck.radiationCheck(); // Global check
    const toxicityResult = designToCheck.toxicityCheck();   // Global check
    // Calculate max density based on space efficiency
    const spaceEfficiencyAttr = designToCheck.spaceEfficiency;
    const densityMultiplier = 1 + (spaceEfficiencyAttr?.value || 0);
    const maxDensity = BASE_MAX_BIOMASS_DENSITY * densityMultiplier;

    // Get biomass and area info
    const totalBiomass = resources.surface.biomass?.value || 0;
    const totalSurfaceArea = terraforming.celestialParameters.surfaceArea;
    const globalDensity = totalSurfaceArea > 0 ? totalBiomass / totalSurfaceArea : 0;

    // Update table cells row by row
    zones.forEach(zone => {
        // --- Update Status Checks ---
        // Survival Temp
        updateStatusCell(`survival-temp-${zone}-status`, survivalTempResults[zone]);
        const tempMultCell = document.getElementById(`temp-multiplier-${zone}-status`);
        if (tempMultCell && growthTempResults[zone]) {
            tempMultCell.textContent = formatNumber(growthTempResults[zone].multiplier, false, 2);
        }
        // Moisture
        updateStatusCell(`moisture-${zone}-status`, moistureResults[zone]);
         // Radiation (Apply global result, pass flag for special text)
         updateStatusCell(`radiation-${zone}-status`, radiationResult, zone === 'global');
         // Toxicity (Apply global result to all zone cells for this row)
         updateStatusCell(`toxicity-${zone}-status`, toxicityResult);
         // Max Density (Display calculated value - same for all zones based on design)
         const maxDensityCell = document.getElementById(`max-density-${zone}-status`);
         if (maxDensityCell) {
             maxDensityCell.textContent = formatNumber(maxDensity, false, 2); // Use 1 decimal place
             maxDensityCell.title = ''; // No tooltip needed usually
         }

         // --- Update Biomass Amount and Density ---
         const amountCell = document.getElementById(`biomass-amount-${zone}-status`);
         const densityCell = document.getElementById(`biomass-density-${zone}-status`);

        if (zone === 'global') {
            if(amountCell) amountCell.textContent = formatNumber(totalBiomass, true);
            if(densityCell) densityCell.textContent = formatNumber(globalDensity, false, 2);
        } else {
            const zonalBiomass = terraforming.zonalSurface[zone]?.biomass || 0;
            const zoneArea = totalSurfaceArea * getZonePercentage(zone);
            const zonalDensity = zoneArea > 0 ? zonalBiomass / zoneArea : 0;

            if(amountCell) amountCell.textContent = formatNumber(zonalBiomass, true);
            if(densityCell) densityCell.textContent = formatNumber(zonalDensity, false, 2);
        }

        const growthCell = document.getElementById(`growth-rate-${zone}-status`);
        const valueSpan = document.getElementById(`growth-rate-${zone}-value`);
        const tooltipSpan = document.getElementById(`growth-rate-${zone}-tooltip`);
        const zoneBiomass = zone === 'global' ? totalBiomass : terraforming.zonalSurface[zone]?.biomass || 0;
        const zoneArea = zone === 'global' ? totalSurfaceArea : totalSurfaceArea * getZonePercentage(zone);
        const maxBiomassForZone = zoneArea * maxDensity;
        const capacityMult = maxBiomassForZone > 0 ? Math.max(0, 1 - zoneBiomass / maxBiomassForZone) : 0;

        if(zone !== 'global' && growthCell){
            const baseRate = designToCheck.photosynthesisEfficiency.value * PHOTOSYNTHESIS_RATE_PER_POINT;
            const lumMult = zone === 'global'
                ? (terraforming.calculateSolarPanelMultiplier ? terraforming.calculateSolarPanelMultiplier() : 1)
                : (terraforming.calculateZonalSolarPanelMultiplier ? terraforming.calculateZonalSolarPanelMultiplier(zone) : 1);
            const tempMult = growthTempResults[zone]?.multiplier || 0;
            const radMult = terraforming.getMagnetosphereStatus() ? 1 : (0.5 + 0.5 * designToCheck.getRadiationMitigationRatio());
            const waterMult = (terraforming.zonalWater[zone]?.liquid || 0) > 1e-9 ? 1 : 0;
            const otherMult = (typeof lifeManager !== 'undefined' && lifeManager.getEffectiveLifeGrowthMultiplier) ? lifeManager.getEffectiveLifeGrowthMultiplier() : 1;
            const finalRate = baseRate * lumMult * tempMult * capacityMult * radMult * waterMult * otherMult;
            if(valueSpan) valueSpan.textContent = formatNumber(finalRate * 100, false, 2);
            if(tooltipSpan) {
                tooltipSpan.title = `Base: ${(baseRate*100).toFixed(2)}%\nTemp: x${formatNumber(tempMult, false,2)}\nLuminosity: x${formatNumber(lumMult,false,2)}\nCapacity: x${formatNumber(capacityMult,false,2)}\nRadiation: x${formatNumber(radMult,false,2)}\nLiquid Water: x${formatNumber(waterMult,false,2)}\nOther: x${formatNumber(otherMult,false,2)}`;
            }
        }
    });
}

// Removed old updateZonalBiomassDensities function

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getConvertedDisplay };
}
