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
});
