// メイン画面：ON/OFFモード、AIタスク提案、スワイプUI、タイマー

import { getTasks, updateTask } from './tasks.js';
import { proposeTask, rescheduleTask } from './ai-service.js';

let currentMode = 'off';
let timerInterval = null;
let timerSeconds = 25 * 60; // 25分
let currentTask = null;
let autoFallbackTimer = null;

// メイン画面の初期化
export function initMainScreen() {
  setupModeSwitching();
  setupTimer();
  setupSwipeUI();
  setupAutoFallback();
  
  // 初期状態でOFFモードを表示
  switchToMode('off');
  
  // タスクが更新されたら再描画
  updateTaskDisplay().catch(err => console.error('タスク表示更新エラー:', err));
}

// モード切替
function setupModeSwitching() {
  const switchToOnBtn = document.getElementById('switch-to-on-btn');
  const switchToOffBtn = document.getElementById('switch-to-off-btn');

  if (switchToOnBtn) {
    const handleSwitchToOn = () => switchToMode('on');
    switchToOnBtn.addEventListener('click', handleSwitchToOn);
    switchToOnBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleSwitchToOn();
    }, { passive: false });
  }

  if (switchToOffBtn) {
    const handleSwitchToOff = () => switchToMode('off');
    switchToOffBtn.addEventListener('click', handleSwitchToOff);
    switchToOffBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleSwitchToOff();
    }, { passive: false });
  }
}

export function switchToMode(mode) {
  currentMode = mode;
  
  const offMode = document.getElementById('main-off-mode');
  const onMode = document.getElementById('main-on-mode');

  if (mode === 'off') {
    if (offMode) offMode.classList.add('active');
    if (onMode) onMode.classList.remove('active');
    stopTimer();
    clearAutoFallback();
    
    // OFFモード時のメッセージ更新
    const characterMessage = document.querySelector('#main-off-mode .character-message');
    if (characterMessage) {
      const messages = [
        '一緒に休みましょう。今はサボる時間です。',
        '罪悪感なく、しっかり休みましょう。',
        'リフレッシュして、次のタスクに備えましょう。'
      ];
      characterMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
    }
  } else {
    if (offMode) offMode.classList.remove('active');
    if (onMode) onMode.classList.add('active');
    updateTaskDisplay().catch(err => console.error('タスク表示更新エラー:', err));
    startAutoFallback();
    
    // ONモード時のメッセージ更新
    const characterMessage = document.querySelector('#main-on-mode .character-message');
    if (characterMessage) {
      const messages = [
        '頑張りましょう！一緒にタスクを進めます。',
        '集中して、効率的に進めましょう！',
        'やる気を出して、一歩ずつ進みましょう！'
      ];
      characterMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
    }
  }
}

// タスク表示の更新
export async function updateTaskDisplay() {
  if (currentMode !== 'on') return;

  const taskCard = document.getElementById('task-card');
  if (!taskCard) return;

  // AIがタスクを提案
  const tasks = await getTasks();
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const proposedTask = proposeTask(pendingTasks);

  if (proposedTask) {
    currentTask = proposedTask;
    displayTaskCard(proposedTask);
  } else {
    currentTask = null;
    taskCard.innerHTML = '<p class="no-task-message">タスクを登録すると、ここに表示されます</p>';
  }
}

function displayTaskCard(task) {
  const taskCard = document.getElementById('task-card');
  if (!taskCard) return;

  const deadline = new Date(task.deadline);
  const deadlineStr = deadline.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  taskCard.innerHTML = `
    <div class="task-title">${task.title}</div>
    <div class="task-deadline">締切: ${deadlineStr}</div>
    <div class="task-emotion">
      <span>達成感: ${task.emotionMatrix.achievement}</span>
      <span>抵抗感: ${task.emotionMatrix.resistance}</span>
    </div>
  `;
}

// スワイプUI
function setupSwipeUI() {
  const taskCard = document.getElementById('task-card');
  if (!taskCard) return;

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isSwiping = false;
  const swipeThreshold = 100;

  function getPointerX(ev) {
    return ev.touches ? ev.touches[0].clientX : ev.clientX;
  }

  function handleStart(ev) {
    if (!currentTask) return;
    isSwiping = true;
    startX = getPointerX(ev);
    taskCard.classList.add('swiping');
  }

  function handleMove(ev) {
    if (!isSwiping || !currentTask) return;
    ev.preventDefault();
    currentX = getPointerX(ev) - startX;
    taskCard.style.transform = `translateX(${currentX}px)`;
    
    // 視覚的フィードバック（左=今やる、右=AIに任せる）
    if (currentX < -swipeThreshold) {
      // 左スワイプ: 今やる（緑色）
      taskCard.style.backgroundColor = '#e8f5e9';
    } else if (currentX > swipeThreshold) {
      // 右スワイプ: AIに任せる（オレンジ色）
      taskCard.style.backgroundColor = '#fff3e0';
    } else {
      taskCard.style.backgroundColor = 'white';
    }
  }

  function handleEnd(ev) {
    if (!isSwiping || !currentTask) return;
    isSwiping = false;
    
    const swipeDistance = currentX;
    
    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance < 0) {
        // 左スワイプ: 今やる（HTMLの表示に合わせて修正）
        handleTaskStart();
      } else {
        // 右スワイプ: AIに任せる（HTMLの表示に合わせて修正）
        handleTaskPostpone();
      }
    }
    
    // リセット
    taskCard.style.transform = '';
    taskCard.style.backgroundColor = '';
    taskCard.classList.remove('swiping');
    currentX = 0;
  }

  taskCard.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);

  taskCard.addEventListener('touchstart', handleStart, { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd, { passive: false });
}

async function handleTaskStart() {
  if (!currentTask) return;
  
  // タスクを開始
  await updateTask(currentTask.id, { status: 'in_progress', startedAt: new Date().toISOString() });
  
  // タイマーを開始
  startTimer();
  
  // 自動フォールバックをクリア（タイマーが動いているので）
  clearAutoFallback();
  
  // タスクカードを更新（進行中を表示）
  const taskCard = document.getElementById('task-card');
  if (taskCard) {
    taskCard.innerHTML = `
      <div class="task-title">${currentTask.title}</div>
      <div class="task-deadline">進行中...</div>
      <div class="task-emotion">
        <span>集中モード</span>
      </div>
    `;
  }
  
  // イベントを発火
  window.dispatchEvent(new CustomEvent('task-started', { detail: currentTask }));
}

async function handleTaskPostpone() {
  if (!currentTask) return;
  
  try {
    // 既存のスケジュールを取得（簡易版: ローカルストレージから）
    let existingSchedules = [];
    try {
      const scheduleData = localStorage.getItem('visuy-schedule-v1');
      if (scheduleData) {
        const parsed = JSON.parse(scheduleData);
        existingSchedules = parsed.events || [];
      }
    } catch (err) {
      console.warn('スケジュール取得エラー:', err);
    }
    
    // AIが最適な時間を計算
    const rescheduleResult = rescheduleTask(currentTask, new Date(), existingSchedules);
    const { rescheduledDate, reason } = rescheduleResult;
    
    // タスクを更新
    await updateTask(currentTask.id, { 
      status: 'postponed',
      rescheduledTo: rescheduledDate.toISOString()
    });
    
    // スケジュールに自動配置（簡易版: ローカルストレージに追加）
    try {
      const scheduleData = localStorage.getItem('visuy-schedule-v1');
      const parsed = scheduleData ? JSON.parse(scheduleData) : { events: [] };
      
      const scheduleEvent = {
        id: crypto.randomUUID(),
        label: currentTask.title,
        type: 'work',
        date: rescheduledDate.toISOString().split('T')[0],
        start: rescheduledDate.getHours() * 60 + rescheduledDate.getMinutes(),
        end: (rescheduledDate.getHours() + 2) * 60 + rescheduledDate.getMinutes(),
        startTime: rescheduledDate.toISOString(),
        endTime: new Date(rescheduledDate.getTime() + 2 * 60 * 60 * 1000).toISOString()
      };
      
      parsed.events.push(scheduleEvent);
      localStorage.setItem('visuy-schedule-v1', JSON.stringify(parsed));
      
      // スケジュール画面を更新（イベント発火）
      window.dispatchEvent(new CustomEvent('schedule-updated', { detail: scheduleEvent }));
    } catch (err) {
      console.warn('スケジュール保存エラー:', err);
    }
    
    // ユーザーに通知
    const rescheduleTimeStr = rescheduledDate.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    alert(`AIが最適な時間に再配置しました！\n\n${rescheduleTimeStr}\n\n${reason}`);
    
    // 次のタスクを表示
    updateTaskDisplay().catch(err => console.error('タスク表示更新エラー:', err));
    
    // イベントを発火
    window.dispatchEvent(new CustomEvent('task-postponed', { 
      detail: { 
        task: currentTask, 
        rescheduledTo: rescheduledDate,
        reason: reason
      } 
    }));
    
  } catch (error) {
    console.error('AIリスケジュールエラー:', error);
    alert('リスケジュールに失敗しました。もう一度お試しください。');
  }
}

// タイマー機能
function setupTimer() {
  // タイマーはONモードでタスクを開始したときに起動
}

function startTimer() {
  stopTimer();
  timerSeconds = 25 * 60; // 25分
  
  // 進捗バーをリセット
  const progressBar = document.getElementById('timer-progress');
  if (progressBar) {
    progressBar.style.width = '0%';
  }
  
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    
    if (timerSeconds <= 0) {
      stopTimer();
      
      // タスクを完了としてマーク
      if (currentTask) {
        updateTask(currentTask.id, { 
          status: 'completed', 
          completedAt: new Date().toISOString() 
        }).catch(err => console.error('タスク更新エラー:', err));
        currentTask = null;
      }
      
      // タイマー終了時の処理
      window.dispatchEvent(new CustomEvent('timer-completed'));
      
      // OFFモードに切り替え
      switchToMode('off');
      
      // 次のタスクを表示
      setTimeout(() => {
        updateTaskDisplay().catch(err => console.error('タスク表示更新エラー:', err));
      }, 100);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('timer-display');
  if (!timerDisplay) return;
  
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // 進捗バーの更新
  const totalSeconds = 25 * 60; // 25分
  const progress = ((totalSeconds - timerSeconds) / totalSeconds) * 100;
  const progressBar = document.getElementById('timer-progress');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

// 自動フォールバック（放置検知）
function setupAutoFallback() {
  // ONモードで一定時間タスクに着手しないと自動でOFFモードに
}

function startAutoFallback() {
  clearAutoFallback();
  // タイマーが動いていない場合のみフォールバックを開始
  if (!timerInterval) {
    autoFallbackTimer = setTimeout(() => {
      if (currentMode === 'on' && !timerInterval) {
        // AIが「今は休憩が必要」と判断
        const characterMessage = document.querySelector('#main-on-mode .character-message');
        if (characterMessage) {
          characterMessage.textContent = '集中できていないようです。一度休憩を取りましょう。';
        }
        setTimeout(() => {
          switchToMode('off');
        }, 2000);
      }
    }, 5 * 60 * 1000); // 5分
  }
}

function clearAutoFallback() {
  if (autoFallbackTimer) {
    clearTimeout(autoFallbackTimer);
    autoFallbackTimer = null;
  }
}

// タスクが追加されたら再描画
window.addEventListener('task-added', () => {
  updateTaskDisplay().catch(err => console.error('タスク表示更新エラー:', err));
});

// タイマー完了時の処理
window.addEventListener('timer-completed', () => {
  // 完了メッセージを表示
  alert('お疲れ様でした！25分間の集中が完了しました。');
});

// タスク開始時の処理
window.addEventListener('task-started', (e) => {
  console.log('タスク開始:', e.detail);
});

// タスク延期時の処理
window.addEventListener('task-postponed', (e) => {
  console.log('タスク延期:', e.detail);
  alert('AIが最適な時間に再配置しました。');
});

