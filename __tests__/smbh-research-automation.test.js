const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createResearchHarness() {
  const context = vm.createContext({ GAME_RESET_LEVEL });
  for (const file of ['effectable-entity.js', 'research.js', 'space/smbh-shellworld-snapshot.js']) {
    const filename = path.resolve(__dirname, '../src/js', file);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  }
  // Isolate research restoration from unrelated world simulation and rendering.
  for (const name of [
    'restoreSmbhShellworldResourceValues', 'restoreSmbhShellworldTerraformingValues',
    'restoreSmbhShellworldStructures', 'restoreSmbhShellworldOrbitalAllocation',
    'restoreSmbhShellworldProjects', 'restoreSmbhShellworldMilestoneClaims',
    'reapplySmbhShellworldEffects', 'updateAllResearchButtons',
    'updateAdvancedResearchVisibility', 'initializeResearchAlerts',
    'reconcileLandResourceValue', 'recalculateLandUsage', 'createResourceDisplay',
    'createBuildingButtons', 'createColonyButtons', 'renderProjects',
    'updateBuildingDisplay', 'updateFollowersUI'
  ]) {
    context[name] = jest.fn();
  }
  Object.assign(context, {
    buildings: {}, colonies: {}, resources: {}, currentPlanetParameters: {},
    colonySliderSettings: { loadState: jest.fn() },
    nanotechManager: { loadState: jest.fn(), updateUI: jest.fn() },
    projectManager: { applyEffects: jest.fn() },
    hazardManager: { syncHazardLandReservation: jest.fn() },
    terraforming: { refreshDynamicWorldGeometry: jest.fn(), synchronizeGlobalResources: jest.fn() },
    isCurrentWorldAdvancedResearchDisabled: () => false
  });
  context.researchManager = vm.runInContext(`new ResearchManager({
    energy: [
      { id: 'completed', cost: { research: 10 }, prerequisites: [], effects: [] },
      { id: 'unfinished', cost: { research: 20 }, prerequisites: [], effects: [] }
    ],
    advanced: [
      { id: 'repeatable', repeatable: true, repeatableCostMultiplier: 2,
        cost: { advancedResearch: 10 }, prerequisites: [], effects: [] }
    ]
  })`, context);
  const manager = context.researchManager;
  manager.getResearchById('completed').isResearched = true;
  manager.getResearchById('completed').timesResearched = 1;
  manager.getResearchById('repeatable').isResearched = true;
  manager.getResearchById('repeatable').timesResearched = 3;
  return context;
}

test('SMBH round trips preserve current auto-research checkboxes and priorities', () => {
  const context = createResearchHarness();
  const manager = context.researchManager;

  for (const enabled of [true, false, true]) {
    const snapshot = { research: context.captureSmbhShellworldResearch() };
    manager.resetRegularResearch();
    for (const id of ['completed', 'unfinished', 'repeatable']) {
      manager.setAutoResearchEnabled(id, enabled);
      manager.setAutoResearchPriority(id, enabled ? 2 : 1);
    }

    expect(context.restoreSmbhShellworldSnapshot(snapshot)).toBe(true);
    for (const id of ['completed', 'unfinished', 'repeatable']) {
      expect(manager.getAutoResearchEnabled(id)).toBe(enabled);
      expect(manager.getAutoResearchPriority(id)).toBe(enabled ? 2 : 1);
    }
    expect(manager.getResearchById('completed').isResearched).toBe(true);
    expect(manager.getResearchById('unfinished').isResearched).toBe(false);
    expect(manager.getResearchById('repeatable').timesResearched).toBe(3);
    expect(manager.getResearchById('repeatable').cost.advancedResearch).toBe(80);
  }
});

test('SMBH research restoration ignores stale automation settings in a snapshot', () => {
  const context = createResearchHarness();
  const manager = context.researchManager;
  manager.setAutoResearchEnabled('completed', true);
  manager.setAutoResearchPriority('completed', 1);
  const snapshot = { research: manager.saveState() };
  manager.setAutoResearchEnabled('completed', false);
  manager.setAutoResearchPriority('completed', 3);

  context.restoreSmbhShellworldSnapshot(snapshot);

  expect(manager.getAutoResearchEnabled('completed')).toBe(false);
  expect(manager.getAutoResearchPriority('completed')).toBe(3);
});

test('ordinary research save loading still restores automation settings and legacy defaults', () => {
  const context = createResearchHarness();
  const manager = context.researchManager;
  manager.setAutoResearchEnabled('completed', true);
  manager.setAutoResearchPriority('completed', 1);
  const saved = manager.saveState();
  manager.setAutoResearchEnabled('completed', false);
  manager.setAutoResearchPriority('completed', 3);

  manager.loadState(saved);
  expect(manager.getAutoResearchEnabled('completed')).toBe(true);
  expect(manager.getAutoResearchPriority('completed')).toBe(1);

  manager.loadState(context.captureSmbhShellworldResearch());
  expect(manager.getAutoResearchEnabled('completed')).toBe(false);
  expect(manager.getAutoResearchPriority('completed')).toBe(4);
});
