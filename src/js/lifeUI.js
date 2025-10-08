const lifeShopCategories = [
  { name: 'research', description: 'Focus the effort of your scientists' },
  { name: 'funding', description: 'Bribe external scientists for help.' },
  { name: 'androids', description: 'Deploy androids to assist biologists.' },
  { name: 'components', description: 'Construct advanced biological tools.' },
  { name: 'electronics', description: 'Simulate biology with cutting-edge supercomputers.' }
];

// Growth rate increase for photosynthesis efficiency per point
const PHOTOSYNTHESIS_RATE_PER_POINT = 0.00008;

var getEcumenopolisLandFraction = getEcumenopolisLandFraction;
if (typeof module !== 'undefined' && module.exports) {
  ({ getEcumenopolisLandFraction } = require('./advanced-research/ecumenopolis.js'));
}

const tempAttributes = [
  'minTemperatureTolerance',
  'maxTemperatureTolerance',
  'optimalGrowthTemperature'
];

const baseLifeAttributeOrder = [
  'minTemperatureTolerance', 'maxTemperatureTolerance',
  'optimalGrowthTemperature', 'growthTemperatureTolerance',
  'photosynthesisEfficiency',
  'radiationTolerance',
  'invasiveness', 'spaceEfficiency', 'geologicalBurial', 'bioworkforce'
];

function getLifeManagerSafe() {
  try {
    return lifeManager;
  } catch (error) {
    return null;
  }
}

function isBioworkforceUnlocked() {
  const manager = getLifeManagerSafe();
  return manager?.isBooleanFlagSet?.('bioworkforce') ?? false;
}

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

const lifeUICache = {
  // Static caches for UI nodes; rebuilt when UI is rebuilt
  modifyButtons: [],
  tempUnits: [],
  pointShopButtons: [],
  tentativeCells: [],
  bioworkforceElements: [],
  attributeCells: {}, // { [attributeName]: { row, currentDiv, tentativeDiv, tentativeDisplay, tentativeCell, modifyCell } }
  cells: {
    dayTemp: {},
    nightTemp: {},
    tempMultiplier: {},
    moisture: {},
    radiation: {},
    maxDensity: {},
    biomassAmount: {},
    biomassDensity: {},
    growthRate: {},
    growthRateValue: {},
    growthRateTooltip: {}
  }
};

function cacheLifeModifyButtons() {
  lifeUICache.modifyButtons = Array.from(document.querySelectorAll('.life-tentative-btn'));
}

function cacheLifeStatusTableElements() {
  lifeUICache.tempUnits = Array.from(document.querySelectorAll('#life-status-table .temp-unit'));
  const zones = ['global', 'tropical', 'temperate', 'polar'];
  zones.forEach(zone => {
    lifeUICache.cells.dayTemp[zone] = {
      cell: document.getElementById(`day-temp-${zone}`),
      value: document.querySelector(`#day-temp-${zone} .temp-value`),
      status: document.querySelector(`#day-temp-${zone} .temp-status`)
    };
    lifeUICache.cells.nightTemp[zone] = {
      cell: document.getElementById(`night-temp-${zone}`),
      value: document.querySelector(`#night-temp-${zone} .temp-value`),
      status: document.querySelector(`#night-temp-${zone} .temp-status`)
    };
    lifeUICache.cells.tempMultiplier[zone] = document.getElementById(`temp-multiplier-${zone}-status`);
    lifeUICache.cells.moisture[zone] = document.getElementById(`moisture-${zone}-status`);
    lifeUICache.cells.radiation[zone] = document.getElementById(`radiation-${zone}-status`);
    lifeUICache.cells.maxDensity[zone] = document.getElementById(`max-density-${zone}-status`);
    lifeUICache.cells.biomassAmount[zone] = document.getElementById(`biomass-amount-${zone}-status`);
    lifeUICache.cells.biomassDensity[zone] = document.getElementById(`biomass-density-${zone}-status`);
    lifeUICache.cells.growthRate[zone] = {
      cell: document.getElementById(`growth-rate-${zone}-status`),
      value: document.getElementById(`growth-rate-${zone}-value`),
      tooltip: document.getElementById(`growth-rate-${zone}-tooltip`)
    };
  });
}

function invalidateLifeDesignCaches() {
  cacheLifeModifyButtons();
}

function invalidateLifeStatusTableCache() {
  cacheLifeStatusTableElements();
}

document.addEventListener('lifeTentativeDesignCreated', invalidateLifeDesignCaches);
document.addEventListener('lifeTentativeDesignDiscarded', invalidateLifeDesignCaches);
document.addEventListener('lifeStatusTableRebuilt', invalidateLifeStatusTableCache);


// Cache helpers for other high-frequency UI updates
function cacheLifePointShopButtons() {
  const container = document.getElementById('life-point-shop');
  lifeUICache.pointShopButtons = container
    ? Array.from(container.querySelectorAll('.life-point-shop-btn'))
    : [];
}

function cacheLifeTentativeCells() {
  lifeUICache.tentativeCells = Array.from(
    document.querySelectorAll('.tentative-design-cell, .modify-buttons-cell')
  );
}

function cacheLifeAttributeCells() {
  lifeUICache.attributeCells = {};
  baseLifeAttributeOrder.forEach(attributeName => {
    const row = document.getElementById(`life-attribute-row-${attributeName}`);
    const currentDiv = document.getElementById(`${attributeName}-current-value`);
    const tentativeDiv = document.getElementById(`${attributeName}-tentative-value`);
    const tentativeDisplay = tentativeDiv ? tentativeDiv.querySelector('.life-tentative-display') : null;
    const tentativeCell = tentativeDiv ? tentativeDiv.closest('.tentative-design-cell') : null;
    const modifyCell = row ? row.querySelector('.modify-buttons-cell') : null;
    lifeUICache.attributeCells[attributeName] = {
      row,
      currentDiv,
      tentativeDiv,
      tentativeDisplay,
      tentativeCell,
      modifyCell,
    };
  });
}

function cacheBioworkforceElements() {
  lifeUICache.bioworkforceElements = Array.from(
    document.querySelectorAll('[data-bioworkforce-ui]')
  );
}

function invalidateLifeUICache() {
  lifeUICache.modifyButtons = [];
  lifeUICache.tempUnits = [];
  lifeUICache.pointShopButtons = [];
  lifeUICache.tentativeCells = [];
  lifeUICache.bioworkforceElements = [];
  lifeUICache.attributeCells = {};
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
               <div id="life-biodomes-section" style="margin-top: 10px;">
                 <h4>Biodomes</h4>
                 <p>Points from biodomes :
                   <span id="life-biodome-points">0</span>
                   <span id="life-biodome-rate">+0/hour</span>
                  <span class="info-tooltip-icon" id="life-biodome-tooltip" title="Each active Biodome generates life design points at log10(10 × Active Biodomes) per hour. Points accumulate fractionally. Only whole points increase your maximum design points, which equals purchased points plus these whole biodome points.">&#9432;</span>
                </p>
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
                        <td style="border: 1px solid #ccc; padding: 5px;">Day Temp (<span class="temp-unit"></span>)</td>
                        <td id="day-temp-global" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="day-temp-tropical" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
                        <td id="day-temp-temperate" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
                        <td id="day-temp-polar" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Night Temp (<span class="temp-unit"></span>)</td>
                        <td id="night-temp-global" style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>
                        <td id="night-temp-tropical" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
                        <td id="night-temp-temperate" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
                        <td id="night-temp-polar" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
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
      const attributeOrder = baseLifeAttributeOrder;

      for (const attributeName of attributeOrder) {
        if (!lifeDesigner.currentDesign[attributeName]) continue;

        const attribute = lifeDesigner.currentDesign[attributeName];
        const convertedValue = getConvertedDisplay(attributeName, attribute);
        const isBioworkforceRow = attributeName === 'bioworkforce';
        const bioworkforceRowHidden = isBioworkforceRow && !isBioworkforceUnlocked();
        rows += `
          <tr id="life-attribute-row-${attributeName}"${isBioworkforceRow ? ' data-bioworkforce-ui="true"' : ''}${bioworkforceRowHidden ? ' style="display:none;"' : ''}>
            <td class="life-attribute-name">
              ${attribute.displayName} (Max ${attribute.maxUpgrades})
              <div class="life-attribute-description">${attribute.description}${attributeName === 'geologicalBurial' ? ' <span class="info-tooltip-icon" title="Accelerates the conversion of existing biomass into inert geological formations. This removes biomass from the active cycle, representing long-term carbon storage and potentially freeing up space if biomass density limits growth. Burial slows dramatically when carbon dioxide is depleted as life begins recycling its own biomass more efficiently.  Use this alongside carbon importation to continue producing O2 from CO2 even after life growth becomes capped.">&#9432;</span>' : ''}${attributeName === 'spaceEfficiency' ? ' <span class="info-tooltip-icon" title="Increases the maximum amount of biomass (in tons) that can exist per square meter. Higher values allow for denser growth before logistic limits slow it down.">&#9432;</span>' : ''}${attributeName === 'photosynthesisEfficiency' ? ' <span class="info-tooltip-icon" title="Photosynthesis efficiency determines how effectively your designed organisms convert sunlight into biomass. Higher values speed up growth when sufficient light is available.">&#9432;</span>' : ''}${attributeName === 'growthTemperatureTolerance' ? ' <span class="info-tooltip-icon" title="Growth rate is multiplied by a Gaussian curve centered on the optimal temperature. Each point increases the standard deviation by 0.5°C, allowing better growth when daytime temperatures deviate from the optimum.">&#9432;</span>' : ''}${attributeName === 'bioworkforce' ? ' <span class="info-tooltip-icon" title="Each point assigns 0.00001 of global biomass as temporary workers. Worker capacity updates automatically as biomass changes.">&#9432;</span>' : ''}</div>
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
                 <button class="life-tentative-btn life-tentative-minus" data-attribute="${attributeName}" data-change="-10" title="Hold Shift to recover all points.">-10</button>
                 <button class="life-tentative-btn life-tentative-minus" data-attribute="${attributeName}" data-change="-1" title="Hold Shift to recover all points.">-1</button>
                 <button class="life-tentative-btn life-tentative-plus" data-attribute="${attributeName}" data-change="1" title="Hold Shift to spend all points.">+1</button>
                 <button class="life-tentative-btn life-tentative-plus" data-attribute="${attributeName}" data-change="10" title="Hold Shift to spend all points.">+10</button>
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
      document.dispatchEvent(new Event('lifeTentativeDesignCreated'));
      updateLifeUI();
    });

    // Event listener for the "Apply" button
    applyBtn.addEventListener('click', () => {
      const duration = lifeDesigner.getTentativeDuration();
      lifeDesigner.confirmDesign(duration);
      document.dispatchEvent(new Event('lifeTentativeDesignDiscarded'));
      updateLifeUI();
    });

    // Event listener for the "Revert"/"Cancel" button
    revertBtn.addEventListener('click', () => {
      if (lifeDesigner.isActive) {
        lifeDesigner.cancelDeployment();
      } else {
        lifeDesigner.discardTentativeDesign();
      }
      document.dispatchEvent(new Event('lifeTentativeDesignDiscarded'));
      updateLifeUI();
    });
  
    // Event listener for button clicks in the tentative design
    document.getElementById('life-attributes-body').addEventListener('click', (event) => {
      if (event.target.classList.contains('life-tentative-btn') && ! lifeDesigner.isActive) {
          const attributeName = event.target.dataset.attribute;
          const changeAmount = parseInt(event.target.dataset.change, 10);
          const ac = lifeUICache.attributeCells[attributeName] || {};
          const tentativeValueDisplay = ac.tentativeDisplay || document.querySelector(`#${attributeName}-tentative-value .life-tentative-display`);
          const currentTentativeValue = tentativeValueDisplay ? parseInt(tentativeValueDisplay.textContent, 10) : 0;
          const maxUpgrades = lifeDesigner.tentativeDesign[attributeName].maxUpgrades;

          const remainingPoints =
            lifeDesigner.maxLifeDesignPoints() -
            lifeDesigner.tentativeDesign.getDesignCost() +
            Math.abs(lifeDesigner.tentativeDesign[attributeName].value);

          let costExcludingCurrent, available;
          if (attributeName === 'optimalGrowthTemperature') {
              costExcludingCurrent =
                lifeDesigner.tentativeDesign.getDesignCost() -
                Math.abs(lifeDesigner.tentativeDesign[attributeName].value);
              available =
                lifeDesigner.maxLifeDesignPoints() - costExcludingCurrent;
          }

          let newValue;
          if (event.shiftKey) {
              if (changeAmount > 0) {
                  if (attributeName === 'optimalGrowthTemperature') {
                      newValue = Math.min(15, available);
                  } else {
                      newValue = remainingPoints;
                  }
              } else {
                  newValue = 0;
              }
          } else {
              newValue = currentTentativeValue + changeAmount;
          }

          if (attributeName === 'optimalGrowthTemperature') {
              newValue = Math.max(-15, Math.min(15, newValue));
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
      // Cache buttons after they are built
      cacheLifePointShopButtons();
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

  // Cache frequently used node lists for hot paths
  cacheLifeModifyButtons();
  cacheLifeTentativeCells();
  cacheLifeAttributeCells();
  cacheBioworkforceElements();
  cacheLifePointShopButtons();
  document.dispatchEvent(new Event('lifeStatusTableRebuilt'));
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

    const bioworkforceUnlocked = isBioworkforceUnlocked();
    toggleBioworkforceElements(bioworkforceUnlocked);

    updateDesignValues();
    updatePointsDisplay();
    const biodomePointsSpan = document.getElementById('life-biodome-points');
    const biodomeRateSpan = document.getElementById('life-biodome-rate');
    if (biodomePointsSpan) {
      biodomePointsSpan.textContent = formatNumber(lifeDesigner.biodomePoints || 0, false, 2);
    }
    if (biodomeRateSpan) {
      biodomeRateSpan.textContent = `+${formatNumber(lifeDesigner.biodomePointRate, false, 2)}/hour`;
    }
    // updateZonalBiomassDensities(); // Remove call to old function
    updateLifeStatusTable();

    const tentativeDesignHeader = document.getElementById('tentative-design-header');
    const lifePointsRemainingDisplay = document.getElementById('life-points-remaining-display');
    const createBtn = document.getElementById('life-new-design-btn');
    const applyBtn = document.getElementById('life-apply-btn');
    const revertBtn = document.getElementById('life-revert-btn');
    const applyProgressContainer = document.getElementById('life-apply-progress-container');
    const applyProgressBar = document.getElementById('life-apply-progress');
    const modifyButtons = lifeUICache.modifyButtons;

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

    // Update point shop button colors and costs (cached)
    const pointShopButtons = lifeUICache.pointShopButtons;
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
        lifeUICache.tentativeCells.forEach((cell) => {
          cell.style.display = 'table-cell';
        });
    }
    
    // Function to hide the tentative design and modify button cells
    function hideTentativeDesignCells() {
        lifeUICache.tentativeCells.forEach((cell) => {
          cell.style.display = 'none';
        });
    }
  
    function toggleBioworkforceElements(bioworkforceUnlocked) {
      if (!lifeUICache.bioworkforceElements.length) {
        cacheBioworkforceElements();
      }

      lifeUICache.bioworkforceElements.forEach(element => {
        element.style.display = bioworkforceUnlocked ? '' : 'none';
      });

      if (!bioworkforceUnlocked) {
        const bioworkforceCells = lifeUICache.attributeCells.bioworkforce || {};
        const modifyCell = bioworkforceCells.modifyCell;
        const tentativeCell = bioworkforceCells.tentativeCell;
        if (modifyCell) {
          modifyCell.style.display = 'none';
        }
        if (tentativeCell) {
          tentativeCell.style.display = 'none';
        }
      }
    }

    function updateDesignValues() {
      // Use the same attribute order as in generateAttributeRows
      const attributeOrder = baseLifeAttributeOrder;

      attributeOrder.forEach(attributeName => {
        // Update Current Design Value (cached)
        const currentAttribute = lifeDesigner.currentDesign[attributeName];
        const ac = lifeUICache.attributeCells[attributeName] || {};
        const currentValueDiv = ac.currentDiv || document.querySelector(`div[data-attribute="${attributeName}"][id$="-current-value"]`);
        if (currentValueDiv && currentAttribute) {
          currentValueDiv.textContent = `${currentAttribute.value} / ${getConvertedDisplay(attributeName, currentAttribute)}`;
        } else if (currentValueDiv) {
          currentValueDiv.textContent = 'N/A';
        }

        // Update Tentative Design Value (if applicable, cached)
        const tentativeAttribute = lifeDesigner.tentativeDesign ? lifeDesigner.tentativeDesign[attributeName] : null;
        const tentativeValueDiv = ac.tentativeDiv || document.getElementById(`${attributeName}-tentative-value`);
        const tentativeCell = ac.tentativeCell || (tentativeValueDiv ? tentativeValueDiv.closest('.tentative-design-cell') : null);
        if (tentativeCell) {
          if (lifeDesigner.tentativeDesign && tentativeAttribute && tentativeValueDiv) {
            const tentativeValueDisplay = ac.tentativeDisplay || (tentativeValueDiv ? tentativeValueDiv.querySelector('.life-tentative-display') : null);
            if (tentativeValueDisplay) {
              tentativeValueDisplay.textContent = `${tentativeAttribute.value} / ${getConvertedDisplay(attributeName, tentativeAttribute)}`;
            }
            tentativeCell.style.display = 'table-cell';
          } else {
            tentativeCell.style.display = 'none';
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
    if (!designToCheck) {
        console.error("No life design available to check status.");
        return;
    }

    const zones = ['global', 'tropical', 'temperate', 'polar'];

    const updateStatusCell = (cell, result, isGlobalRadiation = false) => {
        if (!cell) return;

        if (typeof result !== 'object' || result === null || typeof result.pass === 'undefined') {
            console.error('Invalid result format:', result);
            cell.innerHTML = '<span title="Error fetching status">?</span>';
            cell.title = 'Error fetching status';
            return;
        }

        if (result.warning) {
            const reason = result.reason || '';
            cell.innerHTML = `<span title="${reason}">&#x26A0;</span>`;
            cell.title = reason;
        } else if (result.pass) {
            cell.innerHTML = '&#x2705;';
            cell.title = '';
        } else {
            const reason = result.reason || 'Failed';
            const reductionText = (isGlobalRadiation && result.reduction > 0)
                ? ` (-${result.reduction.toFixed(0)}% Growth)`
                : '';
            cell.innerHTML = `<span title="${reason}">&#x274C;</span>${reductionText}`;
            cell.title = reason;
        }
    };

    // Get results from check functions
    const growthTempResults = designToCheck.temperatureGrowthCheck();
    const survivalTempResults = designToCheck.temperatureSurvivalCheck();
    const moistureResults = designToCheck.moistureCheckAllZones(); // Use the aggregate function
    const radiationResult = designToCheck.radiationCheck(); // Global check
    // Calculate max density based on space efficiency
    const spaceEfficiencyAttr = designToCheck.spaceEfficiency;
    const densityMultiplier = 1 + (spaceEfficiencyAttr?.value || 0);
    const maxDensity = BASE_MAX_BIOMASS_DENSITY * densityMultiplier;

    // Get biomass and area info
    const totalBiomass = resources.surface.biomass?.value || 0;
    const totalSurfaceArea = terraforming.celestialParameters.surfaceArea;
    const globalDensity = totalSurfaceArea > 0 ? totalBiomass / totalSurfaceArea : 0;

    const ecoFraction = typeof getEcumenopolisLandFraction === 'function'
        ? getEcumenopolisLandFraction(terraforming)
        : 0;
    const landMult = Math.max(0, 1 - ecoFraction);

    // Precompute day and night temperatures
    const zonePerc = {
        tropical: getZonePercentage('tropical'),
        temperate: getZonePercentage('temperate'),
        polar: getZonePercentage('polar')
    };
    const globalDayTemp = terraforming.temperature.zones.tropical.day * zonePerc.tropical +
        terraforming.temperature.zones.temperate.day * zonePerc.temperate +
        terraforming.temperature.zones.polar.day * zonePerc.polar;
    const globalNightTemp = terraforming.temperature.zones.tropical.night * zonePerc.tropical +
        terraforming.temperature.zones.temperate.night * zonePerc.temperate +
        terraforming.temperature.zones.polar.night * zonePerc.polar;
    const dayTemps = {
        global: globalDayTemp,
        tropical: terraforming.temperature.zones.tropical.day,
        temperate: terraforming.temperature.zones.temperate.day,
        polar: terraforming.temperature.zones.polar.day
    };
    const nightTemps = {
        global: globalNightTemp,
        tropical: terraforming.temperature.zones.tropical.night,
        temperate: terraforming.temperature.zones.temperate.night,
        polar: terraforming.temperature.zones.polar.night
    };
    const unit = getTemperatureUnit();
    lifeUICache.tempUnits.forEach(el => el.textContent = unit);

    const survivalRange = designToCheck.getTemperatureRanges().survival;
    const optimal = BASE_OPTIMAL_GROWTH_TEMPERATURE + designToCheck.optimalGrowthTemperature.value;
    const tolerance = designToCheck.getGrowthTemperatureToleranceWidth();
    const calcGrowthMult = temp => {
        if (tolerance <= 0) return temp === optimal ? 1 : 0;
        const diff = temp - optimal;
        return Math.exp(-(diff * diff) / (2 * tolerance * tolerance));
    };

    // Update table cells row by row
    zones.forEach(zone => {
        if (zone !== 'global') {
            const dayCell = lifeUICache.cells.dayTemp[zone];
            const nightCell = lifeUICache.cells.nightTemp[zone];
            const dayTemp = dayTemps[zone];
            const nightTemp = nightTemps[zone];
            const dayMult = growthTempResults[zone]?.multiplier ?? 0;

            const daySurvivalStatus = designToCheck.daytimeTemperatureSurvivalCheckZone(zone);
            let symbol;
            let title = daySurvivalStatus.reason || '';

            if (!daySurvivalStatus.pass) {
                symbol = '&#x274C;';
            } else if (daySurvivalStatus.warning || dayMult === 0) {
                symbol = '&#x26A0;';
                if (daySurvivalStatus.warning && dayMult === 0 && title) {
                    title += '; cannot grow';
                } else if (daySurvivalStatus.warning) {
                    title = daySurvivalStatus.reason || '';
                } else {
                    title = 'Survives but cannot grow';
                }
            } else {
                symbol = '&#x2705;';
                title = '';
            }

            if (dayCell?.value) {
                dayCell.value.textContent = formatNumber(toDisplayTemperature(dayTemp), false, 2);
            }
            if (dayCell?.status && (dayCell.status.innerHTML !== symbol || dayCell.status.title !== title)) {
                dayCell.status.innerHTML = symbol;
                dayCell.status.title = title;
            }

            if (nightCell?.value) {
                nightCell.value.textContent = formatNumber(toDisplayTemperature(nightTemp), false, 2);
            }
            if (nightCell) {
                const nightSurvivalStatus = designToCheck.nighttimeTemperatureSurvivalCheckZone(zone);
                let nightSymbol;
                let nightTitle = nightSurvivalStatus.reason || '';
                if (!nightSurvivalStatus.pass) {
                    nightSymbol = '&#x274C;';
                } else if (nightSurvivalStatus.warning) {
                    nightSymbol = '&#x26A0;';
                } else {
                    nightSymbol = '&#x2705;';
                    nightTitle = '';
                }
                if (nightCell.status && (nightCell.status.innerHTML !== nightSymbol || nightCell.status.title !== nightTitle)) {
                    nightCell.status.innerHTML = nightSymbol;
                    nightCell.status.title = nightTitle;
                }
            }
        }
        // --- Update Status Checks ---
        const tempMultCell = lifeUICache.cells.tempMultiplier[zone];
        if (tempMultCell && growthTempResults[zone]) {
            tempMultCell.textContent = formatNumber(growthTempResults[zone].multiplier, false, 2);
        }

        updateStatusCell(lifeUICache.cells.moisture[zone], moistureResults[zone]);
        updateStatusCell(lifeUICache.cells.radiation[zone], radiationResult, zone === 'global');

        const maxDensityCell = lifeUICache.cells.maxDensity[zone];
        if (maxDensityCell) {
            maxDensityCell.textContent = formatNumber(maxDensity, false, 2);
            maxDensityCell.title = '';
        }

        const amountCell = lifeUICache.cells.biomassAmount[zone];
        const densityCell = lifeUICache.cells.biomassDensity[zone];

        if (zone === 'global') {
            if (amountCell) amountCell.textContent = formatNumber(totalBiomass, true);
            if (densityCell) densityCell.textContent = formatNumber(globalDensity, false, 2);
        } else {
            const zonalBiomass = terraforming.zonalSurface[zone]?.biomass || 0;
            const zoneArea = totalSurfaceArea * getZonePercentage(zone);
            const zonalDensity = zoneArea > 0 ? zonalBiomass / zoneArea : 0;

            if (amountCell) amountCell.textContent = formatNumber(zonalBiomass, true);
            if (densityCell) densityCell.textContent = formatNumber(zonalDensity, false, 2);
        }

        const growthObj = lifeUICache.cells.growthRate[zone];
        const growthCell = growthObj?.cell;
        const valueSpan = growthObj?.value;
        const tooltipSpan = growthObj?.tooltip;
        const zoneBiomass = zone === 'global' ? totalBiomass : terraforming.zonalSurface[zone]?.biomass || 0;
        const baseZoneArea = zone === 'global' ? totalSurfaceArea : totalSurfaceArea * getZonePercentage(zone);
        const zoneArea = baseZoneArea * landMult;
        const maxBiomassForZone = zoneArea * maxDensity;
        const capacityMult = maxBiomassForZone > 0 ? Math.max(0, 1 - zoneBiomass / maxBiomassForZone) : 0;

        if (zone !== 'global' && growthCell) {
            const baseRate = designToCheck.photosynthesisEfficiency.value * PHOTOSYNTHESIS_RATE_PER_POINT;
            const lumMult = zone === 'global'
                ? (terraforming.calculateSolarPanelMultiplier ? terraforming.calculateSolarPanelMultiplier() : 1)
                : (terraforming.calculateZonalSolarPanelMultiplier ? terraforming.calculateZonalSolarPanelMultiplier(zone) : 1);
            const tempMult = growthTempResults[zone]?.multiplier || 0;
            const radMitigation = designToCheck.getRadiationMitigationRatio();
            let radPenalty = terraforming.getMagnetosphereStatus() ? 0 : (terraforming.radiationPenalty || 0) * (1 - radMitigation);
            if (radPenalty < 0.0001) radPenalty = 0;
            const radMult = 1 - radPenalty;
            const waterMult = (terraforming.zonalWater[zone]?.liquid || 0) > 1e-9 ? 1 : 0;
            const otherMult = (typeof lifeManager !== 'undefined' && lifeManager.getEffectiveLifeGrowthMultiplier) ? lifeManager.getEffectiveLifeGrowthMultiplier() : 1;
            const finalRate = baseRate * lumMult * tempMult * capacityMult * radMult * waterMult * otherMult;
            if (valueSpan) valueSpan.textContent = formatNumber(finalRate * 100, false, 2);
            if (tooltipSpan) {
                const lines = [
                    `Base: ${(baseRate * 100).toFixed(2)}%`,
                    `Temp: x${formatNumber(tempMult, false, 2)}`,
                    `Luminosity: x${formatNumber(lumMult, false, 2)}`,
                    `Capacity: x${formatNumber(capacityMult, false, 2)}`,
                    `Radiation: x${formatNumber(radMult, false, 2)}`,
                    `Liquid Water: x${formatNumber(waterMult, false, 2)}`,
                    `Other: x${formatNumber(otherMult, false, 2)}`
                ];
                if (ecoFraction > 0) {
                    const landReduction = (1 - landMult) * 100;
                    lines.push(`Ecumenopolis: x${formatNumber(landMult, false, 2)} (-${landReduction.toFixed(2)}%)`);
                }
                tooltipSpan.title = lines.join('\n');
            }
        }
    });

    const dayGlobalCell = lifeUICache.cells.dayTemp.global?.cell;
    if (dayGlobalCell) {
        const global = survivalTempResults.global;
        if (global.warning) {
            dayGlobalCell.innerHTML = `<span title="${global.reason}">&#x26A0;</span>`;
        } else if (global.pass) {
            dayGlobalCell.innerHTML = '&#x2705;';
        } else {
            dayGlobalCell.innerHTML = `<span title="${global.reason}">&#x274C;</span>`;
        }
    }
    const nightGlobalCell = lifeUICache.cells.nightTemp.global?.cell;
    if (nightGlobalCell) {
        let pass = false;
        let anySafe = false;
        let anyWarning = false;
        let failReason = null;
        ['tropical', 'temperate', 'polar'].forEach(z => {
            const status = designToCheck.nighttimeTemperatureSurvivalCheckZone(z);
            if (status.pass) {
                pass = true;
                if (status.warning) anyWarning = true; else anySafe = true;
            } else if (!failReason) failReason = status.reason;
        });
        if (!pass) {
            nightGlobalCell.innerHTML = `<span title="${failReason || 'Fails in all zones'}">&#x274C;</span>`;
        } else if (!anySafe && anyWarning) {
            nightGlobalCell.innerHTML = '<span title="Growth reduced in all zones">&#x26A0;</span>';
        } else {
            nightGlobalCell.innerHTML = '&#x2705;';
        }
    }
}

// Removed old updateZonalBiomassDensities function

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getConvertedDisplay };
}
