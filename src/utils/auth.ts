// 認証関連のユーティリティ関数
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';
import { User } from '../types';

export class AuthService {
  // メールとパスワードでログイン
  static async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return this.convertFirebaseUser(userCredential.user);
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  }

  // メールとパスワードで新規登録
  static async signUpWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return this.convertFirebaseUser(userCredential.user);
    } catch (error) {
      console.error('新規登録エラー:', error);
      throw error;
    }
  }

  // ログアウト
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  }

  // 認証状態の監視
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, (firebaseUser) => {
      const user = firebaseUser ? this.convertFirebaseUser(firebaseUser) : null;
      callback(user);
    });
  }

  // Firebase UserをアプリのUser型に変換
  private static convertFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL
    };
  }
}
