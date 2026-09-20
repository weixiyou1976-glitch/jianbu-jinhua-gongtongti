// Content-only module: never import db.js or load environment credentials here.
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const FIELDS = ['week_number', 'display_order', 'title', 'skill_name', 'category',
  'trigger_condition', 'key_question', 'step_one', 'step_two', 'step_three',
  'memory_anchor', 'insight', 'case_study', 'cognitive_reframe', 'growth_friction',
  'growth_friction_ending', 'tags', 'status', 'insight_audio_url'];
const OPTIONAL_TEXT = new Set(['key_question', 'growth_friction_ending', 'insight_audio_url']);
const DEFAULT_DIR = path.join(__dirname, '../data/skills');
const readJSON = (file) => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file)));

function loadLibrary(directory = DEFAULT_DIR, {strict = true} = {}) {
  const manifest = readJSON(path.join(directory, 'manifest.json'));
  if (manifest.schema_version !== 1 || !Array.isArray(manifest.files) || !manifest.files.length ||
      new Set(manifest.files).size !== manifest.files.length ||
      !manifest.files.every((name) => /^skills-\d{3,}-\d{3,}\.json$/.test(name))) {
    throw new Error('Invalid Skill manifest/files');
  }
  const actual = fs.readdirSync(directory).filter((name) => /^skills-.*\.json$/.test(name)).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...manifest.files].sort())) throw new Error('Manifest does not list every Skill JSON file');
  const skills = manifest.files.flatMap((name) => {
    const rows = readJSON(path.join(directory, name));
    if (!Array.isArray(rows)) throw new Error(`${name}: expected array`);
    const [, first, last] = name.match(/^skills-(\d+)-(\d+)\.json$/);
    if (!rows.every((row) => row && row.week_number >= Number(first) && row.week_number <= Number(last))) {
      throw new Error(`${name}: week outside file range`);
    }
    return rows;
  });
  const result = validateLibrary(skills, manifest);
  if (strict && result.errors.length) throw new Error(`Invalid Skill library: ${JSON.stringify(result.errors)}`);
  return { skills, manifest, validation: result };
}

function validateLibrary(skills, manifest) {
  const errors = [], warnings = [], weeks = new Map(), names = new Map(), orders = [], categories = {};
  const tagCounts = [], emptyFields = {};
  if (!Array.isArray(skills)) return { errors: ['Skill content must be an array'], warnings };
  if (![manifest.expected_count, manifest.first_week, manifest.last_week, manifest.main_track_count].every(Number.isInteger) ||
      manifest.first_week !== 1 || manifest.expected_count !== manifest.last_week || manifest.main_track_count !== 52) errors.push('Invalid expected counts/range');
  if (skills.length !== manifest.expected_count) errors.push(`count ${skills.length} != ${manifest.expected_count}`);
  for (const s of skills) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) { errors.push('Invalid Skill object'); continue; }
    const w = s.week_number;
    for (const k of FIELDS) if (!Object.hasOwn(s, k)) errors.push(`${w}: missing ${k}`);
    for (const k of Object.keys(s)) if (!FIELDS.includes(k)) errors.push(`${w}: unexpected field ${k}`);
    if (!Number.isInteger(w) || w < manifest.first_week || w > manifest.last_week) errors.push(`Invalid week_number ${w}`);
    weeks.set(w, (weeks.get(w) || 0) + 1);
    names.set(s.skill_name, [...(names.get(s.skill_name) || []), w]);
    if (s.display_order !== null) orders.push(s.display_order);
    for (const k of FIELDS.filter((k) => !['week_number','display_order','tags'].includes(k))) {
      if (typeof s[k] !== 'string') errors.push(`${w}: ${k} must be string`);
      else if (!s[k].trim()) {
        (emptyFields[k] ||= []).push(w);
        if (!OPTIONAL_TEXT.has(k)) errors.push(`${w}: empty required field ${k}`);
      }
    }
    if (!['published','draft'].includes(s.status)) errors.push(`${w}: invalid status`);
    if (!Array.isArray(s.tags) || !s.tags.every((t) => typeof t === 'string' && t.trim())) errors.push(`${w}: tags must be nonempty strings in an array`);
    else {
      tagCounts.push({ week_number: w, count: s.tags.length });
      if (new Set(s.tags).size !== s.tags.length) errors.push(`${w}: duplicate tag`);
    }
    categories[s.category] = (categories[s.category] || 0) + 1;
    if (typeof s.insight_audio_url === 'string' && s.insight_audio_url) {
      try {
        const raw = s.insight_audio_url;
        const url = new URL(raw, 'https://local.invalid');
        if (/\s/.test(raw) || raw.startsWith('//') || !(/^(https?:\/\/|\/[^/])/.test(raw)) ||
            !['https:', 'http:'].includes(url.protocol) || url.username || url.password || !/\.mp3$/i.test(url.pathname)) throw new Error();
      } catch { errors.push(`${w}: invalid insight_audio_url`); }
    }
  }
  const missingWeeks = [];
  for (let w = 1; w <= manifest.last_week; w++) if (!weeks.has(w)) missingWeeks.push(w);
  if (missingWeeks.length) errors.push({ missingWeeks });
  const duplicateWeeks = [...weeks].filter(([,n]) => n > 1).map(([week_number,count]) => ({week_number,count}));
  if (duplicateWeeks.length) errors.push({ duplicateWeeks });
  const duplicateNames = [...names].filter(([,ws]) => ws.length > 1).map(([skill_name,week_numbers]) => ({skill_name,week_numbers}));
  if (duplicateNames.length) warnings.push({ duplicateNames });
  if (orders.length !== 52 || !orders.every(Number.isInteger) || JSON.stringify([...orders].sort((a,b) => a-b)) !== JSON.stringify(Array.from({length:52},(_,i)=>i+1))) errors.push('display_order must contain exactly 52 unique integers 1–52');
  const noTags = tagCounts.filter((r) => !r.count).map((r) => r.week_number);
  if (noTags.length) warnings.push({ noTags });
  for (const [field,week_numbers] of Object.entries(emptyFields)) if (OPTIONAL_TEXT.has(field)) warnings.push({ emptyOptionalField:field,week_numbers });
  return { count:skills.length, minWeek:Math.min(...weeks.keys()), maxWeek:Math.max(...weeks.keys()),
    weekNumbersContinuous:!missingWeeks.length && !duplicateWeeks.length && weeks.size===manifest.expected_count,
    errors,warnings,missingWeeks,duplicateWeeks,duplicateNames,
    missingFields:errors.filter(e=>typeof e==='string' && /missing |empty required field/.test(e)),
    tagAnomalies:errors.filter(e=>typeof e==='string' && /tags must|duplicate tag/.test(e)),
    audioUrlAnomalies:errors.filter(e=>typeof e==='string' && /insight_audio_url/.test(e)),
    mainTrackCount:orders.length,mainTrackComplete:!errors.includes('display_order must contain exactly 52 unique integers 1–52'),
    categories,tagCounts,emptyFields };
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.skills) || !snapshot.metadata) throw new Error('Expected read-only export with metadata and skills');
  const issues = [], rows = [], ids = new Set();
  for (const s of snapshot.skills) {
    for (const k of FIELDS) if (!Object.hasOwn(s,k)) throw new Error(`snapshot week ${s.week_number}: missing ${k}`);
    const tags = typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags;
    if (!Array.isArray(tags) || !tags.every((t)=>typeof t==='string')) throw new Error(`snapshot week ${s.week_number}: invalid tags`);
    if (!Number.isInteger(s.week_number)) throw new Error('Snapshot invalid week_number');
    if (!Array.isArray(s.skill_tags)) throw new Error(`snapshot week ${s.week_number}: missing independent skill_tags`);
    if (s.id == null || ids.has(s.id)) throw new Error('Snapshot missing or duplicate database ID');
    ids.add(s.id);
    if (s.skill_tags.some((t)=>t.skill_id!==s.id || typeof t.tag!=='string') ||
        JSON.stringify(s.skill_tags.map((t)=>t.tag).sort()) !== JSON.stringify([...tags].sort())) issues.push({week_number:s.week_number,problem:'skill_tags differs from skills.tags'});
    rows.push(Object.fromEntries(FIELDS.map((k)=>[k,k==='tags'?tags:s[k]])));
  }
  if (!Array.isArray(snapshot.orphan_skill_tags)) throw new Error('Snapshot missing orphan_skill_tags check');
  if (snapshot.orphan_skill_tags.length) issues.push({problem:'orphan_skill_tags',count:snapshot.orphan_skill_tags.length});
  if (snapshot.metadata.actual_count !== rows.length) throw new Error('Snapshot metadata count mismatch');
  const tagCount=snapshot.skills.reduce((n,s)=>n+s.skill_tags.length,0)+snapshot.orphan_skill_tags.length;
  if (snapshot.metadata.skill_tags_row_count !== tagCount) throw new Error('Snapshot tag count mismatch');
  return {rows,issues};
}

function compareSnapshot(skills, snapshot) {
  const {rows,issues}=normalizeSnapshot(snapshot);
  const byWeek=new Map();
  for(const row of rows) {
    if(byWeek.has(row.week_number)) throw new Error(`Snapshot duplicate week ${row.week_number}`);
    byWeek.set(row.week_number,row);
  }
  const missingInProduction=[],missingInRepository=[],differences=[];
  const repoWeeks=new Set(skills.map(s=>s.week_number));
  for(const s of skills) {
    const p=byWeek.get(s.week_number);
    if(!p) {missingInProduction.push(s.week_number);continue;}
    for(const field of FIELDS) if(JSON.stringify(s[field])!==JSON.stringify(p[field])) differences.push({week_number:s.week_number,field,repository:s[field],production:p[field]});
  }
  for(const p of rows) if(!repoWeeks.has(p.week_number)) missingInRepository.push(p.week_number);
  return {productionCount:rows.length,repositoryCount:skills.length,source:snapshot.metadata,
    differenceCount:differences.length+missingInProduction.length+missingInRepository.length+issues.length,
    missingInProduction,missingInRepository,differences,tagIssues:issues};
}
module.exports={FIELDS,DEFAULT_DIR,readJSON,loadLibrary,validateLibrary,normalizeSnapshot,compareSnapshot};
