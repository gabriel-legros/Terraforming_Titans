
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

let gameSettings = {
  useCelsius: false,
  darkMode: false,
  hideCompletedResearch: false,
  silenceSolisAlert: false,
  silenceMilestoneAlert: false,
  silenceUnlockAlert: false,
  disableDayNightCycle: false,
  preserveProjectAutoStart: false,
};

let colonySliderSettings = {
  workerRatio: 0.5,
  foodConsumption: 1,
  luxuryWater: 1,
  oreMineWorkers: 0
};

let ghgFactorySettings = {
  autoDisableAboveTemp: false,
  disableTempThreshold: 283.15, // Kelvin
  restartCap: 1,
  restartTimer: 0
};


let globalEffects = new EffectableEntity({description : 'Manages global effects'});
let skillManager;
let solisManager;
let warpGateCommand;
let playTimeSeconds = 0;
let gameSpeed = 1;
