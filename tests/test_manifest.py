"""manifest.json の単体テスト（対象サイトの限定が崩れていないか）。

    python3 -m unittest discover -s tests
"""
import json
import unittest
from pathlib import Path

MANIFEST = json.loads((Path(__file__).resolve().parent.parent / "extension" / "manifest.json")
                      .read_text(encoding="utf-8"))


class ManifestTest(unittest.TestCase):
    def test_全サイトを許可していない(self):
        hosts = MANIFEST["host_permissions"]
        self.assertNotIn("<all_urls>", hosts)
        self.assertFalse([h for h in hosts if h in ("*://*/*", "https://*/*", "http://*/*")])

    def test_対象サイトが入っている(self):
        hosts = MANIFEST["host_permissions"]
        for site in ("https://github.com/*", "https://dashboard.render.com/*",
                     "https://supabase.com/dashboard/*", "https://*.xrea.com/*",
                     "https://console.cron-job.org/*"):
            self.assertIn(site, hosts)

    def test_httpsだけ(self):
        self.assertTrue(all(h.startswith("https://") for h in MANIFEST["host_permissions"]))


if __name__ == "__main__":
    unittest.main()
