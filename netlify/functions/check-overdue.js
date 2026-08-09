// netlify/functions/check-overdue.js
// Runs automatically once a day (see schedule config at bottom of this file).
// Checks all leads in "New Lead" or "Contacted" status; if a lead has been
// sitting for more than OVERDUE_DAYS and hasn't already been alerted on,
// sends one email and marks it as alerted (via "Overdue Alert Sent" checkbox)
// so you don't get repeat emails for the same lead every day.

const { sendAlertEmail } = require("./utils/send-email");

const OVERDUE_STATUSES = ["New Lead", "Contacted"];
const OVERDUE_DAYS = 3;

exports.handler = async function (event, context) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = "Table 1";

  try {
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

      if (!OVERDUE_STATUSES.includes(status) || alreadyAlerted || !refDate) continue;

      const days = (Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24);
      if (days <= OVERDUE_DAYS) continue;

      overdueNewlyFlagged.push({ id: record.id, name: f["Name"] || "Unnamed lead", business: f["Business"] || "", status, days: Math.floor(days) });
    }

    if (overdueNewlyFlagged.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: "No newly overdue leads." }) };
    }

    // One email listing all newly-overdue leads, rather than one email per lead.
    const listHtml = overdueNewlyFlagged
      .map(l => `<li><strong>${l.name}</strong> (${l.business || "no business listed"}) — ${l.status}, ${l.days} days without contact</li>`)
      .join("");

    await sendAlertEmail({
      subject: `${overdueNewlyFlagged.length} lead${overdueNewlyFlagged.length > 1 ? "s" : ""} need${overdueNewlyFlagged.length > 1 ? "" : "s"} follow-up`,
      html: `<h2>Overdue leads</h2><ul>${listHtml}</ul>`,
    });

    // Mark each as alerted so tomorrow's run doesn't re-send for the same lead.
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

// Netlify Scheduled Functions: this runs once a day at 8am UTC.
// Adjust the cron expression if you want a different time.
exports.config = {
  schedule: "0 8 * * *",
};
