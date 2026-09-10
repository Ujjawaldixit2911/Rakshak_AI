"""
llm_client.py
LLM Client wrapper calling Anthropic / Groq / OpenAI with strict timeout and fallback.
"""
import os
import logging
from typing import Dict, Any, Optional
import httpx

from .prompt_templates import SYSTEM_PROMPT, format_briefing_user_prompt
from .fallback_generator import generate_fallback_briefing

logger = logging.getLogger("RakshakAI.AIBriefing.LLMClient")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

async def call_anthropic(prompt: str, timeout_sec: float = 6.0) -> Optional[str]:
    if not ANTHROPIC_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            res = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-3-5-sonnet-20241022", "max_tokens": 200, "system": SYSTEM_PROMPT, "messages": [{"role": "user", "content": prompt}]}
            )
            if res.status_code == 200:
                content = res.json().get("content", [])
                if content:
                    return content[0].get("text", "").strip()
    except Exception as e:
        logger.warning("Anthropic API failed: %s", e)
    return None

async def call_groq(prompt: str, timeout_sec: float = 6.0) -> Optional[str]:
    if not GROQ_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}], "max_tokens": 200}
            )
            if res.status_code == 200:
                choices = res.json().get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
    except Exception as e:
        logger.warning("Groq API failed: %s", e)
    return None

async def generate_safety_briefing(route_data: Dict[str, Any], timeout_sec: float = 6.0) -> Dict[str, Any]:
    prompt = format_briefing_user_prompt(route_data)

    if ANTHROPIC_API_KEY:
        text = await call_anthropic(prompt, timeout_sec=timeout_sec)
        if text:
            return {"briefing": text, "source": "anthropic_claude", "model": "claude-3-5-sonnet"}

    if GROQ_API_KEY:
        text = await call_groq(prompt, timeout_sec=timeout_sec)
        if text:
            return {"briefing": text, "source": "groq_llama", "model": "llama-3.3-70b-versatile"}

    fallback = generate_fallback_briefing(route_data)
    return {"briefing": fallback, "source": "deterministic_template", "model": "rule_based_fallback"}
