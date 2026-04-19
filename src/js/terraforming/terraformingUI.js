// Function to create the terraforming UI elements

if (typeof SubtabManager === 'undefined') {
  if (typeof require === 'function') {
    try {
      SubtabManager = require('../subtab-manager.js');
    } catch (e) {
      // Fallback to browser global below
    }
  }
  if (typeof SubtabManager === 'undefined' && typeof window !== 'undefined') {
    SubtabManager = window.SubtabManager;
  }
}

let terraformingSubtabManager = null;

function getTerraformingText(path, fallback, vars) {
  return t(path, vars, fallback);
}

function getTerraformingSummaryText(path, fallback, vars) {
  return getTerraformingText(`ui.terraforming.summaryUi.${path}`, fallback, vars);
}

function getTerraformingZoneLabel(zone) {
  return getTerraformingSummaryText(`zones.${zone}`, formatTerraformingSummaryLabel(zone, zone));
}

function getTerraformingWorldTypeLabel(type) {
  return getTerraformingSummaryText(`worldTypes.${type}`, formatTerraformingSummaryLabel(type, type));
}

function getTerraformingRequirementLabel(requirementId) {
  return getTerraformingText(
    `catalogs.terraformingRequirements.${requirementId}.displayName`,
    formatTerraformingSummaryLabel(requirementId, requirementId)
  );
}

function formatTerraformingTargetText(value) {
  return getTerraformingSummaryText('targetPrefix', 'Target : {value}', { value });
}

function getTerraformingStatusIcon(passed) {
  return passed ? '✓' : '✗';
}

function getTerraformingSummaryResourceLabel(key, fallback) {
  return getTerraformingSummaryText(`resources.${key}`, fallback || formatTerraformingSummaryLabel(key, key));
}

const LIQUID_COVERAGE_LABEL_TYPES = {
  liquidWater: true,
  liquidCO2: true,
  liquidHydrogen: true,
  liquidMethane: true,
  liquidAmmonia: true,
  liquidOxygen: true,
  liquidNitrogen: true,
};

function getCoreHeatTooltipText() {
  const unit = getTemperatureUnit();
  const digits = unit === '°C' ? 0 : 2;
  const crustStart = formatNumber(toDisplayTemperature(1273.15), false, digits);
  const crustComplete = formatNumber(toDisplayTemperature(973.15), false, digits);
  return getTerraformingSummaryText(
    'temperature.coreHeatTooltip',
    'Planetary interior heat added directly to the surface as a flat global flux.\n\nArtificial Crust and Mega Heat Sinks can reduce this value.\n\nIf temperature falls below {crustStart}{unit}, a natural crust will start forming and will complete at {crustComplete}{unit}.\n\nThis flux is not impacted by albedo or day-night averaging.',
    {
      crustStart,
      crustComplete,
      unit,
    }
  );
}

function getTerraformingSubtabManager() {
  return terraformingSubtabManager;
}

function getTerraformingManagerSafe() {
  try {
    const manager = window.terraformingManager;
    if (manager && manager.requirements) {
      return manager;
    }
  } catch (error) {}
  try {
    if (terraforming && terraforming.requirements) {
      return terraforming;
    }
  } catch (error) {}
  return null;
}

function getSpaceManagerSafe() {
  try {
    return spaceManager || null;
  } catch (error) {}
  return null;
}

function formatTerraformingSummaryLabel(value, fallback = '') {
  const raw = String(value || fallback || '').trim();
  if (!raw) {
    return '';
  }
  const normalized = raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
  if (/[A-Z]/.test(normalized)) {
    return normalized;
  }
  const capitalizeWord = (word) => word ? (word.charAt(0).toUpperCase() + word.slice(1)) : word;
  return normalized
    .split(' ')
    .map((part) => part.split('-').map(capitalizeWord).join('-'))
    .join(' ');
}

function getActiveTerraformingRequirements() {
  const manager = getTerraformingManagerSafe();
  if (manager && manager.requirements) {
    return manager.requirements;
  }
  if (typeof getTerraformingRequirement === 'function') {
    const fallbackId = typeof DEFAULT_TERRAFORMING_REQUIREMENT_ID !== 'undefined'
      ? DEFAULT_TERRAFORMING_REQUIREMENT_ID
      : 'human';
    return getTerraformingRequirement(fallbackId);
  }
  return null;
}

function getTerraformingSummaryWorldType() {
  const manager = getSpaceManagerSafe();
  if (manager && manager.currentArtificialKey !== null) {
    return currentPlanetParameters?.classification?.type || 'shell';
  }
  if (manager && manager.currentRandomSeed !== null) {
    const typeKey = currentPlanetParameters?.classification?.archetype
      || currentPlanetParameters?.classification?.type
      || 'random';
    let displayName = '';
    try {
      displayName = RWG_WORLD_TYPES?.[typeKey]?.displayName || '';
    } catch (error) {}
    return displayName || typeKey;
  }
  return 'story';
}

function getTerraformingSummaryRequirementName() {
  const activeRequirements = getActiveTerraformingRequirements();
  return terraforming.requirementId || activeRequirements?.id || DEFAULT_TERRAFORMING_REQUIREMENT_ID || 'human';
}

function updateTerraformingSummaryWorldIdentity() {
  const summaryCache = terraformingUICache.summary;
  const manager = getSpaceManagerSafe();
  const worldName = (manager && manager.getCurrentWorldName && manager.getCurrentWorldName())
    || currentPlanetParameters?.name
    || '';
  if (summaryCache.worldNameText && summaryCache.worldNameText.textContent !== worldName) {
    summaryCache.worldNameText.textContent = worldName;
  }

  const worldType = getTerraformingWorldTypeLabel(getTerraformingSummaryWorldType());
  const requirementName = getTerraformingRequirementLabel(getTerraformingSummaryRequirementName());
  const worldMeta = getTerraformingSummaryText(
    'worldMeta',
    '{worldType}, {requirementName}',
    { worldType, requirementName }
  );
  if (summaryCache.worldMetaText && summaryCache.worldMetaText.textContent !== worldMeta) {
    summaryCache.worldMetaText.textContent = worldMeta;
  }
}

function getGasRangeString(gasName) {
  const gasTargets = terraforming.gasTargets;
  const gas = gasTargets[gasName];
  if (!gas) {
    return '';
  }
  return `${formatNumber(gas.min, true)} < P < ${formatNumber(gas.max, true)}`;
}

function formatGasTargetRange(target) {
  if (!target) {
    return '';
  }
  return `${formatNumber(target.min, true)} < P < ${formatNumber(target.max, true)}`;
}

let terraformingTabsInitialized = false;
let terraformingSummaryInitialized = false;
let terraformingWorldInitialized = false;

const terraformingTabElements = {
  subtabs: [],
  contents: [],
  buttonMap: {},
  contentMap: {},
  summaryButton: null,
  summaryContent: null,
  worldButton: null,
  worldContent: null,
  lifeButton: null,
  lifeContent: null,
  hazardsButton: null,
  hazardsContent: null,
  milestonesButton: null,
  milestonesContent: null,
};

const TERRAFORMING_SUBTAB_IDS = [
  'summary-terraforming',
  'world-terraforming',
  'life-terraforming',
  'hazard-terraforming',
  'milestone-terraforming',
];

function cacheTerraformingTabElements() {
  if (terraformingTabElements.subtabs.length > 0) {
    return terraformingTabElements;
  }

  const subtabs = Array.from(document.getElementsByClassName('terraforming-subtab'));
  const contents = Array.from(document.getElementsByClassName('terraforming-subtab-content'));

  terraformingTabElements.subtabs = subtabs;
  terraformingTabElements.contents = contents;
  terraformingTabElements.buttonMap = {};
  terraformingTabElements.contentMap = {};

  subtabs.forEach((subtab) => {
    const id = subtab?.dataset?.subtab;
    if (id) {
      terraformingTabElements.buttonMap[id] = subtab;
    }
  });

  contents.forEach((content) => {
    const id = content?.id;
    if (id) {
      terraformingTabElements.contentMap[id] = content;
    }
  });

  terraformingTabElements.summaryButton = terraformingTabElements.buttonMap['summary-terraforming'] || null;
  terraformingTabElements.summaryContent = terraformingTabElements.contentMap['summary-terraforming'] || null;
  terraformingTabElements.worldButton = terraformingTabElements.buttonMap['world-terraforming'] || null;
  terraformingTabElements.worldContent = terraformingTabElements.contentMap['world-terraforming'] || null;
  terraformingTabElements.lifeButton = terraformingTabElements.buttonMap['life-terraforming'] || null;
  terraformingTabElements.lifeContent = terraformingTabElements.contentMap['life-terraforming'] || null;
  terraformingTabElements.hazardsButton = terraformingTabElements.buttonMap['hazard-terraforming'] || null;
  terraformingTabElements.hazardsContent = terraformingTabElements.contentMap['hazard-terraforming'] || null;
  terraformingTabElements.milestonesButton = terraformingTabElements.buttonMap['milestone-terraforming'] || null;
  terraformingTabElements.milestonesContent = terraformingTabElements.contentMap['milestone-terraforming'] || null;

  return terraformingTabElements;
}

const terraformingUICache = {
  temperature: {},
  atmosphere: {},
  water: {},
  life: {},
  magnetosphere: {},
  luminosity: {},
  summary: {}
};

const TEMPERATURE_INFOGRAPHIC_PATH = 'assets/images/infographic.jpg';

let temperatureInfographicOverlay = null;
let temperatureInfographicCloseButton = null;

function ensureTemperatureInfographicOverlay() {
  if (temperatureInfographicOverlay) {
    return {
      overlay: temperatureInfographicOverlay,
      closeButton: temperatureInfographicCloseButton
    };
  }

  const overlay = document.createElement('div');
  overlay.classList.add('terraforming-infographic-overlay');

  const windowElement = document.createElement('div');
  windowElement.classList.add('terraforming-infographic-window');

  const image = document.createElement('img');
  image.classList.add('terraforming-infographic-image');
  image.src = TEMPERATURE_INFOGRAPHIC_PATH;
  image.alt = getTerraformingSummaryText(
    'temperature.infographicAlt',
    'Terraforming temperature infographic'
  );

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.classList.add('terraforming-infographic-close');
  closeButton.textContent = getTerraformingSummaryText('close', 'Close');

  windowElement.appendChild(image);
  windowElement.appendChild(closeButton);
  overlay.appendChild(windowElement);
  document.body.appendChild(overlay);

  temperatureInfographicOverlay = overlay;
  temperatureInfographicCloseButton = closeButton;

  closeButton.addEventListener('click', hideTemperatureInfographicOverlay);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      hideTemperatureInfographicOverlay();
    }
  });

  return { overlay, closeButton };
}

function showTemperatureInfographicOverlay() {
  const elements = ensureTemperatureInfographicOverlay();
  elements.overlay.classList.add('is-visible');
}

function hideTemperatureInfographicOverlay() {
  const elements = ensureTemperatureInfographicOverlay();
  elements.overlay.classList.remove('is-visible');
}

const CLOUD_AND_HAZE_TOOLTIP_TEXT = [
  getTerraformingSummaryText(
    'luminosity.cloudHazeTooltip',
    'Layered cloud, haze, and calcite brightness applied to the remaining surface headroom. This value also penalizes solar panel and life growth and is capped by the total albedo.'
  )
].join('\n');

const EQUATORIAL_GRAVITY_TOOLTIP_TEXT = getTerraformingSummaryText(
  'magnetosphere.equatorialGravityTooltip',
  'Planetary rotation slightly reduces apparent gravity at the equator.\nThis value subtracts the centrifugal term (ω²R) so you see the effective pull felt on the surface.'
);

const GRAVITY_PENALTY_TOOLTIP_TEXT = getTerraformingSummaryText(
  'magnetosphere.gravityPenaltyTooltip',
  'Gravity penalties blend equatorial and surface gravity based on developed land.\nThe first 25% of used land applies the equatorial gravity penalty, with any additional land using the full surface gravity.\nFor example, using 30% of land applies (25/30)×equatorial penalty plus (5/30)×surface gravity penalty.'
);

function getTemperatureMaintenanceImmuneTooltip() {
  const buildingMap = globalThis?.buildings ?? {};
  const immuneNames = [];
  const floorContext = globalThis?.terraforming?.calculateOneAtmMaintenanceFloor?.() ?? null;
  const unit = getTemperatureUnit();
  const noPenaltyThreshold = formatNumber(toDisplayTemperature(373.15), false, 2);
  const exponentialThreshold = formatNumber(toDisplayTemperature(973.15), false, 2);
  const doublingUnit = unit === '°C' ? '°C' : 'K';
  const description = [
    getTerraformingSummaryText(
      'temperature.maintenanceTooltip.noPenalty',
      'Temperature maintenance penalty: no penalty at or below {threshold}{unit}, +1% maintenance per degree above that, then exponential growth beginning at {exponentialThreshold}{unit}.',
      { threshold: noPenaltyThreshold, unit, exponentialThreshold }
    ),
    getTerraformingSummaryText(
      'temperature.maintenanceTooltip.aboveThreshold',
      'Above {exponentialThreshold}{unit}, the multiplier doubles every 100 {doublingUnit}, capped at 1B.',
      { exponentialThreshold, unit, doublingUnit }
    ),
    getTerraformingSummaryText(
      'temperature.maintenanceTooltip.mitigationFloor',
      'This penalty can be mitigated by aerostats, but has a floor determined by a dry-adiabatic 1 atm temperature model.'
    )
  ];

  for (const key in buildingMap) {
    const building = buildingMap[key];
    if (building?.temperatureMaintenanceImmune) {
      const displayName = building.displayName || building.name || key;
      if (displayName && !immuneNames.includes(displayName)) {
        immuneNames.push(displayName);
      }
    }
  }

  if (floorContext?.penalty > 1 && Number.isFinite(floorContext.temperatureK)) {
    const altitudeText = Number.isFinite(floorContext.altitudeKm)
      ? `${formatNumber(floorContext.altitudeKm, false, 2)} km`
      : getTerraformingSummaryText('notAvailable', 'N/A');
    description.push(
      getTerraformingSummaryText(
        'temperature.maintenanceTooltip.currentEstimate',
        'Current 1 atm estimate: {pressure} kPa surface pressure, {altitude} altitude, {temperature}{unit}, maintenance floor x{penalty}.',
        {
          pressure: formatNumber(floorContext.pressureKPa, false, 2),
          altitude: altitudeText,
          temperature: formatNumber(toDisplayTemperature(floorContext.temperatureK), false, 2),
          unit,
          penalty: floorContext.penalty.toFixed(2),
        }
      )
    );
  }

  if (immuneNames.length === 0) {
    description.push(
      getTerraformingSummaryText(
        'temperature.maintenanceTooltip.noImmuneBuildings',
        'No buildings are immune to this penalty.'
      )
    );
    return description.join(' ');
  }

  immuneNames.sort((a, b) => a.localeCompare(b));
  description.push(
    getTerraformingSummaryText(
      'temperature.maintenanceTooltip.immuneBuildings',
      'Buildings immune to this effect: {names}.',
      { names: immuneNames.join(', ') }
    )
  );
  return description.join(' ');
}

function getTemperatureMaintenanceFloorTooltip(floorContext) {
  const unit = getTemperatureUnit();
  const displayTemperature = Number.isFinite(floorContext?.temperatureK)
    ? formatNumber(toDisplayTemperature(floorContext.temperatureK), false, 2)
    : getTerraformingSummaryText('notAvailable', 'N/A');
  const altitude = Number.isFinite(floorContext?.altitudeKm)
    ? `${formatNumber(floorContext.altitudeKm, false, 2)} km`
    : getTerraformingSummaryText('notAvailable', 'N/A');
  const surfacePressure = Number.isFinite(floorContext?.pressureKPa)
    ? `${formatNumber(floorContext.pressureKPa, false, 2)} kPa`
    : getTerraformingSummaryText('notAvailable', 'N/A');
  const floorPenalty = Number.isFinite(floorContext?.penalty)
    ? `x${floorContext.penalty.toFixed(2)}`
    : getTerraformingSummaryText('notAvailable', 'N/A');

  return [
    getTerraformingSummaryText(
      'temperature.floorTooltip.intro',
      'Dry-adiabatic estimate for the altitude where the atmosphere falls to 1 atm.'
    ),
    getTerraformingSummaryText(
      'temperature.floorTooltip.surfacePressure',
      'Surface pressure: {value}.',
      { value: surfacePressure }
    ),
    getTerraformingSummaryText(
      'temperature.floorTooltip.altitude',
      'Estimated 1 atm altitude: {value}.',
      { value: altitude }
    ),
    getTerraformingSummaryText(
      'temperature.floorTooltip.temperature',
      'Estimated 1 atm temperature: {value}{unit}.',
      { value: displayTemperature, unit }
    ),
    getTerraformingSummaryText(
      'temperature.floorTooltip.minimumMultiplier',
      'This sets the minimum temperature maintenance multiplier for mitigated buildings: {value}.',
      { value: floorPenalty }
    )
  ].join(' ');
}

function resetTerraformingUI() {
  temperatureInfographicOverlay?.classList.remove('is-visible');
  terraformingGraphsManager.hide();
  const summaryContent = terraformingTabElements.summaryContent || document.getElementById('summary-terraforming');
  if (summaryContent) {
    summaryContent.textContent = '';
  }
  terraformingSummaryInitialized = false;
  terraformingTabsInitialized = false;
  terraformingTabElements.subtabs = [];
  terraformingTabElements.contents = [];
  terraformingTabElements.buttonMap = {};
  terraformingTabElements.contentMap = {};
  terraformingTabElements.summaryButton = null;
  terraformingTabElements.summaryContent = null;
  terraformingTabElements.worldButton = null;
  terraformingTabElements.worldContent = null;
  terraformingTabElements.lifeButton = null;
  terraformingTabElements.lifeContent = null;
  terraformingTabElements.hazardsButton = null;
  terraformingTabElements.hazardsContent = null;
  terraformingTabElements.milestonesButton = null;
  terraformingTabElements.milestonesContent = null;
  Object.keys(terraformingUICache).forEach(key => {
    terraformingUICache[key] = {};
  });
  terraformingWorldInitialized = false;
  terraformingSubtabManager = null;
}

function initializeTerraformingTabs() {
  cacheTerraformingTabElements();

  if (!terraformingSubtabManager && typeof SubtabManager === 'undefined' && typeof window !== 'undefined') {
    SubtabManager = window.SubtabManager;
  }
  if (!terraformingSubtabManager && typeof SubtabManager === 'function') {
    terraformingSubtabManager = new SubtabManager('.terraforming-subtab', '.terraforming-subtab-content');
    terraformingSubtabManager.onActivate(id => {
      handleTerraformingSubtabActivated(id, 0);
    });
  }

  if (terraformingTabsInitialized) {
    return;
  }

  // Set up event listeners for terraforming sub-tabs
  if (!terraformingSubtabManager) {
    terraformingTabElements.subtabs.forEach((subtab) => {
      if (!subtab) {
        return;
      }
      subtab.addEventListener('click', () => {
        const subtabContentId = subtab?.dataset?.subtab;
        if (subtabContentId) {
          activateTerraformingSubtab(subtabContentId);
        }
      });
    });
  }

  // Activate the default subtab
  activateTerraformingSubtab('world-terraforming');

  terraformingTabsInitialized = true;

  // Build the World subtab content once (planet visualizer container)
  createTerraformingWorldUI();
}

function activateTerraformingSubtab(subtabId) {
  cacheTerraformingTabElements();

  const tab = terraformingTabElements.buttonMap[subtabId] || null;
  const content = terraformingTabElements.contentMap[subtabId] || null;

  if (!tab || tab.classList.contains('hidden')) {
    if (subtabId !== 'world-terraforming') {
      activateTerraformingSubtab('world-terraforming');
    }
    return;
  }

  if (terraformingSubtabManager && typeof terraformingSubtabManager.activate === 'function') {
    terraformingSubtabManager.activate(subtabId);
    return;
  }

  terraformingTabElements.subtabs.forEach((t) => t?.classList.remove('active'));
  terraformingTabElements.contents.forEach((c) => c?.classList.remove('active'));

  tab.classList.add('active');
  if (content) {
    content.classList.add('active');
  }

  handleTerraformingSubtabActivated(subtabId, 0);
}

function isTerraformingWorldSubtabActive() {
  if (terraformingSubtabManager && typeof terraformingSubtabManager.isActive === 'function') {
    return terraformingSubtabManager.isActive('world-terraforming');
  }
  if (typeof document !== 'undefined') {
    const worldContent = document.getElementById ? document.getElementById('world-terraforming') : null;
    if (worldContent && worldContent.classList && worldContent.classList.contains('active')) {
      return true;
    }
    if (document.querySelector) {
      const worldButton = document.querySelector('.terraforming-subtab[data-subtab="world-terraforming"]');
      if (worldButton && worldButton.classList && worldButton.classList.contains('active')) {
        return true;
      }
    }
    return false;
  }
  return true;
}

function getActiveTerraformingSubtabId() {
  const getActiveId = terraformingSubtabManager && terraformingSubtabManager.getActiveId;
  if (getActiveId) {
    const activeId = getActiveId.call(terraformingSubtabManager);
    if (activeId) {
      return activeId;
    }
  }

  cacheTerraformingTabElements();
  const activeContent = terraformingTabElements.contents.find(
    (content) => content && content.classList && content.classList.contains('active')
  );
  if (activeContent && activeContent.id) {
    return activeContent.id;
  }

  return 'world-terraforming';
}

function updateTerraformingSubtabUI(subtabId, deltaSeconds) {
  switch (subtabId) {
    case 'summary-terraforming':
      updateTerraformingSummaryWorldIdentity();
      updatePlayTimeDisplay();
      updateTemperatureBox();
      updateAtmosphereBox(deltaSeconds);
      updateWaterBox();
      updateLuminosityBox();
      updateLifeBox();
      updateMagnetosphereBox();
      updateCompleteTerraformingButton();
      break;
    case 'life-terraforming':
      updateLifeUI();
      break;
    case 'hazard-terraforming':
      if (hazardManager && hazardManager.updateUI) {
        hazardManager.updateUI();
      }
      break;
    case 'world-terraforming': {
      const viz = typeof window !== 'undefined' ? window.planetVisualizer : null;
      if (terraformingWorldInitialized && isTerraformingWorldSubtabActive() && viz && viz.animate) {
        viz.animate(deltaSeconds);
      }
      break;
    }
    case 'milestone-terraforming':
    default:
      break;
  }
}

function handleTerraformingSubtabActivated(subtabId, deltaSeconds) {
  if (!subtabId) {
    return;
  }
  if (subtabId === 'milestone-terraforming' && typeof markMilestonesViewed === 'function') {
    markMilestonesViewed();
  }
  if (subtabId === 'world-terraforming') {
    forceWorldSurfaceRefresh();
  }
  updateTerraformingSubtabUI(subtabId, deltaSeconds);
}

function handleTerraformingTabActivated() {
  if (!isTerraformingWorldSubtabActive()) {
    return;
  }
  forceWorldSurfaceRefresh();
}

function forceWorldSurfaceRefresh() {
  try {
    const viz = window.planetVisualizer;
    viz.resetSurfaceTextureThrottle();
    viz.updateSurfaceTextureFromPressure(true);
  } catch (e) {}
}

function markTerraformingMilestonesIfActive() {
  cacheTerraformingTabElements();
  const { milestonesButton, milestonesContent } = terraformingTabElements;
  const isActive = milestonesButton?.classList.contains('active')
    || milestonesContent?.classList.contains('active');
  if (isActive) {
    markMilestonesViewed?.();
  }
}

function setTerraformingSummaryVisibility(unlocked) {
  cacheTerraformingTabElements();

  const { summaryButton, summaryContent } = terraformingTabElements;
  if (!summaryButton || !summaryContent) {
    return;
  }

  if (unlocked) {
    summaryButton.classList.remove('hidden');
    summaryContent.classList.remove('hidden');
  } else {
    summaryButton.classList.add('hidden');
    summaryContent.classList.add('hidden');
    if (summaryButton.classList.contains('active') || summaryContent.classList.contains('active')) {
      activateTerraformingSubtab('world-terraforming');
    }
  }
}

function setTerraformingLifeVisibility(unlocked) {
  cacheTerraformingTabElements();

  const { lifeButton, lifeContent } = terraformingTabElements;
  if (!lifeButton || !lifeContent) {
    return;
  }

  if (unlocked) {
    lifeButton.classList.remove('hidden');
    lifeContent.classList.remove('hidden');
  } else {
    lifeButton.classList.add('hidden');
    lifeContent.classList.add('hidden');
    if (lifeButton.classList.contains('active') || lifeContent.classList.contains('active')) {
      activateTerraformingSubtab('world-terraforming');
    }
  }
}

function setTerraformingHazardsVisibility(unlocked) {
  cacheTerraformingTabElements();

  const { hazardsButton, hazardsContent } = terraformingTabElements;
  if (!hazardsButton || !hazardsContent) {
    return;
  }

  if (unlocked) {
    hazardsButton.classList.remove('hidden');
    hazardsContent.classList.remove('hidden');
    if (typeof initializeHazardUI === 'function') {
      initializeHazardUI();
    }
  } else {
    hazardsButton.classList.add('hidden');
    hazardsContent.classList.add('hidden');
    if (hazardsButton.classList.contains('active') || hazardsContent.classList.contains('active')) {
      activateTerraformingSubtab('world-terraforming');
    }
  }
}

function setTerraformingMilestonesVisibility(unlocked) {
  cacheTerraformingTabElements();

  const { milestonesButton, milestonesContent } = terraformingTabElements;
  if (!milestonesButton || !milestonesContent) {
    return;
  }

  if (unlocked) {
    milestonesButton.classList.remove('hidden');
    milestonesContent.classList.remove('hidden');
  } else {
    milestonesButton.classList.add('hidden');
    milestonesContent.classList.add('hidden');
    if (milestonesButton.classList.contains('active') || milestonesContent.classList.contains('active')) {
      activateTerraformingSubtab('world-terraforming');
    }
  }
}

function openTerraformingWorldTab() {
  initializeTerraformingTabs();
  if (typeof tabManager !== 'undefined' && tabManager && typeof tabManager.activateTab === 'function') {
    tabManager.activateTab('terraforming');
  } else if (typeof activateTab === 'function') {
    activateTab('terraforming');
  }
  activateTerraformingSubtab('world-terraforming');
}

// Build the Terraforming -> World subtab content (once)
function createTerraformingWorldUI() {
  cacheTerraformingTabElements();
  if (terraformingWorldInitialized) return;
  const host = terraformingTabElements.worldContent;
  if (!host) return;

  // Clear any placeholder content and create the visualizer shell
  while (host.firstChild) host.removeChild(host.firstChild);

  // Container for WebGL canvas
  const container = document.createElement('div');
  container.className = 'planet-visualizer';
  container.id = 'planet-visualizer';

  // Optional overlay text (kept hidden by CSS but updated by the visualizer)
  const overlay = document.createElement('div');
  overlay.className = 'planet-visualizer-overlay';
  overlay.id = 'planet-visualizer-overlay';

  host.appendChild(container);
  host.appendChild(overlay);

  terraformingUICache.world = { container, overlay };
  terraformingWorldInitialized = true;
}

function createTerraformingSummaryUI() {
  if (terraformingSummaryInitialized) {
    return;
  }

  cacheTerraformingTabElements();
  const terraformingContainer = terraformingTabElements.summaryContent || document.getElementById('summary-terraforming');
  if (!terraformingContainer) {
    return;
  }

  terraformingContainer.textContent = '';
  const summaryCache = terraformingUICache.summary;
  summaryCache.container = terraformingContainer;

  const worldHeader = document.createElement('div');
  worldHeader.classList.add('terraforming-summary-world-header');
  const worldNameText = document.createElement('div');
  worldNameText.classList.add('terraforming-summary-world-name');
  const worldMetaText = document.createElement('div');
  worldMetaText.classList.add('terraforming-summary-world-meta');
  worldHeader.appendChild(worldNameText);
  worldHeader.appendChild(worldMetaText);
  terraformingContainer.appendChild(worldHeader);
  summaryCache.worldHeader = worldHeader;
  summaryCache.worldNameText = worldNameText;
  summaryCache.worldMetaText = worldMetaText;
  updateTerraformingSummaryWorldIdentity();

  const playTimeDisplay = document.createElement('div');
  playTimeDisplay.id = 'play-time-display';
  const playTimeLabel = document.createElement('span');
  playTimeLabel.classList.add('play-time-label');
  playTimeLabel.textContent = t(
    'ui.terraforming.playTimeLabel',
    null,
    'Time since awakening :'
  );
  const playTimeValue = document.createElement('span');
  playTimeValue.classList.add('play-time-value');
  playTimeValue.textContent = t('ui.terraforming.playTimeDefault', null, formatPlayTime(0));
  playTimeDisplay.appendChild(playTimeLabel);
  playTimeDisplay.appendChild(playTimeValue);
  terraformingGraphsManager.attachSummaryButton(playTimeDisplay);
  terraformingContainer.appendChild(playTimeDisplay);
  summaryCache.playTimeDisplay = playTimeDisplay;
  summaryCache.playTimeLabel = playTimeLabel;
  summaryCache.playTimeValue = playTimeValue;

  const grid = document.createElement('div');
  grid.classList.add('terraforming-grid');

  createTemperatureBox(grid);
  createAtmosphereBox(grid);
  createWaterBox(grid);
  createLuminosityBox(grid);
  createLifeBox(grid);
  createMagnetosphereBox(grid);

  terraformingContainer.appendChild(grid);

  // Add the "Complete Terraforming" button below the rows
  createCompleteTerraformingButton(terraformingContainer);

  terraformingSummaryInitialized = true;
}

// Function to update the terraforming UI elements
function updateTerraformingUI(deltaSeconds, options = {}) {
  if (options.forceAllSubtabs) {
    const ids = typeof document === 'undefined'
      ? TERRAFORMING_SUBTAB_IDS
      : (cacheTerraformingTabElements(), Object.keys(terraformingTabElements.contentMap));
    const subtabIds = ids.length ? ids : TERRAFORMING_SUBTAB_IDS;
    subtabIds.forEach(id => updateTerraformingSubtabUI(id, deltaSeconds));
    return;
  }
  updateTerraformingSubtabUI(getActiveTerraformingSubtabId(), deltaSeconds);
}

  function updatePlayTimeDisplay() {
    const summaryCache = terraformingUICache.summary;
    summaryCache.playTimeValue.textContent = formatPlayTime(playTimeSeconds);
  }

// Functions to create and update each terraforming aspect box

function createTemperatureBox(row) {
  const temperatureBox = document.createElement('div');
  temperatureBox.classList.add('terraforming-box');
    temperatureBox.id = 'temperature-box';
    const tempInfo = document.createElement('span');
    tempInfo.classList.add('info-tooltip-icon');
    const tempTooltipText = getTerraformingSummaryText(
      'temperature.tooltip',
      'Temperature is a critical factor for terraforming.'
    );
    const tempInfoTooltip = attachDynamicInfoTooltip(tempInfo, tempTooltipText);
    const tempInfographicButton = document.createElement('button');
    tempInfographicButton.type = 'button';
    tempInfographicButton.classList.add('terraforming-infographic-button');
    tempInfographicButton.title = getTerraformingSummaryText(
      'temperature.openInfographic',
      'Open temperature infographic'
    );
    tempInfographicButton.setAttribute(
      'aria-label',
      getTerraformingSummaryText(
        'temperature.openInfographic',
        'Open temperature infographic'
      )
    );
    const tempInfographicIcon = document.createElement('span');
    tempInfographicIcon.classList.add('terraforming-infographic-icon');
    tempInfographicIcon.innerHTML = '?';
    tempInfographicButton.appendChild(tempInfographicIcon);
    temperatureBox.innerHTML = `
      <h3>${terraforming.temperature.name}</h3>
      <p>${getTerraformingSummaryText('temperature.labels.globalMeanTemp', 'Global Mean Temp')}: <span id="temperature-current"></span><span class="temp-unit"></span></p>
      <p>${getTerraformingSummaryText('temperature.labels.equilibriumTemp', 'Equilibrium Temp')}: <span id="equilibrium-temp"></span> <span class="temp-unit"></span></p>
      <p id="temperature-core-heat-line" style="display: none;">${getTerraformingSummaryText('temperature.labels.netCoreHeatFlux', 'Net Core Heat Flux')}: <span id="temperature-core-heat"></span> W/m^2</p>
      <table>
        <colgroup>
          <col class="gas-col">
          <col class="pressure-col">
          <col class="delta-col">
          <col class="target-col">
          <col class="status-col">
        </colgroup>
        <thead>
          <tr>
            <th>${getTerraformingSummaryText('temperature.labels.zone', 'Zone')}</th>
            <th>${getTerraformingSummaryText('temperature.labels.temperature', 'T ({unit})', { unit: '<span class="temp-unit"></span>' })}</th>
            <th>${getTerraformingSummaryText('temperature.labels.trend', 'T_trend')}</th>
            <th>${getTerraformingSummaryText('temperature.labels.delta', 'Delta')}</th>
            <th>${getTerraformingSummaryText('temperature.labels.day', 'Day')}</th>
            <th>${getTerraformingSummaryText('temperature.labels.night', 'Night')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${getTerraformingZoneLabel('tropical')}</td>
            <td><span id="tropical-temp">${terraforming.temperature.zones.tropical.value.toFixed(2)}</span></td>
            <td><span id="tropical-trend-temp"></span></td>
            <td><span id="tropical-delta"></span></td>
            <td><span id="tropical-day">${terraforming.temperature.zones.tropical.day.toFixed(2)}</span></td>
            <td><span id="tropical-night">${terraforming.temperature.zones.tropical.night.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>${getTerraformingZoneLabel('temperate')}</td>
            <td><span id="temperate-temp">${terraforming.temperature.zones.temperate.value.toFixed(2)}</span></td>
            <td><span id="temperate-trend-temp"></span></td>
            <td><span id="temperate-delta"></span></td>
            <td><span id="temperate-day">${terraforming.temperature.zones.temperate.day.toFixed(2)}</span></td>
            <td><span id="temperate-night">${terraforming.temperature.zones.temperate.night.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>${getTerraformingZoneLabel('polar')}</td>
            <td><span id="polar-temp">${terraforming.temperature.zones.polar.value.toFixed(2)}</span></td>
            <td><span id="polar-trend-temp"></span></td>
            <td><span id="polar-delta"></span></td>
            <td><span id="polar-day">${terraforming.temperature.zones.polar.day.toFixed(2)}</span></td>
            <td><span id="polar-night">${terraforming.temperature.zones.polar.night.toFixed(2)}</span></td>
          </tr>
        </tbody>
      </table>
    `;
    const temperatureHeading = temperatureBox.querySelector('h3');
    if (temperatureHeading) {
      temperatureHeading.appendChild(tempInfo);
      temperatureHeading.appendChild(tempInfographicButton);
    }
    const coreHeatLine = temperatureBox.querySelector('#temperature-core-heat-line');
    const coreHeatInfo = document.createElement('span');
    coreHeatInfo.classList.add('info-tooltip-icon');
    coreHeatInfo.innerHTML = '&#9432;';
    if (coreHeatLine) {
      coreHeatLine.appendChild(document.createTextNode(' '));
      coreHeatLine.appendChild(coreHeatInfo);
      attachDynamicInfoTooltip(
        coreHeatInfo,
        getCoreHeatTooltipText()
      );
    }
    const infographicElements = ensureTemperatureInfographicOverlay();
    tempInfographicButton.addEventListener('click', showTemperatureInfographicOverlay);

    const energyPenaltySpan = document.createElement('p');
    energyPenaltySpan.id = 'temperature-energy-penalty';
    energyPenaltySpan.textContent = getTerraformingSummaryText(
      'temperature.labels.colonyEnergyMultiplier',
      'Colony energy cost multiplier from temperature :'
    );
    temperatureBox.appendChild(energyPenaltySpan);

    const maintenancePenaltySpan = document.createElement('p');
    maintenancePenaltySpan.id = 'temperature-maintenance-penalty';
    maintenancePenaltySpan.style.display = 'none';
    maintenancePenaltySpan.textContent = getTerraformingSummaryText(
      'temperature.labels.maintenanceMultiplier',
      'Maintenance cost multiplier from temperature : '
    );
    const maintenancePenaltyValue = document.createElement('span');
    maintenancePenaltyValue.id = 'temperature-maintenance-penalty-value';
    maintenancePenaltySpan.appendChild(maintenancePenaltyValue);
    maintenancePenaltySpan.appendChild(document.createTextNode(' '));
    const maintenancePenaltyInfo = document.createElement('span');
    maintenancePenaltyInfo.id = 'temperature-maintenance-penalty-info';
    maintenancePenaltyInfo.classList.add('info-tooltip-icon');
    maintenancePenaltyInfo.innerHTML = '&#9432;';
    const maintenancePenaltyTooltip = attachDynamicInfoTooltip(
      maintenancePenaltyInfo,
      getTemperatureMaintenanceImmuneTooltip()
    );
    maintenancePenaltySpan.appendChild(maintenancePenaltyInfo);
    temperatureBox.appendChild(maintenancePenaltySpan);

    const maintenanceFloorSpan = document.createElement('p');
    maintenanceFloorSpan.id = 'temperature-maintenance-floor';
    maintenanceFloorSpan.style.display = 'none';
    maintenanceFloorSpan.textContent = getTerraformingSummaryText(
      'temperature.labels.oneAtmEstimate',
      '1 atm temperature estimate : '
    );
    const maintenanceFloorValue = document.createElement('span');
    maintenanceFloorValue.id = 'temperature-maintenance-floor-value';
    maintenanceFloorSpan.appendChild(maintenanceFloorValue);
    maintenanceFloorSpan.appendChild(document.createTextNode(' '));
    const maintenanceFloorInfo = document.createElement('span');
    maintenanceFloorInfo.id = 'temperature-maintenance-floor-info';
    maintenanceFloorInfo.classList.add('info-tooltip-icon');
    maintenanceFloorInfo.innerHTML = '&#9432;';
    const maintenanceFloorTooltip = attachDynamicInfoTooltip(
      maintenanceFloorInfo,
      getTerraformingSummaryText(
        'temperature.maintenancePending',
        'Dry-adiabatic 1 atm estimate pending.'
      )
    );
    maintenanceFloorSpan.appendChild(maintenanceFloorInfo);
    temperatureBox.appendChild(maintenanceFloorSpan);

    const targetSpan = document.createElement('span');
    targetSpan.id = 'temperature-target';
    targetSpan.textContent = "";
    targetSpan.classList.add('terraforming-target')
    targetSpan.style.marginTop = 'auto';
    temperatureBox.appendChild(targetSpan);

    row.appendChild(temperatureBox);
    terraformingUICache.temperature = {
      info: tempInfo,
      infoTooltip: tempInfoTooltip,
      box: temperatureBox,
      tempUnits: temperatureBox.querySelectorAll('.temp-unit'),
      target: temperatureBox.querySelector('#temperature-target'),
      current: temperatureBox.querySelector('#temperature-current'),
      equilibrium: temperatureBox.querySelector('#equilibrium-temp'),
      coreHeatLine,
      coreHeatTooltip: coreHeatInfo.querySelector('.resource-tooltip'),
      coreHeat: temperatureBox.querySelector('#temperature-core-heat'),
      tropicalTemp: temperatureBox.querySelector('#tropical-temp'),
      tropicalTrendTemp: temperatureBox.querySelector('#tropical-trend-temp'),
      tropicalDelta: temperatureBox.querySelector('#tropical-delta'),
      tropicalDay: temperatureBox.querySelector('#tropical-day'),
      tropicalNight: temperatureBox.querySelector('#tropical-night'),
      temperateTemp: temperatureBox.querySelector('#temperate-temp'),
      temperateTrendTemp: temperatureBox.querySelector('#temperate-trend-temp'),
      temperateDelta: temperatureBox.querySelector('#temperate-delta'),
      temperateDay: temperatureBox.querySelector('#temperate-day'),
      temperateNight: temperatureBox.querySelector('#temperate-night'),
      temperateRow: temperatureBox.querySelector('#temperate-temp')?.closest('tr'),
      polarTemp: temperatureBox.querySelector('#polar-temp'),
      polarTrendTemp: temperatureBox.querySelector('#polar-trend-temp'),
      polarDelta: temperatureBox.querySelector('#polar-delta'),
      polarDay: temperatureBox.querySelector('#polar-day'),
      polarNight: temperatureBox.querySelector('#polar-night'),
      polarRow: temperatureBox.querySelector('#polar-temp')?.closest('tr'),
      energyPenalty: temperatureBox.querySelector('#temperature-energy-penalty'),
      maintenancePenalty: temperatureBox.querySelector('#temperature-maintenance-penalty'),
      maintenancePenaltyValue: temperatureBox.querySelector('#temperature-maintenance-penalty-value'),
      maintenancePenaltyInfo: temperatureBox.querySelector('#temperature-maintenance-penalty-info'),
      maintenancePenaltyTooltip,
      maintenanceFloor: temperatureBox.querySelector('#temperature-maintenance-floor'),
      maintenanceFloorValue: temperatureBox.querySelector('#temperature-maintenance-floor-value'),
      maintenanceFloorInfo: temperatureBox.querySelector('#temperature-maintenance-floor-info'),
      maintenanceFloorTooltip,
      infographicButton: tempInfographicButton,
      infographicOverlay: infographicElements.overlay
    };
  }

  function updateTemperatureBox() {
    const els = terraformingUICache.temperature;
    const temperatureBox = els.box;
    if (!temperatureBox) return;

    const zoneKeys = getZones();
    const showTemperate = zoneKeys.includes('temperate');
    const showPolar = zoneKeys.includes('polar');
    if (els.temperateRow) els.temperateRow.style.display = showTemperate ? '' : 'none';
    if (els.polarRow) els.polarRow.style.display = showPolar ? '' : 'none';

    const unit = getTemperatureUnit();
    els.tempUnits.forEach(el => el.textContent = unit);
    if (els.target) {
      const minTarget = terraforming.temperature.targetMin;
      const maxTarget = terraforming.temperature.targetMax;
      const targetText = getTerraformingSummaryText(
        'temperature.target',
        'Global mean between {min}{unit} and {max}{unit}.',
        {
          min: formatNumber(toDisplayTemperature(minTarget), false, 2),
          max: formatNumber(toDisplayTemperature(maxTarget), false, 2),
          unit,
        }
      );
      els.target.textContent = formatTerraformingTargetText(targetText);
    }

    els.current.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.value), false, 2);
    els.equilibrium.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.equilibriumTemperature), false, 2);
    const baseCoreHeatFlux = Math.max(0, terraforming.celestialParameters.coreHeatFlux || 0);
    const remainingCoreHeatFlux = terraforming.getCoreHeatFlux ? terraforming.getCoreHeatFlux() : baseCoreHeatFlux;
    const netCoreHeatFlux = terraforming.getNetCoreHeatFlux ? terraforming.getNetCoreHeatFlux() : remainingCoreHeatFlux;
    if (els.coreHeatLine) {
      els.coreHeatLine.style.display = baseCoreHeatFlux > 0 ? '' : 'none';
    }
    if (els.coreHeatTooltip) {
      setTooltipText(els.coreHeatTooltip, getCoreHeatTooltipText());
    }
    if (els.coreHeat) {
      els.coreHeat.textContent = formatNumber(netCoreHeatFlux, false, netCoreHeatFlux >= 100 ? 0 : 2);
    }

    els.tropicalTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.tropical.value), false, 2);
    els.tropicalTrendTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.tropical.trendValue), false, 2);
    const tropicalChange = terraforming.temperature.zones.tropical.value - terraforming.temperature.zones.tropical.initial;
    els.tropicalDelta.textContent = `${tropicalChange >= 0 ? '+' : ''}${formatNumber(tropicalChange, false, 2)}`;
    els.tropicalDay.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.tropical.day), false, 2);
    els.tropicalNight.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.tropical.night), false, 2);

    els.temperateTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.temperate.value), false, 2);
    els.temperateTrendTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.temperate.trendValue), false, 2);
    const temperateChange = terraforming.temperature.zones.temperate.value - terraforming.temperature.zones.temperate.initial;
    els.temperateDelta.textContent = `${temperateChange >= 0 ? '+' : ''}${formatNumber(temperateChange, false, 2)}`;
    els.temperateDay.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.temperate.day), false, 2);
    els.temperateNight.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.temperate.night), false, 2);

    els.polarTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.polar.value), false, 2);
    els.polarTrendTemp.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.polar.trendValue), false, 2);
    const polarChange = terraforming.temperature.zones.polar.value - terraforming.temperature.zones.polar.initial;
    els.polarDelta.textContent = `${polarChange >= 0 ? '+' : ''}${formatNumber(polarChange, false, 2)}`;
    els.polarDay.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.polar.day), false, 2);
    els.polarNight.textContent = formatNumber(toDisplayTemperature(terraforming.temperature.zones.polar.night), false, 2);

    temperatureBox.style.borderColor = terraforming.getTemperatureStatus() ? 'green' : 'red';

    if (els.energyPenalty) {
      els.energyPenalty.textContent = `${getTerraformingSummaryText(
        'temperature.labels.colonyEnergyMultiplier',
        'Colony energy cost multiplier from temperature :'
      )} ${terraforming.calculateColonyEnergyPenalty().toFixed(2)}`;
    }
    if (els.maintenancePenalty) {
      const penalty = terraforming.calculateMaintenancePenalty();
      if (penalty > 1) {
        els.maintenancePenalty.style.display = '';
        if (els.maintenancePenaltyValue) {
          els.maintenancePenaltyValue.textContent = penalty.toFixed(2);
        } else {
          els.maintenancePenalty.textContent = `${getTerraformingSummaryText(
            'temperature.labels.maintenanceMultiplier',
            'Maintenance cost multiplier from temperature : '
          )}${penalty.toFixed(2)}`;
        }
        if (els.maintenancePenaltyTooltip) {
          setTooltipText(els.maintenancePenaltyTooltip, getTemperatureMaintenanceImmuneTooltip());
        }
      } else {
        els.maintenancePenalty.style.display = 'none';
      }
    }
    if (els.maintenanceFloor) {
      const floorContext = terraforming.calculateOneAtmMaintenanceFloor();
      if (floorContext.penalty > 1 && Number.isFinite(floorContext.temperatureK)) {
        els.maintenanceFloor.style.display = '';
        const floorTemperature = formatNumber(
          toDisplayTemperature(floorContext.temperatureK),
          false,
          2
        );
        if (els.maintenanceFloorValue) {
          els.maintenanceFloorValue.textContent =
            `${floorTemperature}${unit} (floor x${floorContext.penalty.toFixed(2)})`;
        } else {
          els.maintenanceFloor.textContent =
            `${getTerraformingSummaryText(
              'temperature.labels.oneAtmEstimate',
              '1 atm temperature estimate : '
            )}${floorTemperature}${unit} (floor x${floorContext.penalty.toFixed(2)})`;
        }
        if (els.maintenanceFloorTooltip) {
          setTooltipText(
            els.maintenanceFloorTooltip,
            getTemperatureMaintenanceFloorTooltip(floorContext)
          );
        }
      } else {
        els.maintenanceFloor.style.display = 'none';
      }
    }
  }

  function createAtmosphereBox(row) {
    const atmosphereBox = document.createElement('div');
    atmosphereBox.classList.add('terraforming-box');
    atmosphereBox.id = 'atmosphere-box';
    const atmInfo = document.createElement('span');
    atmInfo.classList.add('info-tooltip-icon');
    const atmTooltipText = getTerraformingSummaryText(
      'atmosphere.tooltip',
      'The atmosphere is the gaseous envelope of the planet, critical for life and climate.'
    );
    const atmTooltip = attachDynamicInfoTooltip(atmInfo, atmTooltipText);
    const gasTargets = terraforming.gasTargets || {};
    const targetGasKeys = Object.keys(gasTargets);
    targetGasKeys.sort((a, b) => {
      const aTarget = gasTargets[a];
      const bTarget = gasTargets[b];
      const minDiff = (bTarget?.min || 0) - (aTarget?.min || 0);
      if (minDiff) return minDiff;
      const maxDiff = (bTarget?.max || 0) - (aTarget?.max || 0);
      if (maxDiff) return maxDiff;
      return a.localeCompare(b);
    });

    const resourceGasKeys = Object.keys(resources.atmospheric || {});
    const gasKeys = targetGasKeys.concat(resourceGasKeys.filter(key => !targetGasKeys.includes(key)));
    let innerHTML = `
      <h3>${terraforming.atmosphere.name}</h3>
      <p>${getTerraformingSummaryText('atmosphere.labels.current', 'Current')}: <span id="atmosphere-current"></span></p>
      <p id="atmosphere-target-line" style="display: none;">${getTerraformingSummaryText('atmosphere.labels.target', 'Target')}: <span id="atmosphere-target"></span> <span id="atmosphere-target-status"></span></p>
      <table>
        <colgroup>
          <col class="gas-col">
          <col class="pressure-col">
          <col class="delta-col">
          <col class="target-col">
          <col class="status-col">
        </colgroup>
        <thead>
          <tr>
            <th>${getTerraformingSummaryText('atmosphere.labels.gas', 'Gas')}</th>
            <th>${getTerraformingSummaryText('atmosphere.labels.pressure', 'P (Pa)')}</th>
            <th>${getTerraformingSummaryText('atmosphere.labels.delta', 'Delta (Pa)')}</th>
            <th>${getTerraformingSummaryText('atmosphere.labels.targetPressure', 'Target (Pa)')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="atmosphere-gas-body">
    `;
  
    gasKeys.forEach((gas, index) => {
        const resource = resources.atmospheric[gas] || null;
        const displayName = resource?.displayName || resource?.name || gas;
        const hasTarget = !!gasTargets[gas];
        const statusClass = hasTarget ? 'status-cross' : '';
        const statusIcon = hasTarget ? '✗' : '';
        innerHTML += `
          <tr data-gas="${gas}" data-order="${index}">
            <td>${displayName}</td>
            <td><span id="${gas}-pressure">0.00</span></td>
            <td><span id="${gas}-delta">N/A</span></td>
            <td><span id="${gas}-target" class="gas-range"></span></td>
            <td><span id="${gas}-status" class="${statusClass}">${statusIcon}</span></td>
          </tr>
        `;
    });
  
    innerHTML += `
        </tbody>
      </table>
      <p class="no-margin">${getTerraformingSummaryText('atmosphere.labels.opticalDepth', 'Optical depth')}: <span id="optical-depth"></span><span id="optical-depth-warning" class="optical-depth-warning"></span> <span id="optical-depth-info" class="info-tooltip-icon">&#9432;<span id="optical-depth-tooltip" class="resource-tooltip"></span></span></p>
      <p class="no-margin">${getTerraformingSummaryText('atmosphere.labels.windMultiplier', 'Wind turbine multiplier')}: <span id="wind-turbine-multiplier">${(terraforming.calculateWindTurbineMultiplier()*100).toFixed(2)}</span>%</p>
    `;
  
    atmosphereBox.innerHTML = innerHTML;
    const atmosphereHeading = atmosphereBox.querySelector('h3');
    if (atmosphereHeading) {
      atmosphereHeading.appendChild(atmInfo);
    }

    const pressurePenaltySpan = document.createElement('p');
    pressurePenaltySpan.id = 'pressure-cost-penalty';
    pressurePenaltySpan.style.display = 'none';
    atmosphereBox.appendChild(pressurePenaltySpan);

    row.appendChild(atmosphereBox);
    const gasElements = {};
    for (const gas of gasKeys) {
      const pressureEl = atmosphereBox.querySelector(`#${gas}-pressure`);
      gasElements[gas] = {
        pressure: pressureEl,
        delta: atmosphereBox.querySelector(`#${gas}-delta`),
        target: atmosphereBox.querySelector(`#${gas}-target`),
        status: atmosphereBox.querySelector(`#${gas}-status`),
        row: pressureEl ? pressureEl.closest('tr') : null
      };
    }
    terraformingUICache.atmosphere = {
      info: atmInfo,
      infoTooltip: atmTooltip,
      box: atmosphereBox,
      current: atmosphereBox.querySelector('#atmosphere-current'),
      pressureTargetLine: atmosphereBox.querySelector('#atmosphere-target-line'),
      pressureTarget: atmosphereBox.querySelector('#atmosphere-target'),
      pressureTargetStatus: atmosphereBox.querySelector('#atmosphere-target-status'),
      gasBody: atmosphereBox.querySelector('#atmosphere-gas-body'),
      opticalDepth: atmosphereBox.querySelector('#optical-depth'),
      opticalDepthWarning: atmosphereBox.querySelector('#optical-depth-warning'),
      opticalDepthInfo: atmosphereBox.querySelector('#optical-depth-info'),
      opticalDepthTooltip: atmosphereBox.querySelector('#optical-depth-tooltip'),
      windMultiplier: atmosphereBox.querySelector('#wind-turbine-multiplier'),
      pressurePenalty: atmosphereBox.querySelector('#pressure-cost-penalty'),
      gases: gasElements,
      nextGasOrder: gasKeys.length,
      tooltipCache: {
        opticalDepth: ''
      }
    };
    const els = terraformingUICache.atmosphere;
    if (typeof addTooltipHover === 'function') {
      addTooltipHover(els.opticalDepthInfo, els.opticalDepthTooltip, { clickToPin: true });
    }
  }

  function updateAtmosphereBox(deltaSeconds) {
    const els = terraformingUICache.atmosphere;
    const atmosphereBox = els.box;
    if (!atmosphereBox) return;
    atmosphereBox.style.borderColor = terraforming.getAtmosphereStatus() ? 'green' : 'red';
    const gasTargets = terraforming.gasTargets;
    const gasBody = els.gasBody;
    const frameDelta = deltaSeconds > 0 ? Math.min(1, deltaSeconds) : 0;
    const gasHideTimers = els.gasHideTimers || (els.gasHideTimers = {});

    const addGasRow = (gas) => {
      if (!gasBody) return;
      const resource = resources.atmospheric[gas] || null;
      const displayName = resource?.displayName || resource?.name || gas;
      const row = document.createElement('tr');
      row.dataset.gas = gas;
      row.dataset.order = String(els.nextGasOrder || 0);
      els.nextGasOrder = (els.nextGasOrder || 0) + 1;
      row.innerHTML = `
        <td>${displayName}</td>
        <td><span id="${gas}-pressure">0.00</span></td>
        <td><span id="${gas}-delta">N/A</span></td>
        <td><span id="${gas}-target" class="gas-range"></span></td>
        <td><span id="${gas}-status"></span></td>
      `;
      gasBody.appendChild(row);
      els.gases[gas] = {
        pressure: row.querySelector(`#${gas}-pressure`),
        delta: row.querySelector(`#${gas}-delta`),
        target: row.querySelector(`#${gas}-target`),
        status: row.querySelector(`#${gas}-status`),
        row,
      };
      gasHideTimers[gas] = 0;
    };

    Object.keys(gasTargets || {}).forEach((gas) => {
      if (!els.gases[gas]) {
        addGasRow(gas);
      }
    });

    const sortedGasKeys = Object.keys(els.gases || {});
    sortedGasKeys.sort((a, b) => {
      const aTarget = gasTargets[a];
      const bTarget = gasTargets[b];
      const aHasTarget = !!aTarget;
      const bHasTarget = !!bTarget;
      if (aHasTarget !== bHasTarget) return bHasTarget - aHasTarget;
      if (aHasTarget) {
        const minDiff = (bTarget.min || 0) - (aTarget.min || 0);
        if (minDiff) return minDiff;
        const maxDiff = (bTarget.max || 0) - (aTarget.max || 0);
        if (maxDiff) return maxDiff;
        return a.localeCompare(b);
      }
      const aOrder = Number(els.gases[a]?.row?.dataset?.order || 0);
      const bOrder = Number(els.gases[b]?.row?.dataset?.order || 0);
      return aOrder - bOrder;
    });

    if (gasBody) {
      sortedGasKeys.forEach((gas) => {
        const row = els.gases[gas]?.row;
        if (row) gasBody.appendChild(row);
      });
    }

    const totalPressureKPa = terraforming.calculateTotalPressure();
    const totalPressurePa = totalPressureKPa * 1000;
    els.current.textContent = `${formatNumber(totalPressurePa, false, 2)}Pa`;
    const pressureTarget = terraforming.atmosphere.totalPressureTargetRangeKPa;
    const hasPressureTarget = pressureTarget
      && (pressureTarget.min > 0 || pressureTarget.max > 0);
    if (els.pressureTargetLine && els.pressureTarget && els.pressureTargetStatus) {
      if (hasPressureTarget) {
        const minPa = pressureTarget.min * 1000;
        const maxPa = pressureTarget.max * 1000;
        els.pressureTarget.textContent = getTerraformingSummaryText(
          'atmosphere.targetRange',
          '{min}Pa - {max}Pa',
          {
            min: formatNumber(minPa, false, 2),
            max: formatNumber(maxPa, false, 2),
          }
        );
        const inRange = totalPressureKPa >= pressureTarget.min && totalPressureKPa <= pressureTarget.max;
        els.pressureTargetStatus.textContent = getTerraformingStatusIcon(inRange);
        els.pressureTargetStatus.classList.toggle('status-check', inRange);
        els.pressureTargetStatus.classList.toggle('status-cross', !inRange);
        els.pressureTargetLine.style.display = '';
      } else {
        els.pressureTarget.textContent = '';
        els.pressureTargetStatus.textContent = '';
        els.pressureTargetStatus.classList.remove('status-check', 'status-cross');
        els.pressureTargetLine.style.display = 'none';
      }
    }

    if (els.opticalDepth) {
      const opticalDepthValue = terraforming.temperature.opticalDepth;
      const isDefaultRequirement = terraforming.requirementId === DEFAULT_TERRAFORMING_REQUIREMENT_ID;
      const warningSuffix = isDefaultRequirement && opticalDepthValue > 3 ? '\u26A0' : '';
      els.opticalDepth.textContent = opticalDepthValue.toFixed(3);
      if (els.opticalDepthWarning) {
        els.opticalDepthWarning.textContent = warningSuffix;
      }
    }
    if (els.opticalDepthInfo) {
      const contributions = terraforming.temperature.opticalDepthContributions || {};
      const intro = getTerraformingSummaryText(
        'atmosphere.opticalDepthTooltipIntro',
        'Measures the effective Greenhouse Gas Effect. Higher value means more heat trapped. On very hot worlds, this value is reduced automatically as thermal emission shifts toward near-IR. To achieve both temperature and luminosity target, it is usually recommended, but not required, to keep this value below 3.'
      );
      const lines = Object.entries(contributions)
        .map(([gas, val]) => {
          const mapping = {
            co2: 'carbonDioxide',
            h2o: 'atmosphericWater',
            ch4: 'atmosphericMethane',
            greenhousegas: 'greenhouseGas',
            h2: 'hydrogen',
            h2so4: 'sulfuricAcid'
          };
          const resourceKey = mapping[gas.toLowerCase()];
          const displayName = resourceKey && resources.atmospheric[resourceKey]
            ? resources.atmospheric[resourceKey].displayName
            : gas.toUpperCase();
          return getTerraformingSummaryText(
            'atmosphere.opticalDepthContribution',
            '{name}: {value}',
            { name: displayName, value: val.toFixed(3) }
          );
        });
      lines.unshift(intro);
      setTooltipText(els.opticalDepthTooltip, lines.join('\n'), els.tooltipCache, 'opticalDepth');
    }

    if (els.windMultiplier) {
      els.windMultiplier.textContent = `${(terraforming.calculateWindTurbineMultiplier()*100).toFixed(2)}`;
    }

    if (els.pressurePenalty && typeof terraforming.calculateColonyPressureCostPenalty === 'function') {
      const penalty = terraforming.calculateColonyPressureCostPenalty();
      if (penalty > 1) {
        els.pressurePenalty.style.display = '';
        els.pressurePenalty.textContent = getTerraformingSummaryText(
          'atmosphere.labels.pressurePenalty',
          'Colony cost multiplier from pressure : {value}',
          { value: penalty.toFixed(2) }
        );
      } else {
        els.pressurePenalty.style.display = 'none';
      }
    }

    for (const gas of sortedGasKeys) {
        const resource = resources.atmospheric[gas] || { value: 0 };
        const currentAmount = resource.value || 0;
        const currentGlobalPressurePa = calculateAtmosphericPressure(
            currentAmount,
            terraforming.celestialParameters.gravity,
            terraforming.celestialParameters.radius
        );

        const gasEls = els.gases[gas];
        // Hide row if configured to hide when small and in-range or empty.
        const hideSmall = !!resource.hideWhenSmall;
        const target = gasTargets[gas];
        const outsideTarget = target
          && (currentGlobalPressurePa < target.min || currentGlobalPressurePa > target.max);
        const shouldShowBase = !hideSmall || currentAmount > 0 || outsideTarget;
        let timer = gasHideTimers[gas] || 0;
        if (shouldShowBase) {
          timer = 1;
        } else if (timer > 0) {
          timer = Math.max(0, timer - frameDelta);
        }
        gasHideTimers[gas] = timer;
        const shouldShow = shouldShowBase || timer > 0;
        if (gasEls && gasEls.row) {
            gasEls.row.style.display = shouldShow ? '' : 'none';
        }
        if (gasEls && gasEls.pressure) {
            gasEls.pressure.textContent = formatNumber(currentGlobalPressurePa, false, 2);
        }

        const initialAmount = currentPlanetParameters.resources.atmospheric[gas]?.initialValue || 0;
        const initialGlobalPressurePa = calculateAtmosphericPressure(
             initialAmount,
             terraforming.celestialParameters.gravity,
             terraforming.celestialParameters.radius
        );

        if (gasEls && gasEls.delta) {
            const delta = currentGlobalPressurePa - initialGlobalPressurePa;
            gasEls.delta.textContent = `${delta >= 0 ? '+' : ''}${formatNumber(delta, false, 2)}`;
        }

        if (gasEls && gasEls.target) {
            gasEls.target.textContent = formatGasTargetRange(target);
        }

        if (gasEls && gasEls.status) {
            if (!target) {
                gasEls.status.textContent = '';
                gasEls.status.classList.remove('status-check', 'status-cross');
            } else if (!outsideTarget) {
                gasEls.status.textContent = getTerraformingStatusIcon(true);
                gasEls.status.classList.add('status-check');
                gasEls.status.classList.remove('status-cross');
            } else {
                gasEls.status.textContent = getTerraformingStatusIcon(false);
                gasEls.status.classList.add('status-cross');
                gasEls.status.classList.remove('status-check');
            }
        }
    }
  }
  
function createWaterBox(row) {
    const waterBox = document.createElement('div');
    waterBox.classList.add('terraforming-box');
    waterBox.id = 'water-box';
    const waterInfo = document.createElement('span');
    waterInfo.classList.add('info-tooltip-icon');
    const waterTooltipText = getTerraformingSummaryText(
      'water.tooltip',
      'The planetary water cycle is a dynamic system crucial for climate and life.'
    );
    const waterTooltip = attachDynamicInfoTooltip(waterInfo, waterTooltipText);
    // Use static text/placeholders, values will be filled by updateWaterBox
    waterBox.innerHTML = `
      <h3>${getTerraformingSummaryText('water.title', 'Surface')}</h3>
      <table>
        <thead>
          <tr>
            <th>${getTerraformingSummaryText('water.labels.parameter', 'Parameter')}</th>
            <th>${getTerraformingSummaryText('water.labels.valueRate', 'Value (t/s)')}</th>
            <th>${getTerraformingSummaryText('water.labels.areaRate', 'Rate (kg/m²/s)')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${getTerraformingSummaryText('water.labels.evaporationRate', 'Evaporation rate')}</td>
            <td><span id="evaporation-rate">N/A</span></td>
            <td><span id="evaporation-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('water.labels.boilingRate', 'Boiling rate')}</td>
            <td><span id="boiling-rate">N/A</span></td>
            <td><span id="boiling-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('water.labels.sublimationRate', 'Sublimation rate')}</td>
            <td><span id="sublimation-rate">N/A</span></td>
            <td><span id="sublimation-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('water.labels.rainfallRate', 'Rainfall rate')}</td>
            <td><span id="rainfall-rate">N/A</span></td>
            <td><span id="rainfall-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('water.labels.snowfallRate', 'Snowfall rate')}</td>
            <td><span id="snowfall-rate">N/A</span></td>
            <td><span id="snowfall-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('water.labels.meltingRate', 'Melting rate')}</td>
            <td><span id="melting-rate">N/A</span></td>
            <td><span id="melting-rate-kg">N/A</span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('water.labels.freezingRate', 'Freezing rate')}</td>
            <td><span id="freezing-rate">N/A</span></td>
            <td><span id="freezing-rate-kg">N/A</span></td>
          </tr>
        </tbody>
      </table>
      <p class="no-margin">${getTerraformingSummaryText('water.labels.waterCoverage', 'Water coverage')}: <span id="water-current">0.00</span>%</p>
      <p class="no-margin">${getTerraformingSummaryText('water.labels.iceCoverage', 'Ice coverage')}: <span id="ice-current">0.00</span>%</p>
      <p class="no-margin" id="co2-liquid-row" style="display:none;">${getTerraformingSummaryText('water.labels.liquidCo2Coverage', 'Liquid CO2 coverage')}: <span id="co2-liquid-current">0.00</span>%</p>
      <p class="no-margin" id="co2-ice-row" style="display:none;">${getTerraformingSummaryText('water.labels.dryIceCoverage', 'Dry ice coverage')}: <span id="co2-ice-current">0.00</span>%</p>
      <p class="no-margin" id="fine-sand-row" style="display:none;">${getTerraformingSummaryText('water.labels.fineSandCoverage', 'Fine sand coverage')}: <span id="fine-sand-current">0.00</span>%</p>
    `;

    const waterHeading = waterBox.querySelector('h3');
    if (waterHeading) {
      waterHeading.appendChild(waterInfo);
    }

    const targetSpan = document.createElement('span');
    targetSpan.id = 'water-target';
    targetSpan.innerHTML = formatLiquidCoverageTargets(terraforming);
    targetSpan.style.marginTop = 'auto';
    targetSpan.style.display = terraforming.liquidCoverageTargets.length ? '' : 'none';
    targetSpan.classList.add('terraforming-target')
    waterBox.appendChild(targetSpan);

    row.appendChild(waterBox);
    terraformingUICache.water = {
      info: waterInfo,
      infoTooltip: waterTooltip,
      box: waterBox,
      waterCurrent: waterBox.querySelector('#water-current'),
      iceCurrent: waterBox.querySelector('#ice-current'),
      co2LiquidRow: waterBox.querySelector('#co2-liquid-row'),
      co2LiquidCurrent: waterBox.querySelector('#co2-liquid-current'),
      co2IceRow: waterBox.querySelector('#co2-ice-row'),
      co2IceCurrent: waterBox.querySelector('#co2-ice-current'),
      fineSandRow: waterBox.querySelector('#fine-sand-row'),
      fineSandCurrent: waterBox.querySelector('#fine-sand-current'),
      evaporationRate: waterBox.querySelector('#evaporation-rate'),
      boilingRate: waterBox.querySelector('#boiling-rate'),
      sublimationRate: waterBox.querySelector('#sublimation-rate'),
      rainfallRate: waterBox.querySelector('#rainfall-rate'),
      snowfallRate: waterBox.querySelector('#snowfall-rate'),
      meltingRate: waterBox.querySelector('#melting-rate'),
      freezingRate: waterBox.querySelector('#freezing-rate'),
      evaporationRateKg: waterBox.querySelector('#evaporation-rate-kg'),
      boilingRateKg: waterBox.querySelector('#boiling-rate-kg'),
      sublimationRateKg: waterBox.querySelector('#sublimation-rate-kg'),
      rainfallRateKg: waterBox.querySelector('#rainfall-rate-kg'),
      snowfallRateKg: waterBox.querySelector('#snowfall-rate-kg'),
      meltingRateKg: waterBox.querySelector('#melting-rate-kg'),
      freezingRateKg: waterBox.querySelector('#freezing-rate-kg'),
      target: targetSpan
    };
  }

  function getLiquidCoverageTargetLabel(entry) {
    if (entry.coverageKey && !LIQUID_COVERAGE_LABEL_TYPES[entry.coverageKey]) {
      return getTerraformingSummaryResourceLabel(entry.coverageKey, formatTerraformingSummaryLabel(entry.coverageKey, entry.coverageKey));
    }
    switch (entry.liquidType) {
      case 'water':
        return getTerraformingSummaryResourceLabel('water', 'Water');
      case 'carbonDioxide':
        return getTerraformingSummaryResourceLabel('liquidCarbonDioxide', 'Liquid CO2');
      default:
        return entry.liquidType || entry.coverageKey || getTerraformingSummaryResourceLabel('liquid', 'Liquid');
    }
  }

  function formatLiquidCoverageTargets(terraformingState) {
    if (!terraformingState.liquidCoverageTargets.length) {
      return '';
    }
    const parts = terraformingState.liquidCoverageTargets.map((entry) => {
      const label = getLiquidCoverageTargetLabel(entry);
      const pct = entry.coverageTarget * 100;
      const roundedPct = Math.round(pct * 10) / 10;
      const pctDigits = Math.abs(roundedPct - Math.round(roundedPct)) > 1e-9 ? 1 : 0;
      const targetAmount = getWaterTargetAmount(terraformingState, entry.coverageKey, entry.coverageTarget) || 0;
      const targetAmountText = formatNumber(targetAmount, false, 1);
      if (entry.comparison === 'atMost') {
        return getTerraformingSummaryText(
          'water.targetAtMost',
          '{label} coverage <= {percent}% ({amount}).',
          {
            label,
            percent: formatNumber(roundedPct, false, pctDigits),
            amount: targetAmountText,
          }
        );
      }
      return getTerraformingSummaryText(
        'water.targetAtLeast',
        '{label} coverage >= {percent}% ({amount}).',
        {
          label,
          percent: formatNumber(roundedPct, false, pctDigits),
          amount: targetAmountText,
        }
      );
    });
    return formatTerraformingTargetText(parts.join('<br>'));
  }

  function formatWaterRate(value) {
    return formatNumber(Math.abs(value) < 1e-4 ? 0 : value);
  }

  function getWaterTargetAmount(terraformingState, coverageKey, targetCoverage) {
    if (typeof getCoverageTargetAmount === 'function') {
      return getCoverageTargetAmount(terraformingState, coverageKey, targetCoverage);
    }
    const surfaceArea = terraformingState.celestialParameters.surfaceArea;
    let total = 0;
    for (const zone of getZones()) {
      const zoneArea = surfaceArea * getZonePercentage(zone);
      total += estimateAmountForCoverage(targetCoverage, zoneArea);
    }
    return total;
  }
  
  function updateWaterBox() {
    const els = terraformingUICache.water;
    const waterBox = els.box;
    if (!waterBox) return;
    const zones = getZones();
    const surfaceArea = terraforming.celestialParameters.surfaceArea;

    // Totals are no longer calculated here; they are read from terraforming object
    // let totalLiquid = 0; // Not needed for rate display
    // let totalIce = 0; // Not needed for rate display
    // let totalEvaporationRate = 0; // Read from terraforming.totalEvaporationRate
    // let totalBoilingRate = 0; // Read from terraforming.totalBoilingRate
    // let totalSublimationRate = 0; // Read from terraforming.totalWaterSublimationRate
    // let totalRainfallRate = 0; // Read from terraforming.totalRainfallRate
    // let totalSnowfallRate = 0; // Read from terraforming.totalSnowfallRate
    // let totalMeltingRate = 0; // Read from terraforming.totalMeltRate
    // let totalFreezingRate = 0; // Read from terraforming.totalFreezeRate

    // zones.forEach(zone => { // Loop no longer needed for rates
    //     totalLiquid += terraforming.zonalSurface[zone].liquidWater || 0;
    //     totalIce += terraforming.zonalSurface[zone].ice || 0;
    //     // Remove rate summing from zonal data
    // });

    // Calculate average coverage percentages using the centralized helper function

    const avgLiquidCoverage = calculateAverageCoverage(terraforming, 'liquidWater') || 0;
    const avgIceCoverage = calculateAverageCoverage(terraforming, 'ice') || 0;
    const avgCo2LiquidCoverage = calculateAverageCoverage(terraforming, 'liquidCO2') || 0;
    const avgDryIceCoverage = calculateAverageCoverage(terraforming, 'dryIce') || 0;
    const avgFineSandCoverage = calculateAverageCoverage(terraforming, 'fineSand') || 0;

    const requiresCo2 = terraforming.liquidCoverageTargets.some((entry) => entry.liquidType === 'carbonDioxide');
    const requiresFineSand = terraforming.liquidCoverageTargets.some((entry) => entry.coverageKey === 'fineSand');
    if (els.co2LiquidRow) els.co2LiquidRow.style.display = requiresCo2 ? '' : 'none';
    if (els.co2IceRow) els.co2IceRow.style.display = requiresCo2 ? '' : 'none';
    if (els.fineSandRow) els.fineSandRow.style.display = requiresFineSand ? '' : 'none';

    let allTargetsMet = true;
    for (const entry of terraforming.liquidCoverageTargets) {
      const current = calculateAverageCoverage(terraforming, entry.coverageKey) || 0;
      const met = entry.comparison === 'atMost'
        ? current <= entry.coverageTarget
        : current >= entry.coverageTarget;
      if (!met) {
        allTargetsMet = false;
        break;
      }
    }

    waterBox.style.borderColor = terraforming.liquidCoverageTargets.length
      ? (allTargetsMet ? 'green' : 'red')
      : '';

    els.waterCurrent.textContent = (avgLiquidCoverage * 100).toFixed(2);
    els.iceCurrent.textContent = (avgIceCoverage * 100).toFixed(2);
    if (requiresCo2) {
      if (els.co2LiquidCurrent) els.co2LiquidCurrent.textContent = (avgCo2LiquidCoverage * 100).toFixed(2);
      if (els.co2IceCurrent) els.co2IceCurrent.textContent = (avgDryIceCoverage * 100).toFixed(2);
    }
    if (requiresFineSand && els.fineSandCurrent) {
      els.fineSandCurrent.textContent = (avgFineSandCoverage * 100).toFixed(2);
    }

    if (els.target) {
      els.target.innerHTML = formatLiquidCoverageTargets(terraforming);
      els.target.style.display = terraforming.liquidCoverageTargets.length ? '' : 'none';
    }

    els.evaporationRate.textContent = formatWaterRate(terraforming.totalEvaporationRate || 0);
    els.boilingRate.textContent = formatWaterRate(terraforming.totalBoilingRate || 0);
    els.sublimationRate.textContent = formatWaterRate(terraforming.totalWaterSublimationRate || 0);
    els.rainfallRate.textContent = formatWaterRate(terraforming.totalRainfallRate || 0);
    els.snowfallRate.textContent = formatWaterRate(terraforming.totalSnowfallRate || 0);
    els.meltingRate.textContent = formatWaterRate(terraforming.totalMeltRate || 0);
    els.freezingRate.textContent = formatWaterRate(terraforming.totalFreezeRate || 0);

    const safeSurfaceArea = surfaceArea > 0 ? surfaceArea : 1;
    els.evaporationRateKg.textContent = formatWaterRate((terraforming.totalEvaporationRate || 0) * 1000 / safeSurfaceArea);
    els.boilingRateKg.textContent = formatWaterRate((terraforming.totalBoilingRate || 0) * 1000 / safeSurfaceArea);
    els.sublimationRateKg.textContent = formatWaterRate((terraforming.totalWaterSublimationRate || 0) * 1000 / safeSurfaceArea);
    els.rainfallRateKg.textContent = formatWaterRate((terraforming.totalRainfallRate || 0) * 1000 / safeSurfaceArea);
    els.snowfallRateKg.textContent = formatWaterRate((terraforming.totalSnowfallRate || 0) * 1000 / safeSurfaceArea);
    els.meltingRateKg.textContent = formatWaterRate((terraforming.totalMeltRate || 0) * 1000 / safeSurfaceArea);
    els.freezingRateKg.textContent = formatWaterRate((terraforming.totalFreezeRate || 0) * 1000 / safeSurfaceArea);
  }

  function createLifeBox(row) {
    const lifeBox = document.createElement('div');
    lifeBox.classList.add('terraforming-box');
    lifeBox.id = 'life-box';
    const lifeInfo = document.createElement('span');
    lifeInfo.classList.add('info-tooltip-icon');
    const zoneLines = getZones().map(zone => {
      const pct = (getZonePercentage(zone) * 100).toFixed(1);
      return getTerraformingSummaryText(
        'lifeSummary.zoneDistribution',
        '- {label}: {percent}%',
        { label: getTerraformingZoneLabel(zone), percent: pct }
      );
    });
    const lifeTooltipText = `${getTerraformingSummaryText(
      'lifeSummary.tooltipIntro',
      'Life is the pinnacle of the terraforming process.'
    )}\n${zoneLines.join('\n')}`;
    const lifeTooltip = attachDynamicInfoTooltip(lifeInfo, lifeTooltipText);
    // Use static text/placeholders, values will be filled by updateLifeBox
    lifeBox.innerHTML = `
      <h3>${getTerraformingText('ui.terraforming.lifeTitle', 'Life')}</h3>
      <table id="life-coverage-table">
        <thead>
          <tr>
            <th>${getTerraformingSummaryText('lifeSummary.labels.region', 'Region')}</th>
            <th>${getTerraformingSummaryText('lifeSummary.labels.coverage', 'Coverage (%)')}</th>
            <th>${getTerraformingSummaryText('lifeSummary.labels.photoMultiplier', 'Photo Mult (%)')}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>${getTerraformingSummaryText('zones.overall', 'Overall')}</td><td id="life-coverage-overall">0.00</td><td id="life-photo-overall">-</td></tr>
          <tr data-zone-row="polar"><td>${getTerraformingZoneLabel('polar')}</td><td id="life-coverage-polar">0.00</td><td id="life-photo-polar">0.00</td></tr>
          <tr data-zone-row="temperate"><td>${getTerraformingZoneLabel('temperate')}</td><td id="life-coverage-temperate">0.00</td><td id="life-photo-temperate">0.00</td></tr>
          <tr data-zone-row="tropical"><td>${getTerraformingZoneLabel('tropical')}</td><td id="life-coverage-tropical">0.00</td><td id="life-photo-tropical">0.00</td></tr>
        </tbody>
      </table>
      `;

    const lifeHeading = lifeBox.querySelector('h3');
    if (lifeHeading) {
      lifeHeading.appendChild(lifeInfo);
    }

    const targetSpan = document.createElement('span');
    targetSpan.textContent = formatTerraformingTargetText(
      getTerraformingSummaryText(
        'lifeSummary.targetAtLeast',
        'Life coverage at least {percent}%.',
        { percent: (terraforming.life.target * 100).toFixed(0) }
      )
    );
    targetSpan.style.marginTop = 'auto';
    targetSpan.classList.add('terraforming-target')
    lifeBox.appendChild(targetSpan);

    row.appendChild(lifeBox);
    terraformingUICache.life = {
      info: lifeInfo,
      infoTooltip: lifeTooltip,
      box: lifeBox,
      target: targetSpan,
      coverageOverall: lifeBox.querySelector('#life-coverage-overall'),
      photoOverall: lifeBox.querySelector('#life-photo-overall'),
      zoneRows: {
        tropical: lifeBox.querySelector('tr[data-zone-row="tropical"]'),
        temperate: lifeBox.querySelector('tr[data-zone-row="temperate"]'),
        polar: lifeBox.querySelector('tr[data-zone-row="polar"]')
      },
      coverageByZone: {
        tropical: lifeBox.querySelector('#life-coverage-tropical'),
        temperate: lifeBox.querySelector('#life-coverage-temperate'),
        polar: lifeBox.querySelector('#life-coverage-polar')
      },
      photoByZone: {
        tropical: lifeBox.querySelector('#life-photo-tropical'),
        temperate: lifeBox.querySelector('#life-photo-temperate'),
        polar: lifeBox.querySelector('#life-photo-polar')
      }
    };
}

function updateLifeBox() {
    const els = terraformingUICache.life;
    const lifeBox = els.box;
    if (!lifeBox) return;
    const zones = getZones();
    const knownZones = ['tropical', 'temperate', 'polar'];
    knownZones.forEach(zone => {
      const row = els.zoneRows[zone];
      row.style.display = zones.includes(zone) ? '' : 'none';
    });

    // Calculate total biomass from zonal data
    let totalBiomass = 0;
    zones.forEach(zone => {
        totalBiomass += terraforming.zonalSurface[zone].biomass || 0;
    });

    // Calculate average biomass coverage percentage using the centralized helper function
    const avgBiomassCoverage = calculateAverageCoverage(terraforming, 'biomass');

    const effectiveTarget = getEffectiveLifeFraction(terraforming);
    const hazardTolerance = 1e-6;
    const hazardsCleared = typeof terraforming.getHazardClearanceStatus === 'function'
      ? terraforming.getHazardClearanceStatus()
      : zones.every(zone => (terraforming.zonalSurface[zone]?.hazardousBiomass || 0) <= hazardTolerance);
    const lifeTargetMet = avgBiomassCoverage >= effectiveTarget;
    lifeBox.style.borderColor = lifeTargetMet ? 'green' : 'red';
    if (els.target) {
      els.target.textContent = formatTerraformingTargetText(
        getTerraformingSummaryText(
          'lifeSummary.targetAbove',
          'Life coverage above {percent}%.',
          { percent: (effectiveTarget * 100).toFixed(0) }
        )
      );
    }

    const zoneLines = zones.map(zone => {
      const pct = (getZonePercentage(zone) * 100).toFixed(1);
      return getTerraformingSummaryText(
        'lifeSummary.zoneDistribution',
        '- {label}: {percent}%',
        { label: getTerraformingZoneLabel(zone), percent: pct }
      );
    });
    const tooltipText = `${getTerraformingSummaryText(
      'lifeSummary.tooltipIntro',
      'Life is the pinnacle of the terraforming process.'
    )}\n${zoneLines.join('\n')}`;
    els.infoTooltip.textContent = tooltipText;

    const hazardByZone = {
      tropical: terraforming.zonalSurface.tropical?.hazardousBiomass || 0,
      temperate: terraforming.zonalSurface.temperate?.hazardousBiomass || 0,
      polar: terraforming.zonalSurface.polar?.hazardousBiomass || 0
    };
    const hazardTotal = zones.reduce((sum, zone) => sum + (hazardByZone[zone] || 0), 0);
    const hazardEntries = [
      [els.hazardOverall, hazardTotal],
      [els.hazardPolar, hazardByZone.polar],
      [els.hazardTemperate, hazardByZone.temperate],
      [els.hazardTropical, hazardByZone.tropical]
    ];
    hazardEntries.forEach(([node, value]) => {
      if (!node) return;
      node.textContent = formatNumber(value, true, 2);
      node.style.color = value > hazardTolerance ? 'red' : '';
    });

    if (els.hazardTarget) {
      if (hazardsCleared) {
        els.hazardTarget.textContent = getTerraformingSummaryText(
          'lifeSummary.hazardsCleared',
          'Hazardous biomass cleared in all zones.'
        );
        els.hazardTarget.style.color = '';
      } else {
        const remainingZones = zones
          .filter(zone => (terraforming.zonalSurface[zone]?.hazardousBiomass || 0) > hazardTolerance)
          .map(zone => getTerraformingZoneLabel(zone));
        els.hazardTarget.textContent = getTerraformingSummaryText(
          'lifeSummary.removeHazards',
          'Remove hazardous biomass from: {zones}.',
          { zones: remainingZones.join(', ') }
        );
        els.hazardTarget.style.color = 'red';
      }
    }

    // Calculate zonal coverage percentages
    const zoneCoverage = {
      tropical: terraforming.zonalCoverageCache['tropical']?.biomass ?? 0,
      temperate: terraforming.zonalCoverageCache['temperate']?.biomass ?? 0,
      polar: terraforming.zonalCoverageCache['polar']?.biomass ?? 0
    };

    // Update life coverage display
    if (els.coverageOverall) els.coverageOverall.textContent = (avgBiomassCoverage * 100).toFixed(2);
    zones.forEach(zone => {
      els.coverageByZone[zone].textContent = (zoneCoverage[zone] * 100).toFixed(2);
      els.photoByZone[zone].textContent = (terraforming.calculateZonalSolarPanelMultiplier(zone) * 100).toFixed(2);
    });
  }

  function formatRadiation(value){
    return value < 0.01 ? '0' : value.toFixed(2);
  }

  function getDisplayedRadiationPenalty(hasMagnetosphere) {
    if (hasMagnetosphere) {
      return 0;
    }
    const design = lifeDesigner && (lifeDesigner.tentativeDesign || lifeDesigner.currentDesign);
    let penalty = design ? design.getRadiationGrowthPenalty() : (terraforming.radiationPenalty || 0);
    if (penalty < 0.0001) {
      penalty = 0;
    }
    return penalty;
  }

  function updateOtherRequirementStatuses(els) {
    const container = els.otherRequirements;
    if (!container) {
      return;
    }
    const statuses = terraforming.getOtherRequirementStatuses ? terraforming.getOtherRequirementStatuses() : [];
    container.textContent = '';
    statuses.forEach((status) => {
      const line = document.createElement('p');
      line.classList.add('no-margin');
      const targetText = status.key && status.key.indexOf('rotationPeriodMinimum:') === 0 && status.currentText
        ? `${status.targetText} (${status.currentText})`
        : status.targetText;
      line.textContent = getTerraformingSummaryText(
        'statusLine',
        '{label}: {status} {targetText}',
        {
          label: status.label,
          status: getTerraformingStatusIcon(status.passed),
          targetText,
        }
      );
      if (!status.passed) {
        line.style.color = 'red';
      }
      container.appendChild(line);
    });
  }

  // Function to create the magnetosphere box, with conditional text based on boolean flag
  function createMagnetosphereBox(row) {
    const magnetosphereBox = document.createElement('div');
    magnetosphereBox.classList.add('terraforming-box');
    magnetosphereBox.id = 'magnetosphere-box';
    const magInfo = document.createElement('span');
    magInfo.classList.add('info-tooltip-icon');
    const magTooltipText = getTerraformingSummaryText(
      'magnetosphere.tooltip',
      'The magnetosphere is a planet\'s magnetic shield against harmful solar wind and cosmic radiation.'
    );
    const magTooltip = attachDynamicInfoTooltip(magInfo, magTooltipText);

    const protectedText = getTerraformingSummaryText(
      'magnetosphere.protectedText',
      'The planet is sufficiently protected, providing a 50% boost to life growth'
    );
    const artificialSkyProtectedText = getTerraformingSummaryText(
      'magnetosphere.artificialSkyProtectedText',
      'The planet is sufficiently protected by the Artificial Sky'
    );
    const hasArtificialSkyShield = projectManager?.projects?.artificialSky?.isCompleted;
    const hasMagnetosphere = terraforming.celestialParameters.hasNaturalMagnetosphere
      || terraforming.isBooleanFlagSet('magneticShield')
      || hasArtificialSkyShield;
    const magnetosphereStatusText = terraforming.celestialParameters.hasNaturalMagnetosphere
      ? getTerraformingSummaryText(
          'magnetosphere.statuses.naturalProtected',
          'Natural magnetosphere: {text}',
          { text: protectedText }
        )
      : terraforming.isBooleanFlagSet('magneticShield')
        ? getTerraformingSummaryText(
            'magnetosphere.statuses.artificialProtected',
            'Artificial magnetosphere: {text}',
            { text: protectedText }
          )
        : hasArtificialSkyShield
          ? getTerraformingSummaryText(
              'magnetosphere.statuses.artificialSkyProtected',
              'Artificial Sky shield: {text}',
              { text: artificialSkyProtectedText }
            )
        : getTerraformingSummaryText('magnetosphere.statuses.none', 'No magnetosphere');

      const orbRad = terraforming.orbitalRadiation || 0;
      const rad = terraforming.surfaceRadiation || 0;
      const radPenalty = getDisplayedRadiationPenalty(hasMagnetosphere);
      const gravityValue = Number.isFinite(terraforming.celestialParameters.gravity)
        ? terraforming.celestialParameters.gravity
        : 0;
      const gravityPenaltyData = terraforming.gravityCostPenalty || { multiplier: 1 };
      const equatorialGravity = Number.isFinite(terraforming.apparentEquatorialGravity)
        ? terraforming.apparentEquatorialGravity
        : gravityValue;
      const shouldShowEquatorialGravity = gravityValue > 10;
      const equatorialGravityRowStyle = shouldShowEquatorialGravity ? '' : ' style="display: none;"';
      const gravityPenaltyMultiplier = Number.isFinite(gravityPenaltyData.multiplier)
        ? gravityPenaltyData.multiplier
        : 1;
      const gravityPenaltyPercent = (gravityPenaltyMultiplier - 1) * 100;
      const gravityPenaltyText = gravityPenaltyMultiplier > 1
        ? getTerraformingSummaryText(
            'magnetosphere.labels.gravityBuildCost',
            '+{value}% build cost',
            { value: formatNumber(gravityPenaltyPercent, false, 2) }
          )
        : '';

    magnetosphereBox.innerHTML = `
      <h3>${terraforming.magnetosphere.name}</h3>
      <p>${getTerraformingSummaryText('magnetosphere.labels.magnetosphere', 'Magnetosphere')}: <span id="magnetosphere-status">${magnetosphereStatusText}</span></p>
        <p>${getTerraformingSummaryText('magnetosphere.labels.orbitalRadiation', 'Orbital radiation')}: <span id="orbital-radiation">${formatRadiation(orbRad)}</span> mSv/day</p>
        <p>${getTerraformingSummaryText('magnetosphere.labels.surfaceRadiation', 'Surface radiation')}: <span id="surface-radiation">${formatRadiation(rad)}</span> mSv/day</p>
        <p id="radiation-penalty-row">${getTerraformingSummaryText('magnetosphere.labels.radiationPenalty', 'Radiation penalty')}: <span id="surface-radiation-penalty">${formatNumber(radPenalty * 100, false, 0)}</span>%</p>
        <p>${getTerraformingSummaryText('magnetosphere.labels.gravity', 'Gravity')}: <span id="terraforming-gravity-value">${formatNumber(gravityValue, false, 2)}</span> m/s²</p>
        <p id="terraforming-equatorial-gravity-row"${equatorialGravityRowStyle}>${getTerraformingSummaryText('magnetosphere.labels.equatorialGravity', 'Equatorial gravity')}<span class="info-tooltip-icon" title="${EQUATORIAL_GRAVITY_TOOLTIP_TEXT}">&#9432;</span> : <span id="terraforming-equatorial-gravity-value">${formatNumber(equatorialGravity, false, 2)}</span> m/s²</p>
        <p id="gravity-penalty-row">${getTerraformingSummaryText('magnetosphere.labels.gravityPenalty', 'Gravity penalty')}<span class="info-tooltip-icon" title="${GRAVITY_PENALTY_TOOLTIP_TEXT}">&#9432;</span> : <span id="terraforming-gravity-penalty">${gravityPenaltyText}</span></p>
        <div id="others-extra-requirements"></div>
      `;
    if (!hasMagnetosphere && (radPenalty || 0) < 0.0001) {
      const penaltyRow = magnetosphereBox.querySelector('#radiation-penalty-row');
      if (penaltyRow) penaltyRow.style.display = 'none';
    }
    if (gravityPenaltyMultiplier <= 1) {
      const gravityPenaltyRow = magnetosphereBox.querySelector('#gravity-penalty-row');
      if (gravityPenaltyRow) gravityPenaltyRow.style.display = 'none';
    }
    const magnetosphereHeading = magnetosphereBox.querySelector('h3');
    if (magnetosphereHeading) {
      magnetosphereHeading.appendChild(magInfo);
    }
    const equatorialGravityInfo = magnetosphereBox.querySelector('#terraforming-equatorial-gravity-row .info-tooltip-icon');
    const equatorialGravityTooltip = attachDynamicInfoTooltip(
      equatorialGravityInfo,
      EQUATORIAL_GRAVITY_TOOLTIP_TEXT
    );

    row.appendChild(magnetosphereBox);
    terraformingUICache.magnetosphere = {
      info: magInfo,
      infoTooltip: magTooltip,
      box: magnetosphereBox,
      status: magnetosphereBox.querySelector('#magnetosphere-status'),
      surfaceRadiation: magnetosphereBox.querySelector('#surface-radiation'),
      orbitalRadiation: magnetosphereBox.querySelector('#orbital-radiation'),
      surfaceRadiationPenalty: magnetosphereBox.querySelector('#surface-radiation-penalty'),
      gravityValue: magnetosphereBox.querySelector('#terraforming-gravity-value'),
      equatorialGravityRow: magnetosphereBox.querySelector('#terraforming-equatorial-gravity-row'),
      equatorialGravityValue: magnetosphereBox.querySelector('#terraforming-equatorial-gravity-value'),
      equatorialGravityTooltip,
      gravityPenaltyRow: magnetosphereBox.querySelector('#gravity-penalty-row'),
      gravityPenaltyValue: magnetosphereBox.querySelector('#terraforming-gravity-penalty'),
      otherRequirements: magnetosphereBox.querySelector('#others-extra-requirements')
    };
    updateOtherRequirementStatuses(terraformingUICache.magnetosphere);
  }

  // Function to update the magnetosphere box with the latest values
  function updateMagnetosphereBox() {
    const els = terraformingUICache.magnetosphere;
    const magnetosphereBox = els.box;
    if (!magnetosphereBox) return;
    const magnetosphereStatus = els.status;
    const surfaceRadiation = els.surfaceRadiation;
    const orbitalRadiation = els.orbitalRadiation;
    const surfaceRadiationPenalty = els.surfaceRadiationPenalty;
    const gravityValue = els.gravityValue;
    const equatorialGravityRow = els.equatorialGravityRow;
    const equatorialGravityValue = els.equatorialGravityValue;
    const gravityPenaltyRow = els.gravityPenaltyRow;
    const gravityPenaltyValue = els.gravityPenaltyValue;

    // Update status based on natural or artificial magnetosphere
    const hasArtificialSkyShield = projectManager?.projects?.artificialSky?.isCompleted;
    const hasMagnetosphere = terraforming.celestialParameters.hasNaturalMagnetosphere
      || terraforming.isBooleanFlagSet('magneticShield')
      || hasArtificialSkyShield;
    const magnetosphereStatusText = terraforming.celestialParameters.hasNaturalMagnetosphere
      ? getTerraformingSummaryText('magnetosphere.statuses.natural', 'Natural magnetosphere')
      : terraforming.isBooleanFlagSet('magneticShield')
        ? getTerraformingSummaryText('magnetosphere.statuses.artificial', 'Artificial magnetosphere')
        : hasArtificialSkyShield
          ? getTerraformingSummaryText('magnetosphere.statuses.artificialSky', 'Artificial Sky shield')
        : getTerraformingSummaryText('magnetosphere.statuses.none', 'No magnetosphere');

    if (magnetosphereStatus) {
      magnetosphereStatus.textContent = magnetosphereStatusText;
    }

    if (orbitalRadiation) {
      orbitalRadiation.textContent = formatRadiation(terraforming.orbitalRadiation || 0);
    }
    if (surfaceRadiation) {
      surfaceRadiation.textContent = formatRadiation(terraforming.surfaceRadiation || 0);
    }
    if (surfaceRadiationPenalty) {
      const penaltyRow = surfaceRadiationPenalty.parentElement;
      const penaltyValue = getDisplayedRadiationPenalty(hasMagnetosphere);
      if (!hasMagnetosphere && penaltyValue < 0.0001) {
        penaltyRow.style.display = 'none';
      } else {
        penaltyRow.style.display = '';
        surfaceRadiationPenalty.textContent = formatNumber(penaltyValue * 100, false, 0);
      }
    }

    let gravity = 0;
    if (Number.isFinite(terraforming.celestialParameters.gravity)) {
      gravity = terraforming.celestialParameters.gravity;
    }
    if (gravityValue) {
      gravityValue.textContent = formatNumber(gravity, false, 2);
    }
    if (equatorialGravityRow) {
      if (gravity > 10) {
        equatorialGravityRow.style.display = '';
        if (equatorialGravityValue) {
          const equatorialValue = Number.isFinite(terraforming.apparentEquatorialGravity)
            ? terraforming.apparentEquatorialGravity
            : gravity;
          equatorialGravityValue.textContent = formatNumber(equatorialValue, false, 2);
        }
      } else {
        equatorialGravityRow.style.display = 'none';
      }
    }

    if (gravityPenaltyRow && gravityPenaltyValue) {
      let penaltyMultiplier = 1;
      const penaltyData = terraforming.gravityCostPenalty;
      if (penaltyData && Number.isFinite(penaltyData.multiplier)) {
        penaltyMultiplier = penaltyData.multiplier;
      }
      if (penaltyMultiplier > 1) {
        gravityPenaltyRow.style.display = '';
        const percent = (penaltyMultiplier - 1) * 100;
        gravityPenaltyValue.textContent = getTerraformingSummaryText(
          'magnetosphere.labels.gravityBuildCost',
          '+{value}% build cost',
          { value: formatNumber(percent, false, 2) }
        );
      } else {
        gravityPenaltyRow.style.display = 'none';
        gravityPenaltyValue.textContent = '';
      }
    }

    updateOtherRequirementStatuses(els);
    magnetosphereBox.style.borderColor = terraforming.getOthersStatus() ? 'green' : 'red';
  }
  
  function buildAlbedoTable() {
    const baseAlb = terraforming.celestialParameters.albedo;
    const defaults = (typeof DEFAULT_SURFACE_ALBEDO !== 'undefined') ? DEFAULT_SURFACE_ALBEDO : {
      ocean: 0.06,
      ice: 0.65,
      snow: 0.85,
      co2_ice: 0.50,
      hydrocarbon: 0.10,
      hydrocarbonIce: 0.50,
      hydrogen: 0.08,
      fineSand: 0.45,
      biomass: 0.20
    };
    return [
      [
        getTerraformingSummaryText('luminosity.albedoTable.surface', 'Surface'),
        getTerraformingSummaryText('luminosity.albedoTable.albedo', 'Albedo')
      ],
      [getTerraformingSummaryText('luminosity.albedoTable.baseRock', 'Base rock'), baseAlb.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.blackDust', 'Black dust'), '0.05'],
      [getTerraformingSummaryText('luminosity.albedoTable.ocean', 'Ocean'), defaults.ocean.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.ice', 'Ice'), defaults.ice.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.snow', 'Snow'), defaults.snow.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.dryIce', 'Dry Ice'), defaults.co2_ice.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.hydrocarbon', 'Hydrocarbon'), defaults.hydrocarbon.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.hydrocarbonIce', 'Hydrocarbon Ice'), defaults.hydrocarbonIce.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.hydrogen', 'Liquid Hydrogen'), defaults.hydrogen.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.fineSand', 'Fine Sand'), defaults.fineSand.toFixed(2)],
      [getTerraformingSummaryText('luminosity.albedoTable.biomass', 'Biomass'), defaults.biomass.toFixed(2)]
    ];
  }

  function getLuminosityTooltipText() {
    const table = buildAlbedoTable();
    const albLines = table.map(row => row.join(' | ')).join('\n');
    return `${getTerraformingSummaryText(
      'luminosity.tooltipIntro',
      'Luminosity measures the total solar energy reaching the planet\'s surface, which is the primary driver of climate.\n\nAlbedo values:'
    )}\n${albLines}`;
  }

  //Luminosity
  function createLuminosityBox(row) {
    const luminosityBox = document.createElement('div');
    luminosityBox.classList.add('terraforming-box');
    luminosityBox.id = 'luminosity-box';
    const lumInfo = document.createElement('span');
    lumInfo.classList.add('info-tooltip-icon');
    lumInfo.id = 'luminosity-tooltip';
    const lumTooltipText = getLuminosityTooltipText();
    const lumTooltip = attachDynamicInfoTooltip(lumInfo, lumTooltipText);
    const cloudHazeInfo = document.createElement('span');
    cloudHazeInfo.classList.add('info-tooltip-icon');
    cloudHazeInfo.id = 'cloud-haze-info';
    const cloudHazeTooltip = attachDynamicInfoTooltip(cloudHazeInfo, CLOUD_AND_HAZE_TOOLTIP_TEXT);
    luminosityBox.innerHTML = `
      <h3>${terraforming.luminosity.name}</h3>
      <table>
        <thead>
          <tr>
            <th>${getTerraformingSummaryText('luminosity.labels.parameter', 'Parameter')}</th>
            <th>${getTerraformingSummaryText('luminosity.labels.value', 'Value')}</th>
            <th>${getTerraformingSummaryText('luminosity.labels.delta', 'Delta')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${getTerraformingSummaryText('luminosity.labels.groundAlbedo', 'Ground Albedo')} <span id="ground-albedo-info" class="info-tooltip-icon">&#9432;<span id="ground-albedo-tooltip" class="resource-tooltip"></span></span></td>
            <td><span id="ground-albedo">${(terraforming.luminosity.groundAlbedo ?? 0).toFixed(3)}</span></td>
            <td><span id="ground-albedo-delta"></span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('luminosity.labels.surfaceAlbedo', 'Surface Albedo')} <span id="surface-albedo-info" class="info-tooltip-icon">&#9432;<span id="surface-albedo-tooltip" class="resource-tooltip"></span></span></td>
            <td><span id="surface-albedo">${(terraforming.luminosity.surfaceAlbedo ?? 0).toFixed(3)}</span></td>
            <td><span id="surface-albedo-delta"></span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('luminosity.labels.cloudHaze', 'Cloud & Haze')}<span id="cloud-haze-info-placeholder"></span></td>
            <td><span id="cloud-haze-penalty">${terraforming.luminosity.cloudHazePenalty.toFixed(3)}</span></td>
            <td></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('luminosity.labels.actualAlbedo', 'Actual Albedo')} <span id="actual-albedo-info" class="info-tooltip-icon">&#9432;<span id="actual-albedo-tooltip" class="resource-tooltip"></span></span></td>
            <td><span id="actual-albedo">${(terraforming.luminosity.actualAlbedo ?? 0).toFixed(3)}</span></td>
            <td><span id="actual-albedo-delta"></span></td>
          </tr>
          <tr>
            <td>${getTerraformingSummaryText('luminosity.labels.surfaceSolarFlux', 'Surface Solar Flux (W/m²)')}</td>
            <td><span id="modified-solar-flux">${terraforming.luminosity.modifiedSolarFlux.toFixed(1)}</span><span id="solar-flux-info" class="info-tooltip-icon">&#9432;<span id="solar-flux-tooltip" class="resource-tooltip"></span></span></td>
            <td><span id="solar-flux-delta"></span></td>
          </tr>
        </tbody>
      </table>
      <p>${getTerraformingSummaryText('luminosity.labels.solarPanelMultiplier', 'Solar panel multiplier')}: <span id="solar-panel-multiplier">${(terraforming.calculateSolarPanelMultiplier()*100).toFixed(2)}</span>%</p>
    `;
    const luminosityHeading = luminosityBox.querySelector('h3');
    if (luminosityHeading) {
      luminosityHeading.appendChild(lumInfo);
    }
    const cloudHazePlaceholder = luminosityBox.querySelector('#cloud-haze-info-placeholder');
    if (cloudHazePlaceholder && cloudHazePlaceholder.parentNode) {
      cloudHazePlaceholder.replaceWith(cloudHazeInfo);
    }
    row.appendChild(luminosityBox);

    const targetSpan = document.createElement('span');
    targetSpan.textContent = formatTerraformingTargetText(
      getTerraformingSummaryText(
        'luminosity.target',
        'Surface solar flux between {min} and {max}.',
        {
          min: formatNumber(terraforming.luminosity.targetMin, false, 1),
          max: formatNumber(terraforming.luminosity.targetMax, false, 1),
        }
      )
    );
    targetSpan.style.marginTop = 'auto';
    targetSpan.classList.add('terraforming-target')
    luminosityBox.appendChild(targetSpan);
    terraformingUICache.luminosity = {
      info: lumInfo,
      infoTooltip: lumTooltip,
      box: luminosityBox,
      groundAlbedo: luminosityBox.querySelector('#ground-albedo'),
      groundAlbedoDelta: luminosityBox.querySelector('#ground-albedo-delta'),
      groundAlbedoInfo: luminosityBox.querySelector('#ground-albedo-info'),
      groundAlbedoTooltip: luminosityBox.querySelector('#ground-albedo-tooltip'),
      surfaceAlbedo: luminosityBox.querySelector('#surface-albedo'),
      surfaceAlbedoDelta: luminosityBox.querySelector('#surface-albedo-delta'),
      surfaceAlbedoInfo: luminosityBox.querySelector('#surface-albedo-info'),
      surfaceAlbedoTooltip: luminosityBox.querySelector('#surface-albedo-tooltip'),
      actualAlbedo: luminosityBox.querySelector('#actual-albedo'),
      actualAlbedoDelta: luminosityBox.querySelector('#actual-albedo-delta'),
      actualAlbedoInfo: luminosityBox.querySelector('#actual-albedo-info'),
      actualAlbedoTooltip: luminosityBox.querySelector('#actual-albedo-tooltip'),
      cloudHazeInfo,
      cloudHazeTooltip,
      cloudHazePenalty: luminosityBox.querySelector('#cloud-haze-penalty'),
      modifiedSolarFlux: luminosityBox.querySelector('#modified-solar-flux'),
      solarFluxDelta: luminosityBox.querySelector('#solar-flux-delta'),
      solarFluxInfo: luminosityBox.querySelector('#solar-flux-info'),
      solarFluxTooltip: luminosityBox.querySelector('#solar-flux-tooltip'),
      mainTooltip: lumTooltip,
      solarPanelMultiplier: luminosityBox.querySelector('#solar-panel-multiplier'),
      target: luminosityBox.querySelector('.terraforming-target'),
      tooltips: {
        ground: '',
        surface: '',
        actual: '',
        solarFlux: '',
        main: ''
      }
    };
    const els = terraformingUICache.luminosity;
    if (typeof addTooltipHover === 'function') {
      addTooltipHover(els.groundAlbedoInfo, els.groundAlbedoTooltip, { clickToPin: true });
      addTooltipHover(els.surfaceAlbedoInfo, els.surfaceAlbedoTooltip, { clickToPin: true });
      addTooltipHover(els.actualAlbedoInfo, els.actualAlbedoTooltip, { clickToPin: true });
      addTooltipHover(els.solarFluxInfo, els.solarFluxTooltip, { clickToPin: true });
    }
  }
  
  function updateLuminosityBox() {
    const els = terraformingUICache.luminosity;
    const luminosityBox = els.box;
    if (!luminosityBox) return;
    luminosityBox.style.borderColor = terraforming.getLuminosityStatus() ? 'green' : 'red';

    if (els.target) {
      els.target.textContent = formatTerraformingTargetText(
        getTerraformingSummaryText(
          'luminosity.target',
          'Surface solar flux between {min} and {max}.',
          {
            min: formatNumber(terraforming.luminosity.targetMin, false, 1),
            max: formatNumber(terraforming.luminosity.targetMax, false, 1),
          }
        )
      );
    }

    if (els.groundAlbedo) {
      els.groundAlbedo.textContent = terraforming.luminosity.groundAlbedo.toFixed(3);
    }

    if (els.groundAlbedoDelta) {
      const d = terraforming.luminosity.groundAlbedo - terraforming.celestialParameters.albedo;
      els.groundAlbedoDelta.textContent = `${d >= 0 ? '+' : ''}${formatNumber(d, false, 3)}`;
    }
    if (els.groundAlbedoTooltip) {
      const base = terraforming.celestialParameters.albedo;
      const area = terraforming.celestialParameters.surfaceArea || 1;
      const special = (typeof resources !== 'undefined' && resources.special) ? resources.special : {};
      const black = (special.albedoUpgrades && typeof special.albedoUpgrades.value === 'number')
        ? special.albedoUpgrades.value : 0;
      const white = (special.whiteDust && typeof special.whiteDust.value === 'number')
        ? special.whiteDust.value : 0;

      const bRatioRaw = area > 0 ? Math.max(0, black / area) : 0;
      const wRatioRaw = area > 0 ? Math.max(0, white / area) : 0;
      const totalApplied = Math.min(bRatioRaw + wRatioRaw, 1);
      let shareBlack = 0, shareWhite = 0;
      if (totalApplied > 0) {
        const sumRaw = bRatioRaw + wRatioRaw;
        shareWhite = (wRatioRaw / sumRaw) * totalApplied;
        shareBlack = totalApplied - shareWhite;
      }

      const blackAlbedo = dustFactorySettings.dustColorAlbedo;
      const whiteAlbedo = 0.8;
      const lines = [
        getTerraformingSummaryText('luminosity.groundTooltip.base', 'Base: {value}', { value: base.toFixed(3) }),
        getTerraformingSummaryText('luminosity.groundTooltip.blackDustAlbedo', 'Black dust albedo: {value}', { value: blackAlbedo.toFixed(3) }),
        getTerraformingSummaryText('luminosity.groundTooltip.blackDustColor', 'Black dust color: {value}', { value: dustFactorySettings.dustColor.toUpperCase() }),
      ];
      if (shareBlack > 0) {
        lines.push(getTerraformingSummaryText('luminosity.groundTooltip.blackDustCoverage', 'Black dust coverage: {value}%', { value: (shareBlack * 100).toFixed(1) }));
      }
      lines.push(getTerraformingSummaryText('luminosity.groundTooltip.whiteDustAlbedo', 'White dust albedo: {value}', { value: whiteAlbedo.toFixed(3) }));
      if (shareWhite > 0) {
        lines.push(getTerraformingSummaryText('luminosity.groundTooltip.whiteDustCoverage', 'White dust coverage: {value}%', { value: (shareWhite * 100).toFixed(1) }));
      }
      setTooltipText(els.groundAlbedoTooltip, lines.join('\n'), els.tooltips, 'ground');
    }

    if (els.surfaceAlbedo) {
      els.surfaceAlbedo.textContent = terraforming.luminosity.surfaceAlbedo.toFixed(3);
    }
    if (els.surfaceAlbedoDelta) {
      const base = (terraforming.luminosity.initialSurfaceAlbedo !== undefined)
        ? terraforming.luminosity.initialSurfaceAlbedo
        : terraforming.luminosity.groundAlbedo;
      const d = terraforming.luminosity.surfaceAlbedo - base;
      els.surfaceAlbedoDelta.textContent = `${d >= 0 ? '+' : ''}${formatNumber(d, false, 3)}`;
    }
    if (els.surfaceAlbedoTooltip) {
      const lines = [getTerraformingSummaryText('luminosity.surfaceTooltip.compositionByZone', 'Surface composition by zone')];
      const pct = v => (v * 100).toFixed(1);
      const isZeroPct = v => Math.abs(v * 100) < 0.05; // hide values that would display as 0.0%

      for (const z of getZones()) {
        const fr = calculateZonalSurfaceFractions(terraforming, z);
        const rock = Math.max(1 - (fr.ocean + fr.ice + fr.hydrocarbon + fr.hydrocarbonIce + fr.co2_ice + fr.hydrogen + fr.ammonia + fr.ammoniaIce + fr.oxygen + fr.oxygenIce + fr.nitrogen + fr.nitrogenIce + fr.fineSand + fr.biomass), 0);
        const name = getTerraformingZoneLabel(z);
        lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.zoneHeader', '{name}:', { name }));

        if (!isZeroPct(rock)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('rock', 'Rock'), value: pct(rock) }));
        if (!isZeroPct(fr.ocean)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('water', 'Water'), value: pct(fr.ocean) }));
        if (!isZeroPct(fr.ice)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('ice', 'Ice'), value: pct(fr.ice) }));
        if (!isZeroPct(fr.hydrocarbon)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('hydrocarbon', 'Hydrocarbons'), value: pct(fr.hydrocarbon) }));
        if (!isZeroPct(fr.hydrocarbonIce)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('hydrocarbonIce', 'Hydrocarbon Ice'), value: pct(fr.hydrocarbonIce) }));
        if (!isZeroPct(fr.hydrogen)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('hydrogen', 'Liquid Hydrogen'), value: pct(fr.hydrogen) }));
        if (!isZeroPct(fr.fineSand)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('fineSand', 'Fine Sand'), value: pct(fr.fineSand) }));
        if (!isZeroPct(fr.co2_ice)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('dryIce', 'Dry Ice'), value: pct(fr.co2_ice) }));
        if (!isZeroPct(fr.ammonia)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('ammonia', 'Ammonia'), value: pct(fr.ammonia) }));
        if (!isZeroPct(fr.ammoniaIce)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('ammoniaIce', 'Ammonia Ice'), value: pct(fr.ammoniaIce) }));
        if (!isZeroPct(fr.oxygen)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('oxygen', 'Oxygen'), value: pct(fr.oxygen) }));
        if (!isZeroPct(fr.oxygenIce)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('oxygenIce', 'Oxygen Ice'), value: pct(fr.oxygenIce) }));
        if (!isZeroPct(fr.nitrogen)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('nitrogen', 'Nitrogen'), value: pct(fr.nitrogen) }));
        if (!isZeroPct(fr.nitrogenIce)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('nitrogenIce', 'Nitrogen Ice'), value: pct(fr.nitrogenIce) }));
        if (!isZeroPct(fr.biomass)) lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.coverageEntry', '  {label}: {value}%', { label: getTerraformingSummaryResourceLabel('biomass', 'Biomass'), value: pct(fr.biomass) }));
        lines.push('');
      }

      // Guidance text
      lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.liquidsAndIces', 'Liquids and ices split the available surface together, scaling proportionally if their total would overflow.'));
      lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.biomassLimit', 'Biomass can then occupy up to 75% of the remaining area, limited by local biomass coverage.'));
      lines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.unclaimedSurface', 'Any unclaimed surface remains exposed rock or dust for albedo calculations.'));

      // Append resulting surface albedo per zone
      const zoneAlbLines = [];
      for (const z of getZones()) {
        try {
          const zSurf = (typeof terraforming.calculateZonalSurfaceAlbedo === 'function')
            ? terraforming.calculateZonalSurfaceAlbedo(z)
            : terraforming.luminosity.surfaceAlbedo;
          zoneAlbLines.push(getTerraformingSummaryText('luminosity.surfaceTooltip.zonalSurfaceAlbedoEntry', '{name}: {value}', { name: getTerraformingZoneLabel(z), value: zSurf.toFixed(3) }));
        } catch (_) {
          // Skip zone if calculation fails
        }
      }
      if (zoneAlbLines.length > 0) {
        lines.push('', getTerraformingSummaryText('luminosity.surfaceTooltip.zonalSurfaceAlbedo', 'Zonal surface albedo:'));
        lines.push(...zoneAlbLines);
      }

      setTooltipText(els.surfaceAlbedoTooltip, lines.join('\n'), els.tooltips, 'surface');
    }

    if (els.actualAlbedo) {
      els.actualAlbedo.textContent = terraforming.luminosity.actualAlbedo.toFixed(3);
    }

    if (els.actualAlbedoDelta) {
      const base = (terraforming.luminosity.initialActualAlbedo !== undefined)
        ? terraforming.luminosity.initialActualAlbedo
        : terraforming.luminosity.actualAlbedo;
      const d = terraforming.luminosity.actualAlbedo - base;
      els.actualAlbedoDelta.textContent = `${d >= 0 ? '+' : ''}${formatNumber(d, false, 3)}`;
    }

    if (els.cloudHazePenalty) {
      const raw = Number.isFinite(terraforming.luminosity.cloudHazeRaw)
        ? terraforming.luminosity.cloudHazeRaw
        : terraforming.luminosity.cloudHazePenalty;
      els.cloudHazePenalty.textContent = raw.toFixed(3);
    }

    if (els.modifiedSolarFlux) {
      els.modifiedSolarFlux.textContent = terraforming.luminosity.modifiedSolarFlux.toFixed(1);
    }
    if (els.solarFluxDelta) {
      const baseFlux = (terraforming.luminosity.initialSolarFlux !== undefined)
        ? terraforming.luminosity.initialSolarFlux
        : terraforming.luminosity.solarFlux;
      const deltaF = terraforming.luminosity.modifiedSolarFlux - baseFlux;
      els.solarFluxDelta.textContent = `${deltaF >= 0 ? '+' : ''}${formatNumber(deltaF, false, 2)}`;
    }

    if (els.solarFluxTooltip && terraforming.luminosity.zonalFluxes) {
      const z = terraforming.luminosity.zonalFluxes;
      const isRingworld = currentPlanetParameters?.classification?.type === 'ring';
      const lines = [getTerraformingSummaryText('luminosity.solarFluxTooltip.averageByZone', 'Average Solar Flux by zone')];
      getZones().forEach(zone => {
        const flux = isRingworld
          ? terraforming.luminosity.solarFlux * getZoneRatio(zone)
          : (z[zone] || 0) / 4;
        lines.push(getTerraformingSummaryText('luminosity.solarFluxTooltip.zoneFlux', '{label}: {value}', { label: getTerraformingZoneLabel(zone), value: flux.toFixed(1) }));
      });
      lines.push(
        '',
        isRingworld
          ? getTerraformingSummaryText('luminosity.solarFluxTooltip.ringworldExplanation', 'Modified solar flux uses the tropical zone flux multiplied by its day ratio.')
          : getTerraformingSummaryText('luminosity.solarFluxTooltip.standardExplanation', 'Modified solar flux is 4× the average across all zones.'),
        getTerraformingSummaryText('luminosity.solarFluxTooltip.surfaceFluxExplanation', 'Surface Solar Flux is the solar energy that reaches the ground. It is calculated from modified solar flux and then reduced by Cloud & Haze penalty.')
      );
      setTooltipText(els.solarFluxTooltip, lines.join('\n'), els.tooltips, 'solarFlux');
    }

    if (els.mainTooltip) {
      setTooltipText(els.mainTooltip, getLuminosityTooltipText(), els.tooltips, 'main');
    }

    if (els.solarPanelMultiplier) {
      els.solarPanelMultiplier.textContent = `${(terraforming.calculateSolarPanelMultiplier()*100).toFixed(2)}`;
    }

    // Rebuild Actual Albedo tooltip to omit zero-value lines
    if (els && els.actualAlbedoTooltip) {
      setActualAlbedoTooltipCompact();
    }
  }

  // Build the Actual Albedo tooltip without any zero-value lines
  function setActualAlbedoTooltipCompact() {
    const els = terraformingUICache.luminosity || {};
    const node = els.actualAlbedoTooltip;
    if (!node) return;
    try {
      const surfAlb = terraforming.luminosity.surfaceAlbedo;
      const pressureBar = (typeof terraforming.calculateTotalPressure === 'function') ? (terraforming.calculateTotalPressure() / 100) : 0;
      const gSurface = terraforming.celestialParameters.gravity || 9.81;
      const compInfo = (typeof terraforming.calculateAtmosphericComposition === 'function') ? terraforming.calculateAtmosphericComposition() : { composition: {} };
      const composition = compInfo.composition || {};
      // Build shortwave aerosol columns (kg/m^2)
      const aerosolsSW = {};
      const radius_km = terraforming.celestialParameters.radius || 0;
      const area_m2 = 4 * Math.PI * Math.pow(radius_km * 1000, 2);
      if (terraforming.resources && terraforming.resources.atmospheric && terraforming.resources.atmospheric.calciteAerosol) {
        const mass_ton = terraforming.resources.atmospheric.calciteAerosol.value || 0;
        const column = area_m2 > 0 ? (mass_ton * 1000) / area_m2 : 0;
        aerosolsSW.calcite = column;
      }

      const result = calculateActualAlbedoPhysics(surfAlb, pressureBar, composition, gSurface, aerosolsSW) || {};
      const comps = result.components || {};
      const diags = result.diagnostics || {};
      const maxCap = result.maxCap;
      const softCapThreshold = result.softCapThreshold;

      const A_surf = typeof comps.A_surf === 'number' ? comps.A_surf : surfAlb;
      const dHaze = typeof comps.dA_ch4 === 'number' ? comps.dA_ch4 : 0;
      const dCalc = typeof comps.dA_calcite === 'number' ? comps.dA_calcite : 0;
      const dCloud = typeof comps.dA_cloud === 'number' ? comps.dA_cloud : 0;
      const A_act = terraforming.luminosity.actualAlbedo;
      const cappedNote = (typeof maxCap === 'number' && A_act >= (maxCap - 1e-6))
        ? `\n${getTerraformingSummaryText('luminosity.actualTooltip.cappedAt', '(Capped at {value})', { value: maxCap.toFixed(3) })}`
        : '';
      const softCapNote = (typeof softCapThreshold === 'number')
        ? `\n${getTerraformingSummaryText('luminosity.actualTooltip.softCap', '(Soft cap reduces additions above {value})', { value: softCapThreshold.toFixed(3) })}`
        : '';

      const tauH = diags.tau_ch4_sw ?? 0;
      const tauC = diags.tau_calcite_sw ?? 0;

      const eps = 5e-4; // hide values that would display as 0.000
      const notes = [];
      if (cappedNote) notes.push(cappedNote.slice(1));
      if (softCapNote) notes.push(softCapNote.slice(1));

      const parts = [];
      parts.push(getTerraformingSummaryText('luminosity.actualTooltip.intro', 'Actual albedo applies each layer to the remaining headroom: Surface -> Clouds -> Haze -> Calcite'));
      parts.push('');
      parts.push(getTerraformingSummaryText('luminosity.actualTooltip.surfaceBase', 'Surface (base): {value}', { value: A_surf.toFixed(3) }));
      if (Math.abs(dCloud) >= eps) parts.push(getTerraformingSummaryText('luminosity.actualTooltip.clouds', 'Clouds: {value}', { value: (1 - A_surf) <= 0 ? '+0.000' : `+${dCloud.toFixed(3)}` }));
      const afterClouds = A_surf + dCloud;
      if (Math.abs(dHaze) >= eps) parts.push(getTerraformingSummaryText('luminosity.actualTooltip.haze', 'Haze (CH4): {value}', { value: (1 - afterClouds) <= 0 ? '+0.000' : `+${dHaze.toFixed(3)}` }));
      const afterHaze = afterClouds + dHaze;
      if (Math.abs(dCalc) >= eps) parts.push(getTerraformingSummaryText('luminosity.actualTooltip.calcite', 'Calcite aerosol: {value}', { value: (1 - afterHaze) <= 0 ? '+0.000' : `+${dCalc.toFixed(3)}` }));
      if (notes.length > 0) {
        parts.push('', ...notes);
      }

      const zoneLines = [];
      for (const z of getZones()) {
        try {
          const zSurf = (typeof terraforming.calculateZonalSurfaceAlbedo === 'function')
            ? terraforming.calculateZonalSurfaceAlbedo(z)
            : surfAlb;
          const zRes = calculateActualAlbedoPhysics(zSurf, pressureBar, composition, gSurface, aerosolsSW) || {};
          const zAlb = typeof zRes.albedo === 'number' ? zRes.albedo : (A_act);
          zoneLines.push(getTerraformingSummaryText('luminosity.actualTooltip.byZoneEntry', '{name}: {value}', { name: getTerraformingZoneLabel(z), value: zAlb.toFixed(3) }));
        } catch (err) {
          // Skip zone if calculation fails
        }
      }
      if (zoneLines.length > 0) {
        parts.push('', getTerraformingSummaryText('luminosity.actualTooltip.byZone', 'By zone:'));
        parts.push(...zoneLines);
      }

      const diag = [];
      if (Math.abs(tauH) >= eps) diag.push(getTerraformingSummaryText('luminosity.actualTooltip.methaneTau', '  CH4 haze tau: {value}', { value: tauH.toFixed(3) }));
      if (Math.abs(tauC) >= eps) diag.push(getTerraformingSummaryText('luminosity.actualTooltip.calciteTau', '  Calcite tau: {value}', { value: tauC.toFixed(3) }));
      if (diag.length > 0) {
        parts.push('', getTerraformingSummaryText('luminosity.actualTooltip.diagnosticHeader', 'Shortwave optical depths (diagnostic)'));
        parts.push(...diag);
      }
      setTooltipText(node, parts.join('\n'), els.tooltips, 'actual');
    } catch (e) {
      // Leave existing tooltip untouched on failure
    }
  }

// Function to create the "Complete Terraforming" button
  function createCompleteTerraformingButton(container) {
    const doc = (container && container.ownerDocument) || document;
    const button = doc.createElement('button');
  button.id = 'complete-terraforming-button';
  button.textContent = getTerraformingSummaryText(
    'actions.completeTerraforming',
    'Complete Terraforming'
  );
  button.style.width = '100%';
  button.style.padding = '15px';
  button.style.marginTop = '20px';
  button.style.backgroundColor = 'red';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.fontSize = '16px';
  button.style.cursor = 'not-allowed';
  button.disabled = true; // Initially disabled

    container.appendChild(button);
    if (terraformingUICache.summary) {
      terraformingUICache.summary.completeButton = button;
    }

    // Add an event listener for the button
    button.onclick = () => {
      const isBetterTime = fastestTerraformDays === null || playTimeSeconds < fastestTerraformDays;
      const sameTimeMissingReal = playTimeSeconds === fastestTerraformDays && fastestTerraformRealSeconds === null;
      const sameTimeBetterReal = playTimeSeconds === fastestTerraformDays
        && fastestTerraformRealSeconds !== null
        && realPlayTimeSeconds < fastestTerraformRealSeconds;
      if (isBetterTime || sameTimeMissingReal || sameTimeBetterReal) {
        fastestTerraformDays = playTimeSeconds;
        fastestTerraformRealSeconds = realPlayTimeSeconds;
      }
      terraforming.completed = true;
      if (typeof spaceManager !== 'undefined') {
        spaceManager.updateCurrentPlanetTerraformedStatus(true, {
          playTimeSeconds,
          realPlayTimeSeconds
        });
        spaceManager.grantDominionTerraformReward(terraforming.requirementId);
      }
      if (typeof updateSpaceUI === 'function') {
        updateSpaceUI();
      }
      if (typeof updateCompleteTerraformingButton === 'function') {
        updateCompleteTerraformingButton();
      }
      patienceManager.onTerraformingComplete();
      button.textContent = getTerraformingSummaryText(
        'actions.errorMtcNotResponding',
        'ERROR : MTC not responding'
      );
    };
}

  // Function to update the button state
  function updateCompleteTerraformingButton() {
    const summaryCache = terraformingUICache.summary;
    const button = summaryCache ? summaryCache.completeButton : null;

    if (!button) return;

  const isRingworld = currentPlanetParameters.classification?.type === 'ring';
  if (isRingworld) {
      const ringProject = projectManager.projects.ringworldTerraforming;
      if (!ringProject.isCompleted) {
          button.textContent = getTerraformingSummaryText(
            'actions.spinRingworldFirst',
            'Spin Ringworld first'
          );
          button.style.backgroundColor = 'red';
          button.style.cursor = 'not-allowed';
          button.disabled = true;
          return;
      }
  }

  const hazardsCleared = typeof terraforming.getHazardClearanceStatus === 'function'
    ? terraforming.getHazardClearanceStatus()
    : true;

  if (!hazardsCleared) {
      button.textContent = getTerraformingSummaryText(
        'actions.removeAllHazardsFirst',
        'Remove all hazards first'
      );
      button.style.backgroundColor = 'red';
      button.style.cursor = 'not-allowed';
      button.disabled = true;
      return;
  }

  const planetTerraformed = (typeof spaceManager !== 'undefined' &&
    typeof spaceManager.getCurrentPlanetKey === 'function' &&
    typeof spaceManager.isPlanetTerraformed === 'function' &&
    spaceManager.isPlanetTerraformed(spaceManager.getCurrentPlanetKey()));

  if (planetTerraformed) {
      button.textContent = getTerraformingSummaryText(
        'actions.errorMtcNotResponding',
        'ERROR : MTC not responding'
      );
      button.style.backgroundColor = 'gray';
      button.style.cursor = 'not-allowed';
      button.disabled = true;
      return;
  }

  if (terraforming.readyForCompletion) {
      button.style.backgroundColor = 'green';
      button.style.cursor = 'pointer';
      button.disabled = false; // Enable the button
      button.textContent = getTerraformingSummaryText(
        'actions.completeTerraforming',
        'Complete Terraforming'
      );
  } else {
      button.style.backgroundColor = 'red';
      button.style.cursor = 'not-allowed';
      button.disabled = true; // Disable the button
      button.textContent = getTerraformingSummaryText(
        'actions.completeTerraforming',
        'Complete Terraforming'
      );
  }
}

if (typeof window !== 'undefined') {
  window.getTerraformingSubtabManager = getTerraformingSubtabManager;
  window.isTerraformingWorldSubtabActive = isTerraformingWorldSubtabActive;
  window.handleTerraformingTabActivated = handleTerraformingTabActivated;
}

