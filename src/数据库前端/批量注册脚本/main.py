"""
批量注册 JetBrains 账号主流程（半自动模式）。

完整流程：
    1) tempmail.ing 申请临时邮箱
    2) Playwright 打开 JetBrains 注册页，自动走 Cookie/Continue with email/输入邮箱/Continue
    3) 自动跑到第二次 Continue，触发腾讯滑块验证码后【暂停】
       —— 你在弹出的浏览器里手动拖一下滑块
    4) 滑块过完后脚本自动接管：
        - 轮询临时邮箱拿到 6 位 confirmation code
        - 自动填入验证码
        - 自动填 First Name / Last Name / 密码 / 确认密码 / 勾条款 / 提交
    5) 把账号信息写入 accounts.csv

用法：
    python main.py                      # 注册 1 个，有头模式
    python main.py --count 3            # 注册 3 个，每个都需要你手动拖滑块
    python main.py --headless           # 无头模式（拖不动滑块，仅供调试）
"""
from __future__ import annotations

import argparse
import csv
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional

from jetbrains_register import (
    JetBrainsAccount,
    JetBrainsBrowser,
    complete_profile,
    random_name,
    random_password,
    submit_confirmation_code,
    submit_signup_email,
)
from tempmail_client import TempMailClient

OUTPUT_FILE = Path(__file__).parent / "accounts.csv"


def append_to_csv(account: JetBrainsAccount, status: str, note: str = "") -> None:
    """主输出格式：email:password 单列；附加 timestamp/status/note 便于排查。"""
    new_file = not OUTPUT_FILE.exists()
    with OUTPUT_FILE.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if new_file:
            writer.writerow(["account", "timestamp", "status", "note"])
        writer.writerow(
            [
                f"{account.email}:{account.password}",
                datetime.now().isoformat(timespec="seconds"),
                status,
                note,
            ]
        )


# 成功账号专用文件：纯 email:password 一行一条，最干净的格式
SUCCESS_FILE = Path(__file__).parent / "accounts_ok.txt"


def append_success_line(account: JetBrainsAccount) -> None:
    with SUCCESS_FILE.open("a", encoding="utf-8") as f:
        f.write(f"{account.email}:{account.password}\n")


def _print_banner(text: str) -> None:
    line = "=" * (len(text) + 4)
    print(f"\n{line}\n  {text}\n{line}")


def _captcha_prompt() -> None:
    _print_banner("⚠️  请到浏览器窗口手动完成 [腾讯滑块验证码]！完成后脚本会自动继续...")


def register_one(
    headless: bool,
    slow_mo: int,
    mail_timeout: float,
    captcha_wait: int,
    max_email_retries: int = 5,
    blacklist_wait: float = 10.0,
) -> bool:
    """注册单个账号；返回是否成功。

    max_email_retries: 邮箱被 JetBrains 识别为 disposable 时，最多重新申请邮箱的次数。
    blacklist_wait:    黑名单触发后等待多少秒再申请新邮箱（避免连击 tempmail / JetBrains 限流）。
    """
    first, last = random_name()
    password = random_password()

    with TempMailClient(duration_minutes=30) as mail, JetBrainsBrowser(
        headless=headless, slow_mo=slow_mo
    ) as browser:
        # 监听 signup API 状态码（便于排查）
        def _log_resp(r):
            url = r.url
            if "jetbrains.com/api/auth" in url:
                print(f"    [http {r.status}] {r.request.method} {url[:120]}")

        browser.page.on("response", _log_resp)

        # 这两个变量在循环里会被重新赋值；提前声明便于 except 分支引用
        account: Optional[JetBrainsAccount] = None
        last_blocked_email: Optional[str] = None

        try:
            # 1~2) 申请临时邮箱 + 提交邮箱 + 等用户拖滑块
            #      命中 disposable 黑名单则等待 blacklist_wait 秒后重新申请邮箱继续，
            #      最多重试 max_email_retries 次。
            for attempt in range(max_email_retries + 1):
                if attempt == 0:
                    print("[+] 打开 JetBrains 注册页...")
                else:
                    print(
                        f"[i] 邮箱黑名单重试 {attempt}/{max_email_retries}，"
                        f"等待 {blacklist_wait:.0f}s 后重新申请新邮箱..."
                    )
                    time.sleep(blacklist_wait)

                # 申请新邮箱（首次或重试）
                temp = mail.generate()
                print(f"[+] 临时邮箱: {temp.address}")
                account = JetBrainsAccount(
                    email=temp.address,
                    password=password,
                    first_name=first,
                    last_name=last,
                )

                # 提交邮箱并等用户拖完滑块（拖滑块超时会从这里 raise 出去，
                # 不会被吞进重试循环——这是有意为之，captcha 超时不该靠换邮箱解决）
                submit_signup_email(
                    browser.page,
                    account.email,
                    on_captcha_prompt=_captcha_prompt,
                    captcha_timeout_ms=captcha_wait * 1000,
                )

                # 检查页面有没有出现 "disposable email" 错误提示
                try:
                    body_text = browser.page.locator("body").inner_text(timeout=2_000)
                except Exception:  # noqa: BLE001
                    body_text = ""

                is_disposable = (
                    "disposable email" in body_text.lower()
                    or "long-term email" in body_text.lower()
                )

                if not is_disposable:
                    # 通过 disposable 检测，跳出循环进入后续流程
                    break

                # 命中黑名单：拉黑域名，记录最后一个被拉黑的邮箱
                mail.add_blocked_domain(account.email)
                last_blocked_email = account.email
                print(
                    f"[!] JetBrains 把 {account.email} 识别为一次性邮箱，"
                    f"已动态拉黑该域名。"
                )
            else:
                # for 循环正常结束（没有 break）= 重试用尽仍是黑名单
                raise RuntimeError(
                    f"连续 {max_email_retries + 1} 次申请到的邮箱都被 JetBrains 识别为一次性邮箱"
                    f"（最后一个：{last_blocked_email}），放弃本轮注册。"
                )

            # 类型守护：进入后续流程 account 一定已被赋值
            assert account is not None

            print("[+] 滑块通过，邮箱已提交，等 JetBrains 发 6 位 confirmation code...")

            # 3) 轮询邮件拿验证码
            email_obj = mail.wait_for_email(
                sender_keyword="jetbrains",
                timeout=mail_timeout,
                poll_interval=4.0,
            )
            print(f"[+] 收到邮件，主题：{email_obj.get('subject')}")
            code = TempMailClient.extract_confirmation_code(email_obj, length=6)
            print(f"[+] 提取确认码：{code}")

            # 4) 填验证码
            submit_confirmation_code(browser.page, code)
            print(f"[+] 验证码已提交，URL: {browser.page.url}")

            # 5) 填资料完成注册
            complete_profile(
                browser.page,
                first_name=account.first_name,
                last_name=account.last_name,
                password=account.password,
            )
            current_url = browser.page.url
            print(f"[+] 注册流程完成，当前 URL: {current_url}")

            # 真成功的判定：URL 离开了 /signup
            # （Cookie 弹窗已在 submit_signup_email 内 goto signup 后处理，此处无需再操作）
            is_real_success = "/signup" not in current_url
            if is_real_success:
                append_to_csv(account, status="success", note=current_url)
                append_success_line(account)
                print(f"[√] {account.email}:{account.password}")
                print(f"[√] 已保存到 {OUTPUT_FILE.name} 和 {SUCCESS_FILE.name}")
                return True
            else:
                # 走完了表单但 URL 还停在 /signup —— 多半 profile 提交失败或还有后续步骤
                append_to_csv(
                    account,
                    status="partial",
                    note=f"未跳转到登录后页面，当前停留在 {current_url}",
                )
                print(
                    f"[!] {account.email} 表单虽提交但页面未跳转，可能未真正注册成功，"
                    f"已记录为 partial（不写入 {SUCCESS_FILE.name}）"
                )
                return False

        except Exception as exc:  # noqa: BLE001
            tb = traceback.format_exc(limit=3)
            print(f"[!] 注册失败: {exc}\n{tb}", file=sys.stderr)
            try:
                screenshot = OUTPUT_FILE.parent / f"fail-{int(time.time())}.png"
                browser.page.screenshot(path=str(screenshot), full_page=True)
                print(f"[i] 已截图保存到 {screenshot.name}")
            except Exception:  # noqa: BLE001
                pass
            # account 在 mail.generate() 之前的异常路径里可能仍为 None
            if account is None:
                placeholder = JetBrainsAccount(
                    email="(tempmail-unavailable)",
                    password=password,
                    first_name=first,
                    last_name=last,
                )
                append_to_csv(placeholder, status="failed", note=str(exc)[:300])
            else:
                append_to_csv(account, status="failed", note=str(exc)[:300])
            return False


def _ask_count(default_count: Optional[int]) -> int:
    """交互式询问注册数量。已通过 --count 显式传入则直接用。"""
    if default_count is not None and default_count > 0:
        return default_count
    while True:
        try:
            raw = input("请输入要注册的账号数量: ").strip()
        except EOFError:
            return 1
        if raw.isdigit() and int(raw) > 0:
            return int(raw)
        print("    请输入一个正整数（例如 1 / 3 / 10）")


def main() -> None:
    parser = argparse.ArgumentParser(description="批量注册 JetBrains 账号（半自动）")
    parser.add_argument("--count", type=int, default=None, help="要注册的账号数量（不传则交互输入）")
    parser.add_argument("--headless", action="store_true", help="无头模式（无法拖滑块，仅调试）")
    parser.add_argument("--slow-mo", type=int, default=80, help="Playwright slow_mo 毫秒数")
    parser.add_argument(
        "--mail-timeout",
        type=float,
        default=240.0,
        help="等待 confirmation code 邮件的超时秒数",
    )
    parser.add_argument(
        "--captcha-wait",
        type=int,
        default=300,
        help="等用户拖完滑块的最长秒数",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=10.0,
        help="两次注册之间的间隔秒数",
    )
    parser.add_argument(
        "--max-email-retries",
        type=int,
        default=5,
        help="同一账号下，邮箱被识别为一次性邮箱后最多重新申请多少次",
    )
    parser.add_argument(
        "--blacklist-wait",
        type=float,
        default=10.0,
        help="邮箱被拉黑后，等待多少秒再申请新邮箱（避免触发 tempmail / JetBrains 限流）",
    )
    parser.add_argument(
        "--max-account-retries",
        type=int,
        default=5,
        help="单个账号注册失败（超时/邮箱黑名单耗尽/其它异常）后，"
        "在当前序号下最多重试多少次（默认 5 = 共 6 次尝试机会）",
    )
    parser.add_argument(
        "--account-retry-wait",
        type=float,
        default=5.0,
        help="单账号失败重试前等待多少秒（避免连击触发限流）",
    )
    args = parser.parse_args()

    count = _ask_count(args.count)

    if args.headless:
        print("[!] 警告：headless 模式无法人工拖滑块，注册大概率会卡死。")

    print(f"\n=== 开始批量注册，共 {count} 个 ===")
    success = 0
    account_idx = 0
    while account_idx < count:
        # 单账号在当前序号下做 max_account_retries + 1 次尝试
        # （attempt=0 是首次，attempt>=1 是重试。失败原因可能是滑块超时、
        #   邮箱黑名单耗尽、网络异常等，统一按"当前序号下重试"处理。）
        max_retries = max(0, args.max_account_retries)
        wait_sec = max(0.0, args.account_retry_wait)
        ok = False
        for attempt in range(max_retries + 1):
            if attempt == 0:
                print(f"\n--- 第 {account_idx + 1}/{count} 个 ---")
            else:
                print(
                    f"\n--- 第 {account_idx + 1}/{count} 个（账号级重试 "
                    f"{attempt}/{max_retries}）---"
                )

            if register_one(
                headless=args.headless,
                slow_mo=args.slow_mo,
                mail_timeout=args.mail_timeout,
                captcha_wait=args.captcha_wait,
                max_email_retries=args.max_email_retries,
                blacklist_wait=args.blacklist_wait,
            ):
                ok = True
                break

            # 失败：如果还有重试机会就 sleep 一下再来；耗尽则直接退出 attempt 循环
            if attempt < max_retries:
                print(
                    f"[i] 第 {account_idx + 1}/{count} 个账号本次失败，"
                    f"{wait_sec:.0f}s 后在当前序号下重试..."
                )
                time.sleep(wait_sec)
            else:
                print(
                    f"[!] 第 {account_idx + 1}/{count} 个账号已耗尽 {max_retries} 次重试，"
                    f"放弃当前序号，进入下一个"
                )

        if ok:
            success += 1

        account_idx += 1
        if account_idx < count:
            print(f"[i] 休息 {args.interval}s 后继续...")
            time.sleep(args.interval)

    print(f"\n=== 全部完成：{success}/{count} 成功 ===")
    print(f"  · 主输出（email:password）: {SUCCESS_FILE}")
    print(f"  · 详细日志（含失败）:        {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
