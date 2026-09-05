# Rare Disease Planet

A living globe of rare disease families. The home screen is a full-viewport planet that starts empty. Each completed survey places a pin. **Rare Disease Planet** is the product name everywhere in the UI.

Launch context: Duchenne Day (7 Sep 2026, soft) and Rare Disease Day (28 Feb 2027).

## What the globe always shows

Every pin shows:

- **Country** (always)
- **Rare disease** (always)
- **Variant** (always, when the person added one)

The survey states this before submit, with a callout, a live pin preview, and a final review step.

Town / city is **off** the globe unless the person turns on **Show town / city on the globe**. Email is **never** public. Display name, role, feature picks, and free text stay private.

Pins sit on a country centroid with a small deterministic offset — never a street address.

## Run it

Needs Node 20+ (SQLite via `better-sqlite3`, stored locally in `data/planet.sqlite`).

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The globe is empty until someone submits the survey. After submit, a pin appears.

```bash
npm run build
npm start
```

## What you can do

- **Start survey** from the home CTA
- Privacy-first wizard: consent → globe fields → private fields (pick up to 3 features) → create/join group → review what the planet will show
- **Public group** (listed with name + member count) or **Private family** (invite-link only)
- Invite link and QR: `/?g=CODE`
- After submit, add family members; each person gets their own pin
- Language switcher; browser language is detected on first visit

## Localization

Locale files live in `src/locales/`.

| Code | Coverage |
|---|---|
| `en` | Full |
| `ja` | Full |
| `es` `fr` `pt` `de` `ar` `hi` `zh` | All UI keys |

Arabic uses RTL. Country names come from `Intl.DisplayNames` in the active locale.

## Public API (globe-safe only)

The HTTP API never returns email, display name, role, features, or other private fields.

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/globe` | Pins: country, rare disease, variant, optional town if public, lat/lng |
| `GET` | `/api/groups` | Listed **public** groups: name, member count, invite code |
| `GET` | `/api/invite/:code` | Group name, type, member count (works for private families if you have the code) |
| `POST` | `/api/survey` | Submit the survey (email unique; resubmit updates the same person) |
| `POST` | `/api/family` | Add a family member (needs the `familyToken` from survey submit) |
| `GET` | `/api/health` | `{ ok, name: "Rare Disease Planet" }` |

## Data

Local SQLite file: `data/planet.sqlite` (created on first run, gitignored).

- `profiles` — respondents. Email unique when present; family members may omit email.
- `groups` — `public_group` or `private_family`, unique `invite_code`
- `group_members` — membership + relationship

## Stack

React 18 + Vite, Express (Vite middleware in `npm run dev`), a Three.js globe, i18next, `better-sqlite3`.

Warm purple UI, thumb-friendly controls, and a standalone web-app manifest for Android. Desktop uses a side sheet so the planet stays in view while you fill the survey.

## Privacy recap

- Private by default
- Globe: country · rare disease · variant
- Town/city only with an explicit toggle
- Email never public
- Public groups: name + member count always visible
- Private families: join only via `?g=CODE` or QR
