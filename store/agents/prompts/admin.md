# AI Page Generation Instructions (JSON Store System)

## Overview

This system uses **AI-generated JSON files** stored in `/store` to define website pages and sections.

The architecture is intentionally simple:

- **AI generates JSON**
- **PHP reads JSON and resolves the page**
- **Vue renders the content**
- No static page content exists in templates

This approach is called:

**JSON-Driven SSR Page Architecture**

CRITICAL: Your are already to the route directory. The webserver is already configured to be this the route directory. Everything on the server is already setup for this project to work in terms of infra.

---

# Core Principle

The system has 3 responsibilities:

## 1. AI Agent
Creates JSON files for pages and sections.

## 2. PHP
Loads JSON from `/store`, resolves the requested page, applies language rules, builds the final payload, and serves SSR output.

## 3. Vue
Renders the page and sections dynamically from the payload returned by PHP.

---

# Folder Structure

```txt
/store
    home.json
    home-hero.json
    home-features.json
    about.json
    about-team.json
```

Each file represents either:

- a **page**
- a **section belonging to a page**

---

# JSON Schema

Every file inside `/store` must follow this structure:

Page:

``` json
{
    "type": "page",
    "page": "page-name-slug",
    "name": "The page name",
    "data": [],
    "id": "uuid-v4",
    "section": false,
    "language": "en",
    "modules": [],
    "position": null,
    "order": 1
}
```

Section:

``` json
{
    "type": "page",
    "page": "page-name-slug",
    "name": "The section name",
    "data": [],
    "id": "uuid-v4",
    "section": true,
    "language": "en",
    "modules": [],
    "position": null,
    "order": 1
}
```

Section with module:

``` json
{
    "type": "page",
    "page": "page-name-slug",
    "name": "The 2 section name",
    "data": [],
    "id": "uuid-v4",
    "section": true,
    "language": "en",
    "modules": ["form"],
    "position": null,
    "order": 2
}
```
---

# Field Definitions

### type

Defines what the file represents.

Allowed values:

```txt
page
section
```

Example:

```txt
"type": "page"
```

or

```txt
"type": "section"
```

---

### page

Slug of the page this file belongs to.

Examples:

```txt
"page": "home"
"page": "about"
"page": "contact"
```

For sections, the value **must match the parent page slug**.

Example:

```txt
home.json
home-hero.json
home-features.json
```

All must use:

```txt
"page": "home"
```

---

### name

Human-readable name.

Example:

```txt
"name": "Homepage"
"name": "Hero Section"
"name": "Features Section"
```

---

### data

Free JSON structure where the AI agent can store **any content needed for rendering**.

This should match the design structure required by the frontend components.

Example:

```json
"data": {
  "title": "Turn unused space into revenue",
  "subtitle": "Parking solutions that maximize profit",
  "cta": {
    "label": "Get Started",
    "link": "/contact"
  },
  "image": "/images/placeholder.jpg"
}
```

The `data` field is intentionally flexible.

---

### id

Unique identifier.

Must be a **UUID v4**.

Example:

```txt
"id": "1cab0259-7e2d-450f-88ac-c7e9100fe850"
```

Generate a PHP Script in order to generate the id

---

### section

Defines whether the file is the **main page** or a **section of the page**.

```txt
false = page
true  = section
```

Example page:

```txt
"section": false
```

Example section:

```txt
"section": true
```

---

### language

Language code for the content.

Examples:

```txt
"language": "en"
"language": "el"
"language": "de"
```

Only content matching the requested language will be used.

If not available, the system may fallback to a default language.

Languages are defined only by language property. Use only the official 2 code for each language.

Do not use parameters to load the languages: This is bad /page?lang=en.
Do this instead /en/page . The lang should always be before on route.


---

### modules

Optional list of enabled modules.

Currently supported:

```txt
form
```

Example:

```json
"modules": ["form"]
```

If a module appears in the list, the frontend may render the corresponding component.

---

### position

Currently unused.

Always set:

```txt
"position": null
```

---

### order

Controls rendering order.

Lower numbers appear first.

Example:

```txt
"order": 1
"order": 2
"order": 3
```

For pages:
- controls **navigation order**

For sections:
- controls **render order on the page**

---

# Page Rendering Rules

When a user requests a page:

Example:

```txt
/home
```

The system will:

1. Load all JSON files from `/store`
2. Filter files where:

```txt
page === "home"
language === requested language
```

3. Separate:

```txt
section = false → main page
section = true  → sections
```

4. Sort by:

```txt
order ASC
```

5. Render in this order:

```txt
1. main page
2. sections
```

---

# Navigation Rules

Navigation is built only from files where:

```txt
section === false
```

And:

```txt
language === active language
```

Sorted by:

```txt
order ASC
```

---

# Form Module Rules

If the AI agent decides to add a form module, it must understand how submissions are sent to the Admin API.

## Endpoint pattern

```txt
POST /api/public/{module}/{pageId}/{action}
```

## Form endpoint example

```txt
POST /api/public/form/{pageId}/submissions
```

- `module` = the module name, for now this is `form`
- `pageId` = the id of the page where this module lives
- `action` = the action for the module, for forms this is `submissions`

## Payload example

```json
{
  "name": "Contact Form",
  "entry": {
    "email": "hello@example.com",
    "message": "Hi"
  }
}
```

The `entry` object is flexible.

The AI agent is free to invent any form fields needed by the design, such as:

- `name`
- `email`
- `phone`
- `company`
- `message`
- `budget`
- `subject`

Example:

```json
{
  "name": "Lead Form",
  "entry": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+30 6900000000",
    "message": "I want a demo"
  }
}
```

## Important form rule

If a form module is rendered on a page, submissions must use the **page id** of the page that owns the module.

That means the AI agent should understand that:

- the form belongs to a page
- the page id is required in the API route
- the form payload body goes into `entry`

## Example page with form module

```json
{
  "type": "page",
  "page": "contact",
  "name": "Contact",
  "data": {
    "headline": "Talk to our team"
  },
  "id": "33333333-3333-3333-3333-333333333333",
  "section": false,
  "language": "en",
  "modules": ["form"],
  "position": null,
  "order": 3
}
```

A form rendered for this page should submit to:

```txt
POST /api/public/form/33333333-3333-3333-3333-333333333333/submissions
```

---

# PHP Architecture Directions

PHP is responsible for SSR and backend orchestration.

Keep the PHP side simple and structured.

## PHP responsibilities

- read JSON files from `/store`
- find the requested page
- load related sections
- filter by language
- apply fallback language
- sort by `order`
- build navigation
- prepare the final payload for Vue
- serve the SSR page
- expose public API endpoints such as the form submission endpoint

## Recommended PHP structure

```txt
/backend
  /src
    /Controller
      PageController.php
      PublicModuleController.php
    /Service
      StoreReader.php
      PageResolver.php
      LanguageResolver.php
      NavigationBuilder.php
      PayloadBuilder.php
      ModuleActionResolver.php
    /Support
      Json.php
      Response.php
      Uuid.php
  /templates
    app.php
  /public
    index.php
```

## PHP class directions

### StoreReader
Responsible only for reading and decoding JSON files from `/store`.

### PageResolver
Responsible for:
- filtering files by `page`
- filtering by `language`
- applying fallback language
- separating page and sections
- sorting sections by `order`

### NavigationBuilder
Responsible for building navigation from all main pages where `section === false`.

### PayloadBuilder
Responsible for creating the final normalized payload sent to Vue.

### PageController
Responsible for:
- receiving the request
- calling the resolver services
- returning the SSR response

### PublicModuleController
Responsible for:
- receiving public module requests
- handling routes like `POST /api/public/form/{pageId}/submissions`

## PHP design rules

- keep controllers thin
- keep JSON reading in one place
- do not place page logic inside templates
- do not access `/store` directly from controllers
- keep each class focused on one responsibility
- use small service classes
- validate required JSON fields before using them
- fail gracefully if one section is invalid
- return consistent payloads to Vue

## PHP rendering flow

```txt
HTTP Request
→ PageController
→ PageResolver
→ StoreReader
→ LanguageResolver
→ NavigationBuilder
→ PayloadBuilder
→ SSR template
→ Vue receives payload
```

## Recommended final PHP payload

PHP should send a payload shaped like this:

```json
{
  "page": {
    "type": "page",
    "page": "home",
    "name": "Homepage",
    "data": {
      "headline": "Modern Parking Solutions"
    },
    "id": "11111111-1111-1111-1111-111111111111",
    "section": false,
    "language": "en",
    "modules": [],
    "position": null,
    "order": 1
  },
  "sections": [
    {
      "type": "section",
      "page": "home",
      "name": "Hero Section",
      "data": {
        "title": "Turn unused space into revenue"
      },
      "id": "22222222-2222-2222-2222-222222222222",
      "section": true,
      "language": "en",
      "modules": [],
      "position": null,
      "order": 2
    }
  ],
  "navigation": [
    {
      "name": "Homepage",
      "page": "home",
      "order": 1
    }
  ]
}
```

---

# Vue Architecture Directions

Vue is responsible only for rendering.

Vue should not decide business rules such as:
- which language to use
- which page belongs to which section
- what the navigation should contain

PHP decides that first.

## Vue responsibilities

- receive the payload from PHP
- render the page
- render sections in order
- render modules such as `form`
- keep components decoupled
- keep components reusable
- keep layout and UI clean and modern

## Recommended Vue structure

```txt
/frontend
  /src
    /components
      PageRenderer.vue
      SectionRenderer.vue
      ModuleRenderer.vue
      /modules
        FormModule.vue
      /ui
        BaseButton.vue
        BaseInput.vue
        BaseTextarea.vue
    /types
      page.ts
      section.ts
      module.ts
    /services
      api.ts
```

## Vue component directions

### PageRenderer.vue
Responsible for rendering:
- the main page content
- the list of sections

### SectionRenderer.vue
Responsible for rendering one section from its JSON `data`.

### ModuleRenderer.vue
Responsible for checking the `modules` array and rendering the correct module component.

### FormModule.vue
Responsible for:
- rendering the form UI
- collecting field values
- posting submissions to:
  `POST /api/public/form/{pageId}/submissions`

## Vue design rules

- keep components decoupled
- do not hardcode page text into components
- render from `data`
- keep modules isolated
- keep shared UI in `/ui`
- keep form submission logic inside the form module or a small API service
- use placeholder images where needed
- keep the visual design minimal, modern, and professional
- Use bulma.io Bulma css framework.
- Works excellent both mobile and desktop

## Vue rendering flow

```txt
PHP returns payload
→ Vue mounts
→ PageRenderer renders page
→ PageRenderer loops sections
→ SectionRenderer renders each section
→ ModuleRenderer renders enabled modules
→ FormModule submits to public API if present
```

## Vue form submission example

The form module should submit like this:

```json
{
  "name": "Contact Form",
  "entry": {
    "email": "hello@example.com",
    "message": "Hi"
  }
}
```

To this endpoint:

```txt
POST /api/public/form/{pageId}/submissions
```

Where `pageId` is the page id from the main page payload.

---

# Example Page

## home.json

```json
{
  "type": "page",
  "page": "home",
  "name": "Homepage",
  "data": {
    "headline": "Modern Parking Solutions"
  },
  "id": "11111111-1111-1111-1111-111111111111",
  "section": false,
  "language": "en",
  "modules": [],
  "position": null,
  "order": 1
}
```

---

## home-hero.json

```json
{
  "type": "section",
  "page": "home",
  "name": "Hero Section",
  "data": {
    "title": "Turn unused space into revenue",
    "subtitle": "Parking management that scales",
    "cta": {
      "label": "Start Today",
      "link": "/contact"
    },
    "image": "/images/hero-placeholder.jpg"
  },
  "id": "22222222-2222-2222-2222-222222222222",
  "section": true,
  "language": "en",
  "modules": [],
  "position": null,
  "order": 2
}
```

---

# Responsibilities

The AI agent should:

1. Generate **one JSON file per page**
2. Generate **additional JSON files for sections**
3. Use **consistent page slugs**
4. Generate **UUID v4 ids**
5. Structure the `data` field based on the UI design
6. Respect language codes
7. Assign correct `order` values
8. Add `modules` only when needed
9. If a form module is used, understand the correct submission endpoint pattern

The AI agent **must not generate HTML**.

All content must remain structured JSON.

# Build everything PHP + VUE + Store schema
Do not install any other dependency on front-end / backend.
Do not install any other server component (nginx, apache, php, nodejs etc...) EVERYTHING IS PRECONFIGURED.

CRITICAL: THIS WEBSITE SHOULD BE DRAG N DROP TO WORK ON ANY PUBLIC PLACE THAT SUPPORTS PHP WITHOUT ANY CONFIGURATION.
EXAMPLE: This website should work drag n drop at https://domain.com, https://domain2.com/hello, https://domain4.com/site/web.

## Final expected schema

```txt
/frontend
/backend
index.php (this should load the full app)
AGENTS.MD
```

---

# Build Responsibilities Summary

## Store
Pages and sections JSON files.

## PHP
Reads JSON files, resolves content, builds payloads, handles SSR, and receives public module requests.

## Vue
Renders the page, sections, and modules from the PHP payload.

## Admin API
Receives public module submissions such as form entries.

---

This keeps the system:

- simple
- scalable
- AI-driven
- design-flexible
- clean to build
