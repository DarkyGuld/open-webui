"""Milestone 1 integration tests: setting persistence across the API.

These run against a locally running Open WebUI fork backend (default
http://127.0.0.1:8080). They are skipped automatically when the server is not
reachable or the test admin cannot authenticate.

Dev credentials come from env (defaults are throwaway local values):
  PAW_TEST_EMAIL, PAW_TEST_PASSWORD
"""

import os

import httpx
import pytest

BASE = os.getenv("PAW_TEST_BASE_URL", "http://127.0.0.1:8080")
EMAIL = os.getenv("PAW_TEST_EMAIL", "admin@paw.local")
PASSWORD = os.getenv("PAW_TEST_PASSWORD", "PawLocalAdmin123!")


def _client():
    return httpx.Client(base_url=BASE, timeout=10.0)


@pytest.fixture(scope="module")
def token():
    try:
        with _client() as c:
            r = c.post("/api/v1/auths/signin", json={"email": EMAIL, "password": PASSWORD})
    except Exception as e:  # server not running
        pytest.skip(f"backend not reachable: {e}")
    if r.status_code != 200:
        pytest.skip(f"test admin cannot sign in ({r.status_code})")
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_global_setting_persists(token):
    with _client() as c:
        original = c.get("/api/v1/chats/config", headers=_auth(token)).json()
        assert "ENABLE_INTELLIGENT_UI" in original

        try:
            # flip on
            payload = {**original, "ENABLE_INTELLIGENT_UI": True}
            c.post("/api/v1/chats/config", headers=_auth(token), json=payload)
            # re-read (fresh request = persistence)
            after = c.get("/api/v1/chats/config", headers=_auth(token)).json()
            assert after["ENABLE_INTELLIGENT_UI"] is True

            # global flag is exposed (authenticated) in /api/config features
            cfg = c.get("/api/config", headers=_auth(token)).json()
            assert cfg["features"]["enable_intelligent_ui"] is True
        finally:
            payload = {**original, "ENABLE_INTELLIGENT_UI": False}
            c.post("/api/v1/chats/config", headers=_auth(token), json=payload)
            restored = c.get("/api/v1/chats/config", headers=_auth(token)).json()
            assert restored["ENABLE_INTELLIGENT_UI"] is False


def test_user_setting_persists(token):
    with _client() as c:
        original = c.get("/api/v1/users/user/settings", headers=_auth(token)).json() or {}
        original_ui = dict(original.get("ui") or {})
        try:
            c.post(
                "/api/v1/users/user/settings/update",
                headers=_auth(token),
                json={"ui": {"intelligentUi": True}},
            )
            after = c.get("/api/v1/users/user/settings", headers=_auth(token)).json()
            assert (after.get("ui") or {}).get("intelligentUi") is True
        finally:
            c.post(
                "/api/v1/users/user/settings/update",
                headers=_auth(token),
                json={"ui": {"intelligentUi": original_ui.get("intelligentUi", False)}},
            )


def test_chat_param_persists(token):
    with _client() as c:
        created = c.post(
            "/api/v1/chats/new",
            headers=_auth(token),
            json={"chat": {"params": {"intelligent_ui": "on"}, "messages": [], "history": {}}},
        )
        assert created.status_code == 200, created.text
        chat_id = created.json()["id"]
        try:
            fetched = c.get(f"/api/v1/chats/{chat_id}", headers=_auth(token)).json()
            assert (fetched.get("chat") or {}).get("params", {}).get("intelligent_ui") == "on"
        finally:
            c.delete(f"/api/v1/chats/{chat_id}", headers=_auth(token))


def test_global_off_exposed_as_false(token):
    """After the suite, the global default must be OFF (stock behavior)."""
    with _client() as c:
        cfg = c.get("/api/config", headers=_auth(token)).json()
        assert cfg["features"]["enable_intelligent_ui"] is False
