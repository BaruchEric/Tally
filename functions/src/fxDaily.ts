import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

const BASE_CURRENCY = "USD";

export const fxDaily = onSchedule("every day 05:00", async () => {
  const baseUrl = process.env.FX_BASE_URL ?? "https://api.exchangerate.host";
  const displayCurrencies = ["EUR", "GBP", "JPY", "CAD", "AUD", "CHF"];
  const today = new Date().toISOString().slice(0, 10);

  try {
    const response = await fetch(`${baseUrl}/latest?base=${BASE_CURRENCY}&symbols=${displayCurrencies.join(",")}`);

    if (!response.ok) {
      logger.error("FX fetch failed.", { status: response.status, body: await response.text() });
      return;
    }

    const payload = (await response.json()) as { rates?: Record<string, number>; date?: string };
    if (!payload.rates || typeof payload.rates !== "object") {
      logger.error("FX payload missing rates.", { payload });
      return;
    }

    await getFirestore()
      .doc(`fx/${payload.date ?? today}`)
      .set(
        {
          base: BASE_CURRENCY,
          rates: { ...payload.rates, [BASE_CURRENCY]: 1 },
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
  } catch (error) {
    logger.error("fxDaily failed", { error });
  }
});
