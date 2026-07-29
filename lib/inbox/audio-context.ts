export function createAudioContext(): AudioContext {
  const AudioContextCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  return new AudioContextCtor()
}
