from __future__ import annotations

import unittest
from unittest.mock import patch

from pydantic import ValidationError

from app.api.ws import _bounded_float, _claim_tick_owner, _release_tick_owner
from app.dependencies import get_engine, normalize_session_id
from app.models.schemas import SimulationConfig
from app.security import allowed_hosts, allowed_origin_regex, allowed_origins, is_allowed_origin


class SecurityHardeningTests(unittest.TestCase):
    def test_config_rejects_unbounded_agent_counts(self) -> None:
        with self.assertRaises(ValidationError):
            SimulationConfig(collector_count=10_000)

    def test_config_rejects_non_finite_numbers(self) -> None:
        with self.assertRaises(ValidationError):
            SimulationConfig(width=float("inf"))

    def test_config_rejects_inconsistent_ranges(self) -> None:
        with self.assertRaises(ValidationError):
            SimulationConfig(trash_cluster_min=10, trash_cluster_max=1)

    def test_origin_allowlist_rejects_untrusted_browser_origins(self) -> None:
        self.assertTrue(is_allowed_origin("http://localhost:3000"))
        self.assertTrue(is_allowed_origin(None))
        self.assertFalse(is_allowed_origin("https://attacker.example"))

    def test_origin_allowlist_accepts_configured_preview_wildcards(self) -> None:
        with patch.dict(
            "os.environ",
            {
                "ALLOWED_ORIGINS": (
                    "https://marine-plastic-simulation.vercel.app,"
                    "https://marine-plastic-simulation-*.vercel.app"
                )
            },
        ):
            self.assertTrue(is_allowed_origin("https://marine-plastic-simulation.vercel.app"))
            self.assertTrue(
                is_allowed_origin("https://marine-plastic-simulation-git-fix-demo.vercel.app")
            )
            self.assertFalse(is_allowed_origin("https://other-project.vercel.app"))
            self.assertRegex(
                "https://marine-plastic-simulation-git-fix-demo.vercel.app",
                allowed_origin_regex() or "",
            )

    def test_security_defaults_are_not_wildcards(self) -> None:
        self.assertNotIn("*", allowed_origins())
        self.assertNotIn("*", allowed_hosts())

    def test_manual_move_input_is_finite_and_bounded(self) -> None:
        self.assertEqual(_bounded_float("nan", default=0.0, minimum=-1.0, maximum=1.0), 0.0)
        self.assertEqual(_bounded_float(999, default=0.0, minimum=-1.0, maximum=1.0), 1.0)
        self.assertEqual(_bounded_float(-999, default=0.0, minimum=-1.0, maximum=1.0), -1.0)

    def test_session_ids_are_normalized_for_engine_lookup(self) -> None:
        self.assertEqual(normalize_session_id(None), "default")
        self.assertEqual(normalize_session_id(" pc 1/demo "), "pc-1-demo")
        self.assertLessEqual(len(normalize_session_id("x" * 200)), 64)

    def test_distinct_sessions_get_distinct_engines(self) -> None:
        self.assertIs(get_engine(None), get_engine("default"))
        self.assertIsNot(get_engine("test-session-a"), get_engine("test-session-b"))

    def test_only_one_websocket_ticks_each_session(self) -> None:
        first = object()
        second = object()
        session_id = "test-tick-owner"
        try:
            self.assertTrue(_claim_tick_owner(session_id, first))
            self.assertTrue(_claim_tick_owner(session_id, first))
            self.assertFalse(_claim_tick_owner(session_id, second))
            _release_tick_owner(session_id, first)
            self.assertTrue(_claim_tick_owner(session_id, second))
        finally:
            _release_tick_owner(session_id, first)
            _release_tick_owner(session_id, second)


if __name__ == "__main__":
    unittest.main()
