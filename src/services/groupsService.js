import {
  collection, doc, addDoc, updateDoc, setDoc,
  query, where, onSnapshot, serverTimestamp,
  getDoc, arrayUnion, arrayRemove, writeBatch, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// Simple cache for group members (30s TTL)
const membersCache = new Map()
const CACHE_TTL = 30_000

// Tokens are generated with the Web Crypto API and are never predictable.
const generateInviteToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

// ── CREATE GROUP ─────────────────────────────────────────
export const createGroup = async (userId, name, description = '') => {
  const ref = await addDoc(collection(db, 'groups'), {
    name,
    description,
    createdBy: userId,
    members: [userId],
    admins: [userId],
    pendingMembers: [],
    createdAt: serverTimestamp()
  })
  const { inviteToken, expiresAt } = await createGroupInvitation(ref.id, userId)
  // Add group to user's profile
  await updateDoc(doc(db, 'users', userId), {
    groups: arrayUnion(ref.id)
  })
  return { id: ref.id, inviteToken, expiresAt }
}

export const createGroupInvitation = async (groupId, userId) => {
  const inviteToken = generateInviteToken()
  const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
  await setDoc(doc(db, 'groupInvitations', inviteToken), {
    groupId,
    createdBy: userId,
    expiresAt,
    used: false,
    createdAt: serverTimestamp()
  })
  return { inviteToken, expiresAt }
}

// Joining creates a pending request; it never grants membership immediately.
export const requestToJoinGroup = async (userId, token) => {
  const inviteSnap = await getDoc(doc(db, 'groupInvitations', token))
  if (!inviteSnap.exists()) throw new Error('Invitación no encontrada')

  const groupId = inviteSnap.data().groupId
  const invite = inviteSnap.data()
  if (invite.used || !invite.expiresAt || invite.expiresAt.toMillis() <= Date.now()) {
    throw new Error('La invitación ha caducado o ya ha sido utilizada')
  }

  // The requester is not a group member yet, so avoid reading the protected
  // group document. Both updates must succeed together or neither is applied.
  const batch = writeBatch(db)
  batch.update(doc(db, 'groupInvitations', token), {
    used: true,
    usedBy: userId,
    usedAt: serverTimestamp()
  })
  batch.update(doc(db, 'groups', groupId), {
    pendingMembers: arrayUnion(userId)
  })
  await batch.commit()
  return { id: groupId, pending: true }
}

export const approveGroupRequest = async (groupId, userId) => {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayUnion(userId),
    pendingMembers: arrayRemove(userId)
  })
}

export const rejectGroupRequest = async (groupId, userId) => {
  await updateDoc(doc(db, 'groups', groupId), { pendingMembers: arrayRemove(userId) })
}

// ── LEAVE GROUP ──────────────────────────────────────────
export const leaveGroup = async (userId, groupId) => {
  const groupSnap = await getDoc(doc(db, 'groups', groupId))
  if (!groupSnap.exists()) return
  if (groupSnap.data().createdBy === userId) {
    throw new Error('El propietario no puede salir; elimina el grupo desde la cuenta del propietario')
  }

  const batch = writeBatch(db)
  batch.update(doc(db, 'groups', groupId), { members: arrayRemove(userId) })
  batch.update(doc(db, 'users', userId), { groups: arrayRemove(groupId) })
  await batch.commit()
}

// ── GET GROUPS (real-time) ───────────────────────────────
export const subscribeToUserGroups = (userId, callback) => {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId)
  )
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(groups)
  }, console.error)
}

// ── GET GROUP MEMBERS ────────────────────────────────────
export const getGroupMembers = async (memberIds) => {
  if (!memberIds || memberIds.length === 0) return []

  const cacheKey = [...memberIds].sort().join(',')
  const cached = membersCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const members = (await Promise.all(
    memberIds.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    })
  )).filter(Boolean)

  membersCache.set(cacheKey, { data: members, ts: Date.now() })
  return members
}

// ── GET GROUP BY ID ──────────────────────────────────────
export const getGroupById = async (groupId) => {
  const snap = await getDoc(doc(db, 'groups', groupId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ── DELETE GROUP ─────────────────────────────────────────
export const deleteGroup = async (groupId) => {
  const groupSnap = await getDoc(doc(db, 'groups', groupId))
  if (!groupSnap.exists()) return
  const { createdBy } = groupSnap.data()

  const batch = writeBatch(db)
  // Only the owner's profile can be updated from the client.
  batch.update(doc(db, 'users', createdBy), { groups: arrayRemove(groupId) })
  batch.delete(doc(db, 'groups', groupId))
  await batch.commit()
}
