const fs = require('fs');
const path = require('path');

describe('skillsUI createSkillTree', () => {
  const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
  const { JSDOM } = require(jsdomPath);
  const vm = require('vm');

  test('buttons include description and locked skills are disabled', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="skill-points-display">Skill Points: <span id="skill-points-value"></span></div><div id="skill-tree"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.addEffect = () => {};
    const { SkillManager } = require('../skills.js');
    const skillParams = require('../skills-parameters.js');
    ctx.skillManager = new SkillManager(skillParams);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'skillsUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);
    ctx.initializeSkillsUI();

    const buildBtn = dom.window.document.getElementById('skill-build_cost');
    const autoBtn = dom.window.document.getElementById('skill-worker_reduction');
    expect(buildBtn.innerHTML).toMatch(skillParams.build_cost.description);
    expect(autoBtn.disabled).toBe(true);
  });
});
