// スケジュール画面：Today/Week/Month、30分グリッド、ドラッグ追加、Firestore連携、自動提案（ON/OFF）

import { 
  saveScheduleEventToFirestore, 
  deleteScheduleEventFromFirestore,
  getAllScheduleEventsFromFirestore 
} from './firestore-service.js';
import { auth } from './main.js';

const STORAGE_KEY = 'visuy-schedule-v1';

// 現在のユーザーIDを取得
function getUserId() {
  const user = auth.currentUser;
  return user ? user.uid : null;
}

export async function setupScheduleUI() {
  // フッターナビゲーションのボタンクリックはmain.jsで処理されるため、ここではタブ切り替えのみ設定
  
  const tabButtons = document.querySelectorAll('.tabs-schedule .tab-btn');
  tabButtons.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));

  // Firestoreからデータを読み込んでから描画
  await loadScheduleData();
  
  renderToday();
  renderWeek();
  renderMonth();
  
  // ON/OFF時間設定が更新されたら再描画
  window.addEventListener('onoff-time-updated', () => {
    renderToday();
    renderWeek();
    renderMonth();
  });
}

function switchView(view) {
  document.querySelectorAll('.tabs-schedule .tab-btn').forEach(b=>b.classList.remove('active'));
  const activeBtn = document.querySelector(`.tabs-schedule .tab-btn[data-view="${view}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  document.querySelectorAll('.schedule-view').forEach(v=>v.classList.remove('active'));
  document.getElementById(`schedule-${view}`).classList.add('active');
}

// スケジュールデータの読み込み（Firestore優先、フォールバックはローカルストレージ）
async function loadScheduleData() {
  const userId = getUserId();
  if (userId) {
    try {
      const events = await getAllScheduleEventsFromFirestore(userId);
      // ローカルストレージにもバックアップ
      if (events.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }));
      }
      return { events };
    } catch (error) {
      console.error('Firestore読み込み失敗、ローカルストレージから読み込み:', error);
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { events: [] };
    }
  } else {
    // 未ログイン時はローカルストレージのみ
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { events: [] };
  }
}

function getData() {
  // 同期関数として残す（既存コードとの互換性）
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { events: [] };
}

async function setData(data) {
  const userId = getUserId();
  
  // ローカルストレージに保存（即座に反映）
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  // Firestoreに保存（各イベントを個別に保存）
  if (userId && data.events) {
    try {
      for (const event of data.events) {
        await saveScheduleEventToFirestore(userId, event);
      }
    } catch (error) {
      console.error('Firestore保存失敗、ローカルストレージのみ保存:', error);
    }
  }
}

// ユーティリティ
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Today View
function renderToday() {
  const container = document.getElementById('schedule-today');
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'day-grid';

  const timeLabels = document.createElement('div');
  timeLabels.className = 'time-labels';
  for (let h = 0; h <= 23; h++) {
    const t = document.createElement('div');
    t.className = 'time';
    t.style.top = `${h * 60}px`;
    t.textContent = `${String(h).padStart(2,'0')}:00`;
    timeLabels.appendChild(t);
  }

  const timeline = document.createElement('div');
  timeline.className = 'timeline-wrapper';

  for (let m = 0; m <= 1380; m += 60) {
    const hr = document.createElement('div');
    hr.className = 'hour-row';
    hr.style.top = `${m}px`;
    timeline.appendChild(hr);
    // 30分線
    const half = document.createElement('div');
    half.className = 'half-hour';
    half.style.top = `${m + 30}px`;
    timeline.appendChild(half);
  }

  // 既存イベントを描画（本日分）
  const data = getData();
  const todayKey = toDateKey(new Date());
  data.events.filter(e => e.date === todayKey).forEach(e => {
    const el = document.createElement('div');
    el.className = `slot-block ${classForType(e.type)}`;
    // startとendは分単位なので、そのままpxとして使用（1分=1px）
    el.style.top = `${e.start}px`;
    el.style.height = `${Math.max(30, e.end - e.start)}px`;
    el.textContent = e.label;
    
    // モバイル対応：タップ/長押しの処理
    let tapTimer = null;
    let longPressTimer = null;
    let isLongPress = false;
    
    function handleStart(ev) {
      ev.preventDefault();
      isLongPress = false;
      longPressTimer = setTimeout(() => {
        isLongPress = true;
        removeEvent(e);
      }, 500); // 500ms長押しで削除
    }
    
    function handleEnd(ev) {
      ev.preventDefault();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (!isLongPress) {
        // 短いタップで編集
        tapTimer = setTimeout(() => {
          editEvent(e);
        }, 100);
      }
    }
    
    function handleCancel(ev) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }
    }
    
    // マウスイベント
    el.addEventListener('mousedown', handleStart);
    el.addEventListener('mouseup', handleEnd);
    el.addEventListener('mouseleave', handleCancel);
    
    // タッチイベント
    el.addEventListener('touchstart', handleStart, { passive: false });
    el.addEventListener('touchend', handleEnd, { passive: false });
    el.addEventListener('touchcancel', handleCancel, { passive: false });
    
    // 右クリック（PC用）
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      removeEvent(e);
    });
    
    timeline.appendChild(el);
  });

  // ドラッグ追加（マウス・タッチ両対応）
  let dragging = false, startY = 0, ghost = null;
  
  function getPointerY(ev) {
    // タッチイベントまたはマウスイベントからY座標を取得
    if (ev.touches && ev.touches.length > 0) {
      return ev.touches[0].clientY;
    }
    return ev.clientY;
  }
  
  function getOffsetY(ev, element) {
    const rect = element.getBoundingClientRect();
    const y = getPointerY(ev);
    return y - rect.top;
  }
  
  function startDrag(ev) {
    ev.preventDefault();
    dragging = true;
    // ドラッグ中はスクロールを無効化
    wrapper.style.touchAction = 'none';
    timeline.style.touchAction = 'none';
    const offsetY = getOffsetY(ev, timeline);
    startY = snap30(offsetY);
    ghost = document.createElement('div');
    ghost.className = 'slot-block slot-on';
    ghost.style.top = `${startY}px`;
    ghost.style.height = '30px';
    ghost.textContent = '新規';
    timeline.appendChild(ghost);
  }
  
  function moveDrag(ev) {
    if (!dragging || !ghost) return;
    ev.preventDefault();
    const offsetY = getOffsetY(ev, timeline);
    const y = clamp(snap30(offsetY), 0, 1440);
    const h = clamp(y - startY, 30, 1440 - startY);
    ghost.style.height = `${h}px`;
  }
  
  function endDrag(ev) {
    if (!dragging) return;
    ev.preventDefault();
    dragging = false;
    // ドラッグ終了後、スクロールを再有効化
    wrapper.style.touchAction = 'pan-y';
    timeline.style.touchAction = '';
    if (!ghost) return;
    const start = parseInt(ghost.style.top, 10);
    const end = start + parseInt(ghost.style.height, 10);
    ghost.remove();
    ghost = null;
    promptNewEvent(todayKey, start, end);
  }
  
  // マウスイベント
  timeline.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', endDrag);
  
  // タッチイベント
  timeline.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('touchmove', moveDrag, { passive: false });
  window.addEventListener('touchend', endDrag, { passive: false });

  // 自動提案（簡易）：空き枠の昼にON、夕方にOFFを提案
  autoSuggestForToday(timeline, data, todayKey);

  // ON/OFF時間ブロックを表示
  renderOnOffTimeBlocks(timeline, todayKey, true);

  wrapper.appendChild(timeLabels);
  wrapper.appendChild(timeline);
  container.appendChild(wrapper);

  // タイムラインのスクロールを無効化し、day-gridのスクロールのみを使用
  // これにより、時間ラベルとタイムラインが同期してスクロールされる
  timeline.style.overflow = 'visible';
}

function classForType(type) {
  switch(type){
    case 'class': return 'slot-class';
    case 'on': return 'slot-on';
    case 'off': return 'slot-off';
    case 'work': return 'slot-work';
    default: return 'slot-class';
  }
}

async function promptNewEvent(dateKey, start, end) {
  const label = prompt('ラベル（例：授業/バイト/ON/OFF）:');
  if (!label) return;
  const type = inferType(label);
  const data = getData();
  const newEvent = { id: crypto.randomUUID(), date: dateKey, start, end, label, type };
  data.events.push(newEvent);
  
  // Firestoreに保存
  const userId = getUserId();
  if (userId) {
    try {
      await saveScheduleEventToFirestore(userId, newEvent);
    } catch (error) {
      console.error('Firestore保存失敗:', error);
    }
  }
  
  // ローカルストレージにも保存
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  renderToday();
  renderWeek();
  renderMonth();
}

async function editEvent(evObj) {
  const label = prompt('ラベルを編集:', evObj.label);
  if (!label) return;
  const data = getData();
  const t = data.events.find(e => e.id === evObj.id);
  if (t) {
    t.label = label;
    t.type = inferType(label);
    
    // Firestoreに保存
    const userId = getUserId();
    if (userId) {
      try {
        await saveScheduleEventToFirestore(userId, t);
      } catch (error) {
        console.error('Firestore更新失敗:', error);
      }
    }
    
    // ローカルストレージにも保存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    renderToday();
    renderWeek();
    renderMonth();
  }
}

async function removeEvent(evObj) {
  if (!confirm('このブロックを削除しますか？')) return;
  const data = getData();
  const idx = data.events.findIndex(e => e.id === evObj.id);
  if (idx >= 0) {
    const eventId = data.events[idx].id;
    data.events.splice(idx, 1);
    
    // Firestoreから削除
    const userId = getUserId();
    if (userId) {
      try {
        await deleteScheduleEventFromFirestore(userId, eventId);
      } catch (error) {
        console.error('Firestore削除失敗:', error);
      }
    }
    
    // ローカルストレージからも削除
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    renderToday();
    renderWeek();
    renderMonth();
  }
}

function inferType(label){
  const s = label.toLowerCase();
  if (s.includes('on')) return 'on';
  if (s.includes('off')) return 'off';
  if (s.includes('バイト') || s.includes('work')) return 'work';
  if (s.includes('授業') || s.includes('class')) return 'class';
  return 'class';
}

function snap30(px) { return Math.round(px / 30) * 30; }

function toDateKey(d){ return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

// 週ビュー（日曜開始）
function renderWeek(){
  const container = document.getElementById('schedule-week');
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'week-grid';

  const base = startOfWeek(new Date());
  const data = getData();

  for (let i=0;i<7;i++){
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate()+i);
    const col = document.createElement('div');
    col.className = 'week-day-column';
    const head = document.createElement('div');
    head.className = 'week-day-header';
    head.textContent = `${day.getMonth()+1}/${day.getDate()}`;
    col.appendChild(head);

    // タイムラインエリア（なぞり入力対応）
    const timeline = document.createElement('div');
    timeline.className = 'week-timeline';
    timeline.dataset.dayIndex = i;
    timeline.dataset.dateKey = toDateKey(day);
    timeline.style.position = 'relative';
    timeline.style.height = '720px'; // 24時間 * 30分 = 720px（縮尺0.5）
    timeline.style.marginTop = '24px';

    // 時間目盛りを追加（週ビュー用）
    for (let h = 0; h < 24; h += 2) {
      const marker = document.createElement('div');
      marker.className = 'week-time-marker';
      marker.style.position = 'absolute';
      marker.style.top = `${h * 30 * 0.5}px`; // 2時間ごとにマーカー（縮尺0.5）
      marker.style.left = '0';
      marker.style.width = '100%';
      marker.style.height = '1px';
      marker.style.backgroundColor = '#e0e0e0';
      marker.style.fontSize = '0.7rem';
      marker.style.color = '#999';
      marker.style.paddingLeft = '4px';
      marker.textContent = `${String(h).padStart(2, '0')}:00`;
      timeline.appendChild(marker);
    }

    // 簡易縮尺でブロック表示（y=分*0.5）
    const dayKey = toDateKey(day);
    const events = data.events.filter(e=>e.date===dayKey);
    events.forEach(e=>{
      const el = document.createElement('div');
      el.className = `slot-block ${classForType(e.type)}`;
      el.style.position = 'absolute';
      // startとendは分単位なので、縮尺0.5を適用
      el.style.top = `${e.start * 0.5}px`;
      el.style.height = `${Math.max(12, (e.end - e.start) * 0.5)}px`;
      el.style.width = '100%';
      el.textContent = compactLabel(e.label);
      timeline.appendChild(el);
    });

    // 週ビューでのドラッグ追加
    setupWeekDragInput(timeline, dayKey);

    // ON/OFF時間ブロックを表示
    renderOnOffTimeBlocks(timeline, dayKey, false);

    col.appendChild(timeline);
    grid.appendChild(col);
  }
  container.appendChild(grid);
}

function compactLabel(str){ return str.length>4 ? str.slice(0,4) : str; }

// 週ビューでのドラッグ入力設定
function setupWeekDragInput(timeline, dateKey) {
  let dragging = false, startY = 0, ghost = null;
  
  function getPointerY(ev) {
    if (ev.touches && ev.touches.length > 0) {
      return ev.touches[0].clientY;
    }
    return ev.clientY;
  }
  
  function getOffsetY(ev, element) {
    const rect = element.getBoundingClientRect();
    const y = getPointerY(ev);
    return y - rect.top;
  }
  
  function startDrag(ev) {
    ev.preventDefault();
    dragging = true;
    const offsetY = getOffsetY(ev, timeline);
    startY = snap30(offsetY * 2); // 週ビューは0.5倍縮尺なので2倍に戻す
    ghost = document.createElement('div');
    ghost.className = 'slot-block slot-on';
    ghost.style.position = 'absolute';
    ghost.style.top = `${startY * 0.5}px`;
    ghost.style.height = '30px';
    ghost.style.width = '100%';
    ghost.style.opacity = '0.7';
    ghost.textContent = '新規';
    timeline.appendChild(ghost);
  }
  
  function moveDrag(ev) {
    if (!dragging || !ghost) return;
    ev.preventDefault();
    const offsetY = getOffsetY(ev, timeline);
    const y = clamp(snap30(offsetY * 2), 0, 1440);
    const h = clamp(y - startY, 30, 1440 - startY);
    ghost.style.height = `${h * 0.5}px`;
  }
  
  function endDrag(ev) {
    if (!dragging) return;
    ev.preventDefault();
    dragging = false;
    if (!ghost) return;
    const start = parseInt(ghost.style.top, 10) / 0.5; // 0.5倍縮尺を元に戻す
    const end = start + (parseInt(ghost.style.height, 10) / 0.5);
    ghost.remove();
    ghost = null;
    promptNewEvent(dateKey, start, end);
  }
  
  timeline.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', endDrag);
  
  timeline.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('touchmove', moveDrag, { passive: false });
  window.addEventListener('touchend', endDrag, { passive: false });
}

// 繰り返し予定の設定（簡易版）
export async function setRecurringEvent(dateKey, start, end, label, type, daysOfWeek) {
  const userId = getUserId();
  const data = getData();
  
  // 指定された曜日に繰り返し予定を追加
  const base = startOfWeek(new Date());
  const events = [];
  
  for (let i = 0; i < 7; i++) {
    if (daysOfWeek.includes(i)) {
      const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const dayKey = toDateKey(day);
      
      const event = {
        id: crypto.randomUUID(),
        date: dayKey,
        start: start,
        end: end,
        label: label,
        type: type,
        recurring: true
      };
      
      events.push(event);
      data.events.push(event);
      
      // Firestoreに保存
      if (userId) {
        try {
          await saveScheduleEventToFirestore(userId, event);
        } catch (error) {
          console.error('Firestore保存失敗:', error);
        }
      }
    }
  }
  
  // ローカルストレージにも保存
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  renderToday();
  renderWeek();
  renderMonth();
  
  return events;
}

function startOfWeek(d){
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = day; // 日曜開始
  date.setDate(date.getDate()-diff);
  date.setHours(0,0,0,0);
  return date;
}

// 月ビュー（件数バッジ）
function renderMonth(){
  const container = document.getElementById('schedule-month');
  container.innerHTML='';
  const grid = document.createElement('div');
  grid.className = 'month-grid';

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = startOfWeek(first);
  for (let i=0;i<42;i++){
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate()+i);
    const cell = document.createElement('div');
    cell.className = 'month-cell';
    const label = document.createElement('div');
    label.className = 'date';
    label.textContent = `${day.getMonth()+1}/${day.getDate()}`;
    cell.appendChild(label);

    const count = getData().events.filter(e=>e.date===toDateKey(day)).length;
    if (count>0){
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = String(count);
      cell.appendChild(badge);
    }
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}

// ON/OFF時間設定を取得
function getOnOffTimeSettings() {
  const saved = localStorage.getItem('onoff-time-settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (err) {
      console.error('ON/OFF時間設定の読み込みエラー:', err);
    }
  }
  // デフォルト値
  return {
    onTimeStart: '12:00',
    onTimeEnd: '13:00',
    offTimeStart: '16:30',
    offTimeEnd: '18:00'
  };
}

// 時間文字列（HH:MM）を分に変換
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// 簡易自動提案：空き枠にON(昼)とOFF(夕方)を薄色でサジェスト表示
function autoSuggestForToday(timeline, data, dateKey){
  const settings = getOnOffTimeSettings();
  const suggestions = [
    { 
      start: timeToMinutes(settings.onTimeStart), 
      end: timeToMinutes(settings.onTimeEnd), 
      label: 'ON', 
      type: 'on' 
    },
    { 
      start: timeToMinutes(settings.offTimeStart), 
      end: timeToMinutes(settings.offTimeEnd), 
      label: 'OFF', 
      type: 'off' 
    }
  ];
  const events = data.events.filter(e=>e.date===dateKey);
  suggestions.forEach(s=>{
    const overlap = events.some(e=> !(s.end<=e.start || s.start>=e.end));
    if (!overlap){
      const el = document.createElement('div');
      el.className = `slot-block ${classForType(s.type)}`;
      el.style.opacity = '0.5';
      el.style.top = `${s.start}px`;
      el.style.height = `${s.end - s.start}px`;
      el.textContent = s.label;
      el.addEventListener('click', ()=>{
        // 採用
        const d = getData();
        d.events.push({ id: crypto.randomUUID(), date: dateKey, start: s.start, end: s.end, label: s.label, type: s.type });
        setData(d);
        renderToday(); renderWeek(); renderMonth();
      });
      timeline.appendChild(el);
    }
  });
}

// ON/OFF時間をスケジュールに表示（Today/Week/Month）
function renderOnOffTimeBlocks(container, dateKey, isToday = false) {
  const settings = getOnOffTimeSettings();
  const onStart = timeToMinutes(settings.onTimeStart);
  const onEnd = timeToMinutes(settings.onTimeEnd);
  const offStart = timeToMinutes(settings.offTimeStart);
  const offEnd = timeToMinutes(settings.offTimeEnd);
  
  // 既存のON/OFF時間ブロックを削除（再描画時）
  const existingBlocks = container.querySelectorAll('.onoff-time-block');
  existingBlocks.forEach(block => block.remove());
  
  // ON時間ブロック
  const onBlock = document.createElement('div');
  onBlock.className = 'onoff-time-block slot-on';
  if (isToday) {
    onBlock.style.position = 'absolute';
    onBlock.style.top = `${onStart}px`;
    onBlock.style.height = `${onEnd - onStart}px`;
    onBlock.style.width = '100%';
    onBlock.style.opacity = '0.3';
    onBlock.style.pointerEvents = 'none';
    onBlock.style.borderLeft = '3px solid #3498db';
    onBlock.textContent = `ON ${settings.onTimeStart}-${settings.onTimeEnd}`;
  } else {
    // Week/Monthビュー用
    onBlock.style.position = 'absolute';
    onBlock.style.top = `${onStart * 0.5}px`;
    onBlock.style.height = `${(onEnd - onStart) * 0.5}px`;
    onBlock.style.width = '100%';
    onBlock.style.opacity = '0.3';
    onBlock.style.pointerEvents = 'none';
    onBlock.style.borderLeft = '3px solid #3498db';
    onBlock.textContent = `ON`;
  }
  container.appendChild(onBlock);
  
  // OFF時間ブロック
  const offBlock = document.createElement('div');
  offBlock.className = 'onoff-time-block slot-off';
  if (isToday) {
    offBlock.style.position = 'absolute';
    offBlock.style.top = `${offStart}px`;
    offBlock.style.height = `${offEnd - offStart}px`;
    offBlock.style.width = '100%';
    offBlock.style.opacity = '0.3';
    offBlock.style.pointerEvents = 'none';
    offBlock.style.borderLeft = '3px solid #e67e22';
    offBlock.textContent = `OFF ${settings.offTimeStart}-${settings.offTimeEnd}`;
  } else {
    // Week/Monthビュー用
    offBlock.style.position = 'absolute';
    offBlock.style.top = `${offStart * 0.5}px`;
    offBlock.style.height = `${(offEnd - offStart) * 0.5}px`;
    offBlock.style.width = '100%';
    offBlock.style.opacity = '0.3';
    offBlock.style.pointerEvents = 'none';
    offBlock.style.borderLeft = '3px solid #e67e22';
    offBlock.textContent = `OFF`;
  }
  container.appendChild(offBlock);
}



