import { ValidationError } from '@/lib/http/errors';
import { asEmail, asString, ensureObject } from '@/lib/validators/common';

export function validateAdminLogin(body: unknown) {
  const input = ensureObject(body);

  const totpCode = typeof input.totpCode === 'string' ? input.totpCode.trim() : typeof input.totp_code === 'string' ? input.totp_code.trim() : undefined;
  const recoveryCode = typeof input.recoveryCode === 'string'
    ? input.recoveryCode.trim()
    : typeof input.recovery_code === 'string'
      ? input.recovery_code.trim()
      : undefined;

  if (totpCode && !/^\d{6}$/.test(totpCode)) {
    throw new ValidationError('totpCode must be a 6-digit code');
  }

  if (recoveryCode && recoveryCode.length > 128) {
    throw new ValidationError('recoveryCode is too long');
  }

  return {
    email: asEmail(input.email),
    password: asString(input.password, 'password', 256),
    totpCode,
    recoveryCode,
  };
}

export function validateSupportPayload(body: unknown) {
  const input = ensureObject(body);
  const type = typeof input.type === 'string' ? input.type.trim().toLowerCase() : 'support';
  if (!['support', 'bug'].includes(type)) {
    throw new ValidationError('type must be support or bug');
  }

  const subject = asString(input.subject, 'subject', 160).trim();
  if (subject.length < 3) {
    throw new ValidationError('subject must have at least 3 characters');
  }

  const message = asString(input.message, 'message', 2000).trim();
  if (message.length < 10) {
    throw new ValidationError('message must have at least 10 characters');
  }

  return {
    type: type as 'support' | 'bug',
    subject,
    message,
  };
}

export function validateCheckoutPayload(body: unknown) {
  const input = ensureObject(body);
  const plan = asString(input.plan, 'plan', 12);
  if (!['mensal', 'anual'].includes(plan)) throw new ValidationError('plan is invalid');
  const rawReferral = typeof input.referralCode === 'string'
    ? input.referralCode
    : typeof input.referral_code === 'string'
      ? input.referral_code
      : null;
  const referral = rawReferral ? rawReferral.trim().toUpperCase() : null;
  return { plan: plan as 'mensal' | 'anual', referralCode: referral && /^[A-Z0-9]{2,20}$/.test(referral) ? referral : null };
}
