
applyLanguageToGameData();

let defaultPlanet = 'mars';
let tabManager;
let currentPlanetParameters = getPlanetParameters(defaultPlanet);
Object.defineProperty(globalThis, 'currentPlanetParameters', {
  get: () => currentPlanetParameters,
  set: (v) => { currentPlanetParameters = v; },
  configurable: true,
});

let resources = {};
Object.defineProperty(globalThis, 'resources', {
  get: () => resources,
  set: (v) => { resources = v; },
  configurable: true,
});
let maintenanceFraction = currentPlanetParameters.buildingParameters.maintenanceFraction;
let shipEfficiency = 1;
let dayNightCycle;
let buildings = {};
Object.defineProperty(globalThis, 'buildings', {
  get: () => buildings,
  set: (value) => {
    buildings = value;
  },
  configurable: true,
});
let colonies = {};
let structures = {};
let populationModule;
let oreScanner = { saveState: () => ({}), loadState: () => {}, scanData: {} };
let projectManager;  // Use ProjectManager instead of individual projects
let storyStarted = false;  // Track if the story has been triggered
let terraforming;
let lifeDesigner;
let lifeManager;
let researchManager;
let fundingModule;
let spaceManager;
let automationManager;
let artificialManager;
let atlasManager;
let warpGateNetworkManager;
let isEquilibrating = false;
let autoTravelContext = {
  active: false,
  skipWorldVisualizerInitialization: false,
  suppressTabSwitch: false,
  restoreTabState: null
};
let autoTravelLoadingPopupElement = null;
let suppressPlanetVisualizerRuntime = false;
let planetVisualizerRuntimeFailed = false;
let planetVisualizerRuntimeFailureReason = '';

let gameSettings = {
  autosaveIntervalSeconds: 300,
  useCelsius: false,
  colorblindPalette: 'redGreen',
  darkMode: false,
  keepTabRunningAudio: false,
  enableTerraformingSubsteps: true,
  hideCompletedResearch: false,
  hideCompletedInvasions: true,
  hiddenResearchIds: [],
  silenceSolisAlert: false,
  silenceMilestoneAlert: false,
  silenceUnlockAlert: false,
  disableDayNightCycle: false,
  preserveProjectAutoStart: false,
  preserveProjectSettingsOnTravel: false,
  autobuildAlsoSetsActive: true,
  colonyUpgradeUnchecksAutobuild: false,
  roundBuildingConstruction: false,
  planetVisualizerDebugEnabled: false,
  keepHiddenStructuresOnTravel: false,
  keepHiddenResearchOnTravel: false,
  noSpecializationWarningOnTravel: false,
  alwaysDisableAutomationOnLoad: false,
  showSpaceStorageResources: false,
  showSpaceStorageInDefaultPanel: false,
  simplifyGoldenAsteroid: false,
  suppressFaith: false,
  disableFusionConsumptionScaling: false,
  scientificNotationThreshold: 1e30,
  pauseKeybind: 'Space',
};

Object.defineProperty(globalThis, 'gameSettings', {
  get: () => gameSettings,
  set: (value) => {
    if (Object(value) !== value) {
      return;
    }
    gameSettings = value;
    globalThis.planetVisualizerDebugEnabled = !!gameSettings.planetVisualizerDebugEnabled;
  },
  configurable: true,
});

globalThis.planetVisualizerDebugEnabled = gameSettings.planetVisualizerDebugEnabled;

const colorblindPalettes = {
  redGreen: {
    success: 'green',
    failure: 'red',
  },
  blueOrange: {
    success: '#0072b2',
    failure: '#e69f00',
  },
  purpleYellow: {
    success: '#7b3294',
    failure: '#fdb863',
  },
  cyanMagenta: {
    success: '#009e73',
    failure: '#d55e00',
  },
  grayscale: {
    success: '#111111',
    failure: '#777777',
  },
};

function getColorblindPaletteKey() {
  return colorblindPalettes[gameSettings.colorblindPalette]
    ? gameSettings.colorblindPalette
    : 'redGreen';
}

function getStatusColor(status) {
  const palette = colorblindPalettes[getColorblindPaletteKey()];
  return status === 'success' ? palette.success : palette.failure;
}

function getStatusProgressBackground(progressPercent) {
  return `linear-gradient(to right, ${getStatusColor('success')} ${progressPercent}%, #ccc ${progressPercent}%)`;
}

function applyColorblindPaletteSettings() {
  const root = document.documentElement;
  root.style.setProperty('--status-success-color', getStatusColor('success'));
  root.style.setProperty('--status-failure-color', getStatusColor('failure'));
}

applyColorblindPaletteSettings();
let globalEffects = new EffectableEntity({description : 'Manages global effects'});
let skillManager;
let solisManager;
let warpGateCommand;
let patienceManager;
let rwgManager;
let galaxyManager;
let galaxyInvasionManager;
let nanotechManager;
let followersManager;
let milestonesManager;
let playTimeSeconds = 0;
let totalPlayTimeSeconds = 0;
let realPlayTimeSeconds = 0;
let totalRealPlayTimeSeconds = 0;
let fastestTerraformDays = null;
let fastestTerraformRealSeconds = null;
let birchWorldTerraformTimeSeconds = null;
let birchWorldTerraformRealTimeSeconds = null;
let gameSpeed = 1;

Object.defineProperty(globalThis, 'galaxyManager', {
  get: () => galaxyManager,
  set: (value) => { galaxyManager = value; },
  configurable: true,
});

Object.defineProperty(globalThis, 'galaxyInvasionManager', {
  get: () => galaxyInvasionManager,
  set: (value) => { galaxyInvasionManager = value; },
  configurable: true,
});

Object.defineProperty(globalThis, 'artificialManager', {
  get: () => artificialManager,
  set: (value) => { artificialManager = value; },
  configurable: true,
});

Object.defineProperty(globalThis, 'atlasManager', {
  get: () => atlasManager,
  set: (value) => { atlasManager = value; },
  configurable: true,
});

Object.defineProperty(globalThis, 'isEquilibrating', {
  get: () => isEquilibrating,
  set: (value) => { isEquilibrating = !!value; },
  configurable: true,
});
