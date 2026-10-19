import "server-only";

import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

type AuctionNotification = {
  type: string;
  title: string;
  body: string;
  link: string;
};

let resendConfigurationWarningLogged = false;
let twilioConfigurationWarningLogged = false;

async function sendResendEmail(
  email: string,
  notification: AuctionNotification,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    if (!resendConfigurationWarningLogged) {
      console.warn("[auction-notifications] Email skipped: Resend is not configured.");
      resendConfigurationWarningLogged = true;
    }
    return;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: notification.title,
        text: appUrl
          ? `${notification.body}\n\nOpen your account: ${appUrl}${notification.link}`
          : notification.body,
      }),
    });
    if (!response.ok) {
      console.error(
        `[auction-notifications] Resend failed (${response.status}) for notification type ${notification.type}.`,
      );
    }
  } catch (error) {
    console.error("[auction-notifications] Resend request failed:", error);
  }
}

async function sendTwilioSms(
  phone: string,
  notification: AuctionNotification,
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    if (!twilioConfigurationWarningLogged) {
      console.warn("[auction-notifications] SMS skipped: Twilio is not configured.");
      twilioConfigurationWarningLogged = true;
    }
    return;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    console.warn(
      `[auction-notifications] SMS skipped for user with a non-E.164 phone number (notification type ${notification.type}).`,
    );
    return;
  }

  try {
    const body = new URLSearchParams({
      To: phone,
      From: from,
      Body: `${notification.title}: ${notification.body}`,
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    if (!response.ok) {
      console.error(
        `[auction-notifications] Twilio failed (${response.status}) for notification type ${notification.type}.`,
      );
    }
  } catch (error) {
    console.error("[auction-notifications] Twilio request failed:", error);
  }
}

export async function notifyAuctionParticipant(
  userId: string,
  notification: AuctionNotification,
) {
  await notify(userId, notification);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true },
  });
  if (!user) {
    console.error(
      `[auction-notifications] Could not find user ${userId} for external delivery.`,
    );
    return;
  }

  await Promise.all([
    sendResendEmail(user.email, notification),
    user.phone
      ? sendTwilioSms(user.phone, notification)
      : Promise.resolve(),
  ]);
}
