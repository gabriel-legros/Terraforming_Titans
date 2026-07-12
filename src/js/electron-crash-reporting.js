if (GAME_FEATURES.electronCrashReporting) {
  window.addEventListener('error', event => {
    window.electronCrashReporter.report({
      type: 'Renderer JavaScript error',
      message: event.message,
      stack: event.error ? event.error.stack : '',
      details: `${event.filename}:${event.lineno}:${event.colno}`
    });
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    window.electronCrashReporter.report({
      type: 'Renderer promise rejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : '',
      details: 'The game renderer encountered an unhandled promise rejection.'
    });
  });
}
