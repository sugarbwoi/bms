/* ============================================================
   KUDIIBot — Voice input
   A small mic control. Uses the browser's own speech engine when
   available and says so honestly when it is not.
   ============================================================ */
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

export function VoiceButton({ onResult, onError }: { onResult: (text: string) => void; onError?: (msg: string) => void }) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recRef = useRef<any>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-NG'
    rec.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ')
        .trim()
      if (text) onResult(text)
    }
    rec.onerror = (e: any) => {
      setListening(false)
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        onError?.('Microphone permission was blocked. You can type instead.')
      } else if (e?.error !== 'aborted' && e?.error !== 'no-speech') {
        onError?.('Voice did not catch that. Try again or type it.')
      }
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    }
  }, [onResult, onError])

  if (!supported) return null

  const toggle = () => {
    const rec = recRef.current
    if (!rec) return
    if (listening) {
      rec.stop()
      setListening(false)
      return
    }
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  return (
    <button
      type="button"
      className={`kb-mic ${listening ? 'listening' : ''}`}
      onClick={toggle}
      aria-label={listening ? 'Stop listening' : 'Speak to KUDII'}
      title={listening ? 'Stop listening' : 'Speak to KUDII'}
    >
      {listening ? <MicOff size={16} strokeWidth={2} /> : <Mic size={16} strokeWidth={2} />}
      {listening && <span className="kb-mic-pulse" aria-hidden />}
    </button>
  )
}
