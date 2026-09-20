# Skill 事实源治理最终报告（待审核，未提交）

## 结论

本地实现完成并验证：**332 张、每张 19 个内容字段、2,439 条 skill_tags，与生产快照逐字段一致，差异 0**。所有生产文案原样保留。**未 commit、未 push、未合并、未部署；GitHub main 现在仍不能恢复全部 332 张。**

生产比较基线为 **2026-09-19 23:37:02（UTC+8）** 的只读导出；本次未重新连接线上，不把快照结论表述为持续实时一致。历史审计与完整分类统计见 [AUDIT.md](AUDIT.md)，维护规则见 [README.md](README.md)。

工作区：`work/skill-source-repo`，独立分支 `codex/skill-source-of-truth`，基于 main `9d54121bb09538aba484165e05fbfd169b58ce03`。原项目中的体验账号修复未混入。

## A. 修改及新增文件

修改 7 个已有文件：

- `README.md`：更新内容数量、只读预览与本地初始化流程；移除自动生成测试激活码和生产直接 seed 的旧说明。
- `package.json`、`backend/package.json`：增加内容校验、对照、只读导出、恢复、演练和测试命令。
- `backend/seed.js`：精简兼容适配器，只加载 JSON；CLI 转交安全恢复入口。无内嵌内容、无 app db 初始化、无测试激活码。
- `backend/migrations/display-order.js`：主线映射从同一 JSON 派生。
- `backend/migrations/skills-225-230.js`：补全内容字段映射，避免收尾句字段再次被遗漏。
- `backend/tests/skills-225-230.test.js`：适配新事实源及显式恢复入口，验证旧内容/ID/业务记录不变。

新增文件：

- `backend/data/skills/manifest.json` 和 7 个 JSON 分片：001—050、051—100、101—150、151—200、201—250、251—300、301—332。
- `backend/lib/skillContent.js`、`skillSnapshot.js`、`skillRestore.js`：内容加载校验、只读白名单采集、安全补缺恢复。
- `backend/scripts/validate-skills.cjs`、`compare-skills.cjs`、`export-skills-readonly.cjs`、`restore-skills.cjs`、`rehearse-skills.cjs`。
- `backend/tests/skill-source.test.cjs`。
- `docs/skill-source/`：治理说明、审计与最终报告、逐字段历史差异、脱敏入库证据、一致性/验证/恢复/敏感信息检查结果。

没有修改 db.js、admin/skills 路由、AI 推荐、前端、Problem 系统或此前体验修复文件。未加入生产数据库、.env、密钥、用户或策印文件。

## B. 是否仅凭 GitHub 可恢复

**当前 GitHub main：不可以。** 它仍只有 254 张源内容，缺 255—332；旧恢复 SQL 也有字段遗漏。

**这次本地变更经审核提交到 GitHub 后：可以恢复这 332 张 Skill 的全部内容字段及标签。** 已实际从空 SQLite 恢复验证。不要将“本地完成”写成“GitHub 已保存”。恢复用户、策印、原数据库 ID、模块关联等需要其他业务备份，不属于这份内容事实源。

## C. 与生产逐字段一致及敏感信息

| 核验 | 最终结果 |
| --- | --- |
| 卡片数 | 332 |
| 每张内容字段 | 19，全部键存在 |
| 19 字段对照 | 0 差异，保留标点、换行及空字符串 |
| skill_tags | 2,439 条，独立标签表与 tags 一致 |
| 170 处音频 URL | 全部保存生产值 |
| 4 处 insight 和 1 处 step_two | 全部保存生产原文 |
| growth_friction_ending | 97 个非空值和 235 个空值全部恢复一致 |
| display_order | 恰好 52 张，1—52 连续唯一 |
| 周次 | 1—332 连续，无重号 |
| skill_name 重复 | 137 与 331 的“关系修复”，仅警告 |
| 生产敏感信息 | 无用户/策印表、邮箱、密码、JWT、API Key、平台密钥或私钥进入事实源 |

敏感信息检查同时检查字段白名单和内容模式。内容对象没有 id、created_at、用户、密码、令牌等字段；邮箱、JWT、私钥、常见 API Key 模式均为 0 命中。来源元数据只记录快照时间、部署提交与文件校验值等溯源信息。

## D. 175 处历史差异的分类

这里比较的是旧 main 的 seed 对象与生产共有的 1—254 周，不把缺失的 78 张算作 175 处字段差异。

| 字段 | 数量 | 周次 |
| --- | ---: | --- |
| insight_audio_url | 170 | 9—178 |
| insight | 4 | 27、163、179、188 |
| step_two | 1 | 85 |
| 合计 | 175 | 涉及 172 张 |

这些内容全部以生产快照为准保存。共有记录的 tags 为 0 差异。旧 main 实际执行空库 seed 后还会漏写 **19 个 growth_friction_ending**（231—237、243—254），所以旧恢复流程实测为 **194 处字段差异**；不能把数组存在的字段当成实际恢复成功。

255—332 已由 13 批成功 API 调用记录证实：Claude Code 调用生产 POST /api/admin/skills 写入，共 78 张，未回写 main。1—254 的仓库/迁移路径已审计，但逐张首次入库记录不足的部分明确标注为未能确定。

## E. 测试清单

首轮 **15 项**全部保留并再次通过；为追加的恢复约束增加 **5 项**。最终 **20 通过，0 失败**。原15项包含仓库已有的体验账号/HTTP回归测试，执行它们是兼容性验证，没有混入体验功能修复。

| 编号 | 测试 | 来源 | 结果 |
| ---: | --- | --- | --- |
| 1 | 332 records, 52 main-track positions; known duplicate name is a warning | 原15项之一 | 通过 |
| 2 | invalid weeks, fields, tags, main-track order, URL and runtime fields fail | 原15项之一 | 通过 |
| 3 | malformed JSON, invalid UTF-8 and unlisted shards are rejected | 原15项之一 | 通过 |
| 4 | read-only comparison is independent of database IDs and leaves bytes unchanged | 原15项之一 | 通过 |
| 5 | compares every content field, missing/extra records and independent tag table | 原15项之一 | 通过 |
| 6 | CLI exits 1 for drift, 2 for unsafe/missing input; never creates absent DB | 原15项之一 | 通过 |
| 7 | recovery rehearsal cannot target existing DB or run inside Railway | 原15项之一 | 通过 |
| 8 | empty recovery restores all 19 fields including endings and both tag representations | 新增恢复安全测试 | 通过 |
| 9 | repeat recovery is idempotent and preserves all IDs and database bytes | 新增恢复安全测试 | 通过 |
| 10 | partial recovery preserves edited content, nonsequential IDs and unrelated business rows | 新增恢复安全测试 | 通过 |
| 11 | recovery CLI defaults to read-only preview and rejects production writes | 新增恢复安全测试 | 通过 |
| 12 | recovery refuses trigger side effects and rolls back failed multi-row inserts | 新增恢复安全测试 | 通过 |
| 13 | 种子适配器包含连续的1—332周，导入不连接数据库 | 原15项之一 | 通过 |
| 14 | 真实启动路径增量写入，并保留全部旧内容、ID、关联记录；重复启动无变化 | 原15项之一 | 通过 |
| 15 | 已有225周的自定义内容、草稿状态、音频和标签完整保留，只补缺失周次，不触及231周 | 原15项之一 | 通过 |
| 16 | 标签写入失败时整批Skill和标签全部回滚 | 原15项之一 | 通过 |
| 17 | 空库启动不抢先写六张，完整seed可初始化332张且再次执行不重复 | 原15项之一 | 通过 |
| 18 | 两个进程并发执行增量迁移不会产生重复Skill或标签 | 原15项之一 | 通过 |
| 19 | 体验账号用户名按最大编号递增生成，密码互不相同，不会与已有编号重复 | 原15项之一 | 通过 |
| 20 | 真实HTTP接口：总库、周次/类型/标签、解锁、详情、重复策印、匹配、陪练记忆、Trial账号体验和进度 | 原15项之一 | 通过 |

## F. 空库恢复

独立新建临时 SQLite，只创建 skills、skill_tags 及必要索引。恢复 **332 张 + 2,439 标签，19 字段差异 0**，包括所有成长摩擦收尾句。无用户、策印、激活码等业务表写入。工具不导入 db.js，不执行启动迁移。

## G. 重复恢复与保护边界

- 完整恢复后第二次执行：新增 0，已有 ID、字段、标签全部不变；独立测试验证数据库文件字节相同。
- 部分库测试：已有卡片改为 id=9001 且自定义标题，恢复补入其余 331 张，保留该 ID、标题和标签；users、stamps、activation_codes 的原有记录全部不变。
- 默认 --db 仅预览；缺失文件不创建。实际本地补缺需显式 --apply，新库还需 --create。
- Railway、NODE_ENV=production、/data 目标被拒绝；重复周次、不完整结构或内容表存在触发器时拒绝自动处理；整批插入和标签写入同一事务，失败回滚。
- 已有内容与仓库不同只报告，不覆盖。这个行为有意保留人工编辑，不能把“恢复后数量相等”误当成“内容必然相等”，仍需 compare。

## H. 未来新增与后台回写工作流

1. 审核并提交本次版本后，GitHub JSON 成为内容唯一维护来源；生产是运行副本。
2. 新增333：先读取最新快照并确认无未处理漂移，在内容分支的 JSON 添加19字段；week_number=333，通常 display_order=null。可将尾片改名为 skills-301-350.json，manifest 数量和末周改为333，标签只维护一个数组。
3. validate → 测试 → 临时恢复 → review diff。新增边界的测试期望随经审核的库版本更新。新卡未发布时，只接受经过人工确认的新增缺失差异。
4. 先审核内容提交，再单独批准发布。发布以该提交的 JSON 为输入，不复制粘贴一份长期独立内容。此次恢复工具不承担线上发布。
5. 发布后只读导出，再比较全部字段和标签至零差异，记录 Git 提交与生产快照时间。
6. 后台紧急直改必须先保留快照、后立即导出并按周次回写获批差异，review、测试、提交，再次校验。回写未闭环前暂停下一批内容发布。严禁自动覆盖生产或自动接受所有生产变更。

## I. 尚存风险

- 后台编辑权限仍在，没有自动 Git 回写、强制审批或定时漂移监控。单一事实源目前由版本流程和只读比较落实，绕过流程仍会再次漂移。
- 已知重名、27 张空标签、14 张空关键问题、235 张空收尾句、28 种分类的相近名称并存，均未擅自修改。
- admin 写内容与写标签目前不是原子事务，week_number 没有数据库唯一约束；工具能发现，但本次没有修改运行系统。
- 内容恢复无法恢复旧 ID 关联和用户业务数据。若业务表仍存在而 Skill 行丢失，需要独立 ID 映射恢复方案，不能直接替换成新生成 ID。
- 比较结论限于上述生产快照；上线前必须重新读取生产。音频 URL 文本一致不等于所有远程文件始终可达。
- GitHub 备份缺口在审核提交前仍然存在。当前未 commit、未 push；原体验修复工作目录保持原状。
