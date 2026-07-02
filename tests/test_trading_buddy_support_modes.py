import threading

import pytest

from toolsets import TOOLSETS
from tui_gateway import server
from tui_gateway.server import (
    _companion_support_prompt,
    _normalize_companion_context,
    _normalize_companion_support_mode,
    _normalize_trading_buddy_request_id,
)


def test_companion_toolset_is_conversation_only(monkeypatch):
    monkeypatch.setenv("HERMES_TUI_TOOLSETS", "trading-buddy-companion")

    assert TOOLSETS["trading-buddy-companion"]["tools"] == []
    assert TOOLSETS["trading-buddy-companion"]["includes"] == []
    assert server._load_enabled_toolsets() == ["trading-buddy-companion"]


@pytest.mark.parametrize(
    "mode, expected",
    [
        ("listen", "or ask a follow-up question"),
        ("reflect", "explicit uncertainty"),
        ("plan", "user-owned next actions"),
        ("hang_out", "without productivity pressure"),
        ("presence", "Do not repeatedly prompt"),
    ],
)
def test_support_mode_changes_real_model_prompt(mode, expected):
    prompt = _companion_support_prompt("I lost money today.", mode)

    assert expected in prompt
    assert "User message:\nI lost money today." in prompt
    assert "never guarantee returns" in prompt


@pytest.mark.parametrize("value", ["advice", "trade_for_me", 7, {}, []])
def test_support_mode_rejects_untrusted_values(value):
    with pytest.raises(ValueError):
        _normalize_companion_support_mode(value)


def test_support_mode_is_optional_for_non_companion_clients():
    assert _normalize_companion_support_mode(None) is None
    assert _companion_support_prompt("hello", None) == "hello"


def test_client_request_id_is_strict_and_bounded():
    assert _normalize_trading_buddy_request_id("request-1") == "request-1"
    assert _normalize_trading_buddy_request_id(None) is None
    for value in ("has spaces", "../escape", "x" * 129, 7, {}):
        with pytest.raises(ValueError):
            _normalize_trading_buddy_request_id(value)


def test_private_companion_context_is_bounded_and_separate_from_visible_text():
    context = "Relevant local continuity: user prefers short reflections."
    assert _normalize_companion_context(context) == context
    prompt = _companion_support_prompt("I had a rough day.", "reflect", context)

    assert context in prompt
    assert "Private local companion context" in prompt
    assert prompt.endswith("User message:\nI had a rough day.")
    with pytest.raises(ValueError):
        _normalize_companion_context("x" * 12_001)
    with pytest.raises(ValueError):
        _normalize_companion_context({"not": "text"})


def test_duplicate_prompt_submit_is_deduplicated_before_a_second_turn(monkeypatch):
    sid = "tb-live"

    class Agent:
        def interrupt(self):
            return None

    session = {
        "agent": Agent(),
        "history": [],
        "history_lock": threading.Lock(),
        "last_active": 0,
        "running": True,
        "session_key": "tb-stored",
        "trading_buddy_requests": {},
        "transport": None,
    }
    monkeypatch.setitem(server._sessions, sid, session)
    monkeypatch.setattr(server, "_load_busy_input_mode", lambda: "queue")

    first = server._methods["prompt.submit"](
        "rpc-1",
        {
            "session_id": sid,
            "text": "hello",
            "support_mode": "listen",
            "client_request_id": "request-1",
        },
    )
    second = server._methods["prompt.submit"](
        "rpc-2",
        {
            "session_id": sid,
            "text": "hello",
            "support_mode": "listen",
            "client_request_id": "request-1",
        },
    )

    assert first["result"]["status"] == "queued"
    assert second["result"] == {
        "status": "submitting",
        "client_request_id": "request-1",
        "deduplicated": True,
    }
    assert session["queued_prompt"]["text"] == "hello"


def test_ephemeral_session_never_creates_a_gateway_database_row(monkeypatch):
    monkeypatch.setattr(server, "_claim_active_session_slot", lambda *_args, **_kwargs: (None, None))
    monkeypatch.setattr(server, "_schedule_agent_build", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(server, "_schedule_session_cap_enforcement", lambda: None)
    response = server._methods["session.create"](
        "rpc-1",
        {
            "source": "trading_buddy",
            "trading_buddy_ephemeral": True,
            "model": "qwen3:4b",
            "provider": "custom",
        },
    )
    sid = response["result"]["session_id"]
    session = server._sessions.pop(sid)
    assert session["trading_buddy_ephemeral"] is True

    class ExplodingDb:
        def create_session(self, *_args, **_kwargs):
            raise AssertionError("ephemeral session attempted persistence")

    monkeypatch.setattr(server, "_get_db", lambda: ExplodingDb())
    server._ensure_session_db_row(session)

    class Agent:
        _session_db = ExplodingDb()
        _session_db_created = True
        _end_session_on_close = True

    agent = Agent()
    server._disable_trading_buddy_persistence(agent)
    assert agent._session_db is None
    assert agent._session_db_created is False
    assert agent._end_session_on_close is False
