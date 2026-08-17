# dsh-agent-memory 设计文档

版本:0.1.0 · 状态:候选官方内置(proposal 见 PROPOSAL.md)

## 1. 要解决什么问题

DSH 本身不缺"记忆":`dsh-agent-instructions` 已自动加载 AGENTS.md/CLAUDE.md(文件记忆)、`dsh-goal` 管会话内目标、`dsh-session-query-sqlite` 可查历史会话。缺的是**跨会话的长期记忆**:

- 用户在 A 会话说的偏好,到 B 会话就忘了;
- 项目踩过的坑没有地方沉淀,下次重新踩;
- 已有 AGENTS.md 是"人/agent 手动维护的指令",不是"系统自动沉淀的知识"。

社区已有三个方案(@hyls9527/dsh-agent-memory、dsh-mnemon、dsh-nocturne-memory),全是 MEMORY.md 自维护文件型:靠模型自己读写文件,没有 schema、没有治理、没有检索排序。本项目的目标:做 DSH 官方内置候选——复用原生基础设施,不另造轮子。

## 2. 三层架构

```
┌─────────────────────────────────────────────────────┐
│ 第一层 底层逻辑(identity)  preset persona / AGENTS.md │  ← 已有机制,不重复造
│   你是什么 agent、怎么思考、项目规则。静态、手动维护。    │
├─────────────────────────────────────────────────────┤
│ 第二层 按需注入(working set)  agent/pre-step 动态召回  │  ← 本项目新增
│   每轮模型执行前,用用户当前消息检索最相关的            │
│   injectCount 条(默认 3),注入本轮输入。               │
│   说教辅→注入教辅决策/踩坑;说闲鱼→注入闲鱼方案。       │
├─────────────────────────────────────────────────────┤
│ 第三层 记忆库(memory bank)  domain 全量记录            │  ← 本项目新增
│   fact/preference/decision/lesson/todo/note           │
│   按需检索(memory_recall)、浏览(memory_index)、        │
│   纠正(memory_forget)。schema 校验、容量治理、TTL。    │
└─────────────────────────────────────────────────────┘
```

对应到计算机体系:底层逻辑=BIOS,按需注入=L1 缓存(预取相关数据),记忆库=主存。

设计要点:**注入的是"与当前任务相关的记忆",不是固定的热集**。v0.1 初版用"全局最活跃 top-8 每轮广播"(热记忆),实测发现多项目场景下广播命中率低——闲鱼最活跃,但你在做教辅。v0.2 改为 pre-step 动态召回(§3.3):每轮用用户消息做 query,注入 top-3 相关,既不浪费 token 也解决"新会话不知道项目存在"。分层仍然自动:检索排序(§5)决定哪些记忆浮出。

## 3. 决策记录(ADR 式)

### 3.1 持久化:用 ctx.storageDomain,不建数据库

| 选项 | 结论 |
|---|---|
| 自建 SQLite / JSON 文件 | 否。DSH 已有 storage hub(`ctx.storage`)+ 官方 `dsh-storage-json`/`dsh-storage-sqlite` 后端 + `dsh-storage-domain`(zod 校验、写链、事件)。web profile 默认就挂着 `storage→storage-json→storage-domain(backend: json)`。 |
| **复用 domain** | 是。零新存储代码、schema 校验免费、原子写免费、换后端(SQLite)只改一行配置、数据落在 `$DSH_HOME/storages/`(人类可读 JSON,可 git)。 |

内置候选的判断:官方自己所有持久化状态(goal、session projection)都走这条链,记忆系统走同一条链才能被官方接受。

### 3.2 检索:零依赖启发式,不做向量

| 选项 | 结论 |
|---|---|
| 向量库 + embedding | 否。引入 FAISS/qlite-vec 依赖 + 每次写入调 embedding API,违背本地优先;记录量级(400 条×2KB)下向量是杀鸡用牛刀;DSH 核心包全零依赖哲学。 |
| SQL LIKE 全文 | 部分。无排序、无中文友好。 |
| **子串命中 + Jaccard 重叠,加权新鲜度/重要性/访问** | 是。零依赖、可解释、可单测;400 条全量扫描单次 <1ms。 |

中文检索处理:单字分词(连续 CJK 按单字切),ASCII 按词切。中文"单字 token"语义弱于词,但记忆条目是短文本(≤2000 字符),配合整串子串命中,召回足够。未来可加可选 embedding 后端(见 §9),接口已经隔离在 `search.ts` 一个文件里。

### 3.3 热记忆自动浮现,不做手动置顶

参考 Zep/Graphiti 的教训:时态衰减机制(事实有效期)是好东西但复杂;而"手动把某条记忆置顶"违背 agent 自治。取中间态:三因子分数(§5.2)排序取 top-N 进上下文。访问次数是自动的"置顶投票"。

### 3.4 治理四件套

- **容量上限**(maxRecords,默认 400):满时按 `importance 升序 → 最后活跃时间(accessedAt,无则 updatedAt)升序` 淘汰。importance=3 的记录优先豁免——只有全库都是 3 级且仍超容量时,才淘汰最老的 3 级(保证系统不因保护而死锁)。
- **近重复合并**(mergeSimilarity,默认 0.7):同 kind/scope/project 下 Jaccard ≥ 阈值则合并(保留更长内容、合并 tags、importance 取 max、访问计数 +1)。合并时 TTL:显式传 `ttl_days` 才刷新/清除,否则保留旧记录的到期时间——避免"补一句内容顺手把 TTL 抹掉"。
- **TTL**(ttl_days):临时凭据、短期决策自动过期;过期记录检索不可见,写路径惰性清理。
- **重要性守卫**:importance=3 删除必须 `confirm: true`;淘汰时最后考虑。

阈值对中文分词做过校准:Jaccard 0.7 是合并正确/误合并的分界。并发边界:merge 的"扫描+判定"基于读快照,两个并发相似写入可能同时判定"无重复"而各自新建(数据不丢,仅去重不彻底,下次写入仍会合并)——domain 的原子 update 只保证单 key 更新不丢,不提供跨 key 事务,这是有意的取舍。

### 3.5 协议注入,保证任何 preset 下都生效

| 层 | 机制 | 作用 |
|---|---|---|
| 工具 description | 每个工具自述使用规则 | 兜底:只要工具可见,规则就在 |
| `systemPrompt.section`(order 110) | 记忆协议全文 | 标准 preset 下注入完整协议 |
| `agent/pre-step` 动态注入 | 每轮按当前消息召回 top-N 注入 | 模型"感知"到相关记忆(主通道) |

被 complete-persona 遮蔽时,工具 description 仍保底;pre-step 注入走事件通道,不受 prompt 结构影响。

### 3.6 包结构与构建对齐官方

单包 `dsh-agent-memory`,`name/inject/Config/apply` 导出,与 `dsh-tool-goal` 同构;esbuild 打包 + tsc 声明;peerDependencies:`@deepseek-ai/cordis@^4.0.1`、`@deepseek-ai/schemastery@^3.18.1`、`@deepseek-ai/dsh-llm / dsh-storage / dsh-storage-domain / dsh-tools` 锁 `^0.1.0-rc.6`、`zod@^4.4.3`(必须 4.x,官方 storage-domain 用 zod 4,3.x 会双实例类型冲突)。

## 4. 数据模型

Domain:`memory`(version 1),单表 `records`,key 为 `mem_<16hex>`。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| content | string ≤2000 | 记忆正文,写入时截断 |
| kind | enum | fact / preference / decision / lesson / todo / note |
| tags | string[] ≤16 | 小写去重标签,recall/index 过滤 |
| scope | enum | user(跨项目)/ project(仅当前项目) |
| project | string \| null | scope=project 时记录项目根 |
| importance | 1-3 | 3=关键,淘汰豁免优先、删除需确认 |
| createdAt / updatedAt | ISO | updatedAt 驱动新鲜度与排序 |
| accessedAt / accessCount | ISO / int | recall 命中时递增,驱动热度 |
| expiresAt | ISO \| null | TTL;null=永不过期 |

zod schema 在持久化边界校验(domain 机制自带),坏记录会在 open 时被 domain 拒绝并报告——不会静默污染。

## 5. 检索与热度算法

### 5.1 recall 排序

```
score = base × importanceBoost × recencyBoost × accessBoost
base  = 3×整串子串命中(content) + 1.5×子串命中(tags) + 2×Jaccard(query, content)
importanceBoost = 1 + (importance-1)×0.75        → 1 / 1.75 / 2.5
recencyBoost    = 0.5^(age / 90天)                → 半衰 90 天
accessBoost     = min(1.5, 1 + ln(1+count)×0.15)  → 常用记忆微升
```

空 query:走热度排序(等价"最近最常用"),供按 kind/tag/scope 过滤浏览。

### 5.2 热度(热记忆工作集)

```
hotScore = recencyBoost(lastActivity) × importanceBoost × accessBoost
lastActivity = max(updatedAt, accessedAt)   ← 更新和 recall 命中都会刷新新鲜度
```

每轮 `systemPrompt.context` 渲染 top-N(默认 8)条短摘要(≤90 字符)。热记忆全自动:模型多 recall 某条 → accessedAt 刷新 + accessCount 升 → 自动变热并维持;90 天没有任何访问/更新 → 指数降温出集。访问加成封顶 1.5,防"单条记忆靠刷访问垄断热集"。

## 6. 工具 API

| 工具 | 参数 | 返回 | 说明 |
|---|---|---|---|
| memory_remember | content*, kind, tags, scope, project, importance, ttl_days | {id, merged, evicted, content} | 写;近重复自动合并;超容量自动淘汰 |
| memory_recall | query*, kinds, tags, scope, project, limit(默认 5) | {totalMatched, returned, results[]} | 排序检索;命中写回访问统计 |
| memory_index | kinds, tags, scope, limit(默认 20), offset(默认 0) | {total, expired, byKind, entries} | 清单浏览(内容截断 120 字符) |
| memory_forget | id 或 tags(+scope), confirm | {deleted, skippedImportant} | 删;importance=3 需 confirm |

所有工具返回纯 JSON 摘要给模型(不走大段原文灌上下文),细节按需二次 recall。

## 7. 与 DSH 现有机制的分工

| 机制 | 管什么 | dsh-agent-memory 管什么 |
|---|---|---|
| AGENTS.md/CLAUDE.md(dsh-agent-instructions) | 静态指令:项目规则、约定 | 动态知识:事实/决策/教训(可沉淀到文件,见 docs/AGENTS.template.md) |
| dsh-goal | 本次会话目标 | 跨会话记忆 |
| dsh-session-query-sqlite | 会话历史全文 | 结构化记忆条目 |
| 本插件的 protocol section/context | — | 记忆协议 + 热记忆工作集 |

## 8. 局限与后续

- 中文检索是单字 token,同义/近似词不召回(靠 tags 补);后续可加可选 embedding 后端,接口已隔离在 search.ts
- 无跨设备同步(文件在本地 $DSH_HOME,天然可 git/网盘同步,无内置冲突合并)
- 无 UI(官方可选路线:client-ui-memory 面板);当前模型工具已自洽
- 无 per-session 记忆(有 dsh-session-projection 可接,不重复造)

## 9. 测试策略

- 纯逻辑单测(`test/memory.test.mjs`,21 例):tokenize/jaccard/score/hot/TTL/merge/evict/recall 过滤与计数/index 截断/forget 守卫/schema 拒绝
- 集成冒烟:配置树 dump 验证 + 可选 headless 会话真跑
- 时间戳全部由 `now` 参数注入,测试可复现,不依赖真实时钟
