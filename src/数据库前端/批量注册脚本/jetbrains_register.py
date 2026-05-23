"""
JetBrains 账号注册自动化（Playwright + 半自动验证码）。

JetBrains 注册的实际流程（2026-04 实测）：

    Step 1. 打开 https://account.jetbrains.com/signup
    Step 2. 关闭 OneTrust Cookie 横幅（点击 "Accept All"）
    Step 3. 点击 "Continue with email"
    Step 4. 在 input#email（type=text）填邮箱，点击 "Continue"
            ↑ 此处后端 POST /api/auth/sessions/{id}/email/signup
              返回 200 后页面进入"再次确认"过渡页
    Step 5. 再点一次 "Continue"
            ↑ 此处会触发腾讯滑块验证码（tCaptchaMaskLayer）
              本脚本会在此处暂停，等用户人工拖完滑块再继续
    Step 6. 滑块通过后，JetBrains 给邮箱发一封 6 位 confirmation code
    Step 7. 在 6 位验证码输入框中填入收到的 code，自动跳到下一步
    Step 8. 填 First Name / Last Name / 密码 / 确认密码 → 提交完成

注意：腾讯滑块（TCaptcha）的 mask 是个 div 而不是 iframe，
脚本通过等待该 div 消失来判断"滑块已通过"。
"""
from __future__ import annotations

import random
import re
import string
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple

from playwright.sync_api import (
    Locator,
    Page,
    TimeoutError as PlaywrightTimeoutError,
    sync_playwright,
)

SIGNUP_URL = "https://account.jetbrains.com/signup"


@dataclass
class JetBrainsAccount:
    email: str
    password: str
    first_name: str
    last_name: str


def random_password(length: int = 14) -> str:
    """生成一个满足常见复杂度要求的密码（含大小写、数字、符号）。"""
    pools = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$%^&*"),
    ]
    rest_pool = string.ascii_letters + string.digits + "!@#$%^&*"
    pools += [random.choice(rest_pool) for _ in range(length - len(pools))]
    random.shuffle(pools)
    return "".join(pools)


def random_name() -> Tuple[str, str]:
    first_pool = ["Alex", "Sam", "Chris", "Jordan", "Taylor", "Morgan", "Robin", "Jamie"]
    last_pool = ["Smith", "Johnson", "Lee", "Brown", "Garcia", "Miller", "Davis", "Wilson"]
    return random.choice(first_pool), random.choice(last_pool)


# --------------------------------------------------------------------------- #
# 工具：关弹窗 / 等遮罩
# --------------------------------------------------------------------------- #
# Cookie 弹窗容器选择器（用逗号拼接给 wait_for_selector）
COOKIE_DIALOG_SELECTOR = (
    "#ch2-dialog, "                                  # Civic Cookie Hub
    ".ch2, "                                          # Civic Cookie Hub（容器外层）
    "#onetrust-banner-sdk, "                         # OneTrust
    "#onetrust-consent-sdk, "                        # OneTrust（备用容器）
    "#cookie-banner, "                                # 通用
    ".cookie-banner, "                                # 通用
    "[role='dialog'][aria-label*='cookie' i]"        # 标准 ARIA dialog
)


def _dismiss_cookie_banner(page: Page) -> bool:
    """
    关闭 Civic Cookie Hub / OneTrust / 通用 Cookie 弹窗（如果有）。

    返回值：True 表示成功点击到某个 Accept 按钮；False 表示没找到/没点中。
    注意"点中"不等于"弹窗已关闭"——某些弹窗有淡出动画或异步处理。
    """
    # 先按 Civic Cookie Hub 专用 class 尝试（JetBrains 实测使用此平台）
    for selector in (
        ".ch2-allow-all-btn",
        "button.ch2-allow-all-btn",
        "#ch2-dialog button.ch2-allow-all-btn",
    ):
        try:
            btn = page.locator(selector)
            if btn.count() and btn.first.is_visible():
                btn.first.click(timeout=3_000)
                page.wait_for_timeout(500)
                return True
        except Exception:  # noqa: BLE001
            continue

    # 再按 OneTrust 常见 ID 尝试
    for selector in (
        "#onetrust-accept-btn-handler",
        "button#onetrust-accept-btn-handler",
        "button[aria-label='Accept All']",
        "button[aria-label='Accept all']",
    ):
        try:
            btn = page.locator(selector)
            if btn.count() and btn.first.is_visible():
                btn.first.click(timeout=3_000)
                page.wait_for_timeout(500)
                return True
        except Exception:  # noqa: BLE001
            continue

    # 最后按按钮可访问名（accessible name）兜底
    for name in ("Accept All", "Accept all", "ACCEPT ALL", "I Accept", "Got it"):
        try:
            btn = page.get_by_role("button", name=name)
            if btn.count() and btn.first.is_visible():
                btn.first.click(timeout=3_000)
                page.wait_for_timeout(500)
                return True
        except Exception:  # noqa: BLE001
            continue

    return False


def _wait_cookie_dialog_present(page: Page, timeout_ms: int = 8_000) -> bool:
    """
    等任一已知 cookie 弹窗容器变成可见状态。
    返回 True 表示弹窗在；返回 False 表示等到超时也没出现（视为页面无弹窗）。
    """
    try:
        page.wait_for_selector(
            COOKIE_DIALOG_SELECTOR,
            state="visible",
            timeout=timeout_ms,
        )
        return True
    except PlaywrightTimeoutError:
        return False
    except Exception:  # noqa: BLE001
        return False


def _wait_cookie_dialog_gone(page: Page, timeout_ms: int = 2_500) -> bool:
    """
    等所有已知 cookie 弹窗容器都隐藏/移除（说明 Accept 已生效）。
    返回 True 表示弹窗已消失；False 表示仍然在。
    """
    try:
        page.wait_for_selector(
            COOKIE_DIALOG_SELECTOR,
            state="hidden",
            timeout=timeout_ms,
        )
        return True
    except PlaywrightTimeoutError:
        return False
    except Exception:  # noqa: BLE001
        return False


def accept_cookies_on_current_page(page: Page, wait_timeout_ms: int = 5_000) -> None:
    """
    在当前页面检测 Civic Cookie Hub / OneTrust 等 Cookie 弹窗并点击 "Accept All"。

    与 page.goto 解耦——调用者负责导航到目标页，本函数只负责处理已加载页面上的弹窗。

    流程：
      1) 等 cookie 弹窗容器变成可见（默认 5 秒）；超时则视为当前页无弹窗，安静返回
      2) 弹窗在 → 最多重试 5 次：先尝试点 Accept，再等弹窗容器消失
      3) 5 次都没消失 → 打 warning 不抛，调用者后续操作可能会因弹窗挡按钮失败，
         由外层 register_one except + outer account retry 兜底
      4) 任何内部异常都被吞掉，不影响调用者主流程

    参数：
      wait_timeout_ms: 等弹窗容器渲染的超时（毫秒）。signup 页推荐 5_000，
                       注册成功后页面（cookie 通常已接受过）推荐更短或不调用。
    """
    try:
        if not _wait_cookie_dialog_present(page, timeout_ms=wait_timeout_ms):
            # 没有弹窗 —— 可能 cookie 已经接受过、或当前页本就没启用同意横幅
            print("[i] 当前页未检测到 Cookie 弹窗，跳过")
            return

        # 弹窗在 —— 重试最多 5 次，应对动画期间 visibility 抖动 / 偶发点击丢失
        max_attempts = 5
        for attempt in range(1, max_attempts + 1):
            try:
                clicked = _dismiss_cookie_banner(page)
            except Exception as exc:  # noqa: BLE001
                print(f"[!] Cookie 关闭点击异常（第 {attempt} 次）: {exc}")
                clicked = False

            # 不论点击是否成功，都等容器是否真的消失（点击成功也要等动画过完才算）
            if _wait_cookie_dialog_gone(page, timeout_ms=2_500):
                print(f"[+] Cookie 弹窗已关闭（第 {attempt} 次尝试，clicked={clicked}）")
                return

            # 点过但没关掉 —— 间隔一下再试，等弹窗动画稳定
            page.wait_for_timeout(1_200)

        print(
            f"[!] 连续 {max_attempts} 次尝试都没能关闭 Cookie 弹窗，已放弃"
            f"（后续操作可能因弹窗挡按钮失败，由外层 retry 兜底）"
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[!] 处理 Cookie 弹窗时异常（已忽略，不影响主流程）: {exc}")


def _wait_dialog_close(page: Page, timeout_ms: int = 60_000) -> bool:
    """等待全屏 backdrop-blur 的 <dialog> 关闭。"""
    try:
        page.wait_for_function(
            "() => !document.querySelector('dialog[open]')",
            timeout=timeout_ms,
        )
        return True
    except PlaywrightTimeoutError:
        return False


def _has_tcaptcha_mask(page: Page) -> bool:
    """页面是否正在显示腾讯滑块验证码遮罩。"""
    try:
        return bool(
            page.evaluate(
                "() => { const m = document.querySelector('#tCaptchaMaskLayer'); "
                "return !!m && m.offsetParent !== null; }"
            )
        )
    except Exception:  # noqa: BLE001
        return False


def _wait_tcaptcha_pass(
    page: Page,
    on_prompt: Optional[Callable[[], None]] = None,
    timeout_ms: int = 300_000,
) -> None:
    """
    等用户人工拖完腾讯滑块。
    若一开始就没出现遮罩，立即返回。
    若出现，则调用 on_prompt 通知用户操作，并轮询遮罩 DOM 直到消失或超时。
    """
    page.wait_for_timeout(1_500)
    if not _has_tcaptcha_mask(page):
        return  # 没出现验证码，直接放行

    if on_prompt:
        on_prompt()

    page.wait_for_function(
        "() => { const m = document.querySelector('#tCaptchaMaskLayer'); "
        "return !m || m.offsetParent === null; }",
        timeout=timeout_ms,
    )


# --------------------------------------------------------------------------- #
# Step 1~5: 提交邮箱并通过滑块验证
# --------------------------------------------------------------------------- #
def submit_signup_email(
    page: Page,
    email: str,
    on_captcha_prompt: Optional[Callable[[], None]] = None,
    captcha_timeout_ms: int = 300_000,
) -> None:
    """
    提交邮箱到 JetBrains，跑过中间确认页 + 腾讯滑块。

    on_captcha_prompt: 当检测到滑块时回调（用于 CLI 提示用户去拖）；
                      不传则脚本静默等待。
    captcha_timeout_ms: 等用户拖完的最长时间（默认 5 分钟）。
    """
    # goto 偶发会卡（CDN 慢/连续请求被节流），失败时回退到 commit 模式重试一次
    last_err: Optional[Exception] = None
    for attempt in range(2):
        try:
            page.goto(
                SIGNUP_URL,
                wait_until="domcontentloaded" if attempt == 0 else "commit",
                timeout=60_000,
            )
            last_err = None
            break
        except PlaywrightTimeoutError as e:
            last_err = e
            page.wait_for_timeout(2_000)
    if last_err:
        raise last_err
    page.wait_for_timeout(2_500)

    # goto signup 后立即处理 Cookie 弹窗（Civic Cookie Hub）
    # 等容器渲染 + 最多 5 次重试点击；无弹窗时 5 秒后跳过继续后续流程
    accept_cookies_on_current_page(page, wait_timeout_ms=5_000)
    page.wait_for_timeout(500)

    # 1) Continue with email
    cont_email = page.get_by_role("button", name="Continue with email")
    cont_email.first.wait_for(state="visible", timeout=60_000)
    cont_email.first.click()

    # 2) 邮箱框
    email_input = page.locator('input#email, input[name="email"]').first
    email_input.wait_for(state="visible", timeout=60_000)
    email_input.click()
    page.wait_for_timeout(200)
    email_input.type(email, delay=60)
    page.wait_for_timeout(400)

    # 3) 第一次 Continue（提交邮箱给后端）
    page.get_by_role("button", name="Continue").first.click()
    if not _wait_dialog_close(page, timeout_ms=45_000):
        raise RuntimeError("第 1 次 Continue 后遮罩未消失，可能被限流")
    page.wait_for_timeout(1_500)

    # 4) 再点 Continue（触发滑块）
    page.get_by_role("button", name="Continue").first.click()

    # 5) 等用户拖滑块通过
    _wait_tcaptcha_pass(
        page,
        on_prompt=on_captcha_prompt,
        timeout_ms=captcha_timeout_ms,
    )

    # 滑块过完后还有个 dialog 加载状态，等它消失
    _wait_dialog_close(page, timeout_ms=45_000)
    page.wait_for_timeout(1_500)


# --------------------------------------------------------------------------- #
# Step 6~7: 输入 6 位确认码
# --------------------------------------------------------------------------- #
def submit_confirmation_code(page: Page, code: str) -> None:
    """
    在验证码输入页填入 6 位 code。
    JetBrains 用一个或多个 input 来收集 code，常见两种实现：
        (a) 6 个 type=text/maxlength=1 的小输入框
        (b) 1 个 type=text 长输入框
    本函数对两种情况都做兼容。
    """
    # 等可输入区域出现
    page.wait_for_timeout(1_000)

    # 候选 1：多个独立输入框（带 inputmode=numeric / pattern=[0-9]）
    code_boxes = page.locator(
        'input[inputmode="numeric"], input[autocomplete="one-time-code"], '
        'input[name*="code" i], input[id*="code" i]'
    )
    count = code_boxes.count()

    if count >= len(code):
        # 一个数字一个 input
        for i, ch in enumerate(code):
            code_boxes.nth(i).click()
            page.wait_for_timeout(80)
            code_boxes.nth(i).type(ch, delay=60)
        page.wait_for_timeout(500)
    elif count >= 1:
        box = code_boxes.first
        box.click()
        page.wait_for_timeout(150)
        box.type(code, delay=60)
        page.wait_for_timeout(500)
    else:
        # 兜底：找页面唯一的 type=text 输入框
        all_text = page.locator('input[type="text"]:not([id="email"])')
        if all_text.count() == 0:
            raise RuntimeError("找不到验证码输入框")
        all_text.first.click()
        all_text.first.type(code, delay=60)
        page.wait_for_timeout(500)

    # 一些版本会自动提交，这里如果有 Continue/Verify 按钮则点击它
    for name in ("Continue", "Verify", "Submit"):
        btn = page.get_by_role("button", name=name)
        if btn.count() and btn.first.is_visible() and btn.first.is_enabled():
            btn.first.click()
            break

    _wait_dialog_close(page, timeout_ms=30_000)
    page.wait_for_timeout(1_500)


# --------------------------------------------------------------------------- #
# Step 8: 填名字、密码、勾条款、提交
# --------------------------------------------------------------------------- #
def complete_profile(
    page: Page,
    first_name: str,
    last_name: str,
    password: str,
) -> None:
    """填表完成账号创建。"""
    page.wait_for_timeout(1_500)

    def fill_first(selectors: List[str], value: str, label: str) -> None:
        for sel in selectors:
            loc = page.locator(sel).first
            if loc.count() and loc.is_visible():
                loc.click()
                page.wait_for_timeout(120)
                loc.fill("")
                loc.type(value, delay=40)
                return
        raise RuntimeError(f"未找到 {label} 输入框（试过：{selectors}）")

    fill_first(
        [
            'input[name="firstName" i]',
            'input[id*="first" i]',
            'input[placeholder*="first" i]',
            'input[autocomplete="given-name"]',
        ],
        first_name,
        "First Name",
    )
    fill_first(
        [
            'input[name="lastName" i]',
            'input[id*="last" i]',
            'input[placeholder*="last" i]',
            'input[autocomplete="family-name"]',
        ],
        last_name,
        "Last Name",
    )

    # 密码与确认密码
    pw_inputs = page.locator('input[type="password"]').all()
    if not pw_inputs:
        raise RuntimeError("未找到密码输入框")
    pw_inputs[0].click()
    pw_inputs[0].type(password, delay=40)
    if len(pw_inputs) >= 2:
        pw_inputs[1].click()
        pw_inputs[1].type(password, delay=40)

    # 勾选所有可见复选框（同意条款）
    for cb in page.locator('input[type="checkbox"]').all():
        try:
            if cb.is_visible() and not cb.is_checked():
                cb.check(force=True, timeout=1_000)
        except PlaywrightTimeoutError:
            continue

    # 提交（按钮文本可能是 Submit/Create/Sign Up/Save 等）
    submit_btn = page.get_by_role(
        "button",
        name=re.compile(r"submit|create|complete|finish|sign\s*up|save|continue", re.I),
    ).first
    if submit_btn.count() == 0:
        submit_btn = page.locator('button[type="submit"]').first
    submit_btn.click()

    _wait_dialog_close(page, timeout_ms=30_000)
    page.wait_for_timeout(2_000)

    # 真正的成功标志：URL 不再停留在 /signup
    # 等最多 25s
    try:
        page.wait_for_function(
            "() => !location.pathname.startsWith('/signup')",
            timeout=25_000,
        )
    except PlaywrightTimeoutError:
        # 还停在 /signup —— 可能有"再点一次"按钮或欢迎页，再尝试点一次
        try:
            extra_btn = page.get_by_role(
                "button",
                name=re.compile(r"continue|next|done|finish|got it|skip", re.I),
            ).first
            if extra_btn.count() and extra_btn.is_visible() and extra_btn.is_enabled():
                extra_btn.click()
                page.wait_for_timeout(3_000)
                page.wait_for_function(
                    "() => !location.pathname.startsWith('/signup')",
                    timeout=15_000,
                )
        except (PlaywrightTimeoutError, Exception):  # noqa: BLE001
            pass
    page.wait_for_timeout(1_500)


# --------------------------------------------------------------------------- #
# 浏览器封装
# --------------------------------------------------------------------------- #
class JetBrainsBrowser:
    """便捷封装：开/关浏览器，得到一个 Page。"""

    def __init__(self, headless: bool = False, slow_mo: int = 0) -> None:
        self.headless = headless
        self.slow_mo = slow_mo
        self._pw = None
        self._browser = None
        self._context = None
        self.page: Optional[Page] = None

    def __enter__(self) -> "JetBrainsBrowser":
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(
            headless=self.headless,
            slow_mo=self.slow_mo,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
                "--no-default-browser-check",
                "--no-first-run",
            ],
        )
        self._context = self._browser.new_context(
            locale="en-US",
            viewport={"width": 1440, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        self._context.add_init_script(
            """
            Object.defineProperty(navigator,'webdriver',{get:()=>undefined});
            window.chrome = window.chrome || { runtime: {} };
            Object.defineProperty(navigator,'languages',{get:()=>['en-US','en']});
            Object.defineProperty(navigator,'plugins',{get:()=>[1,2,3,4,5]});
            """
        )
        self.page = self._context.new_page()
        self.page.set_default_timeout(60_000)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        try:
            if self._context:
                self._context.close()
            if self._browser:
                self._browser.close()
        finally:
            if self._pw:
                self._pw.stop()
