const {
  calculateCondensationPressureState,
} = require('../src/js/terraforming/condensation-utils.js');

describe('condensation pressure state', () => {
  test('does not clamp hot surface and lifted temperatures to the freezing point', () => {
    const saturationFn = jest.fn(() => 100);
    const state = calculateCondensationPressureState({
      temp: 300,
      atmPressure: 500,
      saturationFn,
      freezePoint: 50,
      boilingPoint: undefined,
      criticalTemperature: 200,
      liftPressureFraction: 0.9,
      kappa: 1,
    });

    expect(saturationFn).not.toHaveBeenCalled();
    expect(state).toEqual({
      humidityScale: 500,
      saturationPressure: Infinity,
    });
  });

  test('uses the actual lifted temperature when the surface is above critical', () => {
    const evaluatedTemperatures = [];
    const state = calculateCondensationPressureState({
      temp: 300,
      atmPressure: 500,
      saturationFn: temperature => {
        evaluatedTemperatures.push(temperature);
        return temperature;
      },
      freezePoint: 50,
      boilingPoint: undefined,
      criticalTemperature: 200,
      liftPressureFraction: 0.5,
      kappa: 1,
    });

    expect(evaluatedTemperatures).toEqual([150]);
    expect(state).toEqual({
      humidityScale: 500,
      saturationPressure: 300,
    });
  });
});
