import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email wajib diisi' });

  try {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cari data user berdasarkan email
    const { data, error } = await supabase
      .from('akses_user')
      .select('tgl_kedaluwarsa')
      .eq('email', email)
      .single();

    // Jika email tidak ada di database (belum beli)
    if (error || !data) {
      return res.status(404).json({ error: 'Email tidak ditemukan. Pastikan Anda menggunakan email yang sama saat pembelian Meta Ads Analyzer.' });
    }

    // Cek masa aktif
    const expiryDate = new Date(data.tgl_kedaluwarsa);
    const currentDate = new Date();

    if (currentDate > expiryDate) {
      // Pesan kedaluwarsa sesuai dengan kebijakan aplikasi Anda
      return res.status(403).json({ 
        error: 'Masa aktif 6 bulan Anda telah berakhir. Kami secara rutin memperbarui sistem agar selalu relevan dengan algoritma terbaru setiap bulannya. Pembaruan berkelanjutan ini membutuhkan alokasi resources tambahan agar performa aplikasi tetap maksimal. Silakan lakukan perpanjangan akses.' 
      });
    }

    // Jika aman dan masih dalam masa aktif
    return res.status(200).json({ success: true, message: 'Akses diizinkan' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan sistem internal' });
  }
}
