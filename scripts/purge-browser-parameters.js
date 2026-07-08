const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const rootDir = path.resolve(__dirname, '..');
const outDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(rootDir, 'dist', 'browser');

function parseSource(source) {
  return parser.parse(source, {
    sourceType: 'script',
    plugins: [
      'classProperties',
      'numericSeparator',
      'objectRestSpread',
      'optionalChaining'
    ]
  });
}

function walk(node, visitor) {
  if (!node || !node.type) {
    return;
  }
  visitor(node);
  Object.keys(node).forEach((key) => {
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach((child) => walk(child, visitor));
    } else if (value && value.type) {
      walk(value, visitor);
    }
  });
}

function propName(prop) {
  if (!prop || !prop.key) {
    return '';
  }
  if (prop.key.type === 'Identifier') {
    return prop.key.name;
  }
  if (prop.key.type === 'StringLiteral') {
    return prop.key.value;
  }
  return '';
}

function objectProperty(objectNode, name) {
  if (!objectNode || objectNode.type !== 'ObjectExpression') {
    return null;
  }
  return objectNode.properties.find((prop) => propName(prop) === name) || null;
}

function stringValue(node) {
  return node && node.type === 'StringLiteral' ? node.value : null;
}

function booleanValue(node) {
  return node && node.type === 'BooleanLiteral' ? node.value : null;
}

function isStringArray(node, expected) {
  return node
    && node.type === 'ArrayExpression'
    && node.elements.some((element) => stringValue(element) === expected);
}

function isVariableDeclarator(node, name) {
  return node.type === 'VariableDeclarator'
    && node.id
    && node.id.type === 'Identifier'
    && node.id.name === name;
}

function sortedRemovals(removals) {
  return removals
    .filter((range) => range && range.start < range.end)
    .sort((left, right) => right.start - left.start);
}

function skipWhitespaceForward(source, index) {
  let cursor = index;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function skipWhitespaceBackward(source, index) {
  let cursor = index;
  while (cursor >= 0 && /\s/.test(source[cursor])) {
    cursor -= 1;
  }
  return cursor;
}

function rangeForListItem(source, node) {
  let start = node.start;
  let end = node.end;
  const after = skipWhitespaceForward(source, end);
  if (source[after] === ',') {
    end = after + 1;
    return { start, end };
  }
  const before = skipWhitespaceBackward(source, start - 1);
  if (source[before] === ',') {
    start = before;
  }
  return { start, end };
}

function rangeForStatement(source, node) {
  let end = node.end;
  const after = skipWhitespaceForward(source, end);
  if (source[after] === ';') {
    end = after + 1;
  }
  if (source[end] === '\r' && source[end + 1] === '\n') {
    end += 2;
  } else if (source[end] === '\n') {
    end += 1;
  }
  return { start: node.start, end };
}

function applyRemovals(source, removals) {
  let output = source;
  sortedRemovals(removals).forEach((range) => {
    output = output.slice(0, range.start) + output.slice(range.end);
  });
  return output;
}

function rewriteRelativeFile(relativePath, collectRemovals) {
  const filePath = path.join(outDir, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parseSource(source);
  const removals = collectRemovals(source, ast);
  if (removals.length === 0) {
    console.log(`No browser-only parameter purge needed for ${relativePath}`);
    return 0;
  }
  fs.writeFileSync(filePath, applyRemovals(source, removals));
  console.log(`Purged ${removals.length} Steam-only parameter entries from ${relativePath}`);
  return removals.length;
}

function purgeResearch(source, ast) {
  const removals = [];
  walk(ast, (node) => {
    if (node.type !== 'ArrayExpression') {
      return;
    }
    node.elements.forEach((element) => {
      if (!element || element.type !== 'ObjectExpression') {
        return;
      }
      const featureProp = objectProperty(element, 'requiredGameFeature');
      if (stringValue(featureProp && featureProp.value) === 'steamExclusiveResearch') {
        removals.push(rangeForListItem(source, element));
      }
    });
  });
  return removals;
}

function purgeSpecialSeeds(source, ast) {
  const removals = [];
  walk(ast, (node) => {
    if (!isVariableDeclarator(node, 'specialSeedDefinitions')) {
      return;
    }
    node.init.properties.forEach((prop) => {
      const featureProp = objectProperty(prop.value, 'steamExclusive');
      if (booleanValue(featureProp && featureProp.value) === true) {
        removals.push(rangeForListItem(source, prop));
      }
    });
  });
  return removals;
}

function purgeTerraformingRequirements(source, ast) {
  const removals = [];
  walk(ast, (node) => {
    if (!isVariableDeclarator(node, 'terraformingRequirements')) {
      return;
    }
    node.init.properties.forEach((prop) => {
      const buildTargets = objectProperty(prop.value, 'buildTargets');
      if (isStringArray(buildTargets && buildTargets.value, 'steam')) {
        removals.push(rangeForListItem(source, prop));
      }
    });
  });
  return removals;
}

function purgeProjects(source, ast) {
  const removals = [];
  walk(ast, (node) => {
    if (!isVariableDeclarator(node, 'projectParameters')) {
      return;
    }
    node.init.properties.forEach((prop) => {
      const buildTargets = objectProperty(prop.value, 'buildTargets');
      if (isStringArray(buildTargets && buildTargets.value, 'steam')) {
        removals.push(rangeForListItem(source, prop));
      }
    });
  });
  return removals;
}

function purgeUnusedSpecialSeedOverrides(source, ast) {
  const unusedOverrideNames = new Set([
    'teeBeePeeOverrides',
    'shadesNightmareOverrides'
  ]);
  const removals = [];
  walk(ast, (node) => {
    if (node.type !== 'VariableDeclaration') {
      return;
    }
    if (node.declarations.length !== 1) {
      return;
    }
    const declaration = node.declarations[0];
    if (declaration.id.type === 'Identifier' && unusedOverrideNames.has(declaration.id.name)) {
      removals.push(rangeForStatement(source, node));
    }
  });
  return removals;
}

let total = 0;
total += rewriteRelativeFile('src/js/research-parameters.js', purgeResearch);
total += rewriteRelativeFile('src/js/special-seeds.js', (source, ast) => (
  purgeSpecialSeeds(source, ast).concat(purgeUnusedSpecialSeedOverrides(source, ast))
));
total += rewriteRelativeFile('src/js/terraforming/terraforming-requirements.js', purgeTerraformingRequirements);
total += rewriteRelativeFile('src/js/project-parameters.js', purgeProjects);

console.log(`Browser parameter purge complete: ${total} entries removed.`);
