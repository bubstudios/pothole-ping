import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.25.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const signature = req.headers.get('stripe-signature');
    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    const body = await req.text();
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const amount = session.amount_total ? session.amount_total / 100 : 0;
      const isSubscription = session.mode === 'subscription';
      const donorName = session.metadata?.donor_name || '';
      const message = session.metadata?.message || '';

      // Record the donation with service role since this is a webhook (no user auth)
      await base44.asServiceRole.entities.Donation.create({
        amount,
        recurring: isSubscription,
        donor_name: donorName || undefined,
        message: message || undefined,
        status: 'completed',
      });

      console.log(`Donation recorded: $${amount} ${isSubscription ? 'monthly' : 'one-time'}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});