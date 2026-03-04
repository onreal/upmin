# Upmin

Upmin is a stateless admin that edits JSON content files for any static site. It has no database and no runtime dependencies for the content itself — your site reads JSON, and Upmin just manages those files.

## Why Use It
Upmin is for teams who want:
- Zero database setup and zero migrations.
- Content stored as plain JSON in Git.
- A clean admin UI to edit JSON safely.
- A portable admin you can drop into any static site.

## How It Works
- Public content lives in `store/` (outside `manage/`).
- Private content and settings live in `manage/store/`.
- Every content file uses a wrapper schema with `page`, `name`, `order`, `section`, and `data`.
- The admin UI reads the JSON, renders a form, and writes the JSON back.

## Quick Example: Dynamic Content With Zero Dependencies
Create a JSON file in your site `store/` folder:

`store/home.json`
```json
{
  "page": "home",
  "name": "Homepage",
  "order": 1,
  "section": false,
  "data": {
    "hero": {
      "title": "Welcome",
      "subtitle": "Edit me via Upmin"
    }
  }
}
```

Your static site can now read `store/home.json` and render the hero.

Open Upmin, click “Homepage”, edit the JSON, and save — that’s it. No database, no CMS setup, no dependencies beyond JSON files.

## Run Locally
From the repo root:
```bash
cp manage/.env.example manage/.env
docker compose up
```

Open `http://localhost:8383`.
