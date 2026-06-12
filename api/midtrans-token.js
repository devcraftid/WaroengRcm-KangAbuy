export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { order_id, gross_amount, customer_details, items } = req.body

    if (!order_id || !gross_amount) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || process.env.VITE_MIDTRANS_SERVER_KEY
    if (!serverKey) {
      console.error('MIDTRANS_SERVER_KEY is not set')
      return res.status(500).json({ error: 'Midtrans Server Key not configured' })
    }

    // Gunakan URL Sandbox secara default kecuali diset PRODUCTION
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
    const apiUrl = isProduction 
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    // Buat Auth String: Base64(ServerKey + ":")
    const authString = Buffer.from(serverKey + ':').toString('base64')

    const payload = {
      transaction_details: {
        order_id: order_id,
        gross_amount: Math.round(gross_amount)
      },
      customer_details: customer_details || {
        first_name: "Guest"
      },
      item_details: items || []
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Midtrans API Error:', data)
      return res.status(response.status).json(data)
    }

    // Set CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

    res.status(200).json({ token: data.token, redirect_url: data.redirect_url })
  } catch (error) {
    console.error('Midtrans Token Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
