import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './Calculator.css'
import {
  createInitialState,
  inputDigit,
  inputDot,
  setOperator,
  toggleSign,
  backspace,
  clearAll,
  evaluate,
  percent,
  preview,
  formatNumber,
} from './engine'

const ops = [
  { symbol: '÷', op: '/' },
  { symbol: '×', op: '*' },
  { symbol: '−', op: '-' },
  { symbol: '+', op: '+' },
]

const unaryLabels = {
  square: (x) => `sqr(${x})`,
  sqrt:   (x) => `√(${x})`,
  recip:  (x) => `1/(${x})`,
  exp:    (x) => `e^(${x})`,
  ln:     (x) => `ln(${x})`,
  log:    (x) => `log(${x})`,
  sin:    (x) => `sin(${x})`,
  cos:    (x) => `cos(${x})`,
  tan:    (x) => `tan(${x})`,
}

export default function Calculator() {
  const [state, setState] = useState(createInitialState())
  const [accentHue, setAccentHue] = useState(32)
  const [sci, setSci] = useState(false)
  const [deg, setDeg] = useState(true)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(true)
  const [pendingUnary, setPendingUnary] = useState(null) // e.g., 'log'
  const containerRef = useRef(null)

  const tapeText = useMemo(() => {
    const left = state.prev !== null ? state.prev : null
    const op = state.op
    if (state.error) return 'Error'
    if (left !== null && op) return `${left} ${op}`
    return ''
  }, [state.prev, state.op, state.error])

  // Update accent based on latest result for a subtle dynamic background
  useEffect(() => {
    const n = Number(state.display)
    if (Number.isFinite(n)) {
      const hue = 20 + (Math.abs(n) % 240)
      setAccentHue(hue)
      document.documentElement.style.setProperty('--accent-hue', String(hue))
    }
  }, [state.display])

  const onEqual = useCallback(() => {
    // If a unary function is pending, resolve it and log
    if (pendingUnary) {
      const argStr = state.display
      const x = Number(argStr)
      let y = x
      switch (pendingUnary) {
        case 'square': y = x * x; break
        case 'sqrt': y = x < 0 ? Infinity : Math.sqrt(x); break
        case 'recip': y = x === 0 ? Infinity : 1 / x; break
        case 'exp': y = Math.exp(x); break
        case 'ln': y = x <= 0 ? Infinity : Math.log(x); break
        case 'log': y = x <= 0 ? Infinity : Math.log10(x); break
        case 'sin': y = Math.sin(deg ? (x * Math.PI) / 180 : x); break
        case 'cos': y = Math.cos(deg ? (x * Math.PI) / 180 : x); break
        case 'tan': y = Math.tan(deg ? (x * Math.PI) / 180 : x); break
        default: y = x
      }
      const resStr = formatNumber(y)
      setHistory((h) => [
        `${unaryLabels[pendingUnary](formatNumber(x))} = ${resStr}`,
        ...h,
      ])
      setState((s) => ({ ...s, display: resStr, overwrite: true, error: resStr === 'Error' }))
      setPendingUnary(null)
      return
    }
    // Otherwise, standard binary evaluate with history
    setState((s) => {
      const p = preview(s)
      const next = evaluate(s)
      if (p) {
        setHistory((h) => [
          `${formatNumber(p.a)} ${p.op} ${formatNumber(p.b)} = ${next.display}`,
          ...h,
        ])
      }
      return next
    })
  }, [pendingUnary, deg, state.display])

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key
      if (/^[0-9]$/.test(k)) { setState(s => inputDigit(s, k)); return }
      if (k === '.') { setState(s => inputDot(s)); return }
      if (k === '+') { setState(s => setOperator(s, '+')); return }
      if (k === '-') { setState(s => setOperator(s, '-')); return }
      if (k === '*') { setState(s => setOperator(s, '*')); return }
      if (k === '/') { setState(s => setOperator(s, '/')); return }
      if (k === '^') { setState(s => setOperator(s, '^')); return }
      if (k === 'Enter' || k === '=') { e.preventDefault(); onEqual(); return }
      if (k === 'Backspace') { setState(s => backspace(s)); return }
      if (k === 'Delete' || k === 'Escape') { setState(() => clearAll()); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onEqual])

  const stageUnary = (fn) => {
    // Put function name into display context, let user edit argument
    setPendingUnary(fn)
    setState((s) => ({ ...s, overwrite: true }))
  }

  const setConst = (val) => setState((s) => ({ ...s, display: formatNumber(val), overwrite: true }))

  // If an operator is picked while a unary is pending, resolve unary first
  const pickOperator = (op) => {
    if (pendingUnary) {
      const argStr = state.display
      const x = Number(argStr)
      let y = x
      switch (pendingUnary) {
        case 'square': y = x * x; break
        case 'sqrt': y = x < 0 ? Infinity : Math.sqrt(x); break
        case 'recip': y = x === 0 ? Infinity : 1 / x; break
        case 'exp': y = Math.exp(x); break
        case 'ln': y = x <= 0 ? Infinity : Math.log(x); break
        case 'log': y = x <= 0 ? Infinity : Math.log10(x); break
        case 'sin': y = Math.sin(deg ? (x * Math.PI) / 180 : x); break
        case 'cos': y = Math.cos(deg ? (x * Math.PI) / 180 : x); break
        case 'tan': y = Math.tan(deg ? (x * Math.PI) / 180 : x); break
        default: y = x
      }
      const resStr = formatNumber(y)
      setPendingUnary(null)
      setState((s) => setOperator({ ...s, display: resStr, overwrite: true }, op))
      return
    }
    setState((s) => setOperator(s, op))
  }

  return (
    <div className="page">
    <main className={`calc-app ${sci ? 'sci-on' : ''}`} role="application" aria-label="Calculadora estilo iOS" ref={containerRef}>
      <div className="toolbar">
        <div className="group">
          <button className="toggle" onClick={() => setSci(v => !v)}>{sci ? 'Básica' : 'Científica'}</button>
          <button className="toggle" onClick={() => setDeg(v => !v)}>{deg ? 'Grados' : 'Radianes'}</button>
        </div>
        <div className="group">
          <button className="toggle" onClick={() => setShowHistory(v => !v)}>{showHistory ? 'Ocultar' : 'Historial'}</button>
        </div>
      </div>
      <section className="display" aria-live="polite">
        <div className="tape" aria-label="expresión previa">{tapeText}</div>
        <div className="value" aria-label="valor actual">{pendingUnary ? unaryLabels[pendingUnary](state.display) : state.display}</div>
      </section>

      {sci && (
        <section className="scipad" aria-label="Funciones científicas">
          <button className="key meta" onClick={() => stageUnary('square')}>x²</button>
          <button className="key meta" onClick={() => stageUnary('sqrt')}>√x</button>
          <button className="key meta" onClick={() => stageUnary('recip')}>1/x</button>
          <button className="key meta" onClick={() => setConst(Math.E)}>e</button>

          <button className="key meta" onClick={() => stageUnary('exp')}>eˣ</button>
          <button className="key meta" onClick={() => stageUnary('ln')}>ln</button>
          <button className="key meta" onClick={() => stageUnary('log')}>log₁₀</button>
          <button className="key meta" onClick={() => setConst(Math.PI)}>π</button>

          <button className="key meta" onClick={() => stageUnary('sin')}>sin</button>
          <button className="key meta" onClick={() => stageUnary('cos')}>cos</button>
          <button className="key meta" onClick={() => stageUnary('tan')}>tan</button>
          <button className="key meta" onClick={() => setState(s => percent(s))}>%</button>

          <button className="key meta" onClick={() => pickOperator('^')}>xʸ</button>
        </section>
      )}

      <section className="pad" role="group" aria-label="Teclado de calculadora">
        <button className="key meta" onClick={() => { setPendingUnary(null); setState(() => clearAll()) }} aria-label="borrar">AC</button>
        <button className="key meta" onClick={() => setState(s => toggleSign(s))} aria-label="cambiar signo">±</button>
        <button className="key meta" onClick={() => setState(s => backspace(s))} aria-label="borrar dígito">←</button>
        <button className="key op" onClick={() => pickOperator('/')} aria-label="dividir">÷</button>

        <button className="key" onClick={() => setState(s => inputDigit(s, 7))}>7</button>
        <button className="key" onClick={() => setState(s => inputDigit(s, 8))}>8</button>
        <button className="key" onClick={() => setState(s => inputDigit(s, 9))}>9</button>
        <button className="key op" onClick={() => pickOperator('*')} aria-label="multiplicar">×</button>

        <button className="key" onClick={() => setState(s => inputDigit(s, 4))}>4</button>
        <button className="key" onClick={() => setState(s => inputDigit(s, 5))}>5</button>
        <button className="key" onClick={() => setState(s => inputDigit(s, 6))}>6</button>
        <button className="key op" onClick={() => pickOperator('-')} aria-label="restar">−</button>

        <button className="key" onClick={() => setState(s => inputDigit(s, 1))}>1</button>
        <button className="key" onClick={() => setState(s => inputDigit(s, 2))}>2</button>
        <button className="key" onClick={() => setState(s => inputDigit(s, 3))}>3</button>
        <button className="key op" onClick={() => pickOperator('+')} aria-label="sumar">+</button>

        <button className="key zero" onClick={() => setState(s => inputDigit(s, 0))}>0</button>
        <button className="key" onClick={() => setState(s => inputDot(s))}>.</button>
        <button className="key equals" onClick={onEqual} aria-label="igual">=</button>
      </section>

      <footer className="hint">
        <span>Tip: usa el teclado (0-9, + - * /, Enter, Backspace)</span>
      </footer>
      {showHistory && (
        <section className="history" aria-label="Historial de cálculos">
          <header>
            <strong>Historial</strong>
            <button className="toggle" onClick={() => setHistory([])}>Limpiar</button>
          </header>
          <ul>
            {history.length === 0 ? (
              <li>Sin operaciones aún</li>
            ) : (
              history.map((h, i) => (
                <li key={i}>{h}</li>
              ))
            )}
          </ul>
        </section>
      )}
    </main>
    </div>
  )
}
