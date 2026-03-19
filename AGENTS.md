# AGENTS.md

## Purpose

This repository is the Upmin admin application, mounted under `/upmin/` inside a larger site. It is not a generic Laravel, Symfony, React, or Vue app. It is a JSON-first admin that edits content files, module settings, agents, integrations, and system pages.

Feature agents working in this project must preserve that model.

## Critical Agent Rules

- Before implementing any change, check whether the target area contains a more local `AGENTS.md` or `AGENTS.MD` and follow it in addition to this root guide.
- Treat deeper `AGENTS.md` files as more specific rules for their subtree.
- If code behavior, schema, architecture, UI rules, or workflow rules change, update the relevant `AGENTS.md` files in the same task.
- Treat business rules as first-class repo contracts. Agents must always read, preserve, update, and keep business rules current when behavior changes.
- Keep all agent guides consistent with each other. Do not leave this root guide saying one thing while a nested guide or the code says another.
- If a nested guide conflicts with this file, preserve the more specific rule and then reconcile the root guide if needed.
- No file should grow beyond 400 lines. If a change pushes a file near that limit, split the behavior into smaller focused files instead of extending the large file further.

## Project Shape

- Current repo root: admin app and private store.
- Public site root: parent directory of this repo.
- Private JSON store: `store/` in this repo.
- Public JSON store: `../store/` relative to this repo at runtime.
- Static admin assets: `public/`.
- Frontend source: `web/src/`.
- PHP source: `src/`.
- Worker scripts: `bin/`.

At runtime the backend treats this repo as `manageRoot` and the parent directory as `projectRoot`.

## Stack

- Backend: PHP 8.2, custom HTTP app, no full-stack framework.
- Frontend: TypeScript, no React/Vue/Svelte.
- Bundling: `esbuild` via `web/build.mjs`.
- CSS foundation: Bulma 0.9.4 loaded from CDN in `public/index.html`.
- App styling: custom CSS in `web/src/styles/*.css`.
- Data/config formats: JSON for content, YAML for module and integration manifests.
- Realtime: Ratchet + ReactPHP websocket server.
- Storage: filesystem only. No database.
- Testing: PHPUnit, PHPStan, TypeScript compiler.

## Backend Architecture

Request flow:

1. `public/index.php`
2. `bootstrap.php`
3. `Manage\Interface\Http\App`
4. `Router` + middleware
5. controller
6. use case
7. repository/store/infrastructure

Main layers:

- `src/Interface/Http`
  Purpose: requests, responses, router, middleware, controllers, route registration.
- `src/Application/UseCases`
  Purpose: business actions such as create/update document, list navigation, sync integrations, run updates, manage creations.
- `src/Application/Ports`
  Purpose: backend-facing interfaces used by use cases.
- `src/Domain`
  Purpose: core document/module/integration/auth value objects.
- `src/Infrastructure`
  Purpose: filesystem repositories, logging, security, realtime, workers, build/creation services, updater services.
- `src/Modules`
  Purpose: pluggable backend modules loaded from YAML manifests plus PHP handlers.
- `src/Integrations`
  Purpose: pluggable provider integrations loaded from YAML manifests plus PHP handlers.

### Important Runtime Facts

- `App.php` wires dependencies manually. There is no DI container.
- Admin APIs are under `/api/...`.
- Public module submission entrypoint is `/api/public/{module}/{pageId}/{action}`.
- Admin auth supports `X-API-KEY` or `Authorization: Bearer ...`.
- During system update, most admin routes return `423`.
- Static assets and media are also served by the PHP app.

## Frontend Architecture

This frontend is a small DOM-driven SPA. Do not introduce a component framework unless the user explicitly asks for a rewrite.

Main structure:

- `web/src/main.ts`
  Boot entry.
- `web/src/app/bootstrap.ts`
  Top-level orchestration: auth, loading config, shell rendering, realtime startup, modal setup, navigation refresh.
- `web/src/app/state.ts`
  Single in-memory app state object.
- `web/src/api/*`
  Fetch wrappers and API types.
- `web/src/ui/*`
  Shell chrome, notifications, notices, theme application.
- `web/src/views/*`
  Screen renderers for documents, modules, integrations, logs, forms, creations, website build.
- `web/src/features/*`
  Focused feature logic such as auth, agents, chat, integrations, realtime, modals.
- `web/src/modules/*`
  Client-side renderers for module previews and interactions.
- `web/src/json-editor.ts`
  Custom JSON editor used across document editing.

### Frontend Rules

- Keep state in `web/src/app/state.ts` unless there is a strong reason not to.
- Put HTTP calls in `web/src/api/*`, not inline inside unrelated views.
- Put shell-level DOM in `web/src/ui/shell.ts`.
- Put feature-specific DOM and behavior under `web/src/features/*` or `web/src/views/*`.
- Reuse the existing custom JSON editor instead of importing a heavy editor dependency.
- Preserve the current event-driven approach with DOM listeners and small render functions.

## Language Behavior

There are two separate language concerns in this repo:

- admin chrome/copy language
- content document language variants

### Admin Language

The admin is not a fully internationalized app.

Current behavior:

- `public/index.html` provides the initial `<html lang>`, but the runtime admin locale is seeded from `store/system/configuration.json:data.defaultLanguage` once config/navigation loads.
- Admin UI copy is supplied from `store/layout.json:data.translations`, keyed by language code and then translation key.
- `store/layout.json:data.header.title` and `store/layout.json:data.header.subtitle` are direct configured values for the shell brand/title area.
- Other header/sidebar/profile labels may still be translated through `store/layout.json:data.translations`, with the config fields acting as fallback values.
- The supported admin locales are currently `en` and `el`, with `en` as the fallback dictionary.
- There is currently no dedicated runtime admin language switcher beyond changing the configured default language.

Implications for agents:

- Do not assume the admin has a full i18n framework beyond this JSON-backed dictionary.
- Never add new hardcoded admin-facing language in TypeScript, HTML, or JSON feature payloads when the text belongs to the admin UI.
- Admin-facing copy must go through the translation helpers and live in `store/layout.json:data.translations`.
- If you add new admin-facing copy, add matching keys under both `en` and `el` in `store/layout.json:data.translations`.
- If an old hardcoded admin label is encountered while touching a feature, move it into the translation dictionary as part of the same task.
- Do not invent a second localization system without explicit direction.

Admin translation rules:

- Use `adminText(...)` or `adminConfiguredText(...)` for admin copy instead of inline string literals.
- Treat `store/layout.json:data.translations.en` as the canonical fallback dictionary.
- Keep translation keys stable and namespaced by feature, for example `integrations.syncStarted`.
- Do not rely on mixed Greek/English UI or `document.documentElement.lang` checks inside features for copy selection.
- Keep `layout.header.title` and `layout.header.subtitle` aligned with the direct header config values when used as translation fallbacks, but the configured header values should win at runtime.
- Keep other `layout.header.*`, `layout.sidebar.*`, and `layout.profile.*` label keys in `data.translations` so those shell labels can be localized.

Adding a new admin language:

1. Add a full dictionary for the new language code under `store/layout.json:data.translations`, for example `de`.
2. Copy every existing key from `data.translations.en` into the new language dictionary and translate all values. Do not add partial overrides only.
3. Keep the same translation keys across `en`, `el`, and the new language. The key sets must stay identical.
4. If the new language should be selectable by configuration, set `store/system/configuration.json:data.defaultLanguage` to that language code or ensure the relevant feature writes that code there.
5. If the translation resolver needs to recognize a new locale variant such as `de-DE`, update the admin language normalization or fallback logic in `web/src/app/translations.ts`.
6. Validate that shell chrome, modals, notices, and feature views render in the new language without falling back to hardcoded strings.
7. Run `npm run typecheck:web` and `npm run build:web` after the change.

### Document Language

Document language is driven by the wrapper field `language`, not by URL params in the admin.

Important behavior:

- `language` is optional on documents and agents.
- Navigation groups documents by `page`, then resolves one variant per page/section using language matching.
- `defaultLanguage` comes from `store/system/configuration.json`.
- Public navigation shows the variant whose `language` exactly matches the resolved language.
- If a public page or section has no `language` value, that untagged public variant is shown as fallback.
- If a public page or section has only non-matching tagged variants, it is hidden from public navigation.
- Private navigation ignores document `language` entirely.
- Agent lists are filtered by the resolved active language, with fallback to untagged agents if no direct match exists.
- The document editor shows a language-variant switcher only for public documents when multiple public variants of the same page/section exist.

Important limitation:

- Admin language and document language are not the same system.
- Changing a document's `language` changes content variant selection, not the admin UI locale.

Recommended content rule:

- Use normalized short language codes consistently, for example `en`, `el`, `de`.
- Treat language matching as exact string matching after trim.

## Data Model

The core contract is `DocumentWrapper` in `src/Domain/Document/DocumentWrapper.php`.

There are two related shapes to keep separate:

- transport/envelope shape used by APIs
- persisted wrapper shape stored inside JSON files

### API Envelope

The backend usually returns documents like this:

```json
{
  "id": "base64url(store:path)",
  "store": "public | private",
  "path": "relative/path.json",
  "payload": {
    "...DocumentWrapper fields..."
  }
}
```

Business meaning:

- `id` is the encoded API identifier used in routes like `/api/documents/{id}`.
- `store` selects the root directory: public site store or private admin store.
- `path` is the relative file path inside that store.
- `payload` is the actual persisted JSON wrapper.

Every saved JSON document follows this wrapper shape:

```json
{
  "type": "page | module | agent | log",
  "id": "uuid-string",
  "page": "page-key",
  "name": "Human label",
  "language": "optional language code",
  "order": 1,
  "section": false,
  "modules": ["chat", "form"],
  "position": "system",
  "data": {}
}
```

Important rules:

- `type` must be one of `page`, `module`, `agent`, `log`.
- `page`, `name`, `order`, and `data` are required.
- `section` is only emitted for `page` and `module`.
- `position` is currently only allowed to be `system`.
- `position_view` is optional and controls where a document appears in admin navigation.
- `modules` is the normalized module list. Legacy `module` input can still be accepted on read.
- IDs are required in practice and are auto-enforced by the backend.

### Wrapper Field Business

`type`

- `page`: normal content and most system/config documents.
- `module`: module settings documents, usually under `store/modules/*.json`.
- `agent`: agent definitions under `store/agents/*.json`.
- `log`: reserved log type.

`id`

- UUID v4 wrapper-level identity.
- Used as the stable content identity across variants and system helpers.
- Required for module settings keys and public form submission routing.
- Auto-created and normalized by `EnsureDocumentId`.

`page`

- Logical page group key, not filesystem path.
- Used to group variants in navigation.
- Used to group sections under a page.
- Often values look like `home`, `layout`, `ui`, `agents`, `modules`, `system`.

`name`

- Human-facing label in navigation, document headers, forms list, and agent menus.

`language`

- Optional variant discriminator.
- Used in navigation resolution and agent filtering.
- Not validated against a fixed language registry.

`order`

- Sort and insertion position inside a sibling group.
- Rewritten by `ReorderDocuments` to a dense 1-based sequence.
- For sections, ordering is scoped to documents with the same `page` and `section: true`.
- For non-sections, ordering is scoped to the same `store` and `section: false`.

`section`

- `false`: top-level page entry.
- `true`: section entry nested under a page in navigation.
- Only valid for `page` and `module` wrappers.
- Agents and logs are treated as non-section records.

`modules`

- Enables attached modules for a page document.
- Used by the frontend to render module panels.
- Used by backend helpers to auto-create module settings and form submission system pages.
- Current built-ins are `chat`, `form`, `gallery`, `uploader`.

`position`

- Wrapper-level `position` only supports `system`.
- `position: "system"` hides a private page from normal page navigation and surfaces it in system/settings areas.
- `position: "system"` marks an internal system page rather than normal editable content.
- System pages can only update their `data`; their structural wrapper fields are protected in `UpdateDocument`.
- System pages cannot be created through the normal create-document flow.
- The app creates some system pages automatically, for example configuration/auth/build pages, creations pages, and generated form-submission stores.
- Admin updater deploy filtering also keys off wrapper `position: "system"` for deployable system JSON pages.

`position_view`

- Wrapper-level `position_view` is optional.
- Allowed values are `settings`, `sidebar`, `header`, and `footer`.
- `null`, empty, or missing means the document should not appear in admin navigation.
- This property applies only to private documents. Public navigation ignores it.
- `position_view` can be used on both normal private pages and private system pages.
- `settings` places the private document under the header settings submenu.
- `sidebar` places the private document in the private sidebar navigation.
- `header` places the private document as a direct header action/button.
- `footer` places the private document in the footer navigation.
- This field is intended to be managed from JSON files, not from the normal create/edit document form.
- Preserve `position_view` when saving documents through the admin even if the form does not expose it.

`data`

- Domain-specific payload.
- Shape depends on `type`, `page`, and enabled modules.
- This is where almost all feature-specific business state lives.

### Path and Store Rules

- `store` must be `public` or `private`.
- Backend paths must end in `.json`.
- Backend paths may include nested directories.
- Backend rejects `..`, absolute paths, and backslashes.
- Private `logs/*.json` documents are read-only except `logs/logger-settings.json`.
- The current create-document modal only allows filename-style paths, even though the backend supports nested relative paths. Do not assume the modal and backend have identical constraints.

### Special Documents

- `store/system/configuration.json`
  System config, including `defaultLanguage`, `timezone`, `adminPath`, `createSnapshotOnEachClean`.
- `store/layout.json`
  Header, sidebar, and profile copy.
- `store/ui.json`
  Theme defaults and token overrides.
- `store/auth.json`
  User records for login.
- `store/modules/*.json`
  Module settings documents, auto-created and maintained by the app.
- `store/system/forms/submissions/*.json`
  Auto-generated form entry stores. These are internal system pages and should not be treated like normal editable content.
- `store/logs/*.json`
  Logs are read-only, except `logs/logger-settings.json`.
- `store/agents/*.json`
  Agent definitions used by the agent chat flow.

### Important Special Payloads

`store/system/configuration.json`

- Wrapper type is `page`.
- Wrapper position is `system`.
- `data.defaultLanguage` drives navigation language resolution.
- `data.timezone` exists as config state but is not a full timezone subsystem by itself.
- `data.adminPath` exists in content, but the document editor explicitly warns that the admin path is fixed at `/upmin/`.
- `data.createSnapshotOnEachClean` controls whether clean/build actions require and create snapshots.

`store/ui.json`

- Wrapper type is `page`.
- `data.theme` supports `light` or `dark`.
- `data.tokens` overrides light theme tokens.
- `data.darkTokens` overrides dark theme tokens.
- Only token names registered in `web/src/ui/theme.ts` are actually applied.

`store/layout.json`

- Wrapper type is `page`.
- Supplies configured copy for header, sidebar, and profile UI sections.
- Also supplies the admin translation dictionary under `data.translations`, keyed by language code and then translation key.
- Localized admin chrome should live under `data.translations`, but the direct header title/subtitle config values remain authoritative for the shell brand area.
- This is copy configuration, not a full localization engine.

`store/auth.json`

- Wrapper type is `page`.
- Wrapper position is `system`.
- `data.users` is the login user list.
- Each user record includes fields like `uuid`, `firstname`, `lastname`, `email`, `password`, `roles`.

`store/creations.json`

- Wrapper type is `page`.
- Wrapper position is `system`.
- `data.creations` is the snapshot/archive history list.

`store/modules/*.json`

- Wrapper type is `module`.
- Usually `page: "modules"` and `section: true`.
- Filename key usually derives from `{document-id}-{module-name}`.
- `data` holds module-specific settings merged with manifest defaults.

`store/system/forms/submissions/*.json`

- Auto-generated internal page records for forms.
- Wrapper type is `page`.
- Wrapper position is `system`.
- `data.formSettingsId` links to the backing module settings document.
- `data.pageId` is the wrapper UUID of the page that owns the form.
- `data.settingsKey` is the module settings key.
- `data.label` is the form label.
- `data.settings` is a normalized copy of form module settings.
- `data.source` describes the originating page document.
- `data.properties` stores first-submission field metadata.
- `data.entries` stores form submissions.
- `data.createdAt` and `data.updatedAt` track lifecycle.

## Navigation and Content Model

- Navigation is derived from document wrappers, not from hardcoded routes.
- `page` groups related variants.
- `language` identifies language variants.
- `section: true` means the document is grouped under a page as a section entry.
- `position: system` keeps private pages out of the normal sidebar page lists and surfaces them in settings/system areas.
- `position_view` controls private-document placement in the sidebar, settings menu, header actions, or footer navigation.
- Public documents keep using the normal public navigation and ignore `position_view`.
- Documents without `position_view` are intentionally absent from admin navigation.

When changing navigation behavior, inspect `ListNavigation.php` first. Do not hardcode assumptions in the frontend that bypass backend grouping rules.

## Modules

Modules are backend-first plugins.

Each module includes:

- `src/Modules/<Name>/manifest.yaml`
- `src/Modules/<Name>/Module.php`
- optional `src/Modules/<Name>/Interface/ModuleController.php`
- optional application/infrastructure classes under that module namespace
- matching frontend renderer under `web/src/modules/<name>/`

Current built-in modules:

- `chat`
- `form`
- `gallery`
- `uploader`

Module rules:

- Define schema and defaults in `manifest.yaml`.
- Keep module settings backward compatible.
- If a page enables a module, backend helpers may auto-create dependent settings or system pages.
- If a module needs admin-side interactive UI, add or update the matching frontend renderer in `web/src/modules/registry.ts`.
- For page-bound chat modules, page context injection belongs on the backend. The frontend should send only the normal chat payload, while the server may create one hidden conversation-context message from the owning page `data` plus the exact module schema and keep that message in model history for the whole conversation without rendering it in the visible chat UI.

### Chat Module Business Rules

These are business rules, not optional implementation details.

- The existing assistant-response plus action and the JSON-merge action are separate features and must remain decoupled in code and UI.
- The existing plus action means explicit output selection. It must not silently become schema merge behavior.
- The JSON-merge action is a second dedicated action with its own handler, validation path, feedback path, and translation labels.
- On the private `website-build` system page, do not render either the plus action or the JSON-merge action. Builder chat must not expose page-data mutation buttons.
- Page-bound chat modules should initialize from the latest existing conversation when the page opens, the same way the website builder chat does.
- Merge behavior is schema-driven. Agents must not hardcode content keys or guess arbitrary target paths without schema support.
- A response is merge-eligible only if it is valid JSON and the relevant keys exist in the current page-data schema.
- Target discovery must be recursive and deterministic. The code should walk the assistant JSON and current page data until it finds a schema-backed key path to update.
- Merge behavior is additive by default. For arrays, append valid incoming items to existing items. For objects, merge only schema-known keys recursively. Do not delete unrelated existing data as part of this action.
- Visible chat messages and hidden model context are separate concerns. Merge must operate on the live page `data`, not on hidden context messages.
- Validation failure is part of the conversation loop. If merge validation fails, the app must immediately send feedback to the agent conversation explaining that JSON validation failed against the expected schema.
- Validation feedback to the agent must be decoupled from the merge algorithm itself. Parsing, schema validation, recursive target discovery, merge application, and agent feedback should live in separate focused helpers.
- When implementing chat merge behavior, prefer small focused files such as action wiring, schema/target resolution, merge logic, and validation feedback. Do not centralize all of that into one large controller file.

### Chat Module Architecture Decisions

- Page-bound chat prompt context stays backend-owned.
- Page-data merge and response-to-output actions stay frontend-owned because they mutate the live editor state.
- The current client-side schema source for merge validation is the existing live page `data` shape. Until explicit page schema transport exists in the frontend, agents must preserve that rule instead of inventing a second schema source in the chat UI.
- Frontend responsibilities for chat merge are:
  - parse assistant response as JSON
  - validate against schema-backed paths
  - find the recursive target path
  - merge into current page `data`
  - persist through the existing editor/update flow
  - send immediate validation-failure feedback back into the conversation
- Backend responsibilities for page-bound chat context are:
  - resolve owning page context
  - keep hidden conversation context in model history
  - avoid exposing that hidden context as visible chat content
- Do not couple merge behavior to backend prompt composition. These are different subsystems with different business rules.

### Module Settings Business

Module settings keys are deterministic:

- key format: `{document-wrapper-id}-{module-slug}`
- source: `ModuleSettingsKey::forDocument()`

Consequences:

- Page wrapper IDs must remain stable.
- If you break wrapper IDs, module settings linkage and public form submissions break.
- Module settings documents are private data, even when the owning page is public.

## Integrations

Integrations are provider adapters, loaded like modules from manifests.

Current integrations:

- `openai`
- `gemini`
- `grok`
- `codex-cli`

Integration rules:

- Add fields and metadata in `manifest.yaml`.
- Keep secrets in integration settings, never in checked-in content docs.
- If models are syncable, preserve the existing async sync pattern and realtime updates.
- Put provider-specific HTTP or CLI behavior inside the integration handler, not inside controllers.

## Agents, Workers, and Realtime

Agent replies and integration model sync are asynchronous.

Relevant files:

- `bin/agent-worker.php`
- `bin/integration-sync-worker.php`
- `src/Infrastructure/Workers/ReplyWorkerLauncher.php`
- `bin/realtime-server.php`
- `src/Infrastructure/Realtime/*`

Rules:

- Do not turn async flows into blocking HTTP requests unless explicitly asked.
- Preserve realtime event publishing for long-running operations.
- If you change agent conversation behavior, inspect both the worker path and the frontend realtime bindings.

## Build, Publish, and Creations

This admin manages snapshots and build/publish actions.

Relevant services:

- `src/Infrastructure/Creations/CreationStore.php`
- `src/Infrastructure/WebsiteBuild/WebsiteBuildStore.php`

Important facts:

- Creations store snapshots and archives under `store/creations/`.
- Clean/publish/build operations intentionally exclude admin-specific paths.
- This repository also contains agent guidance files, so do not break the exclusion rules around admin/build assets.

## UI, Typography, and Layout

This app already has a clear visual system. Extend it instead of replacing it.

### Typography

- Primary font stack: `"Noto Sans", "Inter", system-ui, sans-serif`.
- Titles, labels, and body text inherit from the same tokenized stack.
- Do not introduce random font families for isolated screens.

### Theme System

- Tokens live in `web/src/styles/tokens.css`.
- Runtime token overrides come from `store/ui.json` and are applied by `web/src/ui/theme.ts`.
- Supported theme modes are `light` and `dark`.
- If you add new themeable values, add them to both the CSS token list and the theme token registry in `theme.ts`.

### Layout System

- Bulma handles base layout primitives like `navbar`, `columns`, `box`, `menu`, `modal`.
- Custom classes provide the real product styling: `app-surface`, `app-button`, `app-panel`, `app-muted`, `app-module-*`, `app-chat-*`, `app-landing-*`.
- Desktop structure is top navbar + left sidebar + boxed content panel.
- Mobile structure is top navbar + drawer/accordion navigation.
- The current admin version belongs in the desktop footer area, to the right of footer navigation.
- The desktop header should not show the current version; it should only surface a compact update control when an admin update is available or currently running.

### Visual Rules

- Reuse existing spacing, radius, border, and color tokens.
- Preserve the restrained neutral surface style with accent highlights.
- Keep landing cards, settings panels, and chat panels visually consistent with current custom CSS.
- Prefer extending the existing CSS files over adding one-off inline styles.
- In agent and chat UI, do not hardcode provider or tool brand names into visible status copy. Use the current agent name for progress titles, assistant labels, and other active-chat identity surfaces.

## What Feature Agents Must Do

- Read existing code paths before adding a new abstraction.
- Follow the current backend layering: controller -> use case -> infrastructure.
- Follow the current frontend split: api -> app/features/views/ui/modules.
- Keep filesystem-backed storage as the source of truth.
- Preserve JSON wrapper compatibility.
- Reuse existing module/integration registries.
- Add tests for backend behavior changes.
- Run typechecking when touching TypeScript.
- Keep copy configurable when the project already exposes a config document for it.

## What Feature Agents Must Not Do

- Do not add a database, ORM, or migration system.
- Do not introduce React, Vue, or another SPA framework for incremental changes.
- Do not bypass `DocumentWrapper` validation by writing arbitrary JSON shapes.
- Do not hardcode module or integration metadata that already belongs in manifests.
- Do not make logs editable, except for the existing logger settings document.
- Do not treat system pages like ordinary public content.
- Do not break the separation between private `store/` and public `../store/`.
- Do not edit generated content or snapshot artifacts unless the task is explicitly about those artifacts.

## Type-Specific Payload Business

### Page Documents

Typical page document rules:

- `type` defaults to `page` if omitted.
- `data` is intentionally flexible.
- `modules` adds behavior to the page without changing the underlying page type.
- Public pages often live in the public store.
- Private pages often represent admin configuration or internal tools.

### Module Documents

Typical module settings document rules:

- `type` is `module`.
- `page` is usually `modules`.
- `section` is usually `true`.
- `data` schema should mirror the module manifest parameters.
- These documents are often auto-created by `EnsureModuleSettings`.

### Agent Documents

Wrapper rules:

- `type` must be `agent`.
- `page` must be `agents`.
- `section` is not used.

Common `data` fields:

- `provider`
- `providerId`
- `model`
- `systemPrompt`
- `adminPrompt`

Additional observed fields:

- `position`
  This is inside `data`, not wrapper `position`.
- `systemPromptFile`
- `adminPromptFile`

Important nuance:

- Wrapper `position` and agent `data.position` are different concepts.
- Wrapper `position` only supports `system`.
- Agent `data.position` can be `module` or `page` for normal editable agents.
- Agent `data.position: "system"` is used by seeded system agents and makes them hidden from the regular agent list and direct agent fetches.
- The current create-agent modal does not expose every supported agent field even though the backend accepts more.

### Log Documents

- Logs are backend-managed.
- Treat them as read-only records.
- Only logger settings are editable.

### Form Submission Payloads

Public form submissions call `/api/public/{module}/{pageId}/{action}`.

For the built-in form module:

- `pageId` is the owning page wrapper UUID.
- The target page must have the `form` module enabled.
- The first submission may need `properties` to establish field metadata.
- Submission payload stores `entry`, optional `properties`, and optional `name`.
- Entries are appended into the internal private submission document under `data.entries`.

## Validation Commands

Run the relevant checks after changes:

```bash
vendor/bin/phpunit
vendor/bin/phpstan analyse
npm run typecheck:web
npm run build:web
```

If a change touches workers, realtime, modules, integrations, or build publishing, validate those flows explicitly rather than assuming compile-time checks are enough.
