#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const repoRoot = path.resolve(__dirname, '..', '..');
const defaultSavePath = path.join(repoRoot, 'test_saves', 'debug', 'memory_test_file.json');
const defaultReportDir = path.join(__dirname, 'memory-reports');

function parseArgs(argv) {
  const options = {
    save: defaultSavePath,
    durationSeconds: 10,
    sampleSeconds: 0.5,
    settleSeconds: 2,
    headless: false,
    channel: 'chrome',
    tabs: true,
    forceGc: false,
    reportDir: defaultReportDir,
    port: 0,
    origin: null,
    finalTab: null,
    finalSubtab: null,
    freezeLoop: false,
    audit: false,
    storyProjects: false,
    rounds: 3,
    phaseSeconds: 2,
    stackAttribution: true,
    heapSampling: true,
    nativeMemory: false,
    nativeSamplingInterval: 32768,
    stringDuplicates: true,
    duplicateStringMinLength: 24,
    duplicateStringLimit: 50
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--save') {
      options.save = path.resolve(next);
      index += 1;
    } else if (arg === '--duration') {
      options.durationSeconds = Number(next);
      index += 1;
    } else if (arg === '--sample') {
      options.sampleSeconds = Number(next);
      index += 1;
    } else if (arg === '--settle') {
      options.settleSeconds = Number(next);
      index += 1;
    } else if (arg === '--report-dir') {
      options.reportDir = path.resolve(next);
      index += 1;
    } else if (arg === '--channel') {
      options.channel = next;
      index += 1;
    } else if (arg === '--port') {
      options.port = Number(next);
      index += 1;
    } else if (arg === '--origin') {
      options.origin = next;
      index += 1;
    } else if (arg === '--final-tab') {
      options.finalTab = next;
      index += 1;
    } else if (arg === '--final-subtab') {
      options.finalSubtab = next;
      index += 1;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg === '--headed') {
      options.headless = false;
    } else if (arg === '--no-tabs') {
      options.tabs = false;
    } else if (arg === '--force-gc') {
      options.forceGc = true;
    } else if (arg === '--freeze-loop') {
      options.freezeLoop = true;
    } else if (arg === '--audit') {
      options.audit = true;
    } else if (arg === '--story-projects') {
      options.storyProjects = true;
      options.audit = true;
    } else if (arg === '--rounds') {
      options.rounds = Number(next);
      index += 1;
    } else if (arg === '--phase-duration') {
      options.phaseSeconds = Number(next);
      index += 1;
    } else if (arg === '--no-stack-attribution') {
      options.stackAttribution = false;
    } else if (arg === '--no-heap-sampling') {
      options.heapSampling = false;
    } else if (arg === '--native-memory') {
      options.nativeMemory = true;
    } else if (arg === '--native-sampling-interval') {
      options.nativeSamplingInterval = Number(next);
      index += 1;
    } else if (arg === '--no-string-duplicates') {
      options.stringDuplicates = false;
    } else if (arg === '--duplicate-string-min-length') {
      options.duplicateStringMinLength = Number(next);
      index += 1;
    } else if (arg === '--duplicate-string-limit') {
      options.duplicateStringLimit = Number(next);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.durationSeconds) || options.durationSeconds <= 0) {
    throw new Error('--duration must be a positive number of seconds');
  }
  if (!Number.isFinite(options.sampleSeconds) || options.sampleSeconds <= 0) {
    throw new Error('--sample must be a positive number of seconds');
  }
  if (!Number.isFinite(options.settleSeconds) || options.settleSeconds < 0) {
    throw new Error('--settle must be a non-negative number of seconds');
  }
  if (!Number.isInteger(options.rounds) || options.rounds <= 0) {
    throw new Error('--rounds must be a positive integer');
  }
  if (!Number.isFinite(options.phaseSeconds) || options.phaseSeconds < 0) {
    throw new Error('--phase-duration must be a non-negative number of seconds');
  }
  if (!Number.isFinite(options.duplicateStringMinLength) || options.duplicateStringMinLength < 0) {
    throw new Error('--duplicate-string-min-length must be a non-negative number');
  }
  if (!Number.isFinite(options.duplicateStringLimit) || options.duplicateStringLimit <= 0) {
    throw new Error('--duplicate-string-limit must be a positive number');
  }
  if (!Number.isFinite(options.nativeSamplingInterval) || options.nativeSamplingInterval <= 0) {
    throw new Error('--native-sampling-interval must be a positive number of bytes');
  }
  if (options.audit && options.freezeLoop) {
    throw new Error('--freeze-loop cannot be combined with --audit; audit mode owns the running/manual-pause state');
  }

  return options;
}

function printHelp() {
  console.log([
    'Usage: node scripts/manual-tests/run-chrome-memory-repro.js [options]',
    '',
    'Options:',
    '  --save <path>         Save JSON to load. Default: test_saves/debug/memory_test_file.json',
    '  --duration <seconds>  Sampling duration after settle. Default: 10',
    '  --sample <seconds>    Seconds between samples. Default: 0.5',
    '  --settle <seconds>    Time to wait after loading before baseline. Default: 2',
    '  --channel <name>      Playwright browser channel. Default: chrome',
    '  --headless            Run headless instead of opening Chrome',
    '  --headed              Force headed mode',
    '  --no-tabs             Do not cycle visible tabs/subtabs before idling',
    '  --force-gc            Ask Chrome to collect garbage before each sample',
    '  --report-dir <path>   Output directory. Default: scripts/manual-tests/memory-reports',
    '  --origin <url>        Use an already running local server instead of starting one',
    '  --port <number>       Port for the temporary local server. Default: random free port',
    '  --final-tab <id>      Activate this main tab before sampling, for example space',
    '  --final-subtab <id>   Activate this subtab before sampling, for example space-artificial',
    '  --freeze-loop         Set gameSpeed to 0 before sampling',
    '  --audit               Run the named UI/lifecycle scenario matrix instead of one idle sample',
    '  --story-projects      Add a real-travel sweep of every story-project world and special seed',
    '  --rounds <count>      Repetitions per audit scenario. Default: 3',
    '  --phase-duration <s>  Idle wait before each audit endpoint snapshot. Default: 2',
    '  --no-stack-attribution Count operation types without collecting a stack for every DOM call',
    '  --no-heap-sampling    Disable V8 allocation sampling',
    '  --native-memory       Add matched extra-native snapshots, native allocation sampling, and Chromium process memory',
    '  --native-sampling-interval <bytes> Average bytes between native allocation samples. Default: 32768',
    '  --no-string-duplicates Disable final heap snapshot duplicate-string summary',
    '  --duplicate-string-min-length <n> Minimum string length to include. Default: 24',
    '  --duplicate-string-limit <n> Number of duplicate string rows to keep. Default: 50'
  ].join('\n'));
}

function requirePlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    console.error('Playwright is not installed. Install it with:');
    console.error('  npm install --save-dev playwright');
    console.error('Then install a browser if needed:');
    console.error('  npx playwright install chromium');
    process.exit(1);
  }
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.wav') return 'audio/wav';
  return 'application/octet-stream';
}

function startStaticServer(port) {
  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, 'http://127.0.0.1');
    const decodedPath = decodeURIComponent(requestUrl.pathname);
    const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
    const filePath = path.resolve(repoRoot, relativePath);

    if (!filePath.startsWith(repoRoot + path.sep) && filePath !== repoRoot) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        origin: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function createWindowsProcessMemorySampler() {
  const script = [
    '$input | ForEach-Object {',
    '  $ids = @($_.Split(\",\") | Where-Object { $_ } | ForEach-Object { [int]$_ })',
    '  $rows = @(Get-Process -Id $ids -ErrorAction SilentlyContinue | ForEach-Object {',
    '    [pscustomobject]@{',
    '      id = [int]$_.Id',
    '      workingSetBytes = [double]$_.WorkingSet64',
    '      privateBytes = [double]$_.PrivateMemorySize64',
    '      virtualBytes = [double]$_.VirtualMemorySize64',
    '      pagedBytes = [double]$_.PagedMemorySize64',
    '      handleCount = [int]$_.HandleCount',
    '    }',
    '  })',
    '  [pscustomobject]@{ rows = $rows } | ConvertTo-Json -Compress -Depth 3',
    '}'
  ].join('\n');
  const child = spawn('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    script
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });
  const pending = [];
  let output = '';
  let stderr = '';
  let exited = false;

  function rejectPending(error) {
    while (pending.length) pending.shift().reject(error);
  }

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    output += chunk;
    let newline = output.indexOf('\n');
    while (newline >= 0) {
      const line = output.slice(0, newline).trim();
      output = output.slice(newline + 1);
      if (line) {
        const request = pending.shift();
        if (request) {
          try {
            request.resolve(JSON.parse(line).rows || []);
          } catch (error) {
            request.reject(new Error(`Could not parse Chromium process memory: ${line}\n${error.message}`));
          }
        }
      }
      newline = output.indexOf('\n');
    }
  });
  child.stderr.on('data', chunk => {
    stderr += chunk;
  });
  child.on('error', rejectPending);
  child.on('close', (code) => {
    exited = true;
    if (code !== 0) {
      rejectPending(new Error(`Chromium process memory sampler exited with code ${code}: ${stderr.trim()}`));
    }
  });

  return {
    sample(processInfo) {
      return new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
        child.stdin.write(processInfo.map(process => process.id).join(',') + '\n');
      });
    },
    close() {
      if (exited) return Promise.resolve();
      return new Promise((resolve) => {
        child.once('close', resolve);
        child.stdin.end();
      });
    }
  };
}

function summarizeChromiumProcessMemory(processInfo, memoryRows) {
  const memoryById = new Map(memoryRows.map(row => [row.id, row]));
  const byType = {};
  const processes = processInfo.map((process) => {
    const memory = memoryById.get(process.id) || {
      workingSetBytes: 0,
      privateBytes: 0,
      virtualBytes: 0,
      pagedBytes: 0,
      handleCount: 0
    };
    const type = process.type;
    if (!byType[type]) {
      byType[type] = {
        count: 0,
        workingSetBytes: 0,
        privateBytes: 0,
        virtualBytes: 0,
        pagedBytes: 0,
        handleCount: 0
      };
    }
    byType[type].count += 1;
    byType[type].workingSetBytes += memory.workingSetBytes;
    byType[type].privateBytes += memory.privateBytes;
    byType[type].virtualBytes += memory.virtualBytes;
    byType[type].pagedBytes += memory.pagedBytes;
    byType[type].handleCount += memory.handleCount;
    return {
      type,
      id: process.id,
      cpuTime: process.cpuTime,
      ...memory
    };
  });
  const total = Object.values(byType).reduce((sum, entry) => ({
    count: sum.count + entry.count,
    workingSetBytes: sum.workingSetBytes + entry.workingSetBytes,
    privateBytes: sum.privateBytes + entry.privateBytes,
    virtualBytes: sum.virtualBytes + entry.virtualBytes,
    pagedBytes: sum.pagedBytes + entry.pagedBytes,
    handleCount: sum.handleCount + entry.handleCount
  }), {
    count: 0,
    workingSetBytes: 0,
    privateBytes: 0,
    virtualBytes: 0,
    pagedBytes: 0,
    handleCount: 0
  });
  return { total, byType, processes };
}

function flattenChromiumProcessMemory(processMemory) {
  const browser = processMemory.byType.browser || {};
  const renderer = processMemory.byType.renderer || {};
  const gpu = processMemory.byType.GPU || {};
  return {
    chromiumWorkingSetBytes: processMemory.total.workingSetBytes,
    chromiumPrivateBytes: processMemory.total.privateBytes,
    chromiumVirtualBytes: processMemory.total.virtualBytes,
    chromiumHandleCount: processMemory.total.handleCount,
    browserWorkingSetBytes: browser.workingSetBytes || 0,
    browserPrivateBytes: browser.privateBytes || 0,
    rendererWorkingSetBytes: renderer.workingSetBytes || 0,
    rendererPrivateBytes: renderer.privateBytes || 0,
    gpuWorkingSetBytes: gpu.workingSetBytes || 0,
    gpuPrivateBytes: gpu.privateBytes || 0
  };
}

function createNativeMemoryCollector(cdpSession, browserCdpSession, samplingInterval) {
  if (process.platform !== 'win32') {
    throw new Error('--native-memory requires Windows Node so Chromium private and working-set bytes can be sampled');
  }
  const processSampler = createWindowsProcessMemorySampler();

  return {
    async start() {
      await cdpSession.send('Memory.startSampling', {
        samplingInterval,
        suppressRandomness: false
      });
    },
    async collectProcessMemory() {
      const result = await browserCdpSession.send('SystemInfo.getProcessInfo');
      const rows = await processSampler.sample(result.processInfo);
      return summarizeChromiumProcessMemory(result.processInfo, rows);
    },
    async finish() {
      const rendererProfile = await cdpSession.send('Memory.getSamplingProfile');
      const rendererAllTimeProfile = await cdpSession.send('Memory.getAllTimeSamplingProfile');
      const browserProfile = await browserCdpSession.send('Memory.getBrowserSamplingProfile');
      await cdpSession.send('Memory.stopSampling');
      return {
        rendererMeasuredWindow: summarizeNativeSamplingProfile(rendererProfile.profile),
        rendererAllTime: summarizeNativeSamplingProfile(rendererAllTimeProfile.profile),
        browserAllTime: summarizeNativeSamplingProfile(browserProfile.profile)
      };
    },
    close() {
      return processSampler.close();
    }
  };
}

function summarizeSeries(samples) {
  if (samples.length === 0) {
    return {};
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const heapValues = samples.map(sample => sample.jsHeapUsedSize).filter(Number.isFinite);
  const domValues = samples.map(sample => sample.domNodes).filter(Number.isFinite);
  const privateValues = samples.map(sample => sample.chromiumPrivateBytes).filter(Number.isFinite);
  const workingSetValues = samples.map(sample => sample.chromiumWorkingSetBytes).filter(Number.isFinite);
  const maxHeap = heapValues.length ? Math.max(...heapValues) : null;
  const minHeap = heapValues.length ? Math.min(...heapValues) : null;
  const maxDom = domValues.length ? Math.max(...domValues) : null;
  const minDom = domValues.length ? Math.min(...domValues) : null;
  return {
    samples: samples.length,
    first,
    last,
    heapDeltaBytes: Number.isFinite(first.jsHeapUsedSize) && Number.isFinite(last.jsHeapUsedSize)
      ? last.jsHeapUsedSize - first.jsHeapUsedSize
      : null,
    domNodeDelta: Number.isFinite(first.domNodes) && Number.isFinite(last.domNodes)
      ? last.domNodes - first.domNodes
      : null,
    chromiumPrivateDeltaBytes: Number.isFinite(first.chromiumPrivateBytes) && Number.isFinite(last.chromiumPrivateBytes)
      ? last.chromiumPrivateBytes - first.chromiumPrivateBytes
      : null,
    chromiumWorkingSetDeltaBytes: Number.isFinite(first.chromiumWorkingSetBytes) && Number.isFinite(last.chromiumWorkingSetBytes)
      ? last.chromiumWorkingSetBytes - first.chromiumWorkingSetBytes
      : null,
    maxHeapBytes: maxHeap,
    minHeapBytes: minHeap,
    maxDomNodes: maxDom,
    minDomNodes: minDom,
    maxChromiumPrivateBytes: privateValues.length ? Math.max(...privateValues) : null,
    minChromiumPrivateBytes: privateValues.length ? Math.min(...privateValues) : null,
    maxChromiumWorkingSetBytes: workingSetValues.length ? Math.max(...workingSetValues) : null,
    minChromiumWorkingSetBytes: workingSetValues.length ? Math.min(...workingSetValues) : null
  };
}

function toCsv(samples) {
  const headers = [
    'elapsedSeconds',
    'jsHeapUsedSize',
    'jsHeapTotalSize',
    'chromiumWorkingSetBytes',
    'chromiumPrivateBytes',
    'chromiumVirtualBytes',
    'chromiumHandleCount',
    'browserWorkingSetBytes',
    'browserPrivateBytes',
    'rendererWorkingSetBytes',
    'rendererPrivateBytes',
    'gpuWorkingSetBytes',
    'gpuPrivateBytes',
    'layoutCount',
    'recalcStyleCount',
    'layoutDuration',
    'recalcStyleDuration',
    'scriptDuration',
    'taskDuration',
    'domNodes',
    'domDocuments',
    'domListeners',
    'elementCount',
    'connectedNodeCount',
    'connectedTextNodeCount',
    'connectedCommentNodeCount',
    'bodyTooltipCount',
    'connectedExtraCount',
    'addedNodeCount',
    'removedNodeCount',
    'createdElementCount',
    'createdTextNodeCount',
    'innerHTMLSetCount',
    'replaceChildrenCount',
    'cloneNodeCount',
    'domQueryCount',
    'textContentSetCount',
    'nodeValueSetCount',
    'setAttributeCount',
    'classListWriteCount',
    'styleWriteCount',
    'listenerAddCount',
    'listenerRemoveCount',
    'activeListenerAddCount',
    'detachedActiveListenerAddCount',
    'persistentActiveListenerAddCount',
    'connectedMoveCount'
  ];
  const rows = samples.map(sample => headers.map(header => sample[header]).join(','));
  return [headers.join(','), ...rows].join('\n') + '\n';
}

function auditToCsv(audit) {
  const headers = [
    'name',
    'heapDeltaBytes',
    'chromiumWorkingSetDeltaBytes',
    'chromiumPrivateDeltaBytes',
    'browserPrivateDeltaBytes',
    'rendererPrivateDeltaBytes',
    'gpuPrivateDeltaBytes',
    'domNodeDelta',
    'domDocumentDelta',
    'domListenerDelta',
    'elementDelta',
    'connectedNodeDelta',
    'connectedTextNodeDelta',
    'connectedCommentNodeDelta',
    'tooltipDelta',
    'dynamicTooltipAnchorDelta',
    'disconnectedTooltipAnchorDelta',
    'newDetachedCacheReferences',
    'createdElementCount',
    'createdTextNodeCount',
    'connectedMoveCount',
    'addedNodeCount',
    'removedNodeCount',
    'innerHTMLSetCount',
    'replaceChildrenCount',
    'textContentSetCount',
    'classListWriteCount',
    'styleWriteCount',
    'domQueryCount',
    'listenerAddCount',
    'listenerRemoveCount',
    'activeListenerAddCount',
    'detachedActiveListenerAddCount',
    'persistentActiveListenerAddCount',
    'layoutCountDelta',
    'recalcStyleCountDelta',
    'scriptDurationDelta',
    'taskDurationDelta'
  ];
  const escape = value => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  const rows = audit.phases.map((phase) => {
    const values = [
      phase.name,
      phase.delta.jsHeapUsedSize,
      phase.delta.chromiumWorkingSetBytes,
      phase.delta.chromiumPrivateBytes,
      phase.delta.browserPrivateBytes,
      phase.delta.rendererPrivateBytes,
      phase.delta.gpuPrivateBytes,
      phase.delta.domNodes,
      phase.delta.domDocuments,
      phase.delta.domListeners,
      phase.delta.elementCount,
      phase.delta.connectedNodeCount,
      phase.delta.connectedTextNodeCount,
      phase.delta.connectedCommentNodeCount,
      phase.delta.bodyTooltipCount,
      phase.delta.dynamicTooltipAnchorCount,
      phase.delta.disconnectedTooltipAnchorCount,
      phase.delta.newDetachedCacheReferences.length,
      phase.probe.createdElementCount,
      phase.probe.createdTextNodeCount,
      phase.probe.connectedMoveCount,
      phase.probe.addedNodeCount,
      phase.probe.removedNodeCount,
      phase.probe.innerHTMLSetCount,
      phase.probe.replaceChildrenCount,
      phase.probe.textContentSetCount,
      phase.probe.classListWriteCount,
      phase.probe.styleWriteCount,
      phase.probe.domQueryCount,
      phase.probe.listenerAddCount,
      phase.probe.listenerRemoveCount,
      phase.probe.activeListenerAddCount,
      phase.probe.detachedActiveListenerAddCount,
      phase.probe.persistentActiveListenerAddCount,
      phase.delta.layoutCount,
      phase.delta.recalcStyleCount,
      phase.delta.scriptDuration,
      phase.delta.taskDuration
    ];
    return values.map(escape).join(',');
  });
  return [headers.join(','), ...rows].join('\n') + '\n';
}

function summarizeHeapSamplingProfile(profile, limit = 30) {
  const rowsByKey = new Map();

  function visit(node) {
    const frame = node.callFrame || {};
    const functionName = frame.functionName || '(anonymous)';
    const url = frame.url || '';
    const lineNumber = Number.isFinite(frame.lineNumber) ? frame.lineNumber + 1 : 0;
    const columnNumber = Number.isFinite(frame.columnNumber) ? frame.columnNumber + 1 : 0;
    const key = `${functionName}|${url}|${lineNumber}|${columnNumber}`;
    const existing = rowsByKey.get(key) || {
      functionName,
      url,
      lineNumber,
      columnNumber,
      selfSize: 0
    };
    existing.selfSize += node.selfSize || 0;
    rowsByKey.set(key, existing);
    (node.children || []).forEach(visit);
  }

  if (profile && profile.head) {
    visit(profile.head);
  }

  return Array.from(rowsByKey.values())
    .filter(row => row.selfSize > 0)
    .sort((a, b) => b.selfSize - a.selfSize)
    .slice(0, limit);
}

function summarizeNativeSamplingProfile(profile, limit = 30) {
  const rowsByStack = new Map();
  (profile.samples || []).forEach((sample) => {
    const stack = sample.stack.length ? sample.stack : ['(unknown native stack)'];
    const key = stack.join('\n');
    const row = rowsByStack.get(key) || {
      stack,
      sampleCount: 0,
      sampledAllocationBytes: 0,
      attributedBytes: 0
    };
    row.sampleCount += 1;
    row.sampledAllocationBytes += sample.size;
    row.attributedBytes += sample.total;
    rowsByStack.set(key, row);
  });
  const rows = Array.from(rowsByStack.values())
    .sort((a, b) => b.attributedBytes - a.attributedBytes);
  return {
    sampleCount: (profile.samples || []).length,
    sampledAllocationBytes: rows.reduce((sum, row) => sum + row.sampledAllocationBytes, 0),
    attributedBytes: rows.reduce((sum, row) => sum + row.attributedBytes, 0),
    moduleCount: (profile.modules || []).length,
    top: rows.slice(0, limit)
  };
}

async function takeHeapSnapshot(cdpSession) {
  const chunks = [];
  const onChunk = event => {
    chunks.push(event.chunk);
  };
  cdpSession.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  try {
    await cdpSession.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  } finally {
    cdpSession.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  }
  return JSON.parse(chunks.join(''));
}

function summarizeHeapSnapshotMemory(snapshot) {
  const metadata = snapshot.snapshot;
  const nodeFields = metadata.meta.node_fields;
  const fieldCount = nodeFields.length;
  const selfSizeOffset = nodeFields.indexOf('self_size');
  let nodeSelfSizeBytes = 0;
  for (let index = selfSizeOffset; index < snapshot.nodes.length; index += fieldCount) {
    nodeSelfSizeBytes += snapshot.nodes[index];
  }
  const extraNativeBytes = metadata.extra_native_bytes || 0;
  return {
    nodeCount: metadata.node_count,
    edgeCount: metadata.edge_count,
    nodeSelfSizeBytes,
    extraNativeBytes,
    snapshotAccountedBytes: nodeSelfSizeBytes + extraNativeBytes
  };
}

async function collectNativeCheckpoint(cdpSession, nativeMemoryCollector, snapshot) {
  const heapSnapshot = snapshot || await takeHeapSnapshot(cdpSession);
  const processMemory = await nativeMemoryCollector.collectProcessMemory();
  return {
    heapSnapshot: summarizeHeapSnapshotMemory(heapSnapshot),
    processMemory,
    ...flattenChromiumProcessMemory(processMemory)
  };
}

function diffNativeCheckpoints(before, after) {
  const fields = [
    'chromiumWorkingSetBytes',
    'chromiumPrivateBytes',
    'chromiumVirtualBytes',
    'chromiumHandleCount',
    'browserWorkingSetBytes',
    'browserPrivateBytes',
    'rendererWorkingSetBytes',
    'rendererPrivateBytes',
    'gpuWorkingSetBytes',
    'gpuPrivateBytes'
  ];
  const delta = {};
  fields.forEach(field => {
    delta[field] = after[field] - before[field];
  });
  delta.nodeSelfSizeBytes = after.heapSnapshot.nodeSelfSizeBytes - before.heapSnapshot.nodeSelfSizeBytes;
  delta.extraNativeBytes = after.heapSnapshot.extraNativeBytes - before.heapSnapshot.extraNativeBytes;
  delta.snapshotAccountedBytes = after.heapSnapshot.snapshotAccountedBytes - before.heapSnapshot.snapshotAccountedBytes;
  return delta;
}

function summarizeDuplicateStrings(snapshot, options = {}) {
  const minLength = options.minLength || 0;
  const limit = options.limit || 50;
  const meta = snapshot.snapshot && snapshot.snapshot.meta;
  const nodeFields = meta.node_fields;
  const nodeTypes = meta.node_types[0];
  const fieldCount = nodeFields.length;
  const typeOffset = nodeFields.indexOf('type');
  const nameOffset = nodeFields.indexOf('name');
  const selfSizeOffset = nodeFields.indexOf('self_size');
  const stringTypeIds = new Set([
    nodeTypes.indexOf('string'),
    nodeTypes.indexOf('concatenated string'),
    nodeTypes.indexOf('sliced string')
  ].filter(index => index >= 0));
  const rowsByText = new Map();
  const nodes = snapshot.nodes || [];
  const strings = snapshot.strings || [];
  let stringNodeCount = 0;
  let stringNodeBytes = 0;

  for (let index = 0; index < nodes.length; index += fieldCount) {
    if (!stringTypeIds.has(nodes[index + typeOffset])) {
      continue;
    }
    const text = strings[nodes[index + nameOffset]] || '';
    if (text.length < minLength) {
      continue;
    }
    const selfSize = nodes[index + selfSizeOffset] || 0;
    stringNodeCount += 1;
    stringNodeBytes += selfSize;
    const row = rowsByText.get(text) || {
      text,
      count: 0,
      selfSize: 0
    };
    row.count += 1;
    row.selfSize += selfSize;
    rowsByText.set(text, row);
  }

  const allDuplicateRows = Array.from(rowsByText.values())
    .filter(row => row.count > 1)
    .map(row => ({
      count: row.count,
      length: row.text.length,
      selfSize: row.selfSize,
      estimatedDuplicateBytes: (row.count - 1) * row.text.length * 2,
      preview: row.text.replace(/\s+/g, ' ').trim().slice(0, 160)
    }))
    .sort((a, b) => b.estimatedDuplicateBytes - a.estimatedDuplicateBytes);

  const duplicateStringCount = allDuplicateRows.reduce((total, row) => total + row.count, 0);
  const estimatedDuplicateBytes = allDuplicateRows.reduce((total, row) => total + row.estimatedDuplicateBytes, 0);
  const duplicateRows = allDuplicateRows.slice(0, limit);

  return {
    minLength,
    stringNodeCount,
    stringNodeBytes,
    uniqueStringCount: rowsByText.size,
    duplicateRowCount: allDuplicateRows.length,
    reportedDuplicateRowCount: duplicateRows.length,
    duplicateStringCount,
    estimatedDuplicateBytes,
    top: duplicateRows
  };
}

async function installProbe(page, options = {}) {
  await page.evaluate((probeOptions) => {
    if (window.memoryReproProbe) {
      window.memoryReproProbe.stop();
    }

    let baseline = new WeakSet();
    const added = new Map();
    const removed = new Map();
    const operations = new Map();
    const listenerRegistrations = [];
    let listenerStateByTarget = new WeakMap();
    let addedNodeCount = 0;
    let removedNodeCount = 0;
    let connectedAddedElementCount = 0;
    let connectedRemovedElementCount = 0;
    let createdElementCount = 0;
    let createdTextNodeCount = 0;
    let innerHTMLSetCount = 0;
    let replaceChildrenCount = 0;
    let cloneNodeCount = 0;
    let domQueryCount = 0;
    let textContentSetCount = 0;
    let nodeValueSetCount = 0;
    let setAttributeCount = 0;
    let classListWriteCount = 0;
    let styleWriteCount = 0;
    let listenerAddCount = 0;
    let listenerRemoveCount = 0;
    let connectedMoveCount = 0;
    const originals = {
      createElement: Document.prototype.createElement,
      createElementNS: Document.prototype.createElementNS,
      createTextNode: Document.prototype.createTextNode,
      cloneNode: Node.prototype.cloneNode,
      appendChild: Node.prototype.appendChild,
      insertBefore: Node.prototype.insertBefore,
      append: Element.prototype.append,
      prepend: Element.prototype.prepend,
      replaceChildren: Element.prototype.replaceChildren,
      innerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'),
      textContent: Object.getOwnPropertyDescriptor(Node.prototype, 'textContent'),
      nodeValue: Object.getOwnPropertyDescriptor(Node.prototype, 'nodeValue'),
      setAttribute: Element.prototype.setAttribute,
      classListAdd: DOMTokenList.prototype.add,
      classListRemove: DOMTokenList.prototype.remove,
      classListToggle: DOMTokenList.prototype.toggle,
      styleSetProperty: CSSStyleDeclaration.prototype.setProperty,
      addEventListener: EventTarget.prototype.addEventListener,
      removeEventListener: EventTarget.prototype.removeEventListener,
      documentGetElementById: Document.prototype.getElementById,
      documentQuerySelector: Document.prototype.querySelector,
      documentQuerySelectorAll: Document.prototype.querySelectorAll,
      documentGetElementsByClassName: Document.prototype.getElementsByClassName,
      documentGetElementsByTagName: Document.prototype.getElementsByTagName,
      elementQuerySelector: Element.prototype.querySelector,
      elementQuerySelectorAll: Element.prototype.querySelectorAll,
      elementGetElementsByClassName: Element.prototype.getElementsByClassName,
      elementGetElementsByTagName: Element.prototype.getElementsByTagName
    };

    function shortText(node) {
      const text = (node && node.textContent || '').replace(/\s+/g, ' ').trim();
      return text.length > 80 ? text.slice(0, 80) + '...' : text;
    }

    function cssPath(node) {
      if (!node || node.nodeType !== 1) return String(node);
      const parts = [];
      let cur = node;
      while (cur && cur.nodeType === 1 && parts.length < 8) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) {
          part += '#' + cur.id;
          parts.unshift(part);
          break;
        }
        if (cur.className && typeof cur.className === 'string') {
          const classes = cur.className.trim().split(/\s+/).filter(Boolean).slice(0, 3);
          if (classes.length) part += '.' + classes.join('.');
        }
        parts.unshift(part);
        cur = cur.parentElement;
      }
      return parts.join(' > ');
    }

    function signature(node, parent) {
      if (!node) return 'null';
      if (node.nodeType === 3) return `#text|${shortText(node)}|parent:${cssPath(parent)}`;
      if (node.nodeType !== 1) return `${node.nodeName}|${shortText(node)}|parent:${cssPath(parent)}`;
      const attrs = [];
      if (node.id) attrs.push(`id=${node.id}`);
      if (node.className && typeof node.className === 'string') {
        attrs.push(`class=${node.className.trim().replace(/\s+/g, '.')}`);
      }
      for (const name of ['data-i18n', 'data-tab', 'data-subtab', 'role', 'aria-label', 'type']) {
        if (node.hasAttribute(name)) attrs.push(`${name}=${node.getAttribute(name)}`);
      }
      return `${node.tagName.toLowerCase()}|${attrs.join(';')}|${shortText(node)}|parent:${cssPath(parent)}`;
    }

    function countInto(map, key) {
      map.set(key, (map.get(key) || 0) + 1);
    }

    function stackKey(label, extra) {
      if (!probeOptions.stackAttribution) {
        return `${label}${extra ? ` ${extra}` : ''}`;
      }
      const lines = new Error().stack
        .split('\n')
        .slice(2)
        .filter(line => !line.includes('memoryReproProbe'))
        .slice(0, 8)
        .join('\n');
      return `${label}${extra ? ` ${extra}` : ''}\n${lines}`;
    }

    function noteOperation(label, extra) {
      countInto(operations, stackKey(label, extra));
    }

    function listenerCapture(options) {
      return options === true || !!(options && typeof options === 'object' && options.capture);
    }

    function listenerTargetLabel(target) {
      if (target === window) return 'window';
      if (target === document) return 'document';
      if (target && target.nodeType === 1) return cssPath(target);
      return target && target.constructor ? target.constructor.name : String(target);
    }

    function trackListenerAdd(target, type, listener, options) {
      if (!probeOptions.stackAttribution) return;
      if (!listener || (typeof listener !== 'function' && typeof listener !== 'object')) return;
      let stateByKey = listenerStateByTarget.get(target);
      if (!stateByKey) {
        stateByKey = new Map();
        listenerStateByTarget.set(target, stateByKey);
      }
      const key = `${type}|${listenerCapture(options)}`;
      let stateByListener = stateByKey.get(key);
      if (!stateByListener) {
        stateByListener = new WeakMap();
        stateByKey.set(key, stateByListener);
      }
      if (stateByListener.has(listener)) return;
      const record = {
        target: new WeakRef(target),
        listener: new WeakRef(listener),
        type,
        stack: stackKey('active addEventListener', `${type} ${listenerTargetLabel(target)}`),
        persistentTarget: target === window || target === document || baseline.has(target),
        removed: false
      };
      stateByListener.set(listener, record);
      listenerRegistrations.push(record);
    }

    function trackListenerRemove(target, type, listener, options) {
      if (!probeOptions.stackAttribution) return;
      if (!listener || (typeof listener !== 'function' && typeof listener !== 'object')) return;
      const stateByKey = listenerStateByTarget.get(target);
      if (!stateByKey) return;
      const stateByListener = stateByKey.get(`${type}|${listenerCapture(options)}`);
      const record = stateByListener && stateByListener.get(listener);
      if (!record) return;
      record.removed = true;
      stateByListener.delete(listener);
    }

    function markBaseline() {
      originals.documentQuerySelectorAll.call(document, '*').forEach(node => baseline.add(node));
    }

    markBaseline();

    Document.prototype.createElement = function wrappedCreateElement(...args) {
      createdElementCount += 1;
      noteOperation('createElement', args[0]);
      return originals.createElement.apply(this, args);
    };

    Document.prototype.createElementNS = function wrappedCreateElementNS(...args) {
      createdElementCount += 1;
      noteOperation('createElementNS', args[1]);
      return originals.createElementNS.apply(this, args);
    };

    Document.prototype.createTextNode = function wrappedCreateTextNode(...args) {
      createdTextNodeCount += 1;
      noteOperation('createTextNode', String(args[0] || '').slice(0, 40));
      return originals.createTextNode.apply(this, args);
    };

    Node.prototype.cloneNode = function wrappedCloneNode(...args) {
      cloneNodeCount += 1;
      noteOperation('cloneNode', this.nodeName);
      return originals.cloneNode.apply(this, args);
    };

    function countConnectedMoves(label, args) {
      const count = args.filter(arg => arg && arg.nodeType && arg.isConnected).length;
      if (count > 0) {
        connectedMoveCount += count;
        noteOperation(label, count);
      }
    }

    Node.prototype.appendChild = function wrappedAppendChild(...args) {
      countConnectedMoves('appendChild.move', args);
      return originals.appendChild.apply(this, args);
    };

    Node.prototype.insertBefore = function wrappedInsertBefore(...args) {
      countConnectedMoves('insertBefore.move', args.slice(0, 1));
      return originals.insertBefore.apply(this, args);
    };

    Element.prototype.append = function wrappedAppend(...args) {
      countConnectedMoves('append.move', args);
      return originals.append.apply(this, args);
    };

    Element.prototype.prepend = function wrappedPrepend(...args) {
      countConnectedMoves('prepend.move', args);
      return originals.prepend.apply(this, args);
    };

    Element.prototype.replaceChildren = function wrappedReplaceChildren(...args) {
      replaceChildrenCount += 1;
      noteOperation('replaceChildren', cssPath(this));
      return originals.replaceChildren.apply(this, args);
    };

    if (originals.innerHTML && originals.innerHTML.set && originals.innerHTML.get) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        configurable: true,
        enumerable: originals.innerHTML.enumerable,
        get() {
          return originals.innerHTML.get.call(this);
        },
        set(value) {
          innerHTMLSetCount += 1;
          noteOperation('innerHTML', cssPath(this));
          originals.innerHTML.set.call(this, value);
        }
      });
    }

    if (originals.textContent && originals.textContent.set && originals.textContent.get) {
      Object.defineProperty(Node.prototype, 'textContent', {
        configurable: true,
        enumerable: originals.textContent.enumerable,
        get() {
          return originals.textContent.get.call(this);
        },
        set(value) {
          textContentSetCount += 1;
          noteOperation('textContent', cssPath(this));
          originals.textContent.set.call(this, value);
        }
      });
    }

    if (originals.nodeValue && originals.nodeValue.set && originals.nodeValue.get) {
      Object.defineProperty(Node.prototype, 'nodeValue', {
        configurable: true,
        enumerable: originals.nodeValue.enumerable,
        get() {
          return originals.nodeValue.get.call(this);
        },
        set(value) {
          nodeValueSetCount += 1;
          noteOperation('nodeValue', this.nodeName);
          originals.nodeValue.set.call(this, value);
        }
      });
    }

    Element.prototype.setAttribute = function wrappedSetAttribute(...args) {
      setAttributeCount += 1;
      noteOperation('setAttribute', `${args[0]} ${cssPath(this)}`);
      return originals.setAttribute.apply(this, args);
    };

    DOMTokenList.prototype.add = function wrappedClassListAdd(...args) {
      classListWriteCount += 1;
      noteOperation('classList.add', args.join('.'));
      return originals.classListAdd.apply(this, args);
    };

    DOMTokenList.prototype.remove = function wrappedClassListRemove(...args) {
      classListWriteCount += 1;
      noteOperation('classList.remove', args.join('.'));
      return originals.classListRemove.apply(this, args);
    };

    DOMTokenList.prototype.toggle = function wrappedClassListToggle(...args) {
      classListWriteCount += 1;
      noteOperation('classList.toggle', args[0]);
      return originals.classListToggle.apply(this, args);
    };

    CSSStyleDeclaration.prototype.setProperty = function wrappedStyleSetProperty(...args) {
      styleWriteCount += 1;
      noteOperation('style.setProperty', args[0]);
      return originals.styleSetProperty.apply(this, args);
    };

    EventTarget.prototype.addEventListener = function wrappedAddEventListener(...args) {
      listenerAddCount += 1;
      noteOperation('addEventListener', args[0]);
      const result = originals.addEventListener.apply(this, args);
      trackListenerAdd(this, args[0], args[1], args[2]);
      return result;
    };

    EventTarget.prototype.removeEventListener = function wrappedRemoveEventListener(...args) {
      listenerRemoveCount += 1;
      noteOperation('removeEventListener', args[0]);
      const result = originals.removeEventListener.apply(this, args);
      trackListenerRemove(this, args[0], args[1], args[2]);
      return result;
    };

    Document.prototype.getElementById = function wrappedDocumentGetElementById(...args) {
      domQueryCount += 1;
      noteOperation('document.getElementById', args[0]);
      return originals.documentGetElementById.apply(this, args);
    };

    Document.prototype.querySelector = function wrappedDocumentQuerySelector(...args) {
      domQueryCount += 1;
      noteOperation('document.querySelector', args[0]);
      return originals.documentQuerySelector.apply(this, args);
    };

    Document.prototype.querySelectorAll = function wrappedDocumentQuerySelectorAll(...args) {
      domQueryCount += 1;
      noteOperation('document.querySelectorAll', args[0]);
      return originals.documentQuerySelectorAll.apply(this, args);
    };

    Document.prototype.getElementsByClassName = function wrappedDocumentGetElementsByClassName(...args) {
      domQueryCount += 1;
      noteOperation('document.getElementsByClassName', args[0]);
      return originals.documentGetElementsByClassName.apply(this, args);
    };

    Document.prototype.getElementsByTagName = function wrappedDocumentGetElementsByTagName(...args) {
      domQueryCount += 1;
      noteOperation('document.getElementsByTagName', args[0]);
      return originals.documentGetElementsByTagName.apply(this, args);
    };

    Element.prototype.querySelector = function wrappedElementQuerySelector(...args) {
      domQueryCount += 1;
      noteOperation('element.querySelector', args[0]);
      return originals.elementQuerySelector.apply(this, args);
    };

    Element.prototype.querySelectorAll = function wrappedElementQuerySelectorAll(...args) {
      domQueryCount += 1;
      noteOperation('element.querySelectorAll', args[0]);
      return originals.elementQuerySelectorAll.apply(this, args);
    };

    Element.prototype.getElementsByClassName = function wrappedElementGetElementsByClassName(...args) {
      domQueryCount += 1;
      noteOperation('element.getElementsByClassName', args[0]);
      return originals.elementGetElementsByClassName.apply(this, args);
    };

    Element.prototype.getElementsByTagName = function wrappedElementGetElementsByTagName(...args) {
      domQueryCount += 1;
      noteOperation('element.getElementsByTagName', args[0]);
      return originals.elementGetElementsByTagName.apply(this, args);
    };

    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1) {
            addedNodeCount += 1;
            connectedAddedElementCount += 1;
            countInto(added, signature(node, record.target));
            originals.elementQuerySelectorAll.call(node, '*').forEach(child => {
              addedNodeCount += 1;
              connectedAddedElementCount += 1;
              countInto(added, signature(child, child.parentElement));
            });
          }
        }
        for (const node of record.removedNodes) {
          if (node.nodeType === 1) {
            removedNodeCount += 1;
            connectedRemovedElementCount += 1;
            countInto(removed, signature(node, record.target));
            originals.elementQuerySelectorAll.call(node, '*').forEach(child => {
              removedNodeCount += 1;
              connectedRemovedElementCount += 1;
              countInto(removed, signature(child, child.parentElement));
            });
          }
        }
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    function top(map, limit) {
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([signatureText, count]) => ({ signature: signatureText, count }));
    }

    function sample() {
      const elementCount = originals.documentGetElementsByTagName.call(document, '*').length;
      const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
      let connectedNodeCount = 1;
      let connectedTextNodeCount = 0;
      let connectedCommentNodeCount = 0;
      while (walker.nextNode()) {
        connectedNodeCount += 1;
        if (walker.currentNode.nodeType === Node.TEXT_NODE) connectedTextNodeCount += 1;
        if (walker.currentNode.nodeType === Node.COMMENT_NODE) connectedCommentNodeCount += 1;
      }
      const connectedExtraCount = connectedAddedElementCount - connectedRemovedElementCount;
      const activeListenerAdds = new Map();
      const persistentActiveListenerAdds = new Map();
      let activeListenerAddCount = 0;
      let detachedActiveListenerAddCount = 0;
      let persistentActiveListenerAddCount = 0;
      for (const record of listenerRegistrations) {
        if (record.removed) continue;
        const target = record.target.deref();
        const listener = record.listener.deref();
        if (!target || !listener) continue;
        let state = 'other';
        if (target === window || target === document) {
          state = 'global';
        } else if (target.nodeType) {
          state = target.isConnected ? 'connected' : 'detached';
        }
        activeListenerAddCount += 1;
        if (state === 'detached') detachedActiveListenerAddCount += 1;
        countInto(activeListenerAdds, `${state} ${record.stack}`);
        if (record.persistentTarget) {
          persistentActiveListenerAddCount += 1;
          countInto(persistentActiveListenerAdds, `${state} ${record.stack}`);
        }
      }
      return {
        elementCount,
        connectedNodeCount,
        connectedTextNodeCount,
        connectedCommentNodeCount,
        bodyTooltipCount: document.body
          ? originals.elementQuerySelectorAll.call(document.body, '.tooltip, .dynamic-tooltip, .info-tooltip').length
          : 0,
        connectedExtraCount,
        addedNodeCount,
        removedNodeCount,
        createdElementCount,
        createdTextNodeCount,
        innerHTMLSetCount,
        replaceChildrenCount,
        cloneNodeCount,
        domQueryCount,
        textContentSetCount,
        nodeValueSetCount,
        setAttributeCount,
        classListWriteCount,
        styleWriteCount,
        listenerAddCount,
        listenerRemoveCount,
        activeListenerAddCount,
        detachedActiveListenerAddCount,
        persistentActiveListenerAddCount,
        connectedMoveCount,
        topAdded: top(added, 25),
        topRemoved: top(removed, 25),
        topOperations: top(operations, 25),
        topActiveListenerAdds: top(activeListenerAdds, 100),
        topPersistentActiveListenerAdds: top(persistentActiveListenerAdds, 100)
      };
    }

    function reset() {
      observer.takeRecords();
      baseline = new WeakSet();
      added.clear();
      removed.clear();
      operations.clear();
      addedNodeCount = 0;
      removedNodeCount = 0;
      connectedAddedElementCount = 0;
      connectedRemovedElementCount = 0;
      createdElementCount = 0;
      createdTextNodeCount = 0;
      innerHTMLSetCount = 0;
      replaceChildrenCount = 0;
      cloneNodeCount = 0;
      domQueryCount = 0;
      textContentSetCount = 0;
      nodeValueSetCount = 0;
      setAttributeCount = 0;
      classListWriteCount = 0;
      styleWriteCount = 0;
      listenerAddCount = 0;
      listenerRemoveCount = 0;
      listenerRegistrations.length = 0;
      listenerStateByTarget = new WeakMap();
      connectedMoveCount = 0;
      markBaseline();
    }

    function stop() {
      observer.disconnect();
      Document.prototype.createElement = originals.createElement;
      Document.prototype.createElementNS = originals.createElementNS;
      Document.prototype.createTextNode = originals.createTextNode;
      Node.prototype.cloneNode = originals.cloneNode;
      Node.prototype.appendChild = originals.appendChild;
      Node.prototype.insertBefore = originals.insertBefore;
      Element.prototype.append = originals.append;
      Element.prototype.prepend = originals.prepend;
      Element.prototype.replaceChildren = originals.replaceChildren;
      Element.prototype.setAttribute = originals.setAttribute;
      DOMTokenList.prototype.add = originals.classListAdd;
      DOMTokenList.prototype.remove = originals.classListRemove;
      DOMTokenList.prototype.toggle = originals.classListToggle;
      CSSStyleDeclaration.prototype.setProperty = originals.styleSetProperty;
      EventTarget.prototype.addEventListener = originals.addEventListener;
      EventTarget.prototype.removeEventListener = originals.removeEventListener;
      Document.prototype.getElementById = originals.documentGetElementById;
      Document.prototype.querySelector = originals.documentQuerySelector;
      Document.prototype.querySelectorAll = originals.documentQuerySelectorAll;
      Document.prototype.getElementsByClassName = originals.documentGetElementsByClassName;
      Document.prototype.getElementsByTagName = originals.documentGetElementsByTagName;
      Element.prototype.querySelector = originals.elementQuerySelector;
      Element.prototype.querySelectorAll = originals.elementQuerySelectorAll;
      Element.prototype.getElementsByClassName = originals.elementGetElementsByClassName;
      Element.prototype.getElementsByTagName = originals.elementGetElementsByTagName;
      if (originals.innerHTML) {
        Object.defineProperty(Element.prototype, 'innerHTML', originals.innerHTML);
      }
      if (originals.textContent) {
        Object.defineProperty(Node.prototype, 'textContent', originals.textContent);
      }
      if (originals.nodeValue) {
        Object.defineProperty(Node.prototype, 'nodeValue', originals.nodeValue);
      }
      delete window.memoryReproProbe;
    }

    window.memoryReproProbe = { reset, sample, stop };
  }, { stackAttribution: options.stackAttribution !== false });
}

async function loadSave(page, saveText) {
  await page.evaluate(text => {
    loadGame(text, true, { skipRender: true });
    updateRender.lastDelta = 0;
    updateRender(true, { forceAllSubtabs: true });
  }, saveText);
}

async function cycleVisibleTabs(page) {
  await page.evaluate(async () => {
    function click(el) {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }

    function tick() {
      updateLogic(1000, 1000);
      updateRender.lastDelta = 1000;
      updateRender(false, { forceAllSubtabs: false });
    }

    const mainTabs = Array.from(document.querySelectorAll('.tab'))
      .filter(el => !el.classList.contains('hidden') && el.dataset && el.dataset.tab);

    for (const tab of mainTabs) {
      click(tab);
      tick();
      const activeContent = document.getElementById(tab.dataset.tab);
      const subtabSelector = activeContent ? [
        '.building-subtab:not(.hidden)',
        '.projects-subtab:not(.hidden)',
        '.colony-subtab:not(.hidden)',
        '.research-subtab:not(.hidden)',
        '.terraforming-subtab:not(.hidden)',
        '.space-subtab:not(.hidden)',
        '.hope-subtab:not(.hidden)',
        '.settings-subtab:not(.hidden)'
      ].join(',') : '';
      const subtabs = subtabSelector
        ? Array.from(activeContent.querySelectorAll(subtabSelector)).filter(el => el.dataset && el.dataset.subtab)
        : [];
      for (const subtab of subtabs) {
        click(subtab);
        tick();
      }
    }
  });
}

async function activateFinalPanel(page, finalTab, finalSubtab) {
  if (!finalTab && !finalSubtab) {
    return;
  }
  await page.evaluate(({ tabId, subtabId }) => {
    function click(el) {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }

    if (tabId) {
      const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
      if (!tab) {
        throw new Error(`Final tab not found: ${tabId}`);
      }
      if (tab.classList.contains('hidden')) {
        throw new Error(`Final tab is hidden: ${tabId}`);
      }
      click(tab);
    }

    if (subtabId) {
      const subtab = document.querySelector(`[data-subtab="${subtabId}"]`);
      if (!subtab) {
        throw new Error(`Final subtab not found: ${subtabId}`);
      }
      if (subtab.classList.contains('hidden')) {
        throw new Error(`Final subtab is hidden: ${subtabId}`);
      }
      click(subtab);
    }

    updateLogic(1000, 1000);
    updateRender.lastDelta = 1000;
    updateRender(false, { forceAllSubtabs: false });
  }, { tabId: finalTab, subtabId: finalSubtab });
}

async function freezeGameLoop(page) {
  await page.evaluate(() => {
    setGameSpeed(0);
  });
}

async function collectMetrics(page, cdpSession, startedAt, forceGc, nativeMemoryCollector = null) {
  if (forceGc) {
    await cdpSession.send('HeapProfiler.collectGarbage');
  }

  const performanceMetrics = await cdpSession.send('Performance.getMetrics');
  const metricMap = {};
  performanceMetrics.metrics.forEach(metric => {
    metricMap[metric.name] = metric.value;
  });
  const domCounters = await cdpSession.send('Memory.getDOMCounters');
  const probe = await page.evaluate(() => window.memoryReproProbe.sample());
  const processMemory = nativeMemoryCollector
    ? await nativeMemoryCollector.collectProcessMemory()
    : null;

  return {
    elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(3)),
    jsHeapUsedSize: metricMap.JSHeapUsedSize,
    jsHeapTotalSize: metricMap.JSHeapTotalSize,
    layoutCount: metricMap.LayoutCount,
    recalcStyleCount: metricMap.RecalcStyleCount,
    layoutDuration: metricMap.LayoutDuration,
    recalcStyleDuration: metricMap.RecalcStyleDuration,
    scriptDuration: metricMap.ScriptDuration,
    taskDuration: metricMap.TaskDuration,
    domNodes: domCounters.nodes,
    domDocuments: domCounters.documents,
    domListeners: domCounters.jsEventListeners,
    ...(processMemory ? flattenChromiumProcessMemory(processMemory) : {}),
    ...(processMemory ? { chromiumProcesses: processMemory.processes } : {}),
    ...probe
  };
}

async function waitForGameReady(page) {
  await page.waitForFunction(() => (
    window.game
    && game.scene
    && projectManager
    && spaceManager
    && window.planetVisualizer
    && window.planetVisualizer.renderer
  ));
}

async function dismissBlockingPopups(page) {
  return page.evaluate(() => {
    let dismissed = 0;
    const safetyButton = document.querySelector('.system-choice-popup-button-yes');
    if (safetyButton) {
      safetyButton.click();
      dismissed += 1;
    }
    for (let index = 0; index < 10; index += 1) {
      const closeButton = document.querySelector('.popup-close-button');
      if (!closeButton) break;
      skipActivePopupTyping();
      closeButton.click();
      dismissed += 1;
    }
    return dismissed;
  });
}

async function setManualPause(page, paused) {
  await page.evaluate((nextPaused) => {
    if (isGamePaused() !== nextPaused) {
      setGameSpeedChoice(nextPaused ? 0 : 1);
    }
  }, paused);
}

async function collectDetachedCacheReferences(page) {
  return page.evaluate(() => {
    const rootNames = [
      'structureUIElements',
      'projectElements',
      'achievementsElements',
      'dynamicTooltipAnchors',
      'buildingAlertElements',
      'constructionOfficeReserveSettingsElements',
      'constructionOfficeElements',
      'oneillStatsCache',
      'spaceSlidersUiCache',
      'colonySubtabCache',
      'followersUICache',
      'storySourceCache',
      'lifeUICache',
      'projectsUICache',
      'projectAlertElements',
      'cachedTabElements',
      'growthRateDisplayCache',
      'colonyAlertElements',
      'resourceUICache',
      'researchAlertElements',
      'researchElementCache',
      'automationElements',
      'sidebarAutomationElements',
      'shopElements',
      'solisUIElements',
      'artificialUICache',
      'atlasUICache',
      'planetUIElements',
      'atlasTabElements',
      'galaxyTabElements',
      'spaceTabAlertElements',
      'rdElements',
      'wgcTooltipCache',
      'facilityElements',
      'unhideButtonContainerCache',
      'combinedBuildingRowCache',
      'terraformingTabElements',
      'terraformingUICache',
      'debrisDiskHazardUICache',
      'hazardousMachineryUICache',
      'pulsarHazardUICache',
      'hazardUICache',
      'kesslerHazardUICache',
      'garbageHazardUICache',
      'galaxyUICache',
      'buildingSubtabManager',
      'projectsSubtabManager',
      'colonySubtabManager',
      'researchSubtabManager',
      'terraformingSubtabManager',
      'spaceSubtabManager',
      'hopeSubtabManager',
      'settingsSubtabManager',
      'tabManager',
      'resources',
      'buildings',
      'colonies',
      'projectManager',
      'researchManager',
      'spaceManager',
      'automationManager',
      'galaxyManager',
      'galaxyInvasionManager',
      'artificialManager',
      'atlasManager',
      'followersManager',
      'nanotechManager',
      'warpGateCommand',
      'lifeDesigner',
      'hazardManager'
    ];
    const queue = [];
    const seenObjects = new WeakSet();
    const seenNodes = new WeakSet();
    const detached = [];
    const maxDepth = 5;
    const maxEntries = 250;
    const maxObjects = 50000;
    let visitedObjects = 0;

    rootNames.forEach((name) => {
      try {
        const value = eval(name);
        if (value) queue.push({ value, path: name, depth: 0 });
      } catch (_) {}
    });
    if (updateRender.tabContentCache) {
      queue.push({ value: updateRender.tabContentCache, path: 'updateRender.tabContentCache', depth: 0 });
    }

    function describeNode(node) {
      const name = String(node.nodeName || 'node').toLowerCase();
      const id = node.id ? '#' + node.id : '';
      const classes = typeof node.className === 'string'
        ? node.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).map(value => '.' + value).join('')
        : '';
      return name + id + classes;
    }

    while (queue.length && detached.length < 100 && visitedObjects < maxObjects) {
      const current = queue.shift();
      const value = current.value;
      if (!value || (typeof value !== 'object' && typeof value !== 'function')) continue;
      if (value === window || value === document) continue;
      if (typeof value.nodeType === 'number') {
        if (!value.isConnected && !seenNodes.has(value)) {
          seenNodes.add(value);
          detached.push({ path: current.path, node: describeNode(value) });
        }
        continue;
      }
      if (seenObjects.has(value)) continue;
      seenObjects.add(value);
      visitedObjects += 1;
      if (current.depth >= maxDepth) continue;

      if (Array.isArray(value)) {
        value.slice(0, maxEntries).forEach((entry, index) => {
          queue.push({ value: entry, path: current.path + '[' + index + ']', depth: current.depth + 1 });
        });
        continue;
      }
      if (value instanceof Map) {
        Array.from(value.entries()).slice(0, maxEntries).forEach(([key, entry]) => {
          queue.push({ value: entry, path: current.path + '<' + String(key) + '>', depth: current.depth + 1 });
        });
        continue;
      }
      if (value instanceof Set) {
        Array.from(value.values()).slice(0, maxEntries).forEach((entry, index) => {
          queue.push({ value: entry, path: current.path + '<set:' + index + '>', depth: current.depth + 1 });
        });
        continue;
      }

      Object.keys(value).slice(0, maxEntries).forEach((key) => {
        if ([
          'ownerDocument', 'parentNode', 'parentElement', 'children', 'childNodes',
          'documentElement', 'defaultView', 'nextSibling', 'previousSibling',
          'firstChild', 'lastChild'
        ].includes(key)) return;
        queue.push({ value: value[key], path: current.path + '.' + key, depth: current.depth + 1 });
      });
    }

    let tooltipAnchors = [];
    try {
      tooltipAnchors = Array.from(dynamicTooltipAnchors);
    } catch (_) {}

    return {
      detached,
      visitedObjects,
      dynamicTooltipAnchorCount: tooltipAnchors.length,
      disconnectedTooltipAnchorCount: tooltipAnchors.filter(anchor => !anchor.isConnected).length,
      disconnectedTooltipAnchors: tooltipAnchors.filter(anchor => !anchor.isConnected).slice(0, 100).map(anchor => ({
        node: describeNode(anchor),
        id: anchor.id || '',
        text: (anchor.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)
      }))
    };
  });
}

async function collectAuditSnapshot(page, cdpSession, nativeMemoryCollector = null) {
  await cdpSession.send('Runtime.discardConsoleEntries');
  await cdpSession.send('HeapProfiler.collectGarbage');
  await wait(100);
  const metrics = await collectMetrics(page, cdpSession, Date.now(), false, nativeMemoryCollector);
  const cacheReferences = await collectDetachedCacheReferences(page);
  return { ...metrics, cacheReferences };
}

function diffAuditSnapshots(before, after) {
  const browserFields = [
    'jsHeapUsedSize', 'jsHeapTotalSize', 'layoutCount', 'recalcStyleCount',
    'layoutDuration', 'recalcStyleDuration', 'scriptDuration', 'taskDuration',
    'domNodes', 'domDocuments', 'domListeners', 'elementCount',
    'connectedNodeCount', 'connectedTextNodeCount', 'connectedCommentNodeCount',
    'bodyTooltipCount', 'chromiumWorkingSetBytes', 'chromiumPrivateBytes',
    'chromiumVirtualBytes', 'chromiumHandleCount', 'browserWorkingSetBytes',
    'browserPrivateBytes', 'rendererWorkingSetBytes', 'rendererPrivateBytes',
    'gpuWorkingSetBytes', 'gpuPrivateBytes'
  ];
  const delta = {};
  browserFields.forEach((field) => {
    delta[field] = Number.isFinite(before[field]) && Number.isFinite(after[field])
      ? after[field] - before[field]
      : null;
  });
  const beforeDetached = new Set(before.cacheReferences.detached.map(ref => ref.path + ' -> ' + ref.node));
  delta.newDetachedCacheReferences = after.cacheReferences.detached.filter(
    ref => !beforeDetached.has(ref.path + ' -> ' + ref.node)
  );
  delta.dynamicTooltipAnchorCount = after.cacheReferences.dynamicTooltipAnchorCount - before.cacheReferences.dynamicTooltipAnchorCount;
  delta.disconnectedTooltipAnchorCount = after.cacheReferences.disconnectedTooltipAnchorCount - before.cacheReferences.disconnectedTooltipAnchorCount;
  return delta;
}

async function collectRuntimeCoverage(page) {
  return page.evaluate(() => {
    const visible = element => !element.classList.contains('hidden') && !element.hidden;
    const values = selector => Array.from(document.querySelectorAll(selector));
    const ids = (selector, key) => values(selector).map(element => element.dataset[key]).filter(Boolean);
    const unique = list => Array.from(new Set(list));
    const duplicates = list => {
      const counts = new Map();
      list.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
      return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
    };
    const independentKeyDuplicates = (elements, key) => {
      const groups = new Map();
      elements.forEach(element => {
        const value = element.dataset[key];
        if (!value) return;
        if (!groups.has(value)) groups.set(value, []);
        groups.get(value).push(element);
      });
      return Array.from(groups.entries()).filter(([, nodes]) => (
        nodes.some((node, index) => nodes.some((other, otherIndex) => (
          index !== otherIndex && !node.contains(other) && !other.contains(node)
        )))
      )).map(([value, nodes]) => ({ value, count: nodes.length }));
    };

    const registeredBuildings = Object.keys(buildings);
    const registeredColonies = Object.keys(colonies);
    const registeredProjects = Object.keys(projectManager.projects);
    const relevantProjects = projectManager.getProjectStatuses().map(project => project.name);
    const renderedBuildings = ids('#buildings [data-structure-name]', 'structureName');
    const renderedColonies = ids('#colonies [data-structure-name]', 'structureName');
    const renderedProjects = ids('#special-projects [data-project-name]', 'projectName');
    const allDomIds = values('[id]').map(element => element.id);
    const activeMainTab = document.querySelector('.tab.active[data-tab]');
    const duplicatePlaceholderSelects = values('select').map((select) => ({
      id: select.id || select.className || '(unnamed select)',
      count: Array.from(select.options).filter(option => option.value === '').length
    })).filter(entry => entry.count > 1);

    return {
      currentWorld: spaceManager.getCurrentPlanetKey(),
      activeMainTab: activeMainTab ? activeMainTab.dataset.tab : null,
      managerActiveMainTab: tabManager.getActiveTabId(),
      mainTabs: ids('.tab[data-tab]', 'tab'),
      visibleMainTabs: ids('.tab[data-tab]', 'tab').filter(id => visible(document.querySelector('.tab[data-tab="' + id + '"]'))),
      subtabs: ids('[data-subtab]', 'subtab'),
      visibleSubtabs: unique(values('[data-subtab]').filter(visible).map(element => element.dataset.subtab)),
      registeredBuildings,
      unlockedBuildings: registeredBuildings.filter(id => buildings[id].unlocked),
      renderedBuildings: unique(renderedBuildings),
      missingBuildings: registeredBuildings.filter(id => !renderedBuildings.includes(id)),
      registeredColonies,
      renderedColonies: unique(renderedColonies),
      missingColonies: registeredColonies.filter(id => !renderedColonies.includes(id)),
      registeredProjects,
      relevantProjects,
      renderedProjects: unique(renderedProjects),
      missingRelevantProjects: relevantProjects.filter(id => !renderedProjects.includes(id)),
      duplicateDomIds: duplicates(allDomIds),
      duplicateBuildingKeys: independentKeyDuplicates(values('#buildings [data-structure-name]'), 'structureName'),
      duplicateColonyKeys: independentKeyDuplicates(values('#colonies [data-structure-name]'), 'structureName'),
      duplicateProjectKeys: independentKeyDuplicates(values('#special-projects [data-project-name]'), 'projectName'),
      duplicatePlaceholderSelects
    };
  });
}

async function exerciseVisibleTabs(page, rounds, runLogic) {
  return page.evaluate(async ({ repeatCount, advanceLogic }) => {
    const seenTabs = new Set();
    const seenSubtabs = new Set();
    const availableTabs = new Set();
    const availableSubtabs = new Set();
    let steps = 0;

    function click(element) {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }

    function renderStep() {
      if (advanceLogic) {
        updateLogic(100, 100);
        updateRender.lastDelta = 100;
      } else {
        updateRender.lastDelta = 0;
      }
      updateRender(false, { forceAllSubtabs: false });
      steps += 1;
    }

    for (let round = 0; round < repeatCount; round += 1) {
      const processedTabs = new Set();
      let foundNewSurface = true;
      while (foundNewSurface) {
        foundNewSurface = false;
        const mainTabs = Array.from(document.querySelectorAll('.tab[data-tab]'))
          .filter(element => !element.classList.contains('hidden') && !element.hidden);
        for (const tab of mainTabs) {
          const tabId = tab.dataset.tab;
          availableTabs.add(tabId);
          if (processedTabs.has(tabId)) continue;
          processedTabs.add(tabId);
          seenTabs.add(tabId);
          click(tab);
          renderStep();
          await new Promise(resolve => setTimeout(resolve, 20));
          const activeContent = document.getElementById(tabId);
          if (!activeContent) continue;
          const subtabs = Array.from(activeContent.querySelectorAll('[data-subtab]'))
            .filter(element => !element.classList.contains('hidden') && !element.hidden);
          for (const subtab of subtabs) {
            const subtabId = subtab.dataset.subtab;
            availableSubtabs.add(subtabId);
            seenSubtabs.add(subtabId);
            click(subtab);
            renderStep();
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
        const currentVisibleIds = Array.from(document.querySelectorAll('.tab[data-tab]'))
          .filter(element => !element.classList.contains('hidden') && !element.hidden)
          .map(element => element.dataset.tab);
        foundNewSurface = currentVisibleIds.some(id => !processedTabs.has(id));
      }
    }

    return {
      availableTabs: Array.from(availableTabs),
      availableSubtabs: Array.from(availableSubtabs),
      tabs: Array.from(seenTabs),
      subtabs: Array.from(seenSubtabs),
      steps,
      paused: isGamePaused()
    };
  }, { repeatCount: rounds, advanceLogic: runLogic });
}

async function exerciseBuildingCards(page, rounds, runLogic) {
  return page.evaluate(({ repeatCount, advanceLogic }) => {
    const mainTab = document.querySelector('.tab[data-tab="buildings"]');
    mainTab.click();
    const interacted = new Set();
    const available = new Set();
    for (let round = 0; round < repeatCount; round += 1) {
      const subtabs = Array.from(document.querySelectorAll('#buildings .building-subtab'))
        .filter(element => !element.classList.contains('hidden') && !element.hidden);
      subtabs.forEach((subtab) => {
        subtab.click();
        const content = document.getElementById(subtab.dataset.subtab);
        const rows = content ? Array.from(content.querySelectorAll('[data-structure-name]')) : [];
        rows.forEach((row) => {
          available.add(row.dataset.structureName);
          interacted.add(row.dataset.structureName);
          const arrow = row.querySelector('.collapse-arrow');
          if (arrow) {
            arrow.click();
            arrow.click();
          }
          const buttons = Array.from(row.querySelectorAll('button:not(:disabled)'));
          const multiply = buttons.find(button => button.textContent.trim() === 'x10');
          const divide = buttons.find(button => button.textContent.trim() === '/10');
          if (multiply && divide) {
            multiply.click();
            divide.click();
          }
          row.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach((input) => {
            input.click();
            input.click();
          });
          row.querySelectorAll('input:not(:disabled), select:not(:disabled)').forEach((input) => {
            input.focus();
            input.blur();
          });
          row.querySelectorAll('.info-tooltip-icon').forEach((icon) => {
            icon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, view: window }));
            icon.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, view: window }));
          });
        });
        if (advanceLogic) updateLogic(100, 100);
        updateRender.lastDelta = advanceLogic ? 100 : 0;
        updateRender(false, { forceAllSubtabs: false });
      });
    }
    return {
      registered: Object.keys(buildings),
      available: Array.from(available),
      interacted: Array.from(interacted),
      rendered: Array.from(document.querySelectorAll('#buildings [data-structure-name]')).map(row => row.dataset.structureName),
      paused: isGamePaused()
    };
  }, { repeatCount: rounds, advanceLogic: runLogic });
}

async function exerciseProjectCards(page, rounds, runLogic) {
  return page.evaluate(({ repeatCount, advanceLogic }) => {
    const mainTab = document.querySelector('.tab[data-tab="special-projects"]');
    mainTab.click();
    const available = new Set();
    const interacted = new Set();
    const groupedSelections = new Set();
    for (let round = 0; round < repeatCount; round += 1) {
      const subtabs = Array.from(document.querySelectorAll('#special-projects .projects-subtab'))
        .filter(element => !element.classList.contains('hidden') && !element.hidden);
      subtabs.forEach((subtab) => {
        subtab.click();
        renderProjects(subtab.dataset.subtab);
        const content = document.getElementById(subtab.dataset.subtab.replace('-projects', '-projects'));
        const scope = content || document.getElementById('special-projects');
        const cards = Array.from(scope.querySelectorAll('.project-card[data-project-name]'));
        cards.forEach((card) => {
          available.add(card.dataset.projectName);
          interacted.add(card.dataset.projectName);
          const arrow = card.querySelector('.collapse-arrow');
          if (arrow) {
            arrow.click();
            arrow.click();
          }
          const buttons = Array.from(card.querySelectorAll('button:not(:disabled)'));
          const multiply = buttons.find(button => button.textContent.trim() === 'x10');
          const divide = buttons.find(button => button.textContent.trim() === '/10');
          if (multiply && divide) {
            multiply.click();
            divide.click();
          }
          card.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach((input) => {
            input.click();
            input.click();
          });
          card.querySelectorAll('input:not(:disabled), select:not(:disabled)').forEach((input) => {
            input.focus();
            input.blur();
          });
          card.querySelectorAll('.info-tooltip-icon').forEach((icon) => {
            icon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, view: window }));
            icon.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, view: window }));
          });
          const groupSelect = card.querySelector('.project-title-select');
          if (groupSelect && groupSelect.options.length > 1) {
            const original = groupSelect.value;
            Array.from(groupSelect.options).forEach((option) => {
              available.add(option.value);
              groupSelect.value = option.value;
              groupSelect.dispatchEvent(new Event('change', { bubbles: true }));
              groupedSelections.add(option.value);
              interacted.add(option.value);
            });
            groupSelect.value = original;
            groupSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        scope.querySelectorAll('.import-resources-row[data-project-name]').forEach((row) => {
          available.add(row.dataset.projectName);
          interacted.add(row.dataset.projectName);
          row.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach((input) => {
            input.click();
            input.click();
          });
          row.querySelectorAll('input:not(:disabled), select:not(:disabled)').forEach((input) => {
            input.focus();
            input.blur();
          });
          row.querySelectorAll('.info-tooltip-icon').forEach((icon) => {
            icon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, view: window }));
            icon.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, view: window }));
          });
        });
        Object.keys(projectManager.projects).forEach(name => updateProjectUI(name));
        if (advanceLogic) updateLogic(100, 100);
        updateRender.lastDelta = advanceLogic ? 100 : 0;
        updateRender(false, { forceAllSubtabs: false });
      });
    }
    return {
      registered: Object.keys(projectManager.projects),
      relevant: projectManager.getProjectStatuses().map(project => project.name),
      available: Array.from(available),
      interacted: Array.from(interacted),
      groupedSelections: Array.from(groupedSelections),
      rendered: Array.from(document.querySelectorAll('#special-projects [data-project-name]')).map(row => row.dataset.projectName),
      paused: isGamePaused()
    };
  }, { repeatCount: rounds, advanceLogic: runLogic });
}

async function collectProjectWorldManifest(page) {
  return page.evaluate(() => {
    const registered = Object.values(projectManager.projects);
    const storyProjects = registered.filter(project => project.category === 'story');
    return {
      registered: registered.map(project => project.name),
      storyProjects: storyProjects.map(project => project.name),
      storyProjectTargets: storyProjects.map(project => ({
        name: project.name,
        planet: project.attributes.planet || null,
        specialSeedKey: project.attributes.specialSeedKey || null
      })),
      storyWorlds: Array.from(new Set(
        storyProjects.map(project => project.attributes.planet).filter(Boolean)
      )),
      specialSeeds: Array.from(new Set(
        storyProjects.map(project => project.attributes.specialSeedKey).filter(Boolean)
      ))
    };
  });
}

async function exerciseCurrentWorldProjects(page) {
  const result = await exerciseProjectCards(page, 1, false);
  const world = await page.evaluate(() => spaceManager.getCurrentPlanetKey());
  return {
    world,
    relevant: result.relevant,
    available: result.available,
    rendered: result.available,
    interacted: result.interacted
  };
}

async function runStoryProjectWorldSweep(page, saveText, initialProjectResult) {
  await loadSave(page, saveText);
  await dismissBlockingPopups(page);
  const manifest = await collectProjectWorldManifest(page);
  const worlds = [];

  for (const worldKey of manifest.storyWorlds) {
    await loadSave(page, saveText);
    await dismissBlockingPopups(page);
    const travel = await page.evaluate((targetKey) => {
      const status = spaceManager.planetStatuses[targetKey];
      status.enabled = true;
      status.terraformed = false;
      const beforeWorld = spaceManager.getCurrentPlanetKey();
      const travelled = spaceManager.travelToStoryPlanet(targetKey);
      Object.values(projectManager.projects).forEach(project => {
        if (project.category === 'story' && project.attributes.planet === targetKey) {
          project.unlocked = true;
          project.alertedWhenUnlocked = true;
        }
      });
      updateRender.lastDelta = 0;
      updateRender(true, { forceAllSubtabs: true });
      return {
        targetKey,
        beforeWorld,
        afterWorld: spaceManager.getCurrentPlanetKey(),
        travelled
      };
    }, worldKey);
    await dismissBlockingPopups(page);
    const coverage = await exerciseCurrentWorldProjects(page);
    const runtimeCoverage = await collectRuntimeCoverage(page);
    worlds.push({ travel, coverage, runtimeCoverage });
  }

  for (const specialSeedKey of manifest.specialSeeds) {
    await loadSave(page, saveText);
    await dismissBlockingPopups(page);
    const travel = await page.evaluate((seedKey) => {
      const result = buildSpecialSeedWorldResult(seedKey, 0);
      result.allowReplay = true;
      const beforeWorld = spaceManager.getCurrentPlanetKey();
      const travelled = spaceManager.travelToRandomWorld(result, result.seedString);
      Object.values(projectManager.projects).forEach(project => {
        if (project.category === 'story' && project.attributes.specialSeedKey === seedKey) {
          project.unlocked = true;
          project.alertedWhenUnlocked = true;
        }
      });
      updateRender.lastDelta = 0;
      updateRender(true, { forceAllSubtabs: true });
      return {
        targetKey: seedKey,
        beforeWorld,
        afterWorld: spaceManager.getCurrentPlanetKey(),
        specialSeedKey: currentPlanetParameters.rwgMeta?.specialSeedKey || null,
        travelled
      };
    }, specialSeedKey);
    await dismissBlockingPopups(page);
    const coverage = await exerciseCurrentWorldProjects(page);
    const runtimeCoverage = await collectRuntimeCoverage(page);
    worlds.push({ travel, coverage, runtimeCoverage });
  }

  const relevant = new Set(initialProjectResult?.relevant || []);
  const rendered = new Set(initialProjectResult?.available || []);
  const interacted = new Set(initialProjectResult?.interacted || []);
  worlds.forEach(({ coverage }) => {
    coverage.relevant.forEach(name => relevant.add(name));
    coverage.rendered.forEach(name => rendered.add(name));
    coverage.interacted.forEach(name => interacted.add(name));
  });

  await loadSave(page, saveText);
  await dismissBlockingPopups(page);

  return {
    manifest,
    worlds,
    aggregate: {
      registered: manifest.registered,
      relevant: Array.from(relevant),
      rendered: Array.from(rendered),
      interacted: Array.from(interacted),
      neverRelevant: manifest.registered.filter(name => !relevant.has(name)),
      missingRendered: manifest.registered.filter(name => !rendered.has(name)),
      missingInteracted: manifest.registered.filter(name => !interacted.has(name))
    }
  };
}

async function runMeasuredAuditPhase(page, cdpSession, options, phase, nativeMemoryCollector) {
  if (phase.prepare) await phase.prepare();
  const before = await collectAuditSnapshot(page, cdpSession, nativeMemoryCollector);
  await page.evaluate(() => memoryReproProbe.reset());
  const actionResult = phase.action ? await phase.action() : null;
  if (options.phaseSeconds > 0) await wait(options.phaseSeconds * 1000);
  const after = await collectAuditSnapshot(page, cdpSession, nativeMemoryCollector);
  const delta = diffAuditSnapshots(before, after);
  const probe = await page.evaluate(() => memoryReproProbe.sample());
  if (phase.cleanup) await phase.cleanup();
  console.log([
    '[memory-audit] ' + phase.name,
    'heap=' + Math.round((delta.jsHeapUsedSize || 0) / 1024) + 'KB',
    'dom=' + delta.domNodes,
    'listeners=' + delta.domListeners,
    'created=' + probe.createdElementCount,
    'moves=' + probe.connectedMoveCount,
    'added=' + probe.addedNodeCount,
    'removed=' + probe.removedNodeCount,
    'text=' + probe.textContentSetCount,
    'classes=' + probe.classListWriteCount,
    'detached=' + delta.newDetachedCacheReferences.length
  ].join(' '));
  return { name: phase.name, before, after, delta, probe, actionResult };
}

async function runSaveLoadCycles(page, saveText, rounds, paused, onCycle) {
  const results = [];
  for (let round = 0; round < rounds; round += 1) {
    await loadSave(page, saveText);
    await dismissBlockingPopups(page);
    const result = await page.evaluate(({ fallbackText, pauseAfterLoad }) => {
      saveGameToSlot('slot5');
      const loaded = loadGame('gameState_slot5', true, { skipRender: true });
      if (!loaded) loadGame(fallbackText, true, { skipRender: true });
      updateRender.lastDelta = 0;
      updateRender(true, { forceAllSubtabs: true });
      if (isGamePaused() !== pauseAfterLoad) setGameSpeedChoice(pauseAfterLoad ? 0 : 1);
      return loaded;
    }, { fallbackText: saveText, pauseAfterLoad: paused });
    await dismissBlockingPopups(page);
    const navigation = await exerciseVisibleTabs(page, 1, !paused);
    const buildings = await exerciseBuildingCards(page, 1, !paused);
    const projects = await exerciseProjectCards(page, 1, !paused);
    const pauseState = await page.evaluate(() => isGamePaused());
    const coverage = await collectRuntimeCoverage(page);
    const cycle = { loaded: result, paused: pauseState, navigation, buildings, projects, coverage };
    results.push(cycle);
    if (onCycle) await onCycle(round, cycle);
  }
  return results;
}

async function runTravelCycles(page, saveText, rounds, paused, onCycle) {
  const results = [];
  for (let round = 0; round < rounds; round += 1) {
    await loadSave(page, saveText);
    await dismissBlockingPopups(page);
    const result = await page.evaluate((pauseAfterTravel) => {
      const beforeWorld = spaceManager.getCurrentPlanetKey();
      selectPlanet('olympus', true, true);
      const afterWorld = spaceManager.getCurrentPlanetKey();
      updateRender.lastDelta = 0;
      updateRender(true, { forceAllSubtabs: true });
      if (isGamePaused() !== pauseAfterTravel) setGameSpeedChoice(pauseAfterTravel ? 0 : 1);
      return { beforeWorld, afterWorld, travelled: afterWorld === 'olympus' };
    }, paused);
    await dismissBlockingPopups(page);
    const navigation = await exerciseVisibleTabs(page, 1, !paused);
    const buildings = await exerciseBuildingCards(page, 1, !paused);
    const projects = await exerciseProjectCards(page, 1, !paused);
    const pauseState = await page.evaluate(() => isGamePaused());
    const coverage = await collectRuntimeCoverage(page);
    const cycle = { ...result, paused: pauseState, navigation, buildings, projects, coverage };
    results.push(cycle);
    if (onCycle) await onCycle(round, cycle);
  }
  return results;
}

async function runAuditMatrix(page, cdpSession, saveText, options, nativeMemoryCollector) {
  const phases = [];
  const running = () => setManualPause(page, false);
  const paused = () => setManualPause(page, true);
  const resume = () => setManualPause(page, false);
  const measured = phase => runMeasuredAuditPhase(
    page,
    cdpSession,
    options,
    phase,
    nativeMemoryCollector
  );

  await page.evaluate(() => setAutosaveIntervalSeconds(0));
  const initialCoverage = await collectRuntimeCoverage(page);

  phases.push(await measured({
    name: 'first-navigation-running', prepare: running,
    action: () => exerciseVisibleTabs(page, 1, true)
  }));
  phases.push(await measured({
    name: 'repeat-navigation-running', prepare: running,
    action: () => exerciseVisibleTabs(page, options.rounds, true)
  }));
  phases.push(await measured({
    name: 'buildings-running', prepare: running,
    action: () => exerciseBuildingCards(page, options.rounds, true)
  }));
  const projectsRunningPhase = await measured({
    name: 'projects-running', prepare: running,
    action: () => exerciseProjectCards(page, options.rounds, true)
  });
  phases.push(projectsRunningPhase);
  phases.push(await measured({
    name: 'settings-idle-running',
    prepare: async () => {
      await running();
      await page.evaluate(() => document.querySelector('.tab[data-tab="settings"]').click());
    },
    action: () => page.evaluate(() => ({ paused: isGamePaused() }))
  }));
  phases.push(await measured({
    name: 'settings-idle-manual-pause',
    prepare: async () => {
      await paused();
      await page.evaluate(() => document.querySelector('.tab[data-tab="settings"]').click());
    },
    action: () => page.evaluate(() => ({ paused: isGamePaused() })),
    cleanup: resume
  }));
  phases.push(await measured({
    name: 'repeat-navigation-manual-pause', prepare: paused,
    action: () => exerciseVisibleTabs(page, options.rounds, false), cleanup: resume
  }));
  phases.push(await measured({
    name: 'buildings-manual-pause', prepare: paused,
    action: () => exerciseBuildingCards(page, options.rounds, false), cleanup: resume
  }));
  phases.push(await measured({
    name: 'projects-manual-pause', prepare: paused,
    action: () => exerciseProjectCards(page, options.rounds, false), cleanup: resume
  }));
  phases.push(await measured({
    name: 'save-load-running',
    prepare: async () => {
      await running();
      await runSaveLoadCycles(page, saveText, 1, false);
    },
    action: async () => {
      const snapshots = [];
      const cycles = await runSaveLoadCycles(page, saveText, options.rounds, false, async () => {
        snapshots.push(await collectAuditSnapshot(page, cdpSession, nativeMemoryCollector));
      });
      return { cycles, snapshots };
    }
  }));
  phases.push(await measured({
    name: 'save-load-manual-pause',
    prepare: async () => {
      await paused();
      await runSaveLoadCycles(page, saveText, 1, true);
    },
    action: async () => {
      const snapshots = [];
      const cycles = await runSaveLoadCycles(page, saveText, options.rounds, true, async () => {
        snapshots.push(await collectAuditSnapshot(page, cdpSession, nativeMemoryCollector));
      });
      return { cycles, snapshots };
    }, cleanup: resume
  }));
  phases.push(await measured({
    name: 'travel-running',
    prepare: async () => {
      await running();
      await runTravelCycles(page, saveText, 1, false);
    },
    action: async () => {
      const snapshots = [];
      const cycles = await runTravelCycles(page, saveText, options.rounds, false, async () => {
        snapshots.push(await collectAuditSnapshot(page, cdpSession, nativeMemoryCollector));
      });
      return { cycles, snapshots };
    }
  }));
  phases.push(await measured({
    name: 'travel-manual-pause',
    prepare: async () => {
      await paused();
      await runTravelCycles(page, saveText, 1, true);
    },
    action: async () => {
      const snapshots = [];
      const cycles = await runTravelCycles(page, saveText, options.rounds, true, async () => {
        snapshots.push(await collectAuditSnapshot(page, cdpSession, nativeMemoryCollector));
      });
      return { cycles, snapshots };
    }, cleanup: resume
  }));

  let storyProjectSweep = null;
  if (options.storyProjects) {
    const storyProjectPhase = await measured({
      name: 'story-project-world-sweep',
      prepare: running,
      action: () => runStoryProjectWorldSweep(page, saveText, projectsRunningPhase.actionResult)
    });
    phases.push(storyProjectPhase);
    storyProjectSweep = storyProjectPhase.actionResult;
  }

  return {
    initialCoverage,
    coverage: await collectRuntimeCoverage(page),
    projectCoverage: storyProjectSweep
      ? storyProjectSweep.aggregate
      : {
        registered: projectsRunningPhase.actionResult.registered,
        relevant: projectsRunningPhase.actionResult.relevant,
        rendered: projectsRunningPhase.actionResult.rendered,
        interacted: projectsRunningPhase.actionResult.interacted
      },
    phases
  };
}

function validateAuditCoverage(audit, options, consoleMessages, pageErrors) {
  const issues = [];
  const phaseByName = new Map(audit.phases.map(phase => [phase.name, phase]));
  const missing = (expected, actual) => {
    const actualSet = new Set(actual || []);
    return (expected || []).filter(value => !actualSet.has(value));
  };
  const addMissing = (label, expected, actual) => {
    const values = missing(expected, actual);
    if (values.length) issues.push(`${label}: ${values.join(', ')}`);
  };
  const addDuplicateIssues = (label, coverage) => {
    if (!coverage) {
      issues.push(`${label} coverage is missing`);
      return;
    }
    if (coverage.activeMainTab !== coverage.managerActiveMainTab) {
      issues.push(`${label} active main tab is ${coverage.activeMainTab}; manager reports ${coverage.managerActiveMainTab}`);
    }
    coverage.duplicateDomIds.forEach(({ value, count }) => {
      issues.push(`${label} duplicate DOM id ${value} appears ${count} times`);
    });
    coverage.duplicateBuildingKeys.forEach(({ value, count }) => {
      issues.push(`${label} duplicate building key ${value} appears ${count} times`);
    });
    coverage.duplicateColonyKeys.forEach(({ value, count }) => {
      issues.push(`${label} duplicate colony key ${value} appears ${count} times`);
    });
    coverage.duplicateProjectKeys.forEach(({ value, count }) => {
      issues.push(`${label} duplicate project key ${value} appears ${count} times`);
    });
    coverage.duplicatePlaceholderSelects.forEach(({ id, count }) => {
      issues.push(`${label} select ${id} has ${count} empty placeholder options`);
    });
  };
  const getLifecycleCycles = (phaseName) => {
    const actionResult = phaseByName.get(phaseName)?.actionResult;
    const cycles = actionResult?.cycles || [];
    const snapshots = actionResult?.snapshots || [];
    if (cycles.length !== options.rounds) {
      issues.push(`${phaseName} recorded ${cycles.length} cycles; expected ${options.rounds}`);
    }
    if (snapshots.length !== cycles.length) {
      issues.push(`${phaseName} recorded ${snapshots.length} snapshots for ${cycles.length} cycles`);
    }
    return cycles;
  };

  const firstNavigation = phaseByName.get('first-navigation-running')?.actionResult;
  addMissing('Main tabs not visited', audit.initialCoverage.visibleMainTabs, firstNavigation?.tabs);
  addMissing('Visible subtabs not visited', audit.initialCoverage.visibleSubtabs, firstNavigation?.subtabs);

  [
    ['first-navigation-running', false],
    ['repeat-navigation-running', false],
    ['buildings-running', false],
    ['projects-running', false],
    ['settings-idle-running', false],
    ['settings-idle-manual-pause', true],
    ['repeat-navigation-manual-pause', true],
    ['buildings-manual-pause', true],
    ['projects-manual-pause', true]
  ].forEach(([phaseName, expectedPaused]) => {
    const result = phaseByName.get(phaseName)?.actionResult;
    if (result?.paused !== expectedPaused) {
      issues.push(`${phaseName} ended with paused=${result?.paused}; expected ${expectedPaused}`);
    }
    if (result?.availableTabs) {
      addMissing(`${phaseName} available main tabs not visited`, result.availableTabs, result.tabs);
      addMissing(`${phaseName} available subtabs not visited`, result.availableSubtabs, result.subtabs);
    }
  });

  ['buildings-running', 'buildings-manual-pause'].forEach((phaseName) => {
    const result = phaseByName.get(phaseName)?.actionResult;
    addMissing(`${phaseName} buildings not interacted`, result?.registered, result?.interacted);
  });
  ['projects-running', 'projects-manual-pause'].forEach((phaseName) => {
    const result = phaseByName.get(phaseName)?.actionResult;
    addMissing(`${phaseName} relevant projects not rendered`, result?.relevant, result?.available);
    addMissing(`${phaseName} relevant projects not interacted`, result?.relevant, result?.interacted);
  });

  ['travel-running', 'travel-manual-pause'].forEach((phaseName) => {
    const cycles = getLifecycleCycles(phaseName);
    const expectedPaused = phaseName.endsWith('manual-pause');
    cycles.forEach((cycle, index) => {
      if (!cycle.travelled) issues.push(`${phaseName} cycle ${index + 1} did not reach Olympus`);
      if (cycle.paused !== expectedPaused) {
        issues.push(`${phaseName} cycle ${index + 1} ended with paused=${cycle.paused}; expected ${expectedPaused}`);
      }
      addMissing(`${phaseName} cycle ${index + 1} available main tabs not visited`, cycle.navigation?.availableTabs, cycle.navigation?.tabs);
      addMissing(`${phaseName} cycle ${index + 1} available subtabs not visited`, cycle.navigation?.availableSubtabs, cycle.navigation?.subtabs);
      addMissing(`${phaseName} cycle ${index + 1} available buildings not interacted`, cycle.buildings?.available, cycle.buildings?.interacted);
      addMissing(`${phaseName} cycle ${index + 1} available projects not rendered`, cycle.projects?.available, cycle.projects?.rendered);
      addMissing(`${phaseName} cycle ${index + 1} available projects not interacted`, cycle.projects?.available, cycle.projects?.interacted);
      addDuplicateIssues(`${phaseName} cycle ${index + 1}`, cycle.coverage);
    });
  });
  ['save-load-running', 'save-load-manual-pause'].forEach((phaseName) => {
    const cycles = getLifecycleCycles(phaseName);
    const expectedPaused = phaseName.endsWith('manual-pause');
    cycles.forEach((cycle, index) => {
      if (!cycle.loaded) issues.push(`${phaseName} cycle ${index + 1} did not load the saved slot`);
      if (cycle.paused !== expectedPaused) {
        issues.push(`${phaseName} cycle ${index + 1} ended with paused=${cycle.paused}; expected ${expectedPaused}`);
      }
      addMissing(`${phaseName} cycle ${index + 1} available main tabs not visited`, cycle.navigation?.availableTabs, cycle.navigation?.tabs);
      addMissing(`${phaseName} cycle ${index + 1} available subtabs not visited`, cycle.navigation?.availableSubtabs, cycle.navigation?.subtabs);
      addMissing(`${phaseName} cycle ${index + 1} available buildings not interacted`, cycle.buildings?.available, cycle.buildings?.interacted);
      addMissing(`${phaseName} cycle ${index + 1} available projects not rendered`, cycle.projects?.available, cycle.projects?.rendered);
      addMissing(`${phaseName} cycle ${index + 1} available projects not interacted`, cycle.projects?.available, cycle.projects?.interacted);
      addDuplicateIssues(`${phaseName} cycle ${index + 1}`, cycle.coverage);
    });
  });

  if (options.storyProjects) {
    const storySweep = phaseByName.get('story-project-world-sweep')?.actionResult;
    const storyWorldTargets = storySweep?.manifest.storyWorlds || [];
    const specialSeedTargets = storySweep?.manifest.specialSeeds || [];
    const visitedStoryWorlds = [];
    const visitedSpecialSeeds = [];
    (storySweep?.worlds || []).forEach(({ travel, coverage, runtimeCoverage }) => {
      const target = travel.targetKey;
      const isSpecialSeed = specialSeedTargets.includes(target);
      if (isSpecialSeed) visitedSpecialSeeds.push(target);
      else visitedStoryWorlds.push(target);
      if (!travel.travelled) issues.push(`Story-project sweep did not travel to ${target}`);
      if (isSpecialSeed) {
        if (travel.specialSeedKey !== travel.targetKey) {
          issues.push(`Story-project sweep reached special seed ${travel.specialSeedKey} instead of ${travel.targetKey}`);
        }
      } else if (travel.afterWorld !== travel.targetKey) {
        issues.push(`Story-project sweep reached ${travel.afterWorld} instead of ${travel.targetKey}`);
      }
      const expectedTargetProjects = (storySweep?.manifest.storyProjectTargets || [])
        .filter(project => isSpecialSeed
          ? project.specialSeedKey === target
          : project.planet === target)
        .map(project => project.name);
      addMissing(`Story-project sweep ${target} target projects not rendered`, expectedTargetProjects, coverage.rendered);
      addMissing(`Story-project sweep ${target} target projects not interacted`, expectedTargetProjects, coverage.interacted);
      addMissing(`Story-project sweep ${target} available projects not interacted`, coverage.available, coverage.interacted);
      addDuplicateIssues(`Story-project sweep ${target}`, runtimeCoverage);
    });
    addMissing('Story-project worlds not visited', storyWorldTargets, visitedStoryWorlds);
    addMissing('Story-project special seeds not visited', specialSeedTargets, visitedSpecialSeeds);
    addMissing('Projects never relevant in deep sweep', audit.projectCoverage.registered, audit.projectCoverage.relevant);
    addMissing('Projects not rendered in deep sweep', audit.projectCoverage.registered, audit.projectCoverage.rendered);
    addMissing('Projects not interacted in deep sweep', audit.projectCoverage.registered, audit.projectCoverage.interacted);
  }

  audit.phases.forEach((phase) => {
    if (phase.after.cacheReferences.disconnectedTooltipAnchorCount > 0) {
      const anchors = phase.after.cacheReferences.disconnectedTooltipAnchors
        .map(anchor => anchor.id || anchor.node)
        .join(', ');
      issues.push(`${phase.name} retained ${phase.after.cacheReferences.disconnectedTooltipAnchorCount} disconnected tooltip anchors: ${anchors}`);
    }
    if (phase.delta.newDetachedCacheReferences.length > 0) {
      const paths = phase.delta.newDetachedCacheReferences.map(reference => reference.path);
      issues.push(`${phase.name} added detached cache references: ${paths.join(', ')}`);
    }
  });

  addDuplicateIssues('Initial load', audit.initialCoverage);
  addDuplicateIssues('Final state', audit.coverage);
  pageErrors.forEach(error => issues.push(`Page error: ${error.message}`));
  consoleMessages
    .filter(message => message.type === 'error')
    .forEach(message => issues.push(`Console error: ${message.text}`));

  return { passed: issues.length === 0, issues };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { chromium } = requirePlaywright();

  if (!fs.existsSync(options.save)) {
    throw new Error(`Save file not found: ${options.save}`);
  }

  fs.mkdirSync(options.reportDir, { recursive: true });
  const saveText = fs.readFileSync(options.save, 'utf8');
  const reportBase = path.join(options.reportDir, `chrome-memory-${stamp()}`);
  const consoleMessages = [];
  const pageErrors = [];
  let staticServer = null;
  let origin = options.origin;

  if (!origin) {
    const started = await startStaticServer(options.port);
    staticServer = started.server;
    origin = started.origin;
  }

  const launchOptions = {
    headless: options.headless,
    args: [
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--js-flags=--expose-gc'
    ]
  };
  if (options.channel && options.channel !== 'bundled') {
    launchOptions.channel = options.channel;
  }

  const browser = await chromium.launch(launchOptions);
  let nativeMemoryCollector = null;

  try {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    page.on('console', message => {
      const text = message.text();
      if (message.type() === 'error' || text.includes('[memory-repro]')) {
        consoleMessages.push({ type: message.type(), text });
      }
    });
    page.on('pageerror', error => {
      pageErrors.push({ message: error.message, stack: error.stack });
    });

    const cdpSession = await context.newCDPSession(page);
    const browserCdpSession = options.nativeMemory
      ? await browser.newBrowserCDPSession()
      : null;
    await cdpSession.send('Performance.enable');
    await cdpSession.send('HeapProfiler.enable');

    await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
    await waitForGameReady(page);
    await loadSave(page, saveText);
    await dismissBlockingPopups(page);

    if (options.tabs && !options.audit) {
      await cycleVisibleTabs(page);
    }
    await activateFinalPanel(page, options.finalTab, options.finalSubtab);
    if (options.freezeLoop) {
      await freezeGameLoop(page);
    }

    await installProbe(page, { stackAttribution: options.stackAttribution });
    await wait(options.settleSeconds * 1000);
    let nativeMemoryBaseline = null;
    if (options.nativeMemory) {
      nativeMemoryCollector = createNativeMemoryCollector(
        cdpSession,
        browserCdpSession,
        options.nativeSamplingInterval
      );
      nativeMemoryBaseline = await collectNativeCheckpoint(cdpSession, nativeMemoryCollector);
      await nativeMemoryCollector.start();
      console.log([
        '[memory-repro] native baseline',
        `snapshot=${Math.round(nativeMemoryBaseline.heapSnapshot.snapshotAccountedBytes / 1024 / 1024)}MB`,
        `extra=${Math.round(nativeMemoryBaseline.heapSnapshot.extraNativeBytes / 1024 / 1024)}MB`,
        `private=${Math.round(nativeMemoryBaseline.chromiumPrivateBytes / 1024 / 1024)}MB`,
        `workingSet=${Math.round(nativeMemoryBaseline.chromiumWorkingSetBytes / 1024 / 1024)}MB`
      ].join(' '));
    }
    if (options.audit) {
      if (options.heapSampling) {
        await cdpSession.send('HeapProfiler.startSampling', { samplingInterval: 32768 });
      }
      const audit = await runAuditMatrix(
        page,
        cdpSession,
        saveText,
        options,
        nativeMemoryCollector
      );
      const finalProbe = await page.evaluate(() => window.memoryReproProbe.sample());
      const heapSamplingProfile = options.heapSampling
        ? await cdpSession.send('HeapProfiler.stopSampling')
        : null;
      const nativeAllocationProfiles = nativeMemoryCollector
        ? await nativeMemoryCollector.finish()
        : null;
      const finalHeapSnapshot = options.stringDuplicates || nativeMemoryCollector
        ? await takeHeapSnapshot(cdpSession)
        : null;
      const duplicateStrings = options.stringDuplicates
        ? summarizeDuplicateStrings(finalHeapSnapshot, {
          minLength: options.duplicateStringMinLength,
          limit: options.duplicateStringLimit
        })
        : null;
      const nativeMemoryFinal = nativeMemoryCollector
        ? await collectNativeCheckpoint(cdpSession, nativeMemoryCollector, finalHeapSnapshot)
        : null;
      const nativeMemory = nativeMemoryCollector ? {
        baseline: nativeMemoryBaseline,
        final: nativeMemoryFinal,
        delta: diffNativeCheckpoints(nativeMemoryBaseline, nativeMemoryFinal),
        allocationProfiles: nativeAllocationProfiles
      } : null;
      audit.validation = validateAuditCoverage(audit, options, consoleMessages, pageErrors);
      const report = {
        createdAt: new Date().toISOString(),
        repoRoot,
        pageUrl: page.url(),
        options: {
          ...options,
          save: path.relative(repoRoot, options.save),
          reportDir: path.relative(repoRoot, options.reportDir)
        },
        audit,
        finalProbe,
        topHeapAllocations: heapSamplingProfile ? summarizeHeapSamplingProfile(heapSamplingProfile.profile) : [],
        nativeMemory,
        duplicateStrings,
        consoleMessages,
        pageErrors
      };
      fs.writeFileSync(`${reportBase}.json`, JSON.stringify(report, null, 2));
      fs.writeFileSync(`${reportBase}.csv`, auditToCsv(audit));
      console.log(`[memory-audit] wrote ${pathToFileURL(`${reportBase}.json`).href}`);
      console.log(`[memory-audit] wrote ${pathToFileURL(`${reportBase}.csv`).href}`);
      if (audit.validation.passed) {
        console.log('[memory-audit] coverage validation PASS');
      } else {
        console.error('[memory-audit] coverage validation FAIL');
        audit.validation.issues.forEach(issue => console.error(`  - ${issue}`));
        process.exitCode = 1;
      }
      return;
    }
    if (options.heapSampling) {
      await cdpSession.send('HeapProfiler.startSampling', { samplingInterval: 32768 });
    }

    const startedAt = Date.now();
    const samples = [];
    const maxSamples = Math.floor(options.durationSeconds / options.sampleSeconds) + 1;

    for (let index = 0; index < maxSamples; index += 1) {
      samples.push(await collectMetrics(
        page,
        cdpSession,
        startedAt,
        options.forceGc,
        nativeMemoryCollector
      ));
      const latest = samples[samples.length - 1];
      console.log([
        `[memory-repro] ${latest.elapsedSeconds}s`,
        `heap=${Math.round(latest.jsHeapUsedSize / 1024 / 1024)}MB`,
        ...(nativeMemoryCollector ? [
          `private=${Math.round(latest.chromiumPrivateBytes / 1024 / 1024)}MB`,
          `workingSet=${Math.round(latest.chromiumWorkingSetBytes / 1024 / 1024)}MB`
        ] : []),
        `dom=${latest.domNodes}`,
        `listeners=${latest.domListeners}`,
        `extras=${latest.connectedExtraCount}`,
        `added=${latest.addedNodeCount}`,
        `removed=${latest.removedNodeCount}`,
        `created=${latest.createdElementCount}`,
        `text=${latest.createdTextNodeCount}`,
        `html=${latest.innerHTMLSetCount}`,
        `replaceChildren=${latest.replaceChildrenCount}`,
        `queries=${latest.domQueryCount}`
      ].join(' '));
      if (index < maxSamples - 1) {
        await wait(options.sampleSeconds * 1000);
      }
    }

    const finalProbe = await page.evaluate(() => window.memoryReproProbe.sample());
    const heapSamplingProfile = options.heapSampling
      ? await cdpSession.send('HeapProfiler.stopSampling')
      : null;
    const nativeAllocationProfiles = nativeMemoryCollector
      ? await nativeMemoryCollector.finish()
      : null;
    const finalHeapSnapshot = options.stringDuplicates || nativeMemoryCollector
      ? await takeHeapSnapshot(cdpSession)
      : null;
    const duplicateStrings = options.stringDuplicates
      ? summarizeDuplicateStrings(finalHeapSnapshot, {
        minLength: options.duplicateStringMinLength,
        limit: options.duplicateStringLimit
      })
      : null;
    const nativeMemoryFinal = nativeMemoryCollector
      ? await collectNativeCheckpoint(cdpSession, nativeMemoryCollector, finalHeapSnapshot)
      : null;
    const nativeMemory = nativeMemoryCollector ? {
      baseline: nativeMemoryBaseline,
      final: nativeMemoryFinal,
      delta: diffNativeCheckpoints(nativeMemoryBaseline, nativeMemoryFinal),
      allocationProfiles: nativeAllocationProfiles
    } : null;
    const report = {
      createdAt: new Date().toISOString(),
      repoRoot,
      pageUrl: page.url(),
      options: {
        ...options,
        save: path.relative(repoRoot, options.save),
        reportDir: path.relative(repoRoot, options.reportDir)
      },
      summary: summarizeSeries(samples),
      samples,
      finalProbe,
      topHeapAllocations: heapSamplingProfile ? summarizeHeapSamplingProfile(heapSamplingProfile.profile) : [],
      nativeMemory,
      duplicateStrings,
      consoleMessages,
      pageErrors
    };

    fs.writeFileSync(`${reportBase}.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${reportBase}.csv`, toCsv(samples));
    if (duplicateStrings) {
      console.log([
        '[memory-repro] duplicate strings',
        `rows=${duplicateStrings.duplicateRowCount}`,
        `instances=${duplicateStrings.duplicateStringCount}`,
        `estimatedDuplicate=${Math.round(duplicateStrings.estimatedDuplicateBytes / 1024)}KB`
      ].join(' '));
      duplicateStrings.top.slice(0, 10).forEach((row, index) => {
        console.log([
          `[memory-repro] duplicate #${index + 1}`,
          `count=${row.count}`,
          `length=${row.length}`,
          `estimated=${Math.round(row.estimatedDuplicateBytes / 1024)}KB`,
          JSON.stringify(row.preview)
        ].join(' '));
      });
    }
    console.log(`[memory-repro] wrote ${pathToFileURL(`${reportBase}.json`).href}`);
    console.log(`[memory-repro] wrote ${pathToFileURL(`${reportBase}.csv`).href}`);
  } finally {
    if (nativeMemoryCollector) {
      await nativeMemoryCollector.close();
    }
    await browser.close();
    if (staticServer) {
      await new Promise(resolve => staticServer.close(resolve));
    }
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
