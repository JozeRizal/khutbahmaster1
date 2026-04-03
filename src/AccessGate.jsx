import React, { useState, useEffect } from 'react';

export default function AccessGate({ children }) {
  const [email, setEmail] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true); 
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Cek apakah user sudah login sebelumnya (agar tidak repot login tiap buka aplikasi)
  useEffect(() => {
    const savedEmail = localStorage.getItem('meta_ads_user_email');
    if (savedEmail) {
      verifyAccess(savedEmail);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyAccess = async (emailToCheck) => {
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasAccess(true);
        localStorage.setItem('meta_ads_user_email', emailToCheck); // Simpan sesi
      } else {
        setHasAccess(false);
        setIsError(true);
        setMessage(data.error);
        localStorage.removeItem('meta_ads_user_email'); // Hapus sesi jika kedaluwarsa
      }
    } catch (error) {
      setIsError(true);
      setMessage('Terjadi kesalahan koneksi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      verifyAccess(email);
    }
  };

  // Jika punya akses, tampilkan aplikasi utama
  if (hasAccess) {
    return <>{children}</>;
  }

  // Jika tidak punya akses, tampilkan form login
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Meta Ads Analyzer</h2>
          <p className="text-slate-500 mt-2 text-sm">Masukkan email pembelian Anda untuk mengakses aplikasi</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:bg-blue-300 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Memeriksa...
              </span>
            ) : 'Masuk Aplikasi'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm leading-relaxed ${isError ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
