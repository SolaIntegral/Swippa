// Firestore連携サービス：タスク、スケジュール、セッションのデータ管理

import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, deleteDoc, onSnapshot, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './main.js';

// タスクコレクション
export const tasksCollection = (userId) => collection(db, 'users', userId, 'tasks');

// スケジュールコレクション
export const schedulesCollection = (userId) => collection(db, 'users', userId, 'schedules');

// セッションコレクション
export const sessionsCollection = (userId) => collection(db, 'users', userId, 'sessions');

// タスク管理
export async function saveTaskToFirestore(userId, task) {
  try {
    const taskRef = doc(tasksCollection(userId), task.id);
    await setDoc(taskRef, {
      title: task.title,
      deadline: Timestamp.fromDate(new Date(task.deadline)),
      emotionMatrix: task.emotionMatrix,
      status: task.status || 'pending',
      createdAt: task.createdAt ? Timestamp.fromDate(new Date(task.createdAt)) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId: userId
    });
    return task;
  } catch (error) {
    console.error('Firestore保存エラー:', error);
    throw error;
  }
}

export async function getTasksFromFirestore(userId) {
  try {
    const q = query(tasksCollection(userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        title: data.title,
        deadline: data.deadline?.toDate().toISOString() || data.deadline,
        emotionMatrix: data.emotionMatrix,
        status: data.status,
        createdAt: data.createdAt?.toDate().toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate().toISOString() || data.updatedAt,
        startedAt: data.startedAt?.toDate().toISOString() || data.startedAt,
        completedAt: data.completedAt?.toDate().toISOString() || data.completedAt,
        rescheduledTo: data.rescheduledTo?.toDate().toISOString() || data.rescheduledTo
      };
    });
  } catch (error) {
    console.error('Firestore取得エラー:', error);
    return [];
  }
}

export async function updateTaskInFirestore(userId, taskId, updates) {
  try {
    const taskRef = doc(tasksCollection(userId), taskId);
    const updateData = {
      updatedAt: Timestamp.now()
    };
    
    // 日付フィールドをTimestampに変換
    if (updates.startedAt) updateData.startedAt = Timestamp.fromDate(new Date(updates.startedAt));
    if (updates.completedAt) updateData.completedAt = Timestamp.fromDate(new Date(updates.completedAt));
    if (updates.rescheduledTo) updateData.rescheduledTo = Timestamp.fromDate(new Date(updates.rescheduledTo));
    
    // その他のフィールドを追加
    Object.keys(updates).forEach(key => {
      if (!['startedAt', 'completedAt', 'rescheduledTo'].includes(key)) {
        updateData[key] = updates[key];
      }
    });
    
    await setDoc(taskRef, updateData, { merge: true });
    return { id: taskId, ...updates };
  } catch (error) {
    console.error('Firestore更新エラー:', error);
    throw error;
  }
}

export async function deleteTaskFromFirestore(userId, taskId) {
  try {
    const taskRef = doc(tasksCollection(userId), taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Firestore削除エラー:', error);
    throw error;
  }
}

// リアルタイム監視
export function subscribeToTasks(userId, callback) {
  const q = query(tasksCollection(userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        title: data.title,
        deadline: data.deadline?.toDate().toISOString() || data.deadline,
        emotionMatrix: data.emotionMatrix,
        status: data.status,
        createdAt: data.createdAt?.toDate().toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate().toISOString() || data.updatedAt,
        startedAt: data.startedAt?.toDate().toISOString() || data.startedAt,
        completedAt: data.completedAt?.toDate().toISOString() || data.completedAt,
        rescheduledTo: data.rescheduledTo?.toDate().toISOString() || data.rescheduledTo
      };
    });
    callback(tasks);
  }, (error) => {
    console.error('リアルタイム監視エラー:', error);
  });
}

// スケジュール管理（イベント形式）
export async function saveScheduleEventToFirestore(userId, event) {
  try {
    // dateキー（"YYYY-M-D"）から日時を生成
    const [year, month, day] = event.date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, event.start, 0);
    const endDate = new Date(year, month - 1, day, 0, event.end, 0);
    
    const scheduleRef = doc(schedulesCollection(userId), event.id);
    await setDoc(scheduleRef, {
      label: event.label,
      type: event.type,
      date: event.date,
      start: event.start,
      end: event.end,
      startTime: Timestamp.fromDate(startDate),
      endTime: Timestamp.fromDate(endDate),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId: userId
    });
    return event;
  } catch (error) {
    console.error('Firestore保存エラー:', error);
    throw error;
  }
}

export async function deleteScheduleEventFromFirestore(userId, eventId) {
  try {
    const scheduleRef = doc(schedulesCollection(userId), eventId);
    await deleteDoc(scheduleRef);
  } catch (error) {
    console.error('Firestore削除エラー:', error);
    throw error;
  }
}

// スケジュール管理（従来形式）
export async function saveScheduleToFirestore(userId, schedule) {
  try {
    const scheduleRef = doc(schedulesCollection(userId), schedule.id);
    await setDoc(scheduleRef, {
      title: schedule.title,
      type: schedule.type,
      startTime: Timestamp.fromDate(new Date(schedule.startTime)),
      endTime: Timestamp.fromDate(new Date(schedule.endTime)),
      dayOfWeek: schedule.dayOfWeek,
      createdAt: schedule.createdAt ? Timestamp.fromDate(new Date(schedule.createdAt)) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId: userId
    });
    return schedule;
  } catch (error) {
    console.error('Firestore保存エラー:', error);
    throw error;
  }
}

// 全スケジュールイベントを取得（イベント形式）
export async function getAllScheduleEventsFromFirestore(userId) {
  try {
    const q = query(schedulesCollection(userId), orderBy('startTime', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      // イベント形式（date/start/end形式）を返す
      if (data.date && typeof data.start === 'number' && typeof data.end === 'number') {
        return {
          id: docSnapshot.id,
          date: data.date,
          start: data.start,
          end: data.end,
          label: data.label,
          type: data.type
        };
      }
      // 従来形式の場合はdateを生成
      const startDate = data.startTime?.toDate() || new Date(data.startTime);
      const date = `${startDate.getFullYear()}-${startDate.getMonth() + 1}-${startDate.getDate()}`;
      const start = startDate.getHours() * 60 + startDate.getMinutes();
      const endDate = data.endTime?.toDate() || new Date(data.endTime);
      const end = endDate.getHours() * 60 + endDate.getMinutes();
      return {
        id: docSnapshot.id,
        date: date,
        start: start,
        end: end,
        label: data.title || data.label || '',
        type: data.type || 'class'
      };
    });
  } catch (error) {
    console.error('Firestore取得エラー:', error);
    return [];
  }
}

export async function getSchedulesFromFirestore(userId, startDate, endDate) {
  try {
    const startTimestamp = Timestamp.fromDate(new Date(startDate));
    const endTimestamp = Timestamp.fromDate(new Date(endDate));
    const q = query(
      schedulesCollection(userId),
      where('startTime', '>=', startTimestamp),
      where('startTime', '<=', endTimestamp),
      orderBy('startTime', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        title: data.title,
        type: data.type,
        startTime: data.startTime?.toDate().toISOString() || data.startTime,
        endTime: data.endTime?.toDate().toISOString() || data.endTime,
        dayOfWeek: data.dayOfWeek,
        createdAt: data.createdAt?.toDate().toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate().toISOString() || data.updatedAt
      };
    });
  } catch (error) {
    console.error('Firestore取得エラー:', error);
    return [];
  }
}

// セッション管理
export async function saveSessionToFirestore(userId, session) {
  try {
    const sessionRef = doc(sessionsCollection(userId), session.id);
    await setDoc(sessionRef, {
      ...session,
      userId: userId,
      updatedAt: new Date().toISOString()
    });
    return session;
  } catch (error) {
    console.error('Firestore保存エラー:', error);
    throw error;
  }
}

