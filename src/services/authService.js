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
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000
const LOGIN_ATTEMPTS_KEY = 'securitysystem-login-attempts'

const normalizeLoginKey = (email) => email.trim().toLowerCase()

const readLoginAttempts = () => {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}')
  } catch {
    return {}
  }
}

export const getLoginLockout = (email) => {
  const record = readLoginAttempts()[normalizeLoginKey(email)]
  if (!record || record.lockedUntil <= Date.now()) return 0
  return record.lockedUntil
}

export const recordLoginFailure = (email) => {
  const key = normalizeLoginKey(email)
  const attempts = readLoginAttempts()
  const record = attempts[key] || { count: 0, lockedUntil: 0 }
  const next = {
    count: record.count + 1,
    lockedUntil: record.count + 1 >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOGIN_LOCKOUT_MS : 0
  }
  attempts[key] = next
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts))
  return next.lockedUntil
}

export const clearLoginFailures = (email) => {
  const attempts = readLoginAttempts()
  delete attempts[normalizeLoginKey(email)]
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts))
}

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
