import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';

export const runtime = 'nodejs';

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

type WebhookMetadata = {
  userId: string | null;
  plan: string | null;
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function verifyStripeSignature(payload: string, signatureHeader: string, webhookSecret: string): boolean {
  const entries = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = entries.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = entries.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) return false;

  const toleranceMs = 5 * 60 * 1000;
  if (Math.abs(Date.now() - timestampMs) > toleranceMs) return false;

  const expected = createHmac('sha256', webhookSecret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return signatures.some((signature) => {
    try {
      const signatureBuffer = Buffer.from(signature, 'hex');
      if (signatureBuffer.length !== expectedBuffer.length) return false;
      return timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });
}

function readMetadata(source: Record<string, unknown> | null | undefined): WebhookMetadata {
  const metadata = (source?.metadata ?? null) as Record<string, unknown> | null;
  const userId = typeof metadata?.user_id === 'string' ? metadata.user_id : null;
  const plan = typeof metadata?.plan === 'string' ? metadata.plan : null;
  return { userId, plan };
}

function extractMetadataAndIds(eventObject: Record<string, unknown>): {
  metadata: WebhookMetadata;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
} {
  const direct = readMetadata(eventObject);

  const subscriptionDetails = eventObject.subscription_details as Record<string, unknown> | undefined;
  const subscriptionMetadata = readMetadata(subscriptionDetails ?? null);

  const lines = eventObject.lines as { data?: Array<Record<string, unknown>> } | undefined;
  const lineMetadata = readMetadata(lines?.data?.[0] ?? null);

  const metadata: WebhookMetadata = {
    userId: direct.userId ?? subscriptionMetadata.userId ?? lineMetadata.userId,
    plan: direct.plan ?? subscriptionMetadata.plan ?? lineMetadata.plan,
  };

  const stripeCustomerId = typeof eventObject.customer === 'string' ? eventObject.customer : null;
  const stripeSubscriptionId = typeof eventObject.subscription === 'string' ? eventObject.subscription : null;

  return { metadata, stripeCustomerId, stripeSubscriptionId };
}

async function resolveUserId(userId: string | null, stripeCustomerId: string | null): Promise<string | null> {
  if (userId) return userId;
  if (!stripeCustomerId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error) {
    console.error('[stripe webhook] failed resolving user by customer id', error);
    return null;
  }

  return (data?.id as string | undefined) ?? null;
}

async function patchProfile(userId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);

  if (error) {
    throw error;
  }
}

async function handleCheckoutSessionCompleted(eventObject: Record<string, unknown>) {
  const { metadata, stripeCustomerId, stripeSubscriptionId } = extractMetadataAndIds(eventObject);
  const userId = await resolveUserId(metadata.userId, stripeCustomerId);

  if (!userId) {
    console.error('[stripe webhook] checkout.session.completed missing user_id', { eventObject });
    return;
  }

  const status = typeof eventObject.payment_status === 'string' ? eventObject.payment_status : 'active';
  const isPlayoff = metadata.plan === 'playoff';

  await patchProfile(userId, {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    plan: metadata.plan,
    subscription_status: status,
    ...(isPlayoff ? { playoff_pack_active: true } : {}),
    billing_updated_at: new Date().toISOString(),
  });
}

async function handleInvoicePaid(eventObject: Record<string, unknown>) {
  const { metadata, stripeCustomerId, stripeSubscriptionId } = extractMetadataAndIds(eventObject);
  const userId = await resolveUserId(metadata.userId, stripeCustomerId);

  if (!userId) {
    console.error('[stripe webhook] invoice.paid missing user_id', { eventObject });
    return;
  }

  await patchProfile(userId, {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    ...(metadata.plan ? { plan: metadata.plan } : {}),
    subscription_status: 'active',
    ...(metadata.plan === 'playoff' ? { playoff_pack_active: true } : {}),
    billing_updated_at: new Date().toISOString(),
  });
}

async function handleSubscriptionDeleted(eventObject: Record<string, unknown>) {
  const { metadata, stripeCustomerId, stripeSubscriptionId } = extractMetadataAndIds(eventObject);
  const userId = await resolveUserId(metadata.userId, stripeCustomerId);

  if (!userId) {
    console.error('[stripe webhook] customer.subscription.deleted missing user_id', { eventObject });
    return;
  }

  await patchProfile(userId, {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    ...(metadata.plan ? { plan: metadata.plan } : {}),
    subscription_status: 'canceled',
    billing_updated_at: new Date().toISOString(),
  });
}

export async function GET() {
  return Response.json({ message: 'Webhook alive' }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[stripe webhook] missing Stripe signature');
      return Response.json({ error: 'Missing signature' }, { status: 400 });
    }

    const payload = await req.text();
    const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');

    if (!verifyStripeSignature(payload, signature, webhookSecret)) {
      console.error('[stripe webhook] invalid Stripe signature');
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(payload) as StripeEvent;

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'invoice.paid':
          await handleInvoicePaid(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;
        default:
          break;
      }
    } catch (handlerError) {
      console.error('[stripe webhook] handler error', {
        eventId: event.id,
        eventType: event.type,
        error: handlerError,
      });
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[stripe webhook] fatal error', error);
    return Response.json({ received: true }, { status: 200 });
  }
}
