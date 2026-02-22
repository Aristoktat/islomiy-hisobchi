import { Bot, InlineKeyboard } from "grammy";
import * as dotenv from "dotenv";
import http from "http";
import Database from "better-sqlite3";
import path from "path";

dotenv.config();

// Database sozlamalari
const dbPath = path.join(process.cwd(), "users.db");
const db = new Database(dbPath);

// Jadval yaratish
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        chat_id INTEGER UNIQUE,
        username TEXT,
        first_name TEXT,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// Admin ID (Sizning chat_id ingiz)
const ADMIN_ID = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : 689757167;

// Render uchun dummy server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot is running...");
}).listen(PORT);

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing!");

const bot = new Bot(token);

// Har bir xabarni tekshirib, foydalanuvchini bazaga qo'shish
bot.use(async (ctx, next) => {
    if (ctx.from) {
        const { id, username, first_name } = ctx.from;
        db.prepare(`
            INSERT OR REPLACE INTO users (chat_id, username, first_name, last_seen)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(id, username || null, first_name);
    }
    await next();
});

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

// Admin Panel: Statistika
bot.command("admin", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return;

    const stats = db.prepare("SELECT COUNT(*) as total FROM users").get() as { total: number };
    const recent = db.prepare("SELECT username, first_name FROM users ORDER BY last_seen DESC LIMIT 5").all() as any[];

    let text = `📊 *Bot Statistikasi*\n\n`;
    text += `👥 Jami foydalanuvchilar: \`${stats.total}\`\n\n`;
    text += `🕒 *Oxirgi faol foydalanuvchilar:*\n`;

    recent.forEach(u => {
        text += `- ${u.first_name} (@${u.username || 'yoq'})\n`;
    });

    await ctx.reply(text, { parse_mode: "Markdown" });
});

// Admin Panel: Xabar yuborish
bot.command("broadcast", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return;

    const message = ctx.match;
    if (!message) {
        return await ctx.reply("Foydalanish: `/broadcast Xabar matni`", { parse_mode: "Markdown" });
    }

    const users = db.prepare("SELECT chat_id FROM users").all() as { chat_id: number }[];
    let success = 0;
    let fail = 0;

    await ctx.reply(`📢 Xabar yuborish boshlandi (${users.length} foydalanuvchiga)...`);

    for (const user of users) {
        try {
            await ctx.api.sendMessage(user.chat_id, message);
            success++;
        } catch (e) {
            fail++;
        }
    }

    await ctx.reply(`✅ Tugatildi!\n\n🚀 Muvaffaqiyatli: ${success}\n❌ Xato: ${fail}`);
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
