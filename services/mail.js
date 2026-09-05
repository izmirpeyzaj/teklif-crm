const nodemailer = require('nodemailer');

// The sender address is deliberately separate from SMTP_USER: with Resend the
// SMTP username is the literal string "resend", so deriving the From header from
// it would produce an invalid address. MAIL_FROM must be on a domain verified
// with the mail provider, otherwise the provider rejects the message.
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || 'your-email@gmail.com';

// SMTP credentials come from environment variables (.env).
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 465 -> SSL; 587/others -> STARTTLS
    auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
    }
});

/**
 * Returns true only when real SMTP credentials are configured in .env
 * (i.e. not the placeholder defaults). Used to fail fast with a clear message.
 */
function isMailConfigured() {
    // Yerel gelistirme/test icin acik kapi: sahte adreslere gonderilen denemeler
    // saglayicida "bounce" olarak birikir ve gonderen itibarini dusurur.
    if (String(process.env.MAIL_DISABLED).toLowerCase() === 'true') return false;

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    return !!(user && pass && MAIL_FROM
        && user !== 'your-email@gmail.com'
        && pass !== 'your-app-password'
        && MAIL_FROM !== 'your-email@gmail.com');
}

/**
 * Sends a feedback request email to the customer.
 */
async function sendFeedbackEmail(customerEmail, customerName, projectName, total) {
    const mailOptions = {
        from: `"teklif.io" <${MAIL_FROM}>`,
        to: customerEmail,
        subject: `Teklif Onayı Bekleniyor: ${projectName}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Sayın ${customerName},</h2>
                <p><strong>${projectName}</strong> projesi için hazırladığımız <strong>${total}</strong> tutarındaki teklifimizi incelediğiniz için teşekkür ederiz.</p>
                <p>Teklifle ilgili kararınızı aşağıdaki butonlara tıklayarak bize anında iletebilirsiniz:</p>
                <div style="margin: 30px 0;">
                    <a href="#" style="background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Teklifi Kabul Et</a>
                    <a href="#" style="background: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Teklifi Reddet / Revize İste</a>
                </div>
                <p>Herhangi bir sorunuz olursa bu maili yanıtlayabilir veya WhatsApp üzerinden bize ulaşabilirsiniz.</p>
                <br>
                <p>İyi çalışmalar dileriz,<br><strong>teklif.io Ekibi</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

/**
 * Sends a reminder email to the customer.
 */
/**
 * Cevap gelmeyen teklif icin musteriye hatirlatma.
 *
 * Eski surumde iki ciddi sorun vardi:
 *   1. "Kabul Et" / "Reddet" butonlari href="#" idi. Musteri tikliyor, hicbir
 *      sey olmuyordu — hic buton olmamasindan kotu.
 *   2. E-posta "teklif.io Ekibi" diye imzalaniyordu. Gonderen kullanicinin
 *      kendi firmasi olmali; musteri "teklif.io" diye bir firma tanimiyor.
 *
 * Onay baglantisi varsa tek bir butonla oraya yonlendiriyoruz; musteri orada
 * hem teklifi goruyor hem imzalayip karar veriyor. Baglanti yoksa buton da yok.
 */
async function sendReminderEmail(customerEmail, customerName, projectName, total, opts = {}) {
    const { senderName, replyTo, approvalLink, userId } = opts;
    const firma = senderName || process.env.MAIL_FROM_NAME || 'Teklif';
    const tutar = typeof total === 'number'
        ? total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
        : (total || '');

    const proje = projectName ? `<strong>${projectName}</strong> projesi için` : '';
    const buton = approvalLink
        ? `<div style="margin:28px 0;">
             <a href="${approvalLink}" style="background:#16a34a; color:#fff; padding:13px 26px; text-decoration:none; border-radius:7px; display:inline-block; font-weight:600;">Teklifi görüntüle ve onayla</a>
           </div>
           <p style="font-size:.86rem; color:#64748b;">Buton çalışmazsa bu adresi tarayıcınıza yapıştırabilirsiniz:<br>
             <span style="color:#2563eb; word-break:break-all;">${approvalLink}</span></p>`
        : `<p>Kararınızı bu e-postayı yanıtlayarak iletebilirsiniz.</p>`;

    // Hatirlatma da kullanicinin kendi hesabindan gitmeli: musteri, teklifi
    // aldigi adresten devam eden bir yazisma gormeli.
    const kendi = userId ? require('./user-mail').kullaniciTasiyicisi(userId) : null;

    const mailOptions = {
        from: `"${firma}" <${kendi ? kendi.gonderenAdres : MAIL_FROM}>`,
        to: customerEmail,
        replyTo: kendi ? undefined : (replyTo || undefined),
        subject: projectName ? `Hatırlatma: ${projectName} teklifi` : 'Teklifimiz hakkında hatırlatma',
        html: `
            <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; padding:20px; color:#0f172a; max-width:560px;">
                <p>Sayın ${customerName || 'Yetkili'},</p>
                <p>${proje} ilettiğimiz ${tutar ? `<strong>${tutar}</strong> tutarındaki ` : ''}teklifimizle ilgili
                   geri bildiriminizi bekliyoruz.</p>
                ${buton}
                <p>Sorularınız için bu e-postayı yanıtlayabilirsiniz.</p>
                <p style="margin-top:24px;">İyi çalışmalar,<br><strong>${firma}</strong></p>
            </div>
        `
    };

    if (kendi) {
        try {
            return await kendi.tasiyici.sendMail(mailOptions);
        } finally {
            try { kendi.tasiyici.close(); } catch (e) { /* onemsiz */ }
        }
    }
    return transporter.sendMail(mailOptions);
}


/**
 * Sends the proposal to the customer with the generated PDF attached.
 * @param {Object} opts
 * @param {string} opts.to            Customer email
 * @param {string} [opts.customerName]
 * @param {string} [opts.projectName]
 * @param {string} [opts.message]     Optional custom body text from the user
 * @param {Buffer} opts.pdfBuffer     The rendered PDF
 * @param {string} [opts.fileName]    Attachment file name
 * @param {string} [opts.senderName]  Gonderen isletmenin adi (cok kullanicili mod)
 * @param {string} [opts.replyTo]     Musterinin cevabinin gidecegi adres
 */
async function sendProposalEmail({ to, customerName, projectName, message, pdfBuffer, fileName, senderName, replyTo, userId, approvalLink }) {
    const safeMessage = (message && message.trim())
        ? message.trim().replace(/\n/g, '<br>')
        : `${projectName ? '<strong>' + projectName + '</strong> projesi için ' : ''}hazırladığımız teklifimizi ekte PDF olarak iletiyoruz.`;

    // Zarfin gonderen adresi hep bizim dogrulanmis alan adimiz (baskasinin alan
    // adindan gonderemeyiz, SPF/DKIM tutmaz). Ama musterinin gordugu ISIM teklifi
    // hazirlayan isletmenin adi, ve "Yanitla" dedigine onun kendi kutusuna gider —
    // aksi halde tum musteri cevaplari bize dusrdu.
    const displayName = senderName || process.env.MAIL_FROM_NAME || 'Teklif';

    // Kullanici kendi e-posta hesabini tanimladiysa gonderim GERCEKTEN onun
    // adresinden yapilir; musteri tanidigi adresi gorur ve Gmail'deki
    // "via <bizim alan adimiz>" ibaresi cikmaz. Tanimlamadiysa asagidaki
    // platform gonderimi devreye girer.
    const kendi = userId ? require('./user-mail').kullaniciTasiyicisi(userId) : null;
    const gonderenAdres = kendi ? kendi.gonderenAdres : MAIL_FROM;

    const butonHtml = approvalLink ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px 18px; margin: 24px 0; text-align: center;">
            <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
                Teklifi dijital olarak inceleyip doğrudan onaylamak için:
            </p>
            <a href="${approvalLink}" style="background: #16a34a; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 7px; display: inline-block; font-weight: 700; font-size: 15px; box-shadow: 0 2px 6px rgba(22,163,74,0.25);">
                Teklifi Görüntüle ve Onayla
            </a>
            <p style="margin: 14px 0 0 0; font-size: 12px; color: #64748b;">
                Buton çalışmazsa adresi tarayıcınıza yapıştırabilirsiniz:<br>
                <a href="${approvalLink}" style="color: #2563eb; word-break: break-all;">${approvalLink}</a>
            </p>
        </div>` : '';

    const mailOptions = {
        from: `"${displayName}" <${gonderenAdres}>`,
        // Kendi hesabindan giderken Reply-To gereksiz: zarfin adresi zaten onun.
        replyTo: kendi ? undefined : (replyTo || undefined),
        to,
        subject: `Teklifiniz${projectName ? ': ' + projectName : ''}`,
        html: `
            <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Sayın ${customerName || 'Yetkili'},</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #334155;">${safeMessage}</p>
                ${butonHtml}
                <p style="font-size: 14px; line-height: 1.5; color: #64748b;">
                    Teklif detayları ayrıca ekteki PDF belgesinde yer almaktadır. Her türlü sorunuz veya detay için bu e-postayı yanıtlayabilirsiniz.
                </p>
                <p style="margin-top: 24px; font-size: 14px; color: #334155;">
                    İyi çalışmalar dileriz,<br>
                    <strong>${displayName}</strong>
                </p>
            </div>
        `,
        attachments: [
            {
                filename: fileName || 'teklif.pdf',
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };

    if (kendi) {
        try {
            return await kendi.tasiyici.sendMail(mailOptions);
        } finally {
            // Her gonderimde yeni baglanti aciliyor; birakilirsa soketler birikir.
            try { kendi.tasiyici.close(); } catch (e) { /* onemsiz */ }
        }
    }
    return transporter.sendMail(mailOptions);
}

function shell(title, bodyHtml) {
    return `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width:520px; margin:0 auto; padding:28px; color:#1e293b;">
            <h2 style="margin:0 0 18px; color:#1b5e20;">${title}</h2>
            ${bodyHtml}
            <hr style="border:none; border-top:1px solid #e2e8f0; margin:26px 0 14px;">
            <p style="font-size:12px; color:#94a3b8; margin:0;">
                Bu e-postayi siz talep etmediyseniz dikkate almayin, hesabinizda bir degisiklik yapilmaz.
            </p>
        </div>`;
}

/**
 * Sifre sifirlama baglantisi. Baglanti tek kullanimlik ve 1 saat gecerlidir.
 */
async function sendPasswordResetEmail({ to, link }) {
    return transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || 'Teklif'}" <${MAIL_FROM}>`,
        to,
        subject: 'Sifre sifirlama talebiniz',
        html: shell('Sifrenizi sifirlayin', `
            <p>Hesabiniz icin sifre sifirlama talebi aldik. Asagidaki butona tiklayarak yeni sifrenizi belirleyebilirsiniz.</p>
            <p style="margin:24px 0;">
                <a href="${link}" style="background:#2e7d32; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; display:inline-block;">Yeni sifre belirle</a>
            </p>
            <p style="font-size:13px; color:#64748b;">Baglanti <strong>1 saat</strong> gecerlidir ve yalnizca bir kez kullanilabilir.</p>
            <p style="font-size:12px; color:#94a3b8; word-break:break-all;">Buton calismazsa: ${link}</p>
        `)
    });
}

/**
 * E-posta dogrulama baglantisi.
 */
async function sendVerificationEmail({ to, link }) {
    return transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || 'Teklif'}" <${MAIL_FROM}>`,
        to,
        subject: 'E-posta adresinizi dogrulayin',
        html: shell('E-posta adresinizi dogrulayin', `
            <p>Hesabinizi olusturdugunuz icin tesekkurler. Musterilerinize teklif <strong>gonderebilmek</strong> icin bu adresin size ait oldugunu dogrulamamiz gerekiyor.</p>
            <p style="margin:24px 0;">
                <a href="${link}" style="background:#2e7d32; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; display:inline-block;">Adresimi dogrula</a>
            </p>
            <p style="font-size:13px; color:#64748b;">Dogrulamadan da giris yapip teklif hazirlayabilirsiniz; yalnizca e-posta gonderimi kapali kalir.</p>
            <p style="font-size:12px; color:#94a3b8; word-break:break-all;">Buton calismazsa: ${link}</p>
        `)
    });
}

/**
 * Ekip daveti.
 */
async function sendInviteEmail({ to, link, orgName, inviterName }) {
    return transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || 'Teklif'}" <${MAIL_FROM}>`,
        to,
        subject: `${orgName} ekibine davet edildiniz`,
        html: shell('Ekibe davet edildiniz', `
            <p><strong>${inviterName}</strong>, sizi <strong>${orgName}</strong> ekibine davet etti.
            Kabul ettiginizde ekibin teklifleri, musterileri ve panolari ortak calisma alaniniz olur.</p>
            <p style="margin:24px 0;">
                <a href="${link}" style="background:#2e7d32; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; display:inline-block;">Daveti kabul et</a>
            </p>
            <p style="font-size:13px; color:#64748b;">Baglanti <strong>7 gun</strong> gecerlidir ve yalnizca bu adresle kullanilabilir.
            Hesabiniz yoksa once kayit olmaniz istenecek.</p>
            <p style="font-size:12px; color:#94a3b8; word-break:break-all;">Buton calismazsa: ${link}</p>
        `)
    });
}

module.exports = {
    sendFeedbackEmail, sendReminderEmail, sendProposalEmail, isMailConfigured,
    sendPasswordResetEmail, sendVerificationEmail, sendInviteEmail
};

