# 渐步进化共同体

一周一枚策印，持续52周的进化路径。PWA 知识库应用，素纸风设计。

## 线上访问地址

- 前端：https://jianbu-jinhua-gongtongti.netlify.app
- 后端 API：https://jianbu-jinhua-gongtongti-production.up.railway.app/api
- 后台管理：https://jianbu-jinhua-gongtongti.netlify.app/admin
- GitHub 仓库：https://github.com/weixiyou1976-glitch/jianbu-jinhua-gongtongti

## 技术栈

- 前端：React + Vite + Tailwind CSS + React Router
- 后端：Node.js + Express
- 数据库：SQLite（better-sqlite3）
- PWA：vite-plugin-pwa（Workbox）
- 部署：前端 Netlify，后端 Railway

## 目录结构

```
渐步进化共同体/
├── backend/          Express + SQLite 后端
├── frontend/          React + Tailwind + PWA 前端
├── netlify.toml        Netlify 构建配置
└── package.json        根目录快捷脚本
```

## 已完成范围

- **Phase 1**（已完成）：登录 / 激活码注册、学员主页、Skill 详情页（含策印提交）、PWA 安装配置、4 周示例内容
- **Phase 2**（已完成）：Skill 总库双维度检索（按周次 / 按类型）、52 格进度打卡墙、策印列表
- **Phase 3**（已完成）：策印列表打印导出 PDF（浏览器打印，中文渲染无兼容问题）、后台管理（激活码批量生成 + CSV 导出、学员列表、Skill 内容增删改）

## 本地运行

### 前置条件

- Node.js 18+（建议 20+）
- npm

### 1. 安装依赖

```bash
cd 渐步进化共同体
npm run install:all
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` 中请修改：
- `JWT_SECRET`：改成一串随机字符串
- `ADMIN_PASSWORD`：后台管理登录密码

### 3. 初始化数据库并写入示例内容 + 测试激活码

```bash
npm run seed
```

会写入 4 周示例 Skill 内容，并生成测试激活码 **`TEST-0001`**。

### 4. 启动后端

```bash
npm run dev:backend
```

默认监听 `http://localhost:4000`。

### 5. 启动前端（新开一个终端）

```bash
npm run dev:frontend
```

默认监听 `http://localhost:5173`，已配置 `/api` 代理到后端 4000 端口。

### 6. 验收登录

打开 `http://localhost:5173`，选择"激活码注册"，输入：
- 激活码：`TEST-0001`
- 邮箱：任意邮箱
- 密码：至少6位

注册后自动登录进入主页。

### 7. 后台管理

访问 `http://localhost:5173/admin`，密码为 `backend/.env` 中的 `ADMIN_PASSWORD`。

## PWA 安装与离线

- 生产构建（`npm run build:frontend`）会生成 Service Worker，缓存已访问过的 Skill 页面和静态资源，离线可继续浏览。
- API 请求使用 NetworkFirst 策略：联网优先请求最新数据，断网时回退到最近一次缓存的响应。
- 有新版本发布时，页面顶部会出现"发现新版本 / 立即刷新"提示条。
- 移动端浏览器访问后可"添加到主屏幕"安装为独立 App。

> 本地 `npm run dev` 模式默认不启用 Service Worker（`devOptions.enabled: false`），需要用 `npm run build:frontend` + 本地静态服务器（如 `npx serve dist`）验证 PWA 离线效果。

## 部署

### 前端 → Netlify

1. 将本仓库推送到 GitHub（或其他 Netlify 支持的 Git 提供商）
2. 在 Netlify 新建站点，选择该仓库
3. 构建配置已写在根目录 `netlify.toml`（Base directory: `frontend`，构建命令 `npm run build`，发布目录 `dist`），Netlify 会自动识别，无需手填
4. 在 Netlify 站点的 Environment variables 中添加：
   - `VITE_API_URL` = 你的 Railway 后端地址 + `/api`（例如 `https://your-app.up.railway.app/api`）
5. 触发部署

### 后端 → Railway

1. 在 Railway 新建项目，选择该仓库
2. 设置 **Root Directory** 为 `backend`
3. Start Command：`npm start`
4. 添加环境变量：
   - `JWT_SECRET`：随机字符串
   - `ADMIN_PASSWORD`：后台密码
   - `CORS_ORIGIN`：你的 Netlify 站点域名（例如 `https://your-site.netlify.app`）
   - `DB_PATH`：`/data/jianbu.db`
5. **重要**：SQLite 文件需要持久化存储，请在 Railway 项目中添加一个 Volume，挂载路径设为 `/data`，否则每次重新部署数据会丢失
6. 首次部署后，通过 Railway 的 Shell 或本地临时指向该库执行一次种子脚本（`node seed.js`），写入首批 Skill 内容和测试激活码；也可以直接用 `/admin` 后台的"批量生成激活码"生成正式激活码

### 部署后连通性检查

- 后端：访问 `https://你的Railway域名/api/health`，应返回 `{"ok":true}`
- 前端：访问 Netlify 域名，尝试用测试激活码 `TEST-0001` 注册（如种子脚本已在生产库执行过）

## 测试激活码

执行 `npm run seed` 后会生成：

```
TEST-0001
```

可用于验收登录注册流程（每个激活码仅可使用一次）。

## 设计规范

- 背景色 `#FAF8F4`（暖白），强调色 `#C0392B`（朱砂红）
- 字体 Noto Serif SC（通过 Google Fonts 加载）
- 正文内容区最大宽度 680px

## 数据库结构

```sql
users (id, email, password_hash, activation_code, activated_at, enrolled_at, created_at)
activation_codes (code, used, used_by, used_at)
skills (id, week_number, title, skill_name, category, trigger_condition, step_one, step_two, step_three, memory_anchor, insight, case_study, cognitive_reframe, created_at)
stamps (id, user_id, skill_id, learned, practiced, gained, submitted_at)
checkins (id, user_id, skill_id, checked_at)
```
