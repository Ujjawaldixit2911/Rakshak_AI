"""
llm_client.py
LLM Client Wrapper for Rakshak AI Safety Briefing Module.
Calls Anthropic Claude, Groq, or OpenAI APIs with strict anti-hallucination prompts.
Automatically falls back to deterministic template generator upon timeouts or API unavailability.
"""
import os
import json
import logging
from typing import Dict, Any, Optional
import httpx

from .prompt_templates import SYSTEM_PROMPT, format_briefing_user_prompt
from .fallback_generator import generate_fallback_briefing

logger = logging.getLogger("RakshakAI.AIBriefing.LLMClient")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


async def call_anthropic_api(user_prompt: str, timeout_sec: float = 6.0) -> Optional[str]:
    """Invokes Anthropic Claude Messages API."""
    if not ANTHROPIC_API_KEY:
        return None

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    payload = {
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 250,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}]
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                content = data.get("content", [])
                if content and isinstance(content, list):
                    return content[0].get("text", "").strip()
            else:
                logger.warning("Anthropic API returned status %s: %s", res.status_code, res.text)
    except Exception as e:
        logger.warning("Anthropic API call failed: %s", e)
    return None


async def call_groq_api(user_prompt: str, timeout_sec: float = 6.0) -> Optional[str]:
    """Invokes Groq LLaMA 3.3 Fast Inference API."""
    if not GROQ_API_KEY:
        return None

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 200
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
            else:
                logger.warning("Groq API returned status %s: %s", res.status_code, res.text)
    except Exception as e:
        logger.warning("Groq API call failed: %s", e)
    return None


async def generate_safety_briefing(route_data: Dict[str, Any], timeout_sec: float = 6.0) -> Dict[str, Any]:
    """
    Primary safety briefing generation pipeline:
    1. Formats tightly-scoped prompt.
    2. Calls Anthropic / Groq / OpenAI LLM APIs with timeout.
    3. If LLM succeeds, returns generated text.
    4. If LLM times out or is offline, seamlessly returns deterministic fallback template.
    """
    user_prompt = format_briefing_user_prompt(route_data)

    # 1. Try Anthropic Claude
    if ANTHROPIC_API_KEY:
        text = await call_anthropic_api(user_prompt, timeout_sec=timeout_sec)
        if text:
            return {"briefing": text, "source": "anthropic_claude", "model": "claude-3-5-sonnet"}

    # 2. Try Groq LLaMA
    if GROQ_API_KEY:
        text = await call_groq_api(user_prompt, timeout_sec=timeout_sec)
        if text:
            return {"briefing": text, "source": "groq_llama", "model": "llama-3.3-70b-versatile"}

    # 3. Deterministic Fallback Template (Zero-hallucination rule guarantee)
    logger.info("Using deterministic fallback generator for safety briefing.")
    fallback_text = generate_fallback_briefing(route_data)
    return {
        "briefing": fallback_text,
        "source": "deterministic_template",
        "model": "rule_based_fallback"
    }
