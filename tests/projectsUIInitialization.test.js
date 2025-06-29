const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('initializeProjectsUI', () => {
  test('clears existing project elements', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-list" id="resources-projects-list"><div class="dummy"></div></div>
      <div class="projects-list" id="infrastructure-projects-list"><div></div></div>
      <div class="projects-list" id="story-projects-list"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.projectElements = { dummy: {} };
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);

    ctx.initializeProjectsUI();

    const resList = dom.window.document.getElementById('resources-projects-list');
    const infraList = dom.window.document.getElementById('infrastructure-projects-list');
    const specialList = dom.window.document.getElementById('story-projects-list');
    expect(resList.children.length).toBe(0);
    expect(infraList.children.length).toBe(0);
    expect(Object.keys(ctx.projectElements).length).toBe(0);
    expect(specialList.children.length).toBe(0);
  });
});
