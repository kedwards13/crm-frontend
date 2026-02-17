import { Device } from "@twilio/voice-sdk";

let device = null;
let lastIncoming = null;
let activeConnection = null;

export async function initVoiceDevice(clientToken, { iceServers } = {}) {
  if (device) return device;
  if (!clientToken) {
    throw new Error("Missing voice device token");
  }

  device = new Device(clientToken, {
    codecPreferences: ["opus", "pcmu"],
    iceServers: Array.isArray(iceServers) && iceServers.length ? iceServers : undefined,
    logLevel: "error",
  });

  await device.register();
  try {
    window.dispatchEvent(new Event("voice-device-registered"));
  } catch {
    // best-effort; safe to ignore
  }
  return device;
}

export function getVoiceDevice() {
  return device;
}

export function destroyVoiceDevice() {
  if (device) {
    device.destroy();
    device = null;
    lastIncoming = null;
    activeConnection = null;
  }
}

export function setLastIncoming(call) {
  lastIncoming = call || null;
}

export function getLastIncoming() {
  return lastIncoming;
}

export function setActiveConnection(connection) {
  activeConnection = connection || null;
}

export function getActiveConnection() {
  return activeConnection;
}
