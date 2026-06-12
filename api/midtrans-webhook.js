import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const data = req.body

    const serverKey = process.env.MIDTRANS_SERVER_KEY || process.env.VITE_MIDTRANS_SERVER_KEY
    if (!serverKey) {
      console.error('MIDTRANS_SERVER_KEY is not set')
      return res.status(500).json({ error: 'Server Key not configured' })
    }

    // 1. Validasi Signature Key
    const hash = crypto.createHash('sha512')
    hash.update(data.order_id + data.status_code + data.gross_amount + serverKey)
    const expectedSignature = hash.digest('hex')

    if (data.signature_key !== expectedSignature) {
      console.error('Invalid signature')
      return res.status(403).json({ error: 'Invalid signature' })
    }

    // 2. Inisialisasi Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials missing')
      return res.status(500).json({ error: 'Supabase config missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const transactionStatus = data.transaction_status
    const fraudStatus = data.fraud_status
    const orderId = data.order_id

    let newStatus = ''
    let paymentStatus = ''

    if (transactionStatus == 'capture') {
      if (fraudStatus == 'accept') {
        newStatus = 'processing'
        paymentStatus = 'completed'
      }
    } else if (transactionStatus == 'settlement') {
      newStatus = 'processing'
      paymentStatus = 'completed'
    } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
      newStatus = 'cancelled'
      paymentStatus = 'failed'
    } else if (transactionStatus == 'pending') {
      newStatus = 'pending'
      paymentStatus = 'pending'
    }

    if (newStatus && paymentStatus) {
      // Update tabel orders
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (orderError) throw orderError

      // Update tabel payments
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ 
          status: paymentStatus,
          payment_method: data.payment_type, // e.g., 'qris', 'gopay', 'bank_transfer'
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)

      if (paymentError) throw paymentError

      console.log(`Order ${orderId} updated to ${newStatus}`)
    }

    res.status(200).json({ status: 'OK' })
  } catch (error) {
    console.error('Webhook Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
