import { Resend } from "resend";

/**
 * The single email seam. All feature code calls `sendEmail`; swapping providers
 * (or adding queueing/retries) happens here only.
 *
 * With no RESEND_API_KEY set (local dev / CI), it logs a stub and returns
 * delivered:false — so the whole product runs end-to-end with zero secrets.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Workplace Mind Audit <onboarding@resend.dev>";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  delivered: boolean;
  id: string | null;
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const note = message.attachments?.length
      ? ` (+${message.attachments.length} attachment)`
      : "";
    console.info(
      `[email:stub] would send "${message.subject}" → ${message.to}${note}`,
    );
    return { delivered: false, id: null };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (error) {
      console.error("[email] delivery failed:", error);
      return { delivered: false, id: null };
    }
    return { delivered: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[email] unexpected error:", err);
    return { delivered: false, id: null };
  }
}
