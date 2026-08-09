// netlify/functions/update-settings.js
// Updates the Alert Mode in the Settings table.
// Expects: { "recordId": "recXXXX" (or null), "alertMode": "All Leads" | "Emergency Only" | "Off" }
// If recordId is null (Settings table has no row yet), creates one.

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const SETTINGS_TABLE = "Settings";
  const CLIENT_NAME = "Steadfast (Ryan)";

  try {
    const body = JSON.parse(event.body);
    const { recordId, alertMode } = body;

    if (!alertMode) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing alertMode" }) };
    }

    let response, data;

    if (recordId) {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SETTINGS_TABLE)}/${recordId}`;
      response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: { "Alert Mode": alertMode } }),
      });
    } else {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SETTINGS_TABLE)}`;
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: { "Client": CLIENT_NAME, "Alert Mode": alertMode } }),
      });
    }

    data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: "Airtable error", details: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, record: data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", details: err.message }) };
  }
};
