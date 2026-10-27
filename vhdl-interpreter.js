/**
 * VHDL Interpreter - Subset implementation for simulation
 * Supports: std_logic, std_logic_vector, port maps, processes,
 *           concurrent signal assignments, basic operators
 */

const VHDLInterpreter = (() => {

  // Parse result structure
  function ParseResult() {
    return { entities: [], errors: [], warnings: [] };
  }

  // Tokenizer
  function tokenize(src) {
    const tokens = [];
    const re = /--[^\n]*|"[^"]*"|'[^']*'|<=|=>|:=|\/=|>=|<=|[a-zA-Z_][a-zA-Z0-9_]*|\d+|[(){};:,.|&+\-*]/g;
    let m;
    let lineNum = 1;
    let lastIndex = 0;
    // Count newlines for line tracking
    const lines = src.split('\n');
    let charPos = 0;

    while ((m = re.exec(src)) !== null) {
      // Count lines up to this position
      let ln = 1;
      for (let i = 0; i < m.index; i++) {
        if (src[i] === '\n') ln++;
      }
      const val = m[0];
      if (!val.startsWith('--')) {
        tokens.push({ val: val.toLowerCase(), raw: val, line: ln });
      }
    }
    return tokens;
  }

  // =================== SYNTAX CHECKER ===================
  function checkSyntax(code) {
    const errors = [];
    const warnings = [];
    const lines = code.split('\n');

    // Basic structural checks
    const hasEntity = /\bentity\b/i.test(code);
    const hasArchitecture = /\barchitecture\b/i.test(code);
    const entityMatch = code.match(/\bentity\s+(\w+)\s+is/i);
    const archMatch = code.match(/\barchitecture\s+(\w+)\s+of\s+(\w+)\s+is/i);

    if (!hasEntity) {
      errors.push({ line: 1, type: 'error', message: 'Nedostaje deklaracija ENTITY' });
    }
    if (!hasArchitecture) {
      errors.push({ line: 1, type: 'error', message: 'Nedostaje deklaracija ARCHITECTURE' });
    }

    if (entityMatch && archMatch) {
      if (entityMatch[1].toLowerCase() !== archMatch[2].toLowerCase()) {
        const ln = code.split('\n').findIndex(l => /\barchitecture\b/i.test(l)) + 1;
        errors.push({
          line: ln,
          type: 'error',
          message: `Architecture se odnosi na '${archMatch[2]}' ali entity je '${entityMatch[1]}'`
        });
      }
    }

    // Check BEGIN/END balance (rough check — entity end counts as implicit begin)
    const beginCount = (code.match(/\bbegin\b/gi) || []).length;
    // Count 'end' that should match a 'begin': end architecture, end process, standalone end
    // (entity has no begin, so 'end entity' doesn't count)
    const entityEndCount = (code.match(/\bend\s+entity\b/gi) || []).length;
    const allEndCount = (code.match(/\bend\b/gi) || []).length;
    const endCount = allEndCount - entityEndCount;
    if (Math.abs(beginCount - endCount) > 1) {
      warnings.push({ line: lines.length, type: 'warning', message: `Mogući neravnomjerni BEGIN/END (${beginCount} vs ${endCount})` });
    }

    // Check for common mistakes line by line
    lines.forEach((line, idx) => {
      const ln = idx + 1;
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) return;

      // Signal assignment without <=
      if (/^\w+\s*:=\s*/.test(trimmed) && !/\bvariable\b/i.test(code.split('\n').slice(0, idx).join('\n'))) {
        // :=  used outside process might be wrong
      }

      // Missing semicolons on port declarations
      if (/\b(in|out|inout|buffer)\b.*std_logic/i.test(trimmed)) {
        if (!trimmed.endsWith(';') && !trimmed.endsWith('(') && !/\bport\s*\(/i.test(trimmed)) {
          // skip - could be multi-line
        }
      }

      // Unclosed strings
      const quotes = (trimmed.match(/"/g) || []).length;
      if (quotes % 2 !== 0) {
        errors.push({ line: ln, type: 'error', message: 'Nedostaje zatvarajući navodnik "' });
      }
    });

    // Check process sensitivity list
    const processes = code.match(/\bprocess\s*\([^)]*\)/gi) || [];
    processes.forEach(p => {
      const ln = code.split('\n').findIndex(l => l.toLowerCase().includes(p.toLowerCase().substring(0, 20))) + 1;
    });

    // Unused signals warning
    const signalDecls = [...code.matchAll(/\bsignal\s+(\w+)\s*:/gi)].map(m => m[1].toLowerCase());
    signalDecls.forEach(sig => {
      const uses = (code.match(new RegExp('\\b' + sig + '\\b', 'gi')) || []).length;
      if (uses < 2) {
        warnings.push({ line: 1, type: 'warning', message: `Signal '${sig}' deklariran ali možda nije korišten` });
      }
    });

    if (errors.length === 0 && warnings.length === 0) {
      return { errors: [], warnings: [], info: [{ line: 1, type: 'success', message: 'Sintaksa ispravna ✓' }] };
    }

    return { errors, warnings, info: [] };
  }

  // =================== PARSER ===================
  function parse(code) {
    const result = ParseResult();

    try {
      const entity = parseEntity(code);
      if (!entity) {
        result.errors.push({ line: 1, message: 'Nije moguće parsirati ENTITY deklaraciju' });
        return result;
      }

      const arch = parseArchitecture(code, entity);
      if (!arch) {
        result.errors.push({ line: 1, message: 'Nije moguće parsirati ARCHITECTURE' });
        return result;
      }

      entity.architecture = arch;
      result.entities.push(entity);
    } catch (e) {
      result.errors.push({ line: 1, message: 'Greška parsiranja: ' + e.message });
    }

    return result;
  }

  function parseEntity(code) {
    // Find "entity NAME is"
    const entityStartRe = /\bentity\s+(\w+)\s+is\b/is;
    const es = entityStartRe.exec(code);
    if (!es) return null;

    const name = es[1].toLowerCase();
    const afterIs = code.slice(es.index + es[0].length);

    // Parse generic defaults: generic (NAME : type := VALUE ns; ...)
    const generics = {};
    const genericIdx = afterIs.search(/\bgeneric\s*\(/i);
    if (genericIdx !== -1) {
      const gParenStart = afterIs.indexOf('(', genericIdx);
      let depth = 1, gi = gParenStart + 1;
      while (gi < afterIs.length && depth > 0) {
        if (afterIs[gi] === '(') depth++;
        else if (afterIs[gi] === ')') depth--;
        gi++;
      }
      const genericBody = afterIs.slice(gParenStart + 1, gi - 1);
      // Parse "name : type := value unit" entries
      const gRe = /(\w+)\s*:\s*\w+\s*:=\s*(\d+(?:\.\d+)?)\s*(ns|ps|us)/gi;
      let gm;
      while ((gm = gRe.exec(genericBody)) !== null) {
        const val = parseFloat(gm[2]);
        const unit = gm[3].toLowerCase();
        const ns = unit === 'ps' ? val / 1000 : unit === 'us' ? val * 1000 : val;
        generics[gm[1].toLowerCase()] = ns;
      }
    }

    // Find "port (" — skip over any generic clause first
    const portIdx = afterIs.search(/\bport\s*\(/i);
    if (portIdx === -1) {
      return { name, ports: [], generics };
    }

    const parenStart = afterIs.indexOf('(', portIdx);
    if (parenStart === -1) return null;

    let depth = 1, i = parenStart + 1;
    while (i < afterIs.length && depth > 0) {
      if (afterIs[i] === '(') depth++;
      else if (afterIs[i] === ')') depth--;
      i++;
    }

    const portsStr = afterIs.slice(parenStart + 1, i - 1);
    const ports = parsePorts(portsStr);
    return { name, ports, generics };
  }

  function parsePorts(portsStr) {
    const ports = [];
    // Split by semicolons, handling last entry without semicolon
    const lines = portsStr.split(';').map(s => s.trim()).filter(Boolean);

    lines.forEach(line => {
      // Format: name1, name2 : direction type
      const m = line.match(/(\w+(?:\s*,\s*\w+)*)\s*:\s*(in|out|inout|buffer)\s+(.+)/i);
      if (!m) return;

      const names = m[1].split(',').map(n => n.trim().toLowerCase());
      const direction = m[2].toLowerCase();
      const typeStr = m[3].trim().toLowerCase();

      let type = 'std_logic';
      let width = 1;

      if (typeStr.includes('std_logic_vector')) {
        type = 'std_logic_vector';
        const rangeM = typeStr.match(/\(\s*(\d+)\s+downto\s+(\d+)\s*\)/i);
        if (rangeM) {
          width = parseInt(rangeM[1]) - parseInt(rangeM[2]) + 1;
        }
      } else if (typeStr.includes('bit')) {
        type = 'bit';
      }

      names.forEach(name => {
        ports.push({ name, direction, type, width });
      });
    });

    return ports;
  }

  function parseArchitecture(code, entity) {
    const archRe = /\barchitecture\s+(\w+)\s+of\s+(\w+)\s+is([\s\S]*?)\bbegin\b([\s\S]*?)\bend\s+(?:architecture\s+)?(?:\w+\s*)?;/is;
    const m = archRe.exec(code);
    if (!m) return null;

    const archName = m[1].toLowerCase();
    const declSection = m[3];
    const bodySection = m[4];

    const signals = parseSignalDeclarations(declSection);
    const components = parseComponentDeclarations(declSection);
    const statements = parseStatements(bodySection, entity.ports, signals, entity.generics || {});

    return { name: archName, signals, components, statements };
  }

  function parseSignalDeclarations(decls) {
    const signals = [];
    const re = /\bsignal\s+(\w+(?:\s*,\s*\w+)*)\s*:\s*(\w+(?:\s*\([^)]+\))?)\s*(?::=\s*([^;]+))?\s*;/gi;
    let m;
    while ((m = re.exec(decls)) !== null) {
      const names = m[1].split(',').map(n => n.trim().toLowerCase());
      const typeStr = m[2].trim().toLowerCase();
      const initVal = m[3] ? m[3].trim() : null;

      let type = 'std_logic';
      let width = 1;

      if (typeStr.includes('std_logic_vector')) {
        type = 'std_logic_vector';
        const rangeM = typeStr.match(/\(\s*(\d+)\s+downto\s+(\d+)\s*\)/i);
        if (rangeM) {
          width = parseInt(rangeM[1]) - parseInt(rangeM[2]) + 1;
        }
      }

      names.forEach(name => {
        signals.push({ name, type, width, initVal });
      });
    }
    return signals;
  }

  function parseComponentDeclarations(decls) {
    const components = [];
    const re = /\bcomponent\s+(\w+)\s+(?:is\s+)?port\s*\(([^)]+)\)\s*;\s*end\s+component/gi;
    let m;
    while ((m = re.exec(decls)) !== null) {
      components.push({
        name: m[1].toLowerCase(),
        ports: parsePorts(m[2])
      });
    }
    return components;
  }

  function parseStatements(body, ports, signals, generics) {
    generics = generics || {};
    const statements = [];

    // Concurrent signal assignments: signal <= expression [after X ns];
    const concurrentRe = /(\w+)\s*<=\s*([^;]+);/g;
    let m;
    while ((m = concurrentRe.exec(body)) !== null) {
      // Skip if inside a process
      const before = body.substring(0, m.index);
      const processCount = (before.match(/\bprocess\b/gi) || []).length;
      const endProcessCount = (before.match(/\bend\s+process\b/gi) || []).length;
      if (processCount > endProcessCount) continue;

      let exprRaw = m[2].trim().toLowerCase();
      let delayNs = 0;

      // Extract "after X ns/ps/us" — literal number
      const afterNumM = exprRaw.match(/\bafter\s+(\d+(?:\.\d+)?)\s*(ns|ps|us)\b/i);
      if (afterNumM) {
        const val = parseFloat(afterNumM[1]);
        const unit = afterNumM[2].toLowerCase();
        delayNs = unit === 'ps' ? val / 1000 : unit === 'us' ? val * 1000 : val;
        exprRaw = exprRaw.replace(afterNumM[0], '').trim();
      } else {
        // "after IDENTIFIER" — look up in generics
        const afterIdM = exprRaw.match(/\bafter\s+(\w+)\b/i);
        if (afterIdM) {
          const gName = afterIdM[1].toLowerCase();
          if (generics[gName] !== undefined) {
            delayNs = generics[gName];
          }
          exprRaw = exprRaw.replace(afterIdM[0], '').trim();
        }
      }

      // Detect "when...else" conditional assignment
      if (/\bwhen\b/i.test(exprRaw)) {
        // Parse: val1 when cond1 else val2 when cond2 else val3
        const alternatives = [];
        const parts = exprRaw.split(/\belse\b/i);
        parts.forEach((part, idx) => {
          part = part.trim();
          const whenIdx = part.search(/\bwhen\b/i);
          if (whenIdx !== -1) {
            const val = part.slice(0, whenIdx).trim();
            const cond = part.slice(whenIdx + 4).trim();
            alternatives.push({ value: val, condition: cond });
          } else {
            alternatives.push({ value: part, condition: null }); // default
          }
        });
        statements.push({
          type: 'conditional_assign',
          target: m[1].toLowerCase(),
          alternatives,
          delay: delayNs
        });
      } else {
        statements.push({
          type: 'concurrent_assign',
          target: m[1].toLowerCase(),
          expr: exprRaw,
          delay: delayNs
        });
      }
    }

    // Process statements
    const processRe = /\bprocess\s*(?:\(\s*([^)]*)\s*\))?\s*(?:is\s*)?(?:variable[^;]+;)*\s*begin\s([\s\S]*?)\bend\s+process\s*(?:\w+\s*)?;/gi;
    while ((m = processRe.exec(body)) !== null) {
      const sensitivity = m[1] ? m[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
      const processBody = m[2];
      const stmts = parseProcessBody(processBody);
      statements.push({ type: 'process', sensitivity, statements: stmts });
    }

    return statements;
  }

  function parseProcessBody(body) {
    const stmts = [];

    // Signal/variable assignments
    const assignRe = /(\w+)\s*(<=|:=)\s*([^;]+);/g;
    let m;

    // We need to parse if-elsif-else constructs too
    // Simplified: just extract assignments and if blocks

    // If statements
    const ifRe = /\bif\s+([^then]+)\s+then\s([\s\S]*?)(?:\belsif\s+([^then]+)\s+then\s([\s\S]*?))*(?:\belse\s([\s\S]*?))?\bend\s+if\s*;/gi;
    while ((m = ifRe.exec(body)) !== null) {
      stmts.push({
        type: 'if',
        condition: m[1].trim().toLowerCase(),
        thenStmts: parseSimpleAssignments(m[2] || ''),
        elseStmts: m[5] ? parseSimpleAssignments(m[5]) : []
      });
    }

    // Direct assignments (outside if)
    const cleanBody = body.replace(/\bif\b[\s\S]*?\bend\s+if\s*;/gi, '');
    while ((m = assignRe.exec(cleanBody)) !== null) {
      stmts.push({
        type: 'assign',
        target: m[1].toLowerCase(),
        op: m[2],
        expr: m[3].trim().toLowerCase()
      });
    }

    return stmts;
  }

  function parseSimpleAssignments(body) {
    const stmts = [];
    const re = /(\w+)\s*(<=|:=)\s*([^;]+);/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      stmts.push({
        type: 'assign',
        target: m[1].toLowerCase(),
        op: m[2],
        expr: m[3].trim().toLowerCase()
      });
    }
    return stmts;
  }

  // =================== SIMULATOR ===================
  function simulate(code, testbench, duration, resolution) {
    const parseRes = parse(code);
    if (parseRes.errors.length > 0) {
      return { success: false, errors: parseRes.errors, signals: [], timeline: [] };
    }

    const entity = parseRes.entities[0];
    if (!entity || !entity.architecture) {
      return { success: false, errors: [{ message: 'Nije parsiran entity/architecture' }], signals: [], timeline: [] };
    }

    // Build initial state
    const state = {};
    entity.ports.forEach(p => {
      state[p.name] = p.width > 1 ? Array(p.width).fill('0') : '0';
    });
    entity.architecture.signals.forEach(s => {
      if (s.initVal) {
        state[s.name] = resolveInitVal(s.initVal, s.type, s.width);
      } else {
        state[s.name] = s.width > 1 ? Array(s.width).fill('0') : '0';
      }
    });

    // Parse testbench or use default stimulus; fall back to default if tb yields no stimuli
    let stimuli = testbench ? parseTestbench(testbench, entity) : null;
    if (!stimuli || stimuli.length === 0) {
      stimuli = generateDefaultStimulus(entity, duration);
    }

    // Event queue: combines stimuli + delayed signal events
    // Each entry: { time, signal, value }
    const eventQueue = [...stimuli];

    // Transport delay: track last expression value fed into each delayed element.
    // A new event is scheduled only when the expression result changes — not on every step.
    // Initialize to current signal state so the first evaluation triggers settling if needed.
    const lastInputVal = {};
    entity.architecture.statements.forEach(stmt => {
      if ((stmt.type === 'concurrent_assign' || stmt.type === 'conditional_assign') && stmt.delay > 0) {
        lastInputVal[stmt.target] = state[stmt.target] ?? '0';
      }
    });

    // Timeline: array of { time, signals: {name: value} }
    const timeline = [];
    const timeSteps = Math.floor(duration / resolution);

    for (let t = 0; t <= timeSteps; t++) {
      const time = t * resolution;

      // Apply all events scheduled at this time
      const eventsNow = eventQueue.filter(e => Math.round(e.time) === time);
      eventsNow.forEach(e => {
        state[e.signal] = e.value;
      });

      // Evaluate architecture — with delay, schedule future events instead of updating state directly
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 10) {
        changed = false;
        iterations++;

        entity.architecture.statements.forEach(stmt => {
          if (stmt.type === 'concurrent_assign' || stmt.type === 'conditional_assign') {
            let newVal;
            if (stmt.type === 'conditional_assign') {
              newVal = '0';
              for (const alt of stmt.alternatives) {
                if (!alt.condition || evalCondition(alt.condition, state)) {
                  newVal = evalExpr(alt.value, state) ?? '0';
                  break;
                }
              }
            } else {
              newVal = evalExpr(stmt.expr, state);
              if (newVal === null) return;
            }

            if (stmt.delay > 0) {
              // Transport delay: schedule a new event only when expression result changes.
              // Multiple events for the same signal can coexist (each input change → one output event).
              const fireTime = time + stmt.delay;
              if (fireTime <= duration && newVal !== lastInputVal[stmt.target]) {
                lastInputVal[stmt.target] = newVal;
                eventQueue.push({ time: fireTime, signal: stmt.target, value: newVal, _delayed: true });
                changed = true;
              }
            } else {
              if (state[stmt.target] !== newVal) {
                state[stmt.target] = newVal;
                changed = true;
              }
            }
          } else if (stmt.type === 'process') {
            const newStates = evalProcess(stmt, state, t === 0);
            Object.keys(newStates).forEach(k => {
              if (state[k] !== newStates[k]) {
                state[k] = newStates[k];
                changed = true;
              }
            });
          }
        });
      }

      // Record snapshot
      const snapshot = { time };
      Object.keys(state).forEach(k => {
        snapshot[k] = state[k];
      });
      timeline.push(snapshot);
    }

    // Build signal list with metadata
    const signalList = [
      ...entity.ports.map(p => ({ name: p.name, direction: p.direction, type: p.type, width: p.width })),
      ...entity.architecture.signals.map(s => ({ name: s.name, direction: 'internal', type: s.type, width: s.width }))
    ];

    return { success: true, errors: [], signals: signalList, timeline };
  }

  function resolveInitVal(val, type, width) {
    val = val.trim().toLowerCase().replace(/['"]/g, '');
    if (val === '0' || val === "'0'") return '0';
    if (val === '1' || val === "'1'") return '1';
    if (val === '"0000"' || val === '(others => \'0\')' || val.includes('others')) return Array(width).fill('0');
    return '0';
  }

  function evalExpr(expr, state) {
    expr = expr.trim().toLowerCase();

    // Remove outer parens — only when the first '(' matches the last ')'
    // (e.g. "(a and b) or (c and d)" must NOT be stripped)
    const outerParensMatch = (e) => {
      if (!(e.startsWith('(') && e.endsWith(')'))) return false;
      let depth = 0;
      for (let i = 0; i < e.length; i++) {
        if (e[i] === '(') depth++;
        else if (e[i] === ')') { depth--; if (depth === 0 && i < e.length - 1) return false; }
      }
      return true;
    };
    while (outerParensMatch(expr)) {
      expr = expr.slice(1, -1).trim();
    }

    // Literals
    if (expr === "'0'" || expr === '0') return '0';
    if (expr === "'1'" || expr === '1') return '1';
    if (expr === "'x'" || expr === 'x') return 'X';
    if (expr === "'z'" || expr === 'z') return 'Z';

    // NOT
    if (expr.startsWith('not ')) {
      const inner = evalExpr(expr.slice(4), state);
      return logicNot(inner);
    }

    // Binary operators - find the top-level operator
    const ops = [
      { op: ' xnor ', fn: (a, b) => logicXnor(a, b) },
      { op: ' xor ', fn: (a, b) => logicXor(a, b) },
      { op: ' nor ', fn: (a, b) => logicNot(logicOr(a, b)) },
      { op: ' nand ', fn: (a, b) => logicNot(logicAnd(a, b)) },
      { op: ' or ', fn: (a, b) => logicOr(a, b) },
      { op: ' and ', fn: (a, b) => logicAnd(a, b) },
    ];

    for (const { op, fn } of ops) {
      const idx = findTopLevelOp(expr, op.trim());
      if (idx !== -1) {
        const left = evalExpr(expr.substring(0, idx), state);
        const right = evalExpr(expr.substring(idx + op.trim().length), state);
        return fn(left, right);
      }
    }

    // Variable reference
    if (/^\w+$/.test(expr)) {
      return state[expr] !== undefined ? state[expr] : 'X';
    }

    return 'X';
  }

  function findTopLevelOp(expr, op) {
    let depth = 0;
    for (let i = 0; i < expr.length - op.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') depth--;
      else if (depth === 0 && expr.toLowerCase().substring(i, i + op.length + 2) === ' ' + op + ' ') {
        return i + 1;
      }
    }
    return -1;
  }

  function evalProcess(process, state, isFirst) {
    const newStates = {};
    const localState = { ...state };

    process.statements.forEach(stmt => {
      if (stmt.type === 'assign') {
        const val = evalExpr(stmt.expr, localState);
        localState[stmt.target] = val;
        newStates[stmt.target] = val;
      } else if (stmt.type === 'if') {
        const cond = evalCondition(stmt.condition, localState);
        const stmtsToRun = cond ? stmt.thenStmts : stmt.elseStmts;
        stmtsToRun.forEach(s => {
          if (s.type === 'assign') {
            const val = evalExpr(s.expr, localState);
            localState[s.target] = val;
            newStates[s.target] = val;
          }
        });
      }
    });

    return newStates;
  }

  function evalCondition(cond, state) {
    cond = cond.trim().toLowerCase();

    if (cond.includes("'rising_edge'") || cond.includes('rising_edge(')) {
      const sig = cond.match(/rising_edge\s*\(\s*(\w+)\s*\)/)?.[1];
      return sig ? state[sig] === '1' : false;
    }
    if (cond.includes('falling_edge(')) {
      const sig = cond.match(/falling_edge\s*\(\s*(\w+)\s*\)/)?.[1];
      return sig ? state[sig] === '0' : false;
    }

    // Simple comparisons
    if (cond.includes('=')) {
      const parts = cond.split('=').map(p => p.trim().replace(/['"]/g, ''));
      const left = state[parts[0]] || parts[0];
      const right = parts[1];
      return left === right;
    }

    const val = evalExpr(cond, state);
    return val === '1';
  }

  // Logic functions
  function logicAnd(a, b) {
    if (a === '0' || b === '0') return '0';
    if (a === '1' && b === '1') return '1';
    return 'X';
  }
  function logicOr(a, b) {
    if (a === '1' || b === '1') return '1';
    if (a === '0' && b === '0') return '0';
    return 'X';
  }
  function logicNot(a) {
    if (a === '0') return '1';
    if (a === '1') return '0';
    return 'X';
  }
  function logicXor(a, b) {
    if (a === 'X' || b === 'X') return 'X';
    return a === b ? '0' : '1';
  }
  function logicXnor(a, b) {
    return logicNot(logicXor(a, b));
  }

  // =================== TESTBENCH PARSER ===================
  function parseTestbench(code, entity) {
    const stimuli = [];

    // Build mapping: testbench signal name → entity port name
    // Handles both direct matches (a <= '1') and port-mapped signals (a => a_s, then a_s <= '1')
    const portMap = {};

    // Parse port map to find which tb signals drive which entity ports
    const portMapRe = /(\w+)\s*=>\s*(\w+)/gi;
    let pm;
    while ((pm = portMapRe.exec(code)) !== null) {
      const portName = pm[1].toLowerCase();
      const tbSig = pm[2].toLowerCase();
      const port = entity.ports.find(p => p.name === portName && p.direction === 'in');
      if (port) portMap[tbSig] = portName;
    }

    // Also accept port names directly
    entity.ports.filter(p => p.direction === 'in').forEach(p => {
      if (!portMap[p.name]) portMap[p.name] = p.name;
    });

    let currentTime = 0;
    const lines = code.split('\n');

    lines.forEach(line => {
      const waitM = line.match(/wait\s+for\s+(\d+)\s*ns/i);
      if (waitM) {
        currentTime += parseInt(waitM[1]);
        return;
      }

      const assignM = line.match(/(\w+)\s*<=\s*'?([01xzXZ])'?/);
      if (assignM) {
        const sigName = assignM[1].toLowerCase();
        const portName = portMap[sigName];
        if (portName) {
          stimuli.push({ time: currentTime, signal: portName, value: assignM[2] });
        }
      }
    });

    return stimuli;
  }

  function generateDefaultStimulus(entity, duration) {
    const stimuli = [];
    const inputs = entity.ports.filter(p => p.direction === 'in');

    const clkInputs = inputs.filter(p => p.name.includes('clk') || p.name.includes('clock'));
    const rstInputs = inputs.filter(p => p.name.includes('rst') || p.name.includes('reset'));
    const regularInputs = inputs.filter(p =>
      !p.name.includes('clk') && !p.name.includes('clock') &&
      !p.name.includes('rst') && !p.name.includes('reset')
    );

    const hasClk = clkInputs.length > 0;

    // Clock: toggle every 5ns
    clkInputs.forEach(port => {
      for (let t = 0; t <= duration; t += 5) {
        stimuli.push({ time: t, signal: port.name, value: t % 10 < 5 ? '0' : '1' });
      }
    });

    // Reset: active 0..15ns, then deassert
    rstInputs.forEach(port => {
      stimuli.push({ time: 0, signal: port.name, value: '1' });
      stimuli.push({ time: 15, signal: port.name, value: '0' });
    });

    if (regularInputs.length === 0) return stimuli;

    if (hasClk) {
      // Sequential: change data inputs every 2 clock cycles (20ns)
      regularInputs.forEach((port, idx) => {
        const halfPeriod = Math.max(20, 20 * Math.pow(2, idx));
        let lastVal = '0';
        stimuli.push({ time: 0, signal: port.name, value: '0' });
        for (let t = halfPeriod; t <= duration; t += halfPeriod) {
          const val = Math.floor(t / halfPeriod) % 2 === 0 ? '0' : '1';
          if (val !== lastVal) {
            stimuli.push({ time: t, signal: port.name, value: val });
            lastVal = val;
          }
        }
      });
    } else {
      // Combinational: truth-table pattern — cycle through 2^n input combinations
      const n = regularInputs.length;
      const combos = Math.min(Math.pow(2, n), 16); // max 16 combos
      const stepNs = Math.max(5, Math.floor(duration / (combos + 1)));

      // Init all at 0
      regularInputs.forEach(port => stimuli.push({ time: 0, signal: port.name, value: '0' }));

      for (let combo = 0; combo < combos; combo++) {
        const t = (combo + 1) * stepNs;
        if (t >= duration) break;
        regularInputs.forEach((port, bit) => {
          const val = (combo >> (n - 1 - bit)) & 1 ? '1' : '0';
          stimuli.push({ time: t, signal: port.name, value: val });
        });
      }
    }

    return stimuli;
  }

  // =================== TESTBENCH GENERATOR ===================
  function generateTestbench(code) {
    const parseRes = parse(code);
    if (parseRes.errors.length > 0 || !parseRes.entities[0]) return '';

    const entity = parseRes.entities[0];
    const inputs = entity.ports.filter(p => p.direction === 'in');
    const allPorts = entity.ports;
    const entityName = entity.name;

    let tb = `library ieee;\nuse ieee.std_logic_1164.all;\n\n`;
    tb += `entity ${entityName}_tb is\nend entity ${entityName}_tb;\n\n`;
    tb += `architecture sim of ${entityName}_tb is\n\n`;
    tb += `  component ${entityName}\n    port (\n`;
    allPorts.forEach((p, i) => {
      const typeStr = p.type === 'std_logic_vector' ? `std_logic_vector(${p.width-1} downto 0)` : 'std_logic';
      tb += `      ${p.name} : ${p.direction} ${typeStr}${i < allPorts.length-1 ? ';' : ''}\n`;
    });
    tb += `    );\n  end component;\n\n`;

    allPorts.forEach(p => {
      const typeStr = p.type === 'std_logic_vector' ? `std_logic_vector(${p.width-1} downto 0)` : 'std_logic';
      tb += `  signal ${p.name}_s : ${typeStr} := '0';\n`;
    });

    tb += `\nbegin\n\n`;
    tb += `  uut: ${entityName} port map (\n`;
    allPorts.forEach((p, i) => {
      tb += `    ${p.name} => ${p.name}_s${i < allPorts.length-1 ? ',' : ''}\n`;
    });
    tb += `  );\n\n`;
    tb += `  stimulus: process\n  begin\n`;

    // Check for clock
    const clk = inputs.find(p => p.name.includes('clk') || p.name.includes('clock'));
    if (clk) {
      tb += `    -- Initial state\n`;
      inputs.forEach(p => { if (p !== clk) tb += `    ${p.name}_s <= '0';\n`; });
      tb += `    ${clk.name}_s <= '0';\n    wait for 5 ns;\n\n`;
      tb += `    -- Test sequence\n`;
      tb += `    for i in 0 to 7 loop\n`;
      tb += `      ${clk.name}_s <= '1'; wait for 5 ns;\n`;
      tb += `      ${clk.name}_s <= '0'; wait for 5 ns;\n`;
      tb += `    end loop;\n`;
    } else {
      // Truth table style
      const numInputs = inputs.length;
      const combos = Math.min(Math.pow(2, numInputs), 16);
      tb += `    -- Test all input combinations\n`;
      for (let i = 0; i < combos; i++) {
        inputs.forEach((p, j) => {
          const bit = (i >> (numInputs - 1 - j)) & 1;
          tb += `    ${p.name}_s <= '${bit}';\n`;
        });
        tb += `    wait for 10 ns;\n\n`;
      }
    }

    tb += `    wait;\n  end process;\n\nend architecture sim;\n`;
    return tb;
  }

  return { checkSyntax, parse, simulate, generateTestbench };
})();
