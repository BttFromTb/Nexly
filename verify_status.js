import { initDatabase, emailOps } from './database/db.js';

async function verify() {
  await initDatabase();
  const emails = emailOps.getAll();
  console.log('--- VERİTABANI DURUMU ---');
  if (emails.length === 0) {
    console.log('Veritabanında hiç e-posta kaydı yok!');
  } else {
    emails.forEach(e => {
      console.log(`ID: ${e.id} | Kime: ${e.lead_name || 'Bilinmiyor'} | Durum: ${e.status} | Tarih: ${e.created_at}`);
    });
  }
}

verify();
