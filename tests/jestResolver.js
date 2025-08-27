const path = require('path');

// Custom Jest resolver to normalize dynamic absolute jsdom paths used in tests
// to the locally installed jsdom package. This makes tests portable on Windows
// and Linux without requiring a global jsdom install alongside Node.
module.exports = (request, options) => {
  try {
    if (typeof request === 'string' && /[\\/]+lib[\\/]+node_modules[\\/]+jsdom$/.test(request)) {
      return options.defaultResolver('jsdom', options);
    }
  } catch (e) {
    // fall through to default resolver on any error
  }
  return options.defaultResolver(request, options);
};

