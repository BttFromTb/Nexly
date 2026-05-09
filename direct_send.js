import nodemailer from 'nodemailer';
import { searchGoogle } from './services/leadFinder.js';
import dotenv from 'dotenv';
dotenv.config();

async function directSend() {
  console.log('🚀 DİREKT GÖNDERİM MODU BAŞLATILDI (DB DEVRE DIŞI)');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const searchQuery = 'site:*.tr "e-ticaret" "@gmail.com" OR "info@"';
  const searchResults = await searchGoogle(searchQuery, 10);
  
  for (const res of searchResults) {
    const emailMatch = res.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;

    if (!email) continue;

    console.log(`🎯 Hedef: ${email}`);

    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'E-Ticaret Operasyonlarınızda Yapay Zeka Dönüşümü',
        text: `Merhaba,\n\n${res.url} adresindeki e-ticaret faaliyetlerinizi inceledim. Operasyonel süreçlerinizi (stok, müşteri desteği vb.) AI otomasyonları ile nasıl %80 hızlandırabileceğimizi konuşmak isterim.\n\nİyi çalışmalar,\nKullanici Baltalı`,
      });
      console.log(`✅ GÖNDERİLDİ: ${email}`);
      await new Promise(r => setTimeout(r, 7000));
    } catch (e) {
      console.error(`❌ Hata (${email}):`, e.message);
    }
  }
  
  console.log('\n🏁 TÜM MAİLLER GÖNDERİLDİ! Lütfen "Sent" klasörünüzü kontrol edin.');
}

directSend();
