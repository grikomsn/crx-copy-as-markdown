// Chrome extension service worker for context menus and notifications

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyPageAsMarkdown",
    title: "Copy Page as Markdown",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "copySelectionAsMarkdown",
    title: "Copy Selection as Markdown",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "copyLinkAsMarkdown",
    title: "Copy Link as Markdown",
    contexts: ["link"],
  });

  chrome.contextMenus.create({
    id: "toggleElementPicker",
    title: "Toggle Element Picker",
    contexts: ["page", "frame", "image"],
  });
});

// Handle commands (keybinds)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-element-picker') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleSelectMode' });
      }
    });
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab?.id) {
      showNotification(false, "No active tab found");
      return;
    }

    // Check if we can inject into this tab (can't inject into chrome:// pages)
    if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
      showNotification(false, "Cannot run on this page");
      return;
    }

    let message;
    let shouldNotify = true;

    switch (info.menuItemId) {
      case "copyPageAsMarkdown":
        message = { action: "copyPage" };
        break;

      case "copySelectionAsMarkdown":
        message = { action: "copySelection" };
        break;

      case "copyLinkAsMarkdown":
        message = {
          action: "copyLink",
          data: {
            linkUrl: info.linkUrl,
            linkText: info.selectionText,
          },
        };
        break;

      case "toggleElementPicker":
        message = { action: "toggleSelectMode" };
        shouldNotify = false;
        break;

      default:
        return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, message);

    if (shouldNotify && response?.success) {
      showNotification(true);
    } else if (shouldNotify && !response?.success) {
      showNotification(false, response?.error || "Unknown error");
    }
  } catch (error) {
    // Handle case where content script isn't loaded
    if (error.message?.includes("Receiving end does not exist")) {
      if (info.menuItemId !== "toggleElementPicker") {
        showNotification(false, "Please refresh the page and try again");
      }
    } else if (info.menuItemId !== "toggleElementPicker") {
      showNotification(false, error.message || "Failed to copy");
    }
  }
});

function showNotification(success, errorMessage) {
  const notificationId = `copy-markdown-${Date.now()}`;

  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon48.png"),
    title: "Copy as Markdown",
    message: success ? "Copied to clipboard!" : `Failed to copy: ${errorMessage}`,
  });

  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 2000);
}

// Handle messages from content script (element picker notifications)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'copySuccess') {
    showNotification(true);
  } else if (message.action === 'copyError') {
    showNotification(false, message.error || 'Unknown error');
  }
});
