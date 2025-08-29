const fs = require('fs');
const path = require('path');

describe('milestone hover effect', () => {
  test('milestone button hover applies jump effect', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'src/css', 'milestones.css'), 'utf8');
    const hoverSection = css.match(/\.milestone-button:hover\s*{[^}]*}/);
    expect(hoverSection).not.toBeNull();
    expect(hoverSection[0]).toMatch(/transform:\s*translateY\(-3px\)/);
    expect(hoverSection[0]).toMatch(/box-shadow:\s*0 4px 12px rgba\(0, 0, 0, 0\.4\)/);
  });
});
