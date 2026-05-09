import { searchGoogleMaps } from './services/leadFinder.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function corporateGuaranteedRun() {
  console.log('🏛️ KURUMSAL GARANTİLİ GÖNDERİM BAŞLATILDI');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // SADECE BÜYÜK ŞİRKETLERİ HEDEFLEYEN MAPS ARAMASI
  const query = 'e-ticaret Genel Müdürlüğü A.Ş.';
  console.log(`🔍 "${query}" için kurumsal aramalar yapılıyor...`);

  const leads = await searchGoogleMaps(query, 'Türkiye', 10);
  
  console.log(`✅ ${leads.length} kurumsal merkez bulundu. Filtreleniyor...`);

  for (const lead of leads) {
    // Kurumsal olmayanları veya e-postası bulunamayanları ele
    if (!lead.email || lead.email.includes('gmail.com') || lead.email.includes('hotmail.com')) {
       // Sadece gerçek kurumsal domainleri (info@sirketadi.com gibi) kabul et
       if (lead.email && (lead.email.includes('gmail.com') || lead.email.includes('hotmail.com'))) {
         console.log(`⏩ ${lead.company} (Kişisel email: ${lead.email}) - Kurumsal değil, geçiliyor.`);
         continue;
       }
       if (!lead.email) {
         console.log(`⏩ ${lead.company} - Email bulunamadı, geçiliyor.`);
         continue;
       }
    }

    console.log(`🎯 Kurumsal Hedef Tespit Edildi: ${lead.company} (${lead.email})`);

    const htmlBody = `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; border: 1px solid #e0e0e0; padding: 30px; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; font-size: 24px;">Yapay Zeka ile Kurumsal Dönüşüm</h1>
      </div>
      <p>Sayın Yetkili,</p>
      <p><strong>${lead.company}</strong> bünyesindeki e-ticaret süreçlerinizi inceledik. Kurumsal yapıların operasyonel hızını artırmak ve manuel iş yükünü minimize etmek adına sunduğumuz AI otomasyon çözümlerimizi sizinle paylaşmak istiyoruz.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <ul style="margin: 0; padding-left: 20px;">
          <li>Uçtan uca sipariş ve stok otomasyonu</li>
          <li>7/24 Kesintisiz AI Müşteri Desteği</li>
          <li>Veri odaklı akıllı fiyatlandırma sistemleri</li>
        </ul>
      </div>
      <p>Bu dönüşümün size sağlayacağı ROI (Yatırım Getirisi) raporunu sunmak için kısa bir toplantı talep ediyoruz.</p>
      <p>Uygun olduğunuzda dönüşünüzü bekleriz.</p>
      <br>
      <p>Saygılarımla,<br><strong>Kullanici Baltalı</strong><br><span style="color: #7f8c8d;">AI Entegrasyon Uzmanı</span></p>
    </div>`;

    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
        to: lead.email,
        subject: `${lead.company} İçin Yapay Zeka Otomasyon Teklifi`,
        html: htmlBody
      });
      console.log(`✅ GÖNDERİLDİ: ${lead.email}`);
      await new Promise(r => setTimeout(r, 10000));
    } catch (e) {
      console.error(`❌ Hata: ${e.message}`);
    }
  }

  console.log('\n🏁 KURUMSAL KAMPANYA TAMAMLANDI. Lütfen "Sent" klasörünü kontrol edin!');
}

corporateGuaranteedRun();
