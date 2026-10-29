# 验收文件索引

结果按版本与环境保存。当前版本为 **v1.3.0**；这些文件是已归档证据，新运行默认写入 `.artifacts/acceptance/`，不覆盖历史文件。

| 版本 / 环境 | 业务 | 语言 | 备份 | 历史 |
| --- | --- | --- | --- | --- |
| v1.3 本地 | [business](v1.3/local/business.json) | [language](v1.3/local/language.json) | [backup](v1.3/local/backup.json) | [history](v1.3/local/history.json) |
| v1.3 线上 | [business](v1.3/production/business.json) | [language](v1.3/production/language.json) | [backup](v1.3/production/backup.json) | [history](v1.3/production/history.json) |
| v1.2 本地 | [business](v1.2/local/business.json) | [language](v1.2/local/language.json) | [backup](v1.2/local/backup.json) | — |
| v1.2 线上 | [business](v1.2/production/business.json) | [language](v1.2/production/language.json) | [backup](v1.2/production/backup.json) | — |
| v1.1 本地 | [business](v1.1/local/business.json) | [language](v1.1/local/language.json) | — | — |
| v1.1 线上 | [business](v1.1/production/business.json) | [language](v1.1/production/language.json) | — | — |

v1.3 线上业务、语言和历史，以及 v1.2 线上业务文件是**覆盖汇总**，包含连接中断后单独重跑的结果，不代表一次连续全通过。它们的 `source_files` 和每项 `source` 相对于该汇总文件解析，指向同目录下 `raw/` 内的原始报告。重跑数量与限制见 [v1.3 验收说明](../15-HISTORY.md)及 [v1.2 验收说明](../14-BACKUP.md)。

其他保留记录：

- [v1.0 本地生产构建回归](v1.0/local/business-preview.json)。
- v1.1 [开发模式回归](v1.1/local/business-dev.json)、[首页交互改版后的线上回归](v1.1/production/business-ux.json)，与后续复验分开保留。
- [v1.1 本地真实等待后台计时](v1.1/local/background.json)：约 181 秒真实冻结，不使用快进；后续版本未将它记作重新执行。
- [v1.2 连接中断运行合集](v1.2/production/raw/network-attempts.json)：`attempts` 内保留各次完整报告，`name` 为当时的运行标识。

部分独立运行的报告或截图字节一致，仍保留各自版本与环境归属。历史结果不添加当时没有记录的时间或版本字段。

正式归档时应核对预期版本、URL、全部用例、非预期错误及重跑来源，同时更新[截图索引](../screenshots/README.md)和对应版本说明。不要手工将失败改成通过。
