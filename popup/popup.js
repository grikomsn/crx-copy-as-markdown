const DEFAULT_SETTINGS = {
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  linkStyle: 'inlined',
  imageHandling: 'keep',
  includePageTitle: true,
  includeSourceUrl: true
};

const SETTING_IDS = [
  'headingStyle',
  'bulletListMarker',
  'codeBlockStyle',
  'linkStyle',
  'imageHandling',
  'includePageTitle',
  'includeSourceUrl'
];

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // Add change listeners to all form fields
  SETTING_IDS.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', saveSettings);
    }
  });
});

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('settings');
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };
    
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
    
    await chrome.storage.sync.set({ settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}
