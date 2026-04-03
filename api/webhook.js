import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 1. Terima request GET (Platform sering mengecek URL pakai GET saat di-save)
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Webhook Vercel aktif dan siap menerima data' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    
    // 2. TANGKAP "PING TES" DARI SCALEV
    // Jika Scalev hanya mengetes URL (tanpa data pesanan), balas status 200 (Sukses) agar bisa di-save
    if (!payload || !payload.data) {
      return res.status(200).json({ message: 'Ping tes dari Scalev berhasil diterima' });
    }

    const orderData = payload.data;

    // 3. Proses Pesanan Asli
    if (payload.event !== 'order.payment_status_changed' || orderData?.payment_status !== 'paid') {
      return res.status(200).json({ 
        message: `Diabaikan. Event: ${payload.event}, Status: ${orderData?.payment_status}` 
      });
    }

    const emailPembeli = orderData?.customer?.email || orderData?.email;

    if (!emailPembeli) {
      // Balas status 200 juga jika email kosong dari Scalev agar webhook tidak putus
      return res.status(200).json({ message: 'Diabaikan, email pembeli tidak ditemukan' });
    }

    const tglKedaluwarsa = new Date();
    tglKedaluwarsa.setMonth(tglKedaluwarsa.getMonth() + 6);

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
      message: 'Sukses! Akses 6 bulan diaktifkan', 
      email: emailPembeli 
    });

  } catch (err) {
    console.error('Terjadi kesalahan sistem:', err);
    // Ubah ke 200 khusus agar Scalev tidak mendeteksi error saat menyimpan
    return res.status(200).json({ message: 'Terjadi kesalahan internal, tapi koneksi webhook aman' });
  }
}
