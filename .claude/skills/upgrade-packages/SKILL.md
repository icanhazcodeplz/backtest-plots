---
name: upgrade-packages
description: Upgrade every dependency in this repo's package.json to its latest stable version, then run lint, build, and the snapshot integration test. Auto-fix small breakages caused mechanically by the upgrade (renamed config keys, moved plugin exports, deprecated option renames); STOP and report when fixes would require real JavaScript logic changes or component refactoring. Trigger when the user asks to "upgrade packages", "bump deps to latest", "update dependencies", or similar.
---

# upgrade-packages

A five-phase flow: **discover → apply → verify → triage → finalize**. Commit + push only when everything passes cleanly (either first try or after auto-fixes). If anything requires user judgment, stop and leave the tree dirty.

## 1. Discover latest stable versions

Read `package.json` and collect every entry under `dependencies` and `devDependencies`.

For each package, fetch `https://registry.npmjs.org/<name>/latest` in parallel (use WebFetch or `curl -s`). Pull both the `version` and any `peerDependencies` from the response.

Cross-check peer ranges before locking in versions — common couplings in this repo:
- `@vitejs/plugin-react` peer-depends on a specific Vite major. The two must move together.
- `eslint-plugin-react-hooks` and `@eslint/js` peer-depend on an ESLint major range.

If any peerDependency would be violated, pin the offender to the highest version whose peers are satisfied and tell the user.

List every major-version bump to the user *before* writing changes.

## 2. Apply

Rewrite `package.json` so each dep uses `^<latest>`. Then:

```
npm install
```

## 3. Verify (stop at first failure)

```
npm run lint
npm run build
npm test
```

`npm test` runs `tests/snapshot.test.mjs`, which re-runs `scripts/snapshot.mjs` against `tests/data/api_data.json` and byte-compares the output against `tests/snapshots/expected.html`.

## 4. Triage failures

Classify the failure before touching anything:

### Auto-fix (mechanical, no judgment required)

Apply the fix and re-run from the failing step. Examples:
- ESLint config shape changes — e.g. `plugin.configs['recommended-latest']` → `plugin.configs.flat['recommended-latest']`, rule renames, flat-config key migrations.
- Vite / Rollup option renames — e.g. `inlineDynamicImports: true` → `codeSplitting: false`. The deprecation warning usually names the replacement.
- 1:1 import-path moves when a package reorganizes exports.
- Snapshot test failure where the diff between actual and expected is confined to bundler-emitted output (minified variable names, whitespace, Rollup helper wrappers, etc.) and **does not touch any application logic from `src/`**. Verify by diffing the two HTMLs — look for changes to anything that references identifiers from `Chart.jsx`, `App.jsx`, `main.jsx`, the `plugins/` dir, or any inlined application strings. If clean, regenerate the baseline:

  ```
  node scripts/snapshot.mjs tests/data/api_data.json tests/snapshots/expected.html
  ```

  Then re-run `npm test`.

### Stop and report (do NOT modify code)

These need the user's judgment:
- React API changes that need new hook patterns, prop shapes, or component restructuring.
- `lightweight-charts` API breakages — renamed methods, changed series configs, removed APIs.
- Snapshot diff that touches application logic from `src/`.
- Any case where the fix isn't a 1:1 substitution from release notes.

When stopping, leave the working tree as-is and report to the user:
- Which step failed (`lint` / `build` / `test`).
- The verbatim error.
- The package bump that most likely caused it (compare to the version list from phase 1).
- A short list of files they'll likely need to touch.

## 5. Finalize

### If all three steps pass (with or without auto-fixes applied)

Commit and push. Stage only the files this skill is allowed to have touched: `package.json`, `package-lock.json`, the regenerated snapshot baseline if applicable, and any config files modified by auto-fixes (`eslint.config.js`, `vite.config.js`, etc.). Do **not** `git add -A` — anything else dirty in the tree belongs to the user.

Use a commit message like:

```
upgrade dependencies to latest

- <pkg>: <old> -> <new>   (major if applicable)
- ...

<one line per auto-fix applied, if any>
```

Then `git push`.

### If a failure required stopping (logic / API changes)

Do not commit. Leave the working tree as-is.

### Report to the user

In all cases, summarize:
- Packages bumped (old → new), with majors marked.
- Auto-fixes applied, one line each: file + what changed.
- Status of `lint`, `build`, `test`.
- Either the commit hash + push confirmation, or the list of files the user needs to review.