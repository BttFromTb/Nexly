import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

// =============================================
// İlk Cold E-posta Yaz (Gemini ile)
// =============================================
export async function writeInitialEmail(lead, senderInfo = {}) {
  const senderName = senderInfo.name || process.env.SMTP_FROM_NAME || 'Kullanici';

  const prompt = `Sen bir B2B satış ve cold e-posta uzmanısın. Yapay zeka otomasyon çözümleri satan bir profesyonel adına müşteri adayına kişiselleştirilmiş bir cold e-posta yaz.

HEDEFİMİZ: Kişiyle bir görüşme/toplantı ayarlamak.

KİŞİ BİLGİLERİ:
- İsim: ${lead.name}
- Unvan: ${lead.title || 'Belirtilmemiş'}
- Şirket: ${lead.company || 'Belirtilmemiş'}
- Sektör: ${lead.industry || 'Belirtilmemiş'}
- Ek Bilgiler: ${lead.notes || 'Yok'}

KURALLAR:
1. TÜRKÇE yaz.
2. Maksimum 120 kelime olsun.
3. Kişiye özel ve doğal olsun.
4. Çıktı sadece JSON formatında olsun.

JSON FORMATI:
{
  "subject": "Konu satırı",
  "body": "E-posta metni",
  "html_body": "E-posta metni (HTML)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON ayıklama (bazen Gemini ```json ... ``` içinde döndürebilir)
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      subject: parsed.subject,
      body: parsed.body,
      html_body: parsed.html_body || wrapInHtmlTemplate(parsed.body, senderName),
    };
  } catch (error) {
    console.error('❌ Gemini e-posta yazma hatası:', error.message);
    throw error;
  }
}

// =============================================
// Follow-up E-posta Yaz
// =============================================
export async function writeFollowUpEmail(lead, followupNumber, previousEmails = []) {
  const senderName = process.env.SMTP_FROM_NAME || 'Kullanici';
  const prompt = `Sen bir B2B satış uzmanısın. ${followupNumber}. takip e-postasını yaz. 
  Kişi: ${lead.name}, Şirket: ${lead.company}. 
  Önceki deneme başarısız oldu. Kısa ve nazik bir hatırlatma yap. Sadece JSON döndür.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      subject: parsed.subject,
      body: parsed.body,
      html_body: parsed.html_body || wrapInHtmlTemplate(parsed.body, senderName),
    };
  } catch (error) {
    console.error('❌ Gemini follow-up hatası:', error.message);
    throw error;
  }
}

// =============================================
// Cevap E-postası Yaz
// =============================================
export async function writeReplyEmail(lead, receivedMessage) {
  const senderName = process.env.SMTP_FROM_NAME || 'Kullanici';
  const prompt = `Müşteriden gelen şu cevaba yanıt yaz: "${receivedMessage}". Kişi: ${lead.name}. Sadece JSON döndür.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      subject: parsed.subject,
      body: parsed.body,
      html_body: parsed.html_body || wrapInHtmlTemplate(parsed.body, senderName),
    };
  } catch (error) {
    console.error('❌ Gemini yanıt hatası:', error.message);
    throw error;
  }
}

function wrapInHtmlTemplate(text, senderName) {
  const paragraphs = text.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
  return `<div style="font-family:sans-serif;color:#333;">${paragraphs}<br><p>Saygılarımla,<br><strong>${senderName}</strong></p></div>`;
}

export default { writeInitialEmail, writeFollowUpEmail, writeReplyEmail };
