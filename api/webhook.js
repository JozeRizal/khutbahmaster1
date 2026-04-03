import { createClient } from '@supabase/supabase-js';

// 1. Memanggil kunci rahasia dari Environment Variables Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Pastikan hanya menerima request tipe POST (standar Webhook Scalev)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Menangkap data yang dikirim oleh Scalev
    const dataScalev = req.body;

    // Menangkap email pembeli (biasanya Scalev menaruhnya di object customer atau langsung di root)
    const emailPembeli = dataScalev?.customer?.email || dataScalev?.email;

    if (!emailPembeli) {
      return res.status(400).json({ error: 'Email pembeli tidak ditemukan dari Scalev' });
    }

    // 3. Menghitung tanggal kedaluwarsa (Hari ini + 6 Bulan)
    const tglKedaluwarsa = new Date();
    tglKedaluwarsa.setMonth(tglKedaluwarsa.getMonth() + 6);

    // 4. Menyimpan data ke Supabase
    // Kita gunakan fitur "upsert": Kalau email baru, ditambahkan. Kalau email lama (perpanjang), di-update tanggalnya.
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

    // 5. Memberikan laporan sukses ke Scalev
    return res.status(200).json({ 
      message: 'Sukses! Akses 6 bulan telah diaktifkan', 
      email: emailPembeli 
    });

  } catch (err) {
    console.error('Terjadi kesalahan sistem:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
