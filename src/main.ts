// アプリケーションのメインクラス
import { AuthService } from './utils/auth';
import { User, AppState } from './types';

export class App {
  private state: AppState;
  private pages: Map<string, HTMLElement>;

  constructor() {
    this.state = {
      currentUser: null,
      currentPage: 'home',
      theme: 'light'
    };
    this.pages = new Map();
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.setupAuthStateListener();
    this.loadTheme();
    this.showPage('home');
  }

  private setupEventListeners(): void {
    // ナビゲーションボタンのイベントリスナー
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const pageId = target.id.replace('-btn', '');
        this.showPage(pageId);
      });
    });

    // ログインボタン
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLogin());
    }

    // ログアウトボタン
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // テーマ選択
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.setTheme(target.value as 'light' | 'dark');
      });
    }
  }

  private setupAuthStateListener(): void {
    AuthService.onAuthStateChanged((user) => {
      this.state.currentUser = user;
      this.updateUI();
    });
  }

  private showPage(pageId: string): void {
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

    // ナビゲーションボタンの状態を更新
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.id === `${pageId}-btn`) {
        btn.classList.add('active');
      }
    });

    this.state.currentPage = pageId;
  }

  private updateUI(): void {
    const userInfo = document.getElementById('user-info');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (this.state.currentUser) {
      if (userInfo) {
        userInfo.innerHTML = `
          <p>ログイン中: ${this.state.currentUser.email || 'ユーザー'}</p>
        `;
      }
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
      if (userInfo) {
        userInfo.innerHTML = `
          <p>ログインしていません</p>
        `;
      }
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  private async handleLogin(): Promise<void> {
    const email = prompt('メールアドレスを入力してください:');
    const password = prompt('パスワードを入力してください:');

    if (email && password) {
      try {
        await AuthService.signInWithEmail(email, password);
        alert('ログインしました！');
      } catch (error) {
        alert('ログインに失敗しました。');
        console.error(error);
      }
    }
  }

  private async handleLogout(): Promise<void> {
    try {
      await AuthService.signOut();
      alert('ログアウトしました！');
    } catch (error) {
      alert('ログアウトに失敗しました。');
      console.error(error);
    }
  }

  private setTheme(theme: 'light' | 'dark'): void {
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    this.setTheme(savedTheme);
    
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.value = savedTheme;
    }
  }
}

// アプリケーションを開始
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
