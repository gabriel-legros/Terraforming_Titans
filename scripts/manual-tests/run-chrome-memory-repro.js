#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
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
    heapSampling: true
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
    } else if (arg === '--no-heap-sampling') {
      options.heapSampling = false;
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
    '  --no-heap-sampling    Disable V8 allocation sampling'
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

function summarizeSeries(samples) {
  if (samples.length === 0) {
    return {};
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const heapValues = samples.map(sample => sample.jsHeapUsedSize).filter(Number.isFinite);
  const domValues = samples.map(sample => sample.domNodes).filter(Number.isFinite);
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
    maxHeapBytes: maxHeap,
    minHeapBytes: minHeap,
    maxDomNodes: maxDom,
    minDomNodes: minDom
  };
}

function toCsv(samples) {
  const headers = [
    'elapsedSeconds',
    'jsHeapUsedSize',
    'jsHeapTotalSize',
    'domNodes',
    'domDocuments',
    'domListeners',
    'elementCount',
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
    'styleWriteCount'
  ];
  const rows = samples.map(sample => headers.map(header => sample[header]).join(','));
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

async function installProbe(page) {
  await page.evaluate(() => {
    if (window.memoryReproProbe) {
      window.memoryReproProbe.stop();
    }

    const baseline = new WeakSet();
    const added = new Map();
    const removed = new Map();
    const operations = new Map();
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
    const originals = {
      createElement: Document.prototype.createElement,
      createElementNS: Document.prototype.createElementNS,
      createTextNode: Document.prototype.createTextNode,
      cloneNode: Node.prototype.cloneNode,
      replaceChildren: Element.prototype.replaceChildren,
      innerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'),
      textContent: Object.getOwnPropertyDescriptor(Node.prototype, 'textContent'),
      nodeValue: Object.getOwnPropertyDescriptor(Node.prototype, 'nodeValue'),
      setAttribute: Element.prototype.setAttribute,
      classListAdd: DOMTokenList.prototype.add,
      classListRemove: DOMTokenList.prototype.remove,
      classListToggle: DOMTokenList.prototype.toggle,
      styleSetProperty: CSSStyleDeclaration.prototype.setProperty,
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

    function markBaseline() {
      document.querySelectorAll('*').forEach(node => baseline.add(node));
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
            node.querySelectorAll('*').forEach(child => {
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
            node.querySelectorAll('*').forEach(child => {
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
      const elementCount = document.getElementsByTagName('*').length;
      const connectedExtraCount = connectedAddedElementCount - connectedRemovedElementCount;
      return {
        elementCount,
        bodyTooltipCount: document.body ? document.body.querySelectorAll('.tooltip, .dynamic-tooltip, .info-tooltip').length : 0,
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
        topAdded: top(added, 25),
        topRemoved: top(removed, 25),
        topOperations: top(operations, 25)
      };
    }

    function stop() {
      observer.disconnect();
      Document.prototype.createElement = originals.createElement;
      Document.prototype.createElementNS = originals.createElementNS;
      Document.prototype.createTextNode = originals.createTextNode;
      Node.prototype.cloneNode = originals.cloneNode;
      Element.prototype.replaceChildren = originals.replaceChildren;
      Element.prototype.setAttribute = originals.setAttribute;
      DOMTokenList.prototype.add = originals.classListAdd;
      DOMTokenList.prototype.remove = originals.classListRemove;
      DOMTokenList.prototype.toggle = originals.classListToggle;
      CSSStyleDeclaration.prototype.setProperty = originals.styleSetProperty;
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

    window.memoryReproProbe = { sample, stop };
  });
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

async function collectMetrics(page, cdpSession, startedAt, forceGc) {
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

  return {
    elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(3)),
    jsHeapUsedSize: metricMap.JSHeapUsedSize,
    jsHeapTotalSize: metricMap.JSHeapTotalSize,
    domNodes: domCounters.nodes,
    domDocuments: domCounters.documents,
    domListeners: domCounters.jsEventListeners,
    ...probe
  };
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
    await cdpSession.send('Performance.enable');
    await cdpSession.send('HeapProfiler.enable');

    await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof loadGame === 'function' && typeof updateRender === 'function');
    await loadSave(page, saveText);

    if (options.tabs) {
      await cycleVisibleTabs(page);
    }
    await activateFinalPanel(page, options.finalTab, options.finalSubtab);
    if (options.freezeLoop) {
      await freezeGameLoop(page);
    }

    await installProbe(page);
    await wait(options.settleSeconds * 1000);
    if (options.heapSampling) {
      await cdpSession.send('HeapProfiler.startSampling', { samplingInterval: 32768 });
    }

    const startedAt = Date.now();
    const samples = [];
    const maxSamples = Math.floor(options.durationSeconds / options.sampleSeconds) + 1;

    for (let index = 0; index < maxSamples; index += 1) {
      samples.push(await collectMetrics(page, cdpSession, startedAt, options.forceGc));
      const latest = samples[samples.length - 1];
      console.log([
        `[memory-repro] ${latest.elapsedSeconds}s`,
        `heap=${Math.round(latest.jsHeapUsedSize / 1024 / 1024)}MB`,
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
      consoleMessages,
      pageErrors
    };

    fs.writeFileSync(`${reportBase}.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${reportBase}.csv`, toCsv(samples));
    console.log(`[memory-repro] wrote ${pathToFileURL(`${reportBase}.json`).href}`);
    console.log(`[memory-repro] wrote ${pathToFileURL(`${reportBase}.csv`).href}`);
  } finally {
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
