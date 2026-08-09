// netlify/functions/utils/emergency-keywords.js
// Simple keyword scan used as a backup to the manual "Urgent" checkbox.
// Not perfect — just catches the obvious cases so nothing urgent slips
// through silently when a contractor forgets to check the box.

const EMERGENCY_KEYWORDS = [
  "no heat", "no power", "no electric", "no electricity", "power out", "power outage",
  "no water", "no hot water",
  "flooding", "flooded", "flood", "burst pipe", "pipe burst", "leaking",
  "water leak", "leak", "water line", "line break", "broken pipe", "pipe broke",
  "furnace out", "furnace went out", "furnace not working", "furnace broken",
  "gas leak", "smell gas", "smells like gas", "sparking", "sparks", "smoke", "fire",
  "emergency", "urgent", "asap", "right away", "can't wait", "immediately",
  "sewage", "sewage backup", "sewage back up", "backed up", "overflow", "overflowing",
  "storm damage", "tree damage", "tree fell", "tree down", "fallen tree",
  "roof damage", "roof leak", "water damage", "ceiling collapse",
];

function messageContainsEmergencyKeyword(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

module.exports = { messageContainsEmergencyKeyword };
