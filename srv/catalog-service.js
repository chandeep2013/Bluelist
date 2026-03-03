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

const DEFAULT_APPROVER_EMAIL = 'Chamdeep.Mudigolam@in.bosch.com';

function _buildRequestDetailHtml(requestData) {
    return `
        <table width="100%" cellpadding="0" cellspacing="0" 
               style="border-collapse:collapse; font-family:Arial, Helvetica, sans-serif; font-size:14px; background:#ffffff;">

            <!-- BOSCH HEADER -->
<tr>
    <td colspan="2" style="padding:20px 20px 10px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <!-- Left: Bosch Logo -->
                <td align="left" valign="middle">
                    <img src="https://i.ibb.co/your-real-image.png" 
                         alt="Bosch" 
                         style="height:40px; display:block;">
                </td>

                <!-- Right: Request Info -->
                <td align="right" valign="middle" 
                    style="font-size:14px; line-height:20px;">
                    <strong>Request No:</strong> ${requestData.RequestNo || ''}<br>
                    ${requestData.NTID || ''}
                </td>
            </tr>
        </table>
    </td>
</tr>

<!-- COLOR STRIP -->
<tr>
    <td colspan="2">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td width="14%" bgcolor="#8b1c2d" height="6">&nbsp;</td>
                <td width="14%" bgcolor="#e31c24" height="6">&nbsp;</td>
                <td width="14%" bgcolor="#5e3c99" height="6">&nbsp;</td>
                <td width="14%" bgcolor="#2c5aa0" height="6">&nbsp;</td>
                <td width="14%" bgcolor="#1f77b4" height="6">&nbsp;</td>
                <td width="14%" bgcolor="#17becf" height="6">&nbsp;</td>
                <td width="16%" bgcolor="#2ca02c" height="6">&nbsp;</td>
            </tr>
        </table>
    </td>
</tr>

            <!-- SPACE -->
            <tr>
                <td colspan="2" style="height:20px;"></td>
            </tr>

            <!-- SECTION HEADER -->
            <tr>
                <td colspan="2" style="background:#d9d9d9; padding:8px 12px; font-weight:bold;">
                    Request Details
                </td>
            </tr>

            ${_row("Full Name", requestData.FullName)}
            ${_row("NT ID", requestData.NTID)}
            ${_row("Email", requestData.MailID)}
            ${_row("Status", requestData.Status)}
            ${_row("Training Status", requestData.TrainingStatus)}
            ${_row("Access From", requestData.AccessFromDate)}
            ${_row("Access End", requestData.AccessEndDate)}
            ${_row("Approver NT ID", requestData.ApproverNTID)}
            ${_row("Comments", requestData.Comments)}

        </table>
    `;
}

function _row(label, value) {
    return `
        <tr>
            <td style="padding:10px 12px; width:35%; font-weight:bold; border-bottom:1px solid #e5e5e5;">
                ${label}
            </td>
            <td style="padding:10px 12px; border-bottom:1px solid #e5e5e5;">
                ${value || ''}
            </td>
        </tr>
    `;
}

async function sendRequestCreatedMail(requestData) {
    const transporter = getMailTransporter();
    const detailsHtml = _buildRequestDetailHtml(requestData);
    const requestorEmail = requestData.MailID;
    const approverEmail = DEFAULT_APPROVER_EMAIL;

    // --- Send mail to Approver ---
    const approverMailOptions = {
        from: `"Bluelist App" <${process.env.MAIL_USER}>`,
        to: approverEmail,
        subject: `New Access Request Pending Approval - ${requestData.FullName}`,
        html: `
            <h2>New Access Request Pending Your Approval</h2>
            <p>A new access request has been submitted by <strong>${requestData.FullName}</strong> and requires your approval.</p>
            ${detailsHtml}
            <br/>
            <p>Please review and take action on this request.</p>
        `
    };

    // --- Send mail to Requestor ---
    const requestorMailOptions = {
        from: `"Bluelist App" <${process.env.MAIL_USER}>`,
        to: requestorEmail,
        subject: `Your Access Request Has Been Submitted - ${requestData.FullName}`,
        html: `
            <h2>Access Request Submitted Successfully</h2>
            <p>Hi <strong>${requestData.FullName}</strong>,</p>
            <p>Your access request has been submitted successfully and is pending approval. Below are the details of your request:</p>
            ${detailsHtml}
            <br/>
            <p>You will be notified once the approver takes action on your request.</p>
        `
    };

    // Send both emails
    try {
        const approverInfo = await transporter.sendMail(approverMailOptions);
        console.log('[Mail] Approver email sent successfully! MessageId:', approverInfo.messageId);
    } catch (err) {
        console.error('[Mail] Failed to send approver email:', err.message);
    }

    if (requestorEmail) {
        try {
            const requestorInfo = await transporter.sendMail(requestorMailOptions);
            console.log('[Mail] Requestor email sent successfully! MessageId:', requestorInfo.messageId);
        } catch (err) {
            console.error('[Mail] Failed to send requestor email:', err.message);
        }
    } else {
        console.warn('[Mail] No requestor email (MailID) provided, skipping requestor notification.');
    }
}

async function sendApproverActionMail(requestData, action) {
    const requestorEmail = requestData.MailID;
    if (!requestorEmail) {
        console.warn('[Mail] No requestor email (MailID) found, skipping approver action notification.');
        return;
    }

    const transporter = getMailTransporter();
    const detailsHtml = _buildRequestDetailHtml(requestData);

    const actionLabels = {
        'Approved': { verb: 'Approved', color: '#28a745', icon: '✅' },
        'Rejected': { verb: 'Rejected', color: '#dc3545', icon: '❌' },
        'Sent Back': { verb: 'Sent Back', color: '#ffc107', icon: '🔄' },
        'Revoked': { verb: 'Revoked', color: '#dc3545', icon: '🚫' }
    };
    const label = actionLabels[action] || { verb: action, color: '#6c757d', icon: 'ℹ️' };

    const mailOptions = {
        from: `"Bluelist App" <${process.env.MAIL_USER}>`,
        to: requestorEmail,
        subject: `Your Access Request Has Been ${label.verb} - ${requestData.FullName}`,
        html: `
            <h2>${label.icon} Access Request ${label.verb}</h2>
            <p>Hi <strong>${requestData.FullName}</strong>,</p>
            <p>Your access request has been <span style="color: ${label.color}; font-weight: bold;">${label.verb}</span> by the approver.</p>
            ${detailsHtml}
            <br/>
            ${action === 'Sent Back' ? '<p>Please review and resubmit your request with the necessary changes.</p>' : ''}
            ${action === 'Approved' ? '<p>You now have access as per the request details above.</p>' : ''}
            ${action === 'Rejected' ? '<p>If you have questions, please contact the approver.</p>' : ''}
            ${action === 'Revoked' ? '<p>Your previously approved access has been revoked. If you believe this is an error, please contact the approver.</p>' : ''}
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Mail] Approver action (${action}) email sent to requestor! MessageId:`, info.messageId);
    } catch (err) {
        console.error(`[Mail] Failed to send approver action (${action}) email:`, err.message);
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
            // Auto-generate unique RequestNo in YYYYTTSS format (year + time seconds)
            const now = new Date();
            const pad = (n, len = 2) => String(n).padStart(len, '0');
            req.data.RequestNo = pad(now.getFullYear(), 4)
                + pad(now.getHours())
                + pad(now.getMinutes())
                + pad(now.getSeconds());
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

        // Send email to requestor whenever Status is changed via UPDATE (from approver screen)
        this.after('UPDATE', 'Requests', async (data, req) => {
            const newStatus = data.Status;
            if (newStatus && ['Approved', 'Rejected', 'Sent Back', 'Revoked'].includes(newStatus)) {
                const request = await SELECT.one.from(Requests).where({ RequestID: data.RequestID });
                if (request) {
                    try {
                        await sendApproverActionMail(request, newStatus);
                    } catch (e) {
                        console.error('[Mail] Error sending approver action mail after UPDATE:', e.message);
                    }
                }
            }
        });

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
            const approvedRequest = await SELECT.one.from(Requests).where({ RequestID });
            try { await sendApproverActionMail(approvedRequest, 'Approved'); } catch (e) { console.error('[Mail] Error:', e.message); }
            return approvedRequest;
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
            const rejectedRequest = await SELECT.one.from(Requests).where({ RequestID });
            try { await sendApproverActionMail(rejectedRequest, 'Rejected'); } catch (e) { console.error('[Mail] Error:', e.message); }
            return rejectedRequest;
        });

        this.on('sendBack', 'Requests', async (req) => {
            const { RequestID } = req.params[0];
            const request = await SELECT.one.from(Requests).where({ RequestID });
            if (!request) return req.error(404, `Request ${RequestID} not found`);
            if (request.Status !== 'Pending Approval') {
                return req.error(400, `Only requests with status 'Pending Approval' can be sent back. Current status: ${request.Status}`);
            }
            await UPDATE(Requests)
                .set({ Status: 'Sent Back' })
                .where({ RequestID });
            req.info('Request sent back to requestor.');
            const sentBackRequest = await SELECT.one.from(Requests).where({ RequestID });
            try { await sendApproverActionMail(sentBackRequest, 'Sent Back'); } catch (e) { console.error('[Mail] Error:', e.message); }
            return sentBackRequest;
        });

        await super.init();
    }
}

module.exports = { RequestorService: RequestorServiceHandler, ApproverService: ApproverServiceHandler };
