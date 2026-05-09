import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'data', 'nexly.db');

let db = null;

// Save DB to file periodically
function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, title TEXT, company TEXT, email TEXT, phone TEXT,
    website TEXT, industry TEXT, location TEXT, company_size TEXT,
    notes TEXT, source TEXT DEFAULT 'apify', status TEXT DEFAULT 'new',
    search_query TEXT, created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER, subject TEXT NOT NULL, body TEXT NOT NULL,
    html_body TEXT, type TEXT DEFAULT 'initial', status TEXT DEFAULT 'draft',
    sent_at TEXT, replied_at TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER, email_id INTEGER, scheduled_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending', followup_number INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER, action TEXT NOT NULL, details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  saveDb();
  // Auto-save every 30 seconds
  setInterval(saveDb, 30000);

  console.log('✅ Veritabanı başlatıldı');
  return db;
}

// =====================
// HELPER: run queries
// =====================
function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getOne(sql, params = []) {
  const rows = getAll(sql, params);
  return rows[0] || null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
}

// =====================
// Lead Operations
// =====================
export const leadOps = {
  insert(lead) {
    return runSql(
      `INSERT INTO leads (name,title,company,email,phone,website,industry,location,company_size,notes,source,search_query)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [lead.name, lead.title||'', lead.company||'', lead.email||'', lead.phone||'',
       lead.website||'', lead.industry||'', lead.location||'', lead.company_size||'',
       lead.notes||'', lead.source||'apify', lead.search_query||'']
    );
  },

  insertMany(leads) {
    const ids = [];
    for (const lead of leads) {
      ids.push(this.insert(lead));
    }
    return ids;
  },

  getAll() { return getAll('SELECT * FROM leads ORDER BY created_at DESC'); },
  getById(id) { return getOne('SELECT * FROM leads WHERE id = ?', [id]); },
  getByStatus(status) { return getAll('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC', [status]); },

  updateStatus(id, status) {
    runSql("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
  },

  delete(id) { runSql('DELETE FROM leads WHERE id = ?', [id]); },

  count() { return getOne('SELECT COUNT(*) as total FROM leads')?.total || 0; },

  countByStatus() { return getAll('SELECT status, COUNT(*) as count FROM leads GROUP BY status'); },

  search(q) {
    return getAll('SELECT * FROM leads WHERE name LIKE ? OR company LIKE ? OR email LIKE ? ORDER BY created_at DESC',
      [`%${q}%`, `%${q}%`, `%${q}%`]);
  }
};

// =====================
// Email Operations
// =====================
export const emailOps = {
  insert(e) {
    return runSql(
      `INSERT INTO emails (lead_id,subject,body,html_body,type,status) VALUES (?,?,?,?,?,?)`,
      [e.lead_id, e.subject, e.body, e.html_body||'', e.type||'initial', e.status||'draft']
    );
  },

  getById(id) { return getOne('SELECT * FROM emails WHERE id = ?', [id]); },

  getByLeadId(leadId) { return getAll('SELECT * FROM emails WHERE lead_id = ? ORDER BY created_at DESC', [leadId]); },

  getAll() {
    return getAll(`SELECT e.*, l.name as lead_name, l.company as lead_company
      FROM emails e LEFT JOIN leads l ON e.lead_id = l.id ORDER BY e.created_at DESC`);
  },

  markSent(id) { runSql("UPDATE emails SET status = 'sent', sent_at = datetime('now') WHERE id = ?", [id]); },
  markReplied(id) { runSql("UPDATE emails SET status = 'replied', replied_at = datetime('now') WHERE id = ?", [id]); },
  updateStatus(id, status) { runSql('UPDATE emails SET status = ? WHERE id = ?', [status, id]); },

  count() { return getOne('SELECT COUNT(*) as total FROM emails')?.total || 0; },
  countByStatus() { return getAll('SELECT status, COUNT(*) as count FROM emails GROUP BY status'); },
  countByType() { return getAll('SELECT type, COUNT(*) as count FROM emails GROUP BY type'); },
};

// =====================
// Followup Operations
// =====================
export const followupOps = {
  insert(f) {
    return runSql(
      'INSERT INTO followups (lead_id,email_id,scheduled_at,followup_number) VALUES (?,?,?,?)',
      [f.lead_id, f.email_id, f.scheduled_at, f.followup_number||1]
    );
  },

  getPending() {
    return getAll(`SELECT f.*, l.name as lead_name, l.email as lead_email, l.company as lead_company
      FROM followups f JOIN leads l ON f.lead_id = l.id
      WHERE f.status = 'pending' AND f.scheduled_at <= datetime('now')`);
  },

  updateStatus(id, status) { runSql('UPDATE followups SET status = ? WHERE id = ?', [status, id]); },
  cancelForLead(leadId) { runSql("UPDATE followups SET status = 'cancelled' WHERE lead_id = ? AND status = 'pending'", [leadId]); },
  getByLeadId(leadId) { return getAll('SELECT * FROM followups WHERE lead_id = ? ORDER BY created_at DESC', [leadId]); },
};

// =====================
// Activity Log
// =====================
export const activityOps = {
  log(leadId, action, details) {
    runSql('INSERT INTO activity_log (lead_id,action,details) VALUES (?,?,?)', [leadId, action, details]);
  },

  getRecent(limit = 50) {
    return getAll(`SELECT a.*, l.name as lead_name FROM activity_log a
      LEFT JOIN leads l ON a.lead_id = l.id ORDER BY a.created_at DESC LIMIT ?`, [limit]);
  }
};

// =====================
// Dashboard Stats
// =====================
export function getDashboardStats() {
  const totalLeads = leadOps.count();
  const leadsByStatus = leadOps.countByStatus();
  const totalEmails = emailOps.count();
  const emailsByStatus = emailOps.countByStatus();

  const sent = emailsByStatus.find(e => e.status === 'sent')?.count || 0;
  const replied = emailsByStatus.find(e => e.status === 'replied')?.count || 0;
  const rate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

  return {
    totalLeads,
    leadsByStatus: Object.fromEntries(leadsByStatus.map(s => [s.status, s.count])),
    totalEmails,
    emailsByStatus: Object.fromEntries(emailsByStatus.map(s => [s.status, s.count])),
    sentEmails: sent,
    repliedEmails: replied,
    replyRate: rate
  };
}

export default { initDatabase };

