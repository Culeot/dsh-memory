# AGENTS.md — 项目文件记忆模板

> 这是"文件记忆"(静态规则)模板,配合 dsh-agent-memory 插件(动态知识)使用。
> 官方 `dsh-agent-instructions` 会自动加载它:全局 `~/.dsh/AGENTS.md` → 项目根 `AGENTS.md` → 逐层到 cwd。
> 分工原则:AGENTS.md 放**不会变或很少变**的规则;会随会话增长的知识(决策、偏好、教训)交给 memory_remember。

## 项目一句话

<!-- 这个项目是干什么的,30 字内 -->

## 构建与测试(写死,不许猜)

<!--
- 构建:npm run build(esbuild+tsc)
- 测试:npm test(node --test)
-->

## 目录约定

<!-- 大目录各管什么,新代码该放哪 -->

## 硬性规则(违反=返工)

<!--
- Windows 文件名禁止 * / ~ 等字符
- 交付前必须过 humanizer
-->

## 常用命令速查

<!-- 终端命令,复制即用 -->

## 会过期的约定不要写这里

临时方案、一次性决定、个人偏好 → 让 agent 写进 dsh-agent-memory(memory_remember),到期 TTL 自动清理。
