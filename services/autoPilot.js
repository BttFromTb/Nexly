import { initDatabase, leadOps, emailOps, activityOps } from '../database/db.js';
import { fullLeadSearch } from './leadFinder.js';
import { writeInitialEmail } from './emailWriter.js';
import { sendEmail } from './emailSender.js';
import dotenv from 'dotenv';

dotenv.config();

export async function runAutoPilot(industry, targetProfile, location = 'Türkiye', maxResults = 5) {
  console.log(`\n🚀 OTOPİLOT BAŞLATILDI`);
  console.log(`📍 Sektör: ${industry} | Hedef: ${targetProfile} | Konum: ${location}`);
  
  await initDatabase();

  try {
    // 1. Lead Bul
    activityOps.log(null, 'search_started', `Otopilot: ${industry} - ${targetProfile}`);
    const leads = await fullLeadSearch(industry, targetProfile, location, maxResults);
    
    if (leads.length === 0) {
      console.log('❌ Hiç lead bulunamadı.');
      return;
    }

    console.log(`✅ ${leads.length} lead bulundu. E-postalar hazırlanıyor...`);

    for (const lead of leads) {
      if (!lead.email) {
        console.log(`⏩ ${lead.company} için e-posta yok, geçiliyor.`);
        continue;
      }

      try {
        // 2. E-posta Yaz
        console.log(`✍️ ${lead.company} için e-posta yazılıyor...`);
        const emailContent = await writeInitialEmail(lead);
        
        // 3. Veritabanına Kaydet
        const emailId = emailOps.insert({
          lead_id: lead.id,
          subject: emailContent.subject,
          body: emailContent.body,
          html_body: emailContent.html_body,
          type: 'initial',
          status: 'draft',
        });

        // 4. E-postayı Gönder
        console.log(`📧 E-posta gönderiliyor: ${lead.email}`);
        await sendEmail(emailId);
        
        console.log(`✨ Başarılı: ${lead.company}`);
        
        // Rate limiting for safety
        await new Promise(r => setTimeout(r, 10000)); 
      } catch (err) {
        console.error(`❌ ${lead.company} işlenirken hata:`, err.message);
      }
    }

    console.log('\n🏁 Otopilot görevi tamamlandı.');
  } catch (error) {
    console.error('❌ Otopilot hatası:', error.message);
  }
}

// CLI desteği için
if (process.argv[1].includes('autoPilot.js')) {
  const [,, industry, target, loc, count] = process.argv;
  if (industry && target) {
    runAutoPilot(industry, target, loc || 'Türkiye', parseInt(count) || 5);
  } else {
    console.log('Kullanım: node services/autoPilot.js "Sektör" "Hedef" "Konum" "Adet"');
  }
}
