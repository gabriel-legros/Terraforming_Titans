const skillParams = require('../src/js/skills-parameters.js');

describe('new skill parameter definitions', () => {
  test('project_speed skill exists with correct config', () => {
    const skill = skillParams.project_speed;
    expect(skill).toBeDefined();
    expect(skill.maxRank).toBe(5);
    expect(skill.requires).toContain('worker_reduction');
  });

  test('life_design_points skill exists with correct config', () => {
    const skill = skillParams.life_design_points;
    expect(skill).toBeDefined();
    expect(skill.maxRank).toBe(5);
    expect(skill.requires).toContain('pop_growth');
  });

  test('pop_growth requires research_boost after swap', () => {
    const skill = skillParams.pop_growth;
    expect(skill.requires).toContain('research_boost');
  });

  test('android_efficiency requires project_speed', () => {
    const skill = skillParams.android_efficiency;
    expect(skill.requires).toContain('project_speed');
  });
});
