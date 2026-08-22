require('dotenv').config();
const db = require('./db');

const skills = [
  {
    week_number: 1,
    title: '第1周 · 把模糊的烦躁翻译成具体的问题',
    skill_name: '烦躁翻译法',
    category: '认知类',
    trigger_condition: '当你说不清自己为什么心烦、只觉得"很乱""很累"，却指不出具体原因时',
    step_one: '停：不要继续做手头的事，停下来30秒',
    step_two: '问：问自己一个问题："我现在烦的，到底是哪一件具体的事？"不允许回答"很多事"，必须指出一件',
    step_three: '命名：给这件事起一个名字，写下来或说出来。"我烦的是____"',
    memory_anchor: '说不清的烦躁，都是还没被命名的恐惧',
    insight: '大多数人的烦躁，不是因为事情太多，而是因为大脑同时运行了太多"未关闭的窗口"——每一件没有被明确命名的担忧，都在后台消耗你的认知资源。\n\n心理学把这个现象叫做"蔡格尼克效应"：未完成的事情会持续占据大脑带宽，直到你给它一个明确的状态为止。烦躁，本质上是大脑在告诉你：有一件事还没有被你正视。',
    case_study: '一位学员，某天下午突然感到莫名烦躁，什么都不想做，刷手机也没意思。\n\n她用烦躁翻译法停下来问自己："我烦的到底是哪一件事？"\n\n沉默了十秒后，她说出来了："是下周要跟客户谈续费，我不确定他会不会续。"\n\n就这一句话，烦躁立刻减少了一半。因为大脑从"弥漫性焦虑"切换到了"具体问题模式"——而具体问题，是可以被处理的。',
    cognitive_reframe: '烦躁不是你的敌人，它是一个信号。它在说：有一件事需要你正视，但你一直在回避给它命名。\n\n命名不是解决问题，但命名是解决问题的第一步。一件被命名的担忧，会从"背景噪音"变成"可处理的任务"。\n\n真正消耗人的，从来不是那件事本身，而是那件事悬在那里、你既没有处理它、也没有放下它的状态。',
  },
  {
    week_number: 2,
    title: '第2周 · 三秒钟延迟：打断自动化反应',
    skill_name: '三秒延迟术',
    category: '行动类',
    trigger_condition: '当你感觉到自己正要脱口而出一句情绪化的回应，或立刻点开一个让你分心的App时',
    step_one: '感觉到冲动升起的瞬间，先做一次缓慢的呼气（不是吸气，是呼气）',
    step_two: '在心里默数三秒，同时问自己："三分钟后的我，会希望我现在做什么？"',
    step_three: '三秒结束后，再决定要不要执行原本的冲动',
    memory_anchor: '冲动只有三秒的寿命，撑过去它就换了个样子',
    insight: '神经科学中一个学界通行观点是：由杏仁核触发的强烈情绪冲动，其生理峰值通常在数秒内达到并开始回落，而前额叶皮层介入决策则需要更长的反应时间差。这意味着大多数"冲动型"行为，其实不是意志力不够，而是反应速度太快，快到理性系统还没来得及上线。三秒延迟不是要你"忍住"，而是给理性系统一个上线的窗口。',
    case_study: '一位学员习惯在被同事否定后立刻反驳，用三秒延迟术练习了两周后发现，绝大多数时候，三秒过后他想说的话变了——从"你根本不懂"变成了"你说的这点我没考虑到，能展开讲讲吗"。同一件事，只是晚了三秒回应，关系的走向完全不同。',
    cognitive_reframe: '"我控制不住自己"这句话本身就是一个误解——不是你控制不住，是你从没给自己留出控制的时间窗口。',
  },
  {
    week_number: 3,
    title: '第3周 · 用"下一步是什么"代替"应该怎么办"',
    skill_name: '下一步聚焦法',
    category: '决策类',
    trigger_condition: '当一件事让你感到千头万绪、无从下手，脑子里反复出现"我该怎么办"却始终没有答案时',
    step_one: '停止问"我应该怎么办"，改问"在这件事上，我今天能做的最小一步是什么"',
    step_two: '把这个最小一步缩小到15分钟内能完成的程度',
    step_three: '只做这一步，做完再问一次同样的问题',
    memory_anchor: '大问题没有答案，小问题才有下一步',
    insight: '"我该怎么办"是一个要求你一次性看清全局、给出完整方案的问题，这种问题几乎注定让人卡住，因为大脑在信息不全的情况下无法生成完整方案，只会陷入反复权衡。而"下一步是什么"把决策的颗粒度从"整个人生方向"缩小到"接下来15分钟"，这是一个大脑真正能够回答的问题规模。',
    case_study: '一位学员面对"要不要换工作"这个大问题纠结了三个月毫无进展。用下一步聚焦法后，她给自己定的第一个"下一步"只是"给一位已经跳槽的前同事发一条消息，问问那边的情况"。这一步做完，答案没有立刻出现，但纠结感明显减轻——因为她终于从"想"进入了"做"。',
    cognitive_reframe: '你以为自己缺的是答案，其实你缺的是一个小到可以立刻执行的动作。',
  },
  {
    week_number: 4,
    title: '第4周 · 复盘不是找错，是找可重复的部分',
    skill_name: '可重复复盘法',
    category: '认知类',
    trigger_condition: '当你结束一件事（一场谈话、一次汇报、一周的工作）习惯性地只回顾"哪里做得不好"时',
    step_one: '先问一次："这件事里，有哪个瞬间是我做对了、且我知道自己为什么做对"',
    step_two: '把这个瞬间的具体做法写下来，写成一句可以在下次直接照做的话',
    step_three: '再问"哪里可以更好"，但只允许挑一个点，不做清单式罗列',
    memory_anchor: '复盘的终点不是清单，是一句能重复使用的话',
    insight: '习惯性的复盘往往是"找茬式"的——列出十条不足，却说不出一条可以直接复用的经验。这种复盘留下的不是能力，是焦虑。真正能沉淀为能力的复盘，是先确认"哪里做对了"，并且把"做对"的具体动作抽出来变成可执行的句子，这样下一次遇到类似情境，才有一句现成的话可以直接用，而不是重新从头摸索。',
    case_study: '一位学员每次汇报后都习惯列出自己"表达不够清楚""逻辑不够严谨"等一长串问题，越复盘越没自信。换成可重复复盘法后，她第一次写下的"做对的部分"是"我先说了结论，再讲了三个理由，对方没有打断我"——这句话后来变成了她固定的汇报模板，反而比十条问题清单更有用。',
    cognitive_reframe: '复盘的目的不是证明你有多少问题，而是找到那一句下次可以直接照做的话。',
  },
];

const insertSkill = db.prepare(`
  INSERT INTO skills (week_number, title, skill_name, category, trigger_condition,
    step_one, step_two, step_three, memory_anchor, insight, case_study, cognitive_reframe)
  VALUES (@week_number, @title, @skill_name, @category, @trigger_condition,
    @step_one, @step_two, @step_three, @memory_anchor, @insight, @case_study, @cognitive_reframe)
`);

const existingCount = db.prepare('SELECT COUNT(*) AS c FROM skills').get().c;
if (existingCount === 0) {
  const tx = db.transaction(() => {
    for (const s of skills) insertSkill.run(s);
  });
  tx();
  console.log(`已写入 ${skills.length} 条示例Skill内容`);
} else {
  console.log('skills 表已有数据，跳过内容写入');
}

const testCode = 'TEST-0001';
const existingCode = db.prepare('SELECT 1 FROM activation_codes WHERE code = ?').get(testCode);
if (!existingCode) {
  db.prepare('INSERT INTO activation_codes (code) VALUES (?)').run(testCode);
  console.log(`已生成测试激活码: ${testCode}`);
} else {
  console.log(`测试激活码已存在: ${testCode}`);
}
