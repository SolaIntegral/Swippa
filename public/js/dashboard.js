// ポジティブ・ダッシュボード機能：行動タイプ診断、成長指標、やる気の波分析

import { getTasks } from './tasks.js';
import { auth } from './main.js';

// ダッシュボードの初期化
export async function initDashboard() {
  await updateDashboard();
}

// ダッシュボードの更新
export async function updateDashboard() {
  const tasks = await getTasks();
  
  // 行動タイプ診断
  const userType = analyzeUserType(tasks);
  displayUserType(userType);
  
  // 今週の成果
  const weeklyAchievements = analyzeWeeklyAchievements(tasks);
  displayWeeklyAchievements(weeklyAchievements);
  
  // やる気の波分析
  const motivationWave = analyzeMotivationWave(tasks);
  displayMotivationWave(motivationWave);
  
  // タスク一覧
  displayTaskList(tasks);
}

// 行動タイプ診断
function analyzeUserType(tasks) {
  if (!tasks || tasks.length === 0) {
    return {
      type: 'データ不足',
      description: 'まだ十分なデータがありません。タスクを実行すると、あなたのタイプが分析されます。',
      icon: '📊'
    };
  }
  
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt);
  if (completedTasks.length === 0) {
    return {
      type: '準備中',
      description: 'タスクを完了すると、あなたのタイプが分析されます。',
      icon: '⏳'
    };
  }
  
  // 完了時刻の分析
  const completionHours = completedTasks.map(t => {
    const date = new Date(t.completedAt);
    return date.getHours();
  });
  
  const avgHour = completionHours.reduce((a, b) => a + b, 0) / completionHours.length;
  
  // 開始時刻の分析
  const startedTasks = tasks.filter(t => t.status === 'completed' && t.startedAt && t.completedAt);
  const timeToComplete = startedTasks.map(t => {
    const start = new Date(t.startedAt);
    const end = new Date(t.completedAt);
    return (end - start) / (1000 * 60 * 60); // 時間単位
  });
  
  const avgTimeToComplete = timeToComplete.length > 0 
    ? timeToComplete.reduce((a, b) => a + b, 0) / timeToComplete.length 
    : 0;
  
  // タイプ判定
  let type = '';
  let description = '';
  let icon = '';
  
  if (avgHour >= 18 || avgHour < 6) {
    // 夜型
    if (avgTimeToComplete > 2) {
      type = '夜型スロースターター';
      description = '夜に集中力が高まるタイプです。最初はゆっくりですが、後半で本領発揮します。';
      icon = '🌙';
    } else {
      type = '夜型集中型';
      description = '夜に集中力が高まり、効率的にタスクを完了します。';
      icon = '🌃';
    }
  } else if (avgHour >= 6 && avgHour < 12) {
    // 朝型
    type = '朝型スタート';
    description = '朝に集中力が高まり、1日の始まりから効率的にタスクを進めます。';
    icon = '🌅';
  } else {
    // 昼型
    type = '昼型バランス';
    description = '昼間に集中力が高まり、バランスよくタスクを進めます。';
    icon = '☀️';
  }
  
  return { type, description, icon, avgHour, avgTimeToComplete };
}

// 行動タイプの表示
function displayUserType(userType) {
  const container = document.getElementById('user-type-display');
  if (!container) return;
  
  container.innerHTML = `
    <div class="user-type-card">
      <div class="user-type-icon">${userType.icon}</div>
      <h4>${userType.type}</h4>
      <p>${userType.description}</p>
      ${userType.avgHour !== undefined ? `
        <div class="user-type-stats">
          <span>平均完了時刻: ${Math.round(userType.avgHour)}時</span>
          ${userType.avgTimeToComplete !== undefined ? `
            <span>平均所要時間: ${Math.round(userType.avgTimeToComplete * 10) / 10}時間</span>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// 今週の成果分析
function analyzeWeeklyAchievements(tasks) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const thisWeekTasks = tasks.filter(t => {
    if (!t.completedAt) return false;
    const completed = new Date(t.completedAt);
    return completed >= weekAgo;
  });
  
  const highResistanceTasks = thisWeekTasks.filter(t => {
    return t.emotionMatrix && t.emotionMatrix.resistance > 70;
  });
  
  const totalCompleted = thisWeekTasks.length;
  const highResistanceCompleted = highResistanceTasks.length;
  
  // 先週との比較（簡易版）
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const lastWeekTasks = tasks.filter(t => {
    if (!t.completedAt) return false;
    const completed = new Date(t.completedAt);
    return completed >= twoWeeksAgo && completed < weekAgo;
  });
  
  const improvement = totalCompleted > lastWeekTasks.length 
    ? `先週より${totalCompleted - lastWeekTasks.length}個多く完了しました！`
    : totalCompleted === lastWeekTasks.length 
      ? '先週と同じペースです'
      : '';
  
  return {
    totalCompleted,
    highResistanceCompleted,
    improvement,
    hasData: thisWeekTasks.length > 0
  };
}

// 今週の成果の表示
function displayWeeklyAchievements(achievements) {
  const container = document.getElementById('weekly-achievements');
  if (!container) return;
  
  if (!achievements.hasData) {
    container.innerHTML = `
      <p class="no-data-message">今週のデータがまだありません。タスクを完了すると、成果が表示されます。</p>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="achievement-item">
      <div class="achievement-icon">✅</div>
      <div class="achievement-content">
        <h4>${achievements.totalCompleted}個のタスクを完了</h4>
        <p>今週、頑張りました！</p>
      </div>
    </div>
    ${achievements.highResistanceCompleted > 0 ? `
      <div class="achievement-item highlight">
        <div class="achievement-icon">💪</div>
        <div class="achievement-content">
          <h4>抵抗感の高いタスクを${achievements.highResistanceCompleted}個突破</h4>
          <p>難しいタスクにも挑戦できています！</p>
        </div>
      </div>
    ` : ''}
    ${achievements.improvement ? `
      <div class="achievement-item">
        <div class="achievement-icon">📈</div>
        <div class="achievement-content">
          <p>${achievements.improvement}</p>
        </div>
      </div>
    ` : ''}
  `;
}

// やる気の波分析
function analyzeMotivationWave(tasks) {
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt && t.emotionMatrix);
  
  if (completedTasks.length === 0) {
    return { hasData: false };
  }
  
  // 時間帯別の達成感・抵抗感の平均
  const hourlyData = {};
  
  completedTasks.forEach(task => {
    const completed = new Date(task.completedAt);
    const hour = completed.getHours();
    
    if (!hourlyData[hour]) {
      hourlyData[hour] = { achievement: [], resistance: [], count: 0 };
    }
    
    hourlyData[hour].achievement.push(task.emotionMatrix.achievement);
    hourlyData[hour].resistance.push(task.emotionMatrix.resistance);
    hourlyData[hour].count++;
  });
  
  // 時間帯別の平均を計算
  const waveData = Object.keys(hourlyData).map(hour => {
    const data = hourlyData[hour];
    return {
      hour: parseInt(hour, 10),
      avgAchievement: data.achievement.reduce((a, b) => a + b, 0) / data.achievement.length,
      avgResistance: data.resistance.reduce((a, b) => a + b, 0) / data.resistance.length,
      count: data.count
    };
  }).sort((a, b) => a.hour - b.hour);
  
  return { hasData: true, waveData };
}

// やる気の波の表示
function displayMotivationWave(motivationWave) {
  const container = document.getElementById('motivation-wave');
  if (!container) return;
  
  if (!motivationWave.hasData) {
    container.innerHTML = `
      <p class="no-data-message">やる気の波を分析するには、タスクの完了データが必要です。</p>
    `;
    return;
  }
  
  // 簡易グラフ表示
  const maxCount = Math.max(...motivationWave.waveData.map(d => d.count));
  
  container.innerHTML = `
    <div class="wave-graph">
      <div class="wave-label">時間帯別のタスク完了数</div>
      <div class="wave-bars">
        ${motivationWave.waveData.map(data => {
          const height = (data.count / maxCount) * 100;
          return `
            <div class="wave-bar-item">
              <div class="wave-bar" style="height: ${height}%"></div>
              <div class="wave-hour">${data.hour}時</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    <div class="wave-insight">
      <p>最も集中できる時間帯: ${motivationWave.waveData.reduce((a, b) => a.count > b.count ? a : b).hour}時</p>
      <p>平均達成感: ${Math.round(motivationWave.waveData.reduce((sum, d) => sum + d.avgAchievement, 0) / motivationWave.waveData.length)}</p>
    </div>
  `;
}

// タスク一覧の表示
function displayTaskList(tasks) {
  const container = document.getElementById('task-list');
  if (!container) return;
  
  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <p class="no-data-message">まだタスクが登録されていません。メイン画面からタスクを追加してください。</p>
    `;
    return;
  }
  
  // タスクをステータス別に分類
  const pendingTasks = tasks.filter(t => t.status === 'pending' || !t.status);
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const postponedTasks = tasks.filter(t => t.status === 'postponed');
  
  // 日付でソート（期限があるものは期限順、ないものは後ろに）
  const sortTasks = (taskList) => {
    return taskList.sort((a, b) => {
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };
  
  const getStatusLabel = (status) => {
    switch(status) {
      case 'pending': return '未着手';
      case 'in_progress': return '進行中';
      case 'completed': return '完了';
      case 'postponed': return '延期';
      default: return '未着手';
    }
  };
  
  const getStatusClass = (status) => {
    switch(status) {
      case 'pending': return 'task-status-pending';
      case 'in_progress': return 'task-status-in-progress';
      case 'completed': return 'task-status-completed';
      case 'postponed': return 'task-status-postponed';
      default: return 'task-status-pending';
    }
  };
  
  container.innerHTML = `
    <div class="task-list-container">
      ${pendingTasks.length > 0 ? `
        <div class="task-list-section">
          <h4 class="task-list-section-title">未着手 (${pendingTasks.length})</h4>
          <div class="task-list-items">
            ${sortTasks([...pendingTasks]).map(task => `
              <div class="task-list-item">
                <div class="task-list-item-main">
                  <h5 class="task-list-item-title">${task.title || '無題のタスク'}</h5>
                  <div class="task-list-item-meta">
                    <span class="task-list-item-deadline">期限: ${formatDate(task.deadline)}</span>
                    ${task.emotionMatrix ? `
                      <span class="task-list-item-emotion">
                        達成感: ${task.emotionMatrix.achievement}/100, 
                        抵抗感: ${task.emotionMatrix.resistance}/100
                      </span>
                    ` : ''}
                  </div>
                </div>
                <span class="task-status-badge ${getStatusClass(task.status)}">${getStatusLabel(task.status)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${inProgressTasks.length > 0 ? `
        <div class="task-list-section">
          <h4 class="task-list-section-title">進行中 (${inProgressTasks.length})</h4>
          <div class="task-list-items">
            ${sortTasks([...inProgressTasks]).map(task => `
              <div class="task-list-item">
                <div class="task-list-item-main">
                  <h5 class="task-list-item-title">${task.title || '無題のタスク'}</h5>
                  <div class="task-list-item-meta">
                    <span class="task-list-item-deadline">期限: ${formatDate(task.deadline)}</span>
                  </div>
                </div>
                <span class="task-status-badge ${getStatusClass(task.status)}">${getStatusLabel(task.status)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${postponedTasks.length > 0 ? `
        <div class="task-list-section">
          <h4 class="task-list-section-title">延期 (${postponedTasks.length})</h4>
          <div class="task-list-items">
            ${sortTasks([...postponedTasks]).map(task => `
              <div class="task-list-item">
                <div class="task-list-item-main">
                  <h5 class="task-list-item-title">${task.title || '無題のタスク'}</h5>
                  <div class="task-list-item-meta">
                    <span class="task-list-item-deadline">期限: ${formatDate(task.deadline)}</span>
                    ${task.rescheduledTo ? `
                      <span class="task-list-item-rescheduled">再スケジュール: ${formatDate(task.rescheduledTo)}</span>
                    ` : ''}
                  </div>
                </div>
                <span class="task-status-badge ${getStatusClass(task.status)}">${getStatusLabel(task.status)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${completedTasks.length > 0 ? `
        <div class="task-list-section">
          <h4 class="task-list-section-title">完了 (${completedTasks.length})</h4>
          <div class="task-list-items">
            ${sortTasks([...completedTasks]).slice(0, 10).map(task => `
              <div class="task-list-item task-list-item-completed">
                <div class="task-list-item-main">
                  <h5 class="task-list-item-title">${task.title || '無題のタスク'}</h5>
                  <div class="task-list-item-meta">
                    ${task.completedAt ? `
                      <span class="task-list-item-completed-date">完了日: ${formatDate(task.completedAt)}</span>
                    ` : ''}
                  </div>
                </div>
                <span class="task-status-badge ${getStatusClass(task.status)}">${getStatusLabel(task.status)}</span>
              </div>
            `).join('')}
            ${completedTasks.length > 10 ? `
              <p class="task-list-more">他 ${completedTasks.length - 10} 件の完了タスクがあります</p>
            ` : ''}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

