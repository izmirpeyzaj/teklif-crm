// ====================================
// CONFIG & STATE
// ====================================
const USE_API = false; // Mock mode = false (using localStorage)

// Tekliflerde varsayılan olarak görünen resmi genel hükümler / garanti metni.
const DEFAULT_TERMS = `GENEL HÜKÜMLER VE GARANTİ KOŞULLARI

1. Firmamızca temin edilen malzemeler ve uygulanan işçilik, teslim tarihinden itibaren 1 (bir) yıl süreyle garanti kapsamındadır.

2. Bitki, fidan, çim ve benzeri canlı materyaller; iklim, sulama ve bakım koşullarına bağlı doğal etkenler nedeniyle garanti kapsamı dışındadır. Firmamızın periyodik bakım hizmetinden yararlanılması hâlinde, bakım sözleşmesi süresince canlı materyaller de garanti kapsamına dâhil edilir.

3. Malzeme, nakliye ve işçilik bedelleri ayrı kalemler hâlinde gösterilmiştir. Aksi yazılı olarak belirtilmedikçe malzeme bedeline nakliye ve işçilik dâhil değildir.

4. İşbu teklif, üzerinde belirtilen geçerlilik tarihine kadar geçerlidir.`;

const state = {
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    cart: [],
    productCart: [], // Ürün sepeti
    company: {
        name: APP_DATA.company.name,
        address: APP_DATA.company.address,
        phone: APP_DATA.company.phone,
        email: APP_DATA.company.email,
        logo: null,
        notes: ''
    },
    jobs: localStorage.getItem('teklif_services') ? JSON.parse(localStorage.getItem('teklif_services')) : (typeof APP_DATA !== 'undefined' ? APP_DATA.jobs : []),
    products: localStorage.getItem('teklif_products') ? JSON.parse(localStorage.getItem('teklif_products')) : (typeof APP_DATA !== 'undefined' ? APP_DATA.products : []),
    references: localStorage.getItem('teklif_references') ? JSON.parse(localStorage.getItem('teklif_references')) : (typeof APP_DATA !== 'undefined' ? APP_DATA.references : []),
    usage: {}, // Track service usage: { jobId: count }
    productUsage: {}, // Track product usage
    validity: {
        type: '30',
        customDate: null
    },
    projectName: '',
    version: '1',
    savedProposals: [],
    customers: [],
    kanban: [
        { id: 'list-open', title: 'Open', cards: [] },
        { id: 'list-received', title: 'Received', cards: [] },
        { id: 'list-declined', title: 'Declined', cards: [] },
        { id: 'list-accepted', title: 'Accepted', cards: [] }
    ]
};


const els = {
    // Tabs
    tabDashboard: document.getElementById('tab-dashboard'),
    tabProposal: document.getElementById('tab-proposal'),
    tabProposals: document.getElementById('tab-proposals'),
    tabServices: document.getElementById('tab-services'),
    tabProducts: document.getElementById('tab-products'),
    tabReferences: document.getElementById('tab-references'),
    tabCustomers: document.getElementById('tab-customers'),
    tabKanban: document.getElementById('tab-kanban'),
    tabSettings: document.getElementById('tab-settings'),
    btnsTab: document.querySelectorAll('.nav-item'),

    // Proposal Form
    customerInput: document.getElementById('customerInput'),
    dateInput: document.getElementById('dateInput'),
    serviceSearchInput: document.getElementById('serviceSearchInput'),
    serviceChecklist: document.getElementById('serviceChecklist'),
    cartContainer: document.getElementById('cartItems'),
    validityDateInput: document.getElementById('validityDateInput'),
    projectNameInput: document.getElementById('projectNameInput'),
    versionInput: document.getElementById('versionInput'),
    propFullCode: document.getElementById('propFullCode'),
    propProjectName: document.getElementById('propProjectName'),
    savedProposalsList: document.getElementById('savedProposalsList'),
    proposalSearchInput: document.getElementById('proposalSearchInput'),

    // Services
    serviceList: document.getElementById('serviceList'),
    serviceForm: document.getElementById('serviceForm'),
    srvId: document.getElementById('srvId'),
    srvName: document.getElementById('srvName'),
    srvDesc: document.getElementById('srvDesc'),
    srvPrice: document.getElementById('srvPrice'),
    srvUnit: document.getElementById('srvUnit'),
    srvCond: document.getElementById('srvCond'),
    srvImage: document.getElementById('srvImage'),
    srvImgPreview: document.getElementById('srvImgPreview'),

    // References
    refList: document.getElementById('refList'),
    refForm: document.getElementById('refForm'),
    refId: document.getElementById('refId'),
    refTitle: document.getElementById('refTitle'),
    refCat: document.getElementById('refCat'),
    refTags: document.getElementById('refTags'),
    refImage: document.getElementById('refImage'),
    refImgPreview: document.getElementById('refImgPreview'),

    // Customers
    customerList: document.getElementById('customerList'),
    customerForm: document.getElementById('customerForm'),

    // Kanban
    kanbanBoard: document.getElementById('kanbanBoard'),

    // Conditions Display
    propServiceConditions: document.getElementById('propServiceConditions'),
    serviceConditionsContent: document.getElementById('serviceConditionsContent'),

    // Settings
    setCompany: document.getElementById('setCompany'),
    setAddress: document.getElementById('setAddress'),
    setPhone: document.getElementById('setPhone'),
    setEmail: document.getElementById('setEmail'),
    setLogo: document.getElementById('setLogo'),
    setNotes: document.getElementById('setNotes'),

    // Preview
    propClientName: document.getElementById('propClientName'),
    propDate: document.getElementById('propDate'),
    propJobList: document.getElementById('propJobList'),
    subTotal: document.getElementById('subTotal'),
    grandTotal: document.getElementById('grandTotal'),
    companyLogo: document.getElementById('companyLogo'),
    companyInfo: document.getElementById('companyInfo'),
    refGrid: document.getElementById('refGrid'),
    propNotes: document.getElementById('propNotes'),
    propValidityDate: document.getElementById('propValidityDate')
};

// ====================================
// STORAGE LOGIC (MOCK MODE)
// ====================================
const STORAGE_KEYS = {
    COMPANY: 'teklif_company',
    SERVICES: 'teklif_services',
    PRODUCTS: 'teklif_products',
    REFS: 'teklif_refs',
    SAVED_PROPOSALS: 'teklif_saved',
    CUSTOMERS: 'teklif_customers',
    KANBAN: 'teklif_kanban'
};

function loadData() {
    const savedCompany = localStorage.getItem(STORAGE_KEYS.COMPANY);
    state.company = savedCompany ? JSON.parse(savedCompany) : { ...APP_DATA.company };

    // Migration: Update if still using old default address or no logo
    if (state.company.address === 'Erzene mah. Bornova/İzmir' || !state.company.logo) {
        state.company = { ...APP_DATA.company };
        persistCompany();
    }

    // Services
    const savedServices = localStorage.getItem(STORAGE_KEYS.SERVICES);
    const parsedServices = savedServices ? JSON.parse(savedServices) : [];

    // Force update if saved services are significantly fewer than APP_DATA (migration)
    if (parsedServices.length < APP_DATA.jobs.length) {
        state.jobs = [...APP_DATA.jobs];
        persistServices(); // Update localStorage with the new 30 services
    } else {
        state.jobs = parsedServices;
    }

    // References
    const savedRefs = localStorage.getItem(STORAGE_KEYS.REFS);
    const parsedRefs = savedRefs ? JSON.parse(savedRefs) : [];
    // Force update if no refs or refs have old paths
    const needsRefUpdate = parsedRefs.length === 0 || parsedRefs.some(r => r.image && r.image.includes('assets/references/'));
    if (needsRefUpdate) {
        state.references = [...APP_DATA.references];
        persistReferences();
    } else {
        state.references = parsedRefs;
    }

    // Products
    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const parsedProducts = savedProducts ? JSON.parse(savedProducts) : [];
    if (parsedProducts.length < APP_DATA.products.length) {
        state.products = [...APP_DATA.products];
        persistProducts();
    } else {
        state.products = parsedProducts;
    }

    // Product Usage
    const savedProductUsage = localStorage.getItem('teklif_product_usage');
    state.productUsage = savedProductUsage ? JSON.parse(savedProductUsage) : {};

    const savedProposals = localStorage.getItem(STORAGE_KEYS.SAVED_PROPOSALS);
    if (savedProposals) state.savedProposals = JSON.parse(savedProposals);

    // Usage
    const savedUsage = localStorage.getItem('teklif_usage');
    state.usage = savedUsage ? JSON.parse(savedUsage) : {};

    // Customers
    const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const parsedCustomers = savedCustomers ? JSON.parse(savedCustomers) : [];
    if (parsedCustomers.length === 0) {
        state.customers = [
            { id: 'c1', name: 'Ahmet YÄ±lmaz', phone: '0532 111 22 33', email: 'ahmet@mail.com', address: 'Urla, Ä°zmir', updatedAt: Date.now() },
            { id: 'c2', name: 'AyÅŸe Demir', phone: '0533 444 55 66', email: 'ayse@deneme.com', address: 'Ã‡eÅŸme, Ä°zmir', updatedAt: Date.now() },
            { id: 'c3', name: 'Global Ä°nÅŸaat A.Å.', phone: '0232 777 88 99', email: 'info@globalinsaat.com', address: 'BayraklÄ±, Ä°zmir', updatedAt: Date.now() }
        ];
        persistCustomers();
    } else {
        state.customers = parsedCustomers;
    }

    // Kanban
    const savedKanban = localStorage.getItem(STORAGE_KEYS.KANBAN);
    if (savedKanban) {
        state.kanban = JSON.parse(savedKanban);
        // Migration: Ensure 4 columns exist
        const requiredIds = ['list-open', 'list-received', 'list-declined', 'list-accepted'];
        requiredIds.forEach(id => {
            if (!state.kanban.find(l => l.id === id)) {
                state.kanban.push({ id, title: id.split('-')[1].charAt(0).toUpperCase() + id.split('-')[1].slice(1), cards: [] });
            }
        });
    } else {
        // If no kanban data saved, initialize with default structure
        state.kanban = [
            { id: 'list-open', title: 'Open', cards: [] },
            { id: 'list-received', title: 'Received', cards: [] },
            { id: 'list-declined', title: 'Declined', cards: [] },
            { id: 'list-accepted', title: 'Accepted', cards: [] }
        ];
        persistKanban();
    }

    // Sync proposals to Kanban to ensure visibility
    syncProposalsToKanban();

    // Migration: Convert card.notes to card.comments
    state.kanban.forEach(list => {
        list.cards.forEach(card => {
            if (typeof card.notes === 'string' && card.notes.trim() !== '') {
                if (!card.comments) card.comments = [];
                // Check if this note is already in comments to avoid double migration
                const alreadyMigrated = card.comments.some(c => c.text === card.notes);
                if (!alreadyMigrated) {
                    card.comments.unshift({
                        id: 'mig-' + Date.now() + Math.random().toString(36).substr(2, 5),
                        text: card.notes,
                        date: card.updatedAt || Date.now()
                    });
                }
                card.notes = ''; // Clear after migration
            }
            if (!card.comments) card.comments = [];
        });
    });

    initUI();
}

function renderServiceChecklist(filter = '') {
    if (!els.serviceChecklist) return;

    // Sort jobs by usage count (highest first)
    // We only show top 20 if no filter is applied
    let displayJobs = [...state.jobs];

    if (filter) {
        const query = filter.toLowerCase();
        displayJobs = displayJobs.filter(j =>
            j.name.toLowerCase().includes(query) ||
            (j.description && j.description.toLowerCase().includes(query))
        );
    } else {
        // Sort by usage count and take top 20
        displayJobs.sort((a, b) => (state.usage[b.id] || 0) - (state.usage[a.id] || 0));
        displayJobs = displayJobs.slice(0, 20);
    }

    els.serviceChecklist.innerHTML = '';
    displayJobs.forEach(job => {
        const isSelected = state.cart.some(c => c.id === job.id);
        const div = document.createElement('div');
        div.className = `service-check-item ${isSelected ? 'active' : ''}`;
        div.onclick = () => toggleService(job.id);

        div.innerHTML = `
            <div class="service-check-info">
                <span class="service-check-name">${job.name}</span>
                <span class="service-check-price">${job.price} ₺ / ${job.unit}</span>
            </div>
        `;
        els.serviceChecklist.appendChild(div);
    });
}

window.handleServiceSearch = function () {
    const val = els.serviceSearchInput.value;
    renderServiceChecklist(val);
};

window.toggleService = function (jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    const existingIdx = state.cart.findIndex(c => c.id === jobId);

    if (existingIdx > -1) {
        state.cart.splice(existingIdx, 1);
    } else {
        state.cart.push({ ...job, qty: 1 });
        // Increment usage
        state.usage[jobId] = (state.usage[jobId] || 0) + 1;
        localStorage.setItem('teklif_usage', JSON.stringify(state.usage));
    }

    renderServiceChecklist(els.serviceSearchInput.value);
    renderCart();
    renderProposalItems();
};

function persistCompany() {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(state.company));
    updateProposalHeaders();
}

function persistServices() {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(state.jobs));
    renderServiceChecklist();
    renderServiceList();
}

function persistReferences() {
    localStorage.setItem(STORAGE_KEYS.REFS, JSON.stringify(state.references));
    renderReferencesGrid();
}

function persistCustomers() {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(state.customers));
    renderCustomerList();
}

function persistKanban() {
    localStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(state.kanban));
    renderKanban();
}

function persistProducts() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(state.products));
    renderProductChecklist();
    renderProductList();
}

// ====================================
// CORE APP LOGIC
// ====================================
function init() {
    // Init events
    if (els.customerInput) {
        els.customerInput.addEventListener('input', (e) => {
            state.customerName = e.target.value;
            updateAutoVersion();
            updateProposalHeaders();
        });
    }

    if (els.dateInput) {
        els.dateInput.addEventListener('change', (e) => {
            state.date = e.target.value;
            updateProposalHeaders();
        });
    }

    // Event for search
    if (els.serviceSearchInput) {
        els.serviceSearchInput.addEventListener('input', handleServiceSearch);
    }

    if (els.projectNameInput) {
        els.projectNameInput.addEventListener('input', (e) => {
            state.projectName = e.target.value;
            updateAutoVersion();
            updateProposalHeaders();
        });
    }

    if (els.versionInput) {
        els.versionInput.addEventListener('input', (e) => {
            state.version = e.target.value;
            updateProposalHeaders();
        });
    }

    // Load everything
    loadData();

    // Hide Auth (Mock Mode ensures this)
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');

    const container = document.querySelector('.app-container');
    if (container) container.style.display = 'flex';

    // Set initial custom date to today + 7
    setValidity(7);
}

function initUI() {
    if (els.dateInput) els.dateInput.value = state.date;
    if (els.projectNameInput) els.projectNameInput.value = state.projectName;
    if (els.versionInput) els.versionInput.value = state.version;

    renderServiceChecklist();
    renderServiceList();
    renderProductChecklist();
    renderProductList();
    renderProductCart();
    renderProductItems();
    renderReferenceList();
    renderReferencesGrid();
    renderSavedProposals();
    renderCustomerList();
    renderKanban();
    updateProposalHeaders();

    // Fill Settings Panel
    if (els.setCompany) els.setCompany.value = state.company.name || '';
    if (els.setAddress) els.setAddress.value = state.company.address || '';
    if (els.setPhone) els.setPhone.value = state.company.phone || '';
    if (els.setEmail) els.setEmail.value = state.company.email || '';
    if (els.setNotes) els.setNotes.value = state.company.notes || '';

    // Default to Dashboard
    switchTab('dashboard');
}

// ====================================
// UI HANDLERS
// ====================================

// Company
window.saveCompanySettings = function () {
    state.company.name = els.setCompany.value;
    state.company.address = els.setAddress.value;
    state.company.phone = els.setPhone.value;
    state.company.email = els.setEmail.value;
    state.company.notes = els.setNotes.value;
    persistCompany();
    alert('Ayarlar kaydedildi.');
};

window.previewLogo = function (input) {
    const file = input.files[0];
    const preview = document.getElementById('setLogoPreview');
    if (!file || !preview) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;">`;
        state.company.logo = e.target.result; // Temporarily update state for immediate preview in proposal
        updateProposalHeaders();
    };
    reader.readAsDataURL(file);
};

window.clearLogo = function () {
    state.company.logo = null;
    els.setLogo.value = '';
    persistCompany();
};

// Services
window.showServiceForm = function (id = null) {
    els.serviceForm.classList.remove('hidden');
    els.serviceForm.scrollIntoView({ behavior: 'smooth' });

    if (id) {
        const job = state.jobs.find(j => j.id === id);
        if (!job) return;
        document.getElementById('srvFormTitle').textContent = 'Hizmet Düzenle';
        els.srvId.value = job.id;
        els.srvName.value = job.name;
        els.srvDesc.value = job.description;
        els.srvPrice.value = job.price;
        els.srvUnit.value = job.unit;
        els.srvCond.value = job.conditions || '';
        els.srvImgPreview.innerHTML = job.image ? `<img src="${job.image}" style="height:80px">` : '';
    } else {
        document.getElementById('srvFormTitle').textContent = 'Yeni Hizmet Ekle';
        els.srvId.value = '';
        els.srvName.value = '';
        els.srvDesc.value = '';
        els.srvPrice.value = '';
        els.srvUnit.value = '';
        els.srvCond.value = '';
        els.srvImage.value = '';
        els.srvImgPreview.innerHTML = '';
    }
};

window.hideServiceForm = function () {
    els.serviceForm.classList.add('hidden');
    // Clear form for next time
    els.srvId.value = '';
    els.srvName.value = '';
    els.srvDesc.value = '';
    els.srvPrice.value = '';
    els.srvUnit.value = '';
    els.srvCond.value = '';
    els.srvImage.value = '';
    els.srvImgPreview.innerHTML = '';
};

window.saveService = function () {
    const id = els.srvId.value;
    const name = els.srvName.value;
    const price = parseFloat(els.srvPrice.value);

    if (!name || isNaN(price)) return alert('Lütfen tam giriş yapın.');

    const jobData = {
        name,
        description: els.srvDesc.value,
        price,
        unit: els.srvUnit.value || 'Adet',
        conditions: els.srvCond.value || '',
        image: null
    };

    const file = els.srvImage.files[0];
    const finish = (img) => {
        jobData.image = img || 'assets/jobs/lawn.png';
        if (id) {
            const idx = state.jobs.findIndex(j => j.id === id);
            if (idx > -1) {
                if (!img) jobData.image = state.jobs[idx].image;
                state.jobs[idx] = { ...state.jobs[idx], ...jobData, id };
            }
        } else {
            jobData.id = 'j' + Date.now();
            state.jobs.push(jobData);
        }
        // Clear AI generated image URL after save
        window._aiGeneratedImageUrl = null;
        persistServices();
        els.serviceForm.classList.add('hidden');
    };

    if (file) {
        const r = new FileReader();
        r.onload = (e) => finish(e.target.result);
        r.readAsDataURL(file);
    } else if (window._aiGeneratedImageUrl) {
        // Use AI-generated image
        finish(window._aiGeneratedImageUrl);
    } else {
        finish(null);
    }
};

window.deleteJob = function (id) {
    if (!confirm('Emin misiniz?')) return;
    state.jobs = state.jobs.filter(j => j.id !== id);
    state.cart = state.cart.filter(c => c.id !== id);
    persistServices();
    renderCart();
    renderProposalItems();
    renderServiceChecklist(); // Sync with proposal tab grid
};

function renderServiceList() {
    if (!els.serviceList) return;
    els.serviceList.innerHTML = '';
    state.jobs.forEach(job => {
        const div = document.createElement('div');
        div.className = 'service-item';
        div.innerHTML = `
            <img src="${job.image || 'assets/jobs/j1.png'}" class="service-item-img">
            <div class="service-item-body">
                <div class="service-item-info">${job.name}</div>
                <div class="service-item-sub">${job.price} ₺ / ${job.unit}</div>
                <div class="service-actions">
                    <button onclick="showServiceForm('${job.id}')" title="Düzenle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button onclick="deleteJob('${job.id}')" style="color:#e74c3c" title="Sil">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;
        els.serviceList.appendChild(div);
    });
}

// ========================
// SEKTÖREL VE EXCEL HİZMET İŞLEMLERİ
// ========================

const SECTORAL_SERVICES = {
    'demo': {
        name: '🌟 Varsayılan Demo Verileri',
        services: (typeof APP_DATA !== 'undefined' ? APP_DATA.jobs : [])
    },
    'peyzaj': {
        name: '🌳 Peyzaj ve Bahçe',
        services: [
            { name: 'Çim Biçme ve Bakım', unit: 'm²', price: 25, description: 'Profesyonel çim biçme ve kenar düzeltme.', image: 'images/services/peyzaj_bakim.png', conditions: 'Minimum alan 50 m². Çim yüksekliği 15 cm üzeri ise ek ücret uygulanır.' },
            { name: 'Rulo Çim Serimi', unit: 'm²', price: 450, description: 'Hazır rulo çim uygulaması ve zemin hazırlığı.', image: 'images/services/rulo-cim.png', conditions: 'Zemin hazırlığı dahildir. Toprak iyileştirme ayrı faturalandırılır. 1 yıl tutma garantisi.' },
            { name: 'Çim Tohumu Ekimi', unit: 'm²', price: 35, description: 'Tohum serpme ve üst toprak kapatma.', image: 'images/services/peyzaj_cim_tohumu.png', conditions: 'Tohum bedeli dahildir. İlk sulama müşteriye aittir. Çimlenme 15-20 gün sürer.' },
            { name: 'Otomatik Sulama Sistemi', unit: 'Proje', price: 15000, description: 'Zaman ayarlı sulama sistemi kurulumu.', image: 'images/services/sulama.png', conditions: 'Su sayacı ve elektrik bağlantısı müşteriye aittir. 2 yıl garanti. Proje bazlı fiyatlandırma.' },
            { name: 'Sprinkler Sulama', unit: 'Adet', price: 350, description: 'Pop-up sprinkler montajı.', image: 'images/services/peyzaj_sprinkler.png', conditions: 'Boru hattı ayrıca hesaplanır. Sprinkler malzemesi dahildir.' },
            { name: 'Damla Sulama Sistemi', unit: 'm', price: 25, description: 'Çiçek ve sebze bahçeleri için damla hattı.', image: 'images/services/peyzaj_damla_sulama.png', conditions: 'Damlatıcı aralığı standart 30 cm. Özel aralık talep edilebilir.' },
            { name: 'Ağaç Budama', unit: 'Adet', price: 500, description: 'Mevsimlik ve form budaması.', image: 'images/services/peyzaj_budama.png', conditions: '5 metre üzeri ağaçlar için ek ücret. Budama artıkları toplanır.' },
            { name: 'Bahçe İlaçlama', unit: 'Uygulama', price: 850, description: 'Haşere ve hastalıklara karşı ilaçlama.', image: 'images/services/peyzaj_ilaclama.png', conditions: 'İlaç bedeli dahildir. Uygulama sonrası 24 saat alana girilmemeli.' },
            { name: 'Süs Havuzu Yapımı', unit: 'm²', price: 8500, description: 'Doğal görünümlü süs havuzu ve şelale.', image: 'images/services/sus-havuzu.png', conditions: 'Pompa ve filtre sistemi dahil. Elektrik bağlantısı müşteriye ait. 2 yıl kaplama garantisi.' },
            { name: 'Yüzme Havuzu Bakımı', unit: 'Sefer', price: 1800, description: 'Kimyasal dengeleme ve temizlik.', image: 'images/services/peyzaj_havuz.png', conditions: 'Kimyasal malzemeler dahildir. Haftalık veya aylık anlaşma yapılabilir.' },
            { name: 'Ağaç Dikimi (Büyük)', unit: 'Adet', price: 1200, description: 'Yetişkin ağaç dikimi ve gübreleme.', image: 'images/services/peyzaj_agac_buyuk.png', conditions: 'Ağaç bedeli hariç. Nakliye ve vinç kullanımı ayrı faturalandırılır. 1 yıl tutma garantisi.' },
            { name: 'Çalı ve Fidan Dikimi', unit: 'Adet', price: 150, description: 'Süs bitkileri ve çalı dikimi.', image: 'images/services/cali.png', conditions: 'Bitki bedeli hariç. Toprak iyileştirme ve gübre dahil.' },
            { name: 'Kaya Bahçesi', unit: 'm²', price: 1500, description: 'Doğal taş ve kaya düzenleme.', image: 'images/services/peyzaj_kaya_bahcesi.png', conditions: 'Kaya ve taş bedeli dahildir. Tasarım onayı sonrası çalışmaya başlanır.' },
            { name: 'Gabion Duvar', unit: 'm²', price: 3200, description: 'Kaya dolgulu tel kafes duvar.', image: 'images/services/gabion.png', conditions: 'Galvanizli tel kafes ve dolgu taşı dahil. Temel kazısı ayrıca hesaplanır.' },
            { name: 'Bahçe Duvarı', unit: 'm²', price: 2800, description: 'İstinat veya sınır duvarı.', image: 'images/services/duvar.png', conditions: 'Malzeme dahil. Temel derinliği zemin durumuna göre belirlenir. Belediye izni müşteriye ait.' },
            { name: 'Ahsap Pergola', unit: 'm²', price: 4500, description: 'Emprenyeli ahşap pergola yapımı.', image: 'images/services/pergola.png', conditions: 'Emprenye ahşap kullanılır. 5 yıl ahşap garantisi. Montaj dahil.' },
            { name: 'Ahşap Çit Yapımı', unit: 'm', price: 850, description: 'Bahçe sınırı için ahşap çit.', image: 'images/services/peyzaj_cit_ahsap.png', conditions: 'Yükseklik standart 1.5m. Farklı yükseklik ek ücrete tabidir.' },
            { name: 'Bahçe Yolu (Parke)', unit: 'm²', price: 850, description: 'Kilit parke taşı döşeme.', image: 'images/services/parke-yol.png', conditions: 'Parke taşı ve kum bedeli dahil. Temel hazırlığı dahildir.' },
            { name: 'Bordür Döşeme', unit: 'm', price: 120, description: 'Bordür taşı uygulaması.', image: 'images/services/peyzaj_bordur.png', conditions: 'Bordür taşı bedeli dahildir. Eğimli zeminlerde ek işçilik gerekebilir.' },
            { name: 'Bahçe Drenajı', unit: 'm', price: 250, description: 'Yağmur suyu drenaj sistemi.', image: 'images/services/peyzaj_drenaj.png', conditions: 'Drenaj borusu dahil. Derinlik standart 40 cm. Bağlantı noktası müşteri tarafından belirlenir.' },
            { name: 'Toprak Tesviyesi', unit: 'm²', price: 45, description: 'Zemin düzeltme ve eğim ayarı.', image: 'images/services/peyzaj_toprak.png', conditions: 'Makine ile tesviye. Fazla toprak uzaklaştırma ayrıca hesaplanır.' },
            { name: 'Bahçe Aydınlatma', unit: 'Adet', price: 650, description: 'Solar veya kablolu bahçe lambası.', image: 'images/services/aydinlatma.png', conditions: 'Armatür bedeli dahil. Kablolama ayrıca hesaplanır. 2 yıl armatür garantisi.' },
            { name: 'Fidan Dikimi', unit: 'Adet', price: 85, description: 'Süs bitkisi ve genç fidan dikimi.', image: 'images/services/peyzaj_fidan.png', conditions: 'Fidan bedeli hariç. Dikim çukuru açma ve gübreleme dahil.' },
            { name: 'Bahçe Temizliği', unit: 'm²', price: 35, description: 'Yaprak toplama, çim artığı ve genel bahçe temizliği.', image: 'images/services/temizlik_bahce.png', conditions: 'Atık uzaklaştırma dahil. Ağır moloz ve inşaat artığı hariç.' },
            { name: 'Yüzme Havuzu Yapımı', unit: 'm²', price: 12000, description: 'Komple yüzme havuzu inşaatı, betonlama ve kaplama.', image: 'images/services/hizmet_havuz_yapimi.png', conditions: 'Prefabrik veya betonarme seçeneği mevcut. Ekipman bedeli ayrıdır. 10 yıl kaplama garantisi.' },
            { name: 'Manuel Çim Tohumu Serpme', unit: 'm²', price: 25, description: 'Elle tohum serpme ve hafif toprak kapatma.', image: 'images/services/hizmet_cim_tohum.png', conditions: 'Tohum bedeli dahil. Sulama müşteriye aittir. 20 günde çimlenme beklenir.' },
            { name: 'Metal Pergola Montajı', unit: 'm²', price: 5500, description: 'Alüminyum veya çelik pergola kurulumu.', image: 'images/services/hizmet_pergola.png', conditions: 'Tente veya cam kaplama ayrı faturalandırılır. 5 yıl metal garantisi.' },
            // Ateş Çukuru İnşaat Hizmetleri
            { name: 'Bahçe Hafriyat Kazısı', unit: 'm³', price: 350, description: 'Bahçe alanında zemin kazı ve hafriyat çalışması.', image: 'images/services/peyzaj_hafriyat.png', conditions: 'Hafriyat nakliyesi dahil değildir. Zemin sertliğine göre fiyat değişebilir. Altyapı tespiti müşteriye aittir.' },
            { name: 'Kırlent (Mıcır) Dolgusu', unit: 'm³', price: 450, description: 'Zemin altı drenaj ve dolgu için kırlent serimi.', image: 'images/services/peyzaj_kirlent.png', conditions: 'Kırlent malzemesi dahil. Sıkıştırma dahil. Nakliye dahil.' },
            { name: 'Çelik Hasır Döşeme', unit: 'm²', price: 550, description: 'Betonarme güçlendirme için çelik hasır uygulaması.', image: 'images/services/peyzaj_celik_hasir.png', conditions: 'Q188/Q221 çelik hasır. Bindirme payı dahil. Beton dökümü ayrıca hesaplanır.' },
            { name: 'Bahçe Zemin Betonu', unit: 'm²', price: 1600, description: 'Elle veya makineli zemin beton dökümü.', image: 'images/services/peyzaj_zemin_beton.png', conditions: 'C25/30 beton sınıfı. 15 cm kalınlık standart. Vibrasyon ve tesviye dahil.' },
            { name: 'Zemin Şap Uygulaması', unit: 'm²', price: 650, description: 'Zemin tesviye şapı dökümü ve düzeltme.', image: 'images/services/peyzaj_zemin_sap.png', conditions: '5 cm kalınlık standart. Kuruma süresi 7 gün. Seramik altı hazırlık.' },
            { name: 'Bims Blok Duvar Örümü', unit: 'Adet', price: 230, description: 'Hafif bims blok ile duvar örme işçiliği.', image: 'images/services/peyzaj_bims_duvar.png', conditions: 'Bims blok malzemesi dahil. Harç dahil. Köşe ve bağlantı demirleri dahil.' },
            { name: 'Kara Sıva Uygulaması', unit: 'm²', price: 450, description: 'Duvar yüzeyi kaba sıva işçiliği.', image: 'images/services/peyzaj_kara_siva.png', conditions: 'Sıva harcı dahil. Köşe profilleri dahil. İnce sıva ayrıca hesaplanır.' },
            { name: 'Zemin Su Yalıtımı (Membran)', unit: 'm²', price: 1200, description: 'Su geçirmez membran izolasyon uygulaması.', image: 'images/services/peyzaj_membran.png', conditions: '3mm kalınlık. Bindirme noktaları takviyeli. 10 yıl izolasyon garantisi.' },
            { name: 'Zemin Su Gideri Montajı', unit: 'Adet', price: 12000, description: 'Paslanmaz çelik ızgaralı yer süzgeci ve tesisat bağlantısı.', image: 'images/services/peyzaj_su_gideri.png', conditions: 'Paslanmaz süzgeç dahil. Fosseptik/kanalizasyon bağlantısı dahil. Sifon dahil.' },
            { name: 'Dış Mekan Seramik Döşeme', unit: 'm²', price: 1350, description: 'Bahçe ve teras için antifriz seramik uygulaması.', image: 'images/services/peyzaj_seramik.png', conditions: 'Seramik bedeli hariç. Yapıştırıcı ve derz dahil. Dış mekan uyumlu fuga.' },
            { name: 'Ateş Çukuru Yapımı', unit: 'Adet', price: 25000, description: 'Özel tasarım ateş çukuru inşaatı ve montajı.', image: 'images/services/peyzaj_ates_cukuru.png', conditions: 'Ateşe dayanıklı tuğla/taş dahil. Metal halka dahil. Oturma alanı ayrıca hesaplanır.' }
        ]
    },
    'insaat': {
        name: '🏗️ İnşaat ve Tadilat',
        services: [
            { name: 'Boya Badana (İç Mekan)', unit: 'm²', price: 150, description: '2 kat boya + astar ve tamiratlar.', image: 'images/services/boya_ic_mekan.png', conditions: 'Boya malzemesi dahil. Mobilya taşıma müşteriye ait. Çatlak tamiratı fiyata dahil.' },
            { name: 'Alçıpan Asma Tavan', unit: 'm²', price: 650, description: 'Gizli ışık bantlı asma tavan yapımı.', image: 'images/services/alcipan.png', conditions: 'Alçıpan ve profil dahil. LED aydınlatma ayrı hesaplanır. 5 yıl garanti.' },
            { name: 'Seramik Fayans Döşeme', unit: 'm²', price: 500, description: 'Zemin ve duvar seramik işçiliği.', image: 'images/services/seramik.png', conditions: 'Seramik bedeli hariç. Yapıştırıcı ve derz dolgu dahil. Kesim firesi %10.' },
            { name: 'Anahtar Teslim Mutfak', unit: 'Proje', price: 45000, description: 'Dolap, tezgah ve tesisat yenileme.', image: 'images/services/insaat_mutfak.png', conditions: 'Dolap, tezgah ve tesisat dahil. Elektrikli cihazlar hariç. Keşif sonrası revize edilebilir.' },
            { name: 'Laminat Parke Döşeme', unit: 'm²', price: 350, description: 'Derzli laminat parke ve süpürgelik.', image: 'images/services/laminat.png', conditions: 'Parke ve süpürgelik dahil. Alt kap ve ses yalıtımı dahil. Eski zemin sökümü ayrıca.' },
            { name: 'Dış Cephe Mantolama', unit: 'm²', price: 950, description: 'Isı yalıtımı ve dekoratif sıva.', image: 'images/services/mantolama.png', conditions: '5 cm EPS dahil. İskele bedeli dahil. 10 yıl imalat garantisi. Ruhsat müşteriye ait.' },
            { name: 'Çatı Tadilatı', unit: 'm²', price: 1200, description: 'Kiremit aktarma ve izolasyon.', image: 'images/services/insaat_cati.png', conditions: 'Kiremit değişimi hariç. İzolasyon dahil. Yağışlı havalarda çalışma yapılmaz.' },
            { name: 'Çelik Kapı Montajı', unit: 'Adet', price: 4500, description: 'Güvenlikli çelik kapı.', image: 'images/services/insaat_celik_kapi.png', conditions: 'Kapı bedeli hariç. Montaj ve kasa dahil. Eski kapı sökümü dahil.' },
            { name: 'Pencere (PVC) Değişimi', unit: 'Adet', price: 3500, description: 'Isı camlı PVC pencere.', image: 'images/services/insaat_pencere.png', conditions: 'Standart 120x150 cm ölçü. Özel ölçüler için keşif gerekli. Söküm dahil.' },
            { name: 'Moloz Atımı', unit: 'Çuval', price: 50, description: 'İnşaat atıklarının taşınması.', image: 'images/services/insaat_moloz.png', conditions: 'Minimum 20 çuval. Nakliye dahil. Tehlikeli atık kabul edilmez.' },
            { name: 'Banyo Renovasyonu', unit: 'Proje', price: 35000, description: 'Komple banyo yenileme projesi.', image: 'images/services/insaat_banyo.png', conditions: 'Tesisat, seramik ve armatür dahil. Vitrifiye hariç. Keşif sonrası netleşir.' },
            { name: 'Balkon Kapatma', unit: 'm²', price: 3500, description: 'Cam ve alüminyum balkon kapatma.', image: 'images/services/insaat_balkon.png', conditions: 'Alüminyum ve cam dahil. Isıcamlı sistem. Site/apartman izni müşteriye ait.' },
            { name: 'Zemin Şap Dökme', unit: 'm²', price: 180, description: 'Tesviye şapı ve zemin hazırlığı.', image: 'images/services/insaat_sap.png', conditions: 'Malzeme dahil. Kuruma süresi 7-10 gün. Minimum 5 cm kalınlık.' },
            { name: 'Dış Cephe Boyama', unit: 'm²', price: 120, description: 'Dış cephe boya ve koruma.', image: 'images/services/boya_dis_cephe.png', conditions: 'Dış cephe boyası dahil. İskele bedeli ayrıdır. Yağışsız hava gerektirir.' },
            { name: 'Dekoratif Boya', unit: 'm²', price: 250, description: 'Özel efektli dekoratif duvar boyama.', image: 'images/services/boya_dekoratif.png', conditions: 'Efekt malzemesi dahil. Desen seçimi müşteriyle belirlenir. Numune uygulaması yapılır.' },
            { name: 'Duvar Kağıdı Uygulama', unit: 'm²', price: 180, description: 'Duvar kağıdı döşeme ve tutkal işi.', image: 'images/services/boya_duvar_kagidi.png', conditions: 'Duvar kağıdı bedeli hariç. Tutkal ve işçilik dahil. Duvar hazırlığı dahil.' },
            { name: 'Epoksi Zemin Kaplama', unit: 'm²', price: 350, description: 'Endüstriyel epoksi zemin uygulaması.', image: 'images/services/boya_epoksi.png', conditions: 'Epoksi malzeme dahil. Zemin hazırlığı dahil. Kuruma süresi 48 saat.' },
            { name: 'Tavan Boyama', unit: 'm²', price: 100, description: 'Tavan boyama ve tamir işi.', image: 'images/services/boya_tavan.png', conditions: 'Tavan boyası dahil. Çatlak tamiratı dahil. Yüksek tavan ek ücrete tabidir.' },
            { name: 'Sıva Uygulaması', unit: 'm²', price: 200, description: 'İç veya dış sıva işçiliği.', image: 'images/services/siva.png', conditions: 'Sıva malzemesi dahil. Makineli veya el sıvası. Yüzey hazırlığı dahil.' },
            { name: 'Alçıpan Bölme Duvar', unit: 'm²', price: 550, description: 'Hafif bölme duvar yapımı.', image: 'images/services/insaat_alcipan_bolme.png', conditions: 'Çift kat alçıpan. İzolasyon dahil. Kapı boşluğu keşifte belirlenir.' },
            { name: 'Isı ve Su İzolasyonu', unit: 'm²', price: 450, description: 'Çatı ve dış cephe izolasyonu.', image: 'images/services/insaat_izolasyon.png', conditions: 'İzolasyon malzemesi dahil. 10 yıl garanti. Uygulama alanı temiz olmalı.' },
            { name: 'Granit Zemin Döşeme', unit: 'm²', price: 750, description: 'Granit ve mermer zemin döşeme.', image: 'images/services/insaat_granit.png', conditions: 'Granit bedeli hariç. Yapıştırıcı ve derz dahil. Hassas kesim işçiliği.' },
            { name: 'Kapı Boyama', unit: 'Adet', price: 350, description: 'Ahşap kapı boyama ve cilalama.', image: 'images/services/boya_kapi.png', conditions: 'Boya/cila dahil. Kapı sökme takma dahil. Zımpara ve dolgu dahil.' },
            { name: 'Boya Cila', unit: 'm²', price: 180, description: 'Ahşap yüzey vernikleme ve cilalama.', image: 'images/services/boya_cila.png', conditions: 'Vernik/cila malzemesi dahil. Zımpara ve temizlik dahil. 2 kat uygulama.' },
            { name: 'Cam Balkon Sistemi', unit: 'm²', price: 4500, description: 'Katlanır cam balkon kapatma sistemi.', image: 'images/services/hizmet_cam_balkon.png', conditions: '8mm temperli cam. Alüminyum ray sistemi. 5 yıl mekanizma garantisi. Site izni müşteriye ait.' },
            { name: 'Panjur Montajı', unit: 'Adet', price: 2200, description: 'Motorlu veya manuel alüminyum panjur.', image: 'images/services/hizmet_panjur.png', conditions: 'Panjur ve montaj dahil. Motor bedeli ayrıdır. Standart pencere boyutu 120x150 cm.' },
            { name: 'Sineklik Montajı', unit: 'Adet', price: 350, description: 'Menteşeli veya sürgülü sineklik.', image: 'images/services/hizmet_sineklik.png', conditions: 'Alüminyum çerçeve ve file dahil. Ölçüye göre imal edilir. 2 yıl garanti.' },
            { name: 'Tente Montajı', unit: 'm²', price: 1200, description: 'Katlanır veya sabit balkon tentesi.', image: 'images/services/hizmet_tente.png', conditions: 'Tente kumaşı ve mekanizma dahil. Motorlu sistem için ek ücret. Renk seçenekli.' },
            { name: 'Paslanmaz Korkuluk', unit: 'm', price: 1800, description: 'Balkon ve merdiven paslanmaz korkuluğu.', image: 'images/services/hizmet_korkuluk.png', conditions: '304 kalite paslanmaz çelik. Montaj dahil. Cam panelli sistem ek ücrete tabidir.' },
            { name: 'Duvar Kağıdı Yapıştırma', unit: 'm²', price: 120, description: 'Profesyonel duvar kağıdı uygulama.', image: 'images/services/hizmet_duvar_kagidi.png', conditions: 'Duvar kağıdı hariç. Tutkal ve duvar hazırlığı dahil. Eski kağıt sökümü ayrıca.' },
            { name: 'Çatı Kiremit Onarımı', unit: 'm²', price: 350, description: 'Kırık kiremit değişimi ve aktarma.', image: 'images/services/hizmet_cati_onarim.png', conditions: 'Kiremit bedeli dahil. İskele veya merdiven dahil. Yağışsız hava gerektirir.' },
            { name: 'LVT/PVC Zemin Kaplama', unit: 'm²', price: 280, description: 'Lüks vinil karo zemin döşeme.', image: 'images/services/hizmet_zemin_kaplama.png', conditions: 'LVT kaplama dahil. Alt kap/ses yalıtımı dahil. Zemin düzgün olmalı.' }
        ]
    },
    'elektrik': {
        name: '⚡ Elektrik ve Teknoloji',
        services: [
            { name: 'Anahtar/Priz Montajı', unit: 'Adet', price: 150, description: 'Sıva altı veya üstü montaj.', image: 'images/services/elektrik_anahtar.png', conditions: 'Anahtar/priz bedeli hariç. Sıva altı için duvar işçiliği ayrıca hesaplanır.' },
            { name: 'Avize Montajı', unit: 'Adet', price: 350, description: 'Tavan bağlantısı ve elektrik testi.', image: 'images/services/avize.png', conditions: 'Avize bedeli hariç. 10 kg üzeri avizeler için ek destek gerekebilir.' },
            { name: 'LED Aydınlatma', unit: 'Metre', price: 250, description: 'Şerit LED ve trafo montajı.', image: 'images/services/aydinlatma.png', conditions: 'LED şerit ve trafo dahil. Profil bedeli ayrıdır. 2 yıl garanti.' },
            { name: 'Elektrik Panosu', unit: 'Adet', price: 2500, description: 'Sigorta değişimi ve pano düzenleme.', image: 'images/services/pano.png', conditions: 'Pano ve sigorta malzemesi dahil. Şebeke kesintisi gerekir.' },
            { name: 'Akıllı Ev Sistemi', unit: 'Proje', price: 15000, description: 'Otomasyon ve uzaktan kontrol.', image: 'images/services/elektrik_akilli_ev.png', conditions: 'Proje bazlı fiyatlandırma. Cihaz bedelleri ayrı. Yazılım kurulumu dahil.' },
            { name: 'Görüntülü Diafon', unit: 'Daire', price: 1200, description: 'Zil paneli ve monitör montajı.', image: 'images/services/elektrik_diyafon.png', conditions: 'Cihaz bedeli hariç. Kablolama dahil. Güç kaynağı dahil.' },
            { name: 'Kamera ve Güvenlik', unit: 'Set', price: 8500, description: '4 kameralı kayıt sistemi.', image: 'images/services/kamera_kurulum.png', conditions: '4 kamera, NVR ve HDD dahil. Kablo çekimi ayrı hesaplanır.' },
            { name: 'Solar Panel Kurulumu', unit: 'kW', price: 25000, description: 'Güneş enerjisi sistemi.', image: 'images/services/solar_kurulum.png', conditions: 'Panel, invertör ve montaj dahil. İzin işlemleri müşteriye ait. 25 yıl panel garantisi.' },
            { name: 'Jeneratör Kurulumu', unit: 'Proje', price: 45000, description: 'Yedek güç jeneratörü montajı.', image: 'images/services/elektrik_jenerator.png', conditions: 'Jeneratör bedeli hariç. Bağlantı ve transfer switch dahil. İzin işlemleri ayrı.' },
            { name: 'Klima Elektrik Hattı', unit: 'Adet', price: 1500, description: 'Klima için özel elektrik bağlantısı.', image: 'images/services/elektrik_klima.png', conditions: 'Kablo ve sigorta dahil. Klima montajı ayrı hizmettir.' },
            { name: 'Telefon/İnternet Tesisatı', unit: 'Nokta', price: 850, description: 'CAT6 ve telefon kablo tesisatı.', image: 'images/services/elektrik_telefon.png', conditions: 'CAT6 kablo dahil. Priz ve patchpanel ayrı hesaplanır.' },
            { name: 'Elektrik Arıza Tespiti', unit: 'İşlem', price: 500, description: 'Elektrik arızası tespit ve tamir.', image: 'images/services/elektrik_ariza_tespit.png', conditions: 'Tespit ücreti, onarım ücretinden düşülür. Malzeme bedeli ayrı.' },
            { name: 'Kablo Çekme', unit: 'm', price: 45, description: 'Sıva altı veya üstü kablo çekme.', image: 'images/services/elektrik_kablo.png', conditions: 'Kablo bedeli dahil. Sıva işi ayrıca hesaplanır. NYM veya NYY kablo.' },
            { name: 'Kablo Kanal Döşeme', unit: 'm', price: 85, description: 'Plastik veya metal kablo kanalı.', image: 'images/services/elektrik_kablo_kanal.png', conditions: 'Kanal bedeli dahil. Köşe ve bağlantı parçaları dahil.' },
            { name: 'Kaçak Akım Rölesi', unit: 'Adet', price: 650, description: 'Kaçak akım koruma kontörü montajı.', image: 'images/services/elektrik_kacak_role.png', conditions: 'Röle malzemesi dahil. 30mA hassasiyet. Pano uygunluğu kontrol edilir.' },
            { name: 'Sensör/Hareket Dedektörü', unit: 'Adet', price: 350, description: 'Hareket sensörü montajı.', image: 'images/services/elektrik_sensor.png', conditions: 'Sensör bedeli dahil. Kablolama dahil. Açı ve hassasiyet ayarı yapılır.' },
            { name: 'Spot Lamba Montajı', unit: 'Adet', price: 250, description: 'Gömme veya ray spot montajı.', image: 'images/services/elektrik_spot.png', conditions: 'Spot armatür hariç. Alçıpan kesimi dahil. LED ampul ayrı.' },
            { name: 'Topraklama Sistemi', unit: 'İşlem', price: 3500, description: 'Bina topraklama ölçümü ve kurulumu.', image: 'images/services/elektrik_topraklama.png', conditions: 'Topraklama elektrodu dahil. Ölçüm raporu dahil. Yönetmeliğe uygun.' },
            { name: 'Yangın Alarm Sistemi', unit: 'Set', price: 5500, description: 'Duman dedektörü ve alarm kurulumu.', image: 'images/services/guvenlik_yangin.png', conditions: 'Dedektör ve santral dahil. Sertifikalı sistem. Yıllık bakım ayrı.' },
            { name: 'Solar Batarya Kurulumu', unit: 'Adet', price: 15000, description: 'Güneş enerjisi depolama sistemi.', image: 'images/services/solar_batarya.png', conditions: 'Batarya ve invertör entegrasyonu dahil. Mevcut sisteme uyum kontrolü.' },
            { name: 'Klima Bakımı', unit: 'Adet', price: 650, description: 'Klimatik cihaz bakım ve temizliği.', image: 'images/services/klima_bakim.png', conditions: 'Filtre temizliği, gaz kontrolü dahil. Gaz dolumu ayrı ücretlidir.' },
            { name: 'Klima Kanalı Tesisatı', unit: 'm', price: 350, description: 'Merkezi klima kanal sistemi.', image: 'images/services/iklimlendirme_kanal.png', conditions: 'Galvaniz kanal dahil. Menfez bedeli ayrıdır. Proje bazlı fiyatlandırma.' }
        ]
    },
    'tesisat': {
        name: '🔧 Su ve Doğalgaz Tesisatı',
        services: [
            { name: 'Su Kaçağı Tespiti', unit: 'İşlem', price: 1500, description: 'Termal kamera ile kırmadan tespit.', image: 'images/services/tesisat_tikaniklik.png', conditions: 'Tespit ücreti onarım ücretinden düşülür. Kırma gerektiren durumlarda ek ücret. Rapor dahil.' },
            { name: 'Musluk/Batarya Montajı', unit: 'Adet', price: 350, description: 'Mutfak veya banyo bataryası.', image: 'images/services/tesisat_batarya.png', conditions: 'Batarya bedeli hariç. Eski batarya sökümü dahil. Conta ve bağlantı dahil.' },
            { name: 'Klozet Montajı', unit: 'Adet', price: 850, description: 'Gömme rezervuar veya standart.', image: 'images/services/klozet.png', conditions: 'Klozet bedeli hariç. Eski klozet sökümü dahil. Conta ve kelepçe malzemesi dahil.' },
            { name: 'Duşakabin Montajı', unit: 'Adet', price: 1200, description: 'Cam kabin ve tekne.', image: 'images/services/dus.png', conditions: 'Duşakabin bedeli hariç. Montaj ve silikon dahil. Tekne sifonu ayrıca.' },
            { name: 'Kombi Bakımı', unit: 'Adet', price: 750, description: 'Yıllık periyodik bakım.', image: 'images/services/kombi.png', conditions: 'Bakım kiti dahil. Arıza tespiti dahil. Parça değişimi ayrı faturalandırılır.' },
            { name: 'Petek Temizliği', unit: 'Adet', price: 250, description: 'Makineli kimyasal temizlik.', image: 'images/services/tesisat_kalorifer.png', conditions: 'Kimyasal madde dahil. Vana kontağı yapılır. Pas önleyici eklenir.' },
            { name: 'Yerden Isıtma', unit: 'm²', price: 650, description: 'Borulama ve kollektör.', image: 'images/services/tesisat_yerden_isitma.png', conditions: 'Boru ve kollektör dahil. Şap dökümü ayrıca. Test ve devreye alma dahil.' },
            { name: 'Boru Tesisatı Yenileme', unit: 'Daire', price: 8500, description: 'PPRC temiz su tesisatı.', image: 'images/services/boru.png', conditions: 'PPR-C boru dahil. Eski boru sökümü dahil. Duvar kapatma ayrıca.' },
            { name: 'Fosseptik Temizliği', unit: 'Sefer', price: 2500, description: 'Vakümlu fosseptik boşaltma.', image: 'images/services/tesisat_fosseptik.png', conditions: 'Standart çekiş 5 ton. Fazla tonaj ek ücrete tabidir. Nakliye dahil.' },
            { name: 'Boyler Montajı', unit: 'Adet', price: 3500, description: 'Elektrikli su ısıtıcı kurulumu.', image: 'images/services/tesisat_boyler.png', conditions: 'Boyler bedeli hariç. Elektrik ve tesisat bağlantısı dahil. 2 yıl işçilik garantisi.' },
            { name: 'Su Deposu Montajı', unit: 'Adet', price: 4500, description: 'Çatı su deposu kurulumu ve bağlantı.', image: 'images/services/tesisat_su_deposu.png', conditions: 'Depo bedeli hariç. Destek ayakları dahil. Boru bağlantısı dahil.' },
            { name: 'Su Arıtma Cihazı', unit: 'Adet', price: 3500, description: 'Taş altı su arıtma sistemi.', image: 'images/services/tesisat_aritma.png', conditions: 'Cihaz bedeli dahil. Montaj ve filtre dahil. Yıllık bakım ayrıca.' },
            { name: 'Duş Sistemi Montajı', unit: 'Set', price: 2500, description: 'Yağmurlama ve el duşu seti.', image: 'images/services/tesisat_dus.png', conditions: 'Set bedeli hariç. Montaj ve sızdırmazlık dahil. Duvar delimleri dahil.' },
            { name: 'Hidrofor Montajı', unit: 'Adet', price: 6500, description: 'Su basınç artırıcı sistemi.', image: 'images/services/tesisat_hidrofor.png', conditions: 'Hidrofor bedeli hariç. Elektrik ve tesisat bağlantısı dahil. Basınç ayarı dahil.' },
            { name: 'Gömme Klozet Montajı', unit: 'Adet', price: 1500, description: 'Duvar gömme klozet sistem.', image: 'images/services/tesisat_klozet.png', conditions: 'Rezervuar ve klozet hariç. Duvar hazırlığı dahil. Sızdırmazlık garantili.' },
            { name: 'Kombi Değişimi', unit: 'Adet', price: 8500, description: 'Yeni kombi montaj ve bağlantısı.', image: 'images/services/tesisat_kombi.png', conditions: 'Kombi bedeli hariç. Eski kombi sökümü dahil. Baca bağlantısı dahil.' },
            { name: 'Lavabo Montajı', unit: 'Adet', price: 650, description: 'Lavabo ve tesisat bağlantısı.', image: 'images/services/tesisat_lavabo.png', conditions: 'Lavabo bedeli hariç. Sifon ve bağlantı dahil. Silikon dahil.' },
            { name: 'PPR Boru Döşeme', unit: 'm', price: 85, description: 'PPR sıcak/soğuk su borusu.', image: 'images/services/tesisat_ppr.png', conditions: 'Boru ve ek parçaları dahil. Kaynak işçiliği dahil. Test dahil.' },
            { name: 'PVC Boru Tesisatı', unit: 'm', price: 65, description: 'Atık su PVC boru döşeme.', image: 'images/services/tesisat_pvc_boru.png', conditions: 'Boru ve yapıştırıcı dahil. Eğim ayarı yapılır. Tıkanıklık testi dahil.' },
            { name: 'Rezervuar Değişimi', unit: 'Adet', price: 850, description: 'Klozet rezervuarı değişimi.', image: 'images/services/tesisat_rezervuar.png', conditions: 'Rezervuar bedeli hariç. İç takım dahil. Eski rezervuar sökümü dahil.' },
            { name: 'Şofben Montajı', unit: 'Adet', price: 2500, description: 'Gazlı su ısıtıcı montajı.', image: 'images/services/tesisat_sofben.png', conditions: 'Şofben bedeli hariç. Gaz ve su bağlantısı dahil. Baca bağlantısı dahil.' },
            { name: 'Tesisat Tadilatları', unit: 'Proje', price: 12000, description: 'Komple tesisat yenileme.', image: 'images/services/tesisat_tadilat.png', conditions: 'Keşif sonrası fiyatlandırma. Malzeme dahil. Duvar kapatma ayrıca.' },
            { name: 'Lavabo Takımı', unit: 'Set', price: 3500, description: 'Lavabo, batarya ve ayaklık seti.', image: 'images/services/lavabo.png', conditions: 'Set bedeli hariç. Montaj ve bağlantı dahil. Silikon ve conta dahil.' },
            { name: 'Su Pompası Montajı', unit: 'Adet', price: 4500, description: 'Basınç artırıcı pompa kurulumu.', image: 'images/services/hizmet_su_pompasi.png', conditions: 'Pompa bedeli hariç. Boru bağlantısı ve elektrik dahil. 2 yıl pompa garantisi.' }
        ]
    },
    'mimarlik': {
        name: '🏛️ İç Mimarlık ve Proje',
        services: [
            { name: 'İç Mimari Proje', unit: 'm²', price: 250, description: 'Rölöve ve yerleşim planı.', image: 'images/services/ic-mimarlik.png', conditions: 'Ön ödeme %50. Revizyon 2 tur dahil. Uygulama çizimleri ayrıca.' },
            { name: '3D Görselleştirme', unit: 'Kare', price: 1500, description: 'Fotogerçekçi render çalışması.', image: 'images/services/ic_mimarlik_render.png', conditions: 'Açı başına fiyat. 2 revizyon dahil. Ham dosya ayrıca ücretlendirilir.' },
            { name: 'Mobilya Tasarımı', unit: 'Parça', price: 3500, description: 'Özel üretim mobilya çizimi.', image: 'images/services/ic_mimarlik_mobilya.png', conditions: 'Teknik çizim ve 3D model dahil. Üretim ayrıca. Malzeme listesi dahil.' },
            { name: 'Aydınlatma Tasarımı', unit: 'Proje', price: 5000, description: 'Mekan aydınlatma hesabı.', image: 'images/services/ic_mimarlik_aydinlatma.png', conditions: 'Armatür seçimi dahil. Elektrik projesi ayrıca. Lüks hesabı raporu dahil.' },
            { name: 'Akustik Düzenleme', unit: 'm²', price: 850, description: 'Ses yalıtımı ve paneller.', image: 'images/services/ic_mimarlik_akustik.png', conditions: 'Panel malzemesi dahil. Montaj dahil. Akustik test raporu dahil.' },
            { name: 'Konsept Tasarım', unit: 'Proje', price: 8000, description: 'Mekan konsepti ve mood board.', image: 'images/services/mimarlik_konsept.png', conditions: 'Görsel sunum dahil. 3 farklı konsept. Malzeme önerileri dahil.' },
            { name: 'Malzeme Seçimi Danışmanlığı', unit: 'Seans', price: 3500, description: 'Malzeme, renk ve doku seçimi.', image: 'images/services/mimarlik_malzeme.png', conditions: 'Mağaza ziyareti dahil. Numune temini ayrıca. Yazılı rapor dahil.' },
            { name: 'Saha Kontrol', unit: 'Ziyaret', price: 1500, description: 'Uygulama kontrolü ve raporlama.', image: 'images/services/mimarlik_saha.png', conditions: 'Günlük ziyaret. Fotoğraflı rapor dahil. İstanbul içi nakliye dahil.' },
            { name: 'Mood Board Hazırlama', unit: 'Proje', price: 2500, description: 'Görsel konsept panosu hazırlama.', image: 'images/services/ic_mimarlik_moodboard.png', conditions: 'Dijital ve basılı sunum. 2 revizyon dahil. Malzeme önerileri dahil.' },
            { name: 'Saha Yönetimi', unit: 'Gün', price: 3500, description: 'İnşaat yerinde denetim ve koordinasyon.', image: 'images/services/ic_mimarlik_saha.png', conditions: 'Tam gün sahada. Tedarikçi koordinasyonu dahil. Günlük rapor.' },
            { name: 'Teknik Çizim', unit: 'Pafta', price: 1800, description: 'Detay ve kesit çizimleri.', image: 'images/services/ic_mimarlik_teknik.png', conditions: 'AutoCAD çıktısı. 2 revizyon dahil. Ölçekli baskı ayrıca.' },
            { name: 'Dekorasyon Danışmanlığı', unit: 'Seans', price: 2500, description: 'Ev ve ofis dekorasyon tasarımı ve ürün seçimi.', image: 'images/services/hizmet_dekorasyon.png', conditions: 'Online veya yerinde danışmanlık. Ürün tedariki ayrıca faturalandırılır.' },
            { name: 'Ayna Montajı', unit: 'Adet', price: 450, description: 'Dekoratif ve banyo aynası montajı.', image: 'images/services/hizmet_ayna_montaj.png', conditions: 'Ayna bedeli hariç. Duvar tipi uygunluğu kontrol edilir. Montaj dahil.' },
            { name: 'Mobilya Montajı', unit: 'Saat', price: 250, description: 'Paket mobilya kurulumu ve montajı.', image: 'images/services/hizmet_mobilya_montaj.png', conditions: 'Eski mobilya sökümü ayrıca. Minimum 2 saat. Malzeme hasarı garanti dışı.' },
            { name: 'Stor Perde Montajı', unit: 'Adet', price: 350, description: 'Stor ve zebra perde montajı.', image: 'images/services/hizmet_stor_perde.png', conditions: 'Perde bedeli hariç. Ölçü alımı dahil. Motor için ek ücret.' },
            { name: 'Jaluzi Perde Montajı', unit: 'Adet', price: 400, description: 'Ahşap veya alüminyum jaluzi montajı.', image: 'images/services/hizmet_jaluzi.png', conditions: 'Jaluzi bedeli hariç. Ölçüye göre sipariş. Montaj dahil.' },
            { name: 'Akıllı Kilit Montajı', unit: 'Adet', price: 1500, description: 'Dijital ve parmak izli kilit montajı.', image: 'images/services/hizmet_kapi_kilidi.png', conditions: 'Kilit bedeli hariç. Kapı uyumluluğu kontrol edilir. Kurulum ve pil dahil.' }
        ]
    },
    'temizlik': {
        name: '🧹 Temizlik Hizmetleri',
        services: [
            { name: 'Ev Temizliği (Tam Gün)', unit: 'Gün', price: 2500, description: '1 personel, 8 saat detaylı temizlik.', image: 'images/services/temizlik_ev.png', conditions: 'Malzeme dahil. Ek personel ayrıca. 8 saati aşan süre ek ücrete tabidir.' },
            { name: 'Ofis Temizliği', unit: 'm²', price: 45, description: 'Periyodik ofis ve iş yeri temizliği.', image: 'images/services/temizlik_ofis.png', conditions: 'Malzeme dahil. Minimum 50 m². Hafta sonu %25 ek ücret.' },
            { name: 'İnşaat Sonrası Temizlik', unit: 'm²', price: 60, description: 'Kaba ve ince inşaat temizliği.', image: 'images/services/temizlik-insaat.png', conditions: 'Kırıntı ve toz temizliği dahil. Moloz kaldırma ayrıca. İnce temizlik %30 ek.' },
            { name: 'Koltuk Yıkama', unit: 'Takım', price: 1500, description: 'Yerinde buharlı koltuk yıkama.', image: 'images/services/temizlik_koltuk.png', conditions: 'Takım: 3+2+1 kişilik. Ek parça ayrıca. Kuruma süresi 4-6 saat.' },
            { name: 'Dış Cephe Cam Temizliği', unit: 'm²', price: 85, description: 'Vinçli veya iskeleli cam temizliği.', image: 'images/services/temizlik-cam.png', conditions: 'Vinç/iskele bedeli dahil. Yüksek katlarda risk primi. Hava şartlarına bağlı.' },
            { name: 'Endüstriyel Temizlik', unit: 'm²', price: 75, description: 'Fabrika ve depo zemin temizliği.', image: 'images/services/temizlik_endustriyel.png', conditions: 'Makine ile temizlik. Yağ ve kir sökücü dahil. Minimum 100 m².' },
            { name: 'Dezenfeksiyon', unit: 'Alan', price: 1500, description: 'Nano gümüş iyon ile ortam dezenfeksiyonu.', image: 'images/services/temizlik_dezenfeksiyon.png', conditions: 'Standart alan 100 m² dahil. Fazlası m² bazında. Sertifika dahil.' },
            { name: 'Halı Yıkama', unit: 'm²', price: 120, description: 'Yerinde veya fabrikada halı yıkama.', image: 'images/services/temizlik_hali.png', conditions: 'Nakliye dahil. Kuruma 24 saat. Özel leke için ek ücret.' },
            { name: 'Perde Yıkama', unit: 'm²', price: 80, description: 'Perde sökme, yıkama ve takma.', image: 'images/services/temizlik_perde.png', conditions: 'Söküm ve takma dahil. Ütü dahil. Onarım ayrıca.' },
            { name: 'Banyo Temizliği', unit: 'Adet', price: 350, description: 'Detaylı banyo temizliği ve dezenfeksiyon.', image: 'images/services/temizlik_banyo.png', conditions: 'Kireç sökücü dahil. Fayans arası temizlik dahil. Dezenfeksiyon dahil.' },
            { name: 'Mutfak Temizliği', unit: 'Adet', price: 450, description: 'Mutfak derin temizlik ve yağ alımı.', image: 'images/services/temizlik_mutfak.png', conditions: 'Yağ sökücü dahil. Beyaz eşya içi ayrıca. Davlumbaz filtresi dahil.' },
            { name: 'Yatak/Döşek Yıkama', unit: 'Adet', price: 350, description: 'Buharlı yatak ve döşek temizliği.', image: 'images/services/temizlik_yatak.png', conditions: 'Akar ve bakteri temizliği dahil. Kuruma 2-3 saat. Koku giderici dahil.' }
        ]
    },
    'organizasyon': {
        name: '🎉 Organizasyon ve Etkinlik',
        services: [
            { name: 'Düğün Organizasyonu', unit: 'Paket', price: 35000, description: 'Süsleme, müzik ve mekan giydirme.', image: 'images/services/organizasyon_dugun.png', conditions: 'Mekan kirası hariç. DJ ve müzik sistemi dahil. Süsleme dahil.' },
            { name: 'Catering Hizmeti', unit: 'Kişi Başı', price: 550, description: 'Kokteyl veya yemekli menü servisi.', image: 'images/services/catering.png', conditions: 'Minimum 50 kişi. Servis personeli dahil. Menü seçenekleri sunulur.' },
            { name: 'Ses ve Işık Sistemi', unit: 'Günlük', price: 12000, description: 'Profesyonel sahne ses ve ışık kurulumu.', image: 'images/services/organizasyon_ses_isik.png', conditions: 'Kurulum ve söküm dahil. Teknisyen dahil. Elektrik bağlantısı müşteriye ait.' },
            { name: 'Drone Çekimi', unit: 'Gün', price: 5000, description: '4K hava çekimi ve kurgu.', image: 'images/services/organizasyon_drone.png', conditions: 'Uçuş izni alınır. Hava durumuna bağlı. Kısa kurgu dahil.' },
            { name: 'Hostes ve Karşılama', unit: 'Personel', price: 2000, description: 'Etkinlik karşılama ve yönlendirme ekibi.', image: 'images/services/organizasyon_hostes.png', conditions: 'Günlük 8 saat. Fazla mesai %50 ek. Kıyafet dahil.' },
            { name: 'Kurumsal Kokteyl', unit: 'Kişi Başı', price: 350, description: 'Bistro masa düzeni ve ikramlar.', image: 'images/services/organizasyon_kokteyl.png', conditions: 'Minimum 30 kişi. İçecekler dahil. Garson dahil.' },
            { name: 'Profesyonel Fotoğrafçılık', unit: 'Gün', price: 8000, description: 'Etkinlik ve düğün fotoğraf çekimi.', image: 'images/services/organizasyon_foto.png', conditions: '300 düzenlenmiş kare dahil. Albüm ayrıca. Ham dosyalar ek ücret.' },
            { name: 'Mekan Süsleme', unit: 'Proje', price: 15000, description: 'Profesyonel mekan dekorasyonu.', image: 'images/services/organizasyon_susleme.png', conditions: 'Çiçek ve malzeme dahil. Kurulum ve söküm dahil. Tasarım onayı sonrası.' },
            { name: 'Genel Etkinlik Organizasyonu', unit: 'Proje', price: 25000, description: 'Her türlü organizasyon yönetimi.', image: 'images/services/organizasyon-genel.png', conditions: 'Planlama ve koordinasyon dahil. Tedarikçi yönetimi dahil. Keşif sonrası fiyat.' },
            { name: 'Sahne Kurulumu', unit: 'Set', price: 18000, description: 'Profesyonel sahne ve platform montajı.', image: 'images/services/organizasyon_sahne.png', conditions: 'Standart 6x4m sahne. Büyük boyut ek ücret. Kurulum/söküm dahil.' }
        ]
    },
    'web': {
        name: '💻 Web ve Dijital Çözümler',
        services: [
            { name: 'Kurumsal Web Sitesi', unit: 'Proje', price: 25000, description: 'Mobil uyumlu, yönetim panelli web sitesi.', image: 'images/services/yazilim_web.png', conditions: 'Ön ödeme %50. 5 sayfa dahil. Hosting 1 yıl hediye. 2 revizyon dahil.' },
            { name: 'E-Ticaret Sitesi', unit: 'Proje', price: 45000, description: 'Online satış ve ödeme sistemi entegrasyonu.', image: 'images/services/yazilim_api.png', conditions: 'Ödeme entegrasyonları dahil. 100 ürün girişi hediye. Eğitim dahil.' },
            { name: 'SEO ve İçerik Yönetimi', unit: 'Aylık', price: 8500, description: 'Google sıralama yükseltme çalışması.', image: 'images/services/yazilim_seo.png', conditions: 'Minimum 6 ay sözleşme. Aylık rapor dahil. 10 anahtar kelime hedefi.' },
            { name: 'Sosyal Medya Yönetimi', unit: 'Aylık', price: 12000, description: 'Instagram, LinkedIn içerik ve reklam yönetimi.', image: 'images/services/reklam_ajansi_social.png', conditions: 'Günde 1 paylaşım. Reklam bütçesi hariç. Aylık analiz raporu dahil.' },
            { name: 'Google Ads Reklam', unit: 'Aylık', price: 5000, description: 'Hesap kurulumu ve optimizasyon ücreti.', image: 'images/services/reklam_google.png', conditions: 'Reklam bütçesi hariç. Haftalık optimizasyon. Aylık rapor dahil.' },
            { name: 'Mobil Uygulama', unit: 'Proje', price: 65000, description: 'iOS ve Android native veya cross-platform.', image: 'images/services/yazilim_mobil.png', conditions: 'Ön ödeme %30. Store yayını ayrıca. 6 ay bakım dahil.' },
            { name: 'Yapay Zeka Entegrasyonu', unit: 'Proje', price: 15000, description: 'Chatbot ve AI araçları.', image: 'images/services/yazilim_ai.png', conditions: 'API maliyetleri hariç. Eğitim dahil. Özelleştirme dahil.' },
            { name: 'Siber Güvenlik Testi', unit: 'Rapor', price: 12500, description: 'Penetrasyon testi ve güvenlik analizi.', image: 'images/services/yazilim_siber.png', conditions: 'Detaylı rapor dahil. Öneri listesi dahil. Her alan için fiyat değişir.' },
            { name: 'Logo ve Marka Kimliği', unit: 'Proje', price: 8500, description: 'Logo, kartvizit ve kurumsal kimlik.', image: 'images/services/web_logo.png', conditions: '3 konsept sunulur. Logo + kartvizit dahil. Kaynak dosya dahil.' },
            { name: 'Video Prodüksiyon', unit: 'Proje', price: 12000, description: 'Tanıtım filmi ve kurumsal video.', image: 'images/services/web_video.png', conditions: '60 saniyelik video. Çekim ve kurgu dahil. Oyuncu ayrıca.' },
            { name: 'Reklam Ajansı Hizmeti', unit: 'Aylık', price: 15000, description: 'Full servis dijital pazarlama.', image: 'images/services/reklam-ajansi.png', conditions: 'Strateji + uygulama. Reklam bütçeleri hariç. Aylık toplantı dahil.' },
            { name: 'Tanıtım Materyali', unit: 'Proje', price: 5500, description: 'Broşür, katalog ve dijital içerik.', image: 'images/services/reklam_tanitim.png', conditions: '3 lü veya 4 lü broşür. Baskı hariç. Kaynak dosya dahil.' },
            { name: 'Yazılım Ofis Kurulumu', unit: 'Proje', price: 35000, description: 'Ofis yazılım altyapısı kurulumu.', image: 'images/services/yazilim-ofis.png', conditions: 'Lisans hariç. Kurulum ve eğitim dahil. 1 ay destek dahil.' },
            { name: 'Cloud Sunucu Yönetimi', unit: 'Aylık', price: 3500, description: 'Bulut altyapı yönetimi ve destek.', image: 'images/services/yazilim_cloud.png', conditions: 'Sunucu maliyeti hariç. 7/24 izleme. Yedekleme dahil.' },
            { name: 'DevOps Hizmeti', unit: 'Aylık', price: 8500, description: 'CI/CD pipeline ve sunucu yönetimi.', image: 'images/services/yazilim_devops.png', conditions: 'Pipeline kurulumu dahil. Deployment otomasyonu. Monitoring dahil.' }
        ]
    },
    'nakliyat': {
        name: '🚚 Nakliyat ve Lojistik',
        services: [
            { name: 'Evden Eve Nakliyat (3+1)', unit: 'Sefer', price: 15000, description: 'Ambalajlı, marangozlu taşıma.', image: 'images/services/nakliyat_evden_eve.png', conditions: 'Ambalaj malzemesi dahil. Marangoz sökme/takma dahil. Sigortalı taşıma.' },
            { name: 'Şehir İçi Kamyonet', unit: 'Sefer', price: 3500, description: 'Küçük nakliye işleri.', image: 'images/services/nakliyat_kamyonet.png', conditions: 'Şehir içi 20 km dahil. Yardımcı personel dahil. Yükleme/indirme dahil.' },
            { name: 'Asansörlü Taşıma', unit: 'Saat', price: 2000, description: 'Dış cephe asansörü kurulumu.', image: 'images/services/nakliyat_asansor.png', conditions: 'Minimum 2 saat. Kurulum dahil. 8 kata kadar standart fiyat.' },
            { name: 'Depolama Hizmeti', unit: 'Aylık', price: 2500, description: 'Güvenli kapalı depo alanı.', image: 'images/services/nakliyat_depolama.png', conditions: '10 m³ alan. Sigortalı. Güvenlik kameralı. Taşıma ayrıca.' },
            { name: 'Ofis Taşıma', unit: 'Proje', price: 25000, description: 'Ofis mobilya ve ekipman taşıma.', image: 'images/services/nakliyat_ofis.png', conditions: 'Keşif sonrası fiyat. Hafta sonu taşıma mümkün. Elektronik ambalajı dahil.' },
            { name: 'Eşya Paketleme', unit: 'Saat', price: 1500, description: 'Profesyonel paketleme ve koruma.', image: 'images/services/nakliyat_paketleme.png', conditions: 'Malzeme dahil. Minimum 2 saat. Kırılacak eşya için özel koruma.' },
            { name: 'TIR (Kapalı Kasa)', unit: 'Sefer', price: 35000, description: '40 tonluk TIR ile şehirlerarası yük taşıma.', image: 'images/services/nakliyat_tir.png', conditions: 'Şoför dahil. Yakıt dahil. 500 km dahil, üzeri km başı ücretlendirilir.' },
            { name: 'Kamyon (10 Ton)', unit: 'Sefer', price: 12000, description: '10 tonluk kamyon ile yük taşıma.', image: 'images/services/nakliyat_kamyon.png', conditions: 'Şoför ve yardımcı dahil. Şehir içi. Şehirlerarası km bazlı ücretlendirme.' },
            { name: 'Forklift Kiralama', unit: 'Gün', price: 5500, description: 'Forklift ve operatör kiralama.', image: 'images/services/nakliyat_forklift.png', conditions: 'Operatör dahil. Yakıt hariç. Minimum 1 gün. Nakliye ayrıca.' },
            { name: 'Mobil Vinç (25 Ton)', unit: 'Saat', price: 4500, description: 'Ağır yük kaldırma ve montaj.', image: 'images/services/nakliyat_vinc.png', conditions: 'Operatör dahil. Minimum 3 saat. 25 ton kapasiteli. Daha büyük tonaj için teklif alınız.' },
            { name: 'Sepetli Platform', unit: 'Saat', price: 2500, description: 'Yüksek çalışma platformu kiralama.', image: 'images/services/nakliyat_platform.png', conditions: 'Operatör dahil. Minimum 2 saat. 20 metre yükseklik. Nakliye ayrıca.' },
            { name: 'Frigorifik Araç', unit: 'Sefer', price: 8500, description: 'Soğuk zincir yük taşıma.', image: 'images/services/nakliyat_frigorifik.png', conditions: 'Sıcaklık kontrolü dahil. Şehir içi. Gıda taşıma sertifikalı.' },
            { name: 'Lowbed (Ağır Yük)', unit: 'Sefer', price: 45000, description: 'İş makinesi ve ağır ekipman taşıma.', image: 'images/services/nakliyat_lowbed.png', conditions: 'Özel izin dahil. Eskort aracı ayrıca. 50 tona kadar taşıma.' },
            { name: 'Açık Kasa Kamyon', unit: 'Sefer', price: 8000, description: 'İnşaat malzemesi ve hacimli yük taşıma.', image: 'images/services/nakliyat_acik_kasa.png', conditions: 'Branda dahil. Yükleme/indirme için vinç ayrıca. Şehir içi.' },
            { name: 'Konteyner Taşıma', unit: 'Sefer', price: 15000, description: '20ft veya 40ft konteyner taşıma.', image: 'images/services/nakliyat_konteyner.png', conditions: 'Liman/fabrika arası. Konteyner bedeli hariç. Gümrük işlemleri ayrıca.' },
            { name: 'Tanker (Su/Yakıt)', unit: 'Sefer', price: 6500, description: 'Sıvı yük taşıma tankeri.', image: 'images/services/nakliyat_tanker.png', conditions: 'Pompa dahil. ADR belgeli şoför. Tehlikeli madde için özel fiyat.' },
            { name: 'Minibüs Kiralama', unit: 'Gün', price: 3500, description: 'Personel servisi ve grup taşıma.', image: 'images/services/nakliyat_minibus.png', conditions: 'Şoför dahil. Yakıt hariç. 16 kişi kapasiteli. Şehir içi 100 km dahil.' },
            { name: 'Motokurye', unit: 'Sefer', price: 150, description: 'Acil evrak ve paket teslimatı.', image: 'images/services/nakliyat_motokurye.png', conditions: 'Şehir içi. 5 kg altı paket. Sigortalı teslimat. Aynı gün teslimat.' }
        ]
    },
    'beyaz-esya': {
        name: '🔧 Beyaz Eşya & Teknik Servis',
        services: [
            { name: 'Buzdolabı Tamiri', unit: 'İşlem', price: 1500, description: 'Arıza tespit ve onarım.', image: 'images/services/beyaz_buzdolabi.png', conditions: 'Parça bedeli hariç. Yerinde servis. 3 ay işçilik garantisi.' },
            { name: 'Çamaşır Makinesi Tamiri', unit: 'İşlem', price: 1200, description: 'Motor, pompa ve kart arızaları.', image: 'images/services/beyaz_camasir.png', conditions: 'Parça bedeli hariç. Tespit ücreti onarımdan düşülür. 3 ay garanti.' },
            { name: 'Bulaşık Makinesi Tamiri', unit: 'İşlem', price: 1000, description: 'Pompa, motor ve elektronik kart.', image: 'images/services/beyaz_bulasik.png', conditions: 'Parça bedeli hariç. Yerinde onarım. Kurye mevcut.' },
            { name: 'Fırın/Ocak Tamiri', unit: 'İşlem', price: 850, description: 'Gazlı ve elektrikli cihaz bakımı.', image: 'images/services/beyaz_firin.png', conditions: 'Parça hariç. Gaz kaçak testi dahil. Yedek parça garantili.' },
            { name: 'Ankastre Cihaz Montajı', unit: 'Adet', price: 750, description: 'Ankastre fırın, ocak, davlumbaz.', image: 'images/services/beyaz_ankastre.png', conditions: 'Dolap kesimi dahil. Elektrik/gaz bağlantısı dahil.' },
            { name: 'Kurutma Makinesi Tamiri', unit: 'İşlem', price: 1100, description: 'Isıtıcı ve motor arızaları.', image: 'images/services/beyaz_kurutma.png', conditions: 'Parça hariç. Filtre temizliği dahil. Yerinde servis.' },
            { name: 'Derin Dondurucu Tamiri', unit: 'İşlem', price: 1400, description: 'Soğutma sistemi onarımı.', image: 'images/services/beyaz_dondurucu.png', conditions: 'Gaz dolumu dahil. Parça hariç. 3 ay garanti.' },
            { name: 'Kombi Bakımı', unit: 'İşlem', price: 850, description: 'Yıllık bakım ve temizlik.', image: 'images/services/beyaz_kombi.png', conditions: 'Filtre temizliği dahil. Gaz ayarı dahil. Baca gazı ölçümü.' },
            { name: 'Şofben Tamiri', unit: 'İşlem', price: 650, description: 'Termokuple ve ateşleme arızası.', image: 'images/services/beyaz_sofben.png', conditions: 'Parça hariç. Gaz kaçak kontrolü dahil. Yerinde servis.' },
            { name: 'Termosifon Tamiri', unit: 'İşlem', price: 550, description: 'Rezistans ve termostat değişimi.', image: 'images/services/beyaz_termosifon.png', conditions: 'Parça hariç. Kireç temizliği dahil.' }
        ]
    },
    'guvenlik': {
        name: '🛡️ Güvenlik Sistemleri',
        services: [
            { name: 'Alarm Sistemi Kurulumu', unit: 'Set', price: 8500, description: 'Kablosuz alarm ve sensör seti.', image: 'images/services/guvenlik_alarm.png', conditions: '8 sensör dahil. Merkez panel dahil. GSM modül dahil. 1 yıl izleme hizmeti.' },
            { name: 'Geçiş Kontrol Sistemi', unit: 'Kapı', price: 12000, description: 'Kartlı veya parmak izli giriş.', image: 'images/services/guvenlik_gecis.png', conditions: 'Okuyucu ve yazılım dahil. 100 kullanıcı kapasitesi. Kablolama dahil.' },
            { name: 'Panik Butonu Kurulumu', unit: 'Adet', price: 1500, description: 'Kablosuz acil durum butonu.', image: 'images/services/guvenlik_panik.png', conditions: 'Batarya dahil. Merkeze bağlantı dahil. Mobil bildirim.' },
            { name: 'Duman Dedektörü', unit: 'Adet', price: 650, description: 'Optik duman algılama sensörü.', image: 'images/services/guvenlik_duman.png', conditions: 'Montaj dahil. Sertifikalı cihaz. Batarya dahil.' },
            { name: 'Yangın Söndürme Sistemi', unit: 'Proje', price: 35000, description: 'Sprinkler veya FM200 sistemi.', image: 'images/services/guvenlik_yangin_sondurme.png', conditions: 'Proje bazlı fiyat. Ruhsat işlemleri ayrıca. Yıllık bakım zorunlu.' },
            { name: 'Çelik Kasa Kurulumu', unit: 'Adet', price: 5500, description: 'Duvar tipi veya serbest çelik kasa.', image: 'images/services/guvenlik_kasa.png', conditions: 'Kasa bedeli hariç. Sabitlerne dahil. Kurulum dahil.' },
            { name: 'X-Ray Cihazı Kiralama', unit: 'Gün', price: 3500, description: 'Bagaj tarama cihazı.', image: 'images/services/guvenlik_xray.png', conditions: 'Operatör dahil. Nakliye ayrıca. Minimum 3 gün.' },
            { name: 'Metal Dedektör Kapı', unit: 'Gün', price: 1500, description: 'Geçiş kapısı kiralama.', image: 'images/services/guvenlik_metal.png', conditions: 'Kurulum dahil. Nakliye ayrıca. Etkinlik için ideal.' }
        ]
    },
    'iklimlendirme': {
        name: '❄️ İklimlendirme (HVAC)',
        services: [
            { name: 'Split Klima Montajı', unit: 'Adet', price: 3500, description: 'Duvar tipi klima kurulumu.', image: 'images/services/iklim_split.png', conditions: 'Klima bedeli hariç. 3 metre bakır boru dahil. Elektrik hattı ayrıca.' },
            { name: 'Salon Tipi Klima', unit: 'Adet', price: 5500, description: 'Yüksek kapasiteli salon kliması.', image: 'images/services/iklim_salon.png', conditions: 'Klima hariç. Tesisat ve montaj dahil. Elektrik hattı ayrıca.' },
            { name: 'VRF Sistem Kurulumu', unit: 'kW', price: 8500, description: 'Merkezi değişken soğutucu akış.', image: 'images/services/iklim_vrf.png', conditions: 'Proje bazlı. Dış ünite ve iç üniteler ayrı. Bakır boru dahil.' },
            { name: 'Isı Pompası Montajı', unit: 'Adet', price: 15000, description: 'Hava kaynaklı ısı pompası.', image: 'images/services/iklim_isi_pompasi.png', conditions: 'Cihaz hariç. Tesisat ve montaj dahil. 2 yıl işçilik garantisi.' },
            { name: 'Havalandırma Sistemi', unit: 'm²', price: 250, description: 'Mekanik havalandırma tesisatı.', image: 'images/services/iklim_havalandirma.png', conditions: 'Kanal ve menfez dahil. Fan ünitesi ayrıca. Proje gerekli.' },
            { name: 'Chiller Bakımı', unit: 'İşlem', price: 8500, description: 'Endüstriyel soğutma bakımı.', image: 'images/services/iklim_chiller.png', conditions: 'Filtre ve yağ değişimi dahil. Parça hariç. Yıllık bakım.' },
            { name: 'Klima Gaz Dolumu', unit: 'Adet', price: 1200, description: 'R410A veya R32 gaz dolumu.', image: 'images/services/iklim_gaz.png', conditions: 'Kaçak testi dahil. Gaz bedeli dahil. Kaynak onarımı ayrıca.' },
            { name: 'Fancoil Montajı', unit: 'Adet', price: 4500, description: 'Kanal tipi veya kasetli fancoil.', image: 'images/services/iklim_fancoil.png', conditions: 'Fancoil hariç. Tesisat bağlantısı dahil. Elektrik ayrıca.' }
        ]
    },
    'matbaa': {
        name: '🎨 Matbaa & Baskı',
        services: [
            { name: 'Kartvizit Baskı', unit: '1000 Adet', price: 450, description: 'Mat veya parlak selefon kartvizit.', image: 'images/services/matbaa_kartvizit.png', conditions: 'Tasarım hariç. 350gr kuşe. 3-5 iş günü.' },
            { name: 'Broşür Baskı (A4)', unit: '1000 Adet', price: 2500, description: '3 kırımlı veya tek yaprak broşür.', image: 'images/services/matbaa_brosur.png', conditions: 'Tasarım hariç. 170gr kuşe. Selefon dahil.' },
            { name: 'Afiş Baskı', unit: 'm²', price: 85, description: 'Dijital poster baskı.', image: 'images/services/matbaa_afis.png', conditions: '720 DPI baskı. Vinil veya kağıt. Montaj ayrıca.' },
            { name: 'Roll-Up Banner', unit: 'Adet', price: 850, description: '80x200 cm roll-up stand.', image: 'images/services/matbaa_rollup.png', conditions: 'Stand ve baskı dahil. Taşıma çantası dahil. Tasarım hariç.' },
            { name: 'Tabela Üretimi', unit: 'm²', price: 1500, description: 'Işıklı veya ışıksız tabela.', image: 'images/services/matbaa_tabela.png', conditions: 'Tasarım ve montaj dahil. Elektrik bağlantısı ayrıca. Işıklı için trafo dahil.' },
            { name: 'Araç Giydirme', unit: 'm²', price: 650, description: 'Folyo ile araç kaplama.', image: 'images/services/matbaa_arac.png', conditions: 'Cast folyo kullanılır. Tasarım hariç. 3 yıl folyo garantisi.' },
            { name: 'Cam Folyo Uygulama', unit: 'm²', price: 250, description: 'Buzlu veya baskılı cam folyosu.', image: 'images/services/matbaa_cam_folyo.png', conditions: 'Folyo dahil. Kesim ve uygulama dahil. Tasarım ayrıca.' },
            { name: 'Katalog Baskı', unit: '100 Adet', price: 3500, description: '16 sayfa A4 katalog.', image: 'images/services/matbaa_katalog.png', conditions: 'Tasarım hariç. Kuşe kağıt. Cilt dahil. Ek sayfa ücrete tabi.' },
            { name: 'Promosyon Ürünleri', unit: 'Adet', price: 25, description: 'Kalem, çanta, tişört baskı.', image: 'images/services/matbaa_promosyon.png', conditions: 'Minimum 100 adet. Baskı dahil. Ürün bedeli hariç.' },
            { name: 'Kutu/Ambalaj Üretimi', unit: 'Adet', price: 15, description: 'Özel kesim karton kutu.', image: 'images/services/matbaa_kutu.png', conditions: 'Minimum 500 adet. Kalıp bedeli ayrıca. Tasarım hariç.' }
        ]
    },
    'spor': {
        name: '🏋️ Spor & Fitness',
        services: [
            { name: 'Fitness Salonu Kurulumu', unit: 'Proje', price: 150000, description: 'Anahtar teslim spor salonu.', image: 'images/services/spor_fitness.png', conditions: 'Ekipman seçimi dahil. Zemin kaplama dahil. Ayna ve aydınlatma dahil.' },
            { name: 'Sentetik Çim Saha', unit: 'm²', price: 450, description: 'Futbol sahası sentetik çim.', image: 'images/services/spor_sentetik.png', conditions: 'Altyapı ayrıca. 50mm FIFA onaylı çim. 8 yıl garanti.' },
            { name: 'Basketbol Potası', unit: 'Adet', price: 25000, description: 'Sabit veya portatif pota.', image: 'images/services/spor_basketbol.png', conditions: 'Temel betonu dahil. Pano ve çember dahil. Montaj dahil.' },
            { name: 'Tenis Kortu', unit: 'Proje', price: 250000, description: 'Akrilik veya toprak kort.', image: 'images/services/spor_tenis.png', conditions: 'Altyapı ve kaplama dahil. Çit ve aydınlatma ayrıca. Tribün opsiyonel.' },
            { name: 'Koşu Pisti', unit: 'm²', price: 350, description: 'IAAF standartlarında pist.', image: 'images/services/spor_pist.png', conditions: 'Tartan kaplama. Şerit çizgisi dahil. Altyapı ayrıca.' },
            { name: 'Çocuk Oyun Parkı', unit: 'Set', price: 85000, description: 'Güvenlik sertifikalı oyun grubu.', image: 'images/services/spor_oyun_parki.png', conditions: 'EN1176 sertifikalı. Darbe emici zemin dahil. Montaj dahil.' },
            { name: 'Fitness Ekipman Bakımı', unit: 'Adet', price: 850, description: 'Koşu bandı, bisiklet bakımı.', image: 'images/services/spor_bakim.png', conditions: 'Parça hariç. Genel bakım ve yağlama dahil. Yerinde servis.' },
            { name: 'Spor Salonu Zeminİ', unit: 'm²', price: 180, description: 'Kauçuk veya PVC zemin.', image: 'images/services/spor_zemin.png', conditions: 'Zemin malzemesi dahil. Altyapı hazır olmalı. Şerit çizgisi ayrıca.' }
        ]
    },
    'saglik': {
        name: '🏥 Sağlık & Medikal',
        services: [
            { name: 'Hasta Yatağı Kiralama', unit: 'Ay', price: 2500, description: 'Motorlu hasta yatağı.', image: 'images/services/saglik_yatak.png', conditions: 'Teslimat dahil. Havalı yatak opsiyonel. Dezenfekte edilmiş.' },
            { name: 'Oksijen Konsantratörü', unit: 'Ay', price: 3500, description: 'Evde oksijen tedavisi.', image: 'images/services/saglik_oksijen.png', conditions: 'Cihaz ve teslimat dahil. Nazal kanül dahil. 7/24 destek.' },
            { name: 'Tekerlekli Sandalye', unit: 'Ay', price: 800, description: 'Manuel veya akülü sandalye.', image: 'images/services/saglik_tekerlekli.png', conditions: 'Teslimat dahil. Akülü model ek ücret. Dezenfekte edilmiş.' },
            { name: 'Hasta Asansörü', unit: 'Proje', price: 85000, description: 'Platform tipi engelli asansörü.', image: 'images/services/saglik_asansor.png', conditions: 'Montaj dahil. Proje ve ruhsat ayrıca. 2 yıl garanti.' },
            { name: 'Rampa Kurulumu', unit: 'm', price: 3500, description: 'Engelli erişim rampası.', image: 'images/services/saglik_rampa.png', conditions: 'Alüminyum veya beton. Korkuluk dahil. Eğim yönetmeliğe uygun.' },
            { name: 'TENS/EMS Cihazı', unit: 'Ay', price: 1200, description: 'Fizik tedavi cihazı kiralama.', image: 'images/services/saglik_tens.png', conditions: 'Elektrot dahil. Kullanım eğitimi dahil. Cihaz garantili.' },
            { name: 'Nebulizatör Kiralama', unit: 'Ay', price: 650, description: 'Solunum tedavi cihazı.', image: 'images/services/saglik_nebulizator.png', conditions: 'Maske ve hortum dahil. Dezenfekte edilmiş. Teslimat dahil.' },
            { name: 'Medikal Gaz Tesisatı', unit: 'Nokta', price: 4500, description: 'Oksijen ve vakum hattı.', image: 'images/services/saglik_gaz.png', conditions: 'Bakır boru ve outlet dahil. Alarm sistemi ayrıca. Proje gerekli.' }
        ]
    },
    'egitim': {
        name: '🎓 Eğitim & Danışmanlık',
        services: [
            { name: 'İSG Eğitimi', unit: 'Kişi', price: 350, description: 'İş sağlığı ve güvenliği eğitimi.', image: 'images/services/egitim_isg.png', conditions: 'Sertifika dahil. Minimum 10 kişi. Yerinde eğitim.' },
            { name: 'ISO 9001 Danışmanlık', unit: 'Proje', price: 25000, description: 'Kalite yönetim sistemi kurulumu.', image: 'images/services/egitim_iso9001.png', conditions: 'Dokümantasyon dahil. Belgelendirme ücreti hariç. 6-12 ay süre.' },
            { name: 'ISO 14001 Danışmanlık', unit: 'Proje', price: 28000, description: 'Çevre yönetim sistemi.', image: 'images/services/egitim_iso14001.png', conditions: 'Dokümantasyon dahil. Yasal uyum desteği. Belgelendirme hariç.' },
            { name: 'KVKK Danışmanlık', unit: 'Proje', price: 15000, description: 'Veri koruma uyum projesi.', image: 'images/services/egitim_kvkk.png', conditions: 'Politika ve prosedür dahil. VERBİS kayıt desteği. Eğitim dahil.' },
            { name: 'İlk Yardım Eğitimi', unit: 'Kişi', price: 450, description: 'Temel ilk yardımcı belgesi.', image: 'images/services/egitim_ilkyardim.png', conditions: 'Sertifika dahil. Minimum 10 kişi. 16 saat eğitim.' },
            { name: 'Yangın Söndürme Eğitimi', unit: 'Kurs', price: 5000, description: 'Pratik yangın tatbikatı.', image: 'images/services/egitim_yangin.png', conditions: 'Malzeme dahil. 20 kişiye kadar. Sertifika dahil.' },
            { name: 'Liderlik Eğitimi', unit: 'Gün', price: 12000, description: 'Kurumsal liderlik programı.', image: 'images/services/egitim_liderlik.png', conditions: 'Eğitmen ücreti dahil. Materyal dahil. Mekan müşteriye ait.' },
            { name: 'Satış Eğitimi', unit: 'Gün', price: 8500, description: 'Profesyonel satış teknikleri.', image: 'images/services/egitim_satis.png', conditions: 'Eğitmen dahil. Materyal dahil. Rol oyunu uygulamalı.' }
        ]
    },
    'enerji': {
        name: '🔌 Enerji & Verimlilik',
        services: [
            { name: 'Enerji Verimliliği Etüdü', unit: 'Proje', price: 15000, description: 'Bina enerji analizi ve rapor.', image: 'images/services/enerji_verimlilik.png', conditions: 'Termal kamera analizi dahil. Tasarruf önerileri dahil.' },
            { name: 'LED Dönüşüm Projesi', unit: 'Adet', price: 150, description: 'Aydınlatma verimlilik dönüşümü.', image: 'images/services/enerji_led.png', conditions: 'LED armatür dahil. Demontaj ve montaj dahil. %60 tasarruf.' },
            { name: 'Güç Kompanzasyonu', unit: 'kVAr', price: 850, description: 'Reaktif güç kompanzasyon sistemi.', image: 'images/services/enerji_kompanzasyon.png', conditions: 'Kondansatör dahil. Pano dahil. Ölçüm raporu dahil.' },
            { name: 'UPS Sistemi Kurulumu', unit: 'kVA', price: 3500, description: 'Kesintisiz güç kaynağı.', image: 'images/services/enerji_ups.png', conditions: 'UPS cihazı hariç. Montaj ve kablolama dahil. Akü dahil.' },
            { name: 'Enerji İzleme Sistemi', unit: 'Nokta', price: 2500, description: 'Elektrik tüketim takip sistemi.', image: 'images/services/enerji_izleme.png', conditions: 'Sayaç ve yazılım dahil. Cloud erişim dahil. Raporlama dahil.' },
            { name: 'Kojenerasyon Danışmanlık', unit: 'Proje', price: 25000, description: 'CHP sistem fizibilite çalışması.', image: 'images/services/enerji_kojenerasyon.png', conditions: 'Kapasite analizi dahil. Teşvik danışmanlığı dahil.' },
            { name: 'Elektrik Tesisatı Revizyonu', unit: 'm²', price: 85, description: 'Eski tesisat yenileme.', image: 'images/services/enerji_revizyon.png', conditions: 'Kablo ve priz dahil. Sıva işi ayrıca. Proje gerekli.' },
            { name: 'Enerji Kimlik Belgesi', unit: 'Belge', price: 3500, description: 'Bina enerji performans belgesi.', image: 'images/services/enerji_kimlik.png', conditions: 'EKB düzenleme dahil. Bakanlık kaydı dahil. 10 yıl geçerli.' }
        ]
    },
    'mobilya': {
        name: '🪑 Mobilya & Dekorasyon',
        services: [
            { name: 'Özel Mobilya İmalatı', unit: 'm²', price: 4500, description: 'Istenilen ölçüde mobilya.', image: 'images/services/mobilya_ozel.png', conditions: 'Tasarım dahil. Malzeme seçenekli. Montaj dahil. 2 yıl garanti.' },
            { name: 'Mutfak Dolabı', unit: 'm', price: 3500, description: 'MDF veya lake mutfak dolabı.', image: 'images/services/mobilya_mutfak.png', conditions: 'Menteşe ve ray dahil. Tezgah ayrıca. Tasarım ücretsiz.' },
            { name: 'Gardırop Yapımı', unit: 'm²', price: 2800, description: 'Ray kapaklı veya menteşeli.', image: 'images/services/mobilya_gardirop.png', conditions: 'İç düzenleme dahil. Ayna kapak opsiyonel. Montaj dahil.' },
            { name: 'Perde Dikimi', unit: 'm', price: 150, description: 'Fon ve tül perde dikimi.', image: 'images/services/mobilya_perde.png', conditions: 'Kumaş hariç. Pileli veya bant dikişi. Montaj ayrıca.' },
            { name: 'Stor Perde', unit: 'm²', price: 350, description: 'Stor veya zebra perde.', image: 'images/services/mobilya_stor.png', conditions: 'Kumaş ve mekanizma dahil. Montaj dahil. Ölçü alımı dahil.' },
            { name: 'Koltuk Döşeme', unit: 'Adet', price: 2500, description: 'Koltuk kumaş yenileme.', image: 'images/services/mobilya_doseme.png', conditions: 'Kumaş dahil. Sünger değişimi opsiyonel. Nakliye ayrıca.' },
            { name: 'Vestiyer/Ayakkabılık', unit: 'Proje', price: 4500, description: 'Giriş holü mobilyası.', image: 'images/services/mobilya_vestiyer.png', conditions: 'Tasarım ve montaj dahil. Ayna opsiyonel. MDF veya masif.' },
            { name: 'TV Ünitesi', unit: 'Proje', price: 5500, description: 'Modern TV ünitesi tasarımı.', image: 'images/services/mobilya_tv.png', conditions: 'LED aydınlatma opsiyonel. Tasarım dahil. Montaj dahil.' },
            { name: 'Banyo Dolabı', unit: 'Proje', price: 3500, description: 'Suya dayanıklı banyo mobilyası.', image: 'images/services/mobilya_banyo.png', conditions: 'Lavabo hariç. Ayna dolabı dahil. MDF lake.' },
            { name: 'Ofis Mobilyası', unit: 'İş İstasyonu', price: 8500, description: 'Çalışma masası ve dolap seti.', image: 'images/services/mobilya_ofis.png', conditions: 'Masa, keson ve dolap dahil. Sandalye hariç. Montaj dahil.' }
        ]
    },
    'evcil-hayvan': {
        name: '🐾 Evcil Hayvan Hizmetleri',
        services: [
            { name: 'Pet Kuaför', unit: 'Seans', price: 350, description: 'Köpek/kedi tıraş ve bakım.', image: 'images/services/pet_kuafor.png', conditions: 'Yıkama, tırnak kesimi dahil. Irka göre fiyat değişir.' },
            { name: 'Pet Otel (Köpek)', unit: 'Gece', price: 250, description: 'Köpek pansiyon hizmeti.', image: 'images/services/pet_otel.png', conditions: 'Mama dahil. Günlük yürüyüş dahil. Aşı kartı zorunlu.' },
            { name: 'Pet Otel (Kedi)', unit: 'Gece', price: 180, description: 'Kedi pansiyon hizmeti.', image: 'images/services/pet_kedi.png', conditions: 'Mama dahil. Kum temizliği dahil. Aşı kartı zorunlu.' },
            { name: 'Köpek Eğitimi', unit: 'Seans', price: 850, description: 'Temel itaat eğitimi.', image: 'images/services/pet_egitim.png', conditions: 'Minimum 8 seans paketi. Sertifikalı eğitmen. Evde veya parkta.' },
            { name: 'Veteriner Muayene', unit: 'Muayene', price: 450, description: 'Genel sağlık kontrolü.', image: 'images/services/pet_veteriner.png', conditions: 'Aşı ve ilaç hariç. Evde muayene ek ücret.' },
            { name: 'Hayvan Taşıma', unit: 'Sefer', price: 650, description: 'Güvenli pet transfer.', image: 'images/services/pet_tasima.png', conditions: 'Klimalı araç. Kafes dahil. Şehir içi.' },
            { name: 'Köpek Gezdirme', unit: 'Seans', price: 150, description: '30 dakikalık yürüyüş.', image: 'images/services/pet_gezdirme.png', conditions: 'Hafta içi hergün. Fotoğraf gönderilir. Sigortalı.' },
            { name: 'Pet Çiftliği Gezisi', unit: 'Kişi', price: 250, description: 'Hayvan çiftliği ziyareti.', image: 'images/services/pet_ciftlik.png', conditions: 'Çocuklara eğitim dahil. Piknik alanı mevcut. Ulaşım hariç.' }
        ]
    },
    'emlak': {
        name: '🏢 Emlak & Gayrimenkul',
        services: [
            { name: 'Gayrimenkul Değerleme', unit: 'Rapor', price: 5500, description: 'SPK lisanslı ekspertiz.', image: 'images/services/emlak_degerleme.png', conditions: 'Yazılı rapor dahil. Banka ve mahkeme geçerli. 3-5 iş günü.' },
            { name: 'Kiralama Yönetimi', unit: 'Aylık', price: 1500, description: 'Kira takip ve yönetimi.', image: 'images/services/emlak_kiralama.png', conditions: 'Kira tahsilatı dahil. Tadilat koordinasyonu dahil. Aylık rapor.' },
            { name: 'Tadilat Danışmanlığı', unit: 'Proje', price: 3500, description: 'Satış öncesi tadilat planı.', image: 'images/services/emlak_tadilat.png', conditions: 'Keşif ve maliyet analizi dahil. Usta koordinasyonu opsiyonel.' },
            { name: 'Home Staging', unit: 'Proje', price: 8500, description: 'Satış için ev hazırlama.', image: 'images/services/emlak_staging.png', conditions: 'Mobilya kiralama dahil. Fotoğraf çekimi dahil. 30 gün süre.' },
            { name: 'Emlak Fotoğrafçılığı', unit: 'Gayrimenkul', price: 2500, description: 'Profesyonel emlak fotoğrafı.', image: 'images/services/emlak_foto.png', conditions: '50 düzenlenmiş kare. Drone çekimi opsiyonel. 1 iş günü.' },
            { name: '360° Sanal Tur', unit: 'Gayrimenkul', price: 4500, description: 'VR uyumlu sanal gezinti.', image: 'images/services/emlak_sanal.png', conditions: 'Web yayını dahil. QR kod dahil. Sınırsız izlenme.' },
            { name: 'Aidat Yönetimi', unit: 'Aylık', price: 850, description: 'Site/apartman aidat takibi.', image: 'images/services/emlak_aidat.png', conditions: 'Banka hesabı yönetimi dahil. Aylık rapor. Borç takibi.' },
            { name: 'Tapu İşlemleri', unit: 'İşlem', price: 2500, description: 'Tapu devir danışmanlığı.', image: 'images/services/emlak_tapu.png', conditions: 'Evrak hazırlığı dahil. Randevu alımı dahil. Harç hariç.' }
        ]
    },
    'it': {
        name: '🌐 IT & Altyapı',
        services: [
            { name: 'Sunucu Kurulumu', unit: 'Adet', price: 8500, description: 'Fiziksel sunucu kurulumu.', image: 'images/services/it_sunucu.png', conditions: 'Donanım hariç. İşletim sistemi kurulumu dahil. Güvenlik yapılandırması dahil.' },
            { name: 'Network Altyapısı', unit: 'Nokta', price: 650, description: 'Ethernet ve wifi altyapısı.', image: 'images/services/it_network.png', conditions: 'Kablo ve priz dahil. Switch hariç. Test ve raporlama dahil.' },
            { name: 'Firewall Kurulumu', unit: 'Adet', price: 12000, description: 'Kurumsal güvenlik duvarı.', image: 'images/services/it_firewall.png', conditions: 'Cihaz hariç. Konfigürasyon dahil. 1 yıl destek dahil.' },
            { name: 'VPN Kurulumu', unit: 'Proje', price: 5500, description: 'Şirket VPN ağı kurulumu.', image: 'images/services/it_vpn.png', conditions: 'Site-to-site veya remote. Kullanıcı eğitimi dahil.' },
            { name: 'Yedekleme Sistemi', unit: 'TB', price: 2500, description: 'Otomatik yedekleme çözümü.', image: 'images/services/it_yedekleme.png', conditions: 'NAS veya cloud. Yazılım dahil. Günlük yedekleme.' },
            { name: 'Veri Kurtarma', unit: 'İşlem', price: 4500, description: 'HDD/SSD veri kurtarma.', image: 'images/services/it_veri.png', conditions: 'Teşhis ücreti düşülür. Başarı garantisi yok. Clean room mevcut.' },
            { name: 'Active Directory', unit: 'Proje', price: 8500, description: 'Domain ve kullanıcı yönetimi.', image: 'images/services/it_ad.png', conditions: 'Kurulum ve yapılandırma dahil. Group policy dahil. Eğitim dahil.' },
            { name: 'Helpdesk Hizmeti', unit: 'Aylık', price: 15000, description: 'Uzaktan IT destek hizmeti.', image: 'images/services/it_helpdesk.png', conditions: '8x5 destek. Sınırsız ticket. Uzaktan bağlantı dahil.' },
            { name: 'E-posta Sistemi', unit: 'Kullanıcı', price: 250, description: 'Kurumsal e-posta kurulumu.', image: 'images/services/it_eposta.png', conditions: 'Microsoft 365 veya self-hosted. Lisans hariç. Migrasyon dahil.' },
            { name: 'Siber Güvenlik Kontrolü', unit: 'Rapor', price: 8500, description: 'Zafiyet taraması ve rapor.', image: 'images/services/it_siber.png', conditions: 'Penetrasyon testi dahil. Öneri raporu dahil. 2 hafta süre.' }
        ]
    }
};

window.openSectorModal = function () {
    document.getElementById('sectorModal').classList.remove('hidden');
};

window.closeSectorModal = function () {
    document.getElementById('sectorModal').classList.add('hidden');
};

window.loadSectorPreset = function (sectorKey) {
    const preset = SECTORAL_SERVICES[sectorKey];
    if (!preset) return;

    if (!confirm(`${preset.name} paketindeki ${preset.services.length} hizmet eklenecek. Onaylıyor musunuz?`)) return;

    let count = 0;
    let skipped = 0;
    preset.services.forEach(s => {
        // Duplicate check - aynı isimde hizmet varsa ekleme
        const exists = state.jobs.some(j => j.name.toLowerCase().trim() === s.name.toLowerCase().trim());
        if (exists) {
            skipped++;
            return;
        }

        state.jobs.push({
            id: 'j' + Date.now() + Math.random().toString(36).substr(2, 5),
            name: s.name,
            price: s.price,
            unit: s.unit,
            description: s.description,
            conditions: s.conditions || '',
            image: s.image || null
        });
        count++;
    });

    persistServices();
    renderServiceList();
    closeSectorModal();

    let message = `${count} adet hizmet başarıyla eklendi!`;
    if (skipped > 0) {
        message += ` (${skipped} adet zaten mevcut olduğu için atlandı)`;
    }
    alert(message);
};

window.importServicesFromExcel = async function (inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        alert('Excel kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            let imported = 0;
            jsonData.forEach(row => {
                const name = row['Hizmet Adı'] || row['Hizmet'] || row['Name'] || row['name'] || row['service'];
                const price = parseFloat(row['Birim Fiyat'] || row['Fiyat'] || row['Price'] || row['price'] || 0);
                const unit = row['Birim'] || row['Unit'] || row['unit'] || 'Adet';
                const desc = row['Açıklama'] || row['Description'] || row['description'] || '';

                if (name) {
                    state.jobs.push({
                        id: 'j' + Date.now() + Math.random().toString(36).substr(2, 5),
                        name: name.trim(),
                        price: isNaN(price) ? 0 : price,
                        unit: unit.trim(),
                        description: desc.trim(),
                        conditions: '',
                        image: null
                    });
                    imported++;
                }
            });

            persistServices();
            renderServiceList();
            alert(`${imported} hizmet başarıyla içe aktarıldı.`);
            inputEl.value = '';
        } catch (err) {
            console.error('Excel import error:', err);
            alert('Dosya okunamadı. Formatı kontrol edin.');
        }
    };
    reader.readAsArrayBuffer(file);
};

window.downloadSampleExcel = function () {
    if (typeof XLSX === 'undefined') {
        alert('Excel kütüphanesi yüklenemedi. Sayfayı yenileyin.');
        return;
    }
    const data = [
        ['Hizmet Adı', 'Birim', 'Birim Fiyat', 'Açıklama'],
        ['Örnek Hizmet 1', 'Adet', 100, 'Bu bir örnek hizmettir'],
        ['Örnek Hizmet 2', 'm²', 50, 'Metrekare bazlı hizmet']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hizmetler");
    XLSX.writeFile(wb, "Hizmet_Sablonu.xlsx");
};

window.clearAllServices = function () {
    if (!confirm('DİKKAT: Tüm hizmet listesi kalıcı olarak silinecek! Onaylıyor musunuz?')) return;
    state.jobs = [];
    persistServices();
    renderServiceList();
    alert('Tüm hizmetler başarıyla silindi.');
};

// References
window.showRefForm = function (id = null) {
    els.refForm.classList.remove('hidden');
    els.refForm.scrollIntoView({ behavior: 'smooth' });

    const tagContainer = document.getElementById('refTags');
    if (tagContainer) {
        tagContainer.innerHTML = '';
        state.jobs.forEach(job => {
            const label = document.createElement('label');
            label.style = "display:flex; align-items:center; gap:8px; padding:6px 0; font-size:0.9rem; cursor:pointer; border-bottom:1px solid #f0f0f0;";
            label.innerHTML = `<input type="checkbox" name="refTag" value="${job.id}"> <span style="color:var(--primary); font-weight:500;">${job.name}</span>`;
            tagContainer.appendChild(label);
        });
    }

    if (id) {
        const ref = state.references.find(r => r.id === id);
        if (!ref) return;
        document.getElementById('refFormTitle').textContent = 'Referans Düzenle';
        els.refId.value = ref.id;
        els.refTitle.value = ref.title;
        els.refCat.value = ref.category;
        els.refImgPreview.innerHTML = ref.image ? `<img src="${ref.image}" style="height:80px">` : '';
        if (ref.tags) {
            ref.tags.forEach(tId => {
                const cb = tagContainer.querySelector(`input[value="${tId}"]`);
                if (cb) cb.checked = true;
            });
        }
    } else {
        document.getElementById('refFormTitle').textContent = 'Yeni Referans Ekle';
        els.refId.value = '';
        els.refTitle.value = '';
        els.refCat.value = '';
        els.refImage.value = '';
        els.refImgPreview.innerHTML = '';
    }
};

window.saveReference = function () {
    const id = els.refId.value;
    const title = els.refTitle.value;
    if (!title) return alert('Başlık girin.');

    const tags = Array.from(document.querySelectorAll('input[name="refTag"]:checked')).map(cb => cb.value);
    const refData = { title, category: els.refCat.value, tags, image: null };

    const file = els.refImage.files[0];
    const finish = (img) => {
        refData.image = img || 'assets/references/villa.png';
        if (id) {
            const idx = state.references.findIndex(r => r.id === id);
            if (idx > -1) {
                if (!img) refData.image = state.references[idx].image;
                state.references[idx] = { ...state.references[idx], ...refData, id };
            }
        } else {
            refData.id = 'r' + Date.now();
            state.references.push(refData);
        }
        persistReferences();
        els.refForm.classList.add('hidden');
    };

    if (file) {
        const r = new FileReader();
        r.onload = (e) => finish(e.target.result);
        r.readAsDataURL(file);
    } else {
        finish(null);
    }
};

window.deleteReference = function (id) {
    if (!confirm('Emin misiniz?')) return;
    state.references = state.references.filter(r => r.id !== id);
    persistReferences();
};

function renderReferenceList() {
    if (!els.refList) return;
    els.refList.innerHTML = '';
    state.references.forEach(ref => {
        const div = document.createElement('div');
        div.className = 'service-item';
        div.innerHTML = `
            <img src="${ref.image || 'assets/references/villa.png'}" class="service-item-img">
            <div class="service-item-body">
                <div class="service-item-info">${ref.title}</div>
                <div class="service-item-sub">${ref.category}</div>
                <div class="service-actions">
                    <button onclick="showRefForm('${ref.id}')" title="Düzenle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button onclick="deleteReference('${ref.id}')" style="color:#e74c3c" title="Sil">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;
        els.refList.appendChild(div);
    });
}
window.showCustomerForm = function (id = null) {
    els.customerForm.classList.remove('hidden');
    els.customerForm.scrollIntoView({ behavior: 'smooth' });

    if (id) {
        const cust = state.customers.find(c => c.id === id);
        if (!cust) return;
        document.getElementById('custFormTitle').textContent = 'Müşteri Düzenle';
        document.getElementById('custId').value = cust.id;
        document.getElementById('custName').value = cust.name;
        document.getElementById('custPhone').value = cust.phone || '';
        document.getElementById('custEmail').value = cust.email || '';
        document.getElementById('custAddress').value = cust.address || '';
    } else {
        document.getElementById('custFormTitle').textContent = 'Yeni Müşteri Ekle';
        document.getElementById('custId').value = '';
        document.getElementById('custName').value = '';
        document.getElementById('custPhone').value = '';
        document.getElementById('custEmail').value = '';
        document.getElementById('custAddress').value = '';
    }
};

window.hideCustomerForm = function () {
    els.customerForm.classList.add('hidden');
};

window.saveCustomer = function () {
    const id = document.getElementById('custId').value;
    const name = document.getElementById('custName').value;
    if (!name) return alert('İsim girmek zorunludur.');

    const custData = {
        name,
        phone: document.getElementById('custPhone').value,
        email: document.getElementById('custEmail').value,
        address: document.getElementById('custAddress').value,
        updatedAt: Date.now()
    };

    if (id) {
        const idx = state.customers.findIndex(c => c.id === id);
        if (idx > -1) state.customers[idx] = { ...state.customers[idx], ...custData };
    } else {
        custData.id = 'c' + Date.now();
        state.customers.push(custData);
    }

    persistCustomers();
    els.customerForm.classList.add('hidden');
};

window.deleteCustomer = function (id) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;
    state.customers = state.customers.filter(c => c.id !== id);
    persistCustomers();
};

function renderCustomerList() {
    if (!els.customerList) return;
    els.customerList.innerHTML = '';

    // Update datalist for proposal form
    updateCustomerDatalist();

    if (state.customers.length === 0) {
        els.customerList.innerHTML = '<p class=\"empty-msg\">Henüz müşteri kaydedilmedi.</p>';
        return;
    }

    state.customers.forEach(cust => {
        const div = document.createElement('div');
        div.className = 'service-item';

        // Format phone for WhatsApp (remove leading 0, add country code)
        const waPhone = cust.phone ? cust.phone.replace(/^0/, '90').replace(/\D/g, '') : '';
        const phoneLink = waPhone ? `<a href="https://wa.me/${waPhone}" target="_blank" style="color:#25D366; text-decoration:none;" title="WhatsApp'ta aç">${cust.phone}</a>` : '-';
        const emailLink = cust.email ? `<a href="mailto:${cust.email}" style="color:var(--accent); text-decoration:none;" title="Email gönder">${cust.email}</a>` : '-';

        div.innerHTML = `
            <div class="service-item-body">
                <div class="service-item-info" style="cursor:pointer;" onclick="openCustomerProjects('${cust.id}')" title="Projeleri Görüntüle">${cust.name}</div>
                <div class="service-item-sub">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${phoneLink} | 
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${emailLink}
                </div>
                <div class="service-actions">
                    <button onclick="openCustomerProjects('${cust.id}')" title="Projeler" style="color:#3b82f6;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                    <button onclick="showCustomerForm('${cust.id}')" title="Düzenle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button onclick="deleteCustomer('${cust.id}')" style="color:#e74c3c" title="Sil">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;
        els.customerList.appendChild(div);
    });
}

function updateCustomerDatalist() {
    const dl = document.getElementById('customerDatalist');
    if (!dl) return;
    dl.innerHTML = '';
    state.customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        dl.appendChild(opt);
    });
}

// Open Customer Projects - Shows customer's Kanban cards
window.openCustomerProjects = function (customerId) {
    const customer = state.customers.find(c => c.id === customerId);
    if (!customer) return alert('Müşteri bulunamadı.');

    // Find all Kanban cards belonging to this customer
    const customerCards = [];
    state.kanban.forEach(list => {
        list.cards.forEach(card => {
            if (card.customerName === customer.name) {
                customerCards.push({ listId: list.id, card: card, listTitle: list.title });
            }
        });
    });

    if (customerCards.length === 0) {
        alert(`${customer.name} için henüz proje bulunamadı. CRM Takip sekmesinden yeni proje oluşturabilirsiniz.`);
        // Switch to Kanban tab
        document.querySelector('.nav-link[data-tab="tab-kanban"]')?.click();
        return;
    }

    // If only one project, open it directly
    if (customerCards.length === 1) {
        // Navigate to Kanban tab and open the card modal
        document.querySelector('.nav-link[data-tab="tab-kanban"]')?.click();
        setTimeout(() => {
            openCardModal(customerCards[0].listId, customerCards[0].card.id);
        }, 100);
        return;
    }

    // Multiple projects - show selection dialog
    const projectList = customerCards.map((p, i) =>
        `${i + 1}. ${p.card.title || 'İsimsiz Proje'} (${p.listTitle})`
    ).join('\n');

    const choice = prompt(`${customer.name} için ${customerCards.length} proje bulundu:\n\n${projectList}\n\nGörmek istediğiniz proje numarasını girin:`);

    if (choice) {
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < customerCards.length) {
            document.querySelector('.nav-link[data-tab="tab-kanban"]')?.click();
            setTimeout(() => {
                openCardModal(customerCards[idx].listId, customerCards[idx].card.id);
            }, 100);
        }
    }
};

// Cart & Proposal
function addItem() {
    const jobId = els.jobSelect.value;
    if (!jobId) return;

    const job = state.jobs.find(j => j.id === jobId);
    const existing = state.cart.find(c => c.id === jobId);

    if (existing) existing.qty++;
    else state.cart.push({ ...job, qty: 1 });

    renderCart();
    renderProposalItems();
}

window.updateQty = (id, q) => {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    item.qty = parseInt(q) || 0;
    if (item.qty <= 0) window.removeItem(id);
    else { renderCart(); renderProposalItems(); }
};

window.updateItemPrice = (id, p) => {
    const item = state.cart.find(i => i.id === id);
    if (item) { item.price = parseFloat(p) || 0; renderProposalItems(); renderCostPanel(); }
};

window.removeItem = (id) => {
    state.cart = state.cart.filter(i => i.id !== id);
    renderCart();
    renderProposalItems();
    renderProposalItems();
};

window.updateServiceCondition = (id, val) => {
    const item = state.cart.find(i => i.id === id);
    if (item) {
        item.conditions = val;
        // We don't re-render entire proposal to avoid losing focus, 
        // strictly updating state is enough as the textarea value is already current data source
    }
};

window.updateProposalNotes = (val) => {
    state.notes = val;
};

const TYPE_BADGE = {
    malzeme: { t: 'Malzeme', c: '#2563eb' },
    iscilik: { t: 'İşçilik', c: '#d97706' },
    nakliye: { t: 'Nakliye', c: '#7c3aed' },
    kesif: { t: 'Keşif', c: '#0891b2' }
};

function renderCart() {
    els.cartContainer.innerHTML = '';
    if (state.cart.length === 0) {
        els.cartContainer.innerHTML = '<p class="empty-msg">Henüz hizmet eklenmedi.</p>';
        renderCostPanel();
        return;
    }
    state.cart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        const b = TYPE_BADGE[item.type];
        const badge = b ? `<span style="font-size:.6rem;font-weight:700;color:#fff;background:${b.c};padding:1px 6px;border-radius:4px;margin-right:5px;vertical-align:middle;">${b.t}</span>` : '';
        el.innerHTML = `
            <div class="cart-item-info">
                <h4>${badge}${item.name}</h4>
                <div style="display:flex; align-items:center; gap:5px; margin-top:5px;">
                    <input type="number" value="${item.price}" class="price-input form-control" style="width:80px;" onchange="updateItemPrice('${item.id}', this.value)">
                    <span>₺ / ${item.unit}</span>
                </div>
                <div style="display:flex; align-items:center; gap:5px; margin-top:6px;">
                    <span style="font-size:.72rem; color:#94a3b8;">Maliyet:</span>
                    <input type="number" value="${item.cost != null && item.cost !== '' ? item.cost : ''}" placeholder="0" class="form-control" style="width:80px; padding:4px 8px; font-size:.85rem; border-color:#e2e8f0;" title="Birim maliyet — yalnızca size görünür, müşteriye gitmez" onchange="updateItemCost('${item.id}', this.value)">
                    <span style="font-size:.72rem; color:#94a3b8;">₺ / ${item.unit}</span>
                </div>
            </div>
            <div class="cart-controls">
                <input type="number" value="${item.qty}" min="1" class="qty-input" onchange="updateQty('${item.id}', this.value)">
                <button class="btn-remove" onclick="removeItem('${item.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;
        els.cartContainer.appendChild(el);
    });
    renderSuggestions();
    renderCostPanel();
}

// Malzeme eklendiğinde, o malzemeye bağlı işçilik/nakliye kalemlerini öneri olarak göster.
function renderSuggestions() {
    const inCart = new Set(state.cart.map(c => c.id));
    const suggestedIds = [];
    state.cart.forEach(item => {
        const src = state.jobs.find(j => j.id === item.id);
        if (src && Array.isArray(src.suggest)) {
            src.suggest.forEach(sid => {
                if (!inCart.has(sid) && !suggestedIds.includes(sid)) suggestedIds.push(sid);
            });
        }
    });
    if (suggestedIds.length === 0) return;
    const chips = suggestedIds.map(sid => {
        const j = state.jobs.find(x => x.id === sid);
        if (!j) return '';
        return `<button type="button" onclick="toggleService('${sid}')" style="background:#eef6ff; border:1px dashed #2563eb; color:#1d4ed8; border-radius:20px; padding:5px 12px; font-size:.8rem; cursor:pointer; margin:3px;">+ ${j.name}</button>`;
    }).join('');
    const bar = document.createElement('div');
    bar.style.cssText = 'margin-top:12px; padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;';
    bar.innerHTML = `<div style="font-size:.78rem; color:#475569; margin-bottom:6px;">💡 Eklediğiniz malzeme(ler) için önerilen kalemler — ayrı satır olarak eklenir:</div>${chips}`;
    els.cartContainer.appendChild(bar);
}

// Kâr/maliyet paneli — yalnızca builder tarafında, MÜŞTERİ GÖRMEZ (PDF ve baskıda yoktur).
function renderCostPanel() {
    let panel = document.getElementById('costAnalysisPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'costAnalysisPanel';
        if (els.cartContainer.parentNode) els.cartContainer.parentNode.appendChild(panel);
    }
    if (!state.cart.length) { panel.style.display = 'none'; return; }
    let revenue = 0, cost = 0, hasCost = false;
    state.cart.forEach(item => {
        const q = parseFloat(item.qty) || 0;
        revenue += (parseFloat(item.price) || 0) * q;
        if (item.cost != null && item.cost !== '') { cost += (parseFloat(item.cost) || 0) * q; hasCost = true; }
    });
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue * 100) : 0;
    const profitColor = profit >= 0 ? '#16a34a' : '#dc2626';
    panel.style.display = 'block';
    panel.style.cssText = 'margin-top:16px; padding:14px 16px; background:#0f172a; border-radius:10px; color:#e2e8f0;';
    panel.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <strong style="font-size:.95rem;">📊 Kâr Analizi</strong>
            <span style="font-size:.66rem; background:#334155; color:#cbd5e1; padding:2px 8px; border-radius:10px;">🔒 yalnızca size özel</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:.85rem;">
            <div>Toplam Satış</div><div style="text-align:right; font-weight:600;">${formatCurrency(revenue)}</div>
            <div>Toplam Maliyet</div><div style="text-align:right; font-weight:600;">${hasCost ? formatCurrency(cost) : '—'}</div>
            <div style="border-top:1px solid #334155; padding-top:6px;">Kâr</div><div style="border-top:1px solid #334155; padding-top:6px; text-align:right; font-weight:700; color:${profitColor};">${formatCurrency(profit)}</div>
            <div>Kâr Marjı</div><div style="text-align:right; font-weight:700; color:${profitColor};">% ${margin.toFixed(1)}</div>
        </div>
        ${hasCost ? '' : '<div style="font-size:.72rem; color:#94a3b8; margin-top:8px;">Her kaleme maliyet girince kâr otomatik hesaplanır.</div>'}
    `;
}

window.updateItemCost = (id, v) => {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    item.cost = (v === '' ? null : (parseFloat(v) || 0));
    renderCostPanel();
};

function renderProposalItems() {
    els.propJobList.innerHTML = '';
    let total = 0;

    state.cart.forEach(item => {
        const line = item.price * item.qty;
        total += line;
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <img src="${item.image || 'assets/jobs/lawn.png'}" class="job-image" alt="${item.name}">
            <div class="job-details">
                <div class="job-name">${item.name}</div>
                <div class="job-desc">${item.description || ''}</div>
                <div class="job-meta">
                    <div class="job-calculation">${item.qty} ${item.unit} x ${formatCurrency(item.price)}</div>
                    <div class="job-total">${formatCurrency(line)}</div>
                </div>
            </div>
        `;
        els.propJobList.appendChild(card);
    });
    // Calculate service total for subTotal display
    let serviceTotal = 0;
    state.cart.forEach(item => serviceTotal += item.price * item.qty);
    els.subTotal.textContent = formatCurrency(serviceTotal);

    // Update grand total (includes products)
    updateGrandTotal();

    // Initialize notes from company default or the formal terms if not set
    if (typeof state.notes === 'undefined') {
        state.notes = (state.company && state.company.notes) ? state.company.notes : DEFAULT_TERMS;
    }

    // Render Service Conditions (Editable)
    // We show a textarea for EVERY service in the cart to allow adding custom notes per service
    const conditionsHtml = state.cart
        .map(item => `<div class="service-condition-item"><span class="service-condition-label">• ${item.name}:</span><textarea class="editable-note" placeholder="Bu hizmet için özel şart/not ekleyin..." oninput="updateServiceCondition('${item.id}', this.value); this.style.height = ''; this.style.height = this.scrollHeight + 'px'" style="height: auto;">${item.conditions || ''}</textarea></div>`)
        .join('');

    if (state.cart.length > 0) {
        els.propServiceConditions.style.display = 'block';
        els.serviceConditionsContent.innerHTML = conditionsHtml;
        // Trigger auto-resize for initial content
        setTimeout(() => {
            document.querySelectorAll('#serviceConditionsContent .editable-note').forEach(el => {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
            });
        }, 10);
    } else {
        els.propServiceConditions.style.display = 'none';
        els.serviceConditionsContent.innerHTML = '';
    }

    // Render General Notes (Editable)
    if (els.propNotes) {
        els.propNotes.innerHTML = `
            <h4 style="margin-bottom:10px; color:var(--primary);">Genel Notlar</h4>
            <textarea 
                class="editable-note" 
                style="min-height:100px;" 
                placeholder="Teklif için genel notlar..."
                oninput="updateProposalNotes(this.value); this.style.height = ''; this.style.height = this.scrollHeight + 'px'"
            >${state.notes || ''}</textarea>
        `;
        // Trigger auto-resize for initial content
        setTimeout(() => {
            const noteEl = els.propNotes.querySelector('textarea');
            if (noteEl) {
                noteEl.style.height = 'auto';
                noteEl.style.height = noteEl.scrollHeight + 'px';
            }
        }, 10);
    }

    renderReferencesGrid();
}

// Helpers
const formatCurrency = (a) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(a);

function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
}

function updateAutoVersion() {
    if (!state.customerName) {
        state.version = '1';
        if (els.versionInput) els.versionInput.value = '1';
        return;
    }

    const matches = state.savedProposals.filter(p =>
        p.customerName.toLowerCase().trim() === state.customerName.toLowerCase().trim() &&
        p.projectName.toLowerCase().trim() === state.projectName.toLowerCase().trim()
    );

    if (matches.length === 0) {
        state.version = '1';
    } else {
        const versions = matches.map(p => parseInt(p.version) || 0);
        state.version = (Math.max(...versions) + 1).toString();
    }

    if (els.versionInput) els.versionInput.value = state.version;
}

// ====================================
// PROPOSAL CODING & MANAGEMENT
// ====================================
function getConsonants(str, limit = 4) {
    if (!str) return '____';
    const vowels = 'aeıioöuüAEIİOÖUÜ';
    // Remove all non-letters (except spaces which we handle later)
    const clean = str.replace(/[^a-zA-ZçşğüöıİÇŞĞÜÖ ]/g, '');
    let res = '';
    for (let char of clean.toUpperCase()) {
        if (char === ' ') continue;
        if (!vowels.includes(char)) {
            res += char;
            if (res.length >= limit) break;
        }
    }
    // If not enough consonants, fill with first letters or pad
    if (res.length < limit) {
        for (let char of clean.toUpperCase()) {
            if (char === ' ') continue;
            if (vowels.includes(char) && !res.includes(char)) {
                // fallback to letters if no consonants left
            }
        }
    }
    return res.padEnd(limit, '_');
}

window.saveCurrentProposal = function () {
    if (!state.customerName) return alert('Lütfen müşteri adını girin.');

    // Important: Always get next version to prevent overwriting
    updateAutoVersion();

    const clientCode = getConsonants(state.customerName);
    const projectCode = getConsonants(state.projectName);
    const code = `${clientCode}-${projectCode}-V${state.version}`;

    const serviceTotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const productTotal = state.productCart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const teklif = {
        id: Date.now(),
        createdAt: Date.now(), // Precise timestamp for sorting
        code: code,
        customerName: state.customerName,
        projectName: state.projectName,
        version: state.version,
        date: state.date,
        validityDate: els.validityDateInput ? els.validityDateInput.value : '',
        items: JSON.parse(JSON.stringify(state.cart)), // Deep copy cart (services)
        products: JSON.parse(JSON.stringify(state.productCart)), // Deep copy product cart
        serviceTotal: serviceTotal,
        productTotal: productTotal,
        total: serviceTotal + productTotal,
        discountType: state.discountType || 'none',
        discountValue: state.discountValue || 0,
        notes: state.notes || '',
        conditions: state.conditions || ''
    };

    // Always push as a new proposal
    state.savedProposals.push(teklif);

    localStorage.setItem(STORAGE_KEYS.SAVED_PROPOSALS, JSON.stringify(state.savedProposals));
    renderSavedProposals();

    // Auto-update Kanban Project
    updateKanbanFromProposal(teklif);

    alert('Teklif kaydedildi: ' + code);
};

window.shareProposalWhatsApp = function () {
    const total = document.getElementById('grandTotal').textContent;
    let phoneNumber = '';

    // Find customer phone if selected
    if (state.customerName) {
        const customer = state.customers.find(c => c.name === state.customerName);
        if (customer && customer.phone) {
            // Clean phone number: remove non-digits
            phoneNumber = customer.phone.replace(/\D/g, '');
            // If starts with 0, remove it (for 905...)
            if (phoneNumber.startsWith('0')) phoneNumber = phoneNumber.substring(1);
            // If doesn't start with 90, add it (assuming TR default)
            if (!phoneNumber.startsWith('90') && phoneNumber.length === 10) phoneNumber = '90' + phoneNumber;
        }
    }

    const msg = `Merhaba, ${state.customerName} için hazırladığımız ${state.projectName} projesi teklifimiz hazır. \nToplam Tutar: ${total}\nDetayları incelemek için iletişime geçebilirsiniz.`;
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
};

window.shareProposalEmail = function () {
    const total = document.getElementById('grandTotal').textContent;
    const subject = `${state.customerName} - ${state.projectName} Teklifi`;
    const body = `Sayın ${state.customerName},\n\n${state.projectName} projesi için hazırladığımız teklif detayları aşağıdadır:\n\nToplam Tutar: ${total}\n\nDetaylı teklif dosyasını ekte bulabilirsiniz.\n\nSaygılarımızla,`;
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
};

function updateKanbanFromProposal(proposal) {
    const list = state.kanban[0]; // Add to first list by default (Yeni)
    const existingIdx = state.kanban.reduce((found, l) => {
        if (found !== -1) return found;
        const idx = l.cards.findIndex(c => c.customerName === proposal.customerName && c.title === proposal.projectName);
        return idx !== -1 ? { listId: l.id, cardIdx: idx } : -1;
    }, -1);

    if (existingIdx !== -1) {
        // Update existing card
        const card = state.kanban.find(l => l.id === existingIdx.listId).cards[existingIdx.cardIdx];
        card.updatedAt = Date.now();
        if (!card.proposals) card.proposals = [];
        if (!card.proposals.includes(proposal.code)) card.proposals.push(proposal.code);
    } else {
        // Find customer details
        const cust = state.customers.find(c => c.name === proposal.customerName) || { phone: '', email: '' };

        // Create new card
        state.kanban[0].cards.push({
            id: Date.now().toString(),
            title: proposal.projectName || 'İsimsiz Proje',
            customerName: proposal.customerName,
            phone: cust.phone || '',
            email: cust.email || '',
            proposals: [proposal.code],
            updatedAt: Date.now()
        });
    }
    persistKanban();
}

window.handleProposalSearch = function () {
    renderSavedProposals(els.proposalSearchInput.value);
};

function renderSavedProposals(filter = '') {
    if (!els.savedProposalsList) return;

    els.savedProposalsList.innerHTML = '';
    const filtered = state.savedProposals.filter(p =>
        p.code.toLowerCase().includes(filter.toLowerCase()) ||
        p.customerName.toLowerCase().includes(filter.toLowerCase())
    ).sort((a, b) => (b.createdAt || b.id) - (a.createdAt || a.id));

    if (filtered.length === 0) {
        els.savedProposalsList.innerHTML = `<p class="empty-msg">Kayıtlı teklif bulunamadı.</p>`;
        return;
    }

    // Limit to 10 if not searching
    const displayList = filter.trim() === '' ? filtered.slice(0, 10) : filtered;

    displayList.forEach(p => {
        const d = document.createElement('div');
        d.className = 'service-item';
        d.style.cursor = 'pointer';
        d.title = 'Teklifi Yükle';
        d.innerHTML = `
            <div onclick="loadProposalById(${p.id})">
                <div class="service-item-info">${p.code}</div>
                <div class="service-item-sub">${p.customerName} - ${p.projectName} (${p.items ? p.items.length : 0} kalem)</div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--secondary); margin-top:2px;">${formatCurrency(p.total || 0)}</div>
            </div>
            <div class="service-actions">
                <button onclick="deleteProposal(${p.id})" style="color:#e74c3c" title="Teklifi Sil">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        els.savedProposalsList.appendChild(d);
    });
}

window.loadProposalById = function (id) {
    if (!id) return;
    // Just use viewSavedProposal since it has all the loading logic now
    viewSavedProposal(id);
};

window.deleteProposal = function (id) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    state.savedProposals = state.savedProposals.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_PROPOSALS, JSON.stringify(state.savedProposals));
    renderSavedProposals();
};

window.switchTab = (n) => {
    // Update Sidebar Navigation UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`'${n}'`)) {
            item.classList.add('active');
        }
    });

    // Hide all tabs first
    const tabs = document.querySelectorAll('.builder-content');
    tabs.forEach(t => t.classList.add('hidden'));

    const container = document.querySelector('.app-container');
    // Adjust layout based on view
    if (n === 'proposal' || n === 'proposals') {
        container.classList.remove('view-management');
    } else {
        container.classList.add('view-management');
    }

    if (n === 'dashboard') {
        if (els.tabDashboard) els.tabDashboard.classList.remove('hidden');
        renderDashboard();
    }
    if (n === 'proposal') {
        els.tabProposal.classList.remove('hidden');
    }
    if (n === 'proposals') {
        if (els.tabProposals) els.tabProposals.classList.remove('hidden');
        renderSavedProposals();
    }
    if (n === 'services') els.tabServices.classList.remove('hidden');
    if (n === 'products') {
        if (els.tabProducts) els.tabProducts.classList.remove('hidden');
        renderProductList();
    }
    if (n === 'references') els.tabReferences.classList.remove('hidden');
    if (n === 'customers') {
        els.tabCustomers.classList.remove('hidden');
        renderCustomerList();
    }
    if (n === 'kanban') {
        els.tabKanban.classList.remove('hidden');
        renderKanban();
    }
    if (n === 'settings') els.tabSettings.classList.remove('hidden');
};

function renderReferencesGrid() {
    els.refGrid.innerHTML = '';
    const cartIds = state.cart.map(i => i.id);

    // Try to find matching references first
    let matchedRefs = state.references.filter(r => r.tags && r.tags.some(t => cartIds.includes(t)));

    // If no matched refs or not enough, show a mix of all references
    let display;
    if (matchedRefs.length >= 4) {
        display = matchedRefs.slice(0, 8);
    } else {
        // Show random selection of references (shuffle and take first 6)
        const shuffled = [...state.references].sort(() => 0.5 - Math.random());
        display = shuffled.slice(0, 6);
    }

    display.forEach(ref => {
        const d = document.createElement('div');
        d.className = 'ref-card';
        d.innerHTML = `<img src="${ref.image || 'assets/references/villa.png'}"><div class="ref-title">${ref.title}</div><div class="ref-cat">${ref.category}</div>`;
        els.refGrid.appendChild(d);
    });
}

function updateProposalHeaders() {
    const c = state.company;
    if (c.logo) els.companyLogo.innerHTML = `<img src="${c.logo}" style="max-height:120px; max-width:240px;">`;
    else els.companyLogo.textContent = APP_DATA.company.logo_text || c.name.substring(0, 4).toUpperCase();

    els.companyInfo.innerHTML = `<strong>${c.name}</strong><br>${c.address}<br>${c.phone}<br>${c.email}`;
    els.propClientName.textContent = state.customerName || '___________';
    els.propProjectName.textContent = state.projectName || '...';

    // Generate Code
    const clientCode = getConsonants(state.customerName);
    const projectCode = getConsonants(state.projectName);
    const fullCode = `${clientCode}-${projectCode}-V${state.version}`;
    els.propFullCode.textContent = fullCode;

    els.propDate.textContent = formatDate(state.date);

    // Validity Date Calculation
    let validityDateObj;
    if (state.validity.type === 'custom') {
        validityDateObj = new Date(state.validity.customDate || els.validityDateInput.value);
    } else {
        validityDateObj = new Date(state.date);
        validityDateObj.setDate(validityDateObj.getDate() + parseInt(state.validity.type));
    }
    els.propValidityDate.textContent = validityDateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    if (els.propNotes) els.propNotes.textContent = c.notes || '';
}

window.setValidity = function (days, btn = null) {
    state.validity.type = days.toString();

    // Calculate and set date input
    const date = new Date(state.date);
    date.setDate(date.getDate() + days);
    els.validityDateInput.value = date.toISOString().split('T')[0];
    state.validity.customDate = els.validityDateInput.value;

    // UI Feedback
    document.querySelectorAll('.validity-btn').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-secondary');
    });

    if (btn) {
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-secondary');
    } else {
        const btns = document.querySelectorAll('.validity-btn');
        if (days === 7) highlightBtn(btns[0]);
        else if (days === 15) highlightBtn(btns[1]);
        else if (days === 30) highlightBtn(btns[2]);
    }

    updateProposalHeaders();
};

function highlightBtn(btn) {
    if (!btn) return;
    btn.classList.add('active', 'btn-primary');
    btn.classList.remove('btn-secondary');
}

window.handleCustomValidityDate = function () {
    state.validity.type = 'custom';
    state.validity.customDate = els.validityDateInput.value;

    document.querySelectorAll('.validity-btn').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-secondary');
    });

    updateProposalHeaders();
};

// Kanban Logic
window.addNewKanbanList = function () {
    const title = prompt('Liste Başlığı:');
    if (!title) return;
    state.kanban.push({
        id: 'list-' + Date.now(),
        title,
        cards: []
    });
    persistKanban();
};

window.deleteKanbanList = function (listId) {
    if (!listId) return;
    const listIdx = state.kanban.findIndex(l => l.id === listId);
    if (listIdx === 0) return alert('Bu ana liste silinemez.');

    if (!confirm('Listeyi ve içindeki tüm kartları silmek istediğinize emin misiniz?')) return;
    state.kanban = state.kanban.filter(l => l.id !== listId);
    persistKanban();
    renderKanban();
};

// Delete individual Kanban card
window.deleteKanbanCard = function (listId, cardId) {
    if (!listId || !cardId) return;

    const list = state.kanban.find(l => l.id === listId);
    if (!list) return;

    const card = list.cards.find(c => c.id === cardId);
    if (!card) return;

    const cardName = card.title || card.customerName || 'Bu kart';

    // Archive logic vs Permanent delete
    if (listId === 'list-archive') {
        if (!confirm(`"${cardName}" projesini arşivden tamamen silmek istediğinize emin misiniz?`)) return;
        list.cards = list.cards.filter(c => c.id !== cardId);
    } else {
        if (!confirm(`"${cardName}" projesini arşive taşımak istiyor musunuz?`)) return;
        const archiveList = state.kanban.find(l => l.id === 'list-archive');
        if (archiveList) {
            const cardIdx = list.cards.findIndex(c => c.id === cardId);
            const [removedCard] = list.cards.splice(cardIdx, 1);
            removedCard.updatedAt = Date.now();
            archiveList.cards.push(removedCard);
        } else {
            // Fallback if no archive list
            list.cards = list.cards.filter(c => c.id !== cardId);
        }
    }

    persistKanban();
    renderKanban();
};

function getUrgencyStats(updatedAt) {
    const diffMs = Date.now() - (updatedAt || Date.now());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // 0 days = 120 (Green), 20 days = 0 (Red)
    let hue = 120 - (diffDays * 6);
    if (hue < 0) hue = 0;

    return {
        color: `hsl(${hue}, 80%, 45%)`,
        days: diffDays
    };
}

function renderKanban() {
    if (!els.kanbanBoard) return;
    els.kanbanBoard.innerHTML = '';

    const columnClasses = {
        'list-open': 'column-open',
        'list-received': 'column-received',
        'list-declined': 'column-declined',
        'list-accepted': 'column-accepted'
    };

    state.kanban.forEach(list => {
        const listEl = document.createElement('div');
        listEl.className = `kanban-column ${columnClasses[list.id] || ''}`;
        listEl.dataset.listId = list.id;

        listEl.innerHTML = `
            <div class="kanban-header">
                <span class="kanban-header-title">${list.title} <small>(${list.cards.length})</small></span>
                <div class="kanban-list-menu-wrapper">
                    <div class="list-menu-trigger" onclick="toggleListActionMenu(event, '${list.id}')" style="cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    </div>
                    <div class="list-action-menu hidden" id="menu-${list.id}">
                        <button onclick="renameKanbanList('${list.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> 
                            Adlandır
                        </button>
                        <button class="delete-action" onclick="deleteKanbanList('${list.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Sil
                        </button>
                    </div>
                </div>
            </div>
            <div class="kanban-cards" 
                 ondragover="allowDrop(event)" 
                 ondrop="dropCard(event)" 
                 ondragenter="dragEnter(event)" 
                 ondragleave="dragLeave(event)">
            </div>
        `;

        const cardsContainer = listEl.querySelector('.kanban-cards');
        list.cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'kanban-card';
            cardEl.draggable = true;
            cardEl.id = 'card-' + card.id;
            cardEl.onclick = (e) => {
                if (e.target.closest('.card-view-btn') || e.target.closest('.btn-remove')) return;
                openCardModal(list.id, card.id);
            };
            cardEl.ondragstart = (e) => dragCard(e, card.id, list.id);

            // Get last proposal details if available
            let lastTotal = "0.00 ₺";
            let lastDate = "-";
            let lastCode = "PRO-000000";
            if (card.proposals && card.proposals.length > 0) {
                lastCode = card.proposals[card.proposals.length - 1];
                const p = state.savedProposals.find(sp => sp.code === lastCode);
                if (p) {
                    lastTotal = formatCurrency(p.total || 0);
                    lastDate = formatDate(p.date);
                }
            }

            const urgency = getUrgencyStats(card.updatedAt);
            cardEl.style.borderLeft = `5px solid ${urgency.color}`;

            cardEl.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="card-id">${lastCode}</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:0.7rem; color:${urgency.color}; font-weight:700;">${urgency.days} GÜN</span>
                        <i class="fa-regular fa-pen-to-square" style="color:var(--text-muted); cursor:pointer;" onclick="openCardModal('${list.id}', '${card.id}')"></i>
                    </div>
                </div>
                <div class="card-title">${card.customerName || 'Bilinmiyor'}</div>
                <div class="card-row" style="margin-top:4px;">
                    <span>Tutar: ${lastTotal}</span>
                </div>
                <div class="card-row">
                    <span>Tarih: ${lastDate}</span>
                </div>
                <div class="card-footer">
                    <div class="card-comments">
                        <i class="fa-regular fa-comment"></i>
                        <span>${card.comments ? card.comments.length : 0} Yorum</span>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <a href="#" class="card-view-btn" onclick="event.preventDefault(); openCardModal('${list.id}', '${card.id}');">Detaylar</a>
                        <button onclick="event.stopPropagation(); deleteKanbanCard('${list.id}', '${card.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; padding:2px;" title="Kartı Sil">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            cardsContainer.appendChild(cardEl);
        });

        els.kanbanBoard.appendChild(listEl);
    });
}

// Drag and Drop
let draggedCardId = null;
let sourceListId = null;

function dragCard(e, cardId, listId) {
    draggedCardId = cardId;
    sourceListId = listId;
    e.dataTransfer.setData('text/plain', cardId);
}

window.allowDrop = (e) => e.preventDefault();

window.dragEnter = (e) => {
    if (e.currentTarget.classList.contains('kanban-cards')) {
        e.currentTarget.classList.add('drag-over');
    }
};

window.dragLeave = (e) => {
    if (e.currentTarget.classList.contains('kanban-cards')) {
        e.currentTarget.classList.remove('drag-over');
    }
};

window.dropCard = function (e) {
    e.preventDefault();
    const targetCardsContainer = e.currentTarget.closest('.kanban-cards');
    if (!targetCardsContainer) return;

    const targetListEl = targetCardsContainer.closest('.kanban-column');
    const targetListId = targetListEl.dataset.listId;

    targetCardsContainer.classList.remove('drag-over');

    if (sourceListId === targetListId) return;

    // Use == for comparison to handle string/number issues
    const sourceList = state.kanban.find(l => l.id == sourceListId);
    const targetList = state.kanban.find(l => l.id == targetListId);
    if (!sourceList || !targetList) return;

    const cardIdx = sourceList.cards.findIndex(c => c.id == draggedCardId);
    if (cardIdx === -1) return;

    const [card] = sourceList.cards.splice(cardIdx, 1);
    card.updatedAt = Date.now();
    targetList.cards.push(card);

    persistKanban();
    renderKanban();
};

window.renameKanbanList = function (id) {
    const list = state.kanban.find(l => l.id === id);
    if (!list) return;
    const newTitle = prompt('Liste Ä°smi:', list.title);
    if (newTitle && newTitle !== list.title) {
        list.title = newTitle;
        persistKanban();
        renderKanban();
    }
};

window.toggleListActionMenu = function (e, id) {
    e.stopPropagation();
    const menu = document.getElementById(`menu-${id}`);

    // Close all other menus
    document.querySelectorAll('.list-action-menu').forEach(m => {
        if (m.id !== `menu-${id}`) m.classList.add('hidden');
    });

    menu.classList.toggle('hidden');
};

// Global listener to close menus on click outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.kanban-list-menu-wrapper')) {
        document.querySelectorAll('.list-action-menu').forEach(m => m.classList.add('hidden'));
    }
});

window.openCardModal = function (listId, cardId = null) {
    const modal = document.getElementById('cardModal');
    if (!modal) return;

    document.getElementById('editListId').value = listId;
    document.getElementById('editCardId').value = cardId || '';

    if (cardId) {
        const list = state.kanban.find(l => l.id === listId);
        const card = list.cards.find(c => c.id === cardId);
        document.getElementById('cardModalTitle').textContent = 'Proje Detayları';
        document.getElementById('editCardTitle').value = card.title;
        document.getElementById('editCardCustomer').value = card.customerName || '';
        document.getElementById('editCardPhone').value = card.phone || '';
        document.getElementById('editCardEmail').value = card.email || '';

        // Render Communication Buttons
        renderCommButtons(card);

        // Render Proposal History
        renderProposalHistory(card);

        // Render Comments Timeline
        renderComments(card);
    } else {
        document.getElementById('cardModalTitle').textContent = 'Yeni Kart Ekle';
        document.getElementById('editCardTitle').value = '';
        document.getElementById('editCardCustomer').value = '';
        document.getElementById('editCardPhone').value = '';
        document.getElementById('editCardEmail').value = '';
        if (els.commentsContainer) els.commentsContainer.innerHTML = '<p class="empty-msg">Yeni kart için henüz yorum yok.</p>';
        if (els.proposalHistoryContainer) els.proposalHistoryContainer.innerHTML = '';
    }

    modal.classList.remove('hidden');
};

window.closeCardModal = function () {
    document.getElementById('cardModal').classList.add('hidden');
};

window.saveCardDetails = function () {
    const listId = document.getElementById('editListId').value;
    const cardId = document.getElementById('editCardId').value;

    const title = document.getElementById('editCardTitle').value;
    if (!title) return alert('Başlık zorunludur.');

    const cardData = {
        title: title,
        customerName: document.getElementById('editCardCustomer').value,
        phone: document.getElementById('editCardPhone').value,
        email: document.getElementById('editCardEmail').value,
        updatedAt: Date.now()
    };

    const list = state.kanban.find(l => l.id === listId);
    if (!list) return;

    if (cardId) {
        const cardIdx = list.cards.findIndex(c => c.id === cardId);
        if (cardIdx > -1) {
            // Preserve existing comments and proposals
            list.cards[cardIdx] = { ...list.cards[cardIdx], ...cardData };
        }
    } else {
        cardData.id = 'k' + Date.now();
        cardData.proposals = [];
        cardData.comments = [];
        list.cards.push(cardData);
    }

    // Sync with CRM
    if (cardData.customerName) {
        syncCardWithCRM(cardData);
    }

    persistKanban();
    closeCardModal();
    renderKanban(); // Refresh board
};

function renderCommButtons(card) {
    const phone = card.phone || '';
    const email = card.email || '';
    const name = card.customerName || '';

    const container = document.getElementById('commButtons');
    if (!container) return;

    container.innerHTML = `
        <a href="tel:${phone}" class="comm-btn phone-btn" title="Ara"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a>
        <a href="https://wa.me/${phone.replace(/\D/g, '')}" target="_blank" class="comm-btn whatsapp-btn" title="WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg></a>
        <a href="mailto:${email}" class="comm-btn email-btn" title="E-posta Gönder"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></a>
    `;
}

function renderProposalHistory(card) {
    const container = document.getElementById('proposalHistory');
    if (!container) return;

    // Find proposals for this card (by code) - sort by timestamp (newest first)
    const proposals = state.savedProposals.filter(p => card.proposals && card.proposals.includes(p.code))
        .sort((a, b) => (b.createdAt || b.id) - (a.createdAt || a.id)) // Use timestamp for precise sorting
        .slice(0, 3);

    if (proposals.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="font-size:0.8rem;">Henüz teklif yok.</p>';
        return;
    }

    container.innerHTML = proposals.map(p => `
        <div class="prop-hist-item" style="display:flex; align-items:center; gap:6px; padding:4px 0; font-size:0.75rem; border-bottom:1px solid var(--border-color);">
            <span style="font-weight:600; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:90px;" title="${p.code}">${p.code}</span>
            <span style="color:var(--accent); font-weight:600; min-width:60px; text-align:right;">${formatCurrency(p.total)}</span>
            <span style="color:var(--text-muted); min-width:55px; text-align:center;">${formatDate(p.date)}</span>
            <div style="display:flex; gap:2px;">
                <button style="padding:3px 5px; border:none; background:var(--accent); color:white; border-radius:4px; cursor:pointer; font-size:0.65rem;" onclick="viewSavedProposal('${p.id}')" title="Görüntüle/Düzenle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function renderComments(card) {
    const container = document.getElementById('commentsContainer');
    if (!container) return;

    if (!card.comments || card.comments.length === 0) {
        container.innerHTML = '<p class="empty-msg">Henüz yorum yapılmamış.</p>';
        return;
    }

    container.innerHTML = card.comments.map(c => `
        <div class="comment-item">
            <div class="comment-meta">
                <span class="comment-date">${new Date(c.date).toLocaleString('tr-TR')}</span>
            </div>
            <div class="comment-text">${c.text}</div>
        </div>
    `).sort((a, b) => b.date - a.date).join('');
}

window.addComment = function () {
    const input = document.getElementById('newCommentText');
    const text = input.value.trim();
    if (!text) return;

    const listId = document.getElementById('editListId').value;
    const cardId = document.getElementById('editCardId').value;

    if (!cardId) return alert('Önce kartı kaydetmelisiniz.');

    const list = state.kanban.find(l => l.id === listId);
    const card = list.cards.find(c => c.id === cardId);

    if (!card.comments) card.comments = [];
    card.comments.unshift({
        id: 'c' + Date.now(),
        text: text,
        date: Date.now()
    });

    card.updatedAt = Date.now();
    input.value = '';
    renderComments(card);
    persistKanban();
};

window.viewSavedProposal = function (id) {
    state.currentProposalId = id;
    // Convert id to number for comparison (id is stored as number from Date.now())
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    const p = state.savedProposals.find(sp => sp.id === numId || sp.id == id);
    if (p) {
        // Load proposal into builder for viewing
        state.cart = JSON.parse(JSON.stringify(p.items || []));
        state.productCart = JSON.parse(JSON.stringify(p.products || [])); // Also load products
        state.customerName = p.customerName;
        state.projectName = p.projectName;
        state.version = p.version;
        state.date = p.date;
        state.discountType = p.discountType || 'none';
        state.discountValue = p.discountValue || 0;

        // Update form inputs to reflect loaded data
        if (els.customerInput) els.customerInput.value = p.customerName || '';
        if (els.projectNameInput) els.projectNameInput.value = p.projectName || '';
        if (els.versionInput) els.versionInput.value = p.version || 1;
        if (els.dateInput) els.dateInput.value = p.date || '';
        if (els.validityDateInput) els.validityDateInput.value = p.validityDate || '';

        // Update Discount UI if elements exist (Assuming IDs based on state fields)
        const discTypeEl = document.getElementById('discountType');
        const discValEl = document.getElementById('discountValue');
        if (discTypeEl) discTypeEl.value = p.discountType || 'none';
        if (discValEl) discValEl.value = p.discountValue || 0;

        // Restore notes and conditions if available
        state.notes = p.notes || '';
        state.conditions = p.conditions || (APP_DATA.settings ? APP_DATA.settings.conditions : '');

        const notesEl = document.getElementById('proposalNotes');
        if (notesEl) notesEl.value = state.notes;

        switchTab('proposal');
        renderCart();
        renderProductCart();
        renderProposalItems();
        renderProductItems();
        renderServiceChecklist();
        renderProductChecklist();
        updateGrandTotal();
        updateProposalHeaders();
        closeCardModal();
    }
};

// Print saved proposal directly (PDF)
window.printSavedProposal = function (id) {
    // First load the proposal
    viewSavedProposal(id);

    // Wait for render then print
    setTimeout(() => {
        window.print();
    }, 300);
};

function syncCardWithCRM(card) {
    const exists = state.customers.find(c => c.name.toLowerCase().trim() === card.customerName.toLowerCase().trim());
    if (!exists) {
        state.customers.push({
            id: 'c' + Date.now(),
            name: card.customerName,
            phone: card.phone,
            email: card.email,
            address: '',
            updatedAt: Date.now()
        });
        persistCustomers();
    }
}



function syncProposalsToKanban() {
    state.savedProposals.forEach(p => {
        // Check if this proposal's code is already on any card
        const exists = state.kanban.some(list =>
            list.cards.some(card =>
                card.proposals && card.proposals.includes(p.code)
            )
        );

        if (!exists) {
            // Check if there's a card for this customer+project but without this specific version
            const nearMatchList = state.kanban.find(list =>
                list.cards.some(card =>
                    card.customerName === p.customerName &&
                    card.title === p.projectName
                )
            );

            if (nearMatchList) {
                const card = nearMatchList.cards.find(c => c.customerName === p.customerName && c.title === p.projectName);
                if (!card.proposals) card.proposals = [];
                if (!card.proposals.includes(p.code)) card.proposals.push(p.code);
            } else {
                // Create new card in Entry list
                const entryList = state.kanban.find(l => l.id === 'list-open') || state.kanban[0];
                const cust = state.customers.find(c => c.name === p.customerName) || { phone: '', email: '' };

                entryList.cards.push({
                    id: 'k' + Date.now() + Math.random().toString(36).substr(2, 5),
                    title: p.projectName || 'Ä°simsiz Proje',
                    customerName: p.customerName,
                    phone: cust.phone || '',
                    email: cust.email || '',
                    proposals: [p.code],
                    updatedAt: Date.now(),
                    comments: []
                });
            }
        }
    });
    persistKanban();
}

// ====================================
// PRODUCTS MODULE
// ====================================

function renderProductChecklist(filter = '') {
    const container = document.getElementById('productChecklist');
    if (!container) return;

    let displayProducts = [...state.products];

    if (filter) {
        const query = filter.toLowerCase();
        displayProducts = displayProducts.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
    } else {
        displayProducts.sort((a, b) => (state.productUsage[b.id] || 0) - (state.productUsage[a.id] || 0));
        displayProducts = displayProducts.slice(0, 20);
    }

    container.innerHTML = '';
    displayProducts.forEach(product => {
        const isSelected = state.productCart.some(c => c.id === product.id);
        const div = document.createElement('div');
        div.className = `service-check-item ${isSelected ? 'active' : ''}`;
        div.onclick = () => toggleProduct(product.id);

        div.innerHTML = `
            <div class="service-check-info">
                <span class="service-check-name">${product.name}</span>
                <span class="service-check-price">${product.price} ₺ / ${product.unit}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

window.handleProductSearch = function () {
    const input = document.getElementById('productSearchInput');
    if (input) renderProductChecklist(input.value);
};

window.toggleProduct = function (productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const existingIdx = state.productCart.findIndex(c => c.id === productId);

    if (existingIdx > -1) {
        state.productCart.splice(existingIdx, 1);
    } else {
        state.productCart.push({ ...product, qty: 1 });
        state.productUsage[productId] = (state.productUsage[productId] || 0) + 1;
        localStorage.setItem('teklif_product_usage', JSON.stringify(state.productUsage));
    }

    const input = document.getElementById('productSearchInput');
    renderProductChecklist(input ? input.value : '');
    renderProductCart();
    renderProductItems();
};

window.updateProductQty = (id, q) => {
    const item = state.productCart.find(i => i.id === id);
    if (!item) return;
    item.qty = parseInt(q) || 0;
    if (item.qty <= 0) window.removeProductItem(id);
    else { renderProductCart(); renderProductItems(); }
};

window.updateProductPrice = (id, p) => {
    const item = state.productCart.find(i => i.id === id);
    if (item) { item.price = parseFloat(p) || 0; renderProductItems(); }
};

window.removeProductItem = (id) => {
    state.productCart = state.productCart.filter(i => i.id !== id);
    renderProductCart();
    renderProductItems();
    const input = document.getElementById('productSearchInput');
    renderProductChecklist(input ? input.value : '');
};

function renderProductCart() {
    const container = document.getElementById('productCartItems');
    if (!container) return;

    container.innerHTML = '';
    if (state.productCart.length === 0) {
        container.innerHTML = '<p class="empty-msg">Henüz ürün eklenmedi.</p>';
        return;
    }
    state.productCart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div style="display:flex; align-items:center; gap:5px; margin-top:5px;">
                    <input type="number" value="${item.price}" class="price-input form-control" style="width:80px;" onchange="updateProductPrice('${item.id}', this.value)">
                    <span>₺ / ${item.unit}</span>
                </div>
            </div>
            <div class="cart-controls">
                <input type="number" value="${item.qty}" min="1" class="qty-input" onchange="updateProductQty('${item.id}', this.value)">
                <button class="btn-remove" onclick="removeProductItem('${item.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;
        container.appendChild(el);
    });
}

function renderProductItems() {
    const container = document.getElementById('propProductList');
    const section = document.getElementById('productsSection');
    if (!container) return;

    container.innerHTML = '';

    if (state.productCart.length === 0) {
        if (section) section.style.display = 'none';
        updateGrandTotal();
        return;
    }

    if (section) section.style.display = 'block';

    let productTotal = 0;
    state.productCart.forEach((item, idx) => {
        const lineTotal = item.price * item.qty;
        productTotal += lineTotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="col-no">${idx + 1}</td>
            <td class="col-name">${item.name}</td>
            <td class="col-desc">${item.description || '-'}</td>
            <td class="col-unit">${item.unit}</td>
            <td class="col-qty">${item.qty}</td>
            <td class="col-price">${item.price.toLocaleString('tr-TR')} ₺</td>
            <td class="col-total">${lineTotal.toLocaleString('tr-TR')} ₺</td>
        `;
        container.appendChild(tr);
    });

    const productSubtotal = document.getElementById('productSubTotal');
    if (productSubtotal) productSubtotal.textContent = productTotal.toLocaleString('tr-TR') + ' ₺';

    updateGrandTotal();
}

function updateGrandTotal() {
    let serviceTotal = 0;
    state.cart.forEach(item => serviceTotal += item.price * item.qty);

    let productTotal = 0;
    state.productCart.forEach(item => productTotal += item.price * item.qty);

    const subTotal = serviceTotal + productTotal;
    let discountAmount = 0;

    if (state.discountType === 'percentage') {
        discountAmount = (subTotal * state.discountValue) / 100;
    } else if (state.discountType === 'amount') {
        discountAmount = parseFloat(state.discountValue) || 0;
    }

    const grand = subTotal - discountAmount;

    // Update discount display in preview if exists
    const discountRow = document.getElementById('discountRow');
    const discountValEl = document.getElementById('discountAmountDisplay');
    if (discountRow) {
        if (discountAmount > 0) {
            discountRow.style.display = 'table-row';
            if (discountValEl) discountValEl.textContent = '-' + discountAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
        } else {
            discountRow.style.display = 'none';
        }
    }

    const grandTotalEl = document.getElementById('grandTotal');
    if (grandTotalEl) grandTotalEl.textContent = grand.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
}

// Product CRUD for Products Tab
function renderProductList() {
    const container = document.getElementById('productList');
    if (!container) return;

    container.innerHTML = '';
    state.products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'service-item';
        div.innerHTML = `
            <div class="service-item-body">
                <div class="service-item-info">${product.name}</div>
                <div class="service-item-sub">${product.price} ₺ / ${product.unit}</div>
                <div class="service-item-desc" style="font-size:0.8rem; color:#666;">${product.description || ''}</div>
                <div class="service-actions">
                    <button onclick="showProductForm('${product.id}')" title="Düzenle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button onclick="deleteProduct('${product.id}')" style="color:#e74c3c" title="Sil">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

window.showProductForm = function (id = null) {
    const form = document.getElementById('productForm');
    if (!form) return;
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth' });

    if (id) {
        const product = state.products.find(p => p.id === id);
        if (!product) return;
        document.getElementById('prodFormTitle').textContent = 'Ürün Düzenle';
        document.getElementById('prodId').value = product.id;
        document.getElementById('prodName').value = product.name;
        document.getElementById('prodDesc').value = product.description || '';
        document.getElementById('prodPrice').value = product.price;
        document.getElementById('prodUnit').value = product.unit;
    } else {
        document.getElementById('prodFormTitle').textContent = 'Yeni Ürün Ekle';
        document.getElementById('prodId').value = '';
        document.getElementById('prodName').value = '';
        document.getElementById('prodDesc').value = '';
        document.getElementById('prodPrice').value = '';
        document.getElementById('prodUnit').value = 'adet';
    }
};

window.hideProductForm = function () {
    const form = document.getElementById('productForm');
    if (form) form.classList.add('hidden');
};

window.saveProduct = function () {
    const id = document.getElementById('prodId').value;
    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);

    if (!name || isNaN(price)) return alert('Lütfen ürün adı ve fiyat girin.');

    const productData = {
        name,
        description: document.getElementById('prodDesc').value || '',
        price,
        unit: document.getElementById('prodUnit').value || 'adet'
    };

    if (id) {
        const idx = state.products.findIndex(p => p.id === id);
        if (idx > -1) state.products[idx] = { ...state.products[idx], ...productData };
    } else {
        productData.id = 'p' + Date.now();
        state.products.push(productData);
    }

    persistProducts();
    hideProductForm();
};

window.deleteProduct = function (id) {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    state.products = state.products.filter(p => p.id !== id);
    state.productCart = state.productCart.filter(c => c.id !== id);
    persistProducts();
    renderProductCart();
    renderProductItems();
};

// Excel Import for Products
window.importProductsFromExcel = async function (inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        alert('Excel kÃ¼tÃ¼phanesi yÃ¼klenemedi. LÃ¼tfen sayfayÄ± yenileyin.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            let imported = 0;
            jsonData.forEach(row => {
                const name = row['Ürün Adı'] || row['name'] || row['Name'] || row['ÜRÜN ADI'];
                const price = parseFloat(row['Fiyat'] || row['price'] || row['Price'] || row['FİYAT'] || 0);
                const unit = row['Birim'] || row['unit'] || row['Unit'] || row['BİRİM'] || 'adet';
                const description = row['Açıklama'] || row['description'] || row['Description'] || row['AÇIKLAMA'] || '';

                if (name && !isNaN(price)) {
                    state.products.push({
                        id: 'p' + Date.now() + Math.random().toString(36).substr(2, 5),
                        name: name.trim(),
                        price,
                        unit: unit.trim(),
                        description: description.trim()
                    });
                    imported++;
                }
            });

            persistProducts();
            alert(`${imported} ürün başarıyla içe aktarıldı.`);
            inputEl.value = '';
        } catch (err) {
            console.error('Excel import error:', err);
            alert('Excel dosyası okunamadı. Lütfen formatı kontrol edin.');
        }
    };
    reader.readAsArrayBuffer(file);
};

// ====================================
// DASHBOARD MODULE
// ====================================
let revenueChartInstance = null;
let statusChartInstance = null;

function renderDashboard() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
    }

    const proposals = state.savedProposals || [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let totalRevenue = 0;
    let pendingValue = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;
    let monthlyCount = 0;

    proposals.forEach(p => {
        const pDate = new Date(p.date || Date.now());
        const isThisMonth = pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;

        if (isThisMonth) monthlyCount++;

        const status = (p.status || 'Hazırlandı').toLowerCase();
        let amount = 0;

        // Parse amount "1.250,00 ₺" -> 1250.00
        if (p.grandTotal) {
            amount = parseFloat(p.grandTotal.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
        }

        if (status.includes('kabul') || status.includes('onay') || status === 'accepted') {
            totalRevenue += amount;
            acceptedCount++;
        } else if (status.includes('red') || status.includes('iptal') || status === 'declined') {
            rejectedCount++;
        } else {
            pendingValue += amount;
            pendingCount++;
        }
    });

    const totalDecided = acceptedCount + rejectedCount;
    const winRate = totalDecided > 0 ? Math.round((acceptedCount / totalDecided) * 100) : 0;

    // Update KPI Cards
    const elRev = document.getElementById('kpiRevenue');
    if (elRev) elRev.textContent = totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

    const elPen = document.getElementById('kpiPending');
    if (elPen) elPen.textContent = pendingValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

    const elPenCount = document.getElementById('kpiPendingCount');
    if (elPenCount) elPenCount.textContent = `${pendingCount} teklif bekliyor`;

    const elWin = document.getElementById('kpiWinRate');
    if (elWin) elWin.textContent = `%${winRate}`;

    const elMon = document.getElementById('kpiMonthCount');
    if (elMon) elMon.textContent = monthlyCount;

    renderRevenueChart();
    renderStatusChart({ acceptedCount, pendingCount, rejectedCount });
}

function renderRevenueChart() {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Calculate last 6 months revenue
    const months = [];
    const revenue = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('tr-TR', { month: 'short' });
        months.push(monthName);

        // Sum revenue for this month
        const m = d.getMonth();
        const y = d.getFullYear();

        const total = state.savedProposals
            .filter(p => {
                const pd = new Date(p.date || Date.now());
                const status = (p.status || '').toLowerCase();
                const isAccepted = status.includes('kabul') || status.includes('onay');
                return isAccepted && pd.getMonth() === m && pd.getFullYear() === y;
            })
            .reduce((sum, p) => {
                const amt = parseFloat(p.grandTotal.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
                return sum + amt;
            }, 0);

        revenue.push(total);
    }

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Ciro (₺)',
                data: revenue,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) { return value.toLocaleString('tr-TR') + ' ₺'; }
                    }
                }
            }
        }
    });
}



function renderStatusChart(kpis) {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Kabul', 'Bekleyen', 'Red'],
            datasets: [{
                data: [kpis.acceptedCount, kpis.pendingCount, kpis.rejectedCount],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', init);

// ====================================
// SERVER-SIDE PDF (Puppeteer) + EMAIL
// ====================================

// Capture the live proposal (#proposalPaper) as static HTML for server rendering.
// textarea/input values aren't reflected in outerHTML, so we replace them with
// their current values in a clone before serializing.
function captureProposalHtml() {
    const src = document.getElementById('proposalPaper');
    if (!src) return null;
    const clone = src.cloneNode(true);

    const srcTextareas = src.querySelectorAll('textarea');
    const cloneTextareas = clone.querySelectorAll('textarea');
    srcTextareas.forEach((ta, i) => {
        if (!cloneTextareas[i]) return;
        const div = document.createElement('div');
        div.style.whiteSpace = 'pre-wrap';
        div.textContent = ta.value || '';
        cloneTextareas[i].replaceWith(div);
    });

    const srcInputs = src.querySelectorAll('input');
    const cloneInputs = clone.querySelectorAll('input');
    srcInputs.forEach((inp, i) => {
        if (cloneInputs[i]) cloneInputs[i].setAttribute('value', inp.value || '');
    });

    return clone.outerHTML;
}

function proposalFileName() {
    const customer = (state.customerName || 'Teklif').toString().trim();
    const project = (state.projectName || '').toString().trim();
    return [customer, project].filter(Boolean).join(' - ') || 'Teklif';
}

// Download the proposal as a real PDF generated by the server.
async function downloadProposalPdf(btn) {
    const html = captureProposalHtml();
    if (!html) { alert('Önizlenecek teklif bulunamadı.'); return; }

    const original = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ PDF hazırlanıyor...'; }

    try {
        const res = await fetch('/api/pdf/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html, fileName: proposalFileName() })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || ('HTTP ' + res.status));
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = proposalFileName() + '.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('PDF download error:', e);
        alert('PDF oluşturulamadı: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}
window.downloadProposalPdf = downloadProposalPdf;

// Render the proposal to PDF on the server and email it to the customer.
async function sendProposalPdf(btn) {
    const html = captureProposalHtml();
    if (!html) { alert('Gönderilecek teklif bulunamadı.'); return; }

    const customerEmail = prompt('Müşterinin e-posta adresi:', state.customerEmail || '');
    if (!customerEmail) return;

    const original = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Gönderiliyor...'; }

    try {
        const res = await fetch('/api/pdf/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html,
                customerEmail,
                customerName: state.customerName || '',
                projectName: state.projectName || '',
                fileName: proposalFileName()
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || ('HTTP ' + res.status));
        alert('✅ ' + (data.message || 'Teklif gönderildi.'));
    } catch (e) {
        console.error('PDF send error:', e);
        alert('Gönderilemedi: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}
window.sendProposalPdf = sendProposalPdf;

