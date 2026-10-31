# setup_guide_ext（設定ガイド）

GitHub と Render（dashboard.render.com）の設定画面で、「次はどこ？」を押すと、次に操作する場所を1つだけ光らせて理由を一言で教える Chrome 拡張（個人利用）。tonari_no_mago（別リポジトリ） の画面ガイドを土台に新規作成した（2026-10-31）。

詳しくは [setup_guide_ext.md](setup_guide_ext.md) を参照

## 方針
- **案内だけ**を行う（Phase A）。設定の提案・生成（`render.yaml` や GitHub Actions の workflow）は、案内の精度を確かめてから別フェーズで検討する
- 設定の反映は人が画面で行う。拡張は書き込まない
- 対象サイトは `github.com` と `dashboard.render.com` だけ（`host_permissions`）
- 画面のトークン・キー・接続URLのパスワードらしき文字列は、送信前に〔秘密情報〕へ伏せる。入力欄の値とパスワード欄は集めない

## 構成
```
extension/   Chrome拡張(MV3)。サイドパネル＋画面収集(collector.js)＋ハイライト(overlay.js)
proxy/       ローカルプロキシ(標準ライブラリのみ)。core.py=案内ロジックと秘密情報マスク、server.py=127.0.0.1:8787
tests/       core.py などの単体テスト
```

## 使い方
```
cd ~/projects/setup_guide_ext
cp .env.example .env                       # ANTHROPIC_API_KEY を記入（コミット禁止）
python3 proxy/server.py                    # API経由
TNM_BACKEND=cli python3 proxy/server.py    # Claude CLI経由（サブスク。APIキー不要）
python3 proxy/server.py --mock             # APIなしの動作確認
python3 -m unittest discover -s tests      # 単体テスト
```
`chrome://extensions` →「デベロッパーモード」→「パッケージ化されていない拡張機能を読み込む」で `extension/` を選ぶ。GitHub か Render のページでサイドパネルを開く。

## 現在の状況
- 2026-10-31: 新規作成。画面ガイドの中核を流用し、案内プロンプトを GitHub・Render 向けに書き換え、秘密情報のマスクと対象サイトの限定を追加。単体テスト23件が通る
- 未実施: Chrome 実機での確認、GitHub・Render の実画面での精度評価、アイコン画像、`TNM_` で始まる環境変数名の整理（tonari_no_mago 由来）

## 次の候補
1. 実機で GitHub・Render の画面を試し、誤案内のパターンを集める
2. 評価シナリオ（実画面のスナップショットを個人情報・秘密を伏せて保存）を作る
3. 案内が安定したら、設定の提案・生成（B）を検討する
