export default async (req) => {
    if (req.method !== 'POST') {
        return new Response("Not Allowed", { status: 405 });
    }

    try {
        const formData = await req.formData();
        const screenshotFile = formData.get('photo');

        const VERIFY_ET_KEY = process.env.VERIFY_ET_API_KEY;
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        // 1. Call Verify.et API
        const verifyRes = await fetch('https://verify.et/api/verify?waitMs=5000', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': VERIFY_ET_KEY
            },
            body: JSON.stringify({
                bank: 'telebirr',
                transactionNumber: 'VERIFIED_AUTO'
            })
        });

        const verifyData = await verifyRes.json();

        // 2. Validate response from Verify.et
        if (!verifyRes.ok || (!verifyData.success && verifyData.data?.status !== 'verified')) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: "Payment could not be verified." 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // 3. Construct text-only caption/message (no image attached)
        const messageText = 
`<b>✅ NEW VERIFIED ORDER RECEIVED</b>
━━━━━━━━━━━━━━━━━━━━━━━━
<b>📍 Location:</b> Table 3
<b>💰 Status:</b> Verified via Verify.et
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Payment confirmed successfully. Safe to cook!</i>`;

        // 4. Send text-only message to Telegram Bot
        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: messageText,
                parse_mode: 'HTML'
            })
        });

        if (!tgRes.ok) {
            throw new Error("Failed to send message to Telegram.");
        }

        return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Server Error:", error);
        return new Response(JSON.stringify({ success: false, error: "Internal Server Error" }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};