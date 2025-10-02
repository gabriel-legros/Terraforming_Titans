const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC stance weighting', () => {
  test('negotiation stance favors social science events', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A'+i, '', 'Soldier', {}));
    }
    jest.spyOn(Math, 'random').mockReturnValue(0.89);
    let ev = wgc.chooseEvent(0);
    expect(ev.name).toBe('Combat challenge');
    wgc.setStance(0, 'Negotiation');
    ev = wgc.chooseEvent(0);
    expect(ev.name).toBe('Social Science challenge');
    wgc.setStance(0, 'Aggressive');
    ev = wgc.chooseEvent(0);
    expect(ev.name).toBe('Combat challenge');
    Math.random.mockRestore();
  });

  test('aggressive stance eliminates social science events', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('B'+i, '', 'Soldier', {}));
    }
    jest.spyOn(Math, 'random').mockReturnValue(0.8);
    let ev = wgc.chooseEvent(0);
    expect(ev.name).toBe('Social Science challenge');
    wgc.setStance(0, 'Aggressive');
    ev = wgc.chooseEvent(0);
    expect(ev.name).not.toBe('Social Science challenge');
    Math.random.mockRestore();
  });
});
