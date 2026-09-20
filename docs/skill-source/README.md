# Skill 内容治理与恢复

本版本的内容权威来源是 `backend/data/skills/skills-*.json`。生产数据库是运行副本，不能替代版本管理。当前基线为 332 张、2,439 条标签，来自 2026-09-19 23:37:02（UTC+8）的生产只读快照。审计详情见 [AUDIT.md](AUDIT.md)。

治理实现基线 commit `b3bab85c42157add47d719ee7c63ee3b6d6c494a` 已提交并推送至独立分支 `codex/skill-source-of-truth`。该分支尚未合并 main，尚未部署生产。

## 数据约定

- 使用 `week_number` 作为稳定内容键。已有周次不改号、不复用；数据库 `id` 只用于当前运行库关联，不进入内容文件。
- 每张卡片完整保存 19 个内容字段。`tags` 必须是数组，是唯一标签来源；`skills.tags` 和 `skill_tags` 都由它派生。后者关联 INSERT 返回的 ID，不用周次代替 ID。
- `display_order` 非主线为 null，主线恰好 52 个、连续且唯一。库增长不代表主线数量增长。
- `manifest.json` 声明文件清单、总数、周次范围和来源基线。来源时间/哈希是历史快照证据，不把未重新导出的数据标成新的生产快照。
- 所有 JSON 为 UTF-8。保存原文，不做 trim、自动润色、标点替换或 Unicode 归一化。验证器可以报告空白，但不能修改它。
- 历史允许为空的 key_question、growth_friction_ending、insight_audio_url 可以为空字符串；键本身不能缺失。空标签和重名是警告，错误类型、重复周次等是阻断错误。

## 基线哈希的语义

- `manifest.json` 的 `export_file_sha256` 是完整 UTF-8 生产导出文件 `skill-library-production-320.json` 的原始字节 SHA-256。计算对象包含导出元数据、查询说明、格式化空白、332 张原始 Skill 行、每张嵌入的 `skill_tags` 及孤立标签数组；值为 `f31ec92178937790e2790a6a97daea4c86ef1fbe864b101c40d271d3dfe229f4`。它用于确认审计所依据的导出文件没有被替换或改写，因此格式变化也会改变该值。
- 生产快照元数据及 `skill-source-production-comparison.json` 的 `content_sha256` 是只读查询结果 `{skills, skill_tags}` 经紧凑 `JSON.stringify` 后的 UTF-8 字节 SHA-256。`skills` 是按 `week_number, id` 排序的原始数据库行，包含数据库 `id`、19 个内容字段及 `created_at`；`skill_tags` 是按 `skill_id, tag` 排序的 2,439 条独立标签行。值为 `7e90102288b18f24b29dace7851f0b81dbe5da84194af56444a5aff9bfc1666a`。它用于确认数据库查询结果集合及顺序没有变化，不包含导出包装、元数据、孤立标签数组或格式化空白。
- 两个哈希的计算对象不同，理论上不要求一致，也都不是 7 个仓库 JSON 分片的语义哈希。仓库与生产的 19 个内容字段及标签是否一致，以只读 compare 的逐字段结果为准。

## seed.js 的角色

`seed.js` 仅为兼容适配器：被历史 migration 导入时返回 JSON 内容，直接执行时调用同一个独立恢复工具。它不再保存内容数组，不导入 db.js，不自动生成 TEST-0001，不创建用户或其他业务表。

历史 migration 只处理原有 225—254 周的缺失记录；display-order migration 从 JSON 派生映射。应用 db.js 仍有历史启动迁移，不得被只读工具引用。不要再通过追加硬编码 migration 文案来维护新卡片。

## 只读校验

在仓库根目录（或 backend 目录）安装现有锁定依赖后运行：

```bash
npm --prefix backend ci
npm run validate:skills
npm run compare:skills -- --snapshot /absolute/path/production-skill-export.json
npm run compare:skills -- --db /absolute/path/readable-database.db
```

`validate:skills` 输出总数、周次连续性、重复周次/名称、缺失字段、标签异常及每张数量、52 周主线完整性、分类统计、音频 URL 异常。格式校验不代替逐条音频网络可达性测试。

compare 默认只读，必须显式提供快照或文件路径；不会使用 DB_PATH 猜测数据库，不会创建不存在的数据库，不会执行迁移。比较全部 19 个字段和独立标签表。退出码 0=一致、1=存在差异、2=输入/结构错误。没有自动覆盖选项。快照模式的结论只覆盖其采集时点。

需要新快照时，在明确授权且可读数据库的环境中运行独立导出脚本。不要通过启动应用或加载 db.js 导出；不要下载包含个人信息的完整生产 DB：

```bash
node backend/scripts/export-skills-readonly.cjs --db /absolute/path/database.db > /local/output/skills.json
```

若在远程执行，stdout 重定向应放在本机连接命令外侧，避免向生产卷写文件。远程环境没有这些脚本时，不要为导出而自动部署新版本。

## 安全恢复与演练

先预览，默认不会写入或创建数据库：

```bash
npm run restore:skills -- --db /absolute/local/path/recovered.db
```

经人工审核，明确创建新的本地 Skill 数据库：

```bash
npm run restore:skills -- --db /absolute/local/path/recovered.db --apply --create
npm run compare:skills -- --db /absolute/local/path/recovered.db
```

对于已有且结构完整的本地库，`--apply` 只补缺失周次。已有 Skill 的所有字段、ID、标签不被覆盖；若它与仓库不同，只在 existingDifferences 中报告。重复执行不再插入。所有插入及标签写入在同一事务中，失败回滚。不创建激活码，不读写用户、策印或其他业务表。

`--create` 只创建 skills、skill_tags 及其索引，不初始化整个应用。结构缺列、单表缺失、重复周次或 Skill 表有触发器时拒绝自动修复。在 Railway、NODE_ENV=production 和 /data 目标路径下禁止执行恢复写入；没有默认生产目标、网络连接或自动上线动作。恢复生产仍需要独立的人工恢复审批和运行数据备份方案。

一键隔离演练只创建新的系统临时库，不接受目标库路径：

```bash
npm run rehearse:skills
npm run test:skills-source
node --test backend/tests/skills-225-230.test.js
```

本工具恢复 Skill 内容和标签，不能恢复丢失的用户、策印、模块关联或原来的数据库 ID。若仍有引用旧 Skill ID 的业务表，不能直接把全新 Skill 库替换进去，必须另行设计 ID 映射和全库恢复。

## 新增第 333 周及以后

1. 从审核后的主分支创建内容变更分支，先做生产只读对照；发现漂移先处理，不在旧基线上继续堆内容。
2. 为新卡分配未使用的下一周次，填写完整 19 字段；通常 display_order=null。只在 JSON 中维护 tags。
3. 第 333 周可将尾片 `skills-301-332.json` 更名为固定区间 `skills-301-350.json`，保留 301—332 原文，再追加 333；后续按 50 张分片。manifest 的文件名、expected_count 和 last_week 同步更新为实际数量。新增边界的测试期望也应随审核后的库版本更新。
4. 运行 validate、测试和临时恢复演练，review git diff，确认没有改动已有文案、周次和业务代码。发布前比较可以有“仅新卡缺失于生产”的预期差异，必须人工确认差异清单。
5. 审核内容变更并提交/合并 GitHub，记录提交号。再单独批准内容发布。本次恢复工具不是生产发布工具，也不会因仓库增加卡片而自动写生产。
6. 发布只能读取该审核提交中的 JSON，生成一次性入库计划；只写新增卡并按实际 ID 生成标签。已有卡修改必须逐字段审批，不用恢复工具覆盖。
7. 发布后重新只读导出，运行 compare，确认预期数量、19 字段和标签表均无差异，记录生产时间与 Git 提交号，才算完成内容发布。

## 后台直接编辑后的回写规则

日常内容编辑应先在 Git JSON 中审核。后台直改只作紧急例外：操作前保留内容快照，操作后立即只读导出，按 week_number 生成差异，将获批的实际生产修改逐字段回写 JSON，完成 review、测试和提交，再次对照至零差异。回写完成前暂停下一批内容发布。

严禁对编辑后的旧快照只改时间戳，或在 drift 出现时运行恢复覆盖生产。本次 compare 不自动接受生产修改，也不自动提交 Git。

**目前这是流程约束与可检测机制，不是后台权限强制锁。** admin POST/PUT/DELETE 仍能写生产；如果绕过上述流程，仍会漂移。未来是否限制后台编辑权限、增加变更审计或审批，要单独授权，本次不扩展开发。
