// コンパイルされたJavaScriptファイル（publicフォルダに配置）
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase設定（config.jsから読み込む）
// config.jsは .env.local から自動生成されます
const firebaseConfig = window.firebaseConfig || {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Firebase設定の検証
if (firebaseConfig.apiKey === "your-api-key-here" || 
    firebaseConfig.projectId === "your-project-id") {
  console.error('⚠️ Firebase設定が正しくありません。');
  console.error('1. .env.local.example をコピーして .env.local を作成');
  console.error('2. .env.local にFirebase設定値を入力');
  console.error('3. npm run load-env を実行して設定を反映');
  console.error('設定値の取得方法: https://console.firebase.google.com/ → プロジェクト設定 → 全般 → アプリ');
}

// Firebase初期化
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error('Firebase初期化エラー:', error);
  console.error('Firebase設定を確認してください。');
}

export { auth, db };

// Google認証プロバイダー
let GoogleAuthProvider = null;

// 認証関連の関数
class AuthService {
  static async initGoogleAuth() {
    try {
      const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      GoogleAuthProvider = new authModule.GoogleAuthProvider();
      GoogleAuthProvider.addScope('profile');
      GoogleAuthProvider.addScope('email');
    } catch (error) {
      console.error('Google Auth初期化エラー:', error);
    }
  }

  static async signInWithGoogle() {
    try {
      // Firebase設定の確認
      if (!auth) {
        throw new Error('Firebaseが初期化されていません。Firebase設定を確認してください。');
      }
      
      if (!GoogleAuthProvider) {
        await AuthService.initGoogleAuth();
      }
      const { signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      const result = await signInWithPopup(auth, GoogleAuthProvider);
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      };
    } catch (error) {
      console.error('Googleログインエラー:', error);
      
      // エラーメッセージをユーザーに分かりやすく表示
      if (error.code === 'auth/api-key-not-valid') {
        throw new Error('Firebase APIキーが無効です。Firebase設定を確認してください。');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('ログインがキャンセルされました。');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('ポップアップがブロックされました。ブラウザの設定を確認してください。');
      }
      
      throw error;
    }
  }

  static async signOut() {
    try {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  }

  static onAuthStateChanged(callback) {
    const authModulePromise = import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    return authModulePromise.then(authModule => {
      return authModule.onAuthStateChanged(auth, (firebaseUser) => {
        const user = firebaseUser ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        } : null;
        callback(user);
      });
    });
  }
}

// アプリケーションのメインクラス
class App {
  constructor() {
    this.state = {
      currentUser: null,
      currentPage: 'login',
      theme: 'light'
    };
    this.featuresInitialized = false;
    // モーダルを確実に閉じた状態で初期化
    this.init();
    // 初期化時にモーダルを閉じる
    setTimeout(() => {
      this.closeTaskModal();
    }, 100);
  }

  init() {
    // DOMが完全に読み込まれるまで少し待つ
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          this.setupEventListeners();
        }, 100);
      });
    } else {
      setTimeout(() => {
        this.setupEventListeners();
      }, 100);
    }
    
    this.setupAuthStateListener();
    this.loadTheme();
    
    // ログイン状態を確認してから初期化
    this.checkAuthAndInit();
  }

  async checkAuthAndInit() {
    // 認証状態を確認（setupAuthStateListenerで処理されるため、ここでは初期表示のみ）
    // setupAuthStateListenerが呼ばれるまで待つ
  }

  async initLoggedInFeatures() {
    // ログイン後にイベントリスナーを再設定（動的に表示されるボタン用）
    setTimeout(() => {
      this.setupEventListeners();
    }, 200);
    
    // スケジュール画面のJSを遅延ロード
    import('./schedule.js').then(async m => {
      if (m && m.setupScheduleUI) {
        await m.setupScheduleUI();
      }
    });
    
    // メイン画面の初期化
    import('./main-screen.js').then(m => m && m.initMainScreen && m.initMainScreen());
    
    // ダッシュボードの初期化
    import('./dashboard.js').then(m => {
      if (m && m.initDashboard) {
        m.initDashboard().catch(err => console.error('ダッシュボード初期化エラー:', err));
      }
    });
    
    // FABとタスク追加モーダルの初期化
    this.initTaskModal();
  }

  setupEventListeners() {
    // ナビゲーションボタンのイベントリスナー（フッター）- イベントデリゲーションを使用
    const navFooter = document.querySelector('.nav-footer');
    if (navFooter && !navFooter.dataset.listenerAttached) {
      navFooter.dataset.listenerAttached = 'true';
      
      // タッチイベントとクリックイベントの両方をサポート
      const handleNavClick = (e) => {
        // スマホではe.targetがimgやspanになる可能性があるため、closestで親要素を探す
        const target = e.target.closest('.nav-footer-btn');
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          const pageId = target.dataset.page;
          if (pageId) {
            this.showPage(pageId);
          }
        }
      };
      
      navFooter.addEventListener('click', handleNavClick);
      navFooter.addEventListener('touchend', (e) => {
        // タッチイベントでもクリックイベントを発火させる
        handleNavClick(e);
      }, { passive: false });
    }

    // Googleログインボタン
    const googleSignInBtn = document.getElementById('google-signin-btn');
    if (googleSignInBtn && !googleSignInBtn.dataset.listenerAttached) {
      googleSignInBtn.dataset.listenerAttached = 'true';
      const handleGoogleSignIn = () => this.handleGoogleSignIn();
      googleSignInBtn.addEventListener('click', handleGoogleSignIn);
      googleSignInBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleGoogleSignIn();
      }, { passive: false });
    }

    // ログアウトボタン
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
      logoutBtn.dataset.listenerAttached = 'true';
      const handleLogout = () => this.handleLogout();
      logoutBtn.addEventListener('click', handleLogout);
      logoutBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleLogout();
      }, { passive: false });
    }

    // テーマ選択
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect && !themeSelect.dataset.listenerAttached) {
      themeSelect.dataset.listenerAttached = 'true';
      themeSelect.addEventListener('change', (e) => {
        const target = e.target;
        this.setTheme(target.value);
      });
    }

    // ON/OFF時間設定の読み込み
    this.loadOnOffTimeSettings();

    // ON/OFF時間設定の保存
    const saveOnOffTimeBtn = document.getElementById('save-onoff-time-btn');
    if (saveOnOffTimeBtn && !saveOnOffTimeBtn.dataset.listenerAttached) {
      saveOnOffTimeBtn.dataset.listenerAttached = 'true';
      const handleSaveOnOffTime = () => this.saveOnOffTimeSettings();
      saveOnOffTimeBtn.addEventListener('click', handleSaveOnOffTime);
      saveOnOffTimeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleSaveOnOffTime();
      }, { passive: false });
    }

    // Google認証の初期化（一度だけ）
    if (!window.googleAuthInitialized) {
      AuthService.initGoogleAuth();
      window.googleAuthInitialized = true;
    }

    // FABボタン
    const fabBtn = document.getElementById('fab-btn');
    if (fabBtn && !fabBtn.dataset.listenerAttached) {
      fabBtn.dataset.listenerAttached = 'true';
      const handleFabClick = () => this.openTaskModal();
      fabBtn.addEventListener('click', handleFabClick);
      fabBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleFabClick();
      }, { passive: false });
    }

    // モーダルクローズ
    const modalClose = document.getElementById('modal-close');
    const taskCancelBtn = document.getElementById('task-cancel-btn');
    if (modalClose && !modalClose.dataset.listenerAttached) {
      modalClose.dataset.listenerAttached = 'true';
      const handleClose = () => this.closeTaskModal();
      modalClose.addEventListener('click', handleClose);
      modalClose.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleClose();
      }, { passive: false });
    }
    if (taskCancelBtn && !taskCancelBtn.dataset.listenerAttached) {
      taskCancelBtn.dataset.listenerAttached = 'true';
      const handleCancel = () => this.closeTaskModal();
      taskCancelBtn.addEventListener('click', handleCancel);
      taskCancelBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleCancel();
      }, { passive: false });
    }

    // タスク保存
    const taskSaveBtn = document.getElementById('task-save-btn');
    if (taskSaveBtn && !taskSaveBtn.dataset.listenerAttached) {
      taskSaveBtn.dataset.listenerAttached = 'true';
      const handleSave = () => this.saveTask();
      taskSaveBtn.addEventListener('click', handleSave);
      taskSaveBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleSave();
      }, { passive: false });
    }

    // モーダルイベント
    this.setupModalEvents();
  }

  initTaskModal() {
    // 感情マトリクスの初期化
    import('./tasks.js').then(m => {
      if (m && m.initEmotionMatrix) {
        m.initEmotionMatrix();
      }
    });
  }

  openTaskModal() {
    // ログインチェック
    if (!this.state.currentUser) {
      alert('タスクを追加するにはログインが必要です');
      this.showPage('login');
      return;
    }

    const modal = document.getElementById('task-modal');
    if (modal) {
      // モーダルが既に開いている場合は何もしない
      if (modal.classList.contains('active')) {
        return;
      }
      modal.classList.add('active');
      
      // フォームをリセット
      document.getElementById('task-name').value = '';
      const deadlineInput = document.getElementById('task-deadline');
      if (deadlineInput) {
        // デフォルトで明日の9時を設定
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        deadlineInput.value = tomorrow.toISOString().slice(0, 16);
      }
      
      // 感情マトリクスをリセット
      import('./tasks.js').then(m => {
        if (m && m.resetEmotionMatrix) {
          m.resetEmotionMatrix();
        }
        if (m && m.initEmotionMatrix) {
          m.initEmotionMatrix();
        }
      });
    }
  }

  closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  setupModalEvents() {
    // モーダルの背景クリックで閉じる
    const modal = document.getElementById('task-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeTaskModal();
        }
      });
    }
  }

  async saveTask() {
    const taskName = document.getElementById('task-name').value.trim();
    const taskDeadline = document.getElementById('task-deadline').value;

    if (!taskName) {
      alert('タスク名を入力してください');
      return;
    }

    if (!taskDeadline) {
      alert('締切を選択してください');
      return;
    }

    // 感情マトリクスの値を取得
    const { getEmotionMatrixValues } = await import('./tasks.js');
    const emotionMatrix = getEmotionMatrixValues();

    // タスクを保存
    const { addTask } = await import('./tasks.js');
    const task = await addTask({
      title: taskName,
      deadline: new Date(taskDeadline).toISOString(),
      emotionMatrix: emotionMatrix
    });

    // モーダルを閉じる
    this.closeTaskModal();

    // メイン画面のタスク表示を更新
    const { updateTaskDisplay } = await import('./main-screen.js');
    if (updateTaskDisplay) {
      await updateTaskDisplay();
    }

    // イベントを発火
    window.dispatchEvent(new CustomEvent('task-added', { detail: task }));

    alert('タスクを追加しました！');
  }

  setupAuthStateListener() {
    // 初回表示時は必ずログイン画面を表示
    this.showPage('login');
    
    AuthService.onAuthStateChanged((user) => {
      const wasLoggedIn = !!this.state.currentUser;
      this.state.currentUser = user;
      
      if (user && !wasLoggedIn) {
        // ログインした場合
        this.updateUI();
        // ログイン成功後、メイン画面に遷移
        this.showPage('main');
      } else if (!user && wasLoggedIn) {
        // ログアウトした場合
        this.updateUI();
        // ログアウト後、必ずログイン画面に戻る
        this.showPage('login');
      } else if (!user) {
        // 未ログイン状態（初回読み込み含む）
        this.updateUI();
        // 必ずログイン画面を表示
        this.showPage('login');
      } else if (user) {
        // 既にログイン済みの場合（ページリロード時など）
        this.updateUI();
        // メイン画面を表示
        this.showPage('main');
      }
    });
  }

  showPage(pageId) {
    // ログイン必須ページのチェック
    const protectedPages = ['main', 'schedule', 'dashboard'];
    if (protectedPages.includes(pageId) && !this.state.currentUser) {
      // ログイン画面にリダイレクト（アラートは表示しない）
      pageId = 'login';
    }
    
    // 未ログイン時は常にログイン画面を表示
    if (!this.state.currentUser && pageId !== 'login') {
      pageId = 'login';
    }

    // 現在のページを非表示
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
      currentPage.classList.remove('active');
    }

    // 新しいページを表示
    const newPage = document.getElementById(`${pageId}-page`);
    if (newPage) {
      newPage.classList.add('active');
    }

    // ナビゲーションボタンの状態を更新（フッター）
    const navButtons = document.querySelectorAll('.nav-footer-btn');
    navButtons.forEach(btn => {
      btn.classList.remove('active');
      const navIcon = btn.querySelector('.nav-icon');
      if (btn.dataset.page === pageId) {
        btn.classList.add('active');
        // アクティブアイコンに切り替え
        if (navIcon && btn.id === 'schedule-btn') {
          // スケジュールのアクティブ用アイコンがない場合は、同じアイコンを使用し、CSSで色を変更
          navIcon.src = 'images/icons/schedule_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
          navIcon.style.filter = 'brightness(0) saturate(100%) invert(40%) sepia(100%) saturate(2878%) hue-rotate(194deg) brightness(102%) contrast(101%)';
        } else if (navIcon && btn.id === 'main-btn') {
          navIcon.src = 'images/icons/home_24dp_3498DB_FILL0_wght400_GRAD0_opsz24.svg';
        } else if (navIcon && btn.id === 'dashboard-btn') {
          navIcon.src = 'images/icons/dashboard_24dp_3498DB_FILL0_wght400_GRAD0_opsz24.svg';
        }
      } else {
        // 非アクティブアイコンに切り替え
        if (navIcon && btn.id === 'schedule-btn') {
          navIcon.src = 'images/icons/schedule_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
          navIcon.style.filter = '';
        } else if (navIcon && btn.id === 'main-btn') {
          navIcon.src = 'images/icons/home_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
        } else if (navIcon && btn.id === 'dashboard-btn') {
          navIcon.src = 'images/icons/dashboard_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
        }
      }
    });

    this.state.currentPage = pageId;

    // FABボタンの表示/非表示を更新（メイン画面のみ）
    const fabBtn = document.getElementById('fab-btn');
    if (fabBtn && this.state.currentUser) {
      if (pageId === 'main') {
        fabBtn.style.display = 'flex';
        fabBtn.style.visibility = 'visible';
      } else {
        fabBtn.style.display = 'none';
        fabBtn.style.visibility = 'hidden';
      }
    }

    // メインページに遷移したら、タスク表示を更新
    if (pageId === 'main') {
      import('./main-screen.js').then(m => {
        if (m && m.updateTaskDisplay) {
          m.updateTaskDisplay().catch(err => console.error('タスク表示更新エラー:', err));
        }
      });
    }
    
    // ダッシュボードページに遷移したら、ダッシュボードを更新
    if (pageId === 'dashboard') {
      import('./dashboard.js').then(m => {
        if (m && m.updateDashboard) {
          m.updateDashboard().catch(err => console.error('ダッシュボード更新エラー:', err));
        }
      });
    }
  }

  updateUI() {
    // フッターナビゲーションの表示/非表示
    const navFooter = document.querySelector('.nav-footer');
    if (navFooter) {
      if (this.state.currentUser) {
        navFooter.style.display = 'flex';
      } else {
        navFooter.style.display = 'none';
      }
    }
    
    const loginSection = document.getElementById('login-section');
    const loggedInSection = document.getElementById('logged-in-section');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const userAvatar = document.getElementById('user-avatar');
    const fabBtn = document.getElementById('fab-btn');

    if (this.state.currentUser) {
      // ログイン済み
      if (loginSection) loginSection.style.display = 'none';
      if (loggedInSection) loggedInSection.style.display = 'block';
      
      if (userName) {
        userName.textContent = this.state.currentUser.displayName || 'ユーザー';
      }
      if (userEmail) {
        userEmail.textContent = this.state.currentUser.email || '';
      }
      if (userAvatar && this.state.currentUser.photoURL) {
        userAvatar.src = this.state.currentUser.photoURL;
        userAvatar.style.display = 'block';
      } else if (userAvatar) {
        userAvatar.style.display = 'none';
      }

      // FABを表示（メイン画面のみ）
      if (fabBtn) {
        if (this.state.currentPage === 'main') {
          fabBtn.style.display = 'flex';
          fabBtn.style.visibility = 'visible';
        } else {
          fabBtn.style.display = 'none';
          fabBtn.style.visibility = 'hidden';
        }
      }

      // ログイン済み機能を初期化
      if (!this.featuresInitialized) {
        this.initLoggedInFeatures();
        this.featuresInitialized = true;
      }
    } else {
      // 未ログイン
      if (loginSection) loginSection.style.display = 'block';
      if (loggedInSection) loggedInSection.style.display = 'none';

      // FABを非表示
      if (fabBtn) fabBtn.style.display = 'none';

      // 保護されたページにいる場合はログイン画面にリダイレクト
      const protectedPages = ['main', 'schedule', 'dashboard'];
      if (protectedPages.includes(this.state.currentPage)) {
        this.showPage('login');
      }
    }
  }

  async handleGoogleSignIn() {
    try {
      await AuthService.signInWithGoogle();
      // UIは onAuthStateChanged で自動更新される
      // メイン画面に自動遷移
    } catch (error) {
      let errorMessage = 'ログインに失敗しました。';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'ログインがキャンセルされました。';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください。';
      } else if (error.code === 'auth/api-key-not-valid') {
        errorMessage = 'Firebase APIキーが無効です。Firebase設定を確認してください。\n\nFirebase Consoleから設定値を取得し、public/js/main.jsのfirebaseConfigを更新してください。';
      }
      alert(errorMessage);
      console.error('ログインエラー詳細:', error);
    }
  }

  async handleLogout() {
    try {
      await AuthService.signOut();
      this.featuresInitialized = false;
      alert('ログアウトしました！');
      // ログイン画面にリダイレクト
      this.showPage('login');
    } catch (error) {
      alert('ログアウトに失敗しました。');
      console.error(error);
    }
  }

  setTheme(theme) {
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  // ON/OFF時間設定の読み込み
  loadOnOffTimeSettings() {
    const saved = localStorage.getItem('onoff-time-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        const onTimeStart = document.getElementById('on-time-start');
        const onTimeEnd = document.getElementById('on-time-end');
        const offTimeStart = document.getElementById('off-time-start');
        const offTimeEnd = document.getElementById('off-time-end');
        
        if (onTimeStart && settings.onTimeStart) onTimeStart.value = settings.onTimeStart;
        if (onTimeEnd && settings.onTimeEnd) onTimeEnd.value = settings.onTimeEnd;
        if (offTimeStart && settings.offTimeStart) offTimeStart.value = settings.offTimeStart;
        if (offTimeEnd && settings.offTimeEnd) offTimeEnd.value = settings.offTimeEnd;
      } catch (err) {
        console.error('ON/OFF時間設定の読み込みエラー:', err);
      }
    } else {
      // デフォルト値（12:00-13:00 ON、16:30-18:00 OFF）
      const onTimeStart = document.getElementById('on-time-start');
      const onTimeEnd = document.getElementById('on-time-end');
      const offTimeStart = document.getElementById('off-time-start');
      const offTimeEnd = document.getElementById('off-time-end');
      
      if (onTimeStart) onTimeStart.value = '12:00';
      if (onTimeEnd) onTimeEnd.value = '13:00';
      if (offTimeStart) offTimeStart.value = '16:30';
      if (offTimeEnd) offTimeEnd.value = '18:00';
    }
  }

  // ON/OFF時間設定の保存
  saveOnOffTimeSettings() {
    const onTimeStart = document.getElementById('on-time-start');
    const onTimeEnd = document.getElementById('on-time-end');
    const offTimeStart = document.getElementById('off-time-start');
    const offTimeEnd = document.getElementById('off-time-end');
    
    if (!onTimeStart || !onTimeEnd || !offTimeStart || !offTimeEnd) {
      alert('設定の読み込みに失敗しました。');
      return;
    }
    
    const settings = {
      onTimeStart: onTimeStart.value,
      onTimeEnd: onTimeEnd.value,
      offTimeStart: offTimeStart.value,
      offTimeEnd: offTimeEnd.value
    };
    
    localStorage.setItem('onoff-time-settings', JSON.stringify(settings));
    alert('ON/OFF時間を保存しました。');
    
    // スケジュール画面を更新
    window.dispatchEvent(new CustomEvent('onoff-time-updated'));
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = savedTheme;
    }
  }
}

// アプリケーションを開始
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
