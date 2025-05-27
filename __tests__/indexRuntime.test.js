/**
 * Test loading index.html scripts in a very small browser-like environment.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('index.html runtime', () => {
  test('scripts execute in browser-like environment without errors', () => {
    // Minimal DOM stubs
    function createNullElement() {
      return new Proxy(function () {}, {
        get: () => createNullElement(),
        apply: () => createNullElement(),
        set: () => true,
      });
    }
    const nullElement = createNullElement();
    const documentStub = {
      createElement: () => nullElement,
      getElementById: () => nullElement,
      querySelector: () => nullElement,
      querySelectorAll: () => [],
      getElementsByClassName: () => [],
      body: nullElement,
      addEventListener: () => {},
    };
    global.document = documentStub;
    global.window = { document: documentStub, addEventListener: () => {} };
    global.Phaser = { AUTO: 'AUTO', Game: function (config) { this.config = config; } };

    const htmlPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const srcRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
    const sources = [];
    let match;
    while ((match = srcRegex.exec(html)) !== null) {
      sources.push(match[1]);
    }

    const context = vm.createContext(global);
    const errors = [];
    for (const src of sources) {
      if (/^https?:\/\//.test(src)) continue; // skip CDN scripts
      const file = path.join(__dirname, '..', src);
      const code = fs.readFileSync(file, 'utf8');
      try {
        vm.runInContext(code, context);
      } catch (err) {
        errors.push({ script: src, message: err.message });
      }
    }

    if (errors.length) {
      throw new Error('Script errors: ' + JSON.stringify(errors, null, 2));
    }
  });
});
