// netlify/functions/check-overdue.js
// Runs automatically once a day (see schedule config at bottom of this file).
// Checks all leads in "New Lead" or "Contacted" status; if a lead has been
// sitting for more than OVERDUE_DAYS and hasn't already been alerted on,
// sends one email and marks it as alerted — respecting the current Alert Mode.

const { sendAlertEmail } = require("./utils/send-email");
const { getAlertMode } = require("./utils/alert-settings");

const OVERDUE_STATUSES = ["New Lead", "Contacted"];
const OVERDUE_DAYS = 3;

exports.handler = async function (event, context) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = "Table 1";

  try {
    const alertMode = await getAlertMode();
    if (alertMode === "Off") {
      return { statusCode: 200, body: JSON.stringify({ message: "Alerts are off." }) };
    }

    let allRecords = [];
    let offset = null;

    do {
      const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`);
      if (offset) url.searchParams.set("offset", offset);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });
      const data = await response.json();
      if (!response.ok) {
        return { statusCode: response.status, body: JSON.stringify({ error: "Airtable error", details: data }) };
      }
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    const overdueNewlyFlagged = [];

    for (const record of allRecords) {
      const f = record.fields;
      const status = f["Status"] || "New Lead";
      const alreadyAlerted = f["Overdue Alert Sent"] === true;
      const refDate = f["Last Contact"] || f["Date Submitted"];
      const isUrgent = f["Urgent"] === true;

      if (!OVERDUE_STATUSES.includes(status) || alreadyAlerted || !refDate) continue;
      // In Emergency Only mode, only overdue leads that are also marked urgent count.
      if (alertMode === "Emergency Only" && !isUrgent) continue;

      const days = (Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24);
      if (days <= OVERDUE_DAYS) continue;

      overdueNewlyFlagged.push({ id: record.id, name: f["Name"] || "Unnamed lead", business: f["Business"] || "", status, days: Math.floor(days), urgent: isUrgent });
    }

    if (overdueNewlyFlagged.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: "No newly overdue leads." }) };
    }

    const listHtml = overdueNewlyFlagged
      .map(l => `<li>${l.urgent ? "🚨 " : ""}<strong>${l.name}</strong> (${l.business || "no business listed"}) — ${l.status}, ${l.days} days without contact</li>`)
      .join("");

    await sendAlertEmail({
      subject: `${overdueNewlyFlagged.length} lead${overdueNewlyFlagged.length > 1 ? "s" : ""} need${overdueNewlyFlagged.length > 1 ? "" : "s"} follow-up`,
      html: `<h2>Overdue leads</h2><ul>${listHtml}</ul>`,
    });

    for (const lead of overdueNewlyFlagged) {
      const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${lead.id}`;
      await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: { "Overdue Alert Sent": true } }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, alerted: overdueNewlyFlagged.length }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", details: err.message }) };
  }
};

exports.config = {
  schedule: "0 8 * * *",
};
