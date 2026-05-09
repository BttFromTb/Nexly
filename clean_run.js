import { initDatabase, leadOps, emailOps } from './database/db.js';
import { fullLeadSearch } from './services/leadFinder.js';
import { sendEmail } from './services/emailSender.js';

async function cleanRun() {
  console.log('🚀 TEMİZ KAMPANYA BAŞLATILDI');
  await initDatabase();

  try {
    // 1. Lead Bul
    const leads = await fullLeadSearch("E-ticaret", "Sahibi", "Türkiye", 3);
    if (leads.length === 0) {
      console.log('❌ Lead bulunamadı.');
      return;
    }

    console.log(`✅ ${leads.length} lead bulundu. İşleniyor...`);

    for (const leadData of leads) {
      // Önce lead'i kaydet ve gerçek ID'yi al
      const leadId = leadOps.insert(leadData);
      const lead = leadOps.getById(leadId);
      
      if (!lead.email) {
        console.log(`⏩ ${lead.company} için e-posta yok, geçiliyor.`);
        continue;
      }

      console.log(`✍️ ${lead.company} için e-posta hazırlanıyor...`);
      const subject = `E-Ticaret Operasyonlarınızda AI Verimliliği`;
      const body = `Merhaba,\n\n${lead.company} bünyesindeki e-ticaret süreçlerinizi yapay zeka otomasyonları ile nasıl %80 oranında hızlandırabileceğimizi konuşmak isterim.\n\nKayseri ve Türkiye genelindeki e-ticaret ekosistemini yakından takip ediyorum. Özellikle stok yönetimi ve müşteri taleplerini otomatikleştirerek operasyonel maliyetlerinizi düşürebiliriz.\n\nKısa bir görüşme için uygun vaktinizi iletebilirseniz sevinirim.\n\nSaygılarımla,\nKullanici Baltalı`;

      // E-postayı kaydet
      const emailId = emailOps.insert({
        lead_id: lead.id,
        subject,
        body,
        type: 'initial',
        status: 'draft'
      });

      // Hemen gönder
      console.log(`📧 Gönderiliyor: ${lead.email}`);
      await sendEmail(emailId);
      console.log(`✨ BAŞARIYLA GÖNDERİLDİ: ${lead.email}`);
      
      await new Promise(r => setTimeout(r, 8000));
    }
    
    console.log('\n🏁 TÜM İŞLEMLER BAŞARIYLA TAMAMLANDI!');
  } catch (err) {
    console.error('❌ Hata:', err.message);
  }
}

cleanRun();
