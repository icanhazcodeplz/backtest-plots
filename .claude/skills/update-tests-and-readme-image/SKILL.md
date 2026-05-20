---
name: update-tests-and-readme-image
description: Regenerate the snapshot test baseline (tests/snapshots/expected.html) and the README chart screenshot (docs/images/snapshot.png), then run the full test suite and, only if it passes, commit and push to the current branch. Trigger when the user asks to "update tests and readme image", "refresh the snapshot baseline", or similar after an intentional rendering change.
---

# update-tests-and-readme-image

Four sequential steps. Stop and surface the problem if any step fails — do not push partial work.

## 1. Regenerate the snapshot baseline

```
node scripts/snapshot.mjs tests/data/api_data.json tests/snapshots/expected.html
```

## 2. Screenshot the regenerated HTML into the README image

Render `tests/snapshots/expected.html` headlessly with Chrome and capture a **1600x1000** PNG at `docs/images/snapshot.png` (the existing image's dimensions — do not change them).

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --window-size=1600,1000 \
  --screenshot=docs/images/snapshot.png \
  --virtual-time-budget=5000 \
  "file://$(pwd)/tests/snapshots/expected.html"
```

Verify afterward with `file docs/images/snapshot.png` — it should report `PNG image data, 1600 x 1000`. If the file is missing, zero bytes, or the wrong dimensions, stop and report.

## 3. Run all tests

```
npm test
```

If anything fails, **stop**. Do not commit or push. Report the failure to the user with the relevant output so they can decide what to do.

## 4. Commit and push

Only reached when steps 1–3 all succeed.

- Stage exactly `tests/snapshots/expected.html` and `docs/images/snapshot.png`.
- Commit with a message describing the regeneration (the typical case is "chore: regenerate snapshot baseline and README image"). Use the project's standard `Co-Authored-By` trailer.
- `git push` to the current branch's upstream. If the branch has no upstream, push with `-u origin <branch>`.

Do not amend prior commits, and do not force-push.