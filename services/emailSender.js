import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { emailOps, leadOps, activityOps, followupOps } from '../database/db.js';

dotenv.config();

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

export async function sendEmail(emailId) {
  const email = emailOps.getById(emailId);
  if (!email) throw new Error(`E-posta bulunamadı: ${emailId}`);

  const lead = leadOps.getById(email.lead_id);
  if (!lead) throw new Error(`Lead bulunamadı: ${email.lead_id}`);
  if (!lead.email) throw new Error(`Lead'in e-posta adresi yok: ${lead.name}`);

  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Nexly'}" <${process.env.SMTP_USER}>`,
      to: lead.email,
      subject: email.subject,
      text: email.body,
      html: email.html_body || email.body,
    });

    console.log(`📧 E-posta gönderildi: ${lead.email}`);
    emailOps.markSent(emailId);
    leadOps.updateStatus(lead.id, 'contacted');
    activityOps.log(lead.id, 'email_sent', `E-posta gönderildi: "${email.subject}" → ${lead.email}`);

    if (email.type === 'initial') {
      const days = parseInt(process.env.FOLLOWUP_DAYS_FIRST) || 3;
      const d = new Date(); d.setDate(d.getDate() + days);
      followupOps.insert({ lead_id: lead.id, email_id: emailId, scheduled_at: d.toISOString(), followup_number: 1 });
      activityOps.log(lead.id, 'followup_scheduled', `1. takip: ${d.toLocaleDateString('tr-TR')}`);
    }

    return { success: true, messageId: info.messageId, to: lead.email };
  } catch (error) {
    console.error(`❌ Gönderim hatası: ${error.message}`);
    emailOps.updateStatus(emailId, 'failed');
    activityOps.log(lead.id, 'email_failed', `Hata: ${error.message}`);
    throw error;
  }
}

export async function sendBulkEmails(emailIds, delayMs = 30000) {
  const results = [];
  for (let i = 0; i < emailIds.length; i++) {
    try {
      results.push({ id: emailIds[i], ...(await sendEmail(emailIds[i])) });
    } catch (e) {
      results.push({ id: emailIds[i], success: false, error: e.message });
    }
    if (i < emailIds.length - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}

export async function testConnection() {
  try {
    await getTransporter().verify();
    return { success: true, message: 'SMTP bağlantısı başarılı' };
  } catch (e) {
    return { success: false, message: e.message, hint: 'Gmail App Password gerekli: https://myaccount.google.com/apppasswords' };
  }
}

export default { sendEmail, sendBulkEmails, testConnection };

