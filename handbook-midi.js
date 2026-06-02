/**
 * Shared Web MIDI for Music Theory Handbook modules.
 * Enable once; state persists for the browser tab via sessionStorage.
 */
(function () {
  const STORAGE_KEY = "mth-midi-enabled";

  let access = null;
  const listeners = new Set();
  const uiPairs = [];

  function isEnabled() {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  }

  function dispatch(event) {
    listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error(err);
      }
    });
  }

  function bindInputs() {
    if (!access) return;
    [...access.inputs.values()].forEach((input) => {
      input.onmidimessage = dispatch;
    });
  }

  function refreshAllUi() {
    const inputs = access ? [...access.inputs.values()] : [];
    uiPairs.forEach(({ btn, statusEl }) => {
      if (!btn || !statusEl) return;
      if (!isEnabled() || !access) {
        btn.textContent = "Enable MIDI";
        btn.disabled = false;
        statusEl.textContent = "MIDI: off";
        return;
      }
      btn.textContent = "MIDI Enabled";
      btn.disabled = true;
      statusEl.textContent = inputs.length
        ? `MIDI: connected (${inputs.length} input${inputs.length > 1 ? "s" : ""})`
        : "MIDI: enabled, no keyboard found";
    });
  }

  async function enable() {
    if (!("requestMIDIAccess" in navigator)) {
      uiPairs.forEach(({ statusEl }) => {
        if (statusEl) statusEl.textContent = "MIDI: not supported in this browser";
      });
      return false;
    }
    try {
      access = await navigator.requestMIDIAccess();
      sessionStorage.setItem(STORAGE_KEY, "1");
      bindInputs();
      access.onstatechange = () => {
        bindInputs();
        refreshAllUi();
      };
      refreshAllUi();
      return true;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      uiPairs.forEach(({ statusEl }) => {
        if (statusEl) statusEl.textContent = "MIDI: permission denied";
      });
      return false;
    }
  }

  function initUi(btn, statusEl) {
    if (!btn || !statusEl) return;
    if (!uiPairs.some((p) => p.btn === btn)) {
      uiPairs.push({ btn, statusEl });
      btn.addEventListener("click", () => {
        if (!isEnabled()) enable();
      });
    }
    refreshAllUi();
    if (isEnabled() && !access) enable();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  window.HandbookMidi = {
    initUi,
    subscribe,
    enable,
    isEnabled,
    refreshAllUi
  };
})();
