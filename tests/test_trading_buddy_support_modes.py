import pytest

from tui_gateway.server import (
    _companion_support_prompt,
    _normalize_companion_support_mode,
)


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
