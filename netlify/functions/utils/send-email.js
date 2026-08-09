// netlify/functions/utils/send-email.js
// Small shared helper so every function sends alert emails the same way.
// Requires RESEND_API_KEY and ALERT_EMAIL_TO to be set as Netlify environment variables.

async function sendAlertEmail({ subject, html }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO;
  // Until a custom domain is verified in Resend, sends must come from this address.
  const FROM_ADDRESS = process.env.ALERT_EMAIL_FROM || "Steadfast Alerts <onboarding@resend.dev>";

  if (!RESEND_API_KEY || !ALERT_EMAIL_TO) {
    console.log("Email alert skipped: RESEND_API_KEY or ALERT_EMAIL_TO not set.");
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [ALERT_EMAIL_TO],
      subject,
      html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.log("Resend error:", JSON.stringify(data));
    return { error: data };
  }
  return { success: true, id: data.id };
}

module.exports = { sendAlertEmail };
