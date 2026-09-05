import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { COUNTRIES, centroidFor } from './countries.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const dbPath = path.join(dataDir, 'planet.sqlite');

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GROUP_TYPES = new Set(['public_group', 'private_family']);
const ROLES = new Set([
  'living_with',
  'parent',
  'sibling',
  'family',
  'caregiver',
  'clinician',
  'advocate',
  'friend',
]);
const RELATIONSHIPS = new Set([
  'child',
  'parent',
  'sibling',
  'partner',
  'grandparent',
  'other',
]);
const FEATURES = new Set([
  'same_condition',
  'family_support',
  'research_news',
  'caregiver',
  'specialists',
  'advocacy',
  'awareness',
  'mental_health',
  'school',
  'travel_care',
  'translation',
  'events',
]);
const DISEASE_KEYS = new Set([
  'dmd',
  'bmd',
  'sma',
  'hd',
  'cf',
  'als',
  'rett',
  'fragile_x',
  'pompe',
  'gaucher',
  'fabry',
  'pku',
  'hemophilia',
  'marfan',
  'eds',
  'oi',
  'pws',
  'angelman',
  'tsc',
  'nf1',
  'rp',
  'friedreich',
  'myotonic',
  'lgmd',
  'cmt',
  'eb',
  'sickle_cell',
  'thalassemia',
  'other',
]);

let db;

function clip(value, max) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function bool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function inviteCode() {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  return out;
}

function uniqueInvite() {
  for (let i = 0; i < 12; i++) {
    const code = inviteCode();
    const exists = db.prepare('SELECT 1 FROM groups WHERE invite_code = ?').get(code);
    if (!exists) return code;
  }
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

function jitter(id, lat, lng) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  const dLat = ((h % 200) / 200 - 0.5) * 3.2;
  const dLng = ((((h / 200) | 0) % 200) / 200 - 0.5) * 3.2;
  return {
    lat: Math.max(-85, Math.min(85, lat + dLat)),
    lng: lng + dLng,
  };
}

function parseFeatures(input) {
  const list = Array.isArray(input) ? input : [];
  const uniq = [];
  for (const f of list) {
    if (FEATURES.has(f) && !uniq.includes(f)) uniq.push(f);
    if (uniq.length >= 3) break;
  }
  return uniq;
}

export function initDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      display_name TEXT,
      email TEXT UNIQUE,
      role TEXT,
      country TEXT NOT NULL,
      country_code TEXT NOT NULL,
      rare_disease TEXT NOT NULL,
      rare_disease_key TEXT,
      variant TEXT,
      town_city TEXT,
      town_city_public INTEGER NOT NULL DEFAULT 0,
      features TEXT,
      feature_other TEXT,
      consent_at TEXT,
      wants_updates INTEGER NOT NULL DEFAULT 0,
      group_id TEXT,
      invite_source TEXT,
      family_token TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      relationship TEXT,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      role_in_group TEXT NOT NULL,
      PRIMARY KEY (group_id, profile_id),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (profile_id) REFERENCES profiles(id)
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_group ON profiles(group_id);
    CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
  `);
  return db;
}

function memberCount(groupId) {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?')
    .get(groupId);
  return row?.n ?? 0;
}

function publicPin(row) {
  return {
    id: row.id,
    country: row.country,
    countryCode: row.country_code,
    rareDisease: row.rare_disease,
    rareDiseaseKey: row.rare_disease_key,
    variant: row.variant || null,
    townCity: row.town_city_public ? row.town_city : null,
    lat: row.lat,
    lng: row.lng,
  };
}

export function getGlobePins() {
  const rows = db
    .prepare(
      `SELECT id, country, country_code, rare_disease, rare_disease_key,
              variant, town_city, town_city_public, lat, lng
       FROM profiles
       ORDER BY created_at ASC`,
    )
    .all();
  return rows.map(publicPin);
}

export function getPublicGroups() {
  return db
    .prepare(
      `SELECT g.name, g.invite_code AS inviteCode, g.type,
              (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id) AS memberCount
       FROM groups g
       WHERE g.type = 'public_group'
       ORDER BY memberCount DESC, g.created_at DESC`,
    )
    .all();
}

export function getInvite(code) {
  const c = clip(code, 16)?.toUpperCase();
  if (!c) return null;
  const g = db
    .prepare('SELECT id, name, type, invite_code FROM groups WHERE invite_code = ?')
    .get(c);
  if (!g) return null;
  return {
    name: g.name,
    type: g.type,
    inviteCode: g.invite_code,
    memberCount: memberCount(g.id),
    listed: g.type === 'public_group',
  };
}

function resolveDisease(body) {
  const key = clip(body.rareDiseaseKey, 40);
  const custom = clip(body.rareDiseaseCustom || body.rareDisease, 120);
  if (key && DISEASE_KEYS.has(key) && key !== 'other') {
    return { key, label: key };
  }
  if (custom) return { key: 'other', label: custom };
  return null;
}

function attachToGroup(profileId, groupId, roleInGroup, relationship) {
  db.prepare(
    `INSERT INTO group_members (group_id, profile_id, relationship, role_in_group)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(group_id, profile_id) DO UPDATE SET
       relationship = COALESCE(excluded.relationship, group_members.relationship)`,
  ).run(groupId, profileId, relationship || null, roleInGroup);
  db.prepare('UPDATE profiles SET group_id = ? WHERE id = ?').run(groupId, profileId);
}

function createGroup({ name, type, createdBy }) {
  const id = crypto.randomUUID();
  const code = uniqueInvite();
  db.prepare(
    `INSERT INTO groups (id, name, type, invite_code, created_by)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, name, type, code, createdBy || null);
  return { id, name, type, invite_code: code };
}

function findGroupByCode(code) {
  const c = clip(code, 16)?.toUpperCase();
  if (!c) return null;
  return db.prepare('SELECT * FROM groups WHERE invite_code = ?').get(c);
}

function placeOnGlobe(id, countryCode) {
  const c = centroidFor(countryCode);
  if (!c) return null;
  return jitter(id, c.lat, c.lng);
}

export function submitSurvey(body) {
  if (!bool(body.consent)) {
    return { error: 'consent_required', status: 400 };
  }
  const email = clip(body.email, 160)?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'email_invalid', status: 400 };
  }
  const countryCode = clip(body.countryCode, 4)?.toUpperCase();
  const country = clip(body.country, 80);
  if (!countryCode || !centroidFor(countryCode) || !country) {
    return { error: 'country_required', status: 400 };
  }
  const disease = resolveDisease(body);
  if (!disease) return { error: 'disease_required', status: 400 };

  const role = ROLES.has(body.role) ? body.role : null;
  const variant = clip(body.variant, 120);
  const townCity = clip(body.townCity, 80);
  const townCityPublic = bool(body.townCityPublic) ? 1 : 0;
  const displayName = clip(body.displayName, 80);
  const features = parseFeatures(body.features);
  const featureOther = clip(body.featureOther, 160);
  const wantsUpdates = bool(body.wantsUpdates) ? 1 : 0;
  const groupAction = clip(body.groupAction, 20) || 'none';

  const existing = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
  const id = existing?.id || crypto.randomUUID();
  const familyToken = existing?.family_token || crypto.randomBytes(18).toString('hex');
  const pos = placeOnGlobe(id, countryCode);
  if (!pos) return { error: 'country_required', status: 400 };

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare(
        `UPDATE profiles SET
           display_name = ?, role = ?, country = ?, country_code = ?,
           rare_disease = ?, rare_disease_key = ?, variant = ?,
           town_city = ?, town_city_public = ?, features = ?, feature_other = ?,
           consent_at = COALESCE(consent_at, datetime('now')),
           wants_updates = ?, family_token = ?, lat = ?, lng = ?
         WHERE id = ?`,
      ).run(
        displayName,
        role,
        country,
        countryCode,
        disease.label,
        disease.key,
        variant,
        townCity,
        townCityPublic,
        JSON.stringify(features),
        featureOther,
        wantsUpdates,
        familyToken,
        pos.lat,
        pos.lng,
        id,
      );
    } else {
      db.prepare(
        `INSERT INTO profiles (
           id, display_name, email, role, country, country_code,
           rare_disease, rare_disease_key, variant, town_city, town_city_public,
           features, feature_other, consent_at, wants_updates, invite_source,
           family_token, lat, lng
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)`,
      ).run(
        id,
        displayName,
        email,
        role,
        country,
        countryCode,
        disease.label,
        disease.key,
        variant,
        townCity,
        townCityPublic,
        JSON.stringify(features),
        featureOther,
        wantsUpdates,
        clip(body.inviteCode, 16),
        familyToken,
        pos.lat,
        pos.lng,
      );
    }

    let group = null;
    if (groupAction === 'join') {
      group = findGroupByCode(body.inviteCode);
      if (!group && groupAction === 'join') {
        const err = new Error('invite_invalid');
        err.status = 400;
        throw err;
      }
      if (group) {
        const isCreator =
          existing &&
          db
            .prepare(
              `SELECT 1 FROM group_members WHERE group_id = ? AND profile_id = ? AND role_in_group = 'creator'`,
            )
            .get(group.id, id);
        attachToGroup(id, group.id, isCreator ? 'creator' : 'member', clip(body.relationship, 40));
      }
    } else if (groupAction === 'create') {
      const gType = GROUP_TYPES.has(body.groupType) ? body.groupType : null;
      const gName = clip(body.groupName, 80);
      if (!gType || !gName) {
        const err = new Error('group_required');
        err.status = 400;
        throw err;
      }
      group = createGroup({ name: gName, type: gType, createdBy: id });
      db.prepare('UPDATE groups SET created_by = ? WHERE id = ?').run(id, group.id);
      attachToGroup(id, group.id, 'creator', 'self');
    }

    const profile = db.prepare('SELECT group_id FROM profiles WHERE id = ?').get(id);
    if (profile?.group_id && !group) {
      group = db.prepare('SELECT * FROM groups WHERE id = ?').get(profile.group_id);
    }
    return group;
  });

  let group;
  try {
    group = tx();
  } catch (e) {
    if (e.message === 'invite_invalid' || e.message === 'group_required') {
      return { error: e.message, status: 400 };
    }
    throw e;
  }

  return {
    ok: true,
    familyToken,
    pin: publicPin({
      id,
      country,
      country_code: countryCode,
      rare_disease: disease.label,
      rare_disease_key: disease.key,
      variant,
      town_city: townCity,
      town_city_public: townCityPublic,
      lat: pos.lat,
      lng: pos.lng,
    }),
    group: group
      ? {
          name: group.name,
          type: group.type,
          inviteCode: group.invite_code,
          memberCount: memberCount(group.id),
        }
      : null,
  };
}

export function addFamilyMember(body) {
  const token = clip(body.familyToken, 80);
  if (!token) return { error: 'unauthorized', status: 401 };
  const creator = db.prepare('SELECT * FROM profiles WHERE family_token = ?').get(token);
  if (!creator) return { error: 'unauthorized', status: 401 };
  if (!creator.group_id) return { error: 'no_group', status: 400 };
  if (!bool(body.consent)) return { error: 'consent_required', status: 400 };

  const countryCode = clip(body.countryCode, 4)?.toUpperCase();
  const country = clip(body.country, 80);
  if (!countryCode || !centroidFor(countryCode) || !country) {
    return { error: 'country_required', status: 400 };
  }
  const disease = resolveDisease(body);
  if (!disease) return { error: 'disease_required', status: 400 };

  const emailRaw = clip(body.email, 160)?.toLowerCase();
  if (emailRaw && !EMAIL_RE.test(emailRaw)) return { error: 'email_invalid', status: 400 };
  if (emailRaw) {
    const taken = db.prepare('SELECT id FROM profiles WHERE email = ?').get(emailRaw);
    if (taken) return { error: 'email_taken', status: 409 };
  }

  const id = crypto.randomUUID();
  const pos = placeOnGlobe(id, countryCode);
  const relationship = RELATIONSHIPS.has(body.relationship) ? body.relationship : 'other';
  const role = ROLES.has(body.role) ? body.role : 'family';
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(creator.group_id);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO profiles (
         id, display_name, email, role, country, country_code,
         rare_disease, rare_disease_key, variant, town_city, town_city_public,
         features, consent_at, group_id, invite_source, lat, lng
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)`,
    ).run(
      id,
      clip(body.displayName, 80),
      emailRaw || null,
      role,
      country,
      countryCode,
      disease.label,
      disease.key,
      clip(body.variant, 120),
      clip(body.townCity, 80),
      bool(body.townCityPublic) ? 1 : 0,
      JSON.stringify([]),
      creator.group_id,
      group.invite_code,
      pos.lat,
      pos.lng,
    );
    attachToGroup(id, creator.group_id, 'member', relationship);
  });
  tx();

  return {
    ok: true,
    pin: publicPin({
      id,
      country,
      country_code: countryCode,
      rare_disease: disease.label,
      rare_disease_key: disease.key,
      variant: clip(body.variant, 120),
      town_city: clip(body.townCity, 80),
      town_city_public: bool(body.townCityPublic) ? 1 : 0,
      lat: pos.lat,
      lng: pos.lng,
    }),
    group: {
      name: group.name,
      type: group.type,
      inviteCode: group.invite_code,
      memberCount: memberCount(group.id),
    },
  };
}

export function catalog() {
  return {
    countries: COUNTRIES_PUBLIC(),
    diseaseKeys: [...DISEASE_KEYS],
    featureKeys: [...FEATURES],
    roleKeys: [...ROLES],
    relationshipKeys: [...RELATIONSHIPS],
    groupTypes: [...GROUP_TYPES],
  };
}

function COUNTRIES_PUBLIC() {
  return COUNTRIES.map(({ code, lat, lng }) => ({ code, lat, lng }));
}
