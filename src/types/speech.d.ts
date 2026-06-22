// Web Speech API type declarations
interface SpeechRecognitionResult {
  readonly length: number
  [index: number]: { readonly transcript: string; readonly confidence: number }
}
interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}
interface SpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
declare var SpeechRecognition: { prototype: SpeechRecognition; new(): SpeechRecognition } | undefined
interface Window {
  SpeechRecognition?: typeof SpeechRecognition
  webkitSpeechRecognition?: { prototype: SpeechRecognition; new(): SpeechRecognition }
}
