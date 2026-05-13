from __future__ import annotations

import unittest

from pydantic import ValidationError

from app.api.ws import _bounded_float
from app.models.schemas import SimulationConfig
from app.security import allowed_hosts, allowed_origins, is_allowed_origin


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

    def test_security_defaults_are_not_wildcards(self) -> None:
        self.assertNotIn("*", allowed_origins())
        self.assertNotIn("*", allowed_hosts())

    def test_manual_move_input_is_finite_and_bounded(self) -> None:
        self.assertEqual(_bounded_float("nan", default=0.0, minimum=-1.0, maximum=1.0), 0.0)
        self.assertEqual(_bounded_float(999, default=0.0, minimum=-1.0, maximum=1.0), 1.0)
        self.assertEqual(_bounded_float(-999, default=0.0, minimum=-1.0, maximum=1.0), -1.0)


if __name__ == "__main__":
    unittest.main()
