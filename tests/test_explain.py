"""explain.py の単体テスト（ネットワーク不要）。

    python3 -m unittest discover -s tests
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "proxy"))
import explain  # noqa: E402


class BuildUserTextTest(unittest.TestCase):
    def test_対象の種類が伝わる(self):
        for source, label in [("selection", "利用者が選択した文章"), ("popup", "開いているポップアップ"),
                              ("page", "画面の本文")]:
            text = explain.build_user_text({"source": source, "title": "t", "text": "Hello"})
            self.assertIn(label, text)

    def test_不明な種類は画面の本文として扱う(self):
        self.assertIn("画面の本文", explain.build_user_text({"source": "x", "text": "Hello"}))

    def test_秘密情報と個人情報を伏せる(self):
        text = explain.build_user_text({"source": "page", "title": "ghp_" + "a" * 36,
                                        "text": "token ghp_" + "b" * 36 + " mail example@example.com"})
        self.assertNotIn("ghp_", text)
        self.assertIn("〔秘密情報〕", text)
        self.assertIn("〔メール〕", text)

    def test_長い文章は切る(self):
        text = explain.build_user_text({"source": "page", "text": "a" * 20000})
        self.assertLess(len(text), explain.MAX_TEXT + 300)

    def test_モックはAPIなしで返る(self):
        r = explain.explain({"text": "Hello"}, mock=True)
        self.assertEqual(r["points"], [])
        self.assertEqual(r["model"], "mock")


if __name__ == "__main__":
    unittest.main()
