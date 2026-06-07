import { initializeApp } from 'firebase/app';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'reflexa-498615.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'reflexa-498615',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'reflexa-498615.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '775591955827',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:775591955827:web:db812030bdb7bfc414c906',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
