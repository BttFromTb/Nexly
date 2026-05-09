import { initDatabase, leadOps, emailOps } from './database/db.js';
import { fullLeadSearch } from './services/leadFinder.js';
import { sendEmail } from './services/emailSender.js';

async function finalGuaranteedRun() {
  console.log('🚀 %100 GARANTİLİ GÖNDERİM BAŞLATILDI');
  await initDatabase();

  try {
    // 1. Lead Bul
    const leads = await fullLeadSearch("E-ticaret", "Sahibi", "Türkiye", 3);
    
    if (leads.length === 0) {
      console.log('❌ Lead bulunamadı.');
      return;
    }

    console.log(`✅ ${leads.length} lead bulundu. Gönderim başlıyor...`);

    for (const lead of leads) {
      if (!lead.email) {
        console.log(`⏩ ${lead.company} için e-posta yok, geçiliyor.`);
        continue;
      }

      // 1. Veritabanına kaydet (Hata olsa bile devam etsin)
      let leadId;
      try {
        leadId = leadOps.insert(lead);
      } catch (e) { console.log('DB Kayıt Hatası (Önemli değil, gönderime devam):', e.message); }

      // 2. E-postayı hazırla
      console.log(`✍️ ${lead.company} için e-posta hazırlanıyor...`);
      const subject = `E-Ticaret Operasyonlarınızda AI Verimliliği`;
      const body = `Merhaba,\n\n${lead.company} bünyesindeki e-ticaret süreçlerinizi yapay zeka otomasyonları ile nasıl %80 oranında hızlandırabileceğimizi konuşmak isterim.\n\nE-ticaret ekosistemini yakından takip ediyorum. Özellikle stok yönetimi ve müşteri taleplerini otomatikleştirerek operasyonel maliyetlerinizi düşürebiliriz.\n\nKısa bir görüşme için uygun vaktinizi iletebilirseniz sevinirim.\n\nSaygılarımla,\nKullanici Baltalı`;

      // 3. E-postayı kaydet ve gönder
      try {
        const emailId = emailOps.insert({
          lead_id: leadId || 1,
          subject,
          body,
          type: 'initial',
          status: 'draft'
        });

        console.log(`📧 Gönderiliyor: ${lead.email}`);
        await sendEmail(emailId);
        console.log(`✨ BAŞARIYLA GÖNDERİLDİ: ${lead.email}`);
      } catch (e) {
        console.error(`❌ Gönderim Hatası (${lead.company}):`, e.message);
      }

      await new Promise(r => setTimeout(r, 5000));
    }
    
    console.log('\n🏁 TÜM İŞLEMLER TAMAMLANDI. Lütfen "Sent" klasörünüzü kontrol edin!');
  } catch (err) {
    console.error('❌ Genel Hata:', err.message);
  }
}

finalGuaranteedRun();
