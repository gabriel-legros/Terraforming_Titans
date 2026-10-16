// Run through scripts/capture-game-ui.js in its isolated browser context.
hideLoadingOverlay();
setGameSpeedChoice(0);
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(node => node.remove());
window.popupActive = false;

let checks = 0;
const stages = [];
function assertReward(condition, label) {
  if (!condition) throw new Error(label);
  checks += 1;
}
function nearReward(actual, expected, label) {
  assertReward(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, got ${actual}`);
}
function withRewardFixture(object, values, run) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, object[key]]));
  Object.assign(object, values);
  try {
    return run();
  } finally {
    Object.assign(object, previous);
  }
}
function rewardOwners() {
  return {
    ammonia: terraforming,
    oommaa: terraforming,
    klishy: androidResearch,
    kerati: globalEffects,
    shrilek: projectManager.projects.undergroundExpansion,
    vanadophore: colonies.aerostat_colony,
    yggies: buildings.biodome,
    shiivert: populationModule
  };
}
function checkDominionRewards(stage) {
  const start = checks;
  const owners = rewardOwners();
  for (const id of Object.keys(owners)) {
    assertReward(spaceManager.dominionTerraformRewards[id] === true, `${stage}: ${id} claim persists`);
    nearReward(owners[id].activeEffects.filter(effect => effect.sourceId === `dominion-terraform-reward:${id}`).length,
      1, `${stage}: ${id} applies exactly once`);
  }

  // Four bounded targets: temperature, total pressure, oxygen, and luminosity.
  const geometry = terraforming.celestialParameters;
  const paPerTon = calculateAtmosphericPressure(1, geometry.gravity, geometry.radius, geometry.surfaceArea);
  const precision = Object.assign(Object.create(terraforming), {
    temperature: { value: 150, targetMin: 100, targetMax: 200 },
    atmosphere: { totalPressureTargetRangeKPa: { min: 0.02, max: 0.08 } },
    resources: { atmospheric: { oxygen: { value: 50 / paPerTon } } },
    gasTargets: { oxygen: { min: 20, max: 80 } },
    luminosity: { targetMin: 100, targetMax: 200 },
    requirements: { ignoresLuminosity: false },
    calculateTotalPressure: () => 0.05,
    calculateSurfaceSolarFlux: () => 150
  });
  withRewardFixture(colonies.t7_colony, { active: 0n }, () => {
    nearReward(precision.getSpecializationPointMultiplier(), 1.2, `${stage}: Fritizian midpoints add`);
    precision.temperature.value = 100;
    nearReward(precision.getSpecializationPointMultiplier(), 1.15, `${stage}: Fritizian edge gives zero`);
    precision.temperature.value = 125;
    nearReward(precision.getSpecializationPointMultiplier(), 1.175, `${stage}: Fritizian interpolates`);
    precision.temperature.value = 0;
    nearReward(precision.getSpecializationPointMultiplier(), 1.15, `${stage}: Fritizian outside range gives zero`);
  });
  const worldMultiplier = terraforming.getSpecializationPointMultiplier();
  for (const id of ['bioworld', 'foundryWorld', 'manufacturingWorld', 'nanoworld', 'resortWorld']) {
    const project = projectManager.projects[id];
    const hazards = spaceManager.getCurrentWorldHazardCount();
    const hazardMultiplier = 1 + hazards * project.hazardPointBonusPerHazard;
    nearReward(project.applyPointBonuses(100), 100 * worldMultiplier * hazardMultiplier,
      `${stage}: Fritizian ${id} point award`);
  }

  const land = resolveWorldGeometricLand(terraforming);
  withRewardFixture(colonies.t7_colony, { active: 1n, requiresLand: land / 2 }, () => {
    nearReward(terraforming.getLuminosityTargetRange().min, terraforming.luminosity.targetMin / 2,
      `${stage}: Oommaa half coverage`);
    colonies.t7_colony.requiresLand = land;
    nearReward(terraforming.getLuminosityTargetRange().min, 0, `${stage}: Oommaa full coverage`);
    nearReward(terraforming.getLuminosityTargetRange().max, terraforming.luminosity.targetMax,
      `${stage}: Oommaa upper bound`);
    const darkWorld = Object.assign(Object.create(terraforming), { calculateSurfaceSolarFlux: () => 0 });
    assertReward(darkWorld.getLuminosityStatus(), `${stage}: Oommaa allows zero light at full coverage`);
  });

  withRewardFixture(resources.colony.androids, { value: 100, cap: 1000 }, () => {
    globalEffects.addAndReplace({ type: 'booleanFlag', flagId: 'hiveMindAndroids', value: true,
      effectId: 'dominion-check-hive-mind', sourceId: 'dominion-check' });
    try {
      const changes = { colony: { research: 0 } };
      updateAndroidResearch(1000, resources, globalEffects, changes);
      nearReward(changes.colony.research, 0.2 * gameSettings.androidHiveMindMultiplier,
        `${stage}: Klishy actual research production and difficulty setting`);
    } finally {
      globalEffects.removeEffect({ sourceId: 'dominion-check' });
    }
    withRewardFixture(resources.surface.radioactiveWaste, { value: 0 }, () => {
      for (const [waste, bonus] of [[0, 1], [500, 1.5], [1000, 2], [2000, 2]]) {
        resources.surface.radioactiveWaste.value = waste;
        nearReward(populationModule.getWorkerCapacityBreakdown().androidWorkers,
          100 * bonus * gameSettings.workersPerAndroid, `${stage}: Shiivert ${waste} tons and worker setting`);
      }
      withRewardFixture(resources.colony.androids, { value: 0 }, () => {
        nearReward(populationModule.getWorkerCapacityBreakdown().androidWorkers, 0,
          `${stage}: Shiivert zero androids remains finite`);
      });
    });
  });

  nearReward(hazardManager.hazardousBiomassHazard.getReductionPerCrusaderPerSecond(),
    terraformingParameters.hazards.hazardousBiomass.crusaderRemovalPerSecond * 2,
    `${stage}: Kerati biomass removal`);
  withRewardFixture(resources.special.crusaders, { value: 10, unlocked: true }, () => {
    nearReward(hazardManager.hazardousMachineryHazard.getCrusaderDecayPerSecond({ crusaderRemovalPerSecond: 0.5 }),
      10, `${stage}: Kerati machinery removal`);
  });
  const underground = projectManager.projects.undergroundExpansion;
  nearReward(underground.getRawMaxRepeats(), Math.floor(underground.getCapLand() * 2), `${stage}: Shrilek land cap`);
  withRewardFixture(underground, { repeatCount: Math.floor(underground.getCapLand()) }, () => {
    assertReward(underground.canContinue(), `${stage}: Shrilek permits expansion beyond old cap`);
  });
  const supported = buildings.atmosphericWaterCollector;
  withRewardFixture(colonies.aerostat_colony, {
    active: 10n, unlocked: true, isHidden: false, capSupportedBuildingsToAerostatCapacity: true
  }, () => {
    nearReward(colonies.aerostat_colony.getBuildingSupportPerAerostat(supported),
      supported.aerostatReduction * 1.2, `${stage}: Vanado direct support`);
    nearReward(getAerostatSupportedBuildingLimit(supported), Math.floor(12 * supported.aerostatReduction),
      `${stage}: Vanado automation cap`);
    withRewardFixture(supported, { autoBuildBasis: 'aerostatCapacity' }, () => {
      nearReward(supported.getAutoBuildBase(0, 0, buildings), 12 * supported.aerostatReduction,
        `${stage}: Vanado autobuild basis`);
    });
  });

  const dome = buildings.biodome;
  const yggieEffect = dome.activeEffects.find(effect => effect.sourceId === 'dominion-terraform-reward:yggies');
  function measureBiodome() {
    dome.refreshMetabolismRates();
    dome.prepareTickEffectCache();
    const changes = Object.fromEntries(Object.keys(resources).map(category => [category, {}]));
    dome.produce(changes, 1000);
    dome.consume(changes, 1000);
    lifeDesigner.updateBiodomePoints(3600000);
    dome.clearTickEffectCache();
    return { production: structuredClone(dome.currentProduction), consumption: structuredClone(dome.currentConsumption),
      points: lifeDesigner.biodomePointRate, protection: getBiodomeLandFraction(terraforming) };
  }
  withRewardFixture(dome, { active: 1n, productivity: 1, workerProductivity: 1 }, () => {
    withRewardFixture(resources.surface.biomass, { value: 0 }, () => {
      withRewardFixture(lifeDesigner, { biodomePoints: 0, biodomePointRate: 0 }, () => {
        dome.removeEffect({ sourceId: yggieEffect.sourceId });
        const baseline = measureBiodome();
        assertReward(baseline.production.surface.biomass > 0, `${stage}: Biodome fixture produces biomass`);
        assertReward(baseline.consumption.colony.energy > 0, `${stage}: Biodome fixture consumes energy`);
        assertReward(baseline.points > 0, `${stage}: Biodome fixture generates design points`);
        dome.addAndReplace(yggieEffect);
        const rewarded = measureBiodome();
        for (const field of ['production', 'consumption']) {
          for (const category in baseline[field]) {
            for (const resource in baseline[field][category]) {
              nearReward(rewarded[field][category][resource], baseline[field][category][resource] * 2,
                `${stage}: Yggie ${field} ${category}.${resource}`);
            }
          }
        }
        nearReward(rewarded.points, baseline.points * 2, `${stage}: Yggie life-design points`);
        nearReward(rewarded.protection, baseline.protection, `${stage}: Yggie keeps original Ecumenopolis protection`);
      });
    });
  });
  dome.refreshMetabolismRates();
  stages.push(`${stage}: ${checks - start} checks passed`);
}

const initialSave = serializeGameState(getGameState());
const ids = Object.keys(terraformingParameters.gameplay.dominionTerraformRewards);
const artifactStart = resources.special.alienArtifact.value;
let expectedArtifacts = artifactStart;
for (let index = 0; index < ids.length; index += 1) {
  const id = ids[index];
  const reward = getArtifactGainAmount(2000 * (index + 1));
  nearReward(spaceManager.grantDominionTerraformReward(id), reward, `${id}: first reward pays artifacts`);
  expectedArtifacts += reward;
  nearReward(spaceManager.grantDominionTerraformReward(id), 0, `${id}: repeat reward pays nothing`);
}
gameSettings.androidHiveMindMultiplier = 3;
gameSettings.workersPerAndroid = 4;
applyDifficultySettingEffects();
checkDominionRewards('First completion');
const earnedSave = serializeGameState(getGameState());

function checkArtifacts(stage) {
  nearReward(resources.special.alienArtifact.value, expectedArtifacts, `${stage}: artifacts are not awarded twice`);
  nearReward(spaceManager.dominionTerraformRewardCount, ids.length, `${stage}: reward count persists`);
}
function restoreRewardSave(save, stage) {
  const oldWorld = terraforming;
  assertReward(loadGame(save, true, { skipRender: true }), `${stage}: real loadGame succeeds`);
  setGameSpeedChoice(0);
  assertReward(terraforming !== oldWorld, `${stage}: world objects were reconstructed`);
  checkDominionRewards(stage);
  checkArtifacts(stage);
}
restoreRewardSave(earnedSave, 'Save/load');
restoreRewardSave(earnedSave, 'Repeated load');
reapplySharedManagerEffects({ includeProject: true });
reapplySharedManagerEffects({ includeProject: true });
checkDominionRewards('Repeated effect reconciliation');
checkArtifacts('Repeated effect reconciliation');

// An old save contains claim flags, without any runtime reward effects.
const legacy = JSON.parse(initialSave);
legacy.spaceManager.dominionTerraformRewards = Object.fromEntries(ids.map(id => [id, true]));
legacy.spaceManager.dominionTerraformRewardCount = ids.length;
legacy.resources.special.alienArtifact.value = expectedArtifacts;
legacy.settings.androidHiveMindMultiplier = 3;
legacy.settings.workersPerAndroid = 4;
restoreRewardSave(serializeGameState(legacy), 'Retroactive claim-only save');

function travelRewardWorld(key) {
  const oldWorld = terraforming;
  spaceManager.planetStatuses[key].enabled = true;
  selectPlanet(key, true);
  setGameSpeedChoice(0);
  assertReward(spaceManager.getCurrentPlanetKey() === key, `Travel to ${key}: destination reached`);
  assertReward(terraforming !== oldWorld, `Travel to ${key}: world objects were reconstructed`);
  checkDominionRewards(`Travel to ${key}`);
  checkArtifacts(`Travel to ${key}`);
}
travelRewardWorld('titan');
restoreRewardSave(serializeGameState(getGameState()), 'Save/load after travel');
travelRewardWorld('mars');

// Exercise the random-world travel route and a different active dominion too.
spaceManager.setRwgLock('mars', true);
const randomWorld = generateRandomPlanet('dominion-rewards-regression', {
  target: 'planet', type: 'mars-like', orbitPreset: 'hz-mid', hazards: []
});
rwgSelectedDominion = 'ammonia';
applyDominionSelection(randomWorld);
const oldRandomWorld = terraforming;
assertReward(spaceManager.travelToRandomWorld(randomWorld, randomWorld.seedString), 'Random-world travel succeeds');
assertReward(terraforming !== oldRandomWorld && terraforming.requirementId === 'ammonia',
  'Random-world travel changes world and active dominion');
setGameSpeedChoice(0);
checkDominionRewards('Random-world Fritizian travel');
checkArtifacts('Random-world Fritizian travel');
restoreRewardSave(serializeGameState(getGameState()), 'Random-world save/load');

const bioworld = projectManager.projects.bioworld;
bioworld.isCompleted = true;
terraforming.temperature.value = (terraforming.temperature.targetMin + terraforming.temperature.targetMax) / 2;
const pointsBeforeTravel = bioworld.getSpecializationPoints();
const departurePoints = bioworld.getTravelPointGain();
assertReward(terraforming.getSpecializationPointMultiplier() >= 1.05, 'Fritizian departure has a midpoint bonus');
travelRewardWorld('titan');
nearReward(projectManager.projects.bioworld.getSpecializationPoints(), pointsBeforeTravel + departurePoints,
  'Fritizian boosted specialization points are actually awarded on departure');
restoreRewardSave(serializeGameState(getGameState()), 'Departure points save/load');
nearReward(projectManager.projects.bioworld.getSpecializationPoints(), pointsBeforeTravel + departurePoints,
  'Fritizian awarded points persist without being awarded again on load');

gameSettings.androidHiveMindMultiplier = 0;
gameSettings.workersPerAndroid = 0;
applyDifficultySettingEffects();
checkDominionRewards('Zero Android difficulty settings');
gameSettings.androidHiveMindMultiplier = 1;
gameSettings.workersPerAndroid = 1;
applyDifficultySettingEffects();
applyDifficultySettingEffects();
checkDominionRewards('Reset Android difficulty settings');
checkArtifacts('Difficulty setting changes');

assertReward(loadGame(initialSave, true, { skipRender: true }), 'Loading an unearned save succeeds');
for (const [id, owner] of Object.entries(rewardOwners())) {
  assertReward(!spaceManager.dominionTerraformRewards[id], `${id}: unearned save has no claim`);
  nearReward(owner.activeEffects.filter(effect => effect.sourceId === `dominion-terraform-reward:${id}`).length,
    0, `${id}: unearned save does not inherit prior effects`);
}
stages.push('Unearned save: prior claims and effects cleared');
restoreRewardSave(earnedSave, 'Rewards restored after unearned save');

hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(node => node.remove());
const results = document.createElement('pre');
results.id = 'dominion-rewards-check-results';
results.style.cssText = 'position:fixed;inset:20px;z-index:99999;margin:0;padding:28px;background:#182131;color:#d9ffe4;font:18px/1.6 monospace;white-space:pre-wrap;overflow:auto;';
results.textContent = `Dominion rewards: ${checks} checks passed, 0 failed\n\n${stages.join('\n')}\n\nReal save/load, story and random-world travel.\nIsolated browser; no player save files used.\nYggie consumption doubles; Ecumenopolis protection stays unchanged.`;
document.body.appendChild(results);
