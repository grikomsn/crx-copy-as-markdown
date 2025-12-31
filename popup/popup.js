import { SETTING_IDS, getSettings, saveSettings as saveSettingsToStorage } from '../src/settings.js';

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  updatePickerButtonState();
  loadCurrentShortcut();

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

    let isActive;
    if (forceState !== null) {
      isActive = forceState;
    } else {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectModeState' });
      isActive = response?.success && response.isActive;
    }

    const pickerButton = document.getElementById('toggle-picker');
    if (pickerButton) {
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
