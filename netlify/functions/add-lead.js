// netlify/functions/add-lead.js
// Adds a manually-entered lead (phone/in-person) to Airtable, same base/table
// used by submit-lead.js and get-leads.js.
//
// Expects a POST body like:
// {
//   "name": "Colin Pearson",
//   "business": "Mid Ohio",     // business or address
//   "phone": "3301234567",
//   "message": "Needs a quote for..."
// }

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = "Table 1"; // same table get-leads.js and update-lead.js use

  try {
    const body = JSON.parse(event.body);
    const { name, business, phone, message } = body;

    if (!name) {
      return { statusCode: 400, body: JSON.stringify({ error: "Name is required" }) };
    }

    const today = new Date().toISOString().split("T")[0];

    const fields = {
      "Name": name,
      "Business": business || "",
      "Phone": phone || "",
      "Message": message || "",
      "Status": "New Lead",
      "Date Submitted": today,
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
