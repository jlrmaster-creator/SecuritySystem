import {
  collection, doc, addDoc, updateDoc, deleteDoc, writeBatch,
  query, where, orderBy, onSnapshot, serverTimestamp,
  getDoc, getDocs, deleteField, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ── PRIVACIDAD: retención de 7 días ─────────────────────
// Todo mensaje nuevo lleva `expiresAt`. La política TTL de Firestore (que se
// configura a mano en la consola de Firebase) borra el documento cuando ese
// instante pasa; sin esa política activa el campo no hace nada por sí solo.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const retentionExpiry = () => Timestamp.fromMillis(Date.now() + RETENTION_MS)

// ── CREATE ──────────────────────────────────────────────
export const createReminder = async (userId, data) => {
  const ref = await addDoc(collection(db, 'reminders'), {
    title: data.title,
    description: data.description,
    ownerId: userId,
    isShared: false,
    sharedFrom: null,
    status: 'own',
    expiresAt: retentionExpiry(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return ref.id
}

export const sendMessageToGroup = async (userId, data, group) => {
  const batch = writeBatch(db)
  const ownRef = doc(collection(db, 'reminders'))
  const threadId = data.threadId || ownRef.id
  const messageFields = {
    threadId,
    ...(data.parentId ? { parentId: data.parentId } : {})
  }
  batch.set(ownRef, {
    title: data.title,
    description: data.description,
    ownerId: userId,
    isShared: false,
    sharedFrom: null,
    groupId: group.id,
    ...messageFields,
    status: 'own',
    expiresAt: retentionExpiry(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  group.members.filter(memberId => memberId !== userId).forEach(memberId => {
    const reminderRef = doc(collection(db, 'reminders'))
    const logRef = doc(collection(db, 'sharedReminders'))
    batch.set(reminderRef, {
      title: data.title,
      description: data.description,
      ownerId: memberId,
      isShared: true,
      sharedFrom: userId,
      sharedFromName: data.sharedFromName || 'Usuario',
      groupId: group.id,
      ...messageFields,
      originalId: ownRef.id,
      sharedReminderId: logRef.id,
      status: 'accepted',
      expiresAt: retentionExpiry(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    batch.set(logRef, {
      reminderId: reminderRef.id,
      originalReminderId: ownRef.id,
      threadId,
      fromUserId: userId,
      toUserId: memberId,
      groupId: group.id,
      status: 'accepted',
      expiresAt: retentionExpiry(),
      createdAt: serverTimestamp()
    })
  })
  await batch.commit()
  return ownRef.id
}

export const replyToMessage = async (userId, data, parent, group) => {
  const threadId = parent.threadId || parent.id
  return sendMessageToGroup(userId, {
    ...data,
    threadId,
    parentId: parent.originalId || parent.id
  }, group)
}

// ── READ (real-time) ─────────────────────────────────────
export const subscribeToMyReminders = (userId, callback) => {
  const q = query(
    collection(db, 'reminders'),
    where('ownerId', '==', userId)
  )
  return onSnapshot(q, (snap) => {
    const reminders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(reminders)
  }, console.error)
}

// Escuchar los mensajes que el usuario ha compartido con otros (para ver el estado)
export const subscribeToMySentShares = (userId, callback) => {
  const q = query(
    collection(db, 'sharedReminders'),
    where('fromUserId', '==', userId)
  )
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(data)
  }, console.error)
}

export const subscribeToMyReceivedShares = (userId, callback) => {
  const q = query(
    collection(db, 'sharedReminders'),
    where('toUserId', '==', userId)
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, console.error)
}

export const markThreadAsRead = async (messages, read = true) => {
  const updates = messages
    .filter(message => message.isShared && message.sharedReminderId)
    .map(message => updateDoc(doc(db, 'sharedReminders', message.sharedReminderId), {
      readAt: read ? serverTimestamp() : deleteField()
    }))

  await Promise.all(updates)
}

// Pending shared reminders (not yet accepted)
export const subscribeToPendingShared = (userId, callback) => {
  const q = query(
    collection(db, 'sharedReminders'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(items)
  }, console.error)
}

// ── UPDATE ───────────────────────────────────────────────
export const updateReminder = async (reminderId, data) => {
  await updateDoc(doc(db, 'reminders', reminderId), {
    ...data,
    updatedAt: serverTimestamp()
  })
}

// ── DELETE ───────────────────────────────────────────────
export const deleteReminder = async (reminderId) => {
  await deleteDoc(doc(db, 'reminders', reminderId))
}

// ── RETRACT (retirar el mensaje para todos) ─────────────
// Solo el autor puede hacerlo. Borra en una sola tanda el mensaje original,
// las copias que se crearon para cada miembro del grupo y los registros
// asociados de sharedReminders. Las reglas lo permiten porque el original es
// del autor (ownerId == uid) y cada copia lleva sharedFrom == uid; cualquier
// otro miembro sigue sin poder borrar lo que no escribió.
export const retractMessageForEveryone = async (userId, message) => {
  if (!message.groupId) throw new Error('Esta acción solo existe en mensajes de grupo')
  if (message.ownerId !== userId) throw new Error('Solo el autor puede retirar el mensaje')

  const originalId = message.originalId || message.id
  const copies = await getDocs(query(
    collection(db, 'reminders'),
    where('groupId', '==', message.groupId),
    where('originalId', '==', originalId)
  ))

  const batch = writeBatch(db)
  batch.delete(doc(db, 'reminders', originalId))
  copies.docs.forEach(copy => {
    batch.delete(copy.ref)
    const logId = copy.data().sharedReminderId
    if (logId) batch.delete(doc(db, 'sharedReminders', logId))
  })
  await batch.commit()
  return copies.size
}

// ── CLEANUP (borrado manual desde el perfil) ────────────
// El plan gratuito de Firestore no admite políticas TTL, así que la retención
// la aplica cada usuario: borra sus propios documentos (mensajes escritos y
// copias recibidas) con más de N días. Los mensajes que otros escribieron se
// limpian cuando cada persona ejecuta su propia limpieza.
export const deleteOldMessages = async (userId, days) => {
  const retentionDays = Math.max(1, Math.floor(Number(days) || 7))
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000

  const toMillis = (value) => {
    if (!value) return 0
    if (typeof value.toMillis === 'function') return value.toMillis()
    if (Number.isFinite(value.seconds)) return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000)
    const parsed = new Date(value).getTime()
    return Number.isFinite(parsed) ? parsed : 0
  }
  const isExpired = (value) => {
    const millis = toMillis(value)
    return millis > 0 && millis < cutoff
  }

  // Firestore limita cada lote a 500 operaciones.
  const deleteInBatches = async (refs) => {
    let deleted = 0
    let batch = writeBatch(db)
    let pending = 0
    for (const ref of refs) {
      batch.delete(ref)
      pending += 1
      if (pending === 500) {
        await batch.commit()
        deleted += pending
        batch = writeBatch(db)
        pending = 0
      }
    }
    if (pending > 0) {
      await batch.commit()
      deleted += pending
    }
    return deleted
  }

  const messages = await getDocs(query(
    collection(db, 'reminders'),
    where('ownerId', '==', userId)
  ))
  const messageRefs = messages.docs
    .filter(snap => isExpired(snap.data().createdAt))
    .map(snap => snap.ref)
  const deletedMessages = await deleteInBatches(messageRefs)

  // Los registros de envío (sharedReminders) son metadatos de esos mensajes:
  // se limpian después y de forma tolerante a fallos, porque mientras no se
  // publiquen las reglas nuevas el borrado puede ser rechazado.
  let deletedLogs = 0
  try {
    const [sent, received] = await Promise.all([
      getDocs(query(collection(db, 'sharedReminders'), where('fromUserId', '==', userId))),
      getDocs(query(collection(db, 'sharedReminders'), where('toUserId', '==', userId)))
    ])
    const logRefs = [...new Map(
      [...sent.docs, ...received.docs]
        .filter(snap => isExpired(snap.data().createdAt))
        .map(snap => [snap.id, snap.ref])
    ).values()]
    deletedLogs = await deleteInBatches(logRefs)
  } catch (error) {
    console.warn('No se pudieron limpiar los registros de envío', error)
  }

  return { deletedMessages, deletedLogs }
}

// ── SHARE ────────────────────────────────────────────────
export const shareReminder = async (reminder, fromUserId, toUserId, groupId, toUserName) => {
  // Create reminder copy FIRST (sender can create via isShared+sharedFrom rule)
  const sharedRef = await addDoc(collection(db, 'reminders'), {
    title: reminder.title,
    description: reminder.description,
    dateTime: reminder.dateTime || serverTimestamp(),
    importance: reminder.importance,
    color: reminder.color,
    category: reminder.category,
    isPermanent: reminder.isPermanent || false,
    ownerId: toUserId,
    isShared: true,
    sharedFrom: fromUserId,
    sharedFromName: reminder.sharedFromName || 'Unknown',
    originalId: reminder.id,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  // Create share log with the known reminder ID
  const logRef = await addDoc(collection(db, 'sharedReminders'), {
    reminderId: sharedRef.id,
    originalReminderId: reminder.id,
    fromUserId,
    toUserId,
    toUserName: toUserName || 'Usuario',
    groupId,
    status: 'pending',
    createdAt: serverTimestamp()
  })

  // Update the reminder with the log ID (allowed via isShared+sharedFrom rule)
  await updateDoc(doc(db, 'reminders', sharedRef.id), {
    sharedReminderId: logRef.id
  })

  return sharedRef.id
}

export const acceptSharedReminder = async (reminderId) => {
  const snap = await getDoc(doc(db, 'reminders', reminderId))
  if (!snap.exists()) return
  const data = snap.data()

  await updateDoc(doc(db, 'reminders', reminderId), {
    status: 'accepted',
    updatedAt: serverTimestamp()
  })

  if (data.sharedReminderId) {
    await updateDoc(doc(db, 'sharedReminders', data.sharedReminderId), { status: 'accepted' })
  }
}

export const rejectSharedReminder = async (reminderId) => {
  const snap = await getDoc(doc(db, 'reminders', reminderId))
  if (!snap.exists()) return
  const data = snap.data()

  await deleteDoc(doc(db, 'reminders', reminderId))

  if (data.sharedReminderId) {
    await updateDoc(doc(db, 'sharedReminders', data.sharedReminderId), { status: 'rejected' })
  }
}

// ── GET ONE ──────────────────────────────────────────────
export const getReminderById = async (id) => {
  const snap = await getDoc(doc(db, 'reminders', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
