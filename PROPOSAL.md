# 提案:将 dsh-agent-memory 纳入 DeepSeek Harness 官方内置

> 面向 deepseek-ai/deepseek-harness 维护者的集成提案。仓库:https://github.com/deepseek-ai/deepseek-harness(2026-08-13 开源,MIT,dev preview)。

## 1. 背景与需求

DSH 目前没有跨会话长期记忆。`dsh-agent-instructions` 提供 AGENTS.md/CLAUDE.md 静态文件记忆(手动维护的规则),`dsh-goal` 管会话内目标,`dsh-session-query-sqlite` 管历史会话查询——但**会话之间沉淀的动态知识**(用户偏好、已定决策、踩坑教训)无处安放,每次新会话从头开始。

社区已经自发出现三个文件型方案(Discussion #525 的 @hyls9527/dsh-agent-memory、dsh-mnemon、dsh-nocturne-memory),共同点是 MEMORY.md 自维护:模型读写普通文件,无 schema、无治理、无检索排序。需求是真的,但文件方案撑不到官方质量线。

## 2. 提案内容

在 monorepo 新增一组包(对齐既有包命名与结构):

```
packages/memory/
├── memory/          # @deepseek-ai/dsh-agent-memory  cordis 插件(domain + 协议注入)
├── memory-search/   # @deepseek-ai/dsh-agent-memory-search  零依赖检索(tokenize/jaccard/评分)
└── memory-tool/     # @deepseek-ai/dsh-tool-memory     模型工具(memory_remember 等 4 个)
```

或简化:单包 `dsh-agent-memory`(本提案附带的实现即此形态,结构、构建、测试与官方 dsh-tool-* 完全同构)。

### 2.1 接入点(全部是现有机制,零新基建)

| 能力 | 复用 |
|---|---|
| 持久化 | `ctx.storageDomain.open(defineDomain)` — storage hub 已挂,backend=json(可换 sqlite),zod 校验、原子写、事件免费获得 |
| 工具注册 | `ctx.tools.register(defineTool)` — 与 dsh-tool-goal 同款 |
| 协议注入 | `ctx.systemPrompt.section()` + `ctx.systemPrompt.context()` |
| 文件记忆 | `dsh-agent-instructions`(AGENTS.md 与 memory 分工,见下) |

### 2.2 三层架构(提案核心)

1. **底层逻辑**:preset persona + AGENTS.md — 已有,不重复。
2. **热记忆**:按「访问次数 × 新鲜度 × 重要性」自动排序的 top-N(默认 8)条,经 `systemPrompt.context` 每轮注入短摘要。更新或 recall 都会刷新新鲜度。分层自动涌现,不用人工分类。
3. **记忆库**:domain 全量记录,4 工具按需读写;治理四件套(容量淘汰、近重复合并、TTL 过期、importance=3 删除确认)。

### 2.3 数据模型

Domain `memory` v1,单表 `records`。字段:id/content(≤2000)/kind(fact·preference·decision·lesson·todo·note)/tags/scope(user·project)/project/importance(1-3)/createdAt/updatedAt/accessedAt/accessCount/expiresAt。zod schema 在持久化边界校验,坏数据 open 即拒绝,不静默污染。

## 3. 与社区方案的差异(为什么选这个)

| | 社区文件型(MEMORY.md) | dsh-agent-memory |
|---|---|---|
| 存储 | 裸 Markdown,模型自维护 | schema 校验 domain,写链原子,事件可观测 |
| 检索 | 模型自己翻文件 | 确定性排序(子串+重叠×新鲜度×重要性×访问) |
| 治理 | 无 | 容量淘汰/合并/TTL/守卫 |
| 上下文成本 | 整文件常驻或全量翻 | 热记忆 ≤8 条短摘要 + 按需 recall |
| 一致性 | 并发写互相踩 | domain 单写链 |
| 可测试 | 难 | 纯逻辑单测,时间注入 |

## 4. 集成建议(给官方评审的三档)

- **A. 随 base bundle 默认挂载**(推荐):记忆是 agent 的基础能力,与 goal 同级;工具只在模型主动调用时耗 token,上下文成本受 hotCount 上限约束。
- **B. 随 web-app 挂载**:与 storage 三件套同批 insert(它们目前在 web-app 的 patch 里),preset 可选。
- **C. 仅发布包不内置**:社区安装,官方观察使用数据后再决定。

若采纳 A/B,需同步:README 文档、`config/agent-presets/` 的 standard preset 加入该行、schema 迁移策略(domain version 字段已预留)。

## 5. 兼容性与迁移

- peer 依赖锁 `0.1.0-rc.6` 全家桶,与当前发布版严格对齐;包内不 import 任何未公开 API。
- 数据在 `$DSH_HOME/storages/memory.json`,人类可读;未来 schema 变更通过 domain version + 迁移脚本。
- 社区 MEMORY.md 用户迁移:提供一次性脚本把 Markdown 段落转成 memory_remember 调用(可后续补,非必需)。

## 6. 测试与质量

- 21 例单元测试(检索/热度/TTL/合并/淘汰/守卫/schema),时间注入可复现。
- 与官方 `dsh-tool-goal` 同构的构建(esbuild + tsc 声明)、schemastery Config、`name/inject/apply` 导出。
- 已通过 `--dump-config` 配置树验证;真机冒烟见仓库 STATE.md。

## 7. 作者

dsh-agent-memory v0.1.0,MIT。代码与完整设计见 https://github.com/dsh-community/dsh-agent-memory 。欢迎以任何形式(PR、issue、Discussion)并入官方仓库;并入时作者信息与 LICENSE 均可按官方惯例处理。
