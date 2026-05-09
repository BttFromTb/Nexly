import { initDatabase, emailOps } from './database/db.js';
import { sendEmail } from './services/emailSender.js';

async function fixAndSend() {
  await initDatabase();
  const emails = emailOps.getAll();
  const drafts = emails.filter(e => e.status === 'draft');

  if (drafts.length === 0) {
    console.log('Gönderilecek taslak bulunamadı.');
    return;
  }

  console.log(`${drafts.length} taslak gönderiliyor...`);

  for (const email of drafts) {
    try {
      console.log(`Gönderiliyor ID: ${email.id} -> ${email.lead_name || 'Bilinmiyor'}`);
      await sendEmail(email.id);
      console.log(`✅ ID ${email.id} BAŞARIYLA GÖNDERİLDİ!`);
      // Rate limit
      await new Promise(r => setTimeout(r, 5000));
    } catch (err) {
      console.error(`❌ ID ${email.id} HATASI: ${err.message}`);
    }
  }
}

fixAndSend();
