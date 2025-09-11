// Calculator engine: pure functions for state transitions

export function createInitialState() {
  return {
    display: '0',
    prev: null,
    op: null,
    overwrite: false,
    lastOp: null,
    lastOperand: null,
    error: false,
    rightLabel: null,      // e.g., "90%" when % pressed
    rightValue: null,      // numeric value for the labeled RHS (e.g., 7.2)
  };
}

function toNumber(s) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(n) {
  if (!Number.isFinite(n)) return 'Error';
  // Avoid floating errors, clamp precision reasonably
  const s = Math.round(n * 1e12) / 1e12;
  let str = s.toString();
  if (str.includes('e')) return s.toLocaleString('en-US', { maximumSignificantDigits: 12 });
  if (str.includes('.')) {
    str = str.replace(/\.0+$/, '');
    str = str.replace(/(\.\d*?)0+$/, '$1');
  }
  return str;
}

export function compute(a, b, op) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? Infinity : a / b;
    case '^': return Math.pow(a, b);
    default: return b;
  }
}

export function inputDigit(state, d) {
  if (state.error) return createInitialState();
  if (state.overwrite || state.display === '0') {
    return { ...state, display: String(d), overwrite: false, rightLabel: null, rightValue: null };
  }
  if (state.display.length >= 16) return state;
  return { ...state, display: state.display + String(d), rightLabel: null, rightValue: null };
}

export function inputDot(state) {
  if (state.error) return createInitialState();
  if (state.overwrite) {
    return { ...state, display: '0.', overwrite: false, rightLabel: null, rightValue: null };
  }
  if (state.display.includes('.')) return state;
  return { ...state, display: state.display + '.', rightLabel: null, rightValue: null };
}

export function setOperator(state, op) {
  if (state.error) return createInitialState();
  // If an operator already set and we're not overwriting, evaluate chaining
  if (state.op && !state.overwrite) {
    const a = state.prev ?? toNumber(state.display);
    const b = state.rightLabel && state.rightValue != null ? state.rightValue : toNumber(state.display);
    const res = compute(a, b, state.op);
    const formatted = formatNumber(res);
    const err = formatted === 'Error';
    return {
      display: formatted,
      prev: err ? null : res,
      op,
      overwrite: true,
      lastOp: err ? null : state.op,
      lastOperand: err ? null : b,
      error: err,
      rightLabel: null,
      rightValue: null,
      
    };
  }
  // Set prev from display and stage operator
  return {
    ...state,
    prev: state.rightLabel && state.rightValue != null
      ? state.rightValue
      : toNumber(state.display),
    op,
    overwrite: true,
    rightLabel: null,
    rightValue: null,
    
  };
}

export function toggleSign(state) {
  if (state.error) return createInitialState();
  if (state.display === '0') return state;
  if (state.overwrite) {
    return { ...state, display: state.display.startsWith('-') ? state.display.slice(1) : '-' + state.display };
  }
  return { ...state, display: state.display.startsWith('-') ? state.display.slice(1) : '-' + state.display };
}

export function backspace(state) {
  if (state.error) return createInitialState();
  if (state.overwrite) return { ...state, display: '0', overwrite: false };
  if (state.display.length <= 1 || (state.display.length === 2 && state.display.startsWith('-'))) {
    return { ...state, display: '0' };
  }
  return { ...state, display: state.display.slice(0, -1) };
}

export function clearAll() {
  return createInitialState();
}

export function evaluate(state) {
  if (state.error) return createInitialState();
  // '=' with percent and operator: compute full result in one step
  if (state.op && state.rightLabel) {
    const a = state.prev ?? toNumber(state.display);
    const b = state.rightValue != null ? state.rightValue : toNumber(state.display);
    const res = compute(a, b, state.op);
    const formatted = formatNumber(res);
    const err = formatted === 'Error';
    return {
      display: formatted,
      prev: err ? null : res,
      op: null,
      overwrite: true,
      lastOp: err ? null : state.op,
      lastOperand: err ? null : b,
      error: err,
      rightLabel: null,
      rightValue: null,
    };
  }
  // '=' with only percent (no operator): just resolve percent to its numeric value
  if (!state.op && state.rightLabel) {
    const b = state.rightValue != null ? state.rightValue : toNumber(state.display) / 100;
    const formatted = formatNumber(b);
    const err = formatted === 'Error';
    return {
      display: formatted,
      prev: err ? null : b,
      op: null,
      overwrite: true,
      lastOp: null,
      lastOperand: null,
      error: err,
      rightLabel: null,
      rightValue: null,
    };
  }
  // If we have an operator, compute a op b
  if (state.op) {
    const a = state.prev ?? toNumber(state.display);
    const b = state.rightLabel && state.rightValue != null ? state.rightValue : toNumber(state.display);
    const res = compute(a, b, state.op);
    const formatted = formatNumber(res);
    const err = formatted === 'Error';
    return {
      display: formatted,
      prev: err ? null : res,
      op: null,
      overwrite: true,
      lastOp: err ? null : state.op,
      lastOperand: err ? null : b,
      error: err,
      rightLabel: null,
      rightValue: null,
    };
  }
  // Repeat last operation if available (pressing = consecutively)
  if (state.lastOp && state.lastOperand != null) {
    const a = toNumber(state.display);
    const res = compute(a, state.lastOperand, state.lastOp);
    const formatted = formatNumber(res);
    const err = formatted === 'Error';
    return {
      display: formatted,
      prev: err ? null : res,
      op: null,
      overwrite: true,
      lastOp: err ? null : state.lastOp,
      lastOperand: err ? null : state.lastOperand,
      error: err,
      rightLabel: null,
      rightValue: null,
    };
  }
  return state;
}

// Apply % following common calculator behavior:
// - If prev/op present, treat current as percentage of prev (prev * b/100)
// - Else, just divide current by 100.
export function percent(state) {
  if (state.error) return createInitialState();
  const cur = toNumber(state.display);
  let val;
  if (state.op) {
    if (state.op === '*' || state.op === '/') {
      val = cur / 100; // multiply/divide use literal percent (e.g., 90% => 0.9)
    } else {
      const base = state.prev != null ? state.prev : toNumber(state.display);
      val = (base * cur) / 100; // add/sub use percent of the first operand
    }
  } else {
    val = cur / 100; // standalone percent
  }
  const formatted = formatNumber(val);
  const err = formatted === 'Error';
  return {
    ...state,
    // Keep display as-is; label indicates % and value is staged
    display: state.display,
    overwrite: true,
    error: err,
    rightLabel: `${formatNumber(cur)}%`,
    rightValue: val,
    
  };
}

// Provide a preview of the pending evaluation for history purposes
export function preview(state) {
  if (state.op) {
    // Percent-adjusted RHS
    if (state.rightLabel) {
      const a = state.prev ?? toNumber(state.display);
      const b = state.rightValue != null ? state.rightValue : toNumber(state.display);
      const str = formatNumber(b);
      const err = str === 'Error';
      return { a, b, bLabel: state.rightLabel, op: state.op, result: b, resultStr: str, error: err, kind: 'percent' };
    }
    const a = state.prev ?? toNumber(state.display);
    const b = toNumber(state.display);
    const res = compute(a, b, state.op);
    const str = formatNumber(res);
    const err = str === 'Error';
    return { a, b, op: state.op, result: res, resultStr: str, error: err, kind: 'binary' };
  }
  // Only percent without operator
  if (state.rightLabel && !state.op) {
    const b = state.rightValue != null ? state.rightValue : toNumber(state.display) / 100;
    const str = formatNumber(b);
    const err = str === 'Error';
    return { a: null, b, bLabel: state.rightLabel, op: null, result: b, resultStr: str, error: err, kind: 'percentUnary' };
  }
  if (state.lastOp && state.lastOperand != null) {
    const a = toNumber(state.display);
    const b = state.lastOperand;
    const res = compute(a, b, state.lastOp);
    const str = formatNumber(res);
    const err = str === 'Error';
    return { a, b, op: state.lastOp, result: res, resultStr: str, error: err, kind: 'repeat' };
  }
  return null;
}
