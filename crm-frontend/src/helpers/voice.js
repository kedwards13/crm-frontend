import { CALL_STATES } from "../constants/callStates";

export function handleCallStatusEvent(event, updateStatus, endCall, activeCallSid) {
  if (!event || !statusIsCanonical(event.status)) return;
  const eventSid = event.call_sid || event.callSid || event.callSID || "";
  if (activeCallSid && eventSid && activeCallSid !== eventSid) return;

  switch (event.status) {
    case CALL_STATES.RINGING:
      updateStatus(CALL_STATES.RINGING);
      break;
    case CALL_STATES.IN_PROGRESS:
      updateStatus(CALL_STATES.IN_PROGRESS);
      break;
    case CALL_STATES.COMPLETED:
      updateStatus(CALL_STATES.COMPLETED);
      endCall();
      break;
    case CALL_STATES.FAILED:
      updateStatus(CALL_STATES.FAILED);
      endCall();
      break;
    default:
      break;
  }
}

export function onIncomingCall(event, setIncomingCall) {
  if (!event || event.type !== "incoming_call") return;
  const callSid = event.call_sid || event.callSid || event.callSID || "";
  setIncomingCall({
    callSid,
    from: event.from_number || event.fromNumber,
    state: CALL_STATES.RINGING,
  });
}

export function isMissedCall(call) {
  if (!call) return false;
  return (
    call.state !== CALL_STATES.IN_PROGRESS &&
    (call.state === CALL_STATES.COMPLETED || call.state === CALL_STATES.FAILED)
  );
}

function statusIsCanonical(status) {
  return Object.values(CALL_STATES).includes(status);
}
