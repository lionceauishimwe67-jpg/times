// In-memory state shared between web app and ESP32 polling endpoints.
// (Replaces the original .flag files in api/.)
export const state = {
  manualRing: false,        // set true by dashboard, ESP32 reads & clears
  esp32LastSeen: 0,         // unix seconds; updated by /api/update_status
};
