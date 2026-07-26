---
name: github-issue
description: Use when asked to implement, fix, work on, or close a GitHub issue for this project (by number, URL, or title) — fetches the issue, scopes the fix, implements it following this repo's conventions, verifies, and opens a PR that closes it.
---

# Implementing a GitHub issue

Repo: `GITZMBE/Geo-quizzes` (remote `origin`, default branch `master`).

## 0. Check tooling once per session

```
gh --version
```

- **If `gh` is available and authenticated** (`gh auth status`), use it for
  every GitHub read/write below.
- **If not**, `gh` is not installed on this machine as of 2026-07 — fall back
  to the GitHub REST API over `WebFetch` for *reading* (works unauthenticated
  against this public repo, e.g. `https://api.github.com/repos/GITZMBE/Geo-quizzes/issues/<n>`).
  For *writing* (opening the PR, commenting, closing), you have no token —
  `git push` alone works (HTTPS credential manager is already configured, per
  the clean push history on this branch), so push the branch and hand the
  user the compare URL (`https://github.com/GITZMBE/Geo-quizzes/compare/master...<branch>?expand=1`)
  to open the PR themselves, rather than guessing at API auth.

## 1. Fetch and read the issue

```
gh issue view <number> --repo GITZMBE/Geo-quizzes --comments
```

Read the full body **and** the comment thread — scope-narrowing or repro
details often show up in comments, not the original description. Note any
labels (bug/enhancement/good-first-issue/etc.) and linked issues/PRs.

If the user gave a title or description instead of a number, `gh issue list
--repo GITZMBE/Geo-quizzes --search "<keywords>"` to find it — confirm the
match with the user before proceeding if more than one plausible candidate
comes back.

## 2. Scope it before writing code

Classify the issue against what's already documented, so you reuse the right
pattern instead of improvising:

- **New game** → this is out of scope for this skill; use the **`new-game`**
  skill instead (data sourcing, registry entry, page scaffolding).
- **Bug in an existing game/component** → re-read the relevant "Architecture
  gotchas" bullet in `CLAUDE.md` first (auth split, `GlobeView` vs `MapView`,
  nanostores/`useGameState`, Prisma adapter, React 19 effect rules) — several
  past issues in this repo trace back to violating one of those documented
  constraints, not a fresh bug class.
- **Data bug** (wrong coordinates, missing country, bad road geometry) →
  check whether a build script already produces that file
  (`scripts/build-*.js`, `scripts/match-city-coords.js`) before hand-editing
  the JSON — fix the script and regenerate so the fix survives a future
  rebuild, per the pattern documented in the `new-game` skill's sourcing
  section.
- **Ambiguous or underspecified** (issue doesn't say *how* it should behave,
  or could be fixed multiple reasonable ways) → ask the user or comment on
  the issue for clarification rather than guessing; don't silently pick a
  behavior for something user-facing.

For anything beyond a small/obvious fix, use `EnterPlanMode` to propose your
approach before writing code — same bar as any other non-trivial task in this
repo.

## 3. Branch

Create a branch off an up-to-date `master`, don't commit directly to it:

```
git checkout master && git pull
git checkout -b issue-<number>-<short-slug>
```

## 4. Implement

Follow the project conventions in `CLAUDE.md` (imports from
`@/app/generated/prisma`, not `@prisma/client`; `useGameState` not raw
nanostores; `MapView` over `GlobeView` for new click-a-region UI; etc). Keep
the change scoped to what the issue asks — don't fold in unrelated cleanup or
extra features (see repo-wide guidance on avoiding scope creep).

## 5. Verify before committing

```
npx tsc --noEmit && npm run lint
```

For any UI/game-affecting change, also smoke-test in the dev server (`npm run
dev`) — map click-hit-testing, leaderboard sorting, and score submission
don't show up in a type check. Use the **`verify`** skill if the change has a
non-trivial runtime surface to exercise.

## 6. Commit, push, open the PR

Commit message: describe the *why*, and reference the issue so GitHub
auto-links it:

```
git add <files>
git commit -m "$(cat <<'EOF'
<summary of the fix>

Fixes #<number>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

Pushing and opening a PR are visible, shared-state actions — confirm with the
user first unless they've already asked you to go all the way to a PR for
this issue.

```
git push -u origin issue-<number>-<short-slug>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullets>

Fixes #<number>

## Test plan
<checklist>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

`Fixes #<number>` (or `Closes #<number>`) in the PR body auto-closes the
issue when the PR merges — don't manually close the issue while the PR is
still open.

If `gh` isn't available, push the branch and give the user the compare URL
from step 0 instead of the `gh pr create` call.

## 7. Report back

Summarize what changed and link the PR (or compare URL). Don't merge the PR
yourself, and don't close the issue directly — that's the user's call once
they've reviewed it, unless they explicitly asked you to merge/close as part
of this task.
