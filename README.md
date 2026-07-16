# Knowledge

Knowledge 是一款面向所有用户的本地优先知识管理桌面软件，首发 Windows 与 macOS。

产品采用“统一内核 + 场景模式”：所有模式共享笔记、文件夹、标签、属性、双向链接、数据库、任务、搜索、Canvas、AI 和附件能力；首次启动可选择学习、工作、个人、研究、创作或空白模式，并可在设置中同时启用多个模式。

## 第一版能力

- 本地 Markdown + YAML Frontmatter 为数据源，附件存放在知识库目录
- 首次启动场景选择与模板初始化
- 三栏桌面布局：导航、内容区、上下文侧栏
- 笔记编辑、文件夹、标签、属性、收藏、搜索与回收站
- Wiki 双向链接、反向链接、标题大纲与关联笔记
- 数据库表格、任务聚合、日历、知识图谱与 Canvas
- OpenAI 兼容接口配置；AI 完全可选，密钥由系统安全存储保护
- Windows/macOS 打包配置与 GitHub Actions 构建

## 技术栈

Electron、React、TypeScript、Vite、React Flow、Vitest。

## 在服务器开发

```bash
cd /home/Knowledge
npm ci
npm run dev
```

服务器需要图形桌面环境才能直接启动 Electron。只开发渲染层时可运行：

```bash
npm run dev:web
```

## 质量检查

```bash
npm run typecheck
npm test -- --run
npm run build
```

## 打包

```bash
npm run package
```

Windows 安装包建议在 Windows runner 构建，macOS DMG/ZIP 建议在 macOS runner 构建。仓库中的 GitHub Actions 会分别执行两个平台的构建。
