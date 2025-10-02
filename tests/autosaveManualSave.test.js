const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));

describe('autosave slot', () => {
  test('save button is enabled', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const dom = new JSDOM(html);
    const saveButton = dom.window.document.querySelector('.save-button[data-slot="autosave"]');
    expect(saveButton).not.toBeNull();
    expect(saveButton.disabled).toBe(false);
  });
});
