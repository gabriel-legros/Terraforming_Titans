const fs = require('fs');
const path = require('path');

describe('WGC subtab markup', () => {
  test('index.html hides WGC tab by default', () => {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toMatch(/<div class="hope-subtab hidden" data-subtab="wgc-hope">/);
    expect(html).toMatch(/<div id="wgc-hope" class="hope-subtab-content hidden">/);
  });
});
