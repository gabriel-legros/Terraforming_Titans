const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC operations', () => {
  test('operation progresses and restarts', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      const m = WGCTeamMember.create('A'+i, '', 'Soldier', {});
      wgc.recruitMember(0, i, m);
    }
    expect(wgc.startOperation(0)).toBe(true);
    wgc.update(60000); // 60 seconds
    expect(wgc.operations[0].progress).toBeCloseTo(0.1, 3);
    wgc.update(540000); // remaining 9 minutes
    expect(wgc.operations[0].progress).toBeCloseTo(0, 3);
    expect(wgc.operations[0].active).toBe(true);
  });
});
