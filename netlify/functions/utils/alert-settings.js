// netlify/functions/utils/alert-settings.js
// Reads the Alert Mode from the Settings table in Airtable.
// One row per client — for now there's just one row (Client = "Steadfast (Ryan)").
// When this becomes multi-client, pass a different clientName to look up
// that client's row instead of hardcoding it.

async function getAlertMode(clientName = "Steadfast (Ryan)") {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const SETTINGS_TABLE = "Settings";

  try {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SETTINGS_TABLE)}`);
    url.searchParams.set("filterByFormula", `{Client} = "${clientName}"`);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    const data = await response.json();

    if (!response.ok || !data.records || data.records.length === 0) {
      // If the Settings table/row isn't set up yet, default to sending everything
      // rather than silently going dark.
      return "All Leads";
    }

    return data.records[0].fields["Alert Mode"] || "All Leads";
  } catch (err) {
    return "All Leads";
  }
}

// Given the current alert mode and whether a lead is urgent, decide if an
// email should go out.
function shouldSendAlert(alertMode, isUrgent) {
  if (alertMode === "Off") return false;
  if (alertMode === "Emergency Only") return !!isUrgent;
  return true; // "All Leads" or unrecognized value defaults to sending
}

module.exports = { getAlertMode, shouldSendAlert };
