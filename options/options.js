const DEFAULTS = {
  enabled: true,
  startTime: "22:00",
  endTime: "08:00",
  showMessage: true,
};

function loadSettings() {
  browser.storage.sync.get(DEFAULTS, (settings) => {
    document.getElementById("enabled").checked = settings.enabled;
    document.getElementById("startTime").value = settings.startTime;
    document.getElementById("endTime").value = settings.endTime;
    document.getElementById("showMessage").checked = settings.showMessage;
  });
}

function showSaved() {
  const saved = document.getElementById("saved");
  saved.hidden = false;
  setTimeout(() => {
    saved.hidden = true;
  }, 2000);
}

document.getElementById("save").addEventListener("click", () => {
  const settings = {
    enabled: document.getElementById("enabled").checked,
    startTime: document.getElementById("startTime").value,
    endTime: document.getElementById("endTime").value,
    showMessage: document.getElementById("showMessage").checked,
  };

  browser.storage.sync.set(settings, showSaved);
});

loadSettings();
