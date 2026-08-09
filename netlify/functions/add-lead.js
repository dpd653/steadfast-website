// netlify/functions/add-lead.js
// Adds a manually-entered lead (phone/in-person) to Airtable, same base/table
// used by submit-lead.js and get-leads.js. Also sends a new-lead email alert
// (respecting the current Alert Mode setting).
//
// Expects a POST body like:
// {
//   "name": "Colin Pearson",
//   "business": "Mid Ohio",
//   "phone": "3301234567",
//   "message": "Needs a quote for...",
//   "urgent": false
// }

const { sendAlertEmail } = require("./utils/send-email");
const { messageContainsEmergencyKeyword } = require("./utils/emergency-keywords");
const { getAlertMode, shouldSendAlert } = require("./utils/alert-settings");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = "Table 1";

  try {
    const body = JSON.parse(event.body);
    const { name, business, phone, message, urgent } = body;

    if (!name) {
      return { statusCode: 400, body: JSON.stringify({ error: "Name is required" }) };
    }

    // Urgent if manually checked OR the message contains an emergency keyword.
    const isUrgent = !!urgent || messageContainsEmergencyKeyword(message);

    const today = new Date().toISOString().split("T")[0];

    const fields = {
      "Name": name,
      "Business": business || "",
      "Phone": phone || "",
      "Message": message || "",
      "Status": "New Lead",
      "Date Submitted": today,
      "Urgent": isUrgent,
    };

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Airtable error", details: data }),
      };
    }

    try {
      const alertMode = await getAlertMode();
      if (shouldSendAlert(alertMode, isUrgent)) {
        await sendAlertEmail({
          subject: `${isUrgent ? "🚨 URGENT Lead" : "New Lead"}: ${name}`,
          html: `
            <h2>${isUrgent ? "Urgent lead" : "New lead"} added manually</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Business/Address:</strong> ${business || "—"}</p>
            <p><strong>Phone:</strong> ${phone || "—"}</p>
            <p><strong>What they need:</strong> ${message || "—"}</p>
          `,
        });
      }
    } catch (emailErr) {
      console.log("Email alert failed:", emailErr.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, record: data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: err.message }),
    };
  }
};
