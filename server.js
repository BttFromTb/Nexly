import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import { initDatabase, leadOps, emailOps, followupOps, activityOps, getDashboardStats } from './database/db.js';
import { fullLeadSearch } from './services/leadFinder.js';
import { writeInitialEmail, writeFollowUpEmail, writeReplyEmail } from './services/emailWriter.js';
import { sendEmail, sendBulkEmails, testConnection } from './services/emailSender.js';
import { startFollowUpScheduler, processFollowUps } from './services/followUpScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- DASHBOARD ----
app.get('/api/dashboard/stats', (req, res) => {
  try { res.json(getDashboardStats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- LEADS ----
app.get('/api/leads', (req, res) => {
  try {
    const { status, search } = req.query;
    let leads;
    if (search) leads = leadOps.search(search);
    else if (status) leads = leadOps.getByStatus(status);
    else leads = leadOps.getAll();
    res.json(leads);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/leads/:id', (req, res) => {
  try {
    const lead = leadOps.getById(parseInt(req.params.id));
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    lead.emails = emailOps.getByLeadId(lead.id);
    lead.followups = followupOps.getByLeadId(lead.id);
    res.json(lead);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/leads/:id', (req, res) => {
  try { leadOps.delete(parseInt(req.params.id)); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/leads/:id/status', (req, res) => {
  try {
    leadOps.updateStatus(parseInt(req.params.id), req.body.status);
    activityOps.log(parseInt(req.params.id), 'status_changed', `Durum: ${req.body.status}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- LEAD SEARCH (Apify) ----
app.post('/api/leads/search', async (req, res) => {
  try {
    const { industry, targetProfile, location, maxResults } = req.body;
    if (!industry || !targetProfile) return res.status(400).json({ error: 'Sektör ve hedef profil zorunlu' });
    activityOps.log(null, 'search_started', `Araştırma: ${industry} - ${targetProfile}`);
    const leads = await fullLeadSearch(industry, targetProfile, location || 'Türkiye', maxResults || 10);
    res.json({ success: true, count: leads.length, leads });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- EMAILS ----
app.get('/api/emails', (req, res) => {
  try { res.json(emailOps.getAll()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/emails/generate', async (req, res) => {
  try {
    const lead = leadOps.getById(req.body.leadId);
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    const content = await writeInitialEmail(lead);
    const emailId = emailOps.insert({
      lead_id: lead.id, subject: content.subject, body: content.body,
      html_body: content.html_body, type: 'initial', status: 'draft',
    });
    activityOps.log(lead.id, 'email_generated', `AI e-posta: "${content.subject}"`);
    res.json({ success: true, emailId, ...content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/emails/:id/send', async (req, res) => {
  try { res.json(await sendEmail(parseInt(req.params.id))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/emails/send-bulk', async (req, res) => {
  try { res.json({ success: true, results: await sendBulkEmails(req.body.emailIds) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/emails/:id/replied', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    emailOps.markReplied(id);
    const email = emailOps.getById(id);
    if (email) {
      leadOps.updateStatus(email.lead_id, 'replied');
      followupOps.cancelForLead(email.lead_id);
      activityOps.log(email.lead_id, 'reply_received', 'Cevap alındı! Follow-up iptal.');
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/emails/reply', async (req, res) => {
  try {
    const lead = leadOps.getById(req.body.leadId);
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    const content = await writeReplyEmail(lead, req.body.receivedMessage);
    const emailId = emailOps.insert({
      lead_id: lead.id, subject: content.subject, body: content.body,
      html_body: content.html_body, type: 'reply', status: 'draft',
    });
    res.json({ success: true, emailId, ...content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- FOLLOWUPS ----
app.post('/api/followups/process', async (req, res) => {
  try { res.json({ success: true, results: await processFollowUps() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- ACTIVITY ----
app.get('/api/activity', (req, res) => {
  try { res.json(activityOps.getRecent(parseInt(req.query.limit) || 50)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- SMTP TEST ----
app.get('/api/smtp/test', async (req, res) => {
  try { res.json(await testConnection()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- SPA Fallback ----
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ---- START ----
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`\n🚀 ═══════════════════════════════════════`);
    console.log(`   Nexly v1.0 — http://localhost:${PORT}`);
    console.log(`═══════════════════════════════════════════\n`);
    startFollowUpScheduler();
  });
}

start().catch(err => { console.error('Başlatma hatası:', err); process.exit(1); });

