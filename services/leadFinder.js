import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import { leadOps, activityOps } from '../database/db.js';

dotenv.config();

const client = new ApifyClient({ token: process.env.APIFY_API_KEY });

export async function searchGoogleMaps(query, location = '', maxResults = 20) {
  console.log(`🔍 Google Maps araması: "${query}" ${location ? 'in ' + location : ''}`);

  const input = {
    searchStringsArray: [query],
    locationQuery: location || undefined,
    maxCrawledPlacesPerSearch: maxResults,
    language: 'tr',
    scrapeEmails: true,
    scrapeContacts: true,
  };

  try {
    const run = await client.actor('compass/crawler-google-places').call(input, { waitSecs: 300 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`✅ ${items.length} sonuç bulundu`);

    return items.map(item => ({
      name: item.contactName || item.title || 'Bilinmiyor',
      title: item.categoryName || item.category || '',
      company: item.title || item.name || '',
      email: item.email || item.emails?.[0] || '',
      phone: item.phone || item.phoneUnformatted || '',
      website: item.website || item.url || '',
      industry: item.categoryName || item.category || query,
      location: item.address || item.city || location,
      company_size: item.totalScore ? `Rating: ${item.totalScore}` : '',
      notes: [
        item.totalScore ? `⭐ ${item.totalScore}/5` : '',
        item.reviewsCount ? `📝 ${item.reviewsCount} yorum` : '',
        item.description || ''
      ].filter(Boolean).join(' | '),
      source: 'google_maps',
      search_query: `${query} ${location}`.trim(),
    }));
  } catch (error) {
    console.error('❌ Google Maps hatası:', error.message);
    throw error;
  }
}

export async function searchGoogle(query, maxResults = 10) {
  console.log(`🔎 Google araması: "${query}"`);

  try {
    const run = await client.actor('apify/google-search-scraper').call({
      queries: query,
      maxPagesPerQuery: 1,
      resultsPerPage: maxResults,
      languageCode: 'tr',
    }, { waitSecs: 120 });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const results = [];
    for (const item of items) {
      if (item.organicResults) {
        for (const r of item.organicResults) {
          results.push({ title: r.title, url: r.url, description: r.description });
        }
      }
    }
    return results;
  } catch (error) {
    console.error('❌ Google search hatası:', error.message);
    return [];
  }
}

export async function fullLeadSearch(industry, targetProfile, location = 'Türkiye', maxResults = 10) {
  console.log('🚀 Lead araştırma başlatılıyor...');
  const searchQuery = `${industry} ${targetProfile}`;
  let leads = [];

  try {
    leads = await searchGoogleMaps(searchQuery, location, maxResults);
  } catch (err) {
    console.log('⚠️ Google Maps başarısız, Google Search deneniyor...');
    const results = await searchGoogle(`${searchQuery} ${location} email contact`, maxResults);
    leads = results.map(r => ({
      name: r.title?.split(' - ')[0]?.split(' | ')[0]?.trim() || 'Bilinmiyor',
      title: targetProfile, company: r.title || '', email: '', phone: '',
      website: r.url || '', industry, location,
      company_size: '', notes: r.description || '',
      source: 'google_search', search_query: searchQuery,
    }));
  }

  const valid = leads.filter(l => l.name && l.name !== 'Bilinmiyor');
  if (valid.length > 0) {
    const ids = leadOps.insertMany(valid);
    console.log(`💾 ${ids.length} lead kaydedildi`);
    ids.forEach((id, i) => activityOps.log(id, 'lead_found', `Yeni lead: ${valid[i]?.company || ''}`));
  }

  return valid;
}

export default { searchGoogleMaps, searchGoogle, fullLeadSearch };
