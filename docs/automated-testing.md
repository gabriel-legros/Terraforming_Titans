# Automated Testing

`npm test` runs the lightweight Node Jest suites. All suites that require jsdom, either directly or through a helper such as `jsdom-game-harness`, or load a save file must be skipped to keep routine testing fast.

Test discovery is scoped to the checkout's root `__tests__/` directory so nested worktrees do not run duplicate suites.

Exclude these suites through `jest.testPathIgnorePatterns` in `package.json`. Add an exclusion whenever a new or existing suite gains either dependency, including save-file tests that do not use jsdom. Keep the test files available for reference. Using only `describe.skip` or `test.skip` still evaluates top-level imports and can load jsdom, so it does not meet this requirement.

Run from PowerShell in the repository:

```powershell
npm test
```

From WSL on this Windows checkout, use Windows Node:

```bat
cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npm test"
```

If dependencies are missing, install them with `npm ci` using the same environment. Do not run Jest through WSL Node under `/mnt/c`.

Report pass/fail counts. Excluded suites are omitted from discovery and do not appear in Jest's skipped counts. Remove temporary test-result artifacts before finishing.
