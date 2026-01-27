const lifeShopCategories = [
  { name: 'research', description: 'Focus the effort of your scientists' },
  { name: 'funding', description: 'Bribe external scientists for help.' },
  { name: 'androids', description: 'Deploy androids to assist biologists.' },
  { name: 'components', description: 'Construct advanced biological tools.' },
  { name: 'electronics', description: 'Simulate biology with cutting-edge supercomputers.' },
  { name: 'advancedResearch', label: 'advanced research', description: 'Push our knowledge even further.', tooltip: 'Scales quadratically and persists when travelling.', requiresFlag: 'nextGenBioEngineering' }
];

const lifeShopCategoryLookup = Object.fromEntries(
  lifeShopCategories.map(category => [category.name, category])
);

function getActiveLifeDesignRequirementsForUI() {
    return getActiveLifeDesignRequirements();
}

function getActiveLifeMetabolismProcessForUI() {
  const requirements = getActiveLifeDesignRequirementsForUI();
  const metabolism = requirements.metabolism;
  const primaryProcessId = metabolism?.primaryProcessId;
  return metabolism?.processes?.[primaryProcessId]
    ?? metabolism?.processes?.photosynthesis
    ?? { displayName: 'Metabolism', growth: { usesLuminosity: true, perBiomass: { surface: {}, atmospheric: {} } } };
}

function formatMetabolismGrowthEquationForUI(process, options) {
  try {
    return formatMetabolismGrowthEquation(process, options);
  } catch (error) {
    return '';
  }
}

function buildMetabolismEfficiencyUIStrings() {
  const process = getActiveLifeMetabolismProcessForUI();
  const usesLuminosity = !!process?.growth?.usesLuminosity;
  const displayName = `${process.displayName} Efficiency`;
  const description = usesLuminosity
    ? 'Efficiency of converting light to energy; affects growth rate.'
    : 'Efficiency of converting chemical energy into biomass; affects growth rate.';
  const equation = formatMetabolismGrowthEquationForUI(process);
  const tooltipText = [
    `${displayName} determines the base growth rate.`,
    '',
    `Growth chemistry: ${equation}`,
    '',
    `Detailed: ${formatMetabolismGrowthEquationForUI(process, { includeCoefficients: true })}`,
  ].join('\n');

  return { displayName, description, equation, tooltipText };
}

function getOptimalGrowthTemperatureDescription() {
  const requirements = getActiveLifeDesignRequirementsForUI();
  const baseTemperature = formatNumber(
    toDisplayTemperature(requirements.optimalGrowthTemperatureBaseK),
    false,
    2
  );
  return `Daytime temperature for peak growth. Costs 1 point per degree from the ${baseTemperature}${getTemperatureUnit()} base.`;
}

function ensureDynamicInfoTooltip(iconElement, cachedTooltip, text) {
  if (!iconElement) return null;
  const existing = cachedTooltip ?? iconElement.querySelector('.resource-tooltip.dynamic-tooltip');
  if (!existing) return attachDynamicInfoTooltip(iconElement, text);
  if (existing.textContent !== text) existing.textContent = text;
  if (existing.style && existing.style.whiteSpace !== 'pre-line') existing.style.whiteSpace = 'pre-line';
  return existing;
}

function attachDynamicInfoTooltipsFromData(container) {
  const icons = container.querySelectorAll('.info-tooltip-icon[data-tooltip]');
  icons.forEach(icon => {
    const text = icon.dataset.tooltip || '';
    if (text) attachDynamicInfoTooltip(icon, text);
  });
}

function ensureStatusCellElements(cell) {
  if (!cell.statusIcon) {
    const icon = document.createElement('span');
    const suffix = document.createElement('span');
    cell.textContent = '';
    cell.append(icon, suffix);
    cell.statusIcon = icon;
    cell.statusSuffix = suffix;
    cell.statusTooltip = null;
  }
  return cell.statusIcon;
}

function updateStatusCellIcon(cell, symbol, tooltipText, suffixText) {
  const icon = ensureStatusCellElements(cell);
  if (!cell.statusSymbol) {
    const symbolNode = document.createTextNode(symbol);
    const firstChild = icon.firstChild;
    if (firstChild) {
      icon.insertBefore(symbolNode, firstChild);
    } else {
      icon.appendChild(symbolNode);
    }
    cell.statusSymbol = symbolNode;
  } else if (cell.statusSymbol.nodeValue !== symbol) {
    cell.statusSymbol.nodeValue = symbol;
  }
  const nextSuffix = suffixText || '';
  if (cell.statusSuffix.textContent !== nextSuffix) {
    cell.statusSuffix.textContent = nextSuffix;
  }
  if (tooltipText) {
    cell.statusTooltip = ensureDynamicInfoTooltip(icon, cell.statusTooltip, tooltipText);
  } else if (cell.statusTooltip) {
    cell.statusTooltip.remove();
    cell.statusTooltip = null;
  }
}

function updateStatusSpan(statusEntry, symbol, tooltipText) {
  if (!statusEntry.symbolNode) {
    const symbolNode = document.createTextNode(symbol);
    const firstChild = statusEntry.status.firstChild;
    if (firstChild) {
      statusEntry.status.insertBefore(symbolNode, firstChild);
    } else {
      statusEntry.status.appendChild(symbolNode);
    }
    statusEntry.symbolNode = symbolNode;
  } else if (statusEntry.symbolNode.nodeValue !== symbol) {
    statusEntry.symbolNode.nodeValue = symbol;
  }
  if (tooltipText) {
    statusEntry.tooltipEl = ensureDynamicInfoTooltip(statusEntry.status, statusEntry.tooltipEl, tooltipText);
  } else if (statusEntry.tooltipEl) {
    statusEntry.tooltipEl.remove();
    statusEntry.tooltipEl = null;
  }
}

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

function isLifeFlagActive(flagId) {
  if (!flagId) {
    return false;
  }
  const manager = getLifeManagerSafe();
  return manager?.isBooleanFlagSet?.(flagId) ?? false;
}

function isBioworkforceUnlocked() {
  return isLifeFlagActive('bioworkforce');
}

function isLifeShopCategoryUnlocked(category) {
  if (!category) {
    return false;
  }
  if (!category.requiresFlag) {
    return true;
  }
  return isLifeFlagActive(category.requiresFlag);
}

function getConvertedDisplay(attributeName, attribute) {
  if (tempAttributes.includes(attributeName)) {
    const requirements = getActiveLifeDesignRequirementsForUI();
    let kelvin = 0;
    switch (attributeName) {
      case 'minTemperatureTolerance':
        kelvin = requirements.survivalTemperatureRangeK.min - attribute.value;
        break;
      case 'maxTemperatureTolerance':
        kelvin = requirements.survivalTemperatureRangeK.max + attribute.value;
        break;
      case 'optimalGrowthTemperature':
        kelvin = requirements.optimalGrowthTemperatureBaseK + attribute.value;
        break;
    }
    return `${formatNumber(toDisplayTemperature(kelvin), false, 2)}${getTemperatureUnit()}`;
  }
  if (attributeName === 'photosynthesisEfficiency') {
    const requirements = getActiveLifeDesignRequirementsForUI();
    return (requirements.photosynthesisRatePerPoint * attribute.value).toFixed(5);
  }
  return attribute.getConvertedValue() !== null ? attribute.getConvertedValue() : '-';
}

const lifeUICache = {
  // Static caches for UI nodes; rebuilt when UI is rebuilt
  modifyButtons: [],
  tempUnits: [],
  pointShopButtons: [],
  pointShopContainers: {},
  pointShopQuantityDisplay: null,
  pointShopDecreaseButton: null,
  pointShopIncreaseButton: null,
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

let lifePointPurchaseQuantity = 1;

function getSpendableLifeDesignPoints() {
  return Math.floor(lifeDesigner.maxLifeDesignPoints());
}

function cacheLifeModifyButtons() {
  lifeUICache.modifyButtons = Array.from(document.querySelectorAll('.life-tentative-btn'));
}

function cacheLifeStatusTableElements() {
  lifeUICache.tempUnits = Array.from(document.querySelectorAll('#life-status-table .temp-unit'));
  const zones = ['global', 'tropical', 'temperate', 'polar'];
  zones.forEach(zone => {
    const dayCell = document.getElementById(`day-temp-${zone}`);
    const nightCell = document.getElementById(`night-temp-${zone}`);
    lifeUICache.cells.dayTemp[zone] = {
      cell: dayCell,
      value: dayCell ? dayCell.querySelector('.temp-value') : null,
      status: dayCell ? dayCell.querySelector('.temp-status') : null,
      tooltipEl: null
    };
    lifeUICache.cells.nightTemp[zone] = {
      cell: nightCell,
      value: nightCell ? nightCell.querySelector('.temp-value') : null,
      status: nightCell ? nightCell.querySelector('.temp-status') : null,
      tooltipEl: null
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
      tooltipIcon: document.getElementById(`growth-rate-${zone}-tooltip`),
      tooltipEl: null
    };
  });
  lifeUICache.cells.headers = {
    tropical: document.getElementById('life-status-header-tropical'),
    temperate: document.getElementById('life-status-header-temperate'),
    polar: document.getElementById('life-status-header-polar'),
  };
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
  if (!container) {
    lifeUICache.pointShopButtons = [];
    lifeUICache.pointShopContainers = {};
    return;
  }
  lifeUICache.pointShopButtons = Array.from(container.querySelectorAll('.life-point-shop-btn'));
  lifeUICache.pointShopContainers = {};
  lifeUICache.pointShopButtons.forEach(button => {
    const category = button.dataset.category;
    const parent = button.closest('.shop-category-container');
    if (category && parent) {
      lifeUICache.pointShopContainers[category] = parent;
    }
  });
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
    const nameCell = row ? row.querySelector('.life-attribute-name') : null;
    lifeUICache.attributeCells[attributeName] = {
      row,
      currentDiv,
      tentativeDiv,
      tentativeDisplay,
      tentativeCell,
      modifyCell,
      nameCell,
      maxSpan: nameCell ? nameCell.querySelector(`#${attributeName}-max-upgrades`) : null,
      displayNameSpan: nameCell ? nameCell.querySelector(`#${attributeName}-display-name`) : null,
      descriptionSpan: nameCell ? nameCell.querySelector(`#${attributeName}-metabolism-description`) : null,
      attributeDescriptionSpan: nameCell ? nameCell.querySelector(`#${attributeName}-description`) : null,
      equationDiv: nameCell ? nameCell.querySelector(`#${attributeName}-growth-equation`) : null,
      tooltipIcon: nameCell ? nameCell.querySelector(`#${attributeName}-metabolism-tooltip`) : null,
      tooltipEl: nameCell ? nameCell.querySelector(`#${attributeName}-metabolism-tooltip .resource-tooltip.dynamic-tooltip`) : null,
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
  lifeUICache.pointShopContainers = {};
  lifeUICache.pointShopQuantityDisplay = null;
  lifeUICache.pointShopDecreaseButton = null;
  lifeUICache.pointShopIncreaseButton = null;
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
                <th id="modify-header" style="display: none;">Modify <span id="life-modify-tooltip" class="info-tooltip-icon">&#9432;</span></th>
                </tr>
            </thead>
            <tbody id="life-attributes-body">
                ${generateAttributeRows()}
            </tbody>
            </table>
            <div id="life-point-shop" style="flex: 1; border: 1px solid #ccc; border-radius: 5px; padding: 10px;">
               <h4>Controls</h4>
               <div id="life-points-display" style="margin-top: 5px;">
                 <p>Points Available <span id="life-points-available-tooltip" class="info-tooltip-icon">&#9432;</span>: <span id="life-points-available"></span> / <span id="life-points-remaining-display" style="display: none;">Remaining <span id="life-points-remaining-tooltip" class="info-tooltip-icon">&#9432;</span>: <span id="life-points-remaining"></span></span></p>
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
                  <span class="info-tooltip-icon" id="life-biodome-tooltip">&#9432;</span>
                </p>
              </div>
               <hr style="margin: 15px 0;">
               <h3>Point Shop</h3>
               <div id="life-point-quantity-controls" style="display: flex; align-items: center; gap: 8px; margin: 8px 0;">
                <span>Buying <span id="life-point-quantity-display">1</span> at a time</span>
                <button id="life-point-quantity-divide">/10</button><span id="life-point-quantity-divide-tooltip" class="info-tooltip-icon">&#9432;</span>
                <button id="life-point-quantity-multiply">x10</button><span id="life-point-quantity-multiply-tooltip" class="info-tooltip-icon">&#9432;</span>
               </div>
            </div>
        </div>

        <div id="life-terraforming-controls">
            <div id="life-design-controls">
        <div id="life-status-table-container" style="margin-top: 15px;">
            <table id="life-status-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Requirement <small>(Tap ❌ for details)</small></th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Global</th>
                        <th id="life-status-header-tropical" style="border: 1px solid #ccc; padding: 5px; text-align: center;">Tropical</th>
                        <th id="life-status-header-temperate" style="border: 1px solid #ccc; padding: 5px; text-align: center;">Temperate</th>
                        <th id="life-status-header-polar" style="border: 1px solid #ccc; padding: 5px; text-align: center;">Polar <span id="life-status-polar-tooltip" class="info-tooltip-icon">&#9432;</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Day Temp (<span class="temp-unit"></span>)</td>
                        <td id="day-temp-global" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-status"></span></td>
                        <td id="day-temp-tropical" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
                        <td id="day-temp-temperate" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
                        <td id="day-temp-polar" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-value"></span> <span class="temp-status"></span></td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 5px;">Night Temp (<span class="temp-unit"></span>)</td>
                        <td id="night-temp-global" style="border: 1px solid #ccc; padding: 5px; text-align: center;"><span class="temp-status"></span></td>
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
      const metabolismStrings = buildMetabolismEfficiencyUIStrings();
      const bioworkersPerBiomassPerPoint = getActiveLifeDesignRequirements().bioworkersPerBiomassPerPoint ?? 0.00001;

      for (const attributeName of attributeOrder) {
        if (!lifeDesigner.currentDesign[attributeName]) continue;

        const attribute = lifeDesigner.currentDesign[attributeName];
        const convertedValue = getConvertedDisplay(attributeName, attribute);
        const isBioworkforceRow = attributeName === 'bioworkforce';
        const bioworkforceRowHidden = isBioworkforceRow && !isBioworkforceUnlocked();
      const isMetabolismEfficiency = attributeName === 'photosynthesisEfficiency';
      const isOptimalGrowthTemperature = attributeName === 'optimalGrowthTemperature';
      const displayName = isMetabolismEfficiency ? metabolismStrings.displayName : attribute.displayName;
        const description = isMetabolismEfficiency
          ? metabolismStrings.description
          : isOptimalGrowthTemperature
            ? `<span id="${attributeName}-description">${getOptimalGrowthTemperatureDescription()}</span>`
            : attribute.description;
        rows += `
          <tr id="life-attribute-row-${attributeName}"${isBioworkforceRow ? ' data-bioworkforce-ui="true"' : ''}${bioworkforceRowHidden ? ' style="display:none;"' : ''}>
            <td class="life-attribute-name">
              ${isMetabolismEfficiency ? `<span id="${attributeName}-display-name">${displayName}</span>` : displayName} (Max <span id="${attributeName}-max-upgrades">${attribute.maxUpgrades}</span>)
              <div class="life-attribute-description">${isMetabolismEfficiency ? `<span id="${attributeName}-metabolism-description">${description}</span> <span id="${attributeName}-metabolism-tooltip" class="info-tooltip-icon">&#9432;</span><div id="${attributeName}-growth-equation" class="life-metabolism-equation">${metabolismStrings.equation}</div>` : `${description}${attributeName === 'geologicalBurial' ? ' <span class="info-tooltip-icon life-attribute-tooltip" data-tooltip="Accelerates the conversion of existing biomass into inert geological formations. This removes biomass from the active cycle, representing long-term carbon storage and potentially freeing up space if biomass density limits growth. Burial slows dramatically when carbon dioxide is depleted as life begins recycling its own biomass more efficiently.  Use this alongside carbon importation to continue producing O2 from CO2 even after life growth becomes capped.">&#9432;</span>' : ''}${attributeName === 'spaceEfficiency' ? ' <span class="info-tooltip-icon life-attribute-tooltip" data-tooltip="Increases the maximum amount of biomass (in tons) that can exist per square meter. Higher values allow for denser growth before logistic limits slow it down.">&#9432;</span>' : ''}${attributeName === 'growthTemperatureTolerance' ? ' <span class="info-tooltip-icon life-attribute-tooltip" data-tooltip="Growth rate is multiplied by a Gaussian curve centered on the optimal temperature. Each point increases the standard deviation by 0.5°C, allowing better growth when daytime temperatures deviate from the optimum.">&#9432;</span>' : ''}${attributeName === 'bioworkforce' ? ` <span class="info-tooltip-icon life-attribute-tooltip" data-tooltip="Each point assigns ${bioworkersPerBiomassPerPoint} of global biomass as temporary workers. Worker capacity updates automatically as biomass changes.">&#9432;</span>` : ''}`}</div>
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

          const spendablePoints = getSpendableLifeDesignPoints();
          const remainingPoints =
            spendablePoints -
            lifeDesigner.tentativeDesign.getDesignCost() +
            Math.abs(lifeDesigner.tentativeDesign[attributeName].value);

          let costExcludingCurrent, available;
          if (attributeName === 'optimalGrowthTemperature') {
              costExcludingCurrent =
                lifeDesigner.tentativeDesign.getDesignCost() -
                Math.abs(lifeDesigner.tentativeDesign[attributeName].value);
              available =
                spendablePoints - costExcludingCurrent;
          }

          let newValue;
          if (event.shiftKey) {
              if (changeAmount > 0) {
                  if (attributeName === 'optimalGrowthTemperature') {
                      newValue = Math.min(maxUpgrades, available);
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
              newValue = Math.max(-maxUpgrades, Math.min(maxUpgrades, newValue));
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
      lifeUICache.pointShopQuantityDisplay = document.getElementById('life-point-quantity-display');
      lifeUICache.pointShopDecreaseButton = document.getElementById('life-point-quantity-divide');
      lifeUICache.pointShopIncreaseButton = document.getElementById('life-point-quantity-multiply');

      const decreaseButton = lifeUICache.pointShopDecreaseButton;
      if (decreaseButton) {
        decreaseButton.addEventListener('click', () => {
          if (lifePointPurchaseQuantity > 1) {
            lifePointPurchaseQuantity = Math.max(1, Math.floor(lifePointPurchaseQuantity / 10));
            updateLifeUI();
          }
        });
      }

      const increaseButton = lifeUICache.pointShopIncreaseButton;
      if (increaseButton) {
        increaseButton.addEventListener('click', () => {
          if (lifePointPurchaseQuantity < 100) {
            lifePointPurchaseQuantity = Math.min(100, lifePointPurchaseQuantity * 10);
            updateLifeUI();
          }
        });
      }

      lifeShopCategories.forEach((category, index) => {
        const categoryContainer = document.createElement('div');
        categoryContainer.classList.add('shop-category-container');
        categoryContainer.dataset.category = category.name;
        if (category.requiresFlag) {
          categoryContainer.dataset.requiresFlag = category.requiresFlag;
        }
        if (!isLifeShopCategoryUnlocked(category) && category.requiresFlag) {
          categoryContainer.style.display = 'none';
        }

        // Add button
        const button = document.createElement('button');
        const quantity = lifePointPurchaseQuantity;
        const label = category.label || category.name;
        button.textContent = `Buy ${quantity} with ${label}`;
        button.dataset.category = category.name;
        button.classList.add('life-point-shop-btn');
        categoryContainer.appendChild(button);
      
        // Add description
        const description = document.createElement('p');
        description.classList.add('shop-category-description');
        description.textContent = category.description;
        if (category.tooltip) {
          description.appendChild(document.createTextNode(' '));
          const infoIcon = document.createElement('span');
          infoIcon.classList.add('info-tooltip-icon');
          infoIcon.innerHTML = '&#9432;';
          description.appendChild(infoIcon);
          attachDynamicInfoTooltip(infoIcon, category.tooltip);
        }
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
              const categoryConfig = lifeShopCategoryLookup[category];
              if (!isLifeShopCategoryUnlocked(categoryConfig)) {
                  return;
              }
              const quantity = lifePointPurchaseQuantity;
              if (lifeDesigner.canAfford(category, quantity)) {
                  lifeDesigner.buyPoint(category, quantity);
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
  const staticTooltips = [
    { id: 'life-points-available-tooltip', text: 'Total points purchased.' },
    { id: 'life-points-remaining-tooltip', text: 'Points left to allocate in a tentative design.' },
    { id: 'life-biodome-tooltip', text: 'Each active Biodome generates life design points at log10(10 x Active Biodomes) per hour. Points accumulate fractionally. Only whole points increase your maximum design points, which equals purchased points plus these whole biodome points.' },
    { id: 'life-point-quantity-divide-tooltip', text: 'Buy fewer points each purchase.' },
    { id: 'life-point-quantity-multiply-tooltip', text: 'Buy more points each purchase.' },
    { id: 'life-status-polar-tooltip', text: 'Not required to complete terraforming. Can be ignored. Or not. Tip: keeping a zone colder than others can be good to force more water condensation, a very potent greenhouse gas.' },
    { id: 'life-modify-tooltip', text: 'Hold Shift on -/+ to apply the maximum change for that direction.' }
  ];
  staticTooltips.forEach(config => {
    attachDynamicInfoTooltip(document.getElementById(config.id), config.text);
  });
  attachDynamicInfoTooltipsFromData(lifeTerraformingDiv);
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

   setTerraformingLifeVisibility(lifeDesigner.enabled);
    const bioworkforceUnlocked = isBioworkforceUnlocked();
    toggleBioworkforceElements(bioworkforceUnlocked);

    updateMetabolismEfficiencyRow();
    updateOptimalGrowthTemperatureDescription();
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
    const quantityDisplay = lifeUICache.pointShopQuantityDisplay;
    if (quantityDisplay) {
      quantityDisplay.textContent = lifePointPurchaseQuantity;
    }

    const decreaseButton = lifeUICache.pointShopDecreaseButton;
    if (decreaseButton) {
      decreaseButton.disabled = lifePointPurchaseQuantity === 1;
    }

    const increaseButton = lifeUICache.pointShopIncreaseButton;
    if (increaseButton) {
      increaseButton.disabled = lifePointPurchaseQuantity === 100;
    }

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
            applyBtn.classList.remove('life-apply-blocked');
        } else {
            showTentativeDesignCells();
            applyProgressBar.style.width = '0%';
            const survivable = lifeDesigner.tentativeDesign && lifeDesigner.tentativeDesign.canSurviveAnywhere();
            const survivalReason = survivable ? '' : lifeDesigner.tentativeDesign.getPrimarySurvivalFailureReason();
            if (survivable) {
              applyBtn.textContent = `Deploy: Duration ${(lifeDesigner.getTentativeDuration() / 1000).toFixed(2)} seconds`;
              applyBtn.classList.remove('life-apply-blocked');
            } else {
              const reasonText = survivalReason || 'Life cannot survive anywhere';
              applyBtn.textContent = '';
              const titleLine = document.createElement('span');
              titleLine.className = 'life-apply-title';
              titleLine.textContent = 'Cannot deploy';
              const reasonLine = document.createElement('span');
              reasonLine.className = 'life-apply-reason';
              reasonLine.textContent = reasonText;
              applyBtn.append(titleLine, reasonLine);
              applyBtn.classList.add('life-apply-blocked');
            }
            applyBtn.disabled = !survivable; // Disable if design cannot survive
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
      applyBtn.classList.remove('life-apply-blocked');
      revertBtn.style.display = 'none';
      hideTentativeDesignCells();
    }

    // Update point shop button colors and costs (cached)
    const pointShopButtons = lifeUICache.pointShopButtons;
    const quantity = lifePointPurchaseQuantity;
    pointShopButtons.forEach(button => {
      const category = button.dataset.category;
      const categoryConfig = lifeShopCategoryLookup[category];
      const unlocked = isLifeShopCategoryUnlocked(categoryConfig);
      const container = lifeUICache.pointShopContainers[category];
      if (container) {
        container.style.display = unlocked ? '' : 'none';
      }
      if (!unlocked) {
        button.disabled = true;
        button.style.backgroundColor = '';
        return;
      }
      const totalCost = lifeDesigner.getTotalPointCost(category, quantity);
      const label = (categoryConfig && categoryConfig.label) || category;
      button.textContent = `Buy ${quantity} with ${formatNumber(totalCost, true)} ${label}`;
      const affordable = lifeDesigner.canAfford(category, quantity);
      button.disabled = !affordable;
      button.style.backgroundColor = affordable ? '' : 'red';
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

	    function updateMetabolismEfficiencyRow() {
	      const strings = buildMetabolismEfficiencyUIStrings();
	      const cells = lifeUICache.attributeCells.photosynthesisEfficiency || {};
	      if (cells.displayNameSpan) cells.displayNameSpan.textContent = strings.displayName;
	      if (cells.descriptionSpan) cells.descriptionSpan.textContent = strings.description;
	      if (cells.equationDiv) cells.equationDiv.textContent = strings.equation;
	      if (cells.tooltipIcon) {
	        cells.tooltipEl = ensureDynamicInfoTooltip(cells.tooltipIcon, cells.tooltipEl, strings.tooltipText);
	      }
	    }

	    function updateOptimalGrowthTemperatureDescription() {
	      const cells = lifeUICache.attributeCells.optimalGrowthTemperature;
	      cells.attributeDescriptionSpan.textContent = getOptimalGrowthTemperatureDescription();
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

        ac.maxSpan.textContent = currentAttribute.maxUpgrades;

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
        const rawMaxPoints = lifeDesigner.maxLifeDesignPoints();
        const maxPoints = Math.floor(rawMaxPoints);
        pointsAvailableSpan.textContent = formatNumber(rawMaxPoints, false, 1);
        
        let pointsRemaining = 0;
        if (lifeDesigner.tentativeDesign) {
          const pointsUsed = lifeDesigner.tentativeDesign.getDesignCost();
          pointsRemaining = maxPoints - pointsUsed;
        } else {
          const pointsUsed = lifeDesigner.currentDesign.getDesignCost();
          pointsRemaining = maxPoints - pointsUsed;
        }
        pointsRemainingSpan.textContent = formatNumber(pointsRemaining);
    }

// Removed old updateTemperatureRangesAndMessages function

// Function to update the new life status table
function updateLifeStatusTable() {
    const designToCheck = lifeDesigner.tentativeDesign || lifeDesigner.currentDesign;
    if (!designToCheck) {
        console.error("No life design available to check status.");
        return;
    }

    const zoneList = getZones();
    const zones = ['global', ...zoneList];

    const toggleZoneColumn = (zone, isVisible) => {
        const header = lifeUICache.cells.headers?.[zone];
        if (header) header.style.display = isVisible ? '' : 'none';
        const dayCell = lifeUICache.cells.dayTemp?.[zone]?.cell;
        const nightCell = lifeUICache.cells.nightTemp?.[zone]?.cell;
        if (dayCell) dayCell.style.display = isVisible ? '' : 'none';
        if (nightCell) nightCell.style.display = isVisible ? '' : 'none';
        const cells = [
            lifeUICache.cells.tempMultiplier?.[zone],
            lifeUICache.cells.moisture?.[zone],
            lifeUICache.cells.radiation?.[zone],
            lifeUICache.cells.maxDensity?.[zone],
            lifeUICache.cells.biomassAmount?.[zone],
            lifeUICache.cells.biomassDensity?.[zone],
            lifeUICache.cells.growthRate?.[zone]?.cell,
        ];
        cells.forEach(cell => {
            if (cell) cell.style.display = isVisible ? '' : 'none';
        });
    };
    ['tropical', 'temperate', 'polar'].forEach(zone => {
        toggleZoneColumn(zone, zoneList.includes(zone));
    });

    const updateStatusCell = (cell, result, isGlobalRadiation = false) => {
        const status = result || { pass: false, warning: false, reason: 'Status unavailable', reduction: 0, missing: true };
        if (status.missing) {
            updateStatusCellIcon(cell, '?', status.reason, '');
            return;
        }

        if (status.warning) {
            const reason = status.reason || '';
            updateStatusCellIcon(cell, '⚠', reason, '');
        } else if (status.pass) {
            updateStatusCellIcon(cell, '✅', '', '');
        } else {
            const reason = status.reason || 'Failed';
            const reductionText = (isGlobalRadiation && status.reduction > 0)
                ? ` (-${status.reduction.toFixed(0)}% Growth)`
                : '';
            updateStatusCellIcon(cell, '❌', reason, reductionText);
        }
    };

    // Get results from check functions
    const growthTempResults = designToCheck.temperatureGrowthCheck();
    const survivalTempResults = designToCheck.temperatureSurvivalCheck();
    const moistureResults = designToCheck.moistureCheckAllZones(); // Use the aggregate function
    const radiationResult = designToCheck.radiationCheck(); // Global check
    // Calculate max density based on space efficiency
    const spaceEfficiencyAttr = designToCheck.spaceEfficiency;
    const requirements = getActiveLifeDesignRequirementsForUI();
    const densityMultiplier = 1 + (spaceEfficiencyAttr?.value || 0);
    const maxDensity = requirements.baseMaxBiomassDensityTPerM2 * densityMultiplier;

    // Get biomass and area info
    const totalBiomass = resources.surface.biomass?.value || 0;
    const totalSurfaceArea = terraforming.celestialParameters.surfaceArea;
    const globalDensity = totalSurfaceArea > 0 ? totalBiomass / totalSurfaceArea : 0;

    const ecoFraction = getEcumenopolisLandFraction(terraforming);
    const landMult = Math.max(0, 1 - ecoFraction);

    // Precompute day and night temperatures
    const zonePerc = {};
    let globalDayTemp = 0;
    let globalNightTemp = 0;
    zoneList.forEach(zone => {
        const pct = getZonePercentage(zone);
        zonePerc[zone] = pct;
        globalDayTemp += (terraforming.temperature.zones[zone]?.day || 0) * pct;
        globalNightTemp += (terraforming.temperature.zones[zone]?.night || 0) * pct;
    });
    const dayTemps = { global: globalDayTemp };
    const nightTemps = { global: globalNightTemp };
    zoneList.forEach(zone => {
        dayTemps[zone] = terraforming.temperature.zones[zone]?.day || 0;
        nightTemps[zone] = terraforming.temperature.zones[zone]?.night || 0;
    });
    const unit = getTemperatureUnit();
    lifeUICache.tempUnits.forEach(el => el.textContent = unit);

    const survivalRange = designToCheck.getTemperatureRanges().survival;
    const optimal = requirements.optimalGrowthTemperatureBaseK + designToCheck.optimalGrowthTemperature.value;
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
                symbol = '❌';
            } else if (daySurvivalStatus.warning || dayMult === 0) {
                symbol = '⚠';
                if (daySurvivalStatus.warning && dayMult === 0 && title) {
                    title += '; cannot grow';
                } else if (daySurvivalStatus.warning) {
                    title = daySurvivalStatus.reason || '';
                } else {
                    title = 'Survives but cannot grow';
                }
            } else {
                symbol = '✅';
                title = '';
            }

            if (dayCell?.value) {
                dayCell.value.textContent = formatNumber(toDisplayTemperature(dayTemp), false, 2);
            }
            if (dayCell) updateStatusSpan(dayCell, symbol, title);

            if (nightCell?.value) {
                nightCell.value.textContent = formatNumber(toDisplayTemperature(nightTemp), false, 2);
            }
            if (nightCell) {
                const nightSurvivalStatus = designToCheck.nighttimeTemperatureSurvivalCheckZone(zone);
                let nightSymbol;
                let nightTitle = nightSurvivalStatus.reason || '';
                if (!nightSurvivalStatus.pass) {
                    nightSymbol = '❌';
                } else if (nightSurvivalStatus.warning) {
                    nightSymbol = '⚠';
                } else {
                    nightSymbol = '✅';
                    nightTitle = '';
                }
                updateStatusSpan(nightCell, nightSymbol, nightTitle);
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
        const tooltipIcon = growthObj?.tooltipIcon;
        const zoneBiomass = zone === 'global' ? totalBiomass : terraforming.zonalSurface[zone]?.biomass || 0;
        const baseZoneArea = zone === 'global' ? totalSurfaceArea : totalSurfaceArea * getZonePercentage(zone);
        const zoneArea = baseZoneArea * landMult;
        const maxBiomassForZone = zoneArea * maxDensity;
        const capacityMult = maxBiomassForZone > 0 ? Math.max(0, 1 - zoneBiomass / maxBiomassForZone) : 0;

        if (zone !== 'global' && growthCell) {
            const baseRate = designToCheck.photosynthesisEfficiency.value * requirements.photosynthesisRatePerPoint;
            const metabolismProcess = getActiveLifeMetabolismProcessForUI();
            const usesLuminosity = metabolismProcess?.growth?.usesLuminosity === true;
            const lumMult = usesLuminosity
                ? (zone === 'global'
                    ? (terraforming.calculateSolarPanelMultiplier ? terraforming.calculateSolarPanelMultiplier() : 1)
                    : (terraforming.calculateZonalSolarPanelMultiplier ? terraforming.calculateZonalSolarPanelMultiplier(zone) : 1))
                : 1;
            const tempMult = growthTempResults[zone]?.multiplier || 0;
            const radMitigation = designToCheck.getRadiationMitigationRatio();
            let radPenalty = terraforming.getMagnetosphereStatus() ? 0 : (terraforming.radiationPenalty || 0) * (1 - radMitigation);
            if (radPenalty < 0.0001) radPenalty = 0;
            const radMult = 1 - radPenalty;
            const waterMult = (terraforming.zonalSurface[zone]?.liquidWater || 0) > 1e-9 ? 1 : 0;
            const growthBreakdown = getLifeManagerSafe()?.getLifeGrowthMultiplierBreakdown?.() ?? {
                effectMultiplier: 1,
                nitrogenMultiplier: 1,
                nitrogenPressureKPa: 0,
                totalMultiplier: 1,
            };
            const otherMult = growthBreakdown.totalMultiplier;
            const finalRate = baseRate * lumMult * tempMult * capacityMult * radMult * waterMult * otherMult;
            if (valueSpan) valueSpan.textContent = formatNumber(finalRate * 100, false, 2);
            if (tooltipIcon) {
                const lines = [
                    `Base: ${(baseRate * 100).toFixed(2)}%`,
                    `Temp: x${formatNumber(tempMult, false, 2)}`,
                    `Capacity: x${formatNumber(capacityMult, false, 2)}`,
                    `Radiation: x${formatNumber(radMult, false, 2)}`,
                    `Liquid Water: x${formatNumber(waterMult, false, 2)}`,
                ];
                if (usesLuminosity) {
                    lines.splice(2, 0, `Luminosity: x${formatNumber(lumMult, false, 2)}`);
                }
                if (growthBreakdown.effectMultiplier !== 1) {
                    lines.push(`Life Effects: x${formatNumber(growthBreakdown.effectMultiplier, false, 2)}`);
                }
                if (isLifeFlagActive('engineeredNitrogenFixation')) {
                    lines.push(
                        `Engineered Nitrogen Fixation: x${formatNumber(growthBreakdown.nitrogenMultiplier, false, 2)} (${formatNumber(growthBreakdown.nitrogenPressureKPa, false, 2)} kPa)`
                    );
                }
                if (ecoFraction > 0) {
                    const landReduction = (1 - landMult) * 100;
                    lines.push(`Ecumenopolis: x${formatNumber(landMult, false, 2)} (-${landReduction.toFixed(2)}%)`);
                }
                growthObj.tooltipEl = ensureDynamicInfoTooltip(tooltipIcon, growthObj.tooltipEl, lines.join('\n'));
            }
        }
    });

    const dayGlobalCell = lifeUICache.cells.dayTemp.global;
    if (dayGlobalCell) {
        let pass = false;
        let anySafe = false;
        let anyWarning = false;
        let failReason = null;
        const zones = getZones();
        zones.forEach(z => {
            const status = designToCheck.daytimeTemperatureSurvivalCheckZone(z);
            if (status.pass) {
                pass = true;
                if (status.warning) anyWarning = true; else anySafe = true;
            } else if (!failReason) failReason = status.reason;
        });
        if (!pass) {
            updateStatusSpan(dayGlobalCell, '❌', failReason || 'Fails in all zones');
        } else if (!anySafe && anyWarning) {
            updateStatusSpan(dayGlobalCell, '⚠', 'Growth reduced in all zones');
        } else {
            updateStatusSpan(dayGlobalCell, '✅', '');
        }
    }
    const nightGlobalCell = lifeUICache.cells.nightTemp.global;
    if (nightGlobalCell) {
        let pass = false;
        let anySafe = false;
        let anyWarning = false;
        let failReason = null;
        const zones = getZones();
        zones.forEach(z => {
            const status = designToCheck.nighttimeTemperatureSurvivalCheckZone(z);
            if (status.pass) {
                pass = true;
                if (status.warning) anyWarning = true; else anySafe = true;
            } else if (!failReason) failReason = status.reason;
        });
        if (!pass) {
            updateStatusSpan(nightGlobalCell, '❌', failReason || 'Fails in all zones');
        } else if (!anySafe && anyWarning) {
            updateStatusSpan(nightGlobalCell, '⚠', 'Growth reduced in all zones');
        } else {
            updateStatusSpan(nightGlobalCell, '✅', '');
        }
    }
}

// Removed old updateZonalBiomassDensities function

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getConvertedDisplay };
}
