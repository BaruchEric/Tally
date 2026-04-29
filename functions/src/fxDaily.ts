import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const fxDaily = onSchedule("every day 05:00", async () => {
  const baseUrl = process.env.FX_BASE_URL ?? "https://api.exchangerate.host";
  const displayCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"];
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(`${baseUrl}/latest?base=USD&symbols=${displayCurrencies.join(",")}`);

  if (!response.ok) {
    logger.error("FX fetch failed.", { status: response.status, body: await response.text() });
    return;
  }

  const payload = (await response.json()) as { rates?: Record<string, number>; date?: string };
  await getFirestore()
    .doc(`fx/${payload.date ?? today}`)
    .set(
      {
        base: "USD",
        rates: payload.rates ?? {},
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
});
