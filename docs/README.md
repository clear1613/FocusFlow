# FocusFlow 文档导航

当前产品版本为 **v1.4.0**，已完成上线和生产复验，见[可靠性记录](16-RELIABILITY.md)。产品介绍与使用入口见[仓库首页](../README.md)，本页用于查阅设计、验证与维护资料。

| 阅读目的 | 入口 |
| --- | --- |
| 了解功能范围 | [产品需求](01-PRD.md) |
| 理解技术设计 | [架构说明](architecture.md)、[技术设计](02-TECH_DESIGN.md) |
| 修改和维护代码 | [工程规范](03-ENGINEERING.md)、[贡献流程](../CONTRIBUTING.md) |
| 了解中英文切换 | [语言设计与 v1.1 验证](13-LANGUAGE.md) |
| 了解备份与恢复 | [备份设计与 v1.2 验证](14-BACKUP.md) |
| 了解多窗口保护与加载策略 | [可靠性设计与 v1.4 验证](16-RELIABILITY.md) |
| 了解历史查询与 CSV | [历史设计与 v1.3 验证](15-HISTORY.md) |
| 查看质量与发布结果 | [验收记录](10-ACCEPTANCE.md)、[发布记录](11-RELEASE.md) |
| 查找原始验证文件 | [验收文件索引](acceptance/README.md) |
| 查看界面截图 | [截图索引](screenshots/README.md) |
| 部署和重跑验收 | [部署说明](../DEPLOYMENT.md)、[发布清单](../RELEASE_CHECKLIST.md) |
| 回看首版开发决策 | [开发阶段归档](archive/README.md) |

## 文件归属

```text
src/                              应用代码与对应测试
scripts/                          发布校验与浏览器验收脚本
docs/                             当前设计、版本记录与阅读入口
docs/archive/v1.0/                首版开发阶段记录
docs/acceptance/v1.x/local/       已归档的本地验收结果
docs/acceptance/v1.x/production/  已归档的线上验收结果
docs/screenshots/v1.x/           按 local / production 与验收类型分组的截图
.artifacts/                      本机重跑输出，由 Git 忽略
```

验收脚本默认写入 `.artifacts/`。确认版本、环境和结果后，再将一次正式验收的报告与截图归档到相应版本目录，并更新索引。`production/raw/` 保留不完整运行和单项重跑；覆盖汇总保留原始文件指针，不将多次运行写成一次连续通过。

历史版本的测试数字和截图保留其原有含义。修改当前版本说明时，不覆盖旧版本结果。`node_modules/`、`dist/`、Python 缓存和本机验收产物不提交到 Git。
