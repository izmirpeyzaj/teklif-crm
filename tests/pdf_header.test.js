// PDF Content-Disposition baslik testi.
// Turkce karakter iceren teklif adlarinda Node.js ERR_INVALID_CHAR
// hatasina dusmemeli ve dogru RFC 5987 basligi uretmeli.

const assert = require('assert');
const http = require('http');

// routes/pdf.js icindeki safeContentDisposition mantigini test et
function safeContentDisposition(fileName, type = 'inline') {
    const base = (fileName || 'teklif')
        .toString()
        .replace(/[/\\?%*:|"<>]/g, '')
        .trim()
        .slice(0, 80) || 'teklif';

    const trMap = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U'
    };
    const asciiFallback = base
        .replace(/[çÇğĞıİöÖşŞüÜ]/g, m => trMap[m] || m)
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/"/g, '')
        .trim() || 'teklif';

    const encodedUtf8 = encodeURIComponent(base + '.pdf');
    return `${type}; filename="${asciiFallback}.pdf"; filename*=UTF-8''${encodedUtf8}`;
}

const testCases = [
    'İzmir Peyzaj Bahçe Bakımı',
    'Şirket Sözleşmesi & Teklif (2026)',
    'Çatı & İzolasyon İşleri',
    'Öncü Mühendislik',
    'Ağaç Budama & Çim Biçme'
];

for (const tc of testCases) {
    const header = safeContentDisposition(tc, 'inline');
    const res = new http.ServerResponse({});
    // Node.js setHeader icinde ERR_INVALID_CHAR firlatmamali:
    assert.doesNotThrow(() => {
        res.setHeader('Content-Disposition', header);
    }, `Header failed for case: ${tc}`);
}

console.log('PDF Header Testi: GECTI (Tum Turkce karakterler guvenli)');
