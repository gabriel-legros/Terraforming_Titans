const fs = require('fs');
const path = require('path');

describe('Solis subtab markup', () => {
  test('index.html hides Solis tab by default', () => {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toMatch(/<div class="hope-subtab hidden" data-subtab="solis-hope">/);
    expect(html).toMatch(/<div id="solis-hope" class="hope-subtab-content hidden">/);
  });
});
