"""
tools/test_llm_connection.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Handshake script: Tests connectivity to a configured LLM provider.
Supports: groq, ollama, grok (xAI).

Usage (CLI):
    # Groq
    python tools/test_llm_connection.py --provider groq --key YOUR_KEY --model llama3-8b-8192

    # Ollama (local)
    python tools/test_llm_connection.py --provider ollama --base-url http://localhost:11434 --model llama3

    # Grok (xAI)
    python tools/test_llm_connection.py --provider grok --key YOUR_XAI_KEY --model grok-beta

Usage (as module):
    from tools.test_llm_connection import test_llm_connection
    result = test_llm_connection(provider, api_key, model, base_url)
"""

import argparse
import json
import sys


def _test_groq(api_key: str, model: str) -> dict:
    """Test Groq connection using the Groq Python SDK."""
    try:
        from groq import Groq, AuthenticationError, APIConnectionError
    except ImportError:
        return {"status": "error", "message": "groq package not installed. Run: pip install groq"}

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
        )
        return {
            "status": "ok",
            "provider": "groq",
            "model": response.model,
            "message": None,
        }
    except AuthenticationError:
        return {"status": "error", "message": "Invalid Groq API key."}
    except APIConnectionError:
        return {"status": "error", "message": "Could not connect to Groq API. Check your internet connection."}
    except Exception as e:
        # Handle model not found or other API errors
        err = str(e)
        if "model" in err.lower() and "not found" in err.lower():
            return {"status": "error", "message": f"Model '{model}' not found on Groq. Check available models."}
        return {"status": "error", "message": f"Groq error: {err}"}


def _test_ollama(base_url: str, model: str) -> dict:
    """Test Ollama connection by checking /api/tags and model availability."""
    import requests

    base_url = base_url.rstrip("/")
    try:
        # Check if Ollama server is reachable
        resp = requests.get(f"{base_url}/api/tags", timeout=5)
        if resp.status_code != 200:
            return {"status": "error", "message": f"Ollama server responded with HTTP {resp.status_code}."}

        # Check if the requested model is available
        available_models = [m["name"] for m in resp.json().get("models", [])]
        model_names = [m.split(":")[0] for m in available_models]  # strip tags like :latest

        if model not in available_models and model not in model_names:
            return {
                "status": "error",
                "message": f"Model '{model}' not found in Ollama. Available: {', '.join(available_models) or 'none pulled yet'}",
            }

        return {
            "status": "ok",
            "provider": "ollama",
            "model": model,
            "message": None,
        }
    except requests.exceptions.ConnectionError:
        return {"status": "error", "message": f"Cannot reach Ollama at {base_url}. Is the server running?"}
    except requests.exceptions.Timeout:
        return {"status": "error", "message": "Ollama server timed out."}
    except Exception as e:
        return {"status": "error", "message": f"Ollama error: {str(e)}"}


def _test_grok(api_key: str, model: str) -> dict:
    """Test Grok (xAI) connection using OpenAI SDK with xAI base URL."""
    try:
        from openai import OpenAI, AuthenticationError, APIConnectionError
    except ImportError:
        return {"status": "error", "message": "openai package not installed. Run: pip install openai"}

    try:
        client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
        )
        return {
            "status": "ok",
            "provider": "grok",
            "model": response.model,
            "message": None,
        }
    except AuthenticationError:
        return {"status": "error", "message": "Invalid xAI API key."}
    except APIConnectionError:
        return {"status": "error", "message": "Could not connect to xAI API. Check your internet connection."}
    except Exception as e:
        return {"status": "error", "message": f"Grok error: {str(e)}"}


def test_llm_connection(
    provider: str,
    api_key: str = None,
    model: str = None,
    base_url: str = None,
) -> dict:
    """
    Unified LLM connection test. Routes to provider-specific function.

    Returns:
        {
            "status": "ok" | "error",
            "provider": str | None,
            "model": str | None,
            "message": str | None
        }
    """
    provider = provider.lower().strip()

    if provider == "groq":
        if not api_key:
            return {"status": "error", "message": "Groq requires an API key."}
        if not model:
            return {"status": "error", "message": "Groq requires a model name (e.g. llama3-8b-8192)."}
        return _test_groq(api_key, model)

    elif provider == "ollama":
        if not base_url:
            base_url = "http://localhost:11434"
        if not model:
            return {"status": "error", "message": "Ollama requires a model name (e.g. llama3)."}
        return _test_ollama(base_url, model)

    elif provider == "grok":
        if not api_key:
            return {"status": "error", "message": "Grok (xAI) requires an API key."}
        if not model:
            return {"status": "error", "message": "Grok requires a model name (e.g. grok-beta)."}
        return _test_grok(api_key, model)

    else:
        return {
            "status": "error",
            "message": f"Unknown provider '{provider}'. Supported: groq, ollama, grok",
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test LLM provider connection")
    parser.add_argument("--provider", required=True, choices=["groq", "ollama", "grok"], help="LLM provider")
    parser.add_argument("--key", default=None, help="API key (Groq or Grok)")
    parser.add_argument("--model", required=True, help="Model name")
    parser.add_argument("--base-url", default=None, help="Base URL (Ollama only)")
    args = parser.parse_args()

    result = test_llm_connection(
        provider=args.provider,
        api_key=args.key,
        model=args.model,
        base_url=args.base_url,
    )
    print(json.dumps(result, indent=2))

    if result["status"] == "ok":
        print(f"\n✅ {result['provider'].upper()} connected using model: {result['model']}")
        sys.exit(0)
    else:
        print(f"\n❌ LLM connection failed: {result['message']}")
        sys.exit(1)
