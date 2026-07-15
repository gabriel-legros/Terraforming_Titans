const { createGameDom, loadSaveFromRelativePath } = require('./helpers/jsdom-game-harness');

describe('Research subtabs across world loads', () => {
  let dom;

  afterEach(() => {
    if (dom) {
      dom.window.close();
      dom = null;
    }
  });

  it('restores a standard Research subtab after loading a save from a world where Research is disabled', async () => {
    dom = await createGameDom();
    const { window } = dom;
    loadSaveFromRelativePath(window, 'test_saves/callisto_end.json', { skipRender: true });
    const savedState = JSON.stringify(window.getGameState());
    const energyTab = window.document.querySelector('[data-subtab="energy-research"]');
    const energyContent = window.document.getElementById('energy-research');

    expect(energyTab.classList.contains('hidden')).toBe(false);
    expect(energyContent.classList.contains('hidden')).toBe(false);

    window.eval("currentPlanetParameters = getPlanetParameters('earth'); initializeResearchUI();");

    expect(energyTab.classList.contains('hidden')).toBe(true);
    expect(energyContent.classList.contains('hidden')).toBe(true);

    window.loadGame(savedState, true, { skipRender: true });

    expect(energyTab.classList.contains('hidden')).toBe(false);
    expect(energyContent.classList.contains('hidden')).toBe(false);
  }, 30000);
});
