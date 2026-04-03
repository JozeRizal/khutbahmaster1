export default function handler(req, res) {
  // Kode ini akan menerima APAPUN (GET/POST/Ping) dari Scalev dengan senyuman dan status 200 OK
  return res.status(200).json({ success: true, message: "OK dari Vercel" });
}
