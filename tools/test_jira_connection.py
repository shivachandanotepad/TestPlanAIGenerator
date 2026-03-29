"""
tools/test_jira_connection.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Handshake script: Verifies Jira Cloud credentials by calling /rest/api/3/myself.
Returns a standardized JSON result.

Usage (CLI):
    python tools/test_jira_connection.py \
        --url https://workspace.atlassian.net \
        --email user@example.com \
        --token YOUR_API_TOKEN

Usage (as module):
    from tools.test_jira_connection import test_jira_connection
    result = test_jira_connection(base_url, email, api_token)
"""

import argparse
import base64
import json
import sys

import requests


def test_jira_connection(base_url: str, email: str, api_token: str) -> dict:
    """
    Verify Jira credentials by hitting /rest/api/3/myself.

    Returns:
        {
            "status": "ok" | "error",
            "display_name": str | None,
            "account_id": str | None,
            "message": str | None
        }
    """
    base_url = base_url.rstrip("/")
    endpoint = f"{base_url}/rest/api/3/myself"

    # Encode credentials as Basic Auth
    credentials = f"{email}:{api_token}"
    encoded = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")

    headers = {
        "Authorization": f"Basic {encoded}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    try:
        response = requests.get(endpoint, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            return {
                "status": "ok",
                "display_name": data.get("displayName"),
                "account_id": data.get("accountId"),
                "email": data.get("emailAddress"),
                "message": None,
            }
        elif response.status_code == 401:
            return {
                "status": "error",
                "display_name": None,
                "account_id": None,
                "message": "Authentication failed. Check your email and API token.",
            }
        elif response.status_code == 403:
            return {
                "status": "error",
                "display_name": None,
                "account_id": None,
                "message": "Access forbidden. Your API token may lack required permissions.",
            }
        else:
            return {
                "status": "error",
                "display_name": None,
                "account_id": None,
                "message": f"Unexpected response: HTTP {response.status_code} — {response.text[:200]}",
            }

    except requests.exceptions.ConnectionError:
        return {
            "status": "error",
            "display_name": None,
            "account_id": None,
            "message": f"Could not connect to {base_url}. Check the base URL.",
        }
    except requests.exceptions.Timeout:
        return {
            "status": "error",
            "display_name": None,
            "account_id": None,
            "message": "Connection timed out after 10 seconds.",
        }
    except Exception as e:
        return {
            "status": "error",
            "display_name": None,
            "account_id": None,
            "message": f"Unexpected error: {str(e)}",
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Jira Cloud connection")
    parser.add_argument("--url", required=True, help="Jira base URL (e.g. https://workspace.atlassian.net)")
    parser.add_argument("--email", required=True, help="Atlassian account email")
    parser.add_argument("--token", required=True, help="Jira API token")
    args = parser.parse_args()

    result = test_jira_connection(args.url, args.email, args.token)
    print(json.dumps(result, indent=2))

    if result["status"] == "ok":
        print(f"\n✅ Connected as: {result['display_name']} ({result['email']})")
        sys.exit(0)
    else:
        print(f"\n❌ Connection failed: {result['message']}")
        sys.exit(1)
