import nodemailer from 'nodemailer';
import { searchGoogle } from './services/leadFinder.js';
import dotenv from 'dotenv';
dotenv.config();

async function smartCampaign() {
  console.log('💎 PREMIUM & KURUMSAL KAMPANYA BAŞLATILDI');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // Büyük şirketleri hedefleyen özel arama terimleri
  const searchQuery = 'site:*.tr "e-ticaret" ("A.Ş." OR "Ltd. Şti.") "Genel Müdürlüğü" ("info@" OR "destek@" OR "kurumsal@")';
  const searchResults = await searchGoogle(searchQuery, 10);
  
  console.log(`✅ ${searchResults.length} kurumsal hedef bulundu. Analiz ediliyor...`);

  for (const res of searchResults) {
    const emailMatch = res.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;

    if (!email) continue;

    // Küçük/Bireysel e-postaları ele (opsiyonel ama güvenli)
    if (email.includes('outlook.com') || email.includes('hotmail.com')) continue;

    const companyName = res.title.split('-')[0].trim();
    console.log(`🎯 Kurumsal Hedef: ${companyName} (${email})`);

    // YÜKSEK ETKİLİ E-POSTA ŞABLONU
    const subjects = [
      `${companyName} Operasyonlarında Yapay Zeka ile %40 Verimlilik Artışı`,
      `Rakipleriniz AI Kullanırken ${companyName} Nerede?`,
      `E-Ticaret Süreçlerinizde Manuel Hataya Son: AI Entegrasyonu`,
      `Kurumsal Otomasyon Teklifi - ${companyName} Özel`
    ];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];

    const body = `Sayın Yetkili,\n\n${companyName} bünyesinde yürüttüğünüz e-ticaret operasyonlarını yakından inceledim. \n\nSektördeki lider firmalar şu an sipariş yönetimi, lojistik takibi ve müşteri deneyimi gibi kritik süreçlerini %100 yapay zeka otomasyonuna taşırken; kurumsal yapıların manuel süreçlerde ısrar etmesi hem operasyonel maliyet hem de pazar payı kaybı anlamına geliyor.\n\nSunduğumuz AI LeadPilot sistemi ile:\n- Müşteri taleplerini saniyeler içinde AI ile yanıtlama,\n- Stok ve fiyatlandırma hatalarını sıfıra indirme,\n- Satış ekiplerinizin vaktini %60 daha verimli kullanmasını sağlıyoruz.\n\n${companyName} için hazırladığımız özel çözüm dosyasını sunmak ve kısa bir demo gerçekleştirmek isterim. \n\nUygun olduğunuz bir zaman dilimini iletirseniz takviminize ekleyebilirim.\n\nSaygılarımla,\nKullanici Baltalı\nYapay Zeka Çözümleri Uzmanı`;

    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        text: body,
        // HTML versiyonu daha premium görünür
        html: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2c3e50; line-height: 1.6; max-width: 600px; border-left: 4px solid #3498db; padding-left: 20px;">
                <h2 style="color: #2980b9;">${subject}</h2>
                <p>Sayın Yetkili,</p>
                <p><strong>${companyName}</strong> bünyesinde yürüttüğünüz e-ticaret operasyonlarını yakından inceledim.</p>
                <p>Sektördeki lider firmalar şu an sipariş yönetimi, lojistik takibi ve müşteri deneyimi gibi kritik süreçlerini %100 yapay zeka otomasyonuna taşırken; kurumsal yapıların manuel süreçlerde ısrar etmesi hem operasyonel maliyet hem de pazar payı kaybı anlamına geliyor.</p>
                <p>Sunduğumuz <strong>AI LeadPilot</strong> sistemi ile:</p>
                <ul style="background: #f9f9f9; padding: 15px 35px; border-radius: 8px;">
                  <li>Müşteri taleplerini saniyeler içinde AI ile yanıtlama</li>
                  <li>Stok ve fiyatlandırma hatalarını sıfıra indirme</li>
                  <li>Satış ekiplerinizin vaktini %60 daha verimli kullanması</li>
                </ul>
                <p>${companyName} için hazırladığımız özel çözüm dosyasını sunmak ve kısa bir demo gerçekleştirmek isterim.</p>
                <p>Uygun olduğunuz bir zaman dilimini iletirseniz takviminize ekleyebilirim.</p>
                <br>
                <p>Saygılarımla,<br><strong>Kullanici Baltalı</strong><br><span style="color: #7f8c8d; font-size: 0.9em;">Yapay Zeka Çözümleri Uzmanı</span></p>
               </div>`
      });
      console.log(`✅ GÖNDERİLDİ: ${companyName}`);
      await new Promise(r => setTimeout(r, 10000)); // Kurumsal gönderimlerde daha yavaş (10sn)
    } catch (e) {
      console.error(`❌ Hata (${companyName}):`, e.message);
    }
  }
  
  console.log('\n🏁 PREMIUM KAMPANYA TAMAMLANDI. Lütfen "Sent" klasörünü kontrol edin.');
}

smartCampaign();
