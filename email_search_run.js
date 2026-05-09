import { initDatabase, leadOps, emailOps, activityOps } from './database/db.js';
import { searchGoogle } from './services/leadFinder.js';
import { sendEmail } from './services/emailSender.js';

async function emailFocusedRun() {
  console.log('🔎 E-POSTA ODAKLI DERİN ARAMA BAŞLATILDI');
  await initDatabase();

  try {
    // 1. Google Arama ile e-posta içeren siteleri bul
    const searchQuery = 'site:*.tr "e-ticaret" "@gmail.com" OR "info@"';
    const searchResults = await searchGoogle(searchQuery, 10);
    
    console.log(`✅ ${searchResults.length} potansiyel web sitesi bulundu. E-postalar ayıklanıyor...`);

    for (const res of searchResults) {
      // Basit bir regex ile açıklamadan e-posta ayıkla
      const emailMatch = res.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const email = emailMatch ? emailMatch[0] : null;

      if (!email) continue;

      const leadData = {
        name: res.title.split('-')[0].trim(),
        company: res.title,
        email: email,
        website: res.url,
        industry: 'E-ticaret',
        source: 'google_search'
      };

      const leadId = leadOps.insert(leadData);
      const lead = leadOps.getById(leadId);

      console.log(`✍️ ${lead.company} için e-posta hazırlanıyor... (${lead.email})`);
      const subject = `E-Ticaret Verimliliğinizi AI ile Artırın`;
      const body = `Merhaba,\n\n${lead.website} üzerinden e-ticaret faaliyetlerinizi inceledim. Operasyonel süreçlerinizi yapay zeka otomasyonları ile nasıl hızlandırabileceğimizi konuşmak isterim.\n\nİyi çalışmalar,\nKullanici Baltalı`;

      const emailId = emailOps.insert({
        lead_id: lead.id,
        subject,
        body,
        type: 'initial',
        status: 'draft'
      });

      console.log(`📧 Gönderiliyor: ${lead.email}`);
      await sendEmail(emailId);
      console.log(`✨ BAŞARIYLA GÖNDERİLDİ!`);
      
      await new Promise(r => setTimeout(r, 5000));
    }
    
    console.log('\n🏁 E-POSTA ODAKLI KAMPANYA TAMAMLANDI.');
  } catch (err) {
    console.error('❌ Hata:', err.message);
  }
}

emailFocusedRun();
