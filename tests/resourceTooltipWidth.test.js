const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('resource tooltip width', () => {
  test('resource tooltip width is 220px', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'src/css', 'resource.css'), 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><style>${css}</style><div class="resource-item"><span id="tip" class="resource-tooltip"></span></div>`);
    const tooltip = dom.window.document.getElementById('tip');
    tooltip.style.display = 'block';
    const style = dom.window.getComputedStyle(tooltip);
    expect(style.width).toBe('220px');
  });
});
