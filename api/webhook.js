import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Terima request GET jika sewaktu-waktu Scalev mengecek ulang URL
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Webhook Vercel aktif' });
  }

  // 2. Panggil kunci rahasia dari Vercel
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 

  if (!supabaseUrl || !supabaseKey) {
    console.error("Kunci Supabase tidak ditemukan!");
    return res.status(200).json({ error: 'Kunci Supabase belum terpasang di Vercel.' });
  }

  // 3. Hubungkan ke Database Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    
    // Abaikan jika ini cuma tes ping dari Scalev
    if (!payload || !payload.data) {
      return res.status(200).json({ message: 'Ping tes diabaikan' });
    }

    const orderData = payload.data;

    // 4. FILTER SUPER KETAT: Hanya proses jika statusnya LUNAS (paid)
    if (payload.event !== 'order.payment_status_changed' || orderData?.payment_status !== 'paid') {
      return res.status(200).json({ message: `Diabaikan. Status: ${orderData?.payment_status}` });
    }

    // Ambil Email
    const emailPembeli = orderData?.customer?.email || orderData?.email;

    if (!emailPembeli) {
      return res.status(200).json({ message: 'Diabaikan, email pembeli tidak ada' });
    }

    // 5. Hitung batas waktu 6 bulan
    const tglKedaluwarsa = new Date();
    tglKedaluwarsa.setMonth(tglKedaluwarsa.getMonth() + 6);

    // 6. Masukkan ke Database Supabase
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

    // Beri laporan sukses ke Scalev
    return res.status(200).json({ message: 'Sukses mencatat pembeli baru!', email: emailPembeli });

  } catch (err) {
    console.error('Terjadi kesalahan:', err);
    return res.status(200).json({ message: 'Aman, sistem menahan error' });
  }
}
