// API URL (aynı portta çalışıyoruz)
const API_URL = '';

// State
let allNews = [];
let allSources = [];
let selectedSourceId = null;
let currentPage = 1;
const itemsPerPage = 12;

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


async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();

        document.getElementById('stat-total').textContent = stats.totalNews?.toLocaleString('tr-TR') || '-';
        document.getElementById('stat-sources').textContent = stats.totalSources || '-';
        document.getElementById('stat-24h').textContent = stats.last24HoursNews?.toLocaleString('tr-TR') || '-';

        if (stats.lastCrawlAt) {
            const date = new Date(stats.lastCrawlAt);
            document.getElementById('stat-last').textContent = isNaN(date.getTime())
                ? '-'
                : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        } else {
            document.getElementById('stat-last').textContent = '-';
        }
    } catch (error) {
        console.error('Stats yüklenemedi:', error);
    }
}


// Initialize
async function init() {
    await loadSources();
    await loadNews();
    await loadStats();
}

// Load sources and create buttons
async function loadSources() {
    try {
        const response = await fetch(`${API_URL}/sources`);
        allSources = await response.json();

        sourceButtonsEl.innerHTML = '';

        const allBtn = document.createElement('button');
        allBtn.className = 'source-btn active';
        allBtn.textContent = 'Tümü';
        allBtn.onclick = () => selectSource(null);
        sourceButtonsEl.appendChild(allBtn);

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

function selectSource(sourceId) {
    selectedSourceId = sourceId;
    currentPage = 1;

    document.querySelectorAll('.source-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    renderNews();
    renderPagination();
}

async function loadNews() {
    newsGridEl.innerHTML = '<div class="loading">Yükleniyor...</div>';

    try {
        const response = await fetch(`${API_URL}/news`);
        allNews = await response.json();
        currentPage = 1;
        renderNews();
        renderPagination();
    } catch (error) {
        newsGridEl.innerHTML = '<div class="error">Haberler yüklenemedi</div>';
        console.error('Haberler yüklenemedi:', error);
    }
}

function getFilteredNews() {
    let filtered = allNews;
    if (selectedSourceId) {
        filtered = allNews.filter(news => {
            const newsSourceId = news.sourceId?._id || news.sourceId;
            return newsSourceId === selectedSourceId;
        });
    }
    return filtered;
}

function renderNews() {
    const filteredNews = getFilteredNews();

    if (filteredNews.length === 0) {
        newsGridEl.innerHTML = '<div class="loading">Haber bulunamadı</div>';
        return;
    }

    const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageNews = filteredNews.slice(startIndex, endIndex);

    newsGridEl.innerHTML = '';

    pageNews.forEach(news => {
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

function renderPagination() {
    const filteredNews = getFilteredNews();
    const totalPages = Math.ceil(filteredNews.length / itemsPerPage);

    const oldPagination = document.getElementById('pagination');
    if (oldPagination) oldPagination.remove();

    if (totalPages <= 1) return;

    const paginationEl = document.createElement('div');
    paginationEl.id = 'pagination';
    paginationEl.className = 'pagination';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    paginationEl.appendChild(prevBtn);

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'page-btn';
        firstBtn.textContent = '1';
        firstBtn.onclick = () => changePage(1);
        paginationEl.appendChild(firstBtn);

        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            dots.textContent = '...';
            paginationEl.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.onclick = () => changePage(i);
        paginationEl.appendChild(btn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            dots.textContent = '...';
            paginationEl.appendChild(dots);
        }

        const lastBtn = document.createElement('button');
        lastBtn.className = 'page-btn';
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => changePage(totalPages);
        paginationEl.appendChild(lastBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    paginationEl.appendChild(nextBtn);

    newsGridEl.parentNode.insertBefore(paginationEl, newsGridEl.nextSibling);
}

function changePage(newPage) {
    const filteredNews = getFilteredNews();
    const totalPages = Math.ceil(filteredNews.length / itemsPerPage);

    if (newPage < 1 || newPage > totalPages) return;

    currentPage = newPage;
    renderNews();
    renderPagination();
    newsGridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openModal(news) {
    modalTitleEl.textContent = news.title;
    modalImageEl.src = news.imageUrl || '';
    modalImageEl.style.display = news.imageUrl ? 'block' : 'none';
    modalBodyEl.innerHTML = news.content || news.summary || 'İçerik yok';
    modalLinkEl.href = news.originalUrl;
    modalEl.classList.remove('hidden');
}

function closeModal() {
    modalEl.classList.add('hidden');
}

async function crawl() {
    crawlBtnEl.disabled = true;
    crawlBtnEl.textContent = 'Çekiliyor...';

    try {
        const response = await fetch(`${API_URL}/crawl`, { method: 'POST' });
        const result = await response.json();
        alert(`Crawl tamamlandı: ${result.inserted} yeni haber, ${result.skipped} atlandı`);
        await loadNews();
        await loadStats();

    } catch (error) {
        alert('Crawl hatası: ' + error.message);
    } finally {
        crawlBtnEl.disabled = false;
        crawlBtnEl.textContent = '🔄 Şimdi Çek';
    }
}

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

crawlBtnEl.onclick = crawl;
modalCloseEl.onclick = closeModal;
modalEl.onclick = (e) => {
    if (e.target === modalEl) closeModal();
};

init();