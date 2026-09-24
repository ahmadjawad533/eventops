import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../config/env';

export interface SignedTicketPayload {
  registrationId: string;
  eventId: string;
  userId: string;
  ticketCode: string;
  signature: string;
}

export function createTicketSignature(
  registrationId: string,
  eventId: string,
  userId: string,
  ticketCode: string
): string {
  const data = `${registrationId}:${eventId}:${userId}:${ticketCode}`;
  return crypto.createHmac('sha256', env.TICKET_SIGNING_SECRET).update(data).digest('hex');
}

export function verifyTicketSignature(
  registrationId: string,
  eventId: string,
  userId: string,
  ticketCode: string,
  providedSignature: string
): boolean {
  const expectedSignature = createTicketSignature(registrationId, eventId, userId, ticketCode);
  const bufExpected = Buffer.from(expectedSignature, 'hex');
  const bufProvided = Buffer.from(providedSignature, 'hex');

  if (bufExpected.length !== bufProvided.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufExpected, bufProvided);
}

export async function generateQrCodeDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 280,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

export function generateVerificationId(): string {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timePart = Date.now().toString(36).toUpperCase();
  return `EO-CERT-${randomHex}-${timePart}`;
}
