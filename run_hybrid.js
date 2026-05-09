import { initDatabase, leadOps, emailOps, activityOps } from './database/db.js';
import { fullLeadSearch } from './services/leadFinder.js';
import { sendEmail } from './services/emailSender.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Bu script Claude tarafından manuel olarak hazırlanan e-postaları gönderir
async function runHybridCampaign(industry, target, location, maxResults = 5) {
  console.log(`🚀 HİBRİT KAMPANYA BAŞLATILDI: ${industry}`);
  await initDatabase();

  try {
    // 1. Lead Bul
    const leads = await fullLeadSearch(industry, target, location, maxResults);
    
    if (leads.length === 0) {
      console.log('❌ Lead bulunamadı.');
      return;
    }

    console.log(`✅ ${leads.length} lead bulundu. E-postalar Claude tarafından hazırlanıyor...`);

    for (const lead of leads) {
      if (!lead.email) continue;

      // Claude tarafından yazılmış yüksek kaliteli taslak
      const subject = `E-ticaret Operasyonlarınızda Yapay Zeka Dönüşümü`;
      const body = `Merhaba ${lead.name},\n\n${lead.company} bünyesinde e-ticaret süreçlerini yönettiğinizi gördüm. Özellikle sipariş takibi, müşteri desteği ve stok yönetimi gibi manuel süreçlerinizi yapay zeka otomasyonları ile nasıl %80 oranında hızlandırabileceğimizi konuşmak isterim.\n\nBirçok e-ticaret işletmesi bu otomasyonlar sayesinde operasyonel maliyetlerini ciddi oranda düşürdü. Sizin için de benzer bir yapı kurabiliriz.\n\nKısa bir görüşme için uygun olduğunuz zamanı iletirseniz çok sevinirim.\n\nİyi çalışmalar,\nKullanici Baltalı`;

      const emailId = emailOps.insert({
        lead_id: lead.id,
        subject,
        body,
        type: 'initial',
        status: 'draft'
      });

      console.log(`📧 Gönderiliyor: ${lead.email}`);
      await sendEmail(emailId);
      console.log(`✅ Başarılı: ${lead.company}`);
      
      await new Promise(r => setTimeout(r, 10000));
    }

    // Rapor Gönder
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: `Nexly Kampanya Özeti: ${industry}`,
      text: `Kampanya başarıyla tamamlandı. Bulunan lead'ler için e-postalar gönderildi. Detaylar sistemde kayıtlı.`,
    });
    
    console.log('🏁 İşlem tamamlandı ve raporun mailine gönderildi.');
  } catch (err) {
    console.error('Hata:', err.message);
  }
}

runHybridCampaign("E-ticaret", "Sahibi", "Türkiye", 5);

