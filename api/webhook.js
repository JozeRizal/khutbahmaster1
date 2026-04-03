import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Webhook Vercel aktif' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ error: 'Kunci Supabase belum terpasang.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = req.body;
    
    if (!payload || !payload.data) {
      return res.status(200).json({ message: 'Ping tes diabaikan' });
    }

    const eventData = payload.data;

    // 1. FILTER EVENT LANGGANAN & PEMBAYARAN
    const allowedEvents = ['order.payment_status_changed', 'subscription.activated', 'subscription.renewed'];
    
    if (!allowedEvents.includes(payload.event)) {
       return res.status(200).json({ message: `Diabaikan. Event bukan langganan/pembayaran: ${payload.event}` });
    }

    // Jika ini adalah event order biasa, pastikan statusnya lunas
    if (payload.event === 'order.payment_status_changed' && eventData?.payment_status !== 'paid') {
      return res.status(200).json({ message: `Diabaikan. Status belum lunas: ${eventData?.payment_status}` });
    }

    // 2. FILTER PRODUK SPESIFIK
    const dataPesananTeks = JSON.stringify(eventData);
    if (!dataPesananTeks.includes("Meta Ads Analyzer")) {
      return res.status(200).json({ message: 'Diabaikan. Pembeli membeli produk lain' });
    }

    // 3. AMBIL EMAIL (Scalev menaruhnya di object customer untuk subscription)
    const emailPembeli = eventData?.customer?.email || eventData?.email;

    if (!emailPembeli) {
      return res.status(200).json({ message: 'Diabaikan, email pembeli tidak ada' });
    }

    // 4. HITUNG WAKTU (Hari ini + 6 bulan)
    // Setiap kali webhook masuk (baik beli baru atau perpanjang), masa aktif di-reset 6 bulan dari HARI INI
    const tglKedaluwarsa = new Date();
    tglKedaluwarsa.setMonth(tglKedaluwarsa.getMonth() + 6);

    // 5. SIMPAN/PERBARUI KE DATABASE
    const { error } = await supabase
      .from('akses_user')
      .upsert(
        { email: emailPembeli, tgl_kedaluwarsa: tglKedaluwarsa.toISOString() },
        { onConflict: 'email' }
      );

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({ message: 'Sukses mencatat akses 6 bulan!', email: emailPembeli });

  } catch (err) {
    console.error('Terjadi kesalahan:', err.message);
    return res.status(500).json({ detail_error_sistem: err.message });
  }
}
