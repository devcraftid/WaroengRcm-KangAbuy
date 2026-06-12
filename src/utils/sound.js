/**
 * Sound Notification Utility
 * Menggunakan Web Audio API untuk generate suara notifikasi secara programmatik.
 * Tidak membutuhkan file audio eksternal.
 */

let audioContext = null

/**
 * Mendapatkan atau membuat AudioContext
 */
function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Resume jika suspended (browser policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

/**
 * Helper: Play nada tunggal
 * @param {AudioContext} ctx
 * @param {number} frequency - Frekuensi Hz
 * @param {number} startTime - Waktu mulai (detik)
 * @param {number} duration - Durasi (detik)
 * @param {number} volume - Volume 0–1
 * @param {'sine'|'square'|'triangle'|'sawtooth'} type - Waveform
 */
function playTone(ctx, frequency, startTime, duration, volume = 0.4, type = 'sine') {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)

  // Envelope: fade in & fade out supaya tidak clipping
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01)
  gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05)
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

// ============================================================
// SOUND PRESETS
// ============================================================

/**
 * 🛍️ Suara: Pesanan Baru Masuk
 * Nada ascending ceria — 3 nada naik
 */
export function playOrderNewSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    playTone(ctx, 523.25, now + 0.0, 0.12, 0.35)       // C5
    playTone(ctx, 659.25, now + 0.13, 0.12, 0.35)      // E5
    playTone(ctx, 783.99, now + 0.26, 0.18, 0.40)      // G5
  } catch (e) {
    console.warn('[Sound] playOrderNewSound error:', e)
  }
}

/**
 * 💳 Suara: Transaksi / Pembayaran Lunas
 * Nada sukses — chord harmonis naik
 */
export function playPaymentSuccessSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Chord C Major arpeggio + harmoni
    playTone(ctx, 523.25, now + 0.0, 0.15, 0.30)       // C5
    playTone(ctx, 659.25, now + 0.12, 0.15, 0.30)      // E5
    playTone(ctx, 783.99, now + 0.24, 0.15, 0.30)      // G5
    playTone(ctx, 1046.50, now + 0.36, 0.30, 0.35)     // C6 — nada tinggi penutup
  } catch (e) {
    console.warn('[Sound] playPaymentSuccessSound error:', e)
  }
}

/**
 * 🔔 Suara: Notifikasi Umum
 * Dua nada singkat ringan
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    playTone(ctx, 880, now + 0.0, 0.10, 0.25)          // A5
    playTone(ctx, 1100, now + 0.12, 0.14, 0.25)        // Sekitar C#6
  } catch (e) {
    console.warn('[Sound] playNotificationSound error:', e)
  }
}

/**
 * ⚠️ Suara: Peringatan / Alert
 * Nada berulang mendesakkan perhatian
 */
export function playAlertSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Dua pulsa cepat
    for (let i = 0; i < 3; i++) {
      playTone(ctx, 440, now + i * 0.18, 0.10, 0.30, 'square')
    }
  } catch (e) {
    console.warn('[Sound] playAlertSound error:', e)
  }
}

/**
 * 🍳 Suara: Pesanan Sedang Diproses / Dapur
 * Nada medium tenang
 */
export function playOrderProcessingSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    playTone(ctx, 392.00, now + 0.0, 0.15, 0.28)       // G4
    playTone(ctx, 493.88, now + 0.16, 0.20, 0.28)      // B4
  } catch (e) {
    console.warn('[Sound] playOrderProcessingSound error:', e)
  }
}

/**
 * ✅ Suara: Pesanan Selesai / Siap Diambil
 * Arpeggio naik penuh — lebih meriah dari payment
 */
export function playOrderCompletedSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    playTone(ctx, 523.25, now + 0.0,  0.10, 0.30)      // C5
    playTone(ctx, 659.25, now + 0.10, 0.10, 0.30)      // E5
    playTone(ctx, 783.99, now + 0.20, 0.10, 0.30)      // G5
    playTone(ctx, 1046.50, now + 0.30, 0.10, 0.30)     // C6
    playTone(ctx, 1318.51, now + 0.40, 0.25, 0.35)     // E6
  } catch (e) {
    console.warn('[Sound] playOrderCompletedSound error:', e)
  }
}

/**
 * 🔕 Suara: Error / Gagal
 * Nada turun — menunjukkan kegagalan
 */
export function playErrorSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    playTone(ctx, 330, now + 0.0, 0.15, 0.35, 'sawtooth')
    playTone(ctx, 220, now + 0.18, 0.20, 0.35, 'sawtooth')
  } catch (e) {
    console.warn('[Sound] playErrorSound error:', e)
  }
}

/**
 * Mapping type notifikasi ke fungsi suara
 * @param {string} type - Tipe notifikasi dari database
 */
export function playNotificationByType(type) {
  const soundMap = {
    order_created:    playOrderNewSound,
    order_processing: playOrderProcessingSound,
    order_completed:  playOrderCompletedSound,
    order_ready:      playOrderCompletedSound,
    payment_received: playPaymentSuccessSound,
    payment_success:  playPaymentSuccessSound,
    payment_lunas:    playPaymentSuccessSound,
    alert:            playAlertSound,
    error:            playErrorSound,
  }

  const fn = soundMap[type] || playNotificationSound
  fn()
}

/**
 * Test: mainkan semua suara satu per satu (untuk preview/debug)
 */
export async function previewAllSounds() {
  const sounds = [
    { name: 'Notifikasi Umum',          fn: playNotificationSound },
    { name: 'Pesanan Baru',             fn: playOrderNewSound },
    { name: 'Pesanan Diproses',         fn: playOrderProcessingSound },
    { name: 'Pesanan Selesai',          fn: playOrderCompletedSound },
    { name: 'Pembayaran Lunas',         fn: playPaymentSuccessSound },
    { name: 'Peringatan',               fn: playAlertSound },
    { name: 'Error',                    fn: playErrorSound },
  ]

  for (const sound of sounds) {
    console.log(`[Sound Preview] Playing: ${sound.name}`)
    sound.fn()
    await new Promise(resolve => setTimeout(resolve, 1200))
  }
}
