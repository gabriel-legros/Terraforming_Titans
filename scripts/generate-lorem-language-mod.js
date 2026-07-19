const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repositoryRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repositoryRoot, 'src', 'js', 'lang', 'current-language.js');
const modRoot = path.join(repositoryRoot, 'examples', 'local-mods', 'lorem-ipsum-language');
const patchPath = path.join(modRoot, 'patches', 'language.json');
const manifestPath = path.join(modRoot, 'terraforming-titans.mod.json');
const interpolationPattern = /\{[A-Za-z0-9_.-]+\}/g;
const loremWords = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit',
  'esse', 'cillum', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
];

function readLanguageData() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  let languageData = null;
  vm.runInNewContext(source, {
    setLanguageData(data) {
      languageData = data;
    }
  }, {
    filename: sourcePath,
    timeout: 5000
  });
  if (!languageData) {
    throw new Error('current-language.js did not call setLanguageData.');
  }
  return languageData;
}

function getLoremOffset(seed) {
  const digest = crypto.createHash('sha256').update(seed).digest();
  return digest.readUInt32BE(0) % loremWords.length;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function generateLoremLine(sourceLine, seed) {
  if (!sourceLine) {
    return '';
  }
  const leadingWhitespace = sourceLine.match(/^\s*/)[0];
  const trailingWhitespace = sourceLine.match(/\s*$/)[0];
  const sourceWords = sourceLine.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
  const wordCount = Math.max(1, sourceWords.length);
  const offset = getLoremOffset(seed);
  const words = [];
  for (let i = 0; i < wordCount; i += 1) {
    words.push(loremWords[(offset + i) % loremWords.length]);
  }
  words[0] = capitalize(words[0]);
  const endingMatch = sourceLine.trim().match(/([.!?…:;]+)$/);
  const ending = endingMatch ? endingMatch[1] : '';
  return `${leadingWhitespace}${words.join(' ')}${ending}${trailingWhitespace}`;
}

function transformTextSegment(segment, seed) {
  return segment
    .split('\n')
    .map((line, index) => generateLoremLine(line, `${seed}:line:${index}`))
    .join('\n');
}

function transformLanguageString(value, keyPath) {
  if (keyPath === 'meta.code') {
    return 'la';
  }

  let output = '';
  let lastIndex = 0;
  let tokenIndex = 0;
  for (const match of value.matchAll(interpolationPattern)) {
    output += transformTextSegment(value.slice(lastIndex, match.index), `${keyPath}:part:${tokenIndex}`);
    output += match[0];
    lastIndex = match.index + match[0].length;
    tokenIndex += 1;
  }
  output += transformTextSegment(value.slice(lastIndex), `${keyPath}:part:${tokenIndex}`);

  if (!output || output === value) {
    output = output ? `Lorem ${output}` : 'Lorem ipsum';
  }
  return output;
}

function transformLanguageData(value, pathParts = []) {
  if (typeof value === 'string') {
    return transformLanguageString(value, pathParts.join('.'));
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => transformLanguageData(entry, pathParts.concat(String(index))));
  }
  const output = {};
  Object.keys(value).forEach(key => {
    output[key] = transformLanguageData(value[key], pathParts.concat(key));
  });
  return output;
}

function getInterpolationTokens(value) {
  return value.match(interpolationPattern) || [];
}

function verifyGeneratedLanguage(source, generated, pathParts = [], stats = { strings: 0 }) {
  if (typeof source === 'string') {
    const keyPath = pathParts.join('.');
    if (typeof generated !== 'string') {
      throw new Error(`${keyPath} is no longer a string.`);
    }
    if (generated === source) {
      throw new Error(`${keyPath} was not replaced.`);
    }
    const sourceTokens = getInterpolationTokens(source);
    const generatedTokens = getInterpolationTokens(generated);
    if (JSON.stringify(sourceTokens) !== JSON.stringify(generatedTokens)) {
      throw new Error(`${keyPath} did not preserve its interpolation tokens.`);
    }
    stats.strings += 1;
    return stats;
  }
  if (Array.isArray(source)) {
    if (!Array.isArray(generated) || generated.length !== source.length) {
      throw new Error(`${pathParts.join('.')} changed array shape.`);
    }
    source.forEach((entry, index) => verifyGeneratedLanguage(entry, generated[index], pathParts.concat(String(index)), stats));
    return stats;
  }
  const sourceKeys = Object.keys(source);
  if (JSON.stringify(sourceKeys) !== JSON.stringify(Object.keys(generated))) {
    throw new Error(`${pathParts.join('.')} changed object keys.`);
  }
  sourceKeys.forEach(key => verifyGeneratedLanguage(source[key], generated[key], pathParts.concat(key), stats));
  return stats;
}

function writeGeneratedMod(languageData, stringCount) {
  fs.mkdirSync(path.dirname(patchPath), { recursive: true });
  const manifest = {
    schemaVersion: 1,
    id: 'example.lorem-ipsum-language',
    name: 'Lorem Ipsum Language',
    version: '1.0.0',
    loadOrder: 1000,
    generatedFrom: 'src/js/lang/current-language.js',
    generatedStringCount: stringCount,
    content: {
      patches: [
        {
          target: 'language.current',
          file: 'patches/language.json'
        }
      ],
      replacements: []
    }
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(patchPath, `${JSON.stringify(languageData, null, 2)}\n`, 'utf8');
}

const sourceLanguage = readLanguageData();
const generatedLanguage = transformLanguageData(sourceLanguage);
const stats = verifyGeneratedLanguage(sourceLanguage, generatedLanguage);
writeGeneratedMod(generatedLanguage, stats.strings);
console.log(`Generated ${stats.strings} Lorem ipsum strings in ${path.relative(repositoryRoot, modRoot)}.`);
