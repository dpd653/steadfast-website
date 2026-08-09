// netlify/functions/update-lead.js
// Writes status changes, notes, invoice amount, and urgent flag back to an
// existing Airtable lead record.
//
// Expects a POST body like:
// {
//   "id": "recXXXXXXXX",
//   "status": "Contacted",
//   "notes": "2026-07-25: text\n2026-07-20: text",
//   "lastContact": "2026-07-25",
//   "invoiceAmount": 450,
//   "urgent": true
// }

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = "Table 1";

  try {
    const body = JSON.parse(event.body);
    const { id, status, notes, lastContact, invoiceAmount, urgent } = body;

    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing lead id" }) };
    }

    const fields = {};
    if (status !== undefined) fields["Status"] = status;
    if (notes !== undefined) fields["Notes"] = notes;
    if (lastContact !== undefined) fields["Last Contact"] = lastContact;
    if (invoiceAmount !== undefined) fields["Invoice Amount"] = invoiceAmount;
    if (urgent !== undefined) fields["Urgent"] = urgent;

    // Any of these actions count as "you did something about this lead" —
    // reset the overdue-alert flag so it can fire again if it goes stale later.
    if (status !== undefined || notes !== undefined || lastContact !== undefined) {
      fields["Overdue Alert Sent"] = false;
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${id}`;

    const response = await fetch(url, {
      method: "PATCH",
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
