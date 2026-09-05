# Rare Disease Planet — Lovable rebuild brief (v1)

**Goal:** Replace the holding site with a live globe + survey. Data lives in the site database (Lovable Cloud). Launch pressure: Duchenne Day, Mon 7 Sep 2026 (soft), Rare Disease Day 28 Feb 2027 (main).

## Home screen
- Full-viewport **globe** (empty at first).
- Primary CTA: **Start survey**.
- As people complete the survey, **pins appear** for each public globe entry.
- Secondary: browse/join **open groups** (name + member count).

## What is always on the globe (per pin)
Make this **obvious in the survey** before submit (callout / checklist):

| Field | Required | On globe |
|---|---|---|
| Country | Yes | Always visible |
| Rare disease | Yes | Always visible |
| Variant (e.g. exon / CAG / gene variant) | Optional | Always visible when provided |

Pin popup / label shows at least: country · rare disease · variant (if any).  
No legal name on the globe by default.

## Privacy defaults (person)
- **Private by default:** name, email, town/city, role, free-text answers, feature wishlist, contact prefs, etc.
- **Can opt public (toggle, changeable anytime):** Town/City (and later other non-sensitive fields if needed).
- Email is **never** public.
- Name is **not** on the globe unless we later add an explicit “show display name” toggle (out of scope for v1 unless requested).

## Groups
### Types (toggle; extensible)
1. **Public group** — discoverable; others can request/join per join policy.
2. **Private family** — invite-link only; not listed in public group directory.
3. *(Later)* e.g. Affiliate / clinic, Research cohort — keep enum open.

### Always public for joinable / listed groups
- Group name  
- Number of members so far  

### Join
- Public groups: appear in directory; join via button (open join) or request (optional later).
- Private family: join only via invite link / QR (`?g=CODE`).
- After survey: show invite link + QR; “Add someone to my group” (child, sibling, etc.).

### Visibility of members inside a group
- Group admins/creators can manage membership.
- Member globe fields still follow the always-visible rules above.
- Extra member fields stay private unless the person opts them public.

## Survey flow
1. Land from home **Start survey** or invite `?g=`.
2. Callout: “On the globe we always show **country**, **rare disease**, and **variant** (if you add one). Everything else stays private unless you turn it on.”
3. Collect: name, email, role, country*, rare disease*, variant, town/city + “show town/city on globe” toggle, feature wishlist, consent, group type (create Public group / Private family) or join existing.
4. Submit → create/update person + group in DB → redirect to thank-you with invite link/QR + add-member form.
5. Globe refreshes with new pin (country centroid or coarse location; never street address).

## Data model (logical)

### `profiles` (survey respondents)
- id, created_at  
- display_name (private)  
- email (private, unique)  
- role  
- country (globe)  
- rare_disease (globe)  
- variant (globe, nullable)  
- town_city (private unless `town_city_public`)  
- town_city_public boolean default false  
- features jsonb / text  
- feature_other  
- consent_at  
- wants_updates  
- group_id  
- invite_source  

### `groups`
- id, created_at  
- name  
- type enum: `public_group` | `private_family` | …  
- invite_code unique  
- is_joinable / listed derived from type (public_group → listed; private_family → invite only)  
- created_by profile_id  
- member_count (maintained or counted)

### `group_members`
- group_id, profile_id, relationship, joined_at, role_in_group (`creator`|`member`)

## Technical notes for Lovable
- Use Lovable Cloud DB + RLS: public read of globe projection view only (country, rare_disease, variant, optional town if flagged, group name/count for public groups).  
- Authenticated or service role for inserts from survey (prefer secure edge function / RLS policies allowing insert with validation).  
- Globe: lightweight WebGL/three or MapLibre + country centroids; must run on mid-range Android.  
- Custom domain: RareDiseasePlanet.com when ready.

## Out of scope for this slice
- Full grant matrix from earlier ownership doc (affiliates, field-level grants) — keep compatible, don’t build all of it yet.  
- Auto-translation of pins.  
- Messaging.
