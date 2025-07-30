const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC total operations', () => {
  test('operations completed counter increments', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A'+i, '', 'Soldier', {}));
    }
    wgc.startOperation(0);
    wgc.update(600000); // 10 minutes
    expect(wgc.totalOperations).toBe(1);
    wgc.update(600000);
    expect(wgc.totalOperations).toBe(2);
  });
});
