// API URL (aynı portta çalışıyoruz)
const API_URL = '';

// State
let allNews = [];
let allSources = [];
let selectedSourceId = null;

// DOM Elements
const sourceButtonsEl = document.getElementById('source-buttons');
const newsGridEl = document.getElementById('news-grid');
const crawlBtnEl = document.getElementById('crawl-btn');
const modalEl = document.getElementById('modal');
const modalCloseEl = document.getElementById('modal-close');
const modalTitleEl = document.getElementById('modal-title');
const modalImageEl = document.getElementById('modal-image');
const modalBodyEl = document.getElementById('modal-body');
const modalLinkEl = document.getElementById('modal-link');

// Initialize
async function init() {
    await loadSources();
    await loadNews();
}

// Load sources and create buttons
async function loadSources() {
    try {
        const response = await fetch(`${API_URL}/sources`);
        allSources = await response.json();

        sourceButtonsEl.innerHTML = '';

        // "Tümü" butonu
        const allBtn = document.createElement('button');
        allBtn.className = 'source-btn active';
        allBtn.textContent = 'Tümü';
        allBtn.onclick = () => selectSource(null);
        sourceButtonsEl.appendChild(allBtn);

        // Kaynak butonları
        allSources.forEach(source => {
            const btn = document.createElement('button');
            btn.className = 'source-btn';
            btn.textContent = source.name;
            btn.onclick = () => selectSource(source.id);
            sourceButtonsEl.appendChild(btn);
        });
    } catch (error) {
        console.error('Kaynaklar yüklenemedi:', error);
    }
}

// Select source and filter news
function selectSource(sourceId) {
    selectedSourceId = sourceId;

    // Buton active class'ını güncelle
    document.querySelectorAll('.source-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    renderNews();
}

// Load news
async function loadNews() {
    newsGridEl.innerHTML = '<div class="loading">Yükleniyor...</div>';

    try {
        const response = await fetch(`${API_URL}/news`);
        allNews = await response.json();
        renderNews();
    } catch (error) {
        newsGridEl.innerHTML = '<div class="error">Haberler yüklenemedi</div>';
        console.error('Haberler yüklenemedi:', error);
    }
}

// Render news cards
function renderNews() {
    let filteredNews = allNews;

    if (selectedSourceId) {
        filteredNews = allNews.filter(news => {
            const newsSourceId = news.sourceId?._id || news.sourceId;
            return newsSourceId === selectedSourceId;
        });
    }

    if (filteredNews.length === 0) {
        newsGridEl.innerHTML = '<div class="loading">Haber bulunamadı</div>';
        return;
    }

    newsGridEl.innerHTML = '';

    filteredNews.forEach(news => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.onclick = () => openModal(news);

        const imageUrl = news.imageUrl || 'https://via.placeholder.com/400x200?text=Haber';
        const summary = news.summary || '';
        const sourceName = news.sourceId?.name || 'Bilinmiyor';
        const category = news.category || '';

        card.innerHTML = `
    <div class="card-inner">
        ${imageUrl ? `<div class="card-image"><img src="${imageUrl}" alt="${news.title}" onerror="this.parentElement.remove()"></div>` : ''}
        <div class="card-body">
            <div class="card-meta-top">
                <span class="news-source">${sourceName}</span>
                ${category ? `<span class="card-category">${category}</span>` : ''}
            </div>
            <h3>${news.title}</h3>
            ${summary ? `<p>${summary}</p>` : ''}
            <div class="card-meta-bottom">
    ${formatDate(news.publishedAt) ? `<span>${formatDate(news.publishedAt)}</span>` : ''}
</div>
        </div>
    </div>
`;

        newsGridEl.appendChild(card);
    });
}

// Open modal with news detail
function openModal(news) {
    modalTitleEl.textContent = news.title;
    modalImageEl.src = news.imageUrl || '';
    modalImageEl.style.display = news.imageUrl ? 'block' : 'none';
    modalBodyEl.innerHTML = news.content || news.summary || 'İçerik yok';
    modalLinkEl.href = news.originalUrl;
    modalEl.classList.remove('hidden');
}

// Close modal
function closeModal() {
    modalEl.classList.add('hidden');
}

// Crawl (fetch new news)
async function crawl() {
    crawlBtnEl.disabled = true;
    crawlBtnEl.textContent = 'Çekiliyor...';

    try {
        const response = await fetch(`${API_URL}/crawl`, { method: 'POST' });
        const result = await response.json();
        alert(`Crawl tamamlandı: ${result.inserted} yeni haber, ${result.skipped} atlandı`);
        await loadNews();
    } catch (error) {
        alert('Crawl hatası: ' + error.message);
    } finally {
        crawlBtnEl.disabled = false;
        crawlBtnEl.textContent = '🔄 Şimdi Çek';
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Event listeners
crawlBtnEl.onclick = crawl;
modalCloseEl.onclick = closeModal;
modalEl.onclick = (e) => {
    if (e.target === modalEl) closeModal();
};

// Start
init();