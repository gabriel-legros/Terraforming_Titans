const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('reinitializeDisplayElements restores default name and margins', () => {
  const context = {
    defaultPlanetParameters: {
      resources: {
        colony: {
          foo: { displayName: 'Foo', marginTop: 3, marginBottom: 4 },
        },
      },
    },
  };
  const effectCode = fs.readFileSync(
    path.join(__dirname, '..', 'src/js', 'effectable-entity.js'),
    'utf8'
  );
  const resourceCode = fs.readFileSync(
    path.join(__dirname, '..', 'src/js', 'resource.js'),
    'utf8'
  );
  vm.runInNewContext(effectCode, context);
  vm.runInNewContext(resourceCode + '\nthis.Resource = Resource;', context);

  const Resource = context.Resource;
  const res = new Resource({
    name: 'foo',
    category: 'colony',
    displayName: 'Foo',
    marginTop: 3,
    marginBottom: 4,
  });

  res.displayName = 'Bar';
  res.marginTop = 10;
  res.marginBottom = 11;
  res.reinitializeDisplayElements();
  expect(res.displayName).toBe('Foo');
  expect(res.marginTop).toBe(3);
  expect(res.marginBottom).toBe(4);

  res.initializeFromConfig('foo', {
    displayName: 'Baz',
    marginTop: 1,
    marginBottom: 2,
  });
  res.displayName = 'Qux';
  res.marginTop = 7;
  res.marginBottom = 8;
  res.reinitializeDisplayElements();
  expect(res.displayName).toBe('Foo');
  expect(res.marginTop).toBe(3);
  expect(res.marginBottom).toBe(4);
});

