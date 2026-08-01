// netlify/functions/get-leads.js
// Fetches all lead records from Airtable and returns them shaped for the dashboard.

exports.handler = async function (event, context) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = "Table 1"; // this is your table's actual name inside the Steadfast Leads base

  try {
    let allRecords = [];
    let offset = null;

    // Airtable paginates 100 records at a time — loop until there's no more offset
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

    // Shape Airtable records into what the dashboard expects
    const leads = allRecords.map((record) => {
      const f = record.fields;

      // Notes are stored as one long-text field, formatted like:
      // 2026-07-20: Some note text
      // 2026-07-11: Another note text
      // Parse each line into a { date, text } object, newest first (top of field).
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
        id: record.id, // Airtable record ID, e.g. "recXXXXXXXX"
        name: f["Name"] || "",
        business: f["Business"] || "",
        phone: f["Phone"] || f["Email"] || "",
        message: f["Message"] || "",
        status: f["Status"] || "New Lead",
        value: f["Value"] || "TBD",
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
