const fs = require('fs');
const path = require('path');

describe('index.html script imports', () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const srcRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const sources = [];
  let match;
  while ((match = srcRegex.exec(html)) !== null) {
    sources.push(match[1]);
  }

  test('all local script files exist', () => {
    const missing = sources
      .filter(src => !/^https?:\/\//.test(src))
      .filter(src => !fs.existsSync(path.join(__dirname, '..', src)));

    expect(missing).toEqual([]);
  });
});
