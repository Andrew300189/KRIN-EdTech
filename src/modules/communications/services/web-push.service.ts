export type WebPushMessage = { title: string; body: string; actionUrl?: string | null };

/** Web Push subscription storage is active. Delivery remains disabled until VAPID keys and a push transport are configured. */
export class WebPushService {
  configured() {
    return Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY && process.env.WEB_PUSH_SUBJECT);
  }

  async send(_subscription: { endpoint: string; p256dh: string; auth: string }, _message: WebPushMessage) {
    if (!this.configured()) return { delivered: false, reason: "PUSH_NOT_CONFIGURED" as const };
    // A transport adapter is intentionally required before live delivery; no endpoint is contacted by default.
    return { delivered: false, reason: "PUSH_TRANSPORT_NOT_CONFIGURED" as const };
  }
}

export const webPushService = new WebPushService();
