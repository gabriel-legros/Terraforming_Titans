const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('setGameSpeed command', () => {
  test('multiplies delta time in update', () => {
    const ctx = { console, Phaser: { AUTO: 'AUTO', Game: function(){} } };
    ctx.EffectableEntity = class {};
    ctx.planetParameters = { mars: { celestialParameters: { rotationPeriod: 24 }, resources: {}, buildingParameters: { maintenanceFraction: 0 }, populationParameters: {} } };
    vm.createContext(ctx);

    const globalsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'globals.js'), 'utf8');
    const speedCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'game-speed.js'), 'utf8');
    const gameCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'game.js'), 'utf8');

    vm.runInContext(globalsCode, ctx);
    vm.runInContext(speedCode, ctx);
    vm.runInContext(gameCode, ctx);

    vm.runInContext('updateLogic = function(d){ playTimeSeconds += d/1000; }; updateRender = ()=>{}; autosave = ()=>{};', ctx);

    vm.runInContext('setGameSpeed(2);', ctx);
    vm.runInContext('playTimeSeconds = 0;', ctx);
    vm.runInContext('update(0, 1000);', ctx);
    const result = vm.runInContext('playTimeSeconds', ctx);

    expect(result).toBe(2);
  });

  test('speed 0 prevents progression', () => {
    const ctx = { console, Phaser: { AUTO: 'AUTO', Game: function(){} } };
    ctx.EffectableEntity = class {};
    ctx.planetParameters = { mars: { celestialParameters: { rotationPeriod: 24 }, resources: {}, buildingParameters: { maintenanceFraction: 0 }, populationParameters: {} } };
    vm.createContext(ctx);

    const globalsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'globals.js'), 'utf8');
    const speedCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'game-speed.js'), 'utf8');
    const gameCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'game.js'), 'utf8');

    vm.runInContext(globalsCode, ctx);
    vm.runInContext(speedCode, ctx);
    vm.runInContext(gameCode, ctx);

    vm.runInContext('updateLogic = function(d){ playTimeSeconds += d/1000; }; updateRender = ()=>{}; autosave = ()=>{};', ctx);

    vm.runInContext('setGameSpeed(0);', ctx);
    vm.runInContext('playTimeSeconds = 0;', ctx);
    vm.runInContext('update(0, 1000);', ctx);
    const result = vm.runInContext('playTimeSeconds', ctx);

    expect(result).toBe(0);
  });
});
