const nodemailer = require('nodemailer');

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
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    return !!(user && pass && user !== 'your-email@gmail.com' && pass !== 'your-app-password');
}

/**
 * Sends a feedback request email to the customer.
 */
async function sendFeedbackEmail(customerEmail, customerName, projectName, total) {
    const mailOptions = {
        from: `"teklif.io" <${process.env.SMTP_USER || 'your-email@gmail.com'}>`,
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
async function sendReminderEmail(customerEmail, customerName, projectName, total) {
    const mailOptions = {
        from: `"teklif.io Hatırlatma" <${process.env.SMTP_USER || 'your-email@gmail.com'}>`,
        to: customerEmail,
        subject: `Hatırlatma: Teklif Onayı Bekleniyor - ${projectName}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Sayın ${customerName},</h2>
                <p><strong>${projectName}</strong> projesi için iletmiş olduğumuz <strong>${total}</strong> tutarındaki teklifimizle ilgili geri bildiriminizi beklemekteyiz.</p>
                <p>Proje takvimini planlayabilmemiz adına kararnızı bize iletmenizi rica ederiz:</p>
                <div style="margin: 30px 0;">
                    <a href="#" style="background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Teklifi Kabul Et</a>
                    <a href="#" style="background: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Teklifi Reddet / Revize İste</a>
                </div>
                <p>Herhangi bir sorunuz varsa çekinmeden bize ulaşabilirsiniz.</p>
                <br>
                <p>İyi çalışmalar dileriz,<br><strong>teklif.io Ekibi</strong></p>
            </div>
        `
    };

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
 */
async function sendProposalEmail({ to, customerName, projectName, message, pdfBuffer, fileName }) {
    const safeMessage = (message && message.trim())
        ? message.trim().replace(/\n/g, '<br>')
        : `${projectName ? '<strong>' + projectName + '</strong> projesi için ' : ''}hazırladığımız teklifimizi ekte PDF olarak iletiyoruz.`;

    const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME || 'Teklif'}" <${process.env.SMTP_USER}>`,
        to,
        subject: `Teklifiniz${projectName ? ': ' + projectName : ''}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Sayın ${customerName || 'Yetkili'},</h2>
                <p>${safeMessage}</p>
                <p>İncelemeniz ve değerlendirmeniz için teşekkür ederiz. Her türlü sorunuz için bu e-postayı yanıtlayabilirsiniz.</p>
                <br>
                <p>İyi çalışmalar dileriz.</p>
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

    return transporter.sendMail(mailOptions);
}

module.exports = { sendFeedbackEmail, sendReminderEmail, sendProposalEmail, isMailConfigured };

