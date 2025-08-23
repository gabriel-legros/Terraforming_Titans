const { captureAutoBuildSettings, restoreAutoBuildSettings } = require('../src/js/autobuild');

describe('autobuild travel persistence', () => {
  test('percent persists and checkboxes reset', () => {
    const before = {
      Alpha: { autoBuildPercent: 2, autoBuildEnabled: true, autoBuildPriority: true, autoBuildBasis: 'population', autoActiveEnabled: true },
      Beta: { autoBuildPercent: 5, autoBuildEnabled: true, autoBuildPriority: true, autoBuildBasis: 'workers', autoActiveEnabled: true },
    };
    captureAutoBuildSettings(before);
    const after = {
      Alpha: { autoBuildPercent: 0.1, autoBuildEnabled: true, autoBuildPriority: true, autoBuildBasis: 'population', autoActiveEnabled: true },
      Beta: { autoBuildPercent: 0.1, autoBuildEnabled: true, autoBuildPriority: true, autoBuildBasis: 'population', autoActiveEnabled: true },
      Gamma: { autoBuildPercent: 0.1, autoBuildEnabled: true, autoBuildPriority: true, autoBuildBasis: 'population', autoActiveEnabled: true },
    };
    restoreAutoBuildSettings(after);
    expect(after.Alpha.autoBuildPercent).toBe(2);
    expect(after.Beta.autoBuildPercent).toBe(5);
    expect(after.Gamma.autoBuildPercent).toBe(0.1);
    expect(after.Alpha.autoBuildBasis).toBe('population');
    expect(after.Beta.autoBuildBasis).toBe('workers');
    expect(after.Gamma.autoBuildBasis).toBe('population');
    for (const key of Object.keys(after)) {
      expect(after[key].autoBuildEnabled).toBe(false);
      expect(after[key].autoBuildPriority).toBe(false);
      expect(after[key].autoActiveEnabled).toBe(false);
    }
  });
});
