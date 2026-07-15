const { createGameDom, loadSaveFromRelativePath } = require('./helpers/jsdom-game-harness');

function getGlobal(window, name) {
  return window.eval(name);
}

function click(window, element) {
  element.dispatchEvent(new window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  }));
}

describe.skip('Galactic Market step save/load', () => {
  let dom;

  afterEach(() => {
    if (dom) {
      dom.window.close();
      dom = null;
    }
  });

  it('persists the selected step size through regular save and load', async () => {
    dom = await createGameDom();
    const { window } = dom;
    loadSaveFromRelativePath(window, 'test_saves/callisto_end.json', { skipRender: true });
    const projectManager = getGlobal(window, 'projectManager');
    const market = projectManager.projects.galactic_market;

    market.unlocked = true;
    window.renderProjects('resources-projects');

    const multiplyButton = window.document.querySelector('.galactic-market-header-controls button:nth-of-type(2)');
    expect(multiplyButton).toBeTruthy();

    click(window, multiplyButton);
    click(window, multiplyButton);
    click(window, multiplyButton);

    expect(market.selectionIncrement).toBe(1000);
    expect(projectManager.saveState().projects.galactic_market.selectionIncrement).toBe(1000);

    const gameState = window.getGameState();
    expect(gameState.projects.projects.galactic_market.selectionIncrement).toBe(1000);

    window.loadGame(JSON.stringify(gameState), true, { skipRender: true });

    const loadedProjectManager = getGlobal(window, 'projectManager');
    const loadedMarket = loadedProjectManager.projects.galactic_market;
    expect(loadedMarket.selectionIncrement).toBe(1000);

    window.renderProjects('resources-projects');
    const plusButtons = Array.from(window.document.querySelectorAll('.galactic-market-controls:not(.galactic-market-header-controls) button:nth-of-type(5)'));
    expect(plusButtons.map(button => button.textContent)).toContain('+1k');

    const firstPlusButton = plusButtons[0];
    const firstBuyInput = window.document.querySelector('.buy-selection-galactic_market');
    expect(firstBuyInput).toBeTruthy();
    click(window, firstPlusButton);

    expect(firstPlusButton.textContent).toBe('+1k');
    expect(firstBuyInput.dataset.quantity).toBe('1000');
    expect(loadedMarket.selectionIncrement).toBe(1000);

    const divideButton = window.document.querySelector('.galactic-market-header-controls button:nth-of-type(1)');
    click(window, divideButton);
    expect(firstPlusButton.textContent).toBe('+100');
    expect(loadedMarket.selectionIncrement).toBe(100);

    click(window, firstPlusButton);
    expect(firstBuyInput.dataset.quantity).toBe('1100');
  });
});
