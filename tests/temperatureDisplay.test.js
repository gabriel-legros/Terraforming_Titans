const { toDisplayTemperature, getTemperatureUnit } = require('../src/js/numbers.js');

describe('temperature display helpers', () => {
  test('kelvin default', () => {
    global.gameSettings = { useCelsius: false };
    expect(toDisplayTemperature(273.15)).toBeCloseTo(273.15);
    expect(getTemperatureUnit()).toBe('K');
  });

  test('celsius enabled', () => {
    global.gameSettings = { useCelsius: true };
    expect(toDisplayTemperature(273.15)).toBeCloseTo(0);
    expect(getTemperatureUnit()).toBe('\u00B0C');
  });
});
