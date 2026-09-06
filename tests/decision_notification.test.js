// Teklif onay/ret durumunda teklif sahibine bildirim e-postasi gonderimi testi.
process.env.MAIL_DISABLED = 'true';
const assert = require('assert');
const { sendDecisionNotificationEmail } = require('../services/mail');

async function runTest() {
    // 1. Onay bildirim testi
    const resOnay = await sendDecisionNotificationEmail({
        to: 'sahip@firma.com',
        customerName: 'Ahmet Bey',
        projectName: 'Bahçe Peyzajı',
        proposalCode: 'TK-2026-001',
        total: 25000,
        decision: 'accepted',
        decisionNote: 'Teklifinizi onaylıyoruz, haftaya başlayabiliriz.',
        signerName: 'Ahmet Yılmaz'
    });

    assert(resOnay, 'sendDecisionNotificationEmail should return mail result');
    assert(resOnay.html.includes('🎉 Teklifiniz Onaylandı!'), 'Should contain accepted title');
    assert(resOnay.html.includes('Ahmet Yılmaz'), 'Should contain signer name');
    assert(resOnay.html.includes('25.000,00 ₺') || resOnay.html.includes('25'), 'Should contain total price');
    assert(resOnay.subject.includes('🎉 Teklif Onaylandı'), 'Should have acceptance subject');

    // 2. Ret bildirim testi
    const resRet = await sendDecisionNotificationEmail({
        to: 'sahip@firma.com',
        customerName: 'Mehmet Bey',
        projectName: 'Çim Alanı',
        proposalCode: 'TK-2026-002',
        total: 10000,
        decision: 'rejected',
        decisionNote: 'Bütçemizi aşıyor.',
        signerName: 'Mehmet Kaya'
    });

    assert(resRet, 'sendDecisionNotificationEmail should return mail result for rejection');
    assert(resRet.html.includes('Müşteri Teklifi Reddetti'), 'Should contain rejection notice');
    assert(resRet.html.includes('Bütçemizi aşıyor.'), 'Should contain rejection note');
    assert(resRet.subject.includes('Teklif Reddedildi'), 'Should have rejection subject');

    console.log('Karar Bildirim E-postasi Testi: GECTI');
}

runTest().catch(err => {
    console.error('Test hatasi:', err);
    process.exit(1);
});
