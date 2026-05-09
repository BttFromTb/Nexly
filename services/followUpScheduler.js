import cron from 'node-cron';
import dotenv from 'dotenv';
import { followupOps, emailOps, leadOps, activityOps } from '../database/db.js';
import { writeFollowUpEmail } from './emailWriter.js';
import { sendEmail } from './emailSender.js';

dotenv.config();

export function startFollowUpScheduler() {
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Follow-up kontrolü...');
    await processFollowUps();
  });
  console.log('📅 Follow-up zamanlayıcısı aktif (her saat)');
}

export async function processFollowUps() {
  const pending = followupOps.getPending();
  if (!pending.length) { console.log('✅ Bekleyen follow-up yok'); return []; }

  console.log(`📬 ${pending.length} follow-up bulundu`);
  const results = [];

  for (const f of pending) {
    try {
      const lead = leadOps.getById(f.lead_id);
      if (!lead || !lead.email || lead.status === 'replied' || lead.status === 'converted') {
        followupOps.updateStatus(f.id, 'cancelled');
        continue;
      }
      if (f.followup_number > 2) {
        followupOps.updateStatus(f.id, 'cancelled');
        leadOps.updateStatus(lead.id, 'lost');
        activityOps.log(lead.id, 'lead_lost', 'Maks follow-up aşıldı');
        continue;
      }

      const prevEmails = emailOps.getByLeadId(lead.id);
      const content = await writeFollowUpEmail(lead, f.followup_number, prevEmails);
      const emailId = emailOps.insert({
        lead_id: lead.id, subject: content.subject, body: content.body,
        html_body: content.html_body, type: `followup_${f.followup_number}`, status: 'draft',
      });

      await sendEmail(emailId);
      followupOps.updateStatus(f.id, 'sent');

      if (f.followup_number < 2) {
        const days = parseInt(process.env.FOLLOWUP_DAYS_SECOND) || 5;
        const d = new Date(); d.setDate(d.getDate() + days);
        followupOps.insert({ lead_id: lead.id, email_id: emailId, scheduled_at: d.toISOString(), followup_number: f.followup_number + 1 });
      }

      results.push({ leadId: lead.id, name: lead.name, status: 'sent' });
      await new Promise(r => setTimeout(r, 15000));
    } catch (err) {
      console.error(`❌ Follow-up hatası:`, err.message);
      results.push({ leadId: f.lead_id, status: 'error', error: err.message });
    }
  }
  return results;
}

export default { startFollowUpScheduler, processFollowUps };
