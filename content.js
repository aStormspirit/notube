const DEFAULTS = {
  enabled: true,
  startTime: "22:00",
  endTime: "08:00",
  showMessage: true,
};

const VIDEO_SELECTORS = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-reel-item-renderer",
  "ytd-shorts-lockup-view-model-v2",
  "ytm-rich-item-renderer",
  "ytm-video-with-context-renderer",
];

const FEED_SELECTORS = [
  "ytd-rich-grid-renderer",
  "ytd-browse[page-subtype='home'] #contents",
  "ytd-section-list-renderer",
];

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function isWithinBlockedWindow(now, startTime, endTime) {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  if (start === end) {
    return true;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

function isHomePage() {
  const path = window.location.pathname;
  return path === "/" || path === "" || path === "/feed/what_to_watch";
}

function getSettings() {
  return new Promise((resolve) => {
    browser.storage.sync.get(DEFAULTS, (items) => resolve(items));
  });
}

function hideVideos() {
  document.documentElement.classList.add("yt-home-blocker-active");

  for (const selector of VIDEO_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      node.classList.add("yt-home-blocker-hidden");
    });
  }
}

function showVideos() {
  document.documentElement.classList.remove("yt-home-blocker-active");

  document.querySelectorAll(".yt-home-blocker-hidden").forEach((node) => {
    node.classList.remove("yt-home-blocker-hidden");
  });
}

function ensureMessage(settings) {
  if (!settings.showMessage) {
    document.getElementById("yt-home-blocker-message")?.remove();
    return;
  }

  let message = document.getElementById("yt-home-blocker-message");
  if (message) {
    return;
  }

  message = document.createElement("div");
  message.id = "yt-home-blocker-message";
  message.textContent = `Videos hidden from ${settings.startTime} to ${settings.endTime}`;
  document.documentElement.appendChild(message);
}

function removeMessage() {
  document.getElementById("yt-home-blocker-message")?.remove();
}

async function applyBlocking() {
  if (!isHomePage()) {
    showVideos();
    removeMessage();
    return;
  }

  const settings = await getSettings();

  if (!settings.enabled) {
    showVideos();
    removeMessage();
    return;
  }

  const shouldBlock = isWithinBlockedWindow(new Date(), settings.startTime, settings.endTime);

  if (shouldBlock) {
    hideVideos();
    ensureMessage(settings);
  } else {
    showVideos();
    removeMessage();
  }
}

function startObserver() {
  const observer = new MutationObserver(() => {
    applyBlocking();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function scheduleUpdates() {
  applyBlocking();
  setInterval(applyBlocking, 30_000);
}

browser.storage.onChanged.addListener(() => {
  applyBlocking();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    scheduleUpdates();
    startObserver();
  });
} else {
  scheduleUpdates();
  startObserver();
}
