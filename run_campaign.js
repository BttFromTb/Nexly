import { runAutoPilot } from './services/autoPilot.js';
import { sendEmail } from './services/emailSender.js';
import { emailOps, initDatabase } from './database/db.js';
import dotenv from 'dotenv';

dotenv.config();

import nodemailer from 'nodemailer';

async function runFullCampaign() {
  const industry = "E-ticaret";
  const target = "Sahibi";
  const location = "Türkiye";
  const count = 5;

  console.log(`🚀 KAMPANYA BAŞLATILDI: ${industry} in ${location}`);
  
  // 1. Otopilotu Çalıştır (Arama + Yazım + Gönderim)
  await runAutoPilot(industry, target, location, count);

  console.log('\n📊 Kampanya özeti hazırlanıyor...');
  
  // 2. Özet E-postası Hazırla
  const summarySubject = `Nexly Kampanya Raporu: ${industry}`;
  const summaryBody = `Merhaba Kullanici,\n\n"${industry}" sektörüne yönelik başlattığın otopilot kampanyası tamamlandı.\n\n` +
    `Sektör: ${industry}\n` +
    `Hedef: ${target}\n` +
    `Konum: ${location}\n\n` +
    `İşlem detaylarını ve gönderilen e-postaları sistem panelinden veya veritabanından görebilirsin.\n\n` +
    `Sistem artık Gemini API ile tam kapasite çalışıyor.\n\n` +
    `İyi çalışmalar!`;

  // 3. Kullanıcıya Raporu Gönder
  // Sistemde kullanıcıya mail atmak için basit bir yöntem: 
  // User'ın e-postasına doğrudan SMTP üzerinden bir bilgilendirme atıyoruz.
  try {
    await initDatabase();
    // dummy bir lead_id veya doğrudan emailSender içindeki transporter'ı kullanabiliriz
    // Ama biz sistemi bozmadan bir taslak oluşturup gönderelim
    const reportEmailId = emailOps.insert({
      lead_id: null, // Sistem raporu
      subject: summarySubject,
      body: summaryBody,
      html_body: `<div style="font-family:sans-serif;">${summaryBody.replace(/\n/g, '<br>')}</div>`,
      type: 'report',
      status: 'draft'
    });

    // emailSender.js'deki sendEmail fonksiyonu lead aradığı için manuel gönderelim
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Kendine gönder
      subject: summarySubject,
      text: summaryBody,
    });

    console.log('✅ Rapor e-postası sana gönderildi.');
  } catch (err) {
    console.error('❌ Rapor gönderilirken hata oluştu:', err.message);
  }
}

runFullCampaign();

