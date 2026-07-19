/**
 * Two-tone success chime via WebAudio — no audio asset, nothing to load
 * offline. Browsers may block audio without a user gesture; callers treat
 * sound as best-effort (the green flash is the primary signal).
 */
export function playPaidChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const ctx = new Ctx()
    const play = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + duration,
      )
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }
    play(880, 0, 0.25)
    play(1318.5, 0.18, 0.35)
  } catch {
    // Audio blocked or unavailable — visual flash carries the signal.
  }
}
