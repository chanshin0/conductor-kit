# Team Conventions — Template

> **This file is a neutral starting template.** Copy it to `.conductor/CONVENTIONS.md` in your host repo and replace each section with your team's actual rules. Conductor-kit loads this file at `conductor pick` so the agent can apply your house style when drafting code changes.

> Keep this document short and opinionated. If it reads like a policy manual, the agent will ignore it. If it reads like a single-page tech-lead briefing, the agent will follow it.

## 1. Stack

- Language:
- Framework:
- Package manager:
- Test runner:

## 2. Architecture layers & dependency direction

Describe the intended call direction so the agent doesn't wire things backwards.

Example:

- `View → Composable → Query → Data`
- `Store` is global orchestration only — not a server-response cache
- Types live in `types/api/` and `types/view/`; never extend generated API types

## 3. File naming

- Components (PascalCase):
- Utilities (camelCase):
- Types (PascalCase):
- Test files (`*.test.ts` next to source)

## 4. Language / framework rules

Put only the rules you actually enforce in code review. Examples:

- No `var`. Prefer `const`; use `let` only when reassigning.
- No prop mutation.
- No inline styles.
- Boolean names start with `is`, `has`, or `should`.

## 5. i18n / user-facing strings

- All user-visible text goes through the i18n resource.
- New strings must update the locale files in the same PR.

## 6. Error handling

- Boundary-only validation (user input, external APIs). Trust internal code.
- Never swallow errors. Never add "just in case" try/catch around trusted calls.

## 7. Testing

- What to test:
- What not to test:
- How to run:

## 8. Commit & branch conventions

- See `.conductor/workflow.yml` for the source of truth on `prefix_map` and commit format.
- Keep one logical change per commit. Squash noise before pushing.

## 9. Out-of-scope / do not do

List the "don'ts" that the agent keeps accidentally doing until written down.

Examples:

- Don't introduce new global state.
- Don't add a new dependency without checking if the project already exposes a utility.
- Don't refactor unrelated code inside a bug-fix PR.

---

**How to maintain this file**

- Treat it as a living tech-lead brief, not a style guide.
- Remove rules the team stopped enforcing.
- When you run `conductor tune`, one of the classifier outputs is "new convention rule" — append it here rather than letting it drift back into tribal knowledge.
