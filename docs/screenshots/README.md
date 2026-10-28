# Screenshots

截图全部来自实际运行的应用，按来源分成两套，文件名保持一致，方便对照同一界面在本地和线上的表现。

```text
production/          线上 https://clear1613.github.io/FocusFlow/ 的 v1.1.0 截图
├── desktop-zh-CN.png / desktop-en.png
├── landscape-zh-CN.png / landscape-en.png
├── mobile-375-zh-CN.png / mobile-375-en.png
├── mobile-390-zh-CN.png / mobile-390-en.png
└── business/       线上业务回归：home-desktop、timer-desktop、mobile-375/390 与弹窗
local/               本地开发服务器上的同款截图
└── business/
```

`production/desktop-zh-CN.png` 是 README 中文首页首图，`production/desktop-en.png` 用于英文说明。语言截图覆盖 1440×1000 桌面、812×375 横屏与 375×812 / 390×844 手机；`business/` 下的截图覆盖长任务标题和弹窗适配。

图中的任务与专注记录是固定的示例任务，不含个人使用数据；浏览器语言设为英文，用来确认应用仍然默认显示中文。

## 重新生成

线上（需要能访问 Pages 地址）：

```bash
python scripts/language-acceptance.py --url https://clear1613.github.io/FocusFlow/ \
  --output docs/acceptance/language-production.json --screenshots-dir docs/screenshots/production
python scripts/browser-acceptance.py --production --expected-version 1.1.0 \
  --url https://clear1613.github.io/FocusFlow/ --output docs/acceptance/production.json \
  --screenshots-dir docs/screenshots/production/business
```

本地（先 `npm run dev -- --host 127.0.0.1`）：

```bash
python scripts/language-acceptance.py --output docs/acceptance/language-local.json --screenshots-dir docs/screenshots/local
python scripts/browser-acceptance.py --output docs/acceptance/business-local.json --screenshots-dir docs/screenshots/local/business
```

首页改为「计时器 + 右上角设置入口 + 任务行菜单」后，`production/` 与 `local/` 两套图会在本次发布验收时按原有文件名整体重拍；README 首图沿用 `production/desktop-zh-CN.png`，换图后不需要改路径。

换托管平台或改版后重拍时，用同样的文件名覆盖，并同步更新 [验收记录](../10-ACCEPTANCE.md) 里的地址与版本号，避免旧图被当成新版本证据。
