## 非官方声明

非官方项目,社区成员自己弄的,跟 DeepSeek 官方没关系。

## 项目地址

- GitHub: https://github.com/Culeot/dsh-agent-memory
- npm: https://www.npmjs.com/package/dsh-agent-memory

## 干嘛用的

让 DSH 的 agent 跨会话记事。这次会话聊过的偏好、踩过的坑、做过的决策,下次会话开头就能用上。不用每次都从零开始解释"我是谁、我在干嘛"。

## v0.8.3 改了啥

**相关性阈值注入**: 之前每轮固定注入 3 条记忆,不管有没有现在改成按分数过滤——达到 `injectMinScore`(默认 1.0)才注入,达不到的不管。只为真正有用的记忆付费。

**多维度相关性**: 不再只靠关键词重复判断相不相关。改成了 5 个维度综合判断:语义像不像、任务有没有用、模式是不是同一个、有没有因果关系、时间近不近。至少满足 2 条才采用。

**防衰退**: 加了自我强化规则——每次任务开头重新检索核心规则防止遗忘、同类错误重复出现自动固化成教训、发现开始用英文思考就切回中文。

**配置项**: 新增 `injectMinScore`,可以自己调阈值。README 中英文同步更新了。

## 怎么用

```bash
# 安装
cd ~/.dsh/profiles/<名字>
npm install dsh-agent-memory
```

```yaml
# agent preset 里加一行
- id: memory
  name: 'dsh-agent-memory'
  config:
    injectMinScore: 1.5  # 阈值自己调,默认 1.0
```

重启 DSH 就行。

## 截图

![记忆面板](https://raw.githubusercontent.com/Culeot/dsh-agent-memory/main/docs/memory-panel.png)
