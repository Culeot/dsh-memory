# dsh-agent-memory 接入示例(preset 方式)

以 DSH web profile + 自定义 preset 为例。前提:storage 三件套已在 profile 挂载
(web profile 默认就有:`storage` + `storage-json` + `storage-domain`)。

## 1. profile 加依赖

文件:`C:\Users\<你>\.dsh\profiles\web\package.json`

```json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {
    "dsh-agent-memory": "^0.1.0"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app"
      ]
    }
  }
}
```

安装(在 profile 目录执行,等价 pnpm install):

```bash
dsh plugin --profile web install
```

## 2. preset 加一行

文件:`C:\Users\<你>\.dsh\.agent-presets\<preset>\agent.cordis.yml`

在文件任意位置(与其它行平级)追加:

```yaml
- id: memory
  name: 'dsh-agent-memory'
  config:
    maxRecords: 400
    hotCount: 8
```

注意:dsh-agent-memory 的 apply 是 async(要 open domain),而 preset 里的普通行
是同步 apply——cordis 支持异步插件,storage-domain 插件本身也是 async,无冲突。
inject 声明了 storageDomain,若某 profile 没挂 storage,本行会启动失败并报清晰错误,
不会静默降级。

## 3. 重启 DSH,验证

```bash
dsh --profile web --dump-config   # 看配置树里 memory 行是否生效(不用重启服务)
```

新会话中应出现 4 个工具:`memory_remember / memory_recall / memory_index / memory_forget`。
system prompt 中应出现 `## Long-term memory (dsh-agent-memory)` 段和 `Memory store: ...` 快照。

## 不加 preset 的替代:直接挂 host 平面

文件:`C:\Users\<你>\.dsh\profiles\web\cordis.patch.yml`

```yaml
- insert:
    - id: memory
      name: 'dsh-agent-memory'
```

这样对使用该 profile 的所有 preset/会话生效。注意 host 平面行会跨会话共享同一 domain,
记忆天然全局——这正是记忆系统想要的。

## 卸载

```bash
dsh plugin --profile web remove dsh-agent-memory
```

删掉 preset/patch 里的行即可。已有数据留在 `~/.dsh/storages/memory.json`,重装后自动恢复。
