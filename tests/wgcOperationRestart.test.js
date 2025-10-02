const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC operation restart', () => {
  test('next event resets after completing an operation', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    expect(wgc.startOperation(0)).toBe(true);
    wgc.update(600000); // complete first operation
    expect(wgc.operations[0].number).toBe(2);
    expect(wgc.operations[0].nextEvent).toBe(60);
  });
});
