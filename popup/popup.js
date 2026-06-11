const DEFAULTS = {
  enabled: true,
  startTime: "22:00",
  endTime: "08:00",
  showMessage: true,
};

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

function updateStatus(settings) {
  const status = document.getElementById("status");
  const active = settings.enabled && isWithinBlockedWindow(new Date(), settings.startTime, settings.endTime);

  status.textContent = active
    ? `Active now: videos hidden (${settings.startTime}–${settings.endTime})`
    : `Inactive now: videos visible`;

  status.className = `status ${active ? "active" : "inactive"}`;
}

function loadSettings() {
  browser.storage.sync.get(DEFAULTS, (settings) => {
    document.getElementById("enabled").checked = settings.enabled;
    document.getElementById("startTime").value = settings.startTime;
    document.getElementById("endTime").value = settings.endTime;
    document.getElementById("showMessage").checked = settings.showMessage;
    updateStatus(settings);
  });
}

document.getElementById("save").addEventListener("click", () => {
  const settings = {
    enabled: document.getElementById("enabled").checked,
    startTime: document.getElementById("startTime").value,
    endTime: document.getElementById("endTime").value,
    showMessage: document.getElementById("showMessage").checked,
  };

  browser.storage.sync.set(settings, () => {
    updateStatus(settings);
  });
});

document.getElementById("openOptions").addEventListener("click", (event) => {
  event.preventDefault();
  browser.runtime.openOptionsPage();
});

loadSettings();
