import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { Language } from '../locales'

type Props = {
  language?: Language
  /** URL โลโก้บริษัท (ถ้าไม่ใส่หรือโหลดไม่ได้ จะไม่แสดงกรอบโลโก้เลย เหลือแต่วงแหวนและอนิเมชัน) */
  logoUrl?: string | null
  /** ข้อความคงที่ (ถ้าไม่ใส่ จะสลับข้อความตามความคืบหน้าอัตโนมัติ) */
  message?: string
  /** ความคืบหน้าจริง 0-100 (ถ้าไม่ใส่ จะจำลองให้วิ่งขึ้นไปหยุดที่ ~94%) */
  progress?: number
  /** ให้วิ่งจาก 0 ถึง 100% ภายในกี่มิลลิวินาที แล้วจบด้วยอนิเมชันออก */
  duration?: number
  /** เรียกเมื่อเล่นอนิเมชันจบและหายไปแล้ว */
  onDone?: () => void
}

type Phase = 'run' | 'done' | 'leave' | 'gone'

const HOLD_DONE_MS = 750
const LEAVE_MS = 650
const RING_R = 112
const RING_C = 2 * Math.PI * RING_R

const STEPS = {
  th: ['กำลังเตรียมระบบ', 'กำลังตรวจสอบสิทธิ์', 'กำลังโหลดข้อมูล', 'ใกล้เสร็จแล้ว'],
  en: ['Preparing the system', 'Verifying access', 'Loading your data', 'Almost there'],
}
const READY = { th: 'พร้อมใช้งาน', en: 'Ready' }

/** สุ่มแบบคงที่ (ไม่เปลี่ยนทุกครั้งที่ render / ไม่ชนกับ SSR) */
function seeded(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  angle: (360 / 24) * i + seeded(i) * 14,
  dist: 96 + seeded(i + 40) * 48,
  delay: seeded(i + 80) * 3.2,
  size: 3 + seeded(i + 120) * 4,
  tone: i % 3,
}))

const SPARKLES = Array.from({ length: 18 }, (_, i) => ({
  x: seeded(i + 200) * 100,
  size: 2 + seeded(i + 240) * 4,
  dur: 7 + seeded(i + 280) * 8,
  delay: -seeded(i + 320) * 12,
}))

export function SystemLoading({ language = 'th', logoUrl, message, progress, duration, onDone }: Props) {
  const [shown, setShown] = useState(0)
  const [phase, setPhase] = useState<Phase>('run')
  const [logoFailed, setLogoFailed] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const logoRef = useRef<HTMLImageElement>(null)
  const shownRef = useRef(0)
  const onDoneRef = useRef(onDone)
  const gradId = `sl-grad-${useId().replace(/:/g, '')}`

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  // เปลี่ยน URL แล้วเริ่มนับใหม่ / รองรับรูปที่อยู่ใน cache ซึ่งโหลดเสร็จก่อนผูก onLoad
  useEffect(() => {
    setLogoFailed(false)
    const img = logoRef.current
    setLogoLoaded(Boolean(img && img.complete && img.naturalWidth > 0))
  }, [logoUrl])

  // ตัวนับความคืบหน้า (ไหลนุ่มๆ เข้าหาค่าเป้าหมาย)
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => {
      const t = performance.now() - start
      let target: number
      if (progress !== undefined) target = progress
      else if (duration) target = (t / duration) * 100
      else target = 94 * (1 - Math.exp(-t / 2600))
      target = Math.max(0, Math.min(100, target))

      const next = shownRef.current + (target - shownRef.current) * 0.14
      shownRef.current = Math.abs(target - next) < 0.25 ? target : next
      setShown(shownRef.current)
    }, 50)
    return () => window.clearInterval(id)
  }, [progress, duration])

  // run -> done -> leave -> gone
  useEffect(() => {
    if (phase === 'run' && shown >= 100) setPhase('done')
  }, [shown, phase])

  useEffect(() => {
    if (phase === 'done') {
      const t = window.setTimeout(() => setPhase('leave'), HOLD_DONE_MS)
      return () => window.clearTimeout(t)
    }
    if (phase === 'leave') {
      const t = window.setTimeout(() => {
        setPhase('gone')
        onDoneRef.current?.()
      }, LEAVE_MS)
      return () => window.clearTimeout(t)
    }
  }, [phase])

  // พารัลแลกซ์ตามเมาส์/นิ้ว
  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--px', String(((e.clientX - r.left) / r.width - 0.5) * 2))
    el.style.setProperty('--py', String(((e.clientY - r.top) / r.height - 0.5) * 2))
  }

  if (phase === 'gone') return null

  const isDone = phase !== 'run'
  const pct = Math.round(shown)
  const steps = language === 'th' ? STEPS.th : STEPS.en
  const ready = language === 'th' ? READY.th : READY.en
  const stepLabel = isDone ? ready : steps[Math.min(steps.length - 1, Math.floor(shown / 26))]
  const statusMessage = message ?? stepLabel
  const showLogo = Boolean(logoUrl) && !logoFailed

  const classes = ['system-loading-page']
  if (phase === 'done') classes.push('is-done')
  if (phase === 'leave') classes.push('is-done', 'is-leaving')

  return (
    <main
      className={classes.join(' ')}
      role="status"
      aria-live="polite"
      aria-label={statusMessage}
      onPointerMove={handlePointerMove}
    >
      {/* ---------- พื้นหลัง ---------- */}
      <div className="sl-bg" aria-hidden="true">
        <span className="sl-aurora" />
        <span className="sl-floor" />
        <span className="sl-vignette" />
        {SPARKLES.map((s, i) => (
          <i
            key={i}
            className="sl-sparkle"
            style={
              {
                '--x': `${s.x}%`,
                '--s': `${s.size}px`,
                '--d': `${s.dur}s`,
                '--dl': `${s.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="system-loading-card">
        {/* ---------- เวที 3D ---------- */}
        <div className="sl-stage" aria-hidden="true">
          <div className="sl-tilt">
            {/* วงแหวนความคืบหน้า */}
            <svg className="sl-progress" viewBox="0 0 240 240">
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b6dff" />
                  <stop offset="55%" stopColor="#4f8bff" />
                  <stop offset="100%" stopColor="#ff6fb5" />
                </linearGradient>
              </defs>
              <circle className="sl-progress-track" cx="120" cy="120" r={RING_R} />
              <circle
                className="sl-progress-fill"
                cx="120"
                cy="120"
                r={RING_R}
                stroke={`url(#${gradId})`}
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - shown / 100)}
              />
            </svg>

            <span className="sl-glow" />

            {/* ไจโรสโคป 3 วง หมุนต่างระนาบ */}
            <span className="sl-gyro sl-gyro-a">
              <em />
              <i />
            </span>
            <span className="sl-gyro sl-gyro-b">
              <em />
              <i />
            </span>
            <span className="sl-gyro sl-gyro-c">
              <em />
              <i />
            </span>

            {/* อนุภาคพุ่งออกจากโลโก้ */}
            <span className="sl-emitters">
              {PARTICLES.map((p, i) => (
                <i
                  key={i}
                  className={`sl-p sl-p-${p.tone}`}
                  style={
                    {
                      '--a': `${p.angle}deg`,
                      '--d': `${p.dist}px`,
                      '--s': `${p.size}px`,
                      '--dl': `${p.delay}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>

            {/* คลื่นกระแทกตอนโหลดเสร็จ */}
            <span className="sl-shock sl-shock-1" />
            <span className="sl-shock sl-shock-2" />

            {/* โลโก้ */}
            {showLogo && (
              <span className={`system-loading-mark${logoLoaded ? ' is-ready' : ''}`}>
                <img
                  ref={logoRef}
                  className="sl-mark-company-logo"
                  src={logoUrl as string}
                  alt=""
                  draggable={false}
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoFailed(true)}
                />
                <span className="sl-mark-shine" />
              </span>
            )}
          </div>
        </div>

        {/* ---------- ข้อความ ---------- */}
        <strong className="system-loading-brand">
          {'DMS'.split('').map((c, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.14}s` }}>
              {c}
            </span>
          ))}
        </strong>

        <span className="sl-percent" aria-hidden="true">
          {pct}
          <small>%</small>
        </span>

        <p className="sl-message" key={statusMessage}>
          {statusMessage}
          {!isDone && (
            <span className="sl-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
        </p>
      </div>
    </main>
  )
}