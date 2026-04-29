import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

export const sendInviteEmail = onDocumentCreated("invites/{inviteId}", async (event) => {
  const invite = event.data?.data();
  if (!invite) {
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL ?? "Tally <invites@example.com>";
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invites/${event.params.inviteId}`;

  if (!apiKey) {
    logger.info("Invite email skipped; RESEND_API_KEY is not configured.", {
      to: invite.email,
      inviteUrl
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: invite.email,
      subject: "You were invited to a Tally ledger",
      html: `<p>You were invited to join a Tally ledger.</p><p><a href="${inviteUrl}">Accept invite</a></p>`
    })
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Invite email failed.", { status: response.status, body });
  }
});
