const fs = require('fs');
const path = require('path');

const mode = process.argv[2];
const rootDir = path.resolve(__dirname, '..');
const packagePath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const gameVersionPath = path.join(rootDir, 'src', 'js', 'game-version.js');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const packageLockData = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
const versionMatch = packageData.version.match(/^(\d+)\.(\d+)\.(\d+)(?:-playtest\.(\d+))?$/);

if (!versionMatch) {
  throw new Error(`Unsupported game version: ${packageData.version}`);
}

const major = Number(versionMatch[1]);
const minor = Number(versionMatch[2]);
const patch = Number(versionMatch[3]);
const playtest = versionMatch[4] ? Number(versionMatch[4]) : 0;

function getNextVersion() {
  if (mode === 'production') {
    return playtest > 0
      ? `${major}.${minor}.${patch}`
      : `${major}.${minor}.${patch + 1}`;
  }
  if (mode === 'playtest') {
    return playtest > 0
      ? `${major}.${minor}.${patch}-playtest.${playtest + 1}`
      : `${major}.${minor}.${patch + 1}-playtest.1`;
  }
  throw new Error(`Unsupported version update mode: ${mode}`);
}

function getGameVersionSource(version) {
  return `const GAME_VERSION = '${version}';\n`;
}

if (mode === 'check') {
  const expectedSource = getGameVersionSource(packageData.version);
  if (packageLockData.version !== packageData.version
    || packageLockData.packages[''].version !== packageData.version
    || fs.readFileSync(gameVersionPath, 'utf8') !== expectedSource) {
    throw new Error('package.json, package-lock.json, and game-version.js must use the same version');
  }
  process.stdout.write(`Game version ${packageData.version} is synchronized.\n`);
  process.exit(0);
}

const nextVersion = getNextVersion();
packageData.version = nextVersion;
packageLockData.version = nextVersion;
packageLockData.packages[''].version = nextVersion;

fs.writeFileSync(packagePath, `${JSON.stringify(packageData, null, 2)}\n`);
fs.writeFileSync(packageLockPath, `${JSON.stringify(packageLockData, null, 2)}\n`);
fs.writeFileSync(gameVersionPath, getGameVersionSource(nextVersion));
process.stdout.write(`Game version updated to ${nextVersion}.\n`);
