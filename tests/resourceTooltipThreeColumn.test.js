const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const { addTooltipHover } = require('../src/js/ui-utils.js');

describe('resource tooltip three column layout', () => {
  test('splits into three columns when too tall', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    global.window = dom.window;
    global.document = dom.window.document;
    Object.defineProperty(window, 'innerHeight', { value: 500, writable: true });

    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    global.setResourceTooltipColumns = ctx.setResourceTooltipColumns;
    const tooltip = ctx.createTooltipElement('metal');
    const anchor = document.createElement('div');
    anchor.appendChild(tooltip);
    document.body.appendChild(anchor);

    tooltip.getBoundingClientRect = () => {
      if (tooltip.classList.contains('above')) {
        return { top: -10, bottom: 0 };
      }
      return { top: 0, bottom: window.innerHeight + 10 };
    };

    addTooltipHover(anchor, tooltip);
    anchor.dispatchEvent(new window.Event('mouseenter'));
    expect(tooltip.classList.contains('three-column')).toBe(true);
    expect(tooltip.children.length).toBe(3);

    anchor.dispatchEvent(new window.Event('mouseleave'));
    expect(tooltip.classList.contains('three-column')).toBe(false);
    expect(tooltip.children.length).toBe(1);

    delete global.setResourceTooltipColumns;
    delete global.window;
    delete global.document;
  });
});
