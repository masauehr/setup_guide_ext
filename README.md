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
- 2026-10-31: 新規作成。画面ガイドの中核を流用し、案内プロンプトを GitHub・Render 向けに書き換え、秘密情報のマスクと対象サイトの限定を追加
- 2026-10-31: **GitHub の実画面で動作確認**（リポジトリを public にする操作で、確認ダイアログのボタンへの案内を確認）。実機で見つかった問題を修正済み:
  - スクリーンショットが撮れず `Either the '<all_urls>' or 'activeTab' permission is required.` が出た → 画像は撮れたときだけ使い、撮れなければ文字情報だけで案内（`sidepanel.js`）。画像も使うには、そのタブで拡張のアイコンを押してパネルを開き直す
  - モーダルダイアログ（`<dialog>`）は最前面レイヤーに出るため、赤枠がダイアログの裏に隠れた → 対象がダイアログ内なら枠と吹き出しをその中に描く（`overlay.js`）
  - ポップアップの文章が届かず、背後のボタンも要素に混ざっていた → ポップアップが開いているときは中の要素だけを対象にし、見出しと文章を別に送る（`collector.js`、`core.py`）
- 2026-10-31: **英語の画面への対応**。案内文の英語の用語に日本語訳を括弧で添え、画面・ポップアップの英文の意味を `translation` としてサイドパネルに青い枠で表示（`core.py`、`sidepanel.js`）。Render の画面は英語のため追加。翻訳は Claude の生成なので、課金・削除・権限に関わる文は原文も確認すること
- 単体テスト25件が通る
- 未実施: Render の実画面での確認、評価シナリオ（実画面のスナップショットによる精度評価）、アイコン画像、`TNM_` で始まる環境変数名の整理（tonari_no_mago 由来）
- 気づいた点: 吹き出しの日本語が分かりにくい場合がある（例: 「公開後も元に戻すと履歴は残ります」）。応答は CLI 経由で約4〜7秒

## 次の候補
1. 実機で GitHub・Render の画面を試し、誤案内のパターンを集める
2. 評価シナリオ（実画面のスナップショットを個人情報・秘密を伏せて保存）を作る
3. 案内が安定したら、設定の提案・生成（B）を検討する
