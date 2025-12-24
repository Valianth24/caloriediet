# backend/emergentintegrations/llm/chat.py

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import List, Optional, Any, Dict

from openai import OpenAI


def _guess_mime_from_base64(b64: str) -> str:
    """
    Best-effort mime detection from base64 signature.
    Defaults to image/jpeg.
    """
    if not b64:
        return "image/jpeg"
    # PNG signature in base64 often starts with iVBORw0KGgo
    if b64.startswith("iVBORw0KGgo"):
        return "image/png"
    # JPEG often starts with /9j/
    if b64.startswith("/9j/"):
        return "image/jpeg"
    return "image/jpeg"


@dataclass
class ImageContent:
    image_base64: str
    mime_type: Optional[str] = None

    def to_openai_part(self) -> Dict[str, Any]:
        mime = self.mime_type or _guess_mime_from_base64(self.image_base64)
        data_url = f"data:{mime};base64,{self.image_base64}"
        return {"type": "image_url", "image_url": {"url": data_url}}


@dataclass
class UserMessage:
    """
    Matches the usage pattern in your server.py:
      UserMessage(text="...", file_contents=[ImageContent(...)])
    """
    text: str
    file_contents: Optional[List[ImageContent]] = None


class LlmChat:
    """
    Minimal shim to replace the non-PyPI 'emergentintegrations' dependency.

    Your server.py uses:
      chat = LlmChat(api_key=..., session_id=..., system_message=...).with_model("openai", "gpt-4o")
      response = await chat.send_message(message)

    This class provides exactly that.
    """

    def __init__(
        self,
        api_key: str = "",
        session_id: Optional[str] = None,
        system_message: Optional[str] = None,
        **kwargs: Any,
    ):
        self.api_key = api_key or ""
        self.session_id = session_id
        self.system_message = system_message or ""
        self.provider = "openai"
        self.model = "gpt-4o-mini"

    def with_model(self, provider: str, model: str) -> "LlmChat":
        self.provider = provider
        self.model = model
        return self

    async def send_message(self, message: UserMessage) -> str:
        if self.provider != "openai":
            raise RuntimeError(f"Unsupported provider: {self.provider}")

        if not self.api_key:
            raise RuntimeError("EMERGENT_LLM_KEY is empty. Set it in Render Environment.")

        # Build OpenAI chat messages
        chat_messages: List[Dict[str, Any]] = []

        if self.system_message:
            chat_messages.append({"role": "system", "content": self.system_message})

        user_parts: List[Dict[str, Any]] = [{"type": "text", "text": message.text or ""}]

        if message.file_contents:
            for fc in message.file_contents:
                if isinstance(fc, ImageContent):
                    user_parts.append(fc.to_openai_part())

        chat_messages.append({"role": "user", "content": user_parts})

        def _call_openai() -> str:
            client = OpenAI(api_key=self.api_key)
            resp = client.chat.completions.create(
                model=self.model,
                messages=chat_messages,
            )
            content = (resp.choices[0].message.content or "").strip()
            return content

        return await asyncio.to_thread(_call_openai)
