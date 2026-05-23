# JetBrains 账号半自动批量注册脚本

> ⚠️ **免责声明**：本脚本仅用于学习与个人合规用途。批量注册可能违反 JetBrains
> [Account Agreement](https://www.jetbrains.com/legal/docs/agreements/jetbrains_account)，
> 风险自负。**企业批量开通员工账号请走 [Customer Portal 团队邀请](https://www.jetbrains.com/store/business.html)，
> 那才是正规途径。**

## 实测可用流程（2026-04）

```
临时邮箱 (tempmail.ing API)           Playwright 控制 Chromium
        │                                       │
        │ ① POST /api/generate                  │
        │   返回 xxx@deepask.app                 │
        ├──────────────────────────────────────▶│
        │                                       │ ② 打开 /signup
        │                                       │ ③ 关闭 Cookie 横幅
        │                                       │ ④ 点击 Continue with email
        │                                       │ ⑤ 输入邮箱 → 点击 Continue (×2)
        │                                       │ ⑥ 触发腾讯滑块验证码
        │                                       │     ⏸ 脚本暂停，等你手动拖滑块
        │                                       │ ⑦ 滑块通过 → JetBrains 发 6 位码
        │ ⑧ 轮询 GET /api/emails/{addr}          │
        │◀──────────────────────────────────────┤
        │ 收到主题为                              │
        │ "Confirmation code to create..."       │
        │ 邮件内 6 位数字 (例: 548753)            │
        ├──────────────────────────────────────▶│
        │                                       │ ⑨ 自动填 6 位码
        │                                       │ ⑩ 自动填 First/Last/密码
        │                                       │ ⑪ 提交 → 跳转 /licenses
        │                                       │     ✅ 完成
```

## 核心要点

1. **JetBrains 现在使用腾讯滑块验证码（TCaptcha）** —— 中国 IP 必出。
   纯自动化绕不过，本脚本采用半自动方案：脚本跑到滑块那一步暂停，由人工拖动滑块。
2. **临时邮箱 tempmail.ing 没被拉黑** —— 实测能正常收到 JetBrains 的确认码邮件。
3. **API 限流自带恢复**：第一次 `email/signup` 经常 429，但前端会自动重试，
   通过 dialog 遮罩消失即可继续。

## 安装

```bash
# Python 3.9+
pip install -r requirements.txt
python -m playwright install chromium
```

> 如果你 Mac 上是 Apple Silicon 但 Python/playwright 是 x86_64 装的（如本项目环境），
> 跑命令时前面加 `arch -x86_64`：
> `arch -x86_64 python3 main.py`

## 使用

```bash
# 注册 1 个（默认有头模式，必须有头才能拖滑块）
python main.py

# 注册 3 个，更耐心地等
python main.py --count 3 --captcha-wait 600 --mail-timeout 300

# 调试用：无头模式（拖不动滑块，会卡死，仅供观察前置流程）
python main.py --headless
```

参数：

| 参数 | 默认 | 含义 |
|------|------|------|
| `--count` | 1 | 注册账号数量 |
| `--headless` | False | 无头模式（拖不动滑块，**别用**） |
| `--slow-mo` | 80 | Playwright slow_mo 毫秒 |
| `--captcha-wait` | 300 | 等用户拖完滑块的最长秒数 |
| `--mail-timeout` | 240 | 等 6 位码邮件的最长秒数 |
| `--interval` | 10 | 两次注册之间的间隔秒数 |

## 实操步骤

1. 跑 `python main.py`，会弹出一个 Chromium 窗口
2. **不要关窗口**，看着脚本自动操作：
   - 关 Cookie 弹窗
   - 点 `Continue with email`
   - 填邮箱 → 点 `Continue` → 弹出"再次确认"页 → 又点一次 `Continue`
3. **腾讯滑块**出现，终端会打印：
   ```
   ⚠️  请到浏览器窗口手动完成 [腾讯滑块验证码]！完成后脚本会自动继续...
   ```
   把 Chromium 窗口拉到前台，**手动拖一下滑块**
4. 滑块过完，脚本自动接管：拿邮件 → 填 6 位码 → 填资料 → 完成
5. 最终账号信息追加到 `accounts.csv`

## 文件结构

```
.
├── main.py                  # 主流程
├── jetbrains_register.py    # JetBrains 注册流程（Playwright）
├── tempmail_client.py       # tempmail.ing 客户端（生成邮箱+轮询邮件+提取6位码）
├── requirements.txt         # 依赖
├── accounts.csv             # 注册结果（自动生成）
└── fail-*.png               # 失败时的截图（自动生成，便于排查）
```

## 已知问题

1. **`/email/signup` 返回 429**
   正常现象。前端会自动重试，dialog 遮罩消失就行。如果遮罩 30s+ 不消失才是真问题。

2. **滑块拖完了但脚本没继续**
   可能你没真过 —— 腾讯滑块要求轨迹拟人，太机械会判定失败。多试一两次。

3. **临时邮箱 30 分钟过期**
   脚本生成的账号注册成功后，**找回密码 / 验证设备等需要邮件的操作都做不了**。
   要长期可用账号，请把 `tempmail_client.py` 替换成你自己的域名邮箱（catch-all）或 IMAP 收件方案。

4. **海外 IP 出 hCaptcha / Turnstile 而不是腾讯滑块**
   脚本只检测 `#tCaptchaMaskLayer`，海外用户需要改 `_has_tcaptcha_mask` 函数。

5. **想完全自动化（不用人工拖滑块）**
   接打码平台（CapSolver / VerifyCN / Yescaptcha），它们都支持腾讯滑块，
   把 `_wait_tcaptcha_pass` 替换成 API 调用即可。
