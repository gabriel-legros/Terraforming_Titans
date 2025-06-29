const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const { activateSubtab } = require('../src/js/ui-utils.js');

describe('activateSubtab utility', () => {
  test('activates subtab without unhiding', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="a-subtab active" data-subtab="first"></div>
      <div class="a-subtab hidden" data-subtab="second"></div>
      <div id="first" class="a-content active"></div>
      <div id="second" class="a-content hidden"></div>`);
    global.document = dom.window.document;

    activateSubtab('a-subtab', 'a-content', 'second');

    const subtab = dom.window.document.querySelector('[data-subtab="second"]');
    const content = dom.window.document.getElementById('second');
    expect(subtab.classList.contains('active')).toBe(true);
    expect(content.classList.contains('active')).toBe(true);
    expect(subtab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);
  });

  test('activates and unhides subtab when requested', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="b-subtab" data-subtab="first"></div>
      <div class="b-subtab hidden" data-subtab="second"></div>
      <div id="first" class="b-content"></div>
      <div id="second" class="b-content hidden"></div>`);
    global.document = dom.window.document;

    activateSubtab('b-subtab', 'b-content', 'second', true);

    const subtab = dom.window.document.querySelector('[data-subtab="second"]');
    const content = dom.window.document.getElementById('second');
    expect(subtab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);
    expect(subtab.classList.contains('active')).toBe(true);
    expect(content.classList.contains('active')).toBe(true);
  });
});
