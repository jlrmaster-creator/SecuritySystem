const SCOPES = 'https://www.googleapis.com/auth/calendar.events'
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'

let tokenClient = null
let gapiInited = false
let gisInited = false

const pendingResolvers = []

function resolvePending(token) {
  pendingResolvers.splice(0).forEach(r => r(token))
}

export const isGoogleClientConfigured = () => {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return id && id !== 'YOUR_GOOGLE_CLIENT_ID'
}

export const initGoogleApis = () => {
  return new Promise((resolve) => {
    if (gapiInited && gisInited) return resolve(true)
    if (!isGoogleClientConfigured()) return resolve(false)

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

    // Load GAPI
    const gapiScript = document.createElement('script')
    gapiScript.src = 'https://apis.google.com/js/api.js'
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({})
        await window.gapi.client.load('calendar', 'v3', DISCOVERY_DOC)
        gapiInited = true
        if (gisInited) resolve(true)
      })
    }
    document.head.appendChild(gapiScript)

    // Load GIS
    const gisScript = document.createElement('script')
    gisScript.src = 'https://accounts.google.com/gsi/client'
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.access_token) {
            if (window.gapi?.client) window.gapi.client.setToken(resp)
            resolvePending(resp.access_token)
          }
        },
      })
      gisInited = true
      if (gapiInited) resolve(true)
    }
    document.head.appendChild(gisScript)
  })
}

export const getAccessToken = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error('Google APIs no inicializadas'))

    tokenClient.callback = (resp) => {
      if (resp.access_token) {
        if (window.gapi?.client) window.gapi.client.setToken(resp)
        resolve(resp.access_token)
      } else if (resp.error) {
        if (resp.error === 'popup_closed' || resp.error === 'user_closed') {
          reject(new Error('Ventana cerrada por el usuario'))
        } else {
          reject(new Error(resp.error_description || resp.error))
        }
      }
    }

    try {
      tokenClient.requestAccessToken({ prompt: 'consent' })
    } catch (e) {
      reject(e)
    }
  })
}

export const createCalendarEvent = async (reminder) => {
  const dt = reminder.dateTime?.toDate?.() || new Date(reminder.dateTime || Date.now())
  const end = new Date(dt.getTime() + 30 * 60 * 1000) // 30 min duration

  const event = {
    summary: reminder.title || 'Evento de SecuritySystem',
    description: reminder.description || '',
    start: {
      dateTime: dt.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: { useDefault: true },
  }

  const request = window.gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  })

  const response = await request
  return response.result
}

export const deleteCalendarEvent = async (eventId) => {
  if (!eventId) return
  try {
    await window.gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })
  } catch (e) {
    console.warn('Error deleting calendar event:', e?.result?.error?.message || e.message)
  }
}

export const getConnectionStatus = () => {
  const token = window.gapi?.client?.getToken()
  return !!token?.access_token
}

export const disconnectGoogle = () => {
  if (window.gapi?.client?.getToken()) {
    window.google?.accounts?.oauth2?.revoke(
      window.gapi.client.getToken().access_token,
      () => {}
    )
    window.gapi.client.setToken(null)
  }
}
