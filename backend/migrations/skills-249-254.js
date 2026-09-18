const skills = require('../seed');

// 沿用 db.js 启动迁移：只补齐这一批周次，不覆盖任何已有 Skill 或标签。
module.exports = function migrateSkills249To254(db) {
  const migrate = db.transaction(() => {
    // 空库仍由 seed.js 完整初始化，不能先插入六张而阻断原有 seed。
    if (!db.prepare('SELECT 1 FROM skills LIMIT 1').get()) return 0;

    const exists = db.prepare('SELECT 1 FROM skills WHERE week_number = ? LIMIT 1');
    const insertSkill = db.prepare(`
      INSERT INTO skills (week_number, title, skill_name, category, trigger_condition, key_question,
        step_one, step_two, step_three, memory_anchor, insight, case_study, cognitive_reframe,
        growth_friction, growth_friction_ending, tags, status, insight_audio_url)
      VALUES (@week_number, @title, @skill_name, @category, @trigger_condition, @key_question,
        @step_one, @step_two, @step_three, @memory_anchor, @insight, @case_study, @cognitive_reframe,
        @growth_friction, @growth_friction_ending, @tags, @status, @insight_audio_url)
    `);
    const insertTag = db.prepare('INSERT INTO skill_tags (skill_id, tag) VALUES (?, ?)');
    let inserted = 0;
    for (const skill of skills.filter((s) => s.week_number >= 249 && s.week_number <= 254)) {
      if (exists.get(skill.week_number)) continue;
      const tags = skill.tags || [];
      const info = insertSkill.run({
        key_question: '',
        insight_audio_url: '',
        growth_friction_ending: '',
        ...skill,
        tags: JSON.stringify(tags),
        status: skill.status || 'published',
      });
      for (const tag of tags) insertTag.run(info.lastInsertRowid, tag);
      inserted += 1;
    }
    return inserted;
  });

  // 先取得写锁，再检查周次，防止并发启动时重复插入；任一步失败整体回滚。
  const inserted = migrate.immediate();
  if (inserted > 0) console.log(`Skill 249—254 增量迁移：新增 ${inserted} 张`);
  return inserted;
};
