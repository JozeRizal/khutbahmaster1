import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Terima request GET untuk tes Scalev & Browser
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Webhook Vercel aktif dan siap menerima data' });
  }

  // 2. Pindahkan pemanggilan kunci ke DALAM fungsi agar tidak crash jika kuncinya hilang
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 

  if (!supabaseUrl || !supabaseKey) {
    console.error("Kunci Supabase tidak ditemukan!");
    // Jika Vercel dites saat kunci hilang, ia akan mengembalikan pesan ini, BUKAN crash 500
    return res.status(200).json({ 
      error: 'Vercel aktif, TAPI kunci Supabase (Environment Variables) belum terpasang dengan benar di dashboard Vercel.' 
    });
  }

  // 3. Inisialisasi Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    
    // TANGKAP "PING TES" DARI SCALEV
    if (!payload || !payload.data) {
      return res.status(200).json({ message: 'Ping tes dari Scalev berhasil diterima' });
    }

    const orderData = payload.data;

    if (payload.event !== 'order.payment_status_changed' || orderData?.payment_status !== 'paid') {
      return res.status(200).json({ message: `Diabaikan. Status: ${orderData?.payment_status}` });
    }

    const emailPembeli = orderData?.customer?.email || orderData?.email;

    if (!emailPembeli) {
      return res.status(200).json({ message: 'Diabaikan, email pembeli tidak ditemukan' });
    }

    const tglKedaluwarsa = new Date();
    tglKedaluwarsa.setMonth(tglKedaluwarsa.getMonth() + 6);

    const { error } = await supabase
      .from('akses_user')
      .upsert(
        { email: emailPembeli, tgl_kedaluwarsa: tglKedaluwarsa.toISOString() },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Error database:', error);
      return res.status(500).json({ error: 'Gagal menyimpan ke database' });
    }

    return res.status(200).json({ message: 'Sukses! Akses 6 bulan diaktifkan', email: emailPembeli });

  } catch (err) {
    console.error('Terjadi kesalahan sistem:', err);
    return res.status(200).json({ message: 'Terjadi kesalahan internal, tapi koneksi aman' });
  }
}
