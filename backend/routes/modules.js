const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function withParsedTags(row) {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

function buildStages(moduleId, req) {
  const items = db
    .prepare(
      `SELECT mi.stage_order, mi.stage_name, mi.item_order, s.*
       FROM module_items mi
       JOIN skills s ON s.id = mi.skill_id
       WHERE mi.module_id = ?
       ORDER BY mi.stage_order ASC, mi.item_order ASC`
    )
    .all(moduleId);

  const stampedIds = new Set(
    db.prepare('SELECT skill_id FROM stamps WHERE user_id = ?').all(req.user.id).map((r) => r.skill_id)
  );

  const stages = [];
  const byOrder = new Map();
  for (const row of items) {
    if (!byOrder.has(row.stage_order)) {
      const stage = { stage_order: row.stage_order, stage_name: row.stage_name, items: [] };
      byOrder.set(row.stage_order, stage);
      stages.push(stage);
    }
    const stage = byOrder.get(row.stage_order);
    if (row.status === 'draft') {
      stage.items.push({
        id: row.id,
        week_number: row.week_number,
        skill_name: row.skill_name,
        category: row.category,
        draft: true,
      });
    } else {
      stage.items.push({
        ...withParsedTags(row),
        stamped: stampedIds.has(row.id),
        unlocked: true,
      });
    }
  }
  return stages;
}

router.get('/modules', requireAuth, (req, res) => {
  const modules = db.prepare('SELECT * FROM modules ORDER BY created_at ASC').all();
  const withCounts = modules.map((m) => {
    const counts = db
      .prepare(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN s.status = 'draft' THEN 1 ELSE 0 END) AS draft_count
         FROM module_items mi JOIN skills s ON s.id = mi.skill_id WHERE mi.module_id = ?`
      )
      .get(m.id);
    return { ...m, item_count: counts.total || 0, draft_count: counts.draft_count || 0 };
  });
  res.json(withCounts);
});

router.get('/modules/:slug', requireAuth, (req, res) => {
  const module_ = db.prepare('SELECT * FROM modules WHERE slug = ?').get(req.params.slug);
  if (!module_) return res.status(404).json({ error: '模块不存在' });
  res.json({ ...module_, stages: buildStages(module_.id, req) });
});

module.exports = router;
