
let defaultPlanet = 'mars';
let tabManager;
let currentPlanetParameters = planetParameters[defaultPlanet];
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
let warpGateNetworkManager;
let isEquilibrating = false;

let gameSettings = {
  disableAutosave: false,
  useCelsius: false,
  darkMode: false,
  keepTabRunningAudio: false,
  hideCompletedResearch: false,
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
  simplifyGoldenAsteroid: false,
  scientificNotationThreshold: 1e30,
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
let globalEffects = new EffectableEntity({description : 'Manages global effects'});
let skillManager;
let solisManager;
let warpGateCommand;
let patienceManager;
let galaxyManager;
let nanotechManager;
let orbitalManager;
let playTimeSeconds = 0;
let totalPlayTimeSeconds = 0;
let realPlayTimeSeconds = 0;
let totalRealPlayTimeSeconds = 0;
let gameSpeed = 1;

Object.defineProperty(globalThis, 'galaxyManager', {
  get: () => galaxyManager,
  set: (value) => { galaxyManager = value; },
  configurable: true,
});

Object.defineProperty(globalThis, 'artificialManager', {
  get: () => artificialManager,
  set: (value) => { artificialManager = value; },
  configurable: true,
});

Object.defineProperty(globalThis, 'isEquilibrating', {
  get: () => isEquilibrating,
  set: (value) => { isEquilibrating = !!value; },
  configurable: true,
});
