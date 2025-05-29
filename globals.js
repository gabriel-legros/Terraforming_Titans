
let defaultPlanet = 'mars';
let tabManager;
let currentPlanetParameters = planetParameters[defaultPlanet];
let resources = {};
let maintenanceFraction = currentPlanetParameters.buildingParameters.maintenanceFraction;
let dayNightCycle;
let buildings = {};
let colonies = {};
let structures = {};
let populationModule;
let oreScanner = {};
let projectManager;  // Use ProjectManager instead of individual projects
let storyStarted = false;  // Track if the story has been triggered
let terraforming;

let gameSettings = { useCelsius: false };

let globalEffects = new EffectableEntity({description : 'Manages global effects'});
