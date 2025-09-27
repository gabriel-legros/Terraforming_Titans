const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('empty building messages cache', () => {
  function setup() {
    const html = `<!DOCTYPE html>
      <div id="resource-buildings-buttons"></div>
      <div id="production-buildings-buttons"></div>
      <div id="energy-buildings-buttons"></div>
      <div id="storage-buildings-buttons"></div>
      <div id="terraforming-buildings-buttons"></div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    return { dom, ctx };
  }

  test('invalidateStructureUICache rebuilds row cache', () => {
    const { dom, ctx } = setup();
    const container = dom.window.document.getElementById('resource-buildings-buttons');
    const row = dom.window.document.createElement('div');
    row.className = 'combined-building-row';
    container.appendChild(row);

    ctx.updateEmptyBuildingMessages();
    expect(dom.window.document.getElementById('resource-buildings-buttons-empty-message')).toBeNull();

    row.remove();
    ctx.updateEmptyBuildingMessages();
    expect(dom.window.document.getElementById('resource-buildings-buttons-empty-message')).toBeNull();

    ctx.invalidateStructureUICache();
    ctx.updateEmptyBuildingMessages();
    expect(dom.window.document.getElementById('resource-buildings-buttons-empty-message')).not.toBeNull();
  });
});
