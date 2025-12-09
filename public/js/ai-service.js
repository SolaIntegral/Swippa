// AI推論サービス（簡易版）：タスク提案ロジック

// タスクを提案する（簡易版AI推論）
export function proposeTask(tasks) {
  if (!tasks || tasks.length === 0) return null;

  // 現在の時間を取得
  const now = new Date();
  const currentHour = now.getHours();

  // 簡易推論ロジック
  // 1. 締切が近いタスクを優先
  // 2. 達成感が高く、抵抗感が低いタスクを優先
  // 3. 時間帯に応じた調整（朝は達成感重視、夜は抵抗感低めを重視）

  const scoredTasks = tasks.map(task => {
    const deadline = new Date(task.deadline);
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
    
    // スコア計算
    let score = 0;
    
    // 締切の緊急度（締切が近いほど高い）
    if (hoursUntilDeadline < 24) {
      score += 100; // 24時間以内は最優先
    } else if (hoursUntilDeadline < 72) {
      score += 50; // 3日以内
    } else {
      score += 10; // それ以外
    }
    
    // 達成感（高いほど良い）
    score += task.emotionMatrix.achievement * 0.3;
    
    // 抵抗感（低いほど良い）
    score -= task.emotionMatrix.resistance * 0.2;
    
    // 時間帯による調整
    if (currentHour >= 6 && currentHour < 12) {
      // 朝: 達成感を重視
      score += task.emotionMatrix.achievement * 0.2;
    } else if (currentHour >= 12 && currentHour < 18) {
      // 昼: バランス
      score += (task.emotionMatrix.achievement - task.emotionMatrix.resistance) * 0.1;
    } else {
      // 夜: 抵抗感が低いものを重視
      score += (100 - task.emotionMatrix.resistance) * 0.2;
    }
    
    return { task, score };
  });

  // スコアが高い順にソート
  scoredTasks.sort((a, b) => b.score - a.score);

  return scoredTasks[0]?.task || null;
}

// タスクをリスケジュールする（AI推論版）
export function rescheduleTask(task, currentTime, existingSchedules = []) {
  const deadline = new Date(task.deadline);
  const now = new Date(currentTime || new Date());
  
  // 締切までの日数
  const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  
  // AI推論ロジック
  // 1. 締切が近い場合（24時間以内）: できるだけ早く（今日・明日の空き時間）
  // 2. 締切が中程度（3日以内）: 締切の1-2日前、抵抗感が低い時間帯
  // 3. 締切が遠い場合: 締切の3日前、達成感が高い時間帯
  
  let rescheduleDate = new Date(deadline);
  
  if (daysUntilDeadline <= 1) {
    // 緊急: 今日または明日の空き時間を探す
    rescheduleDate = new Date(now);
    rescheduleDate.setDate(rescheduleDate.getDate() + (rescheduleDate.getHours() >= 18 ? 1 : 0));
    
    // 朝9時または午後2時を推奨（空き時間を考慮）
    const recommendedHour = task.emotionMatrix.resistance > 70 ? 14 : 9;
    rescheduleDate.setHours(recommendedHour, 0, 0, 0);
    
    // 既存スケジュールとの衝突を避ける
    rescheduleDate = avoidScheduleConflict(rescheduleDate, existingSchedules);
  } else if (daysUntilDeadline <= 3) {
    // 中程度: 締切の1-2日前
    rescheduleDate.setDate(rescheduleDate.getDate() - Math.min(2, Math.max(1, daysUntilDeadline - 1)));
    
    // 抵抗感が低い時間帯を選択
    if (task.emotionMatrix.resistance > 70) {
      rescheduleDate.setHours(14, 0, 0, 0); // 午後2時
    } else if (task.emotionMatrix.resistance > 40) {
      rescheduleDate.setHours(10, 0, 0, 0); // 午前10時
    } else {
      rescheduleDate.setHours(9, 0, 0, 0); // 朝9時
    }
    
    // 既存スケジュールとの衝突を避ける
    rescheduleDate = avoidScheduleConflict(rescheduleDate, existingSchedules);
  } else {
    // 余裕あり: 締切の3日前
    rescheduleDate.setDate(rescheduleDate.getDate() - 3);
    
    // 達成感が高い時間帯を選択（朝型）
    if (task.emotionMatrix.achievement > 70) {
      rescheduleDate.setHours(9, 0, 0, 0); // 朝9時
    } else {
      rescheduleDate.setHours(10, 0, 0, 0); // 午前10時
    }
    
    // 既存スケジュールとの衝突を避ける
    rescheduleDate = avoidScheduleConflict(rescheduleDate, existingSchedules);
  }
  
  return {
    rescheduledDate: rescheduleDate,
    reason: generateRescheduleReason(task, daysUntilDeadline, rescheduleDate)
  };
}

// スケジュール衝突を避ける
function avoidScheduleConflict(proposedDate, existingSchedules) {
  if (!existingSchedules || existingSchedules.length === 0) {
    return proposedDate;
  }
  
  const proposedTime = proposedDate.getTime();
  const proposedEnd = proposedTime + (2 * 60 * 60 * 1000); // 2時間後
  
  // 衝突チェック
  const hasConflict = existingSchedules.some(schedule => {
    const scheduleStart = new Date(schedule.startTime).getTime();
    const scheduleEnd = new Date(schedule.endTime).getTime();
    
    return (proposedTime >= scheduleStart && proposedTime < scheduleEnd) ||
           (proposedEnd > scheduleStart && proposedEnd <= scheduleEnd) ||
           (proposedTime <= scheduleStart && proposedEnd >= scheduleEnd);
  });
  
  if (hasConflict) {
    // 衝突している場合、2時間後を試す
    const alternative = new Date(proposedDate);
    alternative.setHours(alternative.getHours() + 2);
    return avoidScheduleConflict(alternative, existingSchedules);
  }
  
  return proposedDate;
}

// リスケ理由を生成
function generateRescheduleReason(task, daysUntilDeadline, rescheduledDate) {
  const now = new Date();
  const rescheduleTime = new Date(rescheduledDate);
  const hoursUntilReschedule = (rescheduleTime - now) / (1000 * 60 * 60);
  
  if (daysUntilDeadline <= 1) {
    return `締切が近いため、${hoursUntilReschedule < 24 ? '今日' : '明日'}の${rescheduleTime.getHours()}時に再配置しました。`;
  } else if (daysUntilDeadline <= 3) {
    return `締切の${Math.ceil((new Date(task.deadline) - rescheduleTime) / (1000 * 60 * 60 * 24))}日前、抵抗感が低い時間帯（${rescheduleTime.getHours()}時）に再配置しました。`;
  } else {
    return `締切の3日前、集中しやすい時間帯（${rescheduleTime.getHours()}時）に再配置しました。`;
  }
}

