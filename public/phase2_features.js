
/* 
==============================================
   PHASE 2: AI & SMART FEATURES LOGIC
==============================================
*/

// --- DIGITAL SIGNATURE LOGIC ---
let signaturePadContext = null;
let isSigning = false;

function initSignaturePad() {
    const canvas = document.getElementById('signaturePad');
    if (!canvas) return;

    signaturePadContext = canvas.getContext('2d');
    signaturePadContext.strokeStyle = "#000";
    signaturePadContext.lineWidth = 2;
    signaturePadContext.lineCap = "round";

    // Mouse Events
    canvas.addEventListener('mousedown', startSigning);
    canvas.addEventListener('mouseup', stopSigning);
    canvas.addEventListener('mousemove', drawSignature);
    canvas.addEventListener('mouseleave', stopSigning);

    // Touch Events
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startSigning(e.touches[0]); });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); stopSigning(); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); drawSignature(e.touches[0]); });
}

function startSigning(e) {
    isSigning = true;
    const canvas = document.getElementById('signaturePad');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;

    signaturePadContext.beginPath();
    signaturePadContext.moveTo(x, y);
}

function drawSignature(e) {
    if (!isSigning) return;
    const canvas = document.getElementById('signaturePad');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;

    signaturePadContext.lineTo(x, y);
    signaturePadContext.stroke();
}

function stopSigning() {
    isSigning = false;
    if (signaturePadContext) signaturePadContext.beginPath();
}

function clearSignature() {
    const canvas = document.getElementById('signaturePad');
    if (canvas && signaturePadContext) {
        signaturePadContext.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function openSignatureModal() {
    const modal = document.getElementById('signatureModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Re-init canvas context if needed or just clear
        setTimeout(initSignaturePad, 100);
    }
}

function closeSignatureModal() {
    const modal = document.getElementById('signatureModal');
    if (modal) modal.classList.add('hidden');
}

function saveSignature() {
    const canvas = document.getElementById('signaturePad');
    const placeholder = document.getElementById('clientSignaturePlaceholder');
    const img = document.getElementById('clientSignatureImage');

    if (canvas && img && placeholder) {
        const dataUrl = canvas.toDataURL('image/png');
        img.src = dataUrl;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        closeSignatureModal();
    }
}

// --- AI NOTE WRITER LOGIC ---
// Simple keyword matching for V1
const SMART_TEMPLATES = [
    { keywords: ['çim', 'biçme'], text: '- Çim biçme artıkları poşetlenip tarafımızca bertaraf edilecektir.\n- Uygulama sonrası saha temizliği yapılacaktır.' },
    { keywords: ['budama', 'ağaç'], text: '- Budama atıkları öğütülüp malç olarak kullanılacak veya sahadan uzaklaştırılacaktır.\n- Budama işlemi ağaç sağlığına uygun tekniklerle yapılacaktır.' },
    { keywords: ['ilaçlama'], text: '- Kullanılan ilaçlar Sağlık Bakanlığı onaylı ve çevre dostudur.\n- İlaçlama sonrası 2 saat sulama yapılmaması önerilir.' },
    { keywords: ['sulama', 'otomatik'], text: '- Sistem kurulumunda 1. sınıf malzemeler kullanılacaktır.\n- Toprak kazı hatları eski haline getirilecektir.' },
    { keywords: ['peyzaj', 'tasarım'], text: '- Tasarım onayı alındıktan sonra uygulama başlayacaktır.\n- Bitkiler 1 yıl fidanlık garantisi altındadır.' }
];

async function generateSmartNotes() {
    const serviceNameInput = document.getElementById('srvName'); // "Hizmet Adı" input
    const notesArea = document.getElementById('srvCond');
    const btn = document.getElementById('aiNotesBtn');

    if (!serviceNameInput || !notesArea) {
        alert("Lütfen önce bir hizmet veya ürün seçin.");
        return;
    }

    const serviceName = serviceNameInput.value.trim();
    if (!serviceName) {
        alert("Lütfen bir hizmet adı girin.");
        return;
    }

    // UI Loading State
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yazılıyor...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/ai/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `Sen profesyonel bir teklif hazırlama asistanısın. "${serviceName}" hizmeti için müşteriye sunulacak profesyonel, güven verici ve teknik detay içeren 2-3 maddelik bir "Hizmet Şartları" veya "Yapılacak İşler Listesi" yaz. Türkçe olsun. Sadece maddeleri yaz.`
            })
        });

        const data = await response.json();

        if (data.text) {
            const currentNotes = notesArea.value;
            notesArea.value = currentNotes ? currentNotes + '\n' + data.text : data.text;

            // Visual feedback
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Oluşturuldu';
        } else {
            throw new Error(data.error || 'Yanıt alınamadı');
        }
    } catch (error) {
        console.error("AI Error:", error);
        // Fallback to static templates if API fails or no key
        console.log("Falling back to static templates...");

        let generatedNote = "";
        const lowerName = serviceName.toLowerCase();
        SMART_TEMPLATES.forEach(template => {
            if (template.keywords.some(keyword => lowerName.includes(keyword))) {
                generatedNote += template.text + '\n';
            }
        });

        if (generatedNote) {
            const currentNotes = notesArea.value;
            notesArea.value = currentNotes ? currentNotes + '\n' + generatedNote : generatedNote;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Oluşturuldu (Offline)';
        } else {
            alert("Yapay zeka yanıtı alınamadı ve uygun şablon bulunamadı. Lütfen API anahtarınızı kontrol edin.");
            btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Hata';
        }
    }

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 2000);
}

// --- AI IMAGE GENERATION ---
async function generateAIImage() {
    const serviceNameInput = document.getElementById('srvName');
    const imgBtn = document.getElementById('aiImageBtn');
    const previewDiv = document.getElementById('srvImgPreview');

    if (!serviceNameInput) {
        alert("Lütfen önce hizmet adı girin.");
        return;
    }

    const serviceName = serviceNameInput.value.trim();
    if (!serviceName) {
        alert("Lütfen bir hizmet adı girin.");
        return;
    }

    // UI Loading State
    const originalText = imgBtn.innerHTML;
    imgBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Üretiliyor...';
    imgBtn.disabled = true;

    try {
        const response = await fetch('/api/ai/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceName })
        });

        const data = await response.json();

        if (data.imageUrl) {
            // Show preview
            previewDiv.innerHTML = `<img src="${data.imageUrl}" style="max-width:100%; max-height:150px; border-radius:8px; object-fit:cover;" />`;

            // Store the URL so saveService can use it
            window._aiGeneratedImageUrl = data.imageUrl;

            imgBtn.innerHTML = '<i class="fa-solid fa-check"></i> Oluşturuldu';
        } else {
            throw new Error(data.error || 'Resim oluşturulamadı');
        }
    } catch (error) {
        console.error('AI Image Error:', error);
        alert('Yapay zeka ile resim oluşturulamadı: ' + error.message);
        imgBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Hata';
    }

    setTimeout(() => {
        imgBtn.innerHTML = originalText;
        imgBtn.disabled = false;
    }, 3000);
}

// Attach Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // AI Button
    const aiBtn = document.getElementById('aiNotesBtn');
    if (aiBtn) {
        aiBtn.addEventListener('click', generateSmartNotes);
    }

    // Make these global for onclick handlers in HTML
    window.openSignatureModal = openSignatureModal;
    window.closeSignatureModal = closeSignatureModal;
    window.saveSignature = saveSignature;
    window.clearSignature = clearSignature;
    window.showNotifications = showNotifications;
    window.generateAIImage = generateAIImage;

    checkPendingProposals();
});

// --- SMART REMINDERS ---
function checkPendingProposals() {
    const proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldPending = proposals.filter(p =>
        (p.status === 'Bekleyen' || !p.status) &&
        new Date(p.date) < sevenDaysAgo
    );

    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (oldPending.length > 0) {
            badge.style.display = 'block';
            badge.setAttribute('data-count', oldPending.length);
        } else {
            badge.style.display = 'none';
        }
    }
}

function showNotifications() {
    const badge = document.getElementById('notificationBadge');
    const count = badge.getAttribute('data-count');

    if (count && count > 0) {
        alert(count + " adet teklifiniz 7 günden uzun süredir 'Bekleyen' durumunda! Lütfen müşterilerinizi arayın.");
    } else {
        alert("Yeni bildiriminiz yok.");
    }
}
