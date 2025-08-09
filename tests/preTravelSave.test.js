const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');

describe('pre-travel save slot', () => {
  test('slot visibility toggles with saves', () => {
    const dom = new JSDOM('<!DOCTYPE html><table><tr id="pretravel-row" class="hidden"><td id="pretravel-date"></td></tr></table>', {
      url: 'http://localhost',
      runScripts: 'outside-only'
    });
    const ctx = dom.getInternalVMContext();
    ctx.console = console;
    ctx.getGameState = () => ({ foo: 'bar' });
    const storage = {};
    ctx.localStorage = {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; }
    };
    const saveCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/save.js'), 'utf8');
    vm.runInContext(saveCode, ctx);
    const row = dom.window.document.getElementById('pretravel-row');
    ctx.loadSaveSlotDates();
    expect(row.classList.contains('hidden')).toBe(true);
    ctx.saveGameToSlot('pretravel');
    expect(row.classList.contains('hidden')).toBe(false);
    ctx.deleteSaveFileFromSlot('pretravel');
    expect(row.classList.contains('hidden')).toBe(true);
  });
});
