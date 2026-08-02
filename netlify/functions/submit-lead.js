// This function receives form submissions from your website
// and saves them as new records in your Airtable "Steadfast Leads" base.

exports.handler = async function (event) {
  // Only allow POST requests (form submissions)
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = "Table 1"; // change if you renamed your table

    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            Name: data.name || "",
            Business: data.business || "",
            Phone: data.phone || "",
            Email: data.email || "",
            Message: data.message || "",
            Status: "New Lead",
            "Date Submitted": new Date().toISOString().split("T")[0],
          },
        }),
      }
    );

    if (!airtableResponse.ok) {
      const errText = await airtableResponse.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Airtable error", details: errText }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
