const {
  createGameDom,
  loadSaveFromRelativePath,
} = require('./helpers/jsdom-game-harness');

describe('Hephaestus yard duration updates', () => {
  let dom;

  afterEach(() => {
    dom?.window?.close();
  });

  test('unassigning yards gives Planet Cracker a finite discrete timer', async () => {
    dom = await createGameDom();
    const { window } = dom;
    loadSaveFromRelativePath(window, 'test_saves/debug/continuous_project_nan.json', {
      skipRender: true,
    });

    const yards = window.projectManager.projects.hephaestusMegaconstruction;
    const cracker = window.projectManager.projects.planetCrackers;
    window.projectManager.updateProjects(0);

    expect(cracker.isExpansionContinuous()).toBe(true);
    expect(cracker.remainingTime).toBe(Infinity);

    yards.clearAssignment('planetCrackers');

    expect(cracker.isExpansionContinuous()).toBe(false);
    expect(Number.isFinite(cracker.startingDuration)).toBe(true);
    expect(Number.isFinite(cracker.remainingTime)).toBe(true);
    expect(cracker.remainingTime).toBe(cracker.getEffectiveDuration());
  }, 60000);

  test.each([false, true])('a paid smasher completes when yards switch it into continuous mode (auto=%s)', async autoStart => {
    dom = await createGameDom({ trackEventListeners: false });
    const { window } = dom;
    loadSaveFromRelativePath(window, 'test_saves/debug/neutron_star_smasher_manual.json', {
      skipRender: true,
    });

    const smasher = window.projectManager.projects.neutronStarSmasher;
    const resources = window.eval('resources');
    const before = resources.spaceStorage.superalloys.value;
    expect(smasher.repeatCount).toBe(89);
    expect(smasher.isContinuous()).toBe(false);
    smasher.autoStart = autoStart;
    window.eval('startProjectWithSelectedResources(projectManager.projects.neutronStarSmasher)');
    expect(before - resources.spaceStorage.superalloys.value).toBeCloseTo(4e25, -12);

    window.updateLogic(1000);
    window.updateLogic(1000);

    if (autoStart) {
      expect(smasher.repeatCount).toBeGreaterThan(89);
    } else {
      expect(smasher.repeatCount).toBe(90);
      expect(smasher.expansionProgress).toBeCloseTo(0, 10);
      expect(smasher.isActive).toBe(false);
    }
    expect(smasher.expansionPrepaidProgress).toBe(0);
  }, 60000);
});
