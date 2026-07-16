# Knowledge development rules

## Product invariant

- The product is local-first and remains fully usable without AI, an account, or a network connection.
- Markdown, YAML frontmatter, and ordinary attachments are the user-owned source of truth.
- SQLite or JSON caches must be disposable and rebuildable; they may never contain the only copy of note content.
- One shared kernel serves all users. Scenario modes only change templates, shortcuts, onboarding, and default navigation.

## Process and security boundaries

- Electron Renderer must not have Node integration, direct filesystem access, plaintext secrets, or unrestricted network access.
- All privileged operations go through typed, allow-listed preload IPC methods with validated inputs.
- AI context must be previewed before sending. AI changes must be represented as reviewable patches and never silently overwrite notes.
- API keys are stored through the operating-system-backed Electron safe storage mechanism and never written to settings or logs.

## Architecture boundaries

- UI components do not read or write files directly.
- Domain parsing helpers remain framework-independent and unit tested.
- Storage emits open Markdown and JSON formats. Paths must stay inside the selected vault.
- Changes to file formats, IPC contracts, AI provider contracts, or plugin contracts require an ADR.

## Dependency policy

- MIT, Apache-2.0, BSD, ISC, CC0, and Public Domain dependencies are allowed by default.
- GPL, AGPL, source-available, custom, or unknown licenses require explicit human approval.
- Do not weaken or delete tests to make a build pass.

## Definition of done

- Link work to a PRD requirement or vertical slice.
- Run typecheck, tests, and production build.
- Cover failure and cancellation paths for filesystem, migration, and AI operations.
