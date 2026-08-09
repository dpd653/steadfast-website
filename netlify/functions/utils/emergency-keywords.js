// netlify/functions/utils/emergency-keywords.js
// Simple keyword scan used as a backup to the manual "Urgent" checkbox.
// Not perfect — just catches the obvious cases so nothing urgent slips
// through silently when a contractor forgets to check the box.

const EMERGENCY_KEYWORDS = [
  "no heat", "no power", "no electricity", "no water", "no hot water",
  "flooding", "flooded", "flood", "burst pipe", "pipe burst", "leaking",
  "gas leak", "smell gas", "sparking", "sparks", "smoke", "fire",
  "emergency", "urgent", "asap", "right away", "can't wait",
  "sewage", "backed up", "overflow", "overflowing",
];

function messageContainsEmergencyKeyword(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

module.exports = { messageContainsEmergencyKeyword };
