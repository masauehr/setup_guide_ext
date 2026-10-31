# setup_guide_ext（設定ガイド）

GitHub・Render（dashboard.render.com）・Supabase（supabase.com/dashboard）・XREA（xrea.com の管理画面）の設定画面で、「次はどこ？」を押すと、次に操作する場所を1つだけ光らせて理由を一言で教える Chrome 拡張（個人利用）。tonari_no_mago（別リポジトリ） の画面ガイドを土台に新規作成した（2026-10-31）。

詳しくは [setup_guide_ext.md](setup_guide_ext.md) を参照

## 方針
- **案内だけ**を行う（Phase A）。設定の提案・生成（`render.yaml` や GitHub Actions の workflow）は、案内の精度を確かめてから別フェーズで検討する
- 設定の反映は人が画面で行う。拡張は書き込まない
- 対象サイトは `github.com`、`dashboard.render.com`、`supabase.com/dashboard`、`*.xrea.com` だけ（`host_permissions`）
- 画面のトークン・キー・接続URLのパスワードらしき文字列は、送信前に〔秘密情報〕へ伏せる。入力欄の値とパスワード欄は集めない

## 構成
```
extension/   Chrome拡張(MV3)。サイドパネル＋画面収集(collector.js)＋ハイライト(overlay.js)
proxy/       ローカルプロキシ(標準ライブラリのみ)。core.py=案内ロジックと秘密情報マスク、explain.py=英文の日本語説明、server.py=127.0.0.1:8787
eval/        正答率の評価（架空ページ30件）。pages と scenarios.json は tools/build_eval_pages.py が生成
tools/       評価ページの生成
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
- 2026-10-31: **「英文を日本語で説明」ボタンを追加**（GitHub・Render・Supabase・XREA 共通）。選択した文章 > 開いているポップアップ > 画面の本文 の順に対象を決め、要点（原文の短い引用と日本語の意味）と注意をサイドパネルに表示。`proxy/explain.py`、プロキシの `/explain`、`collector.js` の `__tnmExplain`。案内の `translation`（短い訳）とは別機能
- 2026-10-31: **Supabase に対応**（`map_registry` で使っている設定の支援）。`host_permissions` に `supabase.com/dashboard` を追加、Supabase のキー（`sb_secret_…` と JWT 形式の service_role／anon キー）をマスク、案内に Supabase 特有の取り消しにくい操作（プロジェクトの削除、DB パスワードのリセット、service_role キーの表示、RLS の無効化、破壊的な SQL、Verify JWT の無効化 など）の注意を追加。ダミー画面で、Edge Function の Verify JWT を OFF にする案内と、DB パスワード確認時にリセットを選ばない動作を確認（実画面は未確認）
- 2026-10-31: **XREA に対応**（`xrea_pages` で公開サイトを置いているレンタルサーバーの管理画面）。`host_permissions` に `https://*.xrea.com/*` を追加（管理画面は `https://cp.xrea.com/`。利用者に確認済みで、このパターンに含まれる）。案内に XREA 特有の取り消しにくい操作（.htaccess の編集、SSL の解除・再発行、FTP・DB パスワード変更、ドメイン・ファイル・DB・メールの削除、ネームサーバー変更、PHP バージョン変更、cron、契約の解約 など）の注意を追加。ダミー画面で、無料 SSL の設定と、HTTPS リダイレクトの手順（SSL 確認 → .htaccess）の案内を確認（実画面は未確認）
- `manifest.json` の対象サイト限定が崩れていないかのテストを追加（`<all_urls>` を入れない、https のみ）
- 単体テスト34件が通る
- 2026-10-31: 評価基盤を追加（架空ページ30件。Haiku 22/22、注意書き 9/9（22件の時点））。詳細は下の「評価」
- 未実施: Render・Supabase・XREA の実画面での確認、実画面のスナップショットによる精度評価、アイコン画像、`TNM_` で始まる環境変数名の整理（tonari_no_mago 由来）
- 気づいた点: 吹き出しの日本語が分かりにくい場合がある（例: 「公開後も元に戻すと履歴は残ります」）。応答は CLI 経由で約4〜7秒

## 評価（架空ページ30件）
GitHub・Render・Supabase・XREA の画面構成を簡略に模した**架空ページ**（`eval/pages/`、17枚。実画面やロゴの複製ではない）で、「次に押す場所」の正答率を測る。実サイトはログインや秘密情報の問題があるため、まず架空ページで土台を作った。
```
python3 tools/build_eval_pages.py                              # ページと正解（eval/scenarios.json）を生成
PY=~/projects/tonari_no_mago/.venv/bin/python                  # playwright 入りの Python
TNM_BACKEND=cli $PY eval/run_eval.py --model haiku --auto-shot # CLI経由（サブスク）で評価
$PY eval/run_eval.py --mock                                    # APIなし（下限の目安）
```
- シナリオ: GitHub 8件（リポジトリ作成の入力順、公開範囲の変更、削除、確認ダイアログ、Secrets、文中の「AIへの指示」）、Render 14件（作成フォーム、環境変数のタブと追加、一時停止、削除、目立つ「Upgrade」への惑わされ、「+ New」メニューの種類選び8件）、Supabase 4件（Verify JWT、RLS、SQL 実行、DB パスワード）、XREA 4件（無料SSL、.htaccess、ドメイン削除、FTP パスワード）
- 指標: 正答率、取り消しにくい操作（9件）での注意書きの有無、応答時間、トークン数。判断を保留するのが妥当な1件（`sb_db_password`）は、保留も正解にする

| 構成 | 正答 | 注意書き | 平均応答 | 入力/出力トークン |
|------|------|------|------|------|
| モック（API不使用・下限の目安） | 10/22 | 0/9 | - | - |
| Haiku・CLI経由・自動画像（2026-10-31・各1回） | 22/22 | 9/9 | 4.4秒 | 72.0k / 10.0k |

- **読み方**: 自作の単純なページを1回ずつ実行した結果で、傾向を見る程度。実サイトの画面はもっと複雑（要素が多い、動的に変わる、ポップアップが重なる）ので、全問正解は実画面での精度を保証しない。実機で見つかった問題（画像取得失敗、ダイアログ内の描画、ポップアップの認識）は、架空ページでは再現しにくい
- 文中の「AIへの指示」（`gh_inject`）には従わず、目的どおり Settings を選べた
- Sonnet・画像併用は未実施
- **「+ New」メニューの種類選び（Render）**: 実機で「Blueprint を選べと言われたが、メニューの意味が分からない」という声があり、メニュー選択の評価（8件）を追加した。「Python の Web サーバー」「HTML だけ」「毎日実行」「render.yaml からまとめて作る」のように目的が明確なら、直す前から正解（5/5）。曖昧な目的では「新しいプロジェクトを作りたい」で **Project**（サービスをまとめる入れ物でデプロイ先ではない）を選ぶ、すでに開いているメニューで「+ New」を押し直す、といった迷いやすい点が見えた。Blueprint を選ぶ案内は架空ページでは再現できなかった
  - 対策（`core.py` のルール14）: メニューから種類を選ぶ場面では、`translation` に「選んだ項目が何か」と「他の項目との違い」を書く。Python の Web アプリ・API は Web Service、Project はデプロイ先ではない、Blueprint は render.yaml があると分かるときだけ、メニューが開いているときは「+ New」を押し直さない
  - 結果（Haiku・2回）: 7/8 と 8/8。残る誤答は「+ New」の押し直し（メニューの表示中に「+ New」ボタンも画面にあると、押し直す案内が揺れて出る）。1件差は揺れの範囲

## 次の候補
1. 実機で GitHub・Render・Supabase・XREA の画面を試し、誤案内のパターンを集める
2. 実画面のスナップショット（個人情報・秘密を伏せて保存）による評価を足す。架空ページ30件は作成済み
3. 案内が安定したら、設定の提案・生成（B）を検討する
