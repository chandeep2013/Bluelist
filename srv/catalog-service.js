const cds = require('@sap/cds');
const nodemailer = require('nodemailer');

// Create Gmail SMTP transporter using .env credentials
require('dotenv').config();
let _mailTransporter = null;
function getMailTransporter() {
    if (!_mailTransporter) {
        _mailTransporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });
        console.log('[Mail] Gmail transporter created for:', process.env.MAIL_USER);
    }
    return _mailTransporter;
}

async function sendRequestCreatedMail(requestData) {
    const transporter = getMailTransporter();
    const mailOptions = {
        from: `"Bluelist App" <${process.env.MAIL_USER}>`,
        to: 'chandeep2013@gmail.com',
        subject: `New Access Request Created - ${requestData.FullName}`,
        html: `
            <h2>New Access Request Created</h2>
            <table style="border-collapse: collapse; width: 100%;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Full Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.FullName || ''}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>NT ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.NTID || ''}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.MailID || ''}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Status</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.Status || ''}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Training Status</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.TrainingStatus || ''}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Access From</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.AccessFromDate || ''}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Access End</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.AccessEndDate || ''}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Approver NT ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.ApproverNTID || ''}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Comments</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestData.Comments || ''}</td></tr>
            </table>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[Mail] Email sent successfully! MessageId:', info.messageId);
    } catch (err) {
        console.error('[Mail] Failed to send email:', err.message);
        console.error('[Mail] Full error:', JSON.stringify(err, null, 2));
    }
}

// ---- RequestorService Handler ----
class RequestorServiceHandler extends cds.ApplicationService {
    async init() {
        const { Requests } = this.entities;

        this.before('CREATE', 'Requests', async (req) => {
            if (!req.data.TrainingStatus) {
                return req.error(400, 'Training Status is mandatory.');
            }
            if (!req.data.Status) {
                req.data.Status = 'Pending Approval';
            }
        });

        this.after('CREATE', 'Requests', async (data, req) => {
            // Send email notification after request is created
            console.log('[Mail] after CREATE triggered, data:', JSON.stringify(data));
            try {
                await sendRequestCreatedMail(data);
            } catch (err) {
                console.error('[Mail] Error in after CREATE handler:', err.message);
            }
        });

        this.before('UPDATE', 'Requests', async (req) => {
            const { RequestID } = req.data;
            if (RequestID) {
                const existing = await SELECT.one.from(Requests).where({ RequestID });
                if (!existing) return req.error(404, `Request ${RequestID} not found`);
                if (existing.Status === 'Approved') {
                    return req.error(400, 'Approved requests cannot be edited.');
                }
            }
        });

        this.before('DELETE', 'Requests', async (req) => {
            const RequestID = req.data.RequestID;
            if (RequestID) {
                const existing = await SELECT.one.from(Requests).where({ RequestID });
                if (!existing) return req.error(404, `Request ${RequestID} not found`);
                if (existing.Status === 'Approved') {
                    return req.error(400, 'Approved requests cannot be deleted.');
                }
            }
        });

        this.on('submit', 'Requests', async (req) => {
            const { RequestID } = req.params[0];
            const request = await SELECT.one.from(Requests).where({ RequestID });
            if (!request) return req.error(404, `Request ${RequestID} not found`);
            if (request.Status !== 'Draft') {
                return req.error(400, `Only draft requests can be submitted. Current status: ${request.Status}`);
            }
            await UPDATE(Requests)
                .set({ Status: 'Pending Approval' })
                .where({ RequestID });
            req.info('Request submitted successfully.');
            return SELECT.one.from(Requests).where({ RequestID });
        });

        await super.init();
    }
}

// ---- ApproverService Handler ----
class ApproverServiceHandler extends cds.ApplicationService {
    async init() {
        const { Requests } = this.entities;

        this.on('approve', 'Requests', async (req) => {
            const { RequestID } = req.params[0];
            const request = await SELECT.one.from(Requests).where({ RequestID });
            if (!request) return req.error(404, `Request ${RequestID} not found`);
            if (request.Status !== 'Pending Approval') {
                return req.error(400, `Only requests with status 'Pending Approval' can be approved. Current status: ${request.Status}`);
            }
            await UPDATE(Requests)
                .set({ Status: 'Approved' })
                .where({ RequestID });
            req.info('Request approved.');
            return SELECT.one.from(Requests).where({ RequestID });
        });

        this.on('rejectRequest', 'Requests', async (req) => {
            const { RequestID } = req.params[0];
            const request = await SELECT.one.from(Requests).where({ RequestID });
            if (!request) return req.error(404, `Request ${RequestID} not found`);
            if (request.Status !== 'Pending Approval') {
                return req.error(400, `Only requests with status 'Pending Approval' can be rejected. Current status: ${request.Status}`);
            }
            await UPDATE(Requests)
                .set({ Status: 'Rejected' })
                .where({ RequestID });
            req.info('Request rejected.');
            return SELECT.one.from(Requests).where({ RequestID });
        });

        await super.init();
    }
}

module.exports = { RequestorService: RequestorServiceHandler, ApproverService: ApproverServiceHandler };
