// サイドパネル：「次はどこ？」ボタン → 画面収集 → プロキシ → ハイライト
const PROXY = 'http://127.0.0.1:8787';

const $ = (id) => document.getElementById(id);
const history = [];

const activeTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
};

const show = (html) => { $('result').innerHTML = html; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 画面の操作対象を集める（入力値は集めない）
const collect = async (tab) => {
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['collector.js', 'overlay.js'] });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id }, func: () => window.__tnmCollect()
  });
  return result;
};

const captureShot = async (tab) => {
  const url = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 60 });
  return { media_type: 'image/jpeg', data: url.split(',')[1] };
};

// 画像は撮れたときだけ使う（activeTab が付いていないタブでは撮れない）
// 画面の英文の日本語訳（あるときだけ）
const transNote = (r) => (r.translation
  ? `<div class="translation"><b>画面の英文の意味</b><br>${esc(r.translation).replace(/\n/g, '<br>')}</div>`
  : '');

const shotNote = (failed) => (failed
  ? '<div class="sub">画像は使えませんでした（文字情報だけで案内しています）。画像も使うには、このタブで拡張のアイコンを押してパネルを開き直してください。</div>'
  : '');

const tryShot = async (tab) => {
  try { return await captureShot(tab); } catch (e) { return null; }
};

const askProxy = async (body) => {
  let res;
  try {
    res = await fetch(`${PROXY}/guide`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error('中継プログラムに接続できません。proxy/server.py が起動しているか確認してください。');
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '案内を取得できませんでした。');
  return json;
};

const highlight = (tab, r) => chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (id, reason, caution) => window.__tnmHighlight(id, reason, caution),
  args: [r.target_id, r.reason, r.caution]
});

$('help').addEventListener('click', async () => {
  const btn = $('help');
  btn.disabled = true;
  show('画面を見ています…');
  try {
    const tab = await activeTab();
    let page;
    try {
      page = await collect(tab);
    } catch (e) {
      throw new Error('このページでは使えません。GitHub・Render・Supabase・XREA の画面で試してください。');
    }
    const body = {
      page,
      goal: $('goal').value.trim(),
      history,
      model: $('strong').checked ? 'sonnet' : 'haiku'
    };
    // 文字のないボタン（アイコン）があるときは、設定に関わらず画像も渡す
    let shotFailed = false;
    if ($('shot').checked || page.unlabeled > 0) {
      const shot = await tryShot(tab);
      if (shot) body.screenshot = shot; else shotFailed = true;
    }

    const r = await askProxy(body);
    if (r.target_id) {
      await highlight(tab, r);
      history.push(r.reason);
      show(`${esc(r.reason)}` +
        (r.caution ? `<div class="caution">⚠ ${esc(r.caution)}</div>` : '') +
        (r.confidence === 'low' ? '<div class="sub">自信がありません。念のため確認してください。</div>' : '') +
        transNote(r) + shotNote(shotFailed));
    } else {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.__tnmClear && window.__tnmClear() });
      show(esc(r.reason || '公式ドキュメントや担当者に確認しましょう') + transNote(r) + shotNote(shotFailed));
    }
  } catch (e) {
    show(`<span class="error">${esc(e.message)}</span>`);
  } finally {
    btn.disabled = false;
  }
});

// やりたいことを変えたら、これまでの案内の履歴は捨てる
$('goal').addEventListener('input', () => { history.length = 0; });

// ---------- 英文を日本語で説明 ----------
const SOURCE_TEXT = { selection: '選択した文章を説明しています', popup: 'ポップアップの内容を説明しています', page: '画面の本文を説明しています' };

const renderExplain = (r, source) => {
  const html = [`<div class="sub">${esc(SOURCE_TEXT[source] || SOURCE_TEXT.page)}</div>`];
  if (r.summary) html.push(`<p class="ex-summary">${esc(r.summary)}</p>`);
  if (r.cautions && r.cautions.length) {
    html.push('<div class="ex-caution"><b>⚠ 注意</b><ul>' + r.cautions.map((c) => `<li>${esc(c)}</li>`).join('') + '</ul></div>');
  }
  if (r.points && r.points.length) {
    html.push('<ul class="ex-points">' + r.points.map((p) =>
      `<li><span class="en">${esc(p.english)}</span>${esc(p.meaning)}</li>`).join('') + '</ul>');
  }
  html.push('<div class="sub">課金・削除・権限に関わる文は、原文も見て判断してください。</div>');
  $('explain').innerHTML = html.join('');
};

$('explain-btn').addEventListener('click', async () => {
  const btn = $('explain-btn');
  btn.disabled = true;
  $('explain').textContent = '英文を読んでいます…';
  try {
    const tab = await activeTab();
    let doc;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['collector.js'] });
      [{ result: doc }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: () => window.__tnmExplain()
      });
    } catch (e) {
      throw new Error('このページでは使えません。GitHub・Render・Supabase・XREA の画面で試してください。');
    }
    let res;
    try {
      res = await fetch(`${PROXY}/explain`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: doc.title, text: doc.text, source: doc.source, model: $('strong').checked ? 'sonnet' : 'haiku' })
      });
    } catch (e) {
      throw new Error('中継プログラムに接続できません。proxy/server.py が起動しているか確認してください。');
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || '説明を取得できませんでした。');
    renderExplain(json, doc.source);
  } catch (e) {
    $('explain').innerHTML = `<span class="error">${esc(e.message)}</span>`;
  } finally {
    btn.disabled = false;
  }
});
