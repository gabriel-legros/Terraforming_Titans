const { JSDOM } = require('jsdom');
const { addTooltipHover } = require('../src/js/ui-utils.js');

describe('addTooltipHover', () => {
  let dom;
  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
  });

  test('adds and removes above class when needed', () => {
    const anchor = document.createElement('div');
    const tooltip = document.createElement('div');
    anchor.appendChild(tooltip);
    addTooltipHover(anchor, tooltip);
    Object.defineProperty(window, 'innerHeight', { value: 500, writable: true });
    tooltip.getBoundingClientRect = () => ({ bottom: 600 });
    anchor.dispatchEvent(new window.Event('mouseenter'));
    expect(tooltip.classList.contains('above')).toBe(true);
    anchor.dispatchEvent(new window.Event('mouseleave'));
    expect(tooltip.classList.contains('above')).toBe(false);
  });

  test('does not add above when within viewport', () => {
    const anchor = document.createElement('div');
    const tooltip = document.createElement('div');
    anchor.appendChild(tooltip);
    addTooltipHover(anchor, tooltip);
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    tooltip.getBoundingClientRect = () => ({ bottom: 400 });
    anchor.dispatchEvent(new window.Event('mouseenter'));
    expect(tooltip.classList.contains('above')).toBe(false);
  });
});
