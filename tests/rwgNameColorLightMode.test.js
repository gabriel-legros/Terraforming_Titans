const fs = require('fs');
const path = require('path');

describe('Random World Generator name colors', () => {
  test('star and planet name styles specify light text', () => {
    const rwgCss = fs.readFileSync(path.join(__dirname, '../src/css/rwg.css'), 'utf8');
    const spaceCss = fs.readFileSync(path.join(__dirname, '../src/css/space.css'), 'utf8');
    expect(rwgCss).toMatch(/\.rwg-card h3,\s*\.rwg-card h4\s*\{[^}]*color:\s*var\(--rwg-fg\);/);
    expect(spaceCss).toMatch(/\.rwg-planet-title\s*\{[^}]*color:\s*var\(--rwg-fg\);/);
  });
});
