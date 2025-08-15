const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Solis reward tooltip', () => {
  test('explains reward scaling', () => {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const control = dom.window.document.querySelector('.solis-reward-control');
    const icon = control && control.querySelector('.info-tooltip-icon');
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('title')).toBe('Multiplied by square root of worlds terraformed');
  });
});
