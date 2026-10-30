# 界面截图索引

当前线上版本为 **v1.3.0**，本地升级版本为 **v1.4.0**。README 中文首图使用 [desktop-zh-CN.png](v1.3/production/language/desktop-zh-CN.png)，英文首图使用 [desktop-en.png](v1.3/production/language/desktop-en.png)，均来自正式站点的独立验收上下文，画面使用固定示例任务。

## 当前版本

v1.4 本地截图已归档于 [local](v1.4/local)，包含多窗口只读与接管、模块失败、历史、业务、语言与备份。下列 v1.3 线上截图保留其原版本含义，README 首图在 v1.4 生产复验后更新。

所有截图统一采用 `版本 / 环境 / 验收类型 / 图片` 的路径：

| 目录 | 内容 |
| --- | --- |
| [v1.3/production/language](v1.3/production/language) | 桌面、375 / 390 手机、横屏，中英文 |
| [v1.3/production/business](v1.3/production/business) | 首页、计时、长任务名、手机弹窗 |
| [v1.3/production/backup](v1.3/production/backup) | 桌面中文、375 中文、390 英文暗色、横屏英文备份预览 |
| [v1.3/production/history](v1.3/production/history) | 四种尺寸的历史概览与自定义日期 |
| [v1.3/local](v1.3/local) | 对应的本地验收截图，另含历史空状态 |

运行方式、版本和重跑限制见 [v1.3 验收记录](../15-HISTORY.md)与[原始结果索引](../acceptance/README.md)。

## 历史版本

| 版本 | 线上 | 本地 | 说明 |
| --- | --- | --- | --- |
| v1.2 | [production](v1.2/production) | [local](v1.2/local) | 语言、业务和备份预览，见[备份验收](../14-BACKUP.md) |
| v1.1 | [production](v1.1/production) | [local](v1.1/local) | 语言与业务；线上另有设置弹窗、任务菜单、暗色首页与暗色设置，见[历史验收](../10-ACCEPTANCE.md) |

历史截图保留原始字节，不作为当前版本的界面证明。不同版本或环境的画面可能完全一致，仍按原验收归属保存。

## 重拍与归档

按[部署说明](../../DEPLOYMENT.md)运行验收，默认或显式写入 `.artifacts/screenshots/<环境>/<类型>/`。检查结果、实际图片和版本后，再归档到 `docs/screenshots/v1.x/<环境>/<类型>/`；新版本使用新的版本目录，不覆盖旧版图片。

更新 README 首图时，同时修改中英文 README 的路径、图注和版本。一次验收出现导航失败时，保留原始报告及单项重跑记录，不能仅凭截图宣称完整运行通过。
