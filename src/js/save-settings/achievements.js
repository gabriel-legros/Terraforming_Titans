const STORY_WORLD_ACHIEVEMENT_PLANETS = [
  'mars',
  'titan',
  'callisto',
  'ganymede',
  'vega2',
  'venus',
  'umbra',
  'solisprime',
  'gabbag',
  'tartarus',
  'hades',
  'poseidon',
  'styx',
  'zeus',
  'olympus',
  'earth'
];

const ACHIEVEMENT_HAZARD_KEYS = [
  'hazardousBiomass',
  'hazardousMachinery',
  'garbage',
  'kessler',
  'pulsar'
];

const ACHIEVEMENT_ALLOWED_RENEWABLE_BUILDINGS = {
  solarPanel: true,
  windTurbine: true
};

class AchievementManager {
  constructor() {
    this.definitions = this.buildDefinitions();
    this.achieved = {};
    this.pendingUnlocks = [];
    this.tracking = this.createEmptyTracking();
  }

  createEmptyTracking() {
    return {
      currentWorldId: '',
      buildingsBaseline: {},
      coloniesBaseline: {},
      liftersBaseline: {},
      disqualified: {
        classicRenewables: false,
        heatOfTheSun: false,
        boschTerraforming: false,
        hazardPreservation: false,
        noBuildingLeftBehind: false
      },
      hazardPreservationObserved: false
    };
  }

  buildDefinitions() {
    const definitions = [];
    STORY_WORLD_ACHIEVEMENT_PLANETS.forEach((planetKey, index) => {
      const number = index + 1;
      definitions.push({
        id: `story-world-${number}`,
        titleKey: 'ui.settings.achievements.storyWorldTitle',
        titleVars: { number },
        titleFallback: `World ${number}`,
        requirementKey: 'ui.settings.achievements.storyWorldRequirement',
        requirementVars: { number },
        requirementFallback: `Complete World ${number}.`,
        achieved: () => this.isStoryWorldAchievementComplete(planetKey, number),
      });
    });

    this.addAchievementDefinitions(definitions, [
      ['that-was-fast', 'thatWasFast', 'That was fast', 'Terraform a world under 1 hour.', () => this.hasTerraformRealTimeUnder(3600)],
      ['that-was-faster', 'thatWasFaster', 'That was faster', 'Terraform a world under 60s.', () => this.hasTerraformRealTimeUnder(60)],
      ['that-was-fastest', 'thatWasFastest', 'That was fastest', 'Terraform a world under 5s.', () => this.hasTerraformRealTimeUnder(5)],
      ['classic-renewables', 'classicRenewables', 'Classic Renewables', 'Terraform a world without building any power generators except solar panels and wind turbines.', () => this.isClassicRenewablesComplete()],
      ['heat-of-the-sun', 'heatOfTheSun', 'Heat of the Sun', 'Reach a global mean surface temperature of at least 5,500°C without using Planetary Thrusters.', () => this.isHeatOfTheSunComplete()],
      ['yo-dawg-terraforming', 'yoDawgTerraforming', 'Yo dawg, I heard you liked terraforming', 'Have all your terraforming times in the past 10 terraformed worlds be faster than the previous one.', () => this.isRecentTerraformImprovementChainComplete()],
      ['coruscant', 'coruscant', 'Coruscant', 'Build a full ecumenopolis.', () => this.isEcumenopolisComplete()],
      ['orbital-ring', 'orbitalRing', 'We need more real estate', 'Build an orbital ring.', () => this.hasAnyOrbitalRing()],
      ['dream-big', 'dreamBig', 'Dream big', 'Construct an artificial world.', () => this.hasConstructedArtificialWorld()],
      ['ringworld-terraforming', 'ringworldTerraforming', 'How is this thing not ripping apart', 'Terraform a Ringworld.', () => this.hasTerraformedArtificialType('ring')],
      ['diskworld-terraforming', 'diskworldTerraforming', 'Flat Earthers were right all along', 'Terraform a Diskworld.', () => this.hasTerraformedArtificialType('disk')],
      ['galactic-hadron-collider', 'galacticHadronCollider', 'Galactic Hadron Collider', 'Build a particle accelerator with a radius of at least {value} meters.', () => this.isParticleAcceleratorComplete(), () => ({ value: formatNumber(5e20, true, 0) })],
      ['bosch-terraforming', 'boschTerraforming', 'Bosch Terraforming', 'Terraform a Venus-like world without ever disposing of CO2 or using lifters.', () => this.isBoschTerraformingComplete()],
      ['hazard-preservation', 'hazardPreservation', 'Hazard Preservation', 'Fulfill all terraforming requirements simultaneously on any RWG world with all 5 story hazards before clearing any of the hazards (Hint : use a natural magnetosphere).', () => this.isHazardPreservationComplete()],
      ['no-building-left-behind', 'noBuildingLeftBehind', 'No Building Left Behind', 'Terraform any random world without constructing any buildings or colonies.', () => this.isNoBuildingLeftBehindComplete()],
      ['where-are-the-blokkats', 'whereAreTheBlokkats', 'Where are the Blokkats?', "Defeat the final and most powerful wave of Prometheus' galactic invasion fleet.", () => this.isFinalInvasionDefeated()],
      ['one-faith', 'oneFaith', 'One Faith', 'Have 100% of the galaxy believe in HOPE.', () => this.isOneFaithComplete()],
      ['kardashev-i', 'kardashevI', 'Kardashev I', 'Produce 200Q watts of power in total.', () => this.isKardashevIComplete()],
      ['kardashev-ii', 'kardashevII', 'Kardashev II', 'Complete your first Dyson Sphere Frame and fill it completely with collectors.', () => this.isKardashevIIComplete()],
      ['kardashev-iii', 'kardashevIII', 'Kardashev III', 'Build 100 billion Dyson Spheres and fill them all with collectors.', () => this.isKardashevIIIComplete()],
      ['you-live-like-this', 'youLiveLikeThis', 'You live like this?', 'Have a dynamic mass world where the mass of all waste is greater than half the mass of the planet.', () => this.isWasteMassAchievementComplete()],
      ['paul-birch', 'paulBirch', 'Paul Birch would be proud', 'Build and terraform a world around a supermassive black hole.', () => this.hasTerraformedSupermassiveShellworld()],
      ['time-for-retirement', 'timeForRetirement', 'Time for Retirement', 'Build the maximum number of layers possible on a world around a supermassive black hole.', () => this.isBirchWorldMaxed()]
    ]);

    return definitions;
  }

  addAchievementDefinitions(definitions, entries) {
    entries.forEach((entry) => {
      const [id, key, titleFallback, requirementFallback, achieved, requirementVars] = entry;
      definitions.push({
        id,
        titleKey: `ui.settings.achievements.${key}.title`,
        titleFallback,
        requirementKey: `ui.settings.achievements.${key}.requirement`,
        requirementVars,
        requirementFallback,
        hidden: true,
        achieved
      });
    });
  }

  isStoryWorldAchievementComplete(planetKey, number) {
    if (gameCompleted === true) {
      return true;
    }
    if (number === 15) {
      return spaceManager.getCurrentPlanetKey() === 'earth' || spaceManager.isPlanetTerraformed(planetKey);
    }
    if (number === 16) {
      return this.isEarthFinishedAchievementComplete();
    }
    return spaceManager.isPlanetTerraformed(planetKey);
  }

  isEarthFinishedAchievementComplete() {
    return earthManager.getActionCount('completeTerraforming') > 0 || spaceManager.isPlanetTerraformed('earth');
  }

  getCurrentWorldTrackingId() {
    if (spaceManager.currentRandomSeed !== null) {
      return `random:${spaceManager.currentRandomSeed}`;
    }
    if (spaceManager.currentArtificialKey !== null) {
      return `artificial:${spaceManager.currentArtificialKey}`;
    }
    return `story:${spaceManager.getCurrentPlanetKey()}`;
  }

  getCountNumber(entity) {
    if (!entity) {
      return 0;
    }
    if (Number.isFinite(entity.countNumber)) {
      return entity.countNumber;
    }
    if (Number.isFinite(entity.activeNumber)) {
      return entity.activeNumber;
    }
    if (entity.count !== undefined) {
      return buildingCountToNumber(entity.count);
    }
    return Math.max(0, Number(entity.active) || 0);
  }

  snapshotCounts(collection) {
    const snapshot = {};
    for (const key in collection) {
      snapshot[key] = this.getCountNumber(collection[key]);
    }
    return snapshot;
  }

  getLiftersSnapshot() {
    const lifters = projectManager.projects.lifters;
    return {
      expansionProgress: Math.max(0, Number(lifters?.expansionProgress) || 0),
      assignedSpaceships: Math.max(0, Number(lifters?.assignedSpaceships) || 0)
    };
  }

  resetCurrentWorldTracking(worldId) {
    this.tracking.currentWorldId = worldId;
    this.tracking.buildingsBaseline = this.snapshotCounts(buildings);
    this.tracking.coloniesBaseline = this.snapshotCounts(colonies);
    this.tracking.liftersBaseline = this.getLiftersSnapshot();
    this.tracking.disqualified = {
      classicRenewables: false,
      heatOfTheSun: false,
      boschTerraforming: false,
      hazardPreservation: false,
      noBuildingLeftBehind: false
    };
    this.tracking.hazardPreservationObserved = false;
    this.applyBaselineChallengeDisqualifiers();
  }

  syncCurrentWorldTracking() {
    const worldId = this.getCurrentWorldTrackingId();
    if (this.tracking.currentWorldId !== worldId) {
      this.resetCurrentWorldTracking(worldId);
    }
  }

  updateTracking() {
    this.syncCurrentWorldTracking();
    this.updateBuildingChallengeTracking();
    this.updateHeatOfTheSunTracking();
    this.updateBoschTracking();
    this.updateHazardPreservationTracking();
  }

  updateBuildingChallengeTracking() {
    for (const key in buildings) {
      const building = buildings[key];
      const baseline = this.tracking.buildingsBaseline[key] || 0;
      const current = this.getCountNumber(building);
      if (current <= baseline) {
        continue;
      }
      if (this.isPowerGeneratorBuilding(key, building) && !ACHIEVEMENT_ALLOWED_RENEWABLE_BUILDINGS[key]) {
        this.tracking.disqualified.classicRenewables = true;
      }
      if (this.isCurrentWorldRandom()) {
        this.tracking.disqualified.noBuildingLeftBehind = true;
      }
    }

    if (this.isCurrentWorldRandom()) {
      for (const key in colonies) {
        const baseline = this.tracking.coloniesBaseline[key] || 0;
        const current = this.getCountNumber(colonies[key]);
        if (current > baseline) {
          this.tracking.disqualified.noBuildingLeftBehind = true;
        }
      }
    }
  }

  applyBaselineChallengeDisqualifiers() {
    if (this.isCurrentWorldTerraformed()) {
      this.tracking.disqualified.classicRenewables = true;
      this.tracking.disqualified.boschTerraforming = true;
      this.tracking.disqualified.noBuildingLeftBehind = true;
    }
    for (const key in buildings) {
      const count = this.tracking.buildingsBaseline[key] || 0;
      if (count <= 0) {
        continue;
      }
      if (this.isPowerGeneratorBuilding(key, buildings[key]) && !ACHIEVEMENT_ALLOWED_RENEWABLE_BUILDINGS[key]) {
        this.tracking.disqualified.classicRenewables = true;
      }
      if (this.isCurrentWorldRandom()) {
        this.tracking.disqualified.noBuildingLeftBehind = true;
      }
    }
    if (this.isCurrentWorldRandom()) {
      for (const key in colonies) {
        if ((this.tracking.coloniesBaseline[key] || 0) > 0) {
          this.tracking.disqualified.noBuildingLeftBehind = true;
        }
      }
    }
    if (this.hasPlanetaryThrusterUse() || Number(terraforming.temperature?.value) >= 5500 + 273.15) {
      this.tracking.disqualified.heatOfTheSun = true;
    }
    if (this.isCurrentWorldVenusLike()) {
      if (this.hasObservedLiftersUse()
        || this.hasObservedCo2Disposal()) {
        this.tracking.disqualified.boschTerraforming = true;
      }
    }
    if (this.isHazardPreservationCandidateWorld()
      && (this.areAnyAchievementHazardsCleared() || this.areNonHazardTerraformRequirementsMet())) {
      this.tracking.disqualified.hazardPreservation = true;
    }
  }

  isPowerGeneratorBuilding(key, building) {
    if (key === 'solarPanel' || key === 'windTurbine') {
      return true;
    }
    if (Number(building?.powerPerBuilding) > 0) {
      return true;
    }
    return Number(building?.production?.colony?.energy) > 0;
  }

  updateHeatOfTheSunTracking() {
    if (this.hasPlanetaryThrusterUse()) {
      this.tracking.disqualified.heatOfTheSun = true;
    }
  }

  hasPlanetaryThrusterUse() {
    const thruster = projectManager.projects.planetaryThruster;
    if (!thruster) {
      return false;
    }
    return Number(thruster.power) > 0
      || Number(thruster.energySpentSpin) > 0
      || Number(thruster.energySpentMotion) > 0
      || Number(thruster.dVdone) > 0
      || thruster.spinInvest === true
      || thruster.motionInvest === true
      || thruster.escapeComplete === true;
  }

  updateBoschTracking() {
    if (!this.isCurrentWorldVenusLike()) {
      return;
    }
    if (this.hasObservedCo2Disposal() || this.hasObservedLiftersUse()) {
      this.tracking.disqualified.boschTerraforming = true;
    }
  }

  hasObservedCo2Disposal() {
    return this.isCo2DisposalProjectRunning(projectManager.projects.disposeResources);
  }

  isCo2DisposalProjectRunning(project) {
    if (!project || project.isActive !== true) {
      return false;
    }
    if (Array.isArray(project.disposalTargets) && project.disposalTargets.length) {
      return project.disposalTargets.some((target) => (
        target.autoStart === true && this.isCo2DisposalSelection(target.selectedDisposalResource)
      ));
    }
    return this.isCo2DisposalSelection(project.selectedDisposalResource);
  }

  isCo2DisposalSelection(selection) {
    return selection?.category === 'atmospheric'
      && (selection.resource === 'carbonDioxide' || selection.resource === 'co2');
  }

  hasObservedLiftersUse() {
    const lifters = projectManager.projects.lifters;
    if (!lifters) {
      return false;
    }
    return lifters.isRunning === true && lifters.mode === 'stripAtmosphere';
  }

  updateHazardPreservationTracking() {
    if (!this.isHazardPreservationCandidateWorld()) {
      return;
    }
    if (this.tracking.hazardPreservationObserved) {
      return;
    }
    if (this.areAnyAchievementHazardsCleared()) {
      this.tracking.disqualified.hazardPreservation = true;
      return;
    }
    if (this.areNonHazardTerraformRequirementsMet()) {
      this.tracking.hazardPreservationObserved = true;
    }
  }

  isCurrentWorldRandom() {
    return spaceManager.currentRandomSeed !== null;
  }

  isCurrentWorldTerraformed() {
    return spaceManager.isCurrentWorldTerraformed();
  }

  isCurrentWorldVenusLike() {
    const archetype = currentPlanetParameters?.classification?.archetype || '';
    const type = currentPlanetParameters?.classification?.type || '';
    const key = spaceManager.getCurrentPlanetKey();
    const requirementId = terraforming?.requirementId || currentPlanetParameters?.specialAttributes?.terraformingRequirementId || '';
    return key === 'venus'
      || archetype === 'venus-like'
      || archetype === 'venus'
      || type === 'venus-like'
      || requirementId === 'venus';
  }

  hasTerraformRealTimeUnder(seconds) {
    if (Number(fastestTerraformRealSeconds) > 0 && fastestTerraformRealSeconds < seconds) {
      return true;
    }
    const history = spaceManager.getRecentTerraformHistory();
    return history.some((entry) => Number(entry.realTimeSeconds) > 0 && entry.realTimeSeconds < seconds);
  }

  isClassicRenewablesComplete() {
    return this.isCurrentWorldTerraformed() && !this.tracking.disqualified.classicRenewables;
  }

  isHeatOfTheSunComplete() {
    const targetKelvin = 5500 + 273.15;
    return !this.tracking.disqualified.heatOfTheSun
      && Number(terraforming.temperature?.value) >= targetKelvin;
  }

  isRecentTerraformImprovementChainComplete() {
    const history = spaceManager.getRecentTerraformHistory();
    if (history.length < 10) {
      return false;
    }
    const recent = history.slice(-10);
    for (let i = 1; i < recent.length; i += 1) {
      const previous = Number(recent[i - 1].realTimeSeconds);
      const current = Number(recent[i].realTimeSeconds);
      if (!(current > 0 && previous > 0 && current < previous)) {
        return false;
      }
    }
    return true;
  }

  isEcumenopolisComplete() {
    const ecumenopolis = colonies.t7_colony;
    const geometricLand = resolveWorldGeometricLand(terraforming);
    const requirement = Math.max(0, Number(ecumenopolis?.requiresLand) || 0);
    if (!geometricLand || !requirement) {
      return getEcumenopolisLandFraction(terraforming) >= 1;
    }
    const activeCount = Math.max(0, Number(ecumenopolis.activeNumber) || 0);
    if (activeCount <= 0) {
      return false;
    }
    const coveredLand = activeCount * requirement;
    return Math.max(0, geometricLand - coveredLand) < requirement;
  }

  hasAnyOrbitalRing() {
    for (const key in spaceManager.planetStatuses) {
      if (spaceManager.planetStatuses[key]?.orbitalRing === true) {
        return true;
      }
    }
    for (const key in spaceManager.randomWorldStatuses) {
      if (spaceManager.randomWorldStatuses[key]?.orbitalRing === true) {
        return true;
      }
    }
    for (const key in spaceManager.artificialWorldStatuses) {
      if (spaceManager.artificialWorldStatuses[key]?.orbitalRing === true) {
        return true;
      }
    }
    const ring = projectManager.projects.orbitalRing;
    return ring?.currentWorldHasRing === true || Number(ring?.ringCount) > 0;
  }

  hasConstructedArtificialWorld() {
    if (spaceManager.currentArtificialKey !== null) {
      return true;
    }
    if (Object.keys(spaceManager.artificialWorldStatuses || {}).length > 0) {
      return true;
    }
    return artificialManager?.activeProject?.isCompleted === true;
  }

  hasTerraformedArtificialType(type) {
    if (spaceManager.currentArtificialKey !== null
      && currentPlanetParameters?.classification?.type === type
      && this.isCurrentWorldTerraformed()) {
      return true;
    }
    for (const key in spaceManager.artificialWorldStatuses) {
      const status = spaceManager.artificialWorldStatuses[key];
      if (status?.terraformed === true && (status.type === type || status.original?.classification?.type === type || status.original?.merged?.classification?.type === type)) {
        return true;
      }
    }
    return false;
  }

  isParticleAcceleratorComplete() {
    const accelerator = projectManager.projects.particleAccelerator;
    return Number(accelerator?.bestRadiusMeters) >= 5e20;
  }

  isBoschTerraformingComplete() {
    return this.isCurrentWorldVenusLike()
      && this.isCurrentWorldTerraformed()
      && !this.tracking.disqualified.boschTerraforming;
  }

  isHazardPreservationCandidateWorld() {
    if (!this.isCurrentWorldRandom()) {
      return false;
    }
    const hazards = currentPlanetParameters?.hazards || {};
    return ACHIEVEMENT_HAZARD_KEYS.every((key) => !!hazards[key]);
  }

  getHazardObject(key) {
    if (!hazardManager) {
      return null;
    }
    const propertyByKey = {
      hazardousBiomass: 'hazardousBiomassHazard',
      hazardousMachinery: 'hazardousMachineryHazard',
      garbage: 'garbageHazard',
      kessler: 'kesslerHazard',
      pulsar: 'pulsarHazard'
    };
    return hazardManager[propertyByKey[key]];
  }

  isAchievementHazardCleared(key) {
    const hazard = this.getHazardObject(key);
    const parameters = hazardManager?.parameters?.[key];
    if (!parameters || !hazard || !hazard.isCleared) {
      return false;
    }
    return hazard.isCleared(terraforming, parameters) === true;
  }

  areAnyAchievementHazardsCleared() {
    return ACHIEVEMENT_HAZARD_KEYS.some((key) => this.isAchievementHazardCleared(key));
  }

  areNonHazardTerraformRequirementsMet() {
    return terraforming.getTemperatureStatus()
      && terraforming.getAtmosphereStatus()
      && terraforming.getWaterStatus()
      && terraforming.getLuminosityStatus()
      && terraforming.getLifeStatus()
      && terraforming.getOthersStatus();
  }

  isHazardPreservationComplete() {
    return this.tracking.hazardPreservationObserved === true
      && !this.tracking.disqualified.hazardPreservation;
  }

  isNoBuildingLeftBehindComplete() {
    return this.isCurrentWorldRandom()
      && this.isCurrentWorldTerraformed()
      && !this.tracking.disqualified.noBuildingLeftBehind;
  }

  isFinalInvasionDefeated() {
    const letters = GALACTIC_INVASION_LETTERS || [];
    return letters.length > 0 && letters.every((letter) => galaxyInvasionManager.completedLetters.has(letter.key));
  }

  isOneFaithComplete() {
    return followersManager.getFaithSnapshot().galacticPercent >= 1;
  }

  isKardashevIComplete() {
    const colonyEnergy = Math.max(0, Number(resources.colony.energy.productionRate) || 0);
    const spaceEnergy = Math.max(0, Number(resources.space.energy.productionRate) || 0);
    return colonyEnergy + spaceEnergy >= 2e17;
  }

  isKardashevIIComplete() {
    const sphere = projectManager.projects.dysonSphere;
    if (!sphere?.isCompleted) {
      return false;
    }
    const power = sphere.getTotalCollectorPower ? sphere.getTotalCollectorPower() : (Number(sphere.collectors) || 0) * (Number(sphere.energyPerCollector) || 0);
    return power >= 5e25;
  }

  isKardashevIIIComplete() {
    const sphere = projectManager.projects.dysonSphere;
    if (!sphere?.isCompleted) {
      return false;
    }
    const count = sphere.getDysonSphereCount ? sphere.getDysonSphereCount() : 0;
    const power = sphere.getTotalCollectorPower ? sphere.getTotalCollectorPower() : (Number(sphere.collectors) || 0) * (Number(sphere.energyPerCollector) || 0);
    return count >= 100_000_000_000 && power >= 5e25 * 100_000_000_000;
  }

  isWasteMassAchievementComplete() {
    if (currentPlanetParameters?.specialAttributes?.dynamicMass !== true) {
      return false;
    }
    const wasteMass = ['garbage', 'trash', 'junk', 'scrapMetal'].reduce((total, key) => (
      total + Math.max(0, Number(resources.surface[key]?.value) || 0)
    ), 0);
    const planetMassTons = this.getCurrentPlanetMassTons();
    return planetMassTons > 0 && wasteMass > planetMassTons * 0.5;
  }

  getCurrentPlanetMassTons() {
    const massKg = Number(terraforming?.celestialParameters?.mass);
    if (massKg > 0) {
      return massKg / 1000;
    }
    return Math.max(0, Number(resources.underground.planetaryMass?.value) || 0);
  }

  hasTerraformedSupermassiveShellworld() {
    if (spaceManager.currentArtificialKey !== null
      && currentPlanetParameters?.classification?.type === 'shell'
      && currentPlanetParameters?.classification?.core === 'smbh'
      && this.isCurrentWorldTerraformed()) {
      return true;
    }
    for (const key in spaceManager.artificialWorldStatuses) {
      const status = spaceManager.artificialWorldStatuses[key];
      if (status?.terraformed === true && status.type === 'shell' && status.core === 'smbh') {
        return true;
      }
    }
    return false;
  }

  isBirchWorldMaxed() {
    const project = projectManager.projects.birchWorld;
    return Number(project?.layerCount) >= 1500;
  }

  isAchieved(id) {
    return this.achieved[id] === true;
  }

  markAchieved(definition) {
    if (this.isAchieved(definition.id)) {
      return false;
    }
    this.achieved[definition.id] = true;
    this.pendingUnlocks.push(definition.id);
    this.onAchievementUnlocked(definition);
    return true;
  }

  onAchievementUnlocked(definition) {
    this.publishSteamAchievement(definition.id);
  }

  publishSteamAchievement(id) {
    if (GAME_BUILD_TARGET !== 'steam' || window.steamAchievements === undefined) {
      return;
    }
    window.steamAchievements.activate(this.getSteamAchievementId(id));
  }

  syncSteamAchievements() {
    if (GAME_BUILD_TARGET !== 'steam' || window.steamAchievements === undefined) {
      return;
    }
    const ids = [];
    this.definitions.forEach((definition) => {
      if (this.isAchieved(definition.id)) {
        ids.push(this.getSteamAchievementId(definition.id));
      }
    });
    if (ids.length > 0) {
      window.steamAchievements.syncUnlocked(ids);
    }
  }

  getSteamAchievementId(id) {
    return String(id).toUpperCase();
  }

  update() {
    this.updateTracking();
    this.definitions.forEach((definition) => {
      if (!this.isAchieved(definition.id) && definition.achieved()) {
        this.markAchieved(definition);
      }
    });
  }

  getAchievements(showHiddenText = false) {
    return this.definitions.map((definition) => {
      const achieved = this.isAchieved(definition.id);
      const requirementVars = typeof definition.requirementVars === 'function'
        ? definition.requirementVars()
        : definition.requirementVars;
      const requirement = t(definition.requirementKey, requirementVars, definition.requirementFallback);
      const hidden = definition.hidden === true && !achieved;
      return {
        id: definition.id,
        title: t(definition.titleKey, definition.titleVars, definition.titleFallback),
        requirement,
        displayRequirement: hidden && !showHiddenText
          ? t('ui.settings.achievements.hiddenRequirement', null, 'Hidden until unlocked.')
          : requirement,
        achieved,
        hidden,
      };
    });
  }

  getSummary(showHiddenText = false) {
    const achievements = this.getAchievements(showHiddenText);
    const achieved = achievements.filter((entry) => entry.achieved).length;
    return {
      achieved,
      total: achievements.length,
      achievements,
    };
  }

  saveState() {
    return {
      achieved: { ...this.achieved },
      tracking: {
        currentWorldId: this.tracking.currentWorldId,
        buildingsBaseline: { ...this.tracking.buildingsBaseline },
        coloniesBaseline: { ...this.tracking.coloniesBaseline },
        liftersBaseline: { ...this.tracking.liftersBaseline },
        disqualified: { ...this.tracking.disqualified },
        hazardPreservationObserved: this.tracking.hazardPreservationObserved === true
      },
    };
  }

  loadState(state = {}) {
    this.achieved = {};
    Object.keys(state.achieved || {}).forEach((id) => {
      if (state.achieved[id] === true) {
        this.achieved[id] = true;
      }
    });
    this.tracking = this.createEmptyTracking();
    const savedTracking = state.tracking || {};
    if (savedTracking.currentWorldId) {
      this.tracking.currentWorldId = String(savedTracking.currentWorldId);
    }
    if (savedTracking.buildingsBaseline && savedTracking.buildingsBaseline.constructor === Object) {
      this.tracking.buildingsBaseline = { ...savedTracking.buildingsBaseline };
    }
    if (savedTracking.coloniesBaseline && savedTracking.coloniesBaseline.constructor === Object) {
      this.tracking.coloniesBaseline = { ...savedTracking.coloniesBaseline };
    }
    if (savedTracking.liftersBaseline && savedTracking.liftersBaseline.constructor === Object) {
      this.tracking.liftersBaseline = { ...savedTracking.liftersBaseline };
    }
    if (savedTracking.disqualified && savedTracking.disqualified.constructor === Object) {
      this.tracking.disqualified = {
        ...this.tracking.disqualified,
        ...savedTracking.disqualified
      };
    }
    this.tracking.hazardPreservationObserved = savedTracking.hazardPreservationObserved === true;
    this.pendingUnlocks = [];
    this.update();
    this.syncSteamAchievements();
  }
}
