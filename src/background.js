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

      default:
        return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, message);

    if (response?.success) {
      showNotification(true);
    } else {
      showNotification(false, response?.error || "Unknown error");
    }
  } catch (error) {
    // Handle case where content script isn't loaded
    if (error.message?.includes("Receiving end does not exist")) {
      showNotification(false, "Please refresh the page and try again");
    } else {
      showNotification(false, error.message || "Failed to copy");
    }
  }
});

function showNotification(success, errorMessage) {
  const notificationId = `copy-markdown-${Date.now()}`;

  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "Copy as Markdown",
    message: success ? "Copied to clipboard!" : `Failed to copy: ${errorMessage}`,
  });

  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 2000);
}
