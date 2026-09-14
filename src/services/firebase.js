import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAiUnm9EzHTQgXKl3DCsBy9IqLoLUggKqA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'securitysystem-4a79b.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'securitysystem-4a79b',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'securitysystem-4a79b.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '245912437740',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:245912437740:web:3347a73c81aa14e7a4b6c9'
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
