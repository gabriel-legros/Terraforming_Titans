const path = require('path');
const { JSDOM } = require('jsdom');

function setupSubtabManagerFixture() {
  const dom = new JSDOM(`<!DOCTYPE html>
    <div class="tabs">
      <div class="subtab active" data-subtab="one"></div>
      <div class="subtab" data-subtab="two"></div>
    </div>
    <div id="one" class="content active"></div>
    <div id="two" class="content"></div>`);

  global.window = dom.window;
  global.document = dom.window.document;

  // Ensure ui-utils registers the activateSubtab helper used by SubtabManager
  // eslint-disable-next-line global-require
  require(path.join(__dirname, '..', 'src/js/ui-utils.js'));

  // Load SubtabManager after globals are ready
  // eslint-disable-next-line global-require
  const SubtabManager = require(path.join(__dirname, '..', 'src/js/subtab-manager.js'));
  const manager = new SubtabManager('.subtab', '.content');
  return { manager, dom };
}

describe('SubtabManager helper methods', () => {
  afterEach(() => {
    if (global.window && typeof global.window.close === 'function') {
      global.window.close();
    }
    jest.resetModules();
    delete global.window;
    delete global.document;
    delete global.SubtabManager;
    delete global.activateSubtab;
    delete global.subtabScrollPositions;
  });

  test('getActiveId reads the DOM when no activation has occurred', () => {
    const { manager } = setupSubtabManagerFixture();

    expect(manager.getActiveId()).toBe('one');
    expect(manager.isActive('one')).toBe(true);
    expect(manager.isActive('two')).toBe(false);
  });

  test('getActiveId and isActive track updates and DOM changes', () => {
    const { manager } = setupSubtabManagerFixture();

    manager.activate('two');

    expect(manager.getActiveId()).toBe('two');
    expect(manager.isActive('two')).toBe(true);
    expect(manager.isActive('one')).toBe(false);

    // Simulate an external DOM toggle without calling activate
    const tabOne = document.querySelector('[data-subtab="one"]');
    const tabTwo = document.querySelector('[data-subtab="two"]');
    const contentOne = document.getElementById('one');
    const contentTwo = document.getElementById('two');
    tabOne.classList.add('active');
    tabTwo.classList.remove('active');
    contentOne.classList.add('active');
    contentTwo.classList.remove('active');

    expect(manager.getActiveId()).toBe('one');
    expect(manager.isActive('one')).toBe(true);
    expect(manager.isActive('two')).toBe(false);
  });
});
