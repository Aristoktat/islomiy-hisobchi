import { Bot, InlineKeyboard } from "grammy";
import * as dotenv from "dotenv";
import http from "http";

dotenv.config();

// Render uchun dummy server (health check uchun)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot is running...");
}).listen(PORT);

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing!");

const bot = new Bot(token);
const webAppUrl = process.env.WEBAPP_URL || "https://your-webapp.vercel.app";

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    console.error(err.error);
});

const getRates = async () => {
    console.log("Kurslarni olishga urinish...");
    try {
        const res = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data: any = await res.json();
        const usd = data.find((c: any) => c.Ccy === 'USD');
        const rate = parseFloat(usd.Rate);
        const gold = Math.floor(68 * rate); // 1g oltin ~ $68
        console.log(`Kurslar olindi: USD=${rate}, Gold=${gold}`);
        return { rate, gold };
    } catch (e) {
        console.error("Kursni olishda xato:", e);
        return null;
    }
};

bot.command("start", async (ctx) => {
    console.log(`Start buyrug'i keldi: ${ctx.from?.username || ctx.from?.id}`);
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
    console.log("Start javobi yuborildi.");
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

const formatMoney = (amount: bigint) => {
    return amount.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
};

// WebApp yuborgan natijani qabul qilish
bot.on("message:web_app_data", async (ctx) => {
    try {
        const data = JSON.parse(ctx.message.web_app_data.data);

        if (data.type === 'inheritance') {
            let text = `📑 *Meros Taqsimoti Natijasi*\n\n`;
            text += `💰 Sof meros: \`${formatMoney(BigInt(data.netEstate))}\`\n\n`;

            data.heirs.forEach((h: any) => {
                text += `👤 *${h.type}* (${h.count} kishi):\n`;
                text += `   - Ulush: ${h.shareFraction.n}/${h.shareFraction.d} (${h.sharePercent}%)\n`;
                text += `   - Miqdor: \`${formatMoney(BigInt(h.shareAmount))}\`\n`;
                text += `   - Sabab: ${h.reason}\n\n`;
            });

            if (data.warnings.length > 0) {
                text += `⚠️ *Ogohlantirishlar:*\n${data.warnings.join('\n')}`;
            }

            await ctx.reply(text, { parse_mode: "Markdown" });
        } else if (data.type === 'zakat') {
            let text = `💰 *Zakot Hisobi Natijasi*\n\n`;
            text += `${data.nisabMet ? '✅ *Zakot farz*' : '❌ *Nisob yetmadi*'}\n`;
            text += `📏 Nisob miqdori: \`${formatMoney(BigInt(data.nisabValue))}\`\n`;
            text += `💵 Jami boylik: \`${formatMoney(BigInt(data.zakatableAmount))}\`\n\n`;

            if (data.nisabMet) {
                text += `✨ *To'lanadigan zakot:* \`${formatMoney(BigInt(data.zakatDue))}\``;
            }

            await ctx.reply(text, { parse_mode: "Markdown" });
        } else if (data.type === 'will') {
            let text = `✍️ *Vasiyat Hisobi Natijasi*\n\n`;
            text += `💰 Tarika (sof meros): \`${formatMoney(BigInt(data.tarika))}\n`;
            text += `⚖️ Maksimal vasiyat (1/3): \`${formatMoney(BigInt(data.maxWill))}\`\n`;
            text += `📜 Qo'llanilgan vasiyat: \`${formatMoney(BigInt(data.appliedWill))}\`\n`;
            text += `✨ *Merosxo'rlar uchun qolgan:* \`${formatMoney(BigInt(data.netEstate))}\`\n`;

            if (data.isCapped) {
                text += `\n⚠️ *Eslatma:* So'ralgan vasiyat 1/3 dan oshgani uchun islom qoidasiga ko'ra cheklandi.`;
            }

            await ctx.reply(text, { parse_mode: "Markdown" });
        }
    } catch (e) {
        await ctx.reply("Ma'lumotlarni qayta ishlashda xato yuz berdi.");
    }
});

bot.start();
console.log("Bot ishga tushdi...");
