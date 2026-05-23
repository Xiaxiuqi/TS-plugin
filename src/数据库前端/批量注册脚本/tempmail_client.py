"""
tempmail.ing API 客户端
基于对 https://tempmail.ing 前端 app.js 的逆向：
  - POST  https://api.tempmail.ing/api/generate           {"duration": 10}
  - GET   https://api.tempmail.ing/api/emails/{address}   返回邮件列表（含 content/text）

注意：这是公共服务，请勿滥用，遵守其 Terms of Service。
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import List, Optional

import httpx

API_BASE = "https://api.tempmail.ing"

# JetBrains 已经识别为一次性邮箱的域名 —— 注册必败，跳过
# 任意一项是子串都会被拒（这样 "iby" 能匹配 ibymail.com / iby.xyz 等）
BLOCKED_DOMAIN_SUBSTRINGS: List[str] = [
    "iby",  # 用户报告 JetBrains 已识别
    "deepask.app",  # 用户指定黑名单
    "animatimg.com",
    "aniimate.net",
    "gettranslation.app",
]

# 模拟正常浏览器请求头，降低被风控概率
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Origin": "https://tempmail.ing",
    "Referer": "https://tempmail.ing/",
}


@dataclass
class TempEmail:
    address: str
    raw: dict


class TempMailClient:
    """tempmail.ing 简易客户端。"""

    def __init__(self, duration_minutes: int = 30, timeout: float = 20.0) -> None:
        self.duration_minutes = duration_minutes
        self._client = httpx.Client(headers=DEFAULT_HEADERS, timeout=timeout)
        self.email: Optional[TempEmail] = None

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "TempMailClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    # ---------- 邮箱生成 ----------
    @staticmethod
    def _domain_blocked(address: str) -> bool:
        """命中黑名单子串则视为被 JetBrains 拉黑的域名。"""
        domain = address.split("@", 1)[-1].lower()
        return any(bad in domain for bad in BLOCKED_DOMAIN_SUBSTRINGS)

    def generate(self, max_retries: int = 8) -> TempEmail:
        """生成一个新的临时邮箱地址；命中黑名单域名则自动重申请。"""
        last_addr: Optional[str] = None
        for attempt in range(max_retries):
            resp = self._client.post(
                f"{API_BASE}/api/generate",
                json={"duration": self.duration_minutes},
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("success"):
                raise RuntimeError(f"tempmail generate failed: {data}")

            email_obj = data["email"]
            addr = email_obj["address"]

            if self._domain_blocked(addr):
                last_addr = addr
                print(f"[tempmail] 跳过黑名单域名: {addr}（重新申请，第 {attempt + 1} 次）")
                # 短暂等一下再申请，避免触发 tempmail.ing 限流
                time.sleep(1.2)
                continue

            self.email = TempEmail(address=addr, raw=email_obj)
            return self.email

        raise RuntimeError(
            f"连续 {max_retries} 次申请到的全是黑名单域名（最后一个：{last_addr}），"
            f"请扩大 BLOCKED_DOMAIN_SUBSTRINGS 或换其他邮箱方案。"
        )

    def add_blocked_domain(self, address_or_domain: str) -> None:
        """运行时把一个域名/子串拉黑。"""
        token = address_or_domain.split("@", 1)[-1].lower()
        if token and token not in BLOCKED_DOMAIN_SUBSTRINGS:
            BLOCKED_DOMAIN_SUBSTRINGS.append(token)
            print(f"[tempmail] 已动态拉黑域名: {token}")

    # ---------- 收件箱 ----------
    def list_emails(self) -> List[dict]:
        """返回当前邮箱的全部邮件（按到达顺序）。"""
        if not self.email:
            raise RuntimeError("Email not generated yet, call generate() first.")
        resp = self._client.get(
            f"{API_BASE}/api/emails/{self.email.address}",
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("success"):
            raise RuntimeError(f"tempmail list_emails failed: {data}")
        return data.get("emails", [])

    def wait_for_email(
        self,
        sender_keyword: str = "jetbrains",
        subject_keyword: Optional[str] = None,
        timeout: float = 180.0,
        poll_interval: float = 4.0,
    ) -> dict:
        """轮询等待匹配的邮件到达，返回邮件 dict。"""
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                emails = self.list_emails()
            except Exception as exc:  # noqa: BLE001
                print(f"[tempmail] list_emails 异常，重试中: {exc}")
                emails = []

            for em in emails:
                from_addr = (em.get("from_address") or "").lower()
                subject = (em.get("subject") or "").lower()
                if sender_keyword.lower() not in from_addr:
                    continue
                if subject_keyword and subject_keyword.lower() not in subject:
                    continue
                return em

            time.sleep(poll_interval)

        raise TimeoutError(
            f"等待邮件超时（{timeout}s），sender_keyword={sender_keyword!r}"
        )

    # ---------- 工具方法 ----------
    @staticmethod
    def extract_confirmation_code(email: dict, length: int = 6) -> str:
        """
        从 JetBrains 确认码邮件中提取一次性验证码。
        邮件格式（HTML 与纯文本）大致是：
            Here's the one-time code to confirm your email address ...
            <span style="font-size: 24px; font-weight: bold;">482411</span>
        策略：优先在 text 中匹配独立的 6 位数字；找不到再去 HTML 里抽。
        """
        text = email.get("text") or ""
        html = email.get("content") or ""

        # 1) 在纯文本里找连续 N 位数字（独立成段、前后有空白/换行）
        m = re.search(rf"(?<!\d)(\d{{{length}}})(?!\d)", text)
        if m:
            return m.group(1)

        # 2) 在 HTML 里找
        # 先去除 HTML 标签，避免命中文件路径里的数字串
        plain = re.sub(r"<[^>]+>", " ", html)
        m = re.search(rf"(?<!\d)(\d{{{length}}})(?!\d)", plain)
        if m:
            return m.group(1)

        raise ValueError(f"未在邮件中找到 {length} 位确认码")

    @staticmethod
    def extract_verification_link(email: dict, host_keyword: str = "jetbrains") -> str:
        """
        从邮件正文中提取验证链接。
        优先 HTML 内容，其次纯文本；返回第一个包含 host_keyword 的 http(s) 链接。
        """
        candidates: List[str] = []
        for field in ("content", "text", "html"):
            body = email.get(field)
            if not body:
                continue
            # 抓取所有 http(s) URL
            urls = re.findall(r'https?://[^\s"\'<>)]+', body)
            candidates.extend(urls)

        # 先按 host_keyword 过滤
        for url in candidates:
            if host_keyword.lower() in url.lower():
                # 去除 HTML 实体尾部的 ; 等
                return url.rstrip(".,;)")

        if candidates:
            return candidates[0].rstrip(".,;)")

        raise ValueError("未在邮件中找到 http(s) 链接")
