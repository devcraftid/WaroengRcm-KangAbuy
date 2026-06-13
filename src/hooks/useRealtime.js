import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook for subscribing to realtime order changes
 */
export function useRealtimeOrders(callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        if (callbackRef.current) {
          callbackRef.current(payload)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to orders realtime')
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to orders realtime')
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [])
}

/**
 * Hook for subscribing to realtime payment changes
 */
export function useRealtimePayments(callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const channel = supabase
      .channel('realtime-payments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, (payload) => {
        if (callbackRef.current) {
          callbackRef.current(payload)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to payments realtime')
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [])
}

/**
 * Hook for subscribing to realtime table changes
 */
export function useRealtimeTables(callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const channel = supabase
      .channel('realtime-tables')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tables'
      }, (payload) => {
        if (callbackRef.current) {
          callbackRef.current(payload)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to tables realtime')
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [])
}

/**
 * Hook for subscribing to realtime notification changes for specific user
 */
export function useRealtimeNotifications(userId, callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (callbackRef.current) {
          callbackRef.current(payload.new)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to notifications for user ${userId}`)
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [userId])
}

/**
 * Hook for subscribing to realtime notification changes for admins
 */
export function useRealtimeAdminNotifications(callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'user_id=is.null'
      }, (payload) => {
        if (callbackRef.current) {
          callbackRef.current(payload.new)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to admin notifications')
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [])
}

/**
 * Hook for subscribing to realtime activity changes
 */
export function useRealtimeActivities(callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const channel = supabase
      .channel('realtime-activities')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities'
      }, (payload) => {
        if (callbackRef.current) {
          callbackRef.current(payload.new)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to activities realtime')
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [])
}

/**
 * Hook for presence tracking
 */
export function usePresence(channelName, userInfo) {
  const presenceStateRef = useRef({})

  useEffect(() => {
    if (!channelName) return

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userInfo?.id || 'anonymous'
        }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        presenceStateRef.current = state
        console.log('Presence synced:', Object.keys(state).length, 'users')
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userInfo) {
          const presenceTrackStatus = await channel.track({
            ...userInfo,
            online_at: new Date().toISOString()
          })
          console.log('Presence track status:', presenceTrackStatus)
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [channelName, userInfo?.id])

  return presenceStateRef
}

/**
 * Hook for broadcast channel
 */
export function useBroadcast(channelName, event, handler) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!channelName || !event) return

    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event }, (payload) => {
        if (handlerRef.current) {
          handlerRef.current(payload)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to broadcast ${channelName}:${event}`)
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [channelName, event])
}

/**
 * Hook to send broadcast messages
 */
export function useBroadcastSender(channelName) {
  const channelRef = useRef(null)

  useEffect(() => {
    if (!channelName) return

    const channel = supabase.channel(channelName)
    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [channelName])

  const send = useCallback(async (event, payload) => {
    if (channelRef.current) {
      return await channelRef.current.send({
        type: 'broadcast',
        event,
        payload
      })
    }
  }, [])

  return send
}