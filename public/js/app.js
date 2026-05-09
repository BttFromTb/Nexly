// ============================================
// LeadPilot — Frontend Application
// ============================================

const API = '';

// ---- STATE ----
let allLeads = [];
let allEmails = [];

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupSearch();
  setupLeadFilters();
  setupModal();
  setupSmtpTest();
  loadDashboard();
});

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${view}`).classList.add('active');

      if (view === 'dashboard') loadDashboard();
      else if (view === 'leads') loadLeads();
      else if (view === 'emails') loadEmails();
      else if (view === 'activity') loadActivity();
    });
  });
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
  try {
    const [stats, leads, activities] = await Promise.all([
      fetch(`${API}/api/dashboard/stats`).then(r => r.json()),
      fetch(`${API}/api/leads`).then(r => r.json()),
      fetch(`${API}/api/activity?limit=10`).then(r => r.json()),
    ]);

    // Stats
    document.getElementById('stat-total-leads').textContent = stats.totalLeads || 0;
    document.getElementById('stat-sent-emails').textContent = stats.sentEmails || 0;
    document.getElementById('stat-replied-emails').textContent = stats.repliedEmails || 0;
    document.getElementById('stat-reply-rate').textContent = (stats.replyRate || 0) + '%';

    // Pipeline
    allLeads = leads;
    renderPipeline(leads);

    // Activity
    renderActivityFeed('dashboard-activity', activities.slice(0, 8));
  } catch (err) {
    console.error('Dashboard yükleme hatası:', err);
  }
}

function renderPipeline(leads) {
  const groups = { new: [], contacted: [], replied: [], converted: [] };
  leads.forEach(l => {
    const s = groups[l.status] ? l.status : 'new';
    groups[s].push(l);
  });

  Object.keys(groups).forEach(status => {
    const list = document.getElementById(`pipe-list-${status}`);
    const badge = document.getElementById(`pipe-${status}`);
    badge.textContent = groups[status].length;
    list.innerHTML = groups[status].slice(0, 5).map(l => `
      <div class="pipe-card" onclick="openLeadModal(${l.id})">
        <div class="pipe-card-name">${esc(l.name)}</div>
        <div class="pipe-card-company">${esc(l.company || '')}</div>
      </div>
    `).join('');
  });
}

// ============================================
// SEARCH
// ============================================
function setupSearch() {
  document.getElementById('btn-search').addEventListener('click', startSearch);
}

async function startSearch() {
  const industry = document.getElementById('search-industry').value.trim();
  const target = document.getElementById('search-target').value.trim();
  const location = document.getElementById('search-location').value.trim();
  const count = parseInt(document.getElementById('search-count').value) || 10;

  if (!industry || !target) {
    showToast('Sektör ve hedef profil zorunludur', 'error');
    return;
  }

  const btn = document.getElementById('btn-search');
  const status = document.getElementById('search-status');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Araştırılıyor...';
  status.className = 'search-status active loading';
  status.innerHTML = '🔍 Apify ile lead araştırması yapılıyor... Bu birkaç dakika sürebilir.';

  try {
    const res = await fetch(`${API}/api/leads/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry, targetProfile: target, location, maxResults: count }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    status.className = 'search-status active success';
    status.innerHTML = `✅ ${data.count} lead bulundu!`;

    renderSearchResults(data.leads || []);
    showToast(`${data.count} lead başarıyla bulundu!`, 'success');
  } catch (err) {
    status.className = 'search-status active error';
    status.innerHTML = `❌ Hata: ${err.message}`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🚀</span> Araştırmayı Başlat';
  }
}

function renderSearchResults(leads) {
  const container = document.getElementById('search-results');
  container.innerHTML = leads.map(l => `
    <div class="result-card">
      <div class="result-info">
        <h3>${esc(l.name)}</h3>
        <p>${esc(l.company || '')} ${l.email ? '• ' + esc(l.email) : '• E-posta bulunamadı'}</p>
        <p>${esc(l.industry || '')} • ${esc(l.location || '')}</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-sm btn-primary" onclick="openLeadByData(${JSON.stringify(l).replace(/"/g,'&quot;')})">Detay</button>
      </div>
    </div>
  `).join('');
}

// ============================================
// LEADS
// ============================================
function setupLeadFilters() {
  document.getElementById('leads-search').addEventListener('input', debounce(filterLeads, 300));
  document.getElementById('leads-filter').addEventListener('change', filterLeads);
}

async function loadLeads() {
  try {
    const leads = await fetch(`${API}/api/leads`).then(r => r.json());
    allLeads = leads;
    renderLeadsTable(leads);
  } catch (err) {
    console.error('Leads yükleme hatası:', err);
  }
}

function filterLeads() {
  const search = document.getElementById('leads-search').value.toLowerCase();
  const status = document.getElementById('leads-filter').value;

  let filtered = allLeads;
  if (status) filtered = filtered.filter(l => l.status === status);
  if (search) filtered = filtered.filter(l =>
    (l.name || '').toLowerCase().includes(search) ||
    (l.company || '').toLowerCase().includes(search) ||
    (l.email || '').toLowerCase().includes(search)
  );

  renderLeadsTable(filtered);
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leads-tbody');
  tbody.innerHTML = leads.map(l => `
    <tr onclick="openLeadModal(${l.id})">
      <td><strong>${esc(l.name)}</strong></td>
      <td>${esc(l.company || '-')}</td>
      <td>${esc(l.email || '-')}</td>
      <td>${esc(l.industry || '-')}</td>
      <td><span class="status-badge status-${l.status}">${statusLabel(l.status)}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); generateEmail(${l.id})">✉️ E-posta Yaz</button>
      </td>
    </tr>
  `).join('');
}

// ============================================
// EMAILS
// ============================================
async function loadEmails() {
  try {
    const emails = await fetch(`${API}/api/emails`).then(r => r.json());
    allEmails = emails;
    renderEmailsList(emails);
  } catch (err) {
    console.error('Emails yükleme hatası:', err);
  }
}

function renderEmailsList(emails) {
  const container = document.getElementById('emails-list');
  if (!emails.length) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Henüz e-posta yok. Bir lead seçip e-posta yazdırın.</p>';
    return;
  }

  container.innerHTML = emails.map(e => `
    <div class="email-card">
      <div class="email-header">
        <span class="email-to">👤 ${esc(e.lead_name || 'Bilinmiyor')} — ${esc(e.lead_company || '')}</span>
        <span class="status-badge status-${e.status === 'sent' ? 'contacted' : e.status === 'replied' ? 'replied' : 'new'}">${e.status}</span>
      </div>
      <div class="email-subject">${esc(e.subject)}</div>
      <div class="email-preview">${esc(e.body?.substring(0, 200) || '')}</div>
      <div class="email-footer">
        <span class="email-date">${e.sent_at ? timeAgo(e.sent_at) : 'Taslak'} • ${e.type}</span>
        <div style="display:flex;gap:8px;">
          ${e.status === 'draft' ? `<button class="btn btn-sm btn-success" onclick="sendSingleEmail(${e.id})">📧 Gönder</button>` : ''}
          ${e.status === 'sent' ? `<button class="btn btn-sm btn-ghost" onclick="markReplied(${e.id})">💬 Cevap Geldi</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// ACTIVITY
// ============================================
async function loadActivity() {
  try {
    const activities = await fetch(`${API}/api/activity?limit=100`).then(r => r.json());
    renderActivityFeed('activity-feed', activities);
  } catch (err) {
    console.error('Activity yükleme hatası:', err);
  }
}

function renderActivityFeed(containerId, activities) {
  const container = document.getElementById(containerId);
  if (!activities.length) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:16px;">Henüz aktivite yok.</p>';
    return;
  }

  container.innerHTML = activities.map(a => {
    const icon = getActivityIcon(a.action);
    return `
      <div class="activity-item">
        <div class="activity-icon ${icon.cls}">${icon.emoji}</div>
        <div class="activity-text"><strong>${esc(a.lead_name || 'Sistem')}</strong> — ${esc(a.details || a.action)}</div>
        <div class="activity-time">${timeAgo(a.created_at)}</div>
      </div>
    `;
  }).join('');
}

// ============================================
// MODAL
// ============================================
function setupModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

async function openLeadModal(id) {
  try {
    const lead = await fetch(`${API}/api/leads/${id}`).then(r => r.json());
    const content = document.getElementById('modal-content');

    content.innerHTML = `
      <h2>${esc(lead.name)}</h2>
      <div class="detail-grid">
        <div class="detail-item"><label>Şirket</label><span>${esc(lead.company || '-')}</span></div>
        <div class="detail-item"><label>Unvan</label><span>${esc(lead.title || '-')}</span></div>
        <div class="detail-item"><label>E-posta</label><span>${esc(lead.email || '-')}</span></div>
        <div class="detail-item"><label>Telefon</label><span>${esc(lead.phone || '-')}</span></div>
        <div class="detail-item"><label>Sektör</label><span>${esc(lead.industry || '-')}</span></div>
        <div class="detail-item"><label>Konum</label><span>${esc(lead.location || '-')}</span></div>
        <div class="detail-item"><label>Web Sitesi</label><span>${lead.website ? `<a href="${esc(lead.website)}" target="_blank" style="color:var(--accent-hover)">${esc(lead.website)}</a>` : '-'}</span></div>
        <div class="detail-item"><label>Durum</label><span class="status-badge status-${lead.status}">${statusLabel(lead.status)}</span></div>
      </div>
      ${lead.notes ? `<h3>Notlar</h3><div class="email-preview-box">${esc(lead.notes)}</div>` : ''}
      ${lead.emails?.length ? `
        <h3>E-postalar (${lead.emails.length})</h3>
        ${lead.emails.map(e => `
          <div class="email-preview-box">
            <strong>${esc(e.subject)}</strong>
            <span class="status-badge status-${e.status === 'sent' ? 'contacted' : 'new'}" style="margin-left:8px;font-size:0.7rem;">${e.status}</span>
            <p style="margin-top:8px;color:var(--text-secondary)">${esc(e.body?.substring(0, 300) || '')}</p>
          </div>
        `).join('')}
      ` : ''}
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="generateEmail(${lead.id})">✉️ AI E-posta Yaz</button>
        ${lead.status === 'new' ? `<button class="btn btn-ghost" onclick="updateLeadStatus(${lead.id}, 'contacted')">📤 İletişime Geçildi</button>` : ''}
        ${lead.status === 'contacted' ? `<button class="btn btn-success" onclick="updateLeadStatus(${lead.id}, 'replied')">💬 Cevap Geldi</button>` : ''}
        ${lead.status === 'replied' ? `<button class="btn btn-success" onclick="updateLeadStatus(${lead.id}, 'converted')">🎉 Dönüşüm!</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteLead(${lead.id})" style="margin-left:auto;">🗑️ Sil</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.add('active');
  } catch (err) {
    showToast('Lead detayı yüklenemedi', 'error');
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// ============================================
// API ACTIONS
// ============================================
async function generateEmail(leadId) {
  showToast('AI e-posta yazıyor...', 'info');
  try {
    const res = await fetch(`${API}/api/emails/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('E-posta yazıldı!', 'success');
    closeModal();

    // E-posta önizleme modalı aç
    showEmailPreview(data, leadId);
  } catch (err) {
    showToast(`Hata: ${err.message}`, 'error');
  }
}

function showEmailPreview(emailData, leadId) {
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <h2>✉️ AI E-posta Önizlemesi</h2>
    <div class="form-group">
      <label>Konu</label>
      <div class="email-preview-box" style="font-weight:600;">${esc(emailData.subject)}</div>
    </div>
    <div class="form-group">
      <label>İçerik</label>
      <div class="email-preview-box">${emailData.html_body || esc(emailData.body)}</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-success" onclick="sendSingleEmail(${emailData.emailId})">📧 Gönder</button>
      <button class="btn btn-primary" onclick="generateEmail(${leadId})">🔄 Yeniden Yaz</button>
      <button class="btn btn-ghost" onclick="closeModal()">İptal</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

async function sendSingleEmail(emailId) {
  showToast('E-posta gönderiliyor...', 'info');
  try {
    const res = await fetch(`${API}/api/emails/${emailId}/send`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`E-posta gönderildi: ${data.to}`, 'success');
    closeModal();
    loadEmails();
    loadDashboard();
  } catch (err) {
    showToast(`Gönderim hatası: ${err.message}`, 'error');
  }
}

async function markReplied(emailId) {
  try {
    await fetch(`${API}/api/emails/${emailId}/replied`, { method: 'POST' });
    showToast('Cevap alındı olarak işaretlendi!', 'success');
    loadEmails();
    loadDashboard();
  } catch (err) {
    showToast('Hata', 'error');
  }
}

async function updateLeadStatus(id, status) {
  try {
    await fetch(`${API}/api/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    showToast(`Durum güncellendi: ${statusLabel(status)}`, 'success');
    closeModal();
    loadDashboard();
    loadLeads();
  } catch (err) {
    showToast('Hata', 'error');
  }
}

async function deleteLead(id) {
  if (!confirm('Bu lead silinecek. Emin misiniz?')) return;
  try {
    await fetch(`${API}/api/leads/${id}`, { method: 'DELETE' });
    showToast('Lead silindi', 'success');
    closeModal();
    loadDashboard();
    loadLeads();
  } catch (err) {
    showToast('Hata', 'error');
  }
}

// ============================================
// SMTP TEST
// ============================================
function setupSmtpTest() {
  document.getElementById('btn-smtp-test').addEventListener('click', async () => {
    showToast('SMTP bağlantısı test ediliyor...', 'info');
    try {
      const data = await fetch(`${API}/api/smtp/test`).then(r => r.json());
      if (data.success) {
        showToast('SMTP bağlantısı başarılı! ✅', 'success');
      } else {
        showToast(`SMTP hatası: ${data.message}\n${data.hint || ''}`, 'error');
      }
    } catch (err) {
      showToast('SMTP test hatası', 'error');
    }
  });
}

// ============================================
// HELPERS
// ============================================
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function statusLabel(s) {
  const map = { new: 'Yeni', contacted: 'İletişime Geçildi', replied: 'Cevap Geldi', converted: 'Dönüşüm', lost: 'Kayıp' };
  return map[s] || s;
}

function getActivityIcon(action) {
  const icons = {
    search_started: { emoji: '🔍', cls: 'search' },
    lead_found: { emoji: '👤', cls: 'lead' },
    email_generated: { emoji: '✍️', cls: 'email' },
    email_sent: { emoji: '📧', cls: 'email' },
    email_failed: { emoji: '❌', cls: 'error' },
    followup_scheduled: { emoji: '📅', cls: 'followup' },
    reply_received: { emoji: '💬', cls: 'reply' },
    status_changed: { emoji: '🔄', cls: 'lead' },
    lead_lost: { emoji: '😢', cls: 'error' },
  };
  return icons[action] || { emoji: '📌', cls: 'lead' };
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  const days = Math.floor(hrs / 24);
  return `${days}g önce`;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${esc(msg)}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// Make functions global
window.openLeadModal = openLeadModal;
window.generateEmail = generateEmail;
window.sendSingleEmail = sendSingleEmail;
window.markReplied = markReplied;
window.updateLeadStatus = updateLeadStatus;
window.deleteLead = deleteLead;
window.openLeadByData = (lead) => {
  if (lead.id) openLeadModal(lead.id);
};
