import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const ALLOWED_ORIGINS = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'https://qu4sarweb.github.io',
]

Deno.serve(async (req) => {
  try {
    const origin = req.headers.get('origin') || ''
    if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      return new Response(JSON.stringify({ error: 'origin not allowed' }), { status: 403 })
    }

    const { action, paymentId, amount, courseName, successUrl, cancelUrl, sessionId } = await req.json()

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'paymentId required' }), { status: 400 })
    }

    if (action === 'create') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: courseName || 'Pago QU4SAR Academy' },
            unit_amount: Math.round((amount || 1.54) * 100),
          },
          quantity: 1,
        }],
        success_url: successUrl || `${origin}/payments?stripe=success&session_id={CHECKOUT_SESSION_ID}&payment_id=${paymentId}`,
        cancel_url: cancelUrl || `${origin}/payments?stripe=cancel`,
        metadata: { payment_id: paymentId },
      })

      return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (action === 'verify') {
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'sessionId required' }), { status: 400 })
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId)
      const verified = session.payment_status === 'paid' || session.status === 'complete'

      return new Response(JSON.stringify({
        verified,
        paymentId: session.metadata?.payment_id || paymentId,
        amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : null,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 })
  } catch (err) {
    console.error('Stripe function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
