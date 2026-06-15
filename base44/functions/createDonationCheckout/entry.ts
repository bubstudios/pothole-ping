import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.25.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { amount, recurring, successUrl, cancelUrl, donorName, message } = await req.json();

    if (!amount || amount < 1) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const session = await stripe.checkout.sessions.create({
      mode: recurring ? 'subscription' : 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: recurring ? 'PotholePing Monthly' : 'PotholePing Donation',
            description: recurring
              ? `Monthly donation of $${amount} to support pothole-free roads`
              : `$${amount} donation to support PotholePing`,
          },
          unit_amount: amount * 100,
          ...(recurring ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      }],
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        ...(donorName ? { donor_name: donorName } : {}),
        ...(message ? { message } : {}),
      },
      success_url: successUrl || 'https://potholeping.com/donate?success=true',
      cancel_url: cancelUrl || 'https://potholeping.com/donate?canceled=true',
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});