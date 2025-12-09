// 型定義ファイル
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AppState {
  currentUser: User | null;
  currentPage: string;
  theme: 'light' | 'dark';
}

export interface PageConfig {
  id: string;
  title: string;
  element: HTMLElement;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
