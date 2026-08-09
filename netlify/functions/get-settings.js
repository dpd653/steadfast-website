// netlify/functions/get-settings.js
// Returns the current Alert Mode so the dashboard can display/edit it.

exports.handler = async function (event, context) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const SETTINGS_TABLE = "Settings";
  const CLIENT_NAME = "Steadfast (Ryan)";

  try {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SETTINGS_TABLE)}`);
    url.searchParams.set("filterByFormula", `{Client} = "${CLIENT_NAME}"`);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: "Airtable error", details: data }) };
    }

    if (!data.records || data.records.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ alertMode: "All Leads", recordId: null }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        alertMode: data.records[0].fields["Alert Mode"] || "All Leads",
        recordId: data.records[0].id,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", details: err.message }) };
  }
};
