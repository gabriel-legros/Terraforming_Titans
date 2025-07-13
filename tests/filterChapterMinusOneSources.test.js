const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('filterChapterMinusOneSources utility', () => {
  test('removes sources for chapter -1 events', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');
    const ctx = {
      progressData: { chapters: [ { id:'a', chapter:-1 }, { id:'b', chapter:0 } ] },
      document: { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [], getElementsByClassName: () => [] },
      window: {}
    };
    vm.createContext(ctx);
    vm.runInContext(code + '; this.filterChapterMinusOneSources = filterChapterMinusOneSources;', ctx);
    const sources = [{ type:'chapter', id:'a' }, { type:'chapter', id:'b' }];
    const res = ctx.filterChapterMinusOneSources(sources);
    expect(res).toEqual([{ type:'chapter', id:'b' }]);
  });
});
