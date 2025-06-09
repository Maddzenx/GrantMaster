// Usage: node scripts/scrape_vinnova_hitta_finansiering.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const URL = 'https://www.vinnova.se/sok-finansiering/hitta-finansiering/';

async function scrapeVinnova() {
  try {
    const { data } = await axios.get(URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GrantMasterBot/1.0)'
      }
    });
    const $ = cheerio.load(data);

    // Try to extract the main content area
    const main = $('main, #main-content, .main-content').first();
    let content = '';

    // Fallback: if no main, use body
    const root = main.length ? main : $('body');

    // Extract main heading
    const h1 = root.find('h1').first().text().trim();
    if (h1) content += `# ${h1}\n\n`;

    // Extract subheadings and paragraphs
    root.find('h2, h3, p, ul, ol').each((_, el) => {
      const tag = $(el).get(0).tagName;
      if (tag === 'h2') content += `## ${$(el).text().trim()}\n\n`;
      else if (tag === 'h3') content += `### ${$(el).text().trim()}\n\n`;
      else if (tag === 'p') content += `${$(el).text().trim()}\n\n`;
      else if (tag === 'ul' || tag === 'ol') {
        $(el).find('li').each((_, li) => {
          content += `- ${$(li).text().trim()}\n`;
        });
        content += '\n';
      }
    });

    fs.writeFileSync('vinnova_hitta_finansiering.md', content, 'utf8');
    console.log('Scraped content saved to vinnova_hitta_finansiering.md');
  } catch (err) {
    console.error('Error scraping Vinnova:', err.message);
  }
}

scrapeVinnova(); 