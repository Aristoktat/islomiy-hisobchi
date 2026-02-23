import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { NextRequest } from "next/server";

const token = process.env.BOT_TOKEN || "";
if (!token && process.env.NODE_ENV === "production") {
    console.warn("DIQQAT: BOT_TOKEN topilmadi. Bot ishlamasligi mumkin.");
}

const bot = new Bot(token || "DUMMY_TOKEN");
const webAppUrl = process.env.WEBAPP_URL || "https://islomiy-hisobchi-web.onrender.com";

// Markaziy Bank kurslarini olish
const getRates = async () => {
    try {
        const res = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/', { next: { revalidate: 3600 } });
        const data: any = await res.json();
        const usd = data.find((c: any) => c.Ccy === 'USD');
        const rate = parseFloat(usd.Rate);
        const gold = Math.floor(68 * rate);
        return { rate, gold };
    } catch (e) {
        return null;
    }
};

const formatMoney = (amount: bigint) => {
    return amount.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
};

bot.command("start", async (ctx) => {
    const rates = await getRates();
    const kursInfo = rates ? `\n\n🏦 *Bugungi kurs:* 1$ = ${rates.rate.toLocaleString()} so'm\n🟡 *Oltin (1g):* ~${rates.gold.toLocaleString()} so'm\n` : "";

    const keyboard = new InlineKeyboard()
        .webApp("🧾 Meros (Faroiz)", `${webAppUrl}/inheritance`).row()
        .webApp("💰 Zakot", `${webAppUrl}/zakat`).row()
        .webApp("📜 Vasiyat", `${webAppUrl}/will`);

    await ctx.reply(
        `Assalomu alaykum! *Islomiy Hisobchi* botiga xush kelibsiz.${kursInfo}\n` +
        "Ushbu ilova yordamida meros, zakot va vasiyatni Hanafiy mazhabi qoidalari asosida hisoblashingiz mumkin.\n\n" +
        "👇 Bo'limni tanlang:",
        { parse_mode: "Markdown", reply_markup: keyboard }
    );
});

bot.command("kurs", async (ctx) => {
    const rates = await getRates();
    if (rates) {
        await ctx.reply(
            `🏦 *Markaziy Bank kursi:*\n1 USD = ${rates.rate.toLocaleString()} so'm\n\n` +
            `🟡 *Oltin narxi (gramm):*\n1g ≈ ${rates.gold.toLocaleString()} so'm\n` +
            `_(Xalqaro birja narxi asosida taxminiy)_`,
            { parse_mode: "Markdown" }
        );
    } else {
        await ctx.reply("Kurs ma'lumotlarini olishda xato yuz berdi.");
    }
});

// WebApp ma'lumotlarini qayta ishlash
bot.on("message:web_app_data", async (ctx) => {
    try {
        const data = JSON.parse(ctx.message.web_app_data.data);
        if (data.type === 'inheritance') {
            let text = `📑 *Meros Taqsimoti Natijasi*\n\n`;
            text += `💰 Sof meros: \`${formatMoney(BigInt(data.netEstate))}\`\n\n`;
            data.heirs.forEach((h: any) => {
                text += `👤 *${h.type}*:\n   - Ulush: ${h.shareFraction.n}/${h.shareFraction.d} (${h.sharePercent}%)\n   - Miqdor: \`${formatMoney(BigInt(h.shareAmount))}\`\n\n`;
            });
            await ctx.reply(text, { parse_mode: "Markdown" });
        } else if (data.type === 'zakat') {
            let text = `💰 *Zakot Hisobi Natijasi*\n\n`;
            text += `${data.nisabMet ? '✅ *Zakot farz*' : '❌ *Nisob yetmadi*'}\n`;
            text += `📏 Nisob: \`${formatMoney(BigInt(data.nisabValue))}\`\n`;
            text += `💵 Jami: \`${formatMoney(BigInt(data.zakatableAmount))}\`\n\n`;
            if (data.nisabMet) text += `✨ *Zakot miqdori:* \`${formatMoney(BigInt(data.zakatDue))}\``;
            await ctx.reply(text, { parse_mode: "Markdown" });
        }
    } catch (e) {
        await ctx.reply("Xatolik yuz berdi.");
    }
});

// Webhookni sozlash (Brauzerda /api/bot manziliga bir marta kiriladi)
export async function GET(req: Request) {
    const url = new URL(req.url);
    const webhookUrl = `${url.protocol}//${url.host}/api/bot`;
    try {
        await bot.api.setWebhook(webhookUrl);
        return new Response(`Webhook set to ${webhookUrl}`, { status: 200 });
    } catch (e: any) {
        return new Response(`Error: ${e.message}`, { status: 500 });
    }
}

// Webhook handler
export const POST = webhookCallback(bot, "std/http");
