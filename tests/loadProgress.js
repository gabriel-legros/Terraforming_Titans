const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function loadProgress(context = {}) {
  vm.createContext(context);
  const marsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/story', 'mars.js'), 'utf8');
  const titanCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/story', 'titan.js'), 'utf8');
  const callistoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/story', 'callisto.js'), 'utf8');
  const progressCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
  vm.runInContext(marsCode + titanCode + callistoCode + progressCode, context);
  return context.progressData;
};

