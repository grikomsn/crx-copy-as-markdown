import { SETTING_IDS, getSettings, saveSettings as saveSettingsToStorage, generateId } from '../src/settings.js';

let draggedRuleElement = null;

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  updatePickerButtonState();
  loadCurrentShortcut();
  setupReplacementEventListeners();
  loadReplacementsSettings();

  SETTING_IDS.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', saveSettings);
    }
  });

  const pickerButton = document.getElementById('toggle-picker');
  if (pickerButton) {
    pickerButton.addEventListener('click', togglePicker);
  }
});

async function loadCurrentShortcut() {
  try {
    const commands = await chrome.commands.getAll();
    const pickerCommand = commands.find(cmd => cmd.name === 'toggle-element-picker');
    const shortcutEl = document.getElementById('picker-shortcut');

    if (pickerCommand && shortcutEl) {
      const shortcut = formatShortcut(pickerCommand.shortcut);
      shortcutEl.textContent = shortcut || 'custom shortcut';
    }
  } catch (error) {
    console.error('Failed to load shortcut:', error);
  }
}

function formatShortcut(shortcut) {
  if (!shortcut) return '';
  return shortcut
    .replace(/Ctrl\+/g, 'Ctrl+')
    .replace(/Alt\+/g, 'Alt+')
    .replace(/Shift\+/g, 'Shift+')
    .replace(/Command\+/g, 'Cmd+')
    .replace(/MacCtrl\+/g, 'Ctrl+');
}

async function togglePicker() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleSelectMode' });

    if (response && response.success) {
      updatePickerButtonState(response.isActive);
    }
  } catch (error) {
    console.error('Failed to toggle picker:', error);
  }
}

async function updatePickerButtonState(forceState = null) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const pickerButton = document.getElementById('toggle-picker');
    if (!pickerButton) return;

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
      pickerButton.classList.remove('active');
      pickerButton.disabled = true;
      const pickerText = pickerButton.querySelector('.picker-text');
      const pickerIcon = pickerButton.querySelector('.picker-icon');
      if (pickerText) pickerText.textContent = 'Not available on this page';
      if (pickerIcon) pickerIcon.textContent = '○';
      return;
    }

    pickerButton.disabled = false;

    let isActive;
    if (forceState !== null) {
      isActive = forceState;
    } else {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectModeState' });
      isActive = response?.success && response.isActive;
    }

    const pickerText = pickerButton.querySelector('.picker-text');
    const pickerIcon = pickerButton.querySelector('.picker-icon');

    if (isActive) {
      pickerButton.classList.add('active');
      if (pickerText) pickerText.textContent = 'Picker Active (Esc to exit)';
      if (pickerIcon) pickerIcon.textContent = '◎';
    } else {
      pickerButton.classList.remove('active');
      if (pickerText) pickerText.textContent = 'Toggle Element Picker';
      if (pickerIcon) pickerIcon.textContent = '◉';
    }
  } catch (error) {
    console.error('Failed to get picker state:', error);
  }
}

async function loadSettings() {
  try {
    const settings = await getSettings();

    SETTING_IDS.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;

      if (element.type === 'checkbox') {
        element.checked = settings[id];
      } else {
        element.value = settings[id];
      }
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings() {
  try {
    const settings = {};

    SETTING_IDS.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;

      if (element.type === 'checkbox') {
        settings[id] = element.checked;
      } else {
        settings[id] = element.value;
      }
    });

    await saveSettingsToStorage(settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

function setupReplacementEventListeners() {
  const preEnabled = document.getElementById('pre-replacements-enabled');
  const postEnabled = document.getElementById('post-replacements-enabled');
  const addPreBtn = document.getElementById('add-pre-rule');
  const addPostBtn = document.getElementById('add-post-rule');
  const exportBtn = document.getElementById('export-replacements');
  const importBtn = document.getElementById('import-replacements');
  const importInput = document.getElementById('import-file-input');
  const modal = document.getElementById('rule-modal');
  const cancelBtn = document.getElementById('cancel-rule');
  const saveBtn = document.getElementById('save-rule');

  if (preEnabled) {
    preEnabled.addEventListener('change', saveReplacementsSettings);
  }

  if (postEnabled) {
    postEnabled.addEventListener('change', saveReplacementsSettings);
  }

  if (addPreBtn) {
    addPreBtn.addEventListener('click', () => openRuleModal('pre'));
  }

  if (addPostBtn) {
    addPostBtn.addEventListener('click', () => openRuleModal('post'));
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportReplacements);
  }

  if (importBtn) {
    importBtn.addEventListener('click', () => importInput.click());
  }

  if (importInput) {
    importInput.addEventListener('change', handleImportFile);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeRuleModal);
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveRule);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeRuleModal();
      }
    });
  }
}

async function loadReplacementsSettings() {
  try {
    const settings = await getSettings();
    const replacements = settings.textReplacements || {
      pre: { enabled: true, rules: [] },
      post: { enabled: true, rules: [] }
    };

    const preEnabled = document.getElementById('pre-replacements-enabled');
    const postEnabled = document.getElementById('post-replacements-enabled');

    if (preEnabled) {
      preEnabled.checked = replacements.pre.enabled;
    }

    if (postEnabled) {
      postEnabled.checked = replacements.post.enabled;
    }

    renderReplacementList('pre', replacements.pre.rules || []);
    renderReplacementList('post', replacements.post.rules || []);
  } catch (error) {
    console.error('Failed to load replacements settings:', error);
  }
}

async function saveReplacementsSettings() {
  try {
    const settings = await getSettings();

    const preEnabled = document.getElementById('pre-replacements-enabled');
    const postEnabled = document.getElementById('post-replacements-enabled');

    const preRules = getRulesFromList('pre');
    const postRules = getRulesFromList('post');

    settings.textReplacements = {
      pre: {
        enabled: preEnabled ? preEnabled.checked : true,
        rules: preRules
      },
      post: {
        enabled: postEnabled ? postEnabled.checked : true,
        rules: postRules
      }
    };

    await saveSettingsToStorage(settings);
  } catch (error) {
    console.error('Failed to save replacements settings:', error);
  }
}

function renderReplacementList(phase, rules) {
  const listEl = document.getElementById(`${phase}-replacements-list`);
  if (!listEl) return;

  listEl.innerHTML = '';

  if (rules.length === 0) {
    listEl.innerHTML = '<div class="no-rules">No rules defined</div>';
    return;
  }

  rules.forEach((rule, index) => {
    const ruleEl = document.createElement('div');
    ruleEl.className = `rule-item ${rule.enabled ? '' : 'disabled'}`;
    ruleEl.dataset.ruleId = rule.id;
    ruleEl.draggable = true;

    const scopeLabel = {
      'all': 'All',
      'page': 'Page',
      'selection': 'Selection',
      'link': 'Link'
    }[rule.scope] || 'All';

    const patternDisplay = rule.useRegex
      ? `/${rule.pattern}/`
      : `"${rule.pattern}"`;

    const patternTitle = rule.useRegex ? `Regex: ${rule.pattern}` : rule.pattern;
    const replacementTitle = rule.replacement;

    ruleEl.innerHTML = `
      <span class="drag-handle" draggable="true">↕</span>
      <div class="rule-info">
        <span class="rule-pattern" title="${escapeHtml(patternTitle)}">${escapeHtml(patternDisplay)}</span>
        <span class="rule-arrow">→</span>
        <span class="rule-replacement" title="${escapeHtml(replacementTitle)}">${escapeHtml(rule.replacement)}</span>
        <span class="rule-scope" title="${scopeLabel}">(${scopeLabel})</span>
      </div>
      <div class="rule-actions">
        <button class="rule-edit" data-phase="${phase}" data-id="${rule.id}">Edit</button>
        <button class="rule-delete" data-phase="${phase}" data-id="${rule.id}">Delete</button>
      </div>
    `;

    listEl.appendChild(ruleEl);
  });

  setupRuleDragEvents(listEl);
  setupRuleActionEvents(listEl);
}

function setupRuleDragEvents(listEl) {
  listEl.querySelectorAll('.rule-item').forEach(ruleEl => {
    const dragHandle = ruleEl.querySelector('.drag-handle');
    
    dragHandle.addEventListener('dragstart', handleDragStart);
    dragHandle.addEventListener('dragend', handleDragEnd);

    ruleEl.addEventListener('dragover', handleDragOver);
    ruleEl.addEventListener('drop', handleDrop);
    ruleEl.addEventListener('dragenter', handleDragEnter);
    ruleEl.addEventListener('dragleave', handleDragLeave);
  });
}

function setupRuleActionEvents(listEl) {
  listEl.querySelectorAll('.rule-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const phase = e.target.dataset.phase;
      const id = e.target.dataset.id;
      openRuleModal(phase, id);
    });
  });

  listEl.querySelectorAll('.rule-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const phase = e.target.dataset.phase;
      const id = e.target.dataset.id;
      deleteRule(phase, id);
    });
  });
}

function handleDragStart(e) {
  draggedRuleElement = e.target.closest('.rule-item');
  draggedRuleElement.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  if (draggedRuleElement) {
    draggedRuleElement.classList.remove('dragging');
  }
  document.querySelectorAll('.rule-item').forEach(el => {
    el.classList.remove('drag-over');
  });
  draggedRuleElement = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.target.closest('.rule-item').classList.add('drag-over');
}

function handleDragLeave(e) {
  e.target.closest('.rule-item').classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  const targetElement = e.target.closest('.rule-item');

  if (draggedRuleElement && targetElement && draggedRuleElement !== targetElement) {
    const phase = phaseFromListId(targetElement.parentElement.id);
    const listEl = targetElement.parentElement;
    const rules = getRulesFromList(phase);
    const draggedIndex = Array.from(listEl.children).indexOf(draggedRuleElement);
    const targetIndex = Array.from(listEl.children).indexOf(targetElement);

    const [movedRule] = rules.splice(draggedIndex, 1);
    rules.splice(targetIndex, 0, movedRule);

    renderReplacementList(phase, rules);
    saveReplacementsSettings();
  }
}

function phaseFromListId(listId) {
  return listId.replace('-replacements-list', '');
}

function getRulesFromList(phase) {
  const listEl = document.getElementById(`${phase}-replacements-list`);
  if (!listEl) return [];

  const rules = [];
  listEl.querySelectorAll('.rule-item').forEach(el => {
    const id = el.dataset.ruleId;
    const enabled = !el.classList.contains('disabled');
    const scopeEl = el.querySelector('.rule-scope');
    const scopeText = scopeEl ? scopeEl.textContent.replace(/[()]/g, '').trim() : 'All';
    const scope = {
      'All': 'all',
      'Page': 'page',
      'Selection': 'selection',
      'Link': 'link'
    }[scopeText] || 'all';

    const patternEl = el.querySelector('.rule-pattern');
    const replacementEl = el.querySelector('.rule-replacement');
    const patternText = patternEl ? patternEl.textContent : '';
    const replacementText = replacementEl ? replacementEl.textContent : '';

    let pattern = patternText;
    let useRegex = false;

    if (patternText.startsWith('/') && patternText.endsWith('/')) {
      useRegex = true;
      pattern = patternText.slice(1, -1);
    } else if (patternText.startsWith('"') && patternText.endsWith('"')) {
      pattern = patternText.slice(1, -1);
    }

    rules.push({
      id,
      enabled,
      scope,
      useRegex,
      pattern,
      replacement: replacementText
    });
  });

  return rules;
}

function openRuleModal(phase, ruleId = null) {
  const modal = document.getElementById('rule-modal');
  const titleEl = document.getElementById('modal-title');
  const idInput = document.getElementById('edit-rule-id');
  const phaseInput = document.getElementById('edit-rule-phase');
  const enabledInput = document.getElementById('rule-enabled');
  const scopeInput = document.getElementById('rule-scope');
  const useRegexInput = document.getElementById('rule-use-regex');
  const patternInput = document.getElementById('rule-pattern');
  const replacementInput = document.getElementById('rule-replacement');

  let rule = null;
  if (ruleId) {
    const rules = getRulesFromList(phase);
    rule = rules.find(r => r.id === ruleId);
  }

  titleEl.textContent = ruleId ? 'Edit Replacement Rule' : 'Add Replacement Rule';
  idInput.value = ruleId || '';
  phaseInput.value = phase;
  enabledInput.checked = rule ? rule.enabled : true;
  scopeInput.value = rule ? rule.scope : 'all';
  useRegexInput.checked = rule ? rule.useRegex : false;
  patternInput.value = rule ? rule.pattern : '';
  replacementInput.value = rule ? rule.replacement : '';

  modal.classList.add('show');
}

function closeRuleModal() {
  const modal = document.getElementById('rule-modal');
  modal.classList.remove('show');
}

function saveRule() {
  const idInput = document.getElementById('edit-rule-id');
  const phaseInput = document.getElementById('edit-rule-phase');
  const enabledInput = document.getElementById('rule-enabled');
  const scopeInput = document.getElementById('rule-scope');
  const useRegexInput = document.getElementById('rule-use-regex');
  const patternInput = document.getElementById('rule-pattern');
  const replacementInput = document.getElementById('rule-replacement');

  const phase = phaseInput.value;
  const ruleId = idInput.value || generateId();
  const pattern = patternInput.value;
  const replacement = replacementInput.value;

  if (!pattern) {
    alert('Pattern is required');
    return;
  }

  const listEl = document.getElementById(`${phase}-replacements-list`);
  let rules = getRulesFromList(phase);

  const existingIndex = rules.findIndex(r => r.id === ruleId);
  const newRule = {
    id: ruleId,
    enabled: enabledInput.checked,
    scope: scopeInput.value,
    useRegex: useRegexInput.checked,
    pattern,
    replacement
  };

  if (existingIndex >= 0) {
    rules[existingIndex] = newRule;
  } else {
    rules.push(newRule);
  }

  renderReplacementList(phase, rules);
  saveReplacementsSettings();
  closeRuleModal();
}

function deleteRule(phase, ruleId) {
  if (!confirm('Delete this rule?')) return;

  const rules = getRulesFromList(phase);
  const filtered = rules.filter(r => r.id !== ruleId);
  renderReplacementList(phase, filtered);
  saveReplacementsSettings();
}

async function exportReplacements() {
  try {
    const settings = await getSettings();

    const includeSettings = confirm('Include settings in export?');
    const includeReplacements = confirm('Include text replacements in export?');

    if (!includeSettings && !includeReplacements) {
      return;
    }

    const exportData = {};

    if (includeSettings) {
      exportData.settings = {};
      SETTING_IDS.forEach(id => {
        exportData.settings[id] = settings[id];
      });
    }

    if (includeReplacements) {
      exportData.textReplacements = settings.textReplacements;
    }

    exportData.version = 1;
    exportData.exportDate = new Date().toISOString();

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'copy-as-markdown-export.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export replacements:', error);
    alert('Export failed: ' + error.message);
  }
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const importData = JSON.parse(event.target.result);

      const shouldMerge = confirm(
        'Import file loaded.\n\nClick OK to merge with existing rules.\nClick Cancel to replace all existing rules.'
      );

      const settings = await getSettings();

      if (!settings.textReplacements) {
        settings.textReplacements = {
          pre: { enabled: true, rules: [] },
          post: { enabled: true, rules: [] }
        };
      }

      if (importData.settings && confirm('Import settings as well?')) {
        SETTING_IDS.forEach(id => {
          if (importData.settings[id] !== undefined) {
            settings[id] = importData.settings[id];
          }
        });
      }

      if (importData.textReplacements) {
        if (shouldMerge) {
          if (importData.textReplacements.pre) {
            settings.textReplacements.pre.rules = [
              ...settings.textReplacements.pre.rules,
              ...importData.textReplacements.pre.rules
            ];
          }
          if (importData.textReplacements.post) {
            settings.textReplacements.post.rules = [
              ...settings.textReplacements.post.rules,
              ...importData.textReplacements.post.rules
            ];
          }
        } else {
          settings.textReplacements = importData.textReplacements;
        }
      }

      await saveSettingsToStorage(settings);
      await loadSettings();
      await loadReplacementsSettings();

      alert('Import successful!');
    } catch (error) {
      console.error('Failed to import:', error);
      alert('Import failed: ' + error.message);
    }

    e.target.value = '';
  };
  reader.readAsText(file);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
