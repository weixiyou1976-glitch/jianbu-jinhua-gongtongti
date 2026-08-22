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
    title: '第2周 · 看见第一反应背后的思维惯性',
    skill_name: '惯性识别器',
    category: '认知类',
    trigger_condition: '当你面对一个问题，发现自己的第一反应总是同一种解法，或者总是陷入同样的情绪模式时',
    step_one: '抓：抓住你刚才的第一反应，把它说出来或写下来，不加评判',
    step_two: '问：问自己："我上一次遇到类似情况，是不是也是这个反应？"',
    step_three: '选：问自己："除了这个反应，我还有没有另一种选择？"不要求立刻执行，只要能说出一个替代选项就算完成',
    memory_anchor: '第一反应是习惯，第二反应才是你',
    insight: '神经科学研究发现，人类大约有95%的行为和思维是在无意识状态下自动运行的。你以为自己在"做决定"，但大多数时候，你只是在执行大脑早已写好的程序。\n\n这些程序叫做"神经惯性"——它是过去某个时期你反复使用的应对模式，因为当时有效，所以被固化下来。问题是，环境变了，这些程序却还在继续运行。\n\n识别惯性的第一步，不是改变它，而是看见它。看见了，才有选择权。',
    case_study: '一位做销售的学员，每次客户提出异议，他的第一反应都是立刻解释、不断证明自己的产品有多好。成交率一直不理想。\n\n用惯性识别器之后，他发现：这个"立刻解释"的模式，从他小时候被父母质疑时就形成了——面对质疑，必须立刻自证。\n\n看见这个模式之后，他第一次在客户提出异议时，停顿了三秒，先问了一句："您最担心的是哪一点？"\n\n那次谈话，成交了。',
    cognitive_reframe: '你不是你的第一反应。你的第一反应是你的历史，不是你的现在。\n\n改变不从"努力做不同的事"开始，改变从"看见自己在做什么"开始。惯性识别器不要求你立刻改变，它只要求你在自动驾驶和真实选择之间，插入一个微小的停顿。\n\n那个停顿，就是自由开始的地方。',
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
