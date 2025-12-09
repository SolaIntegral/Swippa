// タスク管理機能：タスク登録、感情マトリクス、Firestore連携（ローカルストレージをフォールバック）

import { 
  saveTaskToFirestore, 
  getTasksFromFirestore, 
  updateTaskInFirestore, 
  deleteTaskFromFirestore,
  subscribeToTasks 
} from './firestore-service.js';
import { auth } from './main.js';

const TASKS_STORAGE_KEY = 'visuy-tasks-v1';

// 現在のユーザーIDを取得
function getUserId() {
  const user = auth.currentUser;
  return user ? user.uid : null;
}

// タスクデータの管理（Firestore優先、フォールバックはローカルストレージ）
export async function getTasks() {
  const userId = getUserId();
  if (userId) {
    try {
      const tasks = await getTasksFromFirestore(userId);
      // ローカルストレージにもバックアップ
      if (tasks.length > 0) {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      }
      return tasks;
    } catch (error) {
      console.error('Firestore取得失敗、ローカルストレージから読み込み:', error);
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } else {
    // 未ログイン時はローカルストレージのみ
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveTasks(tasks) {
  const userId = getUserId();
  if (userId) {
    // Firestoreに保存（各タスクを個別に保存）
    try {
      for (const task of tasks) {
        await saveTaskToFirestore(userId, task);
      }
    } catch (error) {
      console.error('Firestore保存失敗、ローカルストレージに保存:', error);
    }
  }
  // ローカルストレージにもバックアップ
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export async function addTask(task) {
  const userId = getUserId();
  const newTask = {
    id: crypto.randomUUID(),
    ...task,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  if (userId) {
    try {
      await saveTaskToFirestore(userId, newTask);
    } catch (error) {
      console.error('Firestore保存失敗、ローカルストレージに保存:', error);
    }
  }
  
  // ローカルストレージにも保存
  const tasks = await getTasks();
  tasks.push(newTask);
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  
  return newTask;
}

export async function updateTask(taskId, updates) {
  const userId = getUserId();
  
  if (userId) {
    try {
      await updateTaskInFirestore(userId, taskId, updates);
    } catch (error) {
      console.error('Firestore更新失敗、ローカルストレージを更新:', error);
    }
  }
  
  // ローカルストレージも更新
  const tasks = await getTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  if (index >= 0) {
    tasks[index] = { ...tasks[index], ...updates };
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    return tasks[index];
  }
  return null;
}

export async function removeTask(taskId) {
  const userId = getUserId();
  
  if (userId) {
    try {
      await deleteTaskFromFirestore(userId, taskId);
    } catch (error) {
      console.error('Firestore削除失敗、ローカルストレージから削除:', error);
    }
  }
  
  // ローカルストレージからも削除
  const tasks = await getTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(filtered));
}

// リアルタイム監視を開始
export function subscribeToTasksRealtime(callback) {
  const userId = getUserId();
  if (userId) {
    return subscribeToTasks(userId, callback);
  }
  return null;
}

// 感情マトリクスの初期化とイベントハンドリング
export function initEmotionMatrix() {
  const grid = document.getElementById('matrix-grid');
  if (!grid) return;

  let achievement = 50;
  let resistance = 50;
  let isDragging = false;

  function updatePoint(x, y) {
    const rect = grid.getBoundingClientRect();
    const relativeX = ((x - rect.left) / rect.width) * 100;
    const relativeY = ((y - rect.top) / rect.height) * 100;
    
    resistance = Math.max(0, Math.min(100, relativeX));
    achievement = Math.max(0, Math.min(100, 100 - relativeY));
    
    updateMatrixDisplay();
  }

  function updateMatrixDisplay() {
    // 既存のポイントを削除
    const existingPoint = grid.querySelector('.matrix-point');
    if (existingPoint) existingPoint.remove();

    // 新しいポイントを追加
    const point = document.createElement('div');
    point.className = 'matrix-point';
    point.style.left = `${resistance}%`;
    point.style.top = `${100 - achievement}%`;
    grid.appendChild(point);

    // 値を更新
    document.getElementById('achievement-value').textContent = Math.round(achievement);
    document.getElementById('resistance-value').textContent = Math.round(resistance);
  }

  function handleStart(ev) {
    ev.preventDefault();
    isDragging = true;
    const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
    updatePoint(x, y);
  }

  function handleMove(ev) {
    if (!isDragging) return;
    ev.preventDefault();
    const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
    updatePoint(x, y);
  }

  function handleEnd(ev) {
    ev.preventDefault();
    isDragging = false;
  }

  // マウスイベント
  grid.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);

  // タッチイベント
  grid.addEventListener('touchstart', handleStart, { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd, { passive: false });

  // 初期表示
  updateMatrixDisplay();
}

// 感情マトリクスの値を取得
export function getEmotionMatrixValues() {
  return {
    achievement: parseInt(document.getElementById('achievement-value').textContent, 10),
    resistance: parseInt(document.getElementById('resistance-value').textContent, 10)
  };
}

// 感情マトリクスをリセット
export function resetEmotionMatrix() {
  const grid = document.getElementById('matrix-grid');
  if (grid) {
    const point = grid.querySelector('.matrix-point');
    if (point) point.remove();
    document.getElementById('achievement-value').textContent = '50';
    document.getElementById('resistance-value').textContent = '50';
    
    // 中央にポイントを配置
    const newPoint = document.createElement('div');
    newPoint.className = 'matrix-point';
    newPoint.style.left = '50%';
    newPoint.style.top = '50%';
    grid.appendChild(newPoint);
  }
}

