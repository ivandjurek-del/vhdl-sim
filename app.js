/**
 * VHDL Simulator - Main Application Controller
 */

const App = (() => {
  let vhdlEditor = null;
  let tbEditor = null;
  let currentProject = null;
  let lastSimResult = null;
  let saveTimeout = null;

  // =================== INITIALIZATION ===================
  function init() {
    initEditors();
    initResizeHandle();
    renderLibraryPanel();
    addToast();
  }

  function initEditors() {
    const vhdlTextarea = document.getElementById('vhdl-editor');
    const tbTextarea = document.getElementById('tb-editor');

    const commonConfig = {
      theme: 'dracula',
      mode: 'vhdl',
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      indentUnit: 2,
      tabSize: 2,
      extraKeys: {
        'Ctrl-Enter': () => runSimulation(),
        'Cmd-Enter': () => runSimulation(),
        'Ctrl-S': () => saveProject(),
        'Cmd-S': () => saveProject(),
        'Ctrl-Shift-C': () => checkSyntax(),
        'Cmd-Shift-C': () => checkSyntax()
      }
    };

    vhdlEditor = CodeMirror.fromTextArea(vhdlTextarea, commonConfig);
    tbEditor = CodeMirror.fromTextArea(tbTextarea, commonConfig);

    vhdlEditor.on('change', () => markUnsaved());
    tbEditor.on('change', () => markUnsaved());
  }

  function initResizeHandle() {
    const handle = document.getElementById('resize-handle');
    const editorPanel = document.getElementById('editor-panel');
    const simPanel = document.getElementById('sim-panel');
    let isResizing = false;
    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = editorPanel.offsetWidth;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(startWidth + dx, window.innerWidth - 300));
      editorPanel.style.width = newWidth + 'px';
      editorPanel.style.flex = 'none';
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        vhdlEditor.refresh();
        tbEditor.refresh();
      }
    });

    // Touch support for iPad
    handle.addEventListener('touchstart', (e) => {
      isResizing = true;
      startX = e.touches[0].clientX;
      startWidth = editorPanel.offsetWidth;
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!isResizing) return;
      const dx = e.touches[0].clientX - startX;
      const newWidth = Math.max(200, Math.min(startWidth + dx, window.innerWidth - 300));
      editorPanel.style.width = newWidth + 'px';
      editorPanel.style.flex = 'none';
    });

    document.addEventListener('touchend', () => {
      isResizing = false;
    });
  }

  function addToast() {
    const toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  // =================== NAVIGATION ===================
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    target.classList.add('active');

    if (id === 'editor-screen') {
      setTimeout(() => {
        vhdlEditor.refresh();
        tbEditor.refresh();
      }, 100);
    }
  }

  function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  }

  function goHome() {
    if (currentProject) saveProject(true);
    showScreen('welcome-screen');
  }

  // =================== PROJECT MANAGEMENT ===================
  function getProjects() {
    try {
      return JSON.parse(localStorage.getItem('vhdl_projects') || '[]');
    } catch { return []; }
  }

  function saveProjects(projects) {
    try {
      localStorage.setItem('vhdl_projects', JSON.stringify(projects));
    } catch (e) {
      toast('Upozorenje: projekti se ne mogu spremiti lokalno — izvezi JSON!', 'error');
    }
  }

  function newProject() {
    document.getElementById('new-project-name').value = '';
    document.getElementById('new-project-template').value = 'empty';
    document.getElementById('new-project-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('new-project-name').focus(), 100);
  }

  function createProject() {
    const name = document.getElementById('new-project-name').value.trim();
    if (!name) {
      toast('Upiši naziv projekta', 'error');
      return;
    }

    const template = document.getElementById('new-project-template').value;
    const tmpl = VHDLLibrary.getTemplate(template);

    // Generate testbench if empty
    let tbCode = tmpl.testbench;
    if (!tbCode && tmpl.vhdl) {
      tbCode = VHDLInterpreter.generateTestbench(tmpl.vhdl);
    }

    currentProject = {
      id: Date.now().toString(),
      name,
      vhdl: tmpl.vhdl,
      testbench: tbCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Persist
    const projects = getProjects();
    projects.unshift(currentProject);
    saveProjects(projects);

    closeModals();
    openProjectEditor(currentProject);
  }

  function showProjectList() {
    const projects = getProjects();
    const list = document.getElementById('project-list');

    if (projects.length === 0) {
      list.innerHTML = '<p class="empty-hint">Nema spremljenih projekata</p>';
    } else {
      list.innerHTML = projects.map(p => `
        <div class="project-item" onclick="App.openProject('${p.id}')">
          <div class="project-item-info">
            <div class="project-item-name">${escapeHtml(p.name)}</div>
            <div class="project-item-date">${formatDate(p.updatedAt)}</div>
          </div>
          <div class="project-item-actions" onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-sm" onclick="App.deleteProject('${p.id}')">Obriši</button>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('project-list-modal').classList.remove('hidden');
  }

  function openProject(id) {
    const projects = getProjects();
    const project = projects.find(p => p.id === id);
    if (!project) return;
    currentProject = project;
    closeModals();
    openProjectEditor(project);
  }

  function openProjectEditor(project) {
    document.getElementById('project-name-display').textContent = project.name;
    vhdlEditor.setValue(project.vhdl || '');
    tbEditor.setValue(project.testbench || '');
    markSaved();
    showScreen('editor-screen');

    // Clear previous simulation
    document.getElementById('waveform-container').innerHTML = `
      <div class="waveform-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <polyline points="1 12 5 12 7 4 9 20 11 12 13 12"/>
          <polyline points="13 12 15 8 17 16 19 12 23 12"/>
        </svg>
        <p>Pokreni simulaciju za prikaz waveforma</p>
      </div>`;
    document.getElementById('signals-table-container').innerHTML = '<p class="empty-hint">Pokreni simulaciju za prikaz vrijednosti signala</p>';
    clearErrors();
  }

  function deleteProject(id) {
    if (!confirm('Obrisati projekt?')) return;
    const projects = getProjects().filter(p => p.id !== id);
    saveProjects(projects);
    showProjectList();
    toast('Projekt obrisan');
  }

  function saveProject(silent = false) {
    if (!currentProject) return;
    currentProject.vhdl = vhdlEditor.getValue();
    currentProject.testbench = tbEditor.getValue();
    currentProject.updatedAt = new Date().toISOString();

    const projects = getProjects();
    const idx = projects.findIndex(p => p.id === currentProject.id);
    if (idx >= 0) projects[idx] = currentProject;
    else projects.unshift(currentProject);
    saveProjects(projects);

    markSaved();
    if (!silent) toast('Projekt spremljen ✓', 'success');
  }

  function markUnsaved() {
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
      indicator.textContent = '● Nije spremljeno';
      indicator.className = 'save-indicator unsaved';
    }
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveProject(true), 3000);
  }

  function markSaved() {
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
      indicator.textContent = '✓ Spremljeno';
      indicator.className = 'save-indicator saved';
    }
  }

  // =================== EDITOR TABS ===================
  function switchEditorTab(tab, btn) {
    document.querySelectorAll('.panel-tabs .tab').forEach(t => {
      if (t.closest('#editor-panel')) t.classList.remove('active');
    });
    btn.classList.add('active');

    document.getElementById('editor-vhdl').classList.toggle('hidden', tab !== 'vhdl');
    document.getElementById('editor-testbench').classList.toggle('hidden', tab !== 'testbench');

    setTimeout(() => {
      if (tab === 'vhdl') vhdlEditor.refresh();
      else tbEditor.refresh();
    }, 50);
  }

  function switchSimTab(tab, btn) {
    document.querySelectorAll('#sim-panel .panel-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    ['waveform', 'signals', 'library'].forEach(t => {
      document.getElementById('sim-' + t).classList.toggle('active', t === tab);
      document.getElementById('sim-' + t).classList.toggle('hidden', t !== tab);
    });

    if (tab === 'library') renderLibraryPanel();
  }

  function switchLibTab(tab, btn) {
    document.querySelectorAll('#library-modal .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('lib-builtin').classList.toggle('active', tab === 'builtin');
    document.getElementById('lib-builtin').classList.toggle('hidden', tab !== 'builtin');
    document.getElementById('lib-custom').classList.toggle('active', tab === 'custom');
    document.getElementById('lib-custom').classList.toggle('hidden', tab !== 'custom');

    if (tab === 'custom') renderCustomLibrary();
  }

  // =================== SIMULATION ===================
  function runSimulation() {
    const code = vhdlEditor.getValue();
    const tb = tbEditor.getValue().trim();
    const duration = parseInt(document.getElementById('sim-duration').value) || 100;
    const resolution = parseInt(document.getElementById('sim-resolution').value) || 1;

    // First check syntax — block only on hard errors, show warnings but continue
    const syntaxResult = VHDLInterpreter.checkSyntax(code);
    const hardErrors = (syntaxResult.errors || []).filter(e => e.type === 'error');
    if (hardErrors.length > 0) {
      showErrors([...syntaxResult.errors, ...(syntaxResult.warnings || [])]);
      toast('Greška sintakse — ispravi greške', 'error');
      return;
    }
    if ((syntaxResult.warnings || []).length > 0) {
      showErrors(syntaxResult.warnings);
    }

    const btn = document.getElementById('run-btn');
    btn.disabled = true;
    btn.innerHTML = '<span style="animation: spin 0.8s linear infinite; display:inline-block">⟳</span> Simulira se...';

    // Run async to not block UI
    setTimeout(() => {
      try {
        const result = VHDLInterpreter.simulate(code, tb || null, duration, resolution);
        lastSimResult = result;

        if (!result.success) {
          showErrors(result.errors);
          toast('Simulacija neuspješna', 'error');
        } else {
          clearErrors();
          showSimulationResults(result, duration);
          toast('Simulacija završena ✓', 'success');
        }
      } catch (e) {
        showErrors([{ type: 'error', message: 'Interna greška: ' + e.message, line: 1 }]);
        toast('Greška simulacije', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Pokreni simulaciju`;
      }
    }, 10);
  }

  function showSimulationResults(result, duration) {
    // Waveform
    const wfContainer = document.getElementById('waveform-container');
    if (result.signals.length > 0) {
      WaveformRenderer.render(wfContainer, result.signals, result.timeline, duration);
    } else {
      wfContainer.innerHTML = '<div class="waveform-placeholder"><p>Nema signala za prikaz</p></div>';
    }

    // Signals table
    WaveformRenderer.buildSignalsTable(
      document.getElementById('signals-table-container'),
      result.signals,
      result.timeline
    );
  }

  // =================== SYNTAX CHECK ===================
  function checkSyntax() {
    const code = vhdlEditor.getValue();
    const result = VHDLInterpreter.checkSyntax(code);
    const allIssues = [
      ...(result.errors || []),
      ...(result.warnings || []),
      ...(result.info || [])
    ];
    showErrors(allIssues);

    if (result.errors.length === 0 && result.warnings.length === 0) {
      toast('Sintaksa ispravna ✓', 'success');
    } else {
      toast(`${result.errors.length} grešaka, ${result.warnings.length} upozorenja`, 'error');
    }
  }

  function showErrors(issues) {
    const panel = document.getElementById('error-panel');
    const list = document.getElementById('error-list');
    const count = document.getElementById('error-count');

    if (!issues || issues.length === 0) {
      panel.classList.add('hidden');
      return;
    }

    const errors = issues.filter(i => i.type === 'error').length;
    const warnings = issues.filter(i => i.type === 'warning').length;

    let countText = '';
    if (errors > 0) countText += `${errors} grešaka`;
    if (warnings > 0) countText += (countText ? ', ' : '') + `${warnings} upozorenja`;
    if (issues.find(i => i.type === 'success')) countText = 'Ispravno ✓';
    count.textContent = countText;

    list.innerHTML = issues.map(issue => {
      const icons = { error: '✕', warning: '⚠', success: '✓', info: 'ℹ' };
      const icon = icons[issue.type] || 'ℹ';
      return `<div class="error-item ${issue.type || 'info'}">
        <span class="error-icon">${icon}</span>
        <div class="error-text">
          <div>${escapeHtml(issue.message)}</div>
          ${issue.line ? `<div class="error-line">Linija ${issue.line}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    panel.classList.remove('hidden');
  }

  function clearErrors() {
    document.getElementById('error-panel').classList.add('hidden');
    document.getElementById('error-list').innerHTML = '';
  }

  // =================== LIBRARY ===================
  function openLibrary() {
    renderBuiltinLibrary();
    renderCustomLibrary();
    document.getElementById('library-modal').classList.remove('hidden');
  }

  function renderBuiltinLibrary() {
    const list = document.getElementById('builtin-list');
    const comps = VHDLLibrary.getAllBuiltin();

    // Group by category
    const categories = {};
    comps.forEach(c => {
      if (!categories[c.category]) categories[c.category] = [];
      categories[c.category].push(c);
    });

    let html = '';
    Object.entries(categories).forEach(([cat, items]) => {
      html += `<div style="grid-column: 1/-1; color: #6c7086; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 8px; padding: 4px 0;">${escapeHtml(cat)}</div>`;
      items.forEach(comp => {
        html += `<div class="comp-card" onclick="App.insertBuiltinComponent('${comp.name}')">
          <div class="comp-card-name">${escapeHtml(comp.name)}</div>
          <div class="comp-card-desc">${escapeHtml(comp.desc)}</div>
          <div class="comp-card-ports">${escapeHtml(comp.ports)}</div>
        </div>`;
      });
    });

    list.innerHTML = html;
  }

  function renderCustomLibrary() {
    const comps = VHDLLibrary.getCustomComponents();
    const list = document.getElementById('custom-list');
    const empty = document.getElementById('custom-empty');

    if (comps.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = comps.map(comp => `
      <div class="comp-card">
        <div class="comp-card-name">${escapeHtml(comp.name)}</div>
        <div class="comp-card-desc">${escapeHtml(comp.desc || '')}</div>
        <div class="comp-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="App.insertCustomComponent('${escapeHtml(comp.name)}')">Umetni</button>
          <button class="btn btn-ghost btn-sm" onclick="App.deleteCustomComp('${escapeHtml(comp.name)}')">✕</button>
        </div>
      </div>
    `).join('');
  }

  function renderLibraryPanel() {
    const container = document.getElementById('sim-lib-list');
    const builtin = VHDLLibrary.getAllBuiltin();
    const custom = VHDLLibrary.getCustomComponents();
    const all = [
      ...builtin.map(c => ({ ...c, isCustom: false })),
      ...custom.map(c => ({ ...c, isCustom: true, category: 'Moji sklopovi' }))
    ];
    renderLibList(container, all, '');
  }

  function filterLibrary(query) {
    const container = document.getElementById('sim-lib-list');
    const builtin = VHDLLibrary.getAllBuiltin();
    const custom = VHDLLibrary.getCustomComponents();
    const all = [
      ...builtin.map(c => ({ ...c, isCustom: false })),
      ...custom.map(c => ({ ...c, isCustom: true, category: 'Moji sklopovi' }))
    ];
    renderLibList(container, all, query.toLowerCase());
  }

  function renderLibList(container, components, filter) {
    const filtered = filter
      ? components.filter(c => c.name.toLowerCase().includes(filter) || (c.desc || '').toLowerCase().includes(filter))
      : components;

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-hint">Nema rezultata</p>';
      return;
    }

    container.innerHTML = filtered.map(comp => `
      <div class="component-list-item">
        <div>
          <div class="comp-name">${escapeHtml(comp.name)}</div>
          <div class="comp-desc">${escapeHtml(comp.desc || '')}</div>
        </div>
        <button class="btn btn-secondary btn-sm btn-insert"
          onclick="App.insertComponentCode('${escapeHtml(comp.name)}', ${comp.isCustom})">
          Umetni
        </button>
      </div>
    `).join('');
  }

  function loadComponentIntoEditor(code, name, tbCode) {
    const tb = tbCode || VHDLInterpreter.generateTestbench(code);
    currentProject = {
      id: Date.now().toString(),
      name,
      vhdl: code,
      testbench: tb,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const projects = getProjects();
    projects.unshift(currentProject);
    saveProjects(projects);
    closeModals();
    vhdlEditor.setValue(code);
    tbEditor.setValue(tb);
    document.getElementById('project-name-display').textContent = name;
    markSaved();
    showScreen('editor-screen');
    toast(`Učitan: ${name}`);
  }

  function insertBuiltinComponent(name) {
    const comp = VHDLLibrary.getAllBuiltin().find(c => c.name === name);
    if (!comp) return;
    loadComponentIntoEditor(comp.code, comp.name, comp.testbench || null);
  }

  function insertCustomComponent(name) {
    const comp = VHDLLibrary.getCustomComponents().find(c => c.name === name);
    if (!comp) return;
    loadComponentIntoEditor(comp.code, comp.name, null);
  }

  function insertComponentCode(name, isCustom) {
    if (isCustom) {
      const comp = VHDLLibrary.getCustomComponents().find(c => c.name === name);
      if (comp) {
        loadComponentIntoEditor(comp.code, comp.name, null);
      }
    } else {
      const comp = VHDLLibrary.getAllBuiltin().find(c => c.name === name);
      if (comp) {
        loadComponentIntoEditor(comp.code, comp.name, comp.testbench || null);
      }
    }
  }

  function deleteCustomComp(name) {
    if (!confirm(`Obrisati '${name}' iz biblioteke?`)) return;
    VHDLLibrary.deleteCustomComponent(name);
    renderCustomLibrary();
    toast('Obrisano iz biblioteke');
  }

  function showSaveLibModal() {
    if (!currentProject) {
      toast('Nema otvorenog projekta', 'error');
      return;
    }

    // Try to extract entity name as default
    const code = vhdlEditor.getValue();
    const nameMatch = code.match(/\bentity\s+(\w+)\s+is/i);
    document.getElementById('lib-comp-name').value = nameMatch ? nameMatch[1] : currentProject.name;
    document.getElementById('lib-comp-desc').value = '';
    document.getElementById('save-lib-modal').classList.remove('hidden');
  }

  function saveToLibrary() {
    const name = document.getElementById('lib-comp-name').value.trim();
    const desc = document.getElementById('lib-comp-desc').value.trim();

    if (!name) {
      toast('Upiši naziv', 'error');
      return;
    }

    const code = vhdlEditor.getValue();
    VHDLLibrary.saveCustomComponent(name, desc, code);
    closeModals();
    toast(`Spremljeno u biblioteku: ${name} ✓`, 'success');
  }

  // =================== EXPORT / IMPORT ===================
  function exportProjects() {
    const projects = getProjects();
    if (projects.length === 0) {
      toast('Nema projekata za izvoz', 'error');
      return;
    }
    const json = JSON.stringify({ version: 1, projects, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vhdl-projekti-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Izvezeno ${projects.length} projekata ✓`, 'success');
  }

  function importProjects() {
    document.getElementById('import-file-input').click();
  }

  function handleImport(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const incoming = data.projects || (Array.isArray(data) ? data : []);
        if (incoming.length === 0) { toast('Nema projekata u datoteci', 'error'); return; }

        const existing = getProjects();
        const existingIds = new Set(existing.map(p => p.id));
        let added = 0, updated = 0;

        incoming.forEach(p => {
          if (!p.id || !p.name) return;
          if (existingIds.has(p.id)) {
            const idx = existing.findIndex(ex => ex.id === p.id);
            if (new Date(p.updatedAt) > new Date(existing[idx].updatedAt)) {
              existing[idx] = p;
              updated++;
            }
          } else {
            existing.unshift(p);
            existingIds.add(p.id);
            added++;
          }
        });

        saveProjects(existing);
        toast(`Uvezeno: ${added} novih, ${updated} ažuriranih ✓`, 'success');
        const modal = document.getElementById('project-list-modal');
        if (!modal.classList.contains('hidden')) showProjectList();
      } catch (err) {
        toast('Greška pri čitanju datoteke', 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  // =================== UTILS ===================
  function toast(msg, type = '') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'show' + (type ? ' ' + type : '');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.className = ''; }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  // Keyboard shortcuts (global)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });

  // Click outside modal to close
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModals();
  });

  return {
    init,
    // Navigation
    newProject, showProjectList, openProject, deleteProject,
    createProject, goHome, closeModals,
    // Editor
    saveProject, checkSyntax, runSimulation,
    switchEditorTab, switchSimTab, switchLibTab,
    // Library
    openLibrary, renderLibraryPanel, filterLibrary,
    insertBuiltinComponent, insertCustomComponent, insertComponentCode,
    deleteCustomComp, showSaveLibModal, saveToLibrary,
    // Error panel
    clearErrors,
    // Export / import
    exportProjects, importProjects, handleImport
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
