import axios from "axios";

// Dedicated voice client — no CRM interceptors, no shared auth.
const voiceClient = axios.create({
  baseURL: "https://voice.abon.ai",
  withCredentials: false,
});

// Explicit registration call — token passed directly with tenant scoping.
export const registerWithVoiceService = (clientToken, tenantId) => {
  if (!clientToken || !tenantId) {
    throw new Error("Missing voice client token or tenant id");
  }

  return voiceClient.post(
    "/voice/webrtc/register",
    {},
    {
      headers: {
        Authorization: `Bearer ${clientToken}`,
        "X-Tenant-ID": String(tenantId),
        "Content-Type": "application/json",
      },
    }
  );
};

export default voiceClient;
