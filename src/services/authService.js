import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  fetchSignInMethodsForEmail
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

const googleProvider = new GoogleAuthProvider()

export const registerUser = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await createUserProfile(cred.user, { displayName })
  return cred.user
}

export const getSignInMethodsForEmail = async (email) => {
  return await fetchSignInMethodsForEmail(auth, email)
}

export const loginUser = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export const loginWithGoogle = async () => {
  const cred = await signInWithPopup(auth, googleProvider)
  const userRef = doc(db, 'users', cred.user.uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    await createUserProfile(cred.user, {})
  }
  return cred.user
}

export const logoutUser = () => signOut(auth)

export const createUserProfile = async (user, extra = {}) => {
  const userRef = doc(db, 'users', user.uid)
  await setDoc(userRef, {
    uid: user.uid,
    displayName: user.displayName || extra.displayName || 'Usuario',
    email: user.email,
    photoURL: user.photoURL || null,
    groups: [],
    createdAt: serverTimestamp(),
    ...extra
  }, { merge: true })
}

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)
