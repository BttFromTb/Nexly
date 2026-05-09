import { searchGoogle } from './services/leadFinder.js';
import { ApifyClient } from 'apify-client';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const client = new ApifyClient({ token: process.env.APIFY_API_KEY });

async function deepCorporateCampaign() {
  console.log('🏛️ KURUMSAL DERİN TARAMA BAŞLATILDI');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // 1. Kurumsal Şirketleri Bul
  const searchQuery = 'e-ticaret "Genel Müdürlüğü" A.Ş.';
  const searchResults = await searchGoogle(searchQuery, 5);
  const urls = searchResults.map(r => r.url);

  console.log(`🔍 ${urls.length} kurumsal web sitesi taranıyor...`);

  // 2. Web Sitelerinden E-posta Ayıkla (Apify Contact Scraper)
  const contactRun = await client.actor('apify/contact-details-scraper').call({
    startUrls: urls.map(url => ({ url })),
    maxRequestsPerStartUrl: 5,
  });

  const { items } = await client.dataset(contactRun.defaultDatasetId).listItems();
  
  const processedEmails = new Set();

  for (const item of items) {
    const email = item.emails?.[0];
    if (!email || processedEmails.has(email)) continue;
    processedEmails.add(email);

    const companyName = item.url.split('//')[1].split('/')[0].replace('www.', '');
    console.log(`🎯 Hedef Tespit Edildi: ${companyName} (${email})`);

    const body = `<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #1a365d;">E-Ticaret Operasyonlarınızda Yapay Zeka Dönüşümü</h2>
      <p>Sayın Yetkili,</p>
      <p><strong>${companyName}</strong> operasyonlarını incelediğimizde, manuel iş yükünün kurumsal hızınızı yavaşlattığını öngörüyoruz. Yapay zeka otomasyonlarımızla maliyetlerinizi %40 düşürüp verimliliği nasıl maksimize edebileceğinizi paylaşmak isterim.</p>
      <p>Kısa bir demo görüşmesi için uygun olduğunuz saati iletebilir misiniz?</p>
      <p>Saygılarımla,<br><strong>Kullanici Baltalı</strong></p>
    </div>`;

    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${companyName} Özel: Yapay Zeka ile Verimlilik Artışı`,
        html: body
      });
      console.log(`✅ GÖNDERİLDİ: ${email}`);
      await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
      console.error(`❌ Hata: ${e.message}`);
    }
  }

  console.log('🏁 KURUMSAL KAMPANYA TAMAMLANDI.');
}

deepCorporateCampaign();
