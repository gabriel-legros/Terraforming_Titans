describe('RWG equilibration surface resources', () => {
  let buildSandboxResourcesFromOverride;
  let copyBackToOverrideFromSandbox;

  beforeEach(() => {
    jest.isolateModules(() => {
      ({ buildSandboxResourcesFromOverride, copyBackToOverrideFromSandbox } = require('../src/js/rwg/rwgEquilibrate.js'));
    });
  });

  test('preserves zonal config and copies updated surface values', () => {
    const override = {
      resources: {
        surface: {
          liquidWater: { initialValue: 1, zonalConfig: { keys: ['liquidWater'] } },
          ice: { initialValue: 2, zonalConfig: { keys: ['ice'] } },
          liquidAmmonia: { initialValue: 3, zonalConfig: { keys: ['liquidAmmonia'] } },
          ammoniaIce: { initialValue: 4, zonalConfig: { keys: ['ammoniaIce'] } },
        },
        atmospheric: {
          atmosphericAmmonia: { initialValue: 5 },
        },
      },
    };

    const sandbox = buildSandboxResourcesFromOverride(override.resources);
    expect(sandbox.surface.liquidWater.zonalConfig).toEqual({ keys: ['liquidWater'] });

    sandbox.surface.liquidWater.value = 10;
    sandbox.surface.liquidAmmonia.value = 7;
    sandbox.surface.ammoniaIce.value = 8;
    sandbox.atmospheric.atmosphericAmmonia.value = 9;

    const out = copyBackToOverrideFromSandbox(override, sandbox);

    expect(out.resources.surface.liquidWater.initialValue).toBe(10);
    expect(out.resources.surface.liquidAmmonia.initialValue).toBe(7);
    expect(out.resources.surface.ammoniaIce.initialValue).toBe(8);
    expect(out.resources.atmospheric.atmosphericAmmonia.initialValue).toBe(9);
  });
});
