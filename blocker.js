const DEFAULTS = {
  enabled: true,
  startTime: "22:00",
  endTime: "08:00",
  showMessage: true,
};

const FLAG_KEY = "yt-home-blocker";

let cachedSettings = { ...DEFAULTS };
let settingsLoaded = false;
let wasBlocking = false;

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

function setSessionFlag(active) {
  try {
    if (active) {
      sessionStorage.setItem(FLAG_KEY, "1");
    } else {
      sessionStorage.removeItem(FLAG_KEY);
    }
  } catch {
    /* ignore */
  }
}

function loadSettings() {
  return new Promise((resolve) => {
    browser.storage.sync.get(DEFAULTS, (items) => {
      cachedSettings = items;
      settingsLoaded = true;
      resolve(items);
    });
  });
}

function setBlockingActive(active) {
  document.documentElement.classList.toggle("yt-home-blocker-active", active);
  setSessionFlag(active && isHomePage());
}

function ensureMessage(settings) {
  if (!settings.showMessage) {
    removeMessage();
    return;
  }

  let message = document.getElementById("yt-home-blocker-message");
  const text = `Videos hidden from ${settings.startTime} to ${settings.endTime}`;

  if (!message) {
    message = document.createElement("div");
    message.id = "yt-home-blocker-message";
    document.documentElement.appendChild(message);
  }

  message.textContent = text;
}

function removeMessage() {
  document.getElementById("yt-home-blocker-message")?.remove();
}

function clearHomeFeedDom() {
  const grids = document.querySelectorAll(
    "ytd-browse[page-subtype='home'] ytd-rich-grid-renderer #contents"
  );

  for (const grid of grids) {
    grid.replaceChildren();
  }

  document
    .querySelectorAll("ytd-browse[page-subtype='home'] ytd-continuation-item-renderer")
    .forEach((node) => node.remove());
}

function shouldBlockNow() {
  return (
    isHomePage() &&
    cachedSettings.enabled &&
    isWithinBlockedWindow(new Date(), cachedSettings.startTime, cachedSettings.endTime)
  );
}

function applyBlocking() {
  // Message/class must never linger on search, watch, etc. — even before settings load
  if (!isHomePage()) {
    setBlockingActive(false);
    removeMessage();
    wasBlocking = false;
    return;
  }

  if (!settingsLoaded) {
    return;
  }

  if (!cachedSettings.enabled) {
    setBlockingActive(false);
    removeMessage();
    wasBlocking = false;
    return;
  }

  const shouldBlock = shouldBlockNow();
  setBlockingActive(shouldBlock);

  if (shouldBlock) {
    clearHomeFeedDom();
    ensureMessage(cachedSettings);
  } else {
    removeMessage();
    // Feed was short-circuited while blocked — reload once to restore it
    if (wasBlocking) {
      wasBlocking = false;
      setSessionFlag(false);
      location.reload();
      return;
    }
  }

  wasBlocking = shouldBlock;
}

// Apply last-known flag immediately at document_start (before DOM / network hydrate)
try {
  if (sessionStorage.getItem(FLAG_KEY) === "1" && isHomePage()) {
    document.documentElement.classList.add("yt-home-blocker-active");
    wasBlocking = true;
  }
} catch {
  /* ignore */
}

async function init() {
  document.querySelectorAll(".yt-home-blocker-hidden").forEach((node) => {
    node.classList.remove("yt-home-blocker-hidden");
  });

  await loadSettings();
  applyBlocking();
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") {
    return;
  }

  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in cachedSettings) {
      cachedSettings[key] = newValue;
    }
  }

  applyBlocking();
});

let lastPathname = location.pathname;

function onNavigation() {
  if (location.pathname === lastPathname) {
    applyBlocking();
    return;
  }
  lastPathname = location.pathname;
  applyBlocking();
}

window.addEventListener("yt-home-blocker-nav", onNavigation);
window.addEventListener("yt-navigate-start", onNavigation);
window.addEventListener("yt-navigate-finish", onNavigation);
window.addEventListener("yt-page-data-updated", onNavigation);
window.addEventListener("popstate", onNavigation);

// Path poll as a safety net for SPA transitions
setInterval(() => {
  if (location.pathname !== lastPathname) {
    lastPathname = location.pathname;
    applyBlocking();
  }
}, 500);

setInterval(applyBlocking, 30_000);

init();
