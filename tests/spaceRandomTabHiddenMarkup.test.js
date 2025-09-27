const fs = require('fs');
const path = require('path');

describe('Space Random subtab markup', () => {
  test('index.html hides Random subtab by default', () => {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toMatch(/<div class="space-subtab hidden" data-subtab="space-random">/);
    expect(html).toMatch(/<div id="space-random" class="space-subtab-content hidden">/);
  });
});
