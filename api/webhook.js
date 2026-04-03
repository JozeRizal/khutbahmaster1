import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    
    // 1. Buka "bungkusan" data asli dari Scalev sesuai dokumentasi
    const orderData = payload.data;

    // 2. Pastikan webhook ini berasal dari event perubahan status pembayaran, 
    // dan pastikan status pembayarannya benar-benar "paid" (lunas)
    if (payload.event !== 'order.payment_status_changed' || orderData?.payment_status !== 'paid') {
      return res.status(200).json({ 
        message: `Diabaikan. Event: ${payload.event}, Status: ${orderData?.payment_status}` 
      });
    }

    // 3. Jika LUNAS, ambil email pembeli (di Scalev biasanya di dalam object customer)
    const emailPembeli = orderData?.customer?.email || orderData?.email;

    if (!emailPembeli) {
      return res.status(400).json({ error: 'Email pembeli tidak ditemukan' });
    }

    // 4. Menghitung tanggal kedaluwarsa (Hari ini + 6 Bulan)
    const tglKedaluwarsa = new Date();
    tglKedaluwarsa.setMonth(tglKedaluwarsa.getMonth() + 6);

    // 5. Menyimpan/Memperbarui data ke Supabase
    const { error } = await supabase
      .from('akses_user')
      .upsert(
        { 
          email: emailPembeli, 
          tgl_kedaluwarsa: tglKedaluwarsa.toISOString() 
        },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Error database:', error);
      return res.status(500).json({ error: 'Gagal menyimpan ke database' });
    }

    return res.status(200).json({ 
      message: 'Sukses! Akses 6 bulan telah diaktifkan untuk pesanan LUNAS', 
      email: emailPembeli 
    });

  } catch (err) {
    console.error('Terjadi kesalahan sistem:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
