// netlify/functions/get-leads.js
// Fetches all lead records from Airtable and returns them shaped for the dashboard.

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
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          statusCode: response.status,
          body: JSON.stringify({ error: "Airtable error", details: data }),
        };
      }

      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    const leads = allRecords.map((record) => {
      const f = record.fields;

      const notesRaw = f["Notes"] || "";
      const notes = notesRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
          if (match) {
            return { date: match[1], text: match[2] };
          }
          return { date: "", text: line };
        });

      return {
        id: record.id,
        name: f["Name"] || "",
        business: f["Business"] || "",
        phone: f["Phone"] || f["Email"] || "",
        message: f["Message"] || "",
        status: f["Status"] || "New Lead",
        value: f["Value"] || "TBD",
        invoiceAmount: f["Invoice Amount"] || null,
        urgent: f["Urgent"] === true,
        lastContact: f["Last Contact"] || f["Date Submitted"] || "",
        notes: notes,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ leads }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: err.message }),
    };
  }
};
