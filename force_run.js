import { initDatabase, leadOps, emailOps } from './database/db.js';
import { searchGoogle } from './services/leadFinder.js';
import { sendEmail } from './services/emailSender.js';

async function manualForceRun() {
  console.log('🚀 ZORLAMALI GÖNDERİM BAŞLATILDI');
  await initDatabase();

  const searchQuery = 'site:*.tr "e-ticaret" "@gmail.com" OR "info@"';
  const searchResults = await searchGoogle(searchQuery, 10);
  
  for (const res of searchResults) {
    const emailMatch = res.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;

    if (!email) continue;

    console.log(`🎯 Hedef bulundu: ${email}`);

    try {
      // 1. DB'ye kaydetmeyi dene ama ID'yi bekleme
      const leadId = leadOps.insert({
        name: 'E-Ticaret Yetkilisi',
        company: res.title,
        email: email,
        website: res.url,
        industry: 'E-ticaret'
      });

      // 2. E-posta kaydı
      const emailId = emailOps.insert({
        lead_id: leadId || 1,
        subject: 'E-Ticaret Otomasyonu ile Verimlilik Artışı',
        body: `Merhaba,\n\n${res.url} adresindeki e-ticaret sitenizi inceledim. Operasyonel süreçlerinizi AI ile hızlandırmak üzerine konuşmak isterim.\n\nİyi çalışmalar.`,
        type: 'initial',
        status: 'draft'
      });

      // 3. DOĞRUDAN GÖNDER (EmailId kullanarak)
      console.log(`📧 Mail yola çıkıyor: ${email}`);
      await sendEmail(emailId);
      console.log(`✅ BAŞARIYLA GÖNDERİLDİ: ${email}`);

      await new Promise(r => setTimeout(r, 6000));
    } catch (e) {
      console.log(`❌ Hata (${email}):`, e.message);
    }
  }
  console.log('🏁 TÜM GÖNDERİMLER TAMAMLANDI.');
}

manualForceRun();
