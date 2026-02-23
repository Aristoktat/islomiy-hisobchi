import logging
import asyncio
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import aiohttp
from aiohttp import web

# Bot sozlamalari (Yangi yangilangan token)
TOKEN = "8509459353:AAF59X3xxYvSclQJpXbTSKfuqSiZMlLDPhE"
raw_url = os.environ.get("WEBAPP_URL", "https://islomiy-hisobchi-web.onrender.com")

# URLning https ekanligini ta'minlash
if raw_url.startswith("http"):
    WEBAPP_URL = raw_url
else:
    WEBAPP_URL = f"https://{raw_url}"

# Loggingni sozlash
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

bot = Bot(token=TOKEN)
dp = Dispatcher()

async def get_rates():
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get('https://cbu.uz/uz/arkhiv-kursov-valyut/json/') as response:
                if response.status == 200:
                    data = await response.json()
                    usd = next((c for c in data if c['Ccy'] == 'USD'), None)
                    if usd:
                        rate = float(usd['Rate'])
                        gold = int(68 * rate)
                        return {"rate": rate, "gold": gold}
        except Exception as e:
            logger.error(f"Kurs olishda xato: {e}")
            return None

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    logger.info(f"/start buyrug'i keldi: {message.from_user.id}")
    rates = await get_rates()
    kurs_info = ""
    if rates:
        kurs_info = f"\n\n🏦 *Bugungi kurs:* 1$ = {rates['rate']:,} so'm\n🟡 *Oltin (1g):* ~{rates['gold']:,} so'm\n"
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🧾 Meros (Faroiz)", web_app=WebAppInfo(url=f"{WEBAPP_URL}/inheritance"))],
        [InlineKeyboardButton(text="💰 Zakot", web_app=WebAppInfo(url=f"{WEBAPP_URL}/zakat"))],
        [InlineKeyboardButton(text="📜 Vasiyat", web_app=WebAppInfo(url=f"{WEBAPP_URL}/will"))]
    ])

    await message.answer(
        f"Assalomu alaykum! *Islomiy Hisobchi* botiga xush kelibsiz.{kurs_info}\n"
        "Ushbu ilova yordamida meros, zakot va vasiyatni Hanafiy mazhabi qoidalari asosida hisoblashingiz mumkin.\n\n"
        "👇 Bo'limni tanlang:",
        parse_mode="Markdown",
        reply_markup=keyboard
    )

@dp.message(Command("kurs"))
async def cmd_kurs(message: types.Message):
    rates = await get_rates()
    if rates:
        await message.answer(
            f"🏦 *Markaziy Bank kursi:*\n1 USD = {rates['rate']:,} so'm\n\n"
            f"🟡 *Oltin narxi (gramm):*\n1g ≈ {rates['gold']:,} so'm\n"
            "_(Xalqaro birja narxi asosida taxminiy)_",
            parse_mode="Markdown"
        )
    else:
        await message.answer("Kurs ma'lumotlarini olishda xato yuz berdi.")

@dp.message(lambda message: not message.text.startswith('/'))
async def echo_all(message: types.Message):
    logger.info(f"Xabar keldi: {message.text}")
    await message.answer("Xabar qabul qilindi! Kalkulyatorlarni ko'rish uchun /start buyrug'ini bosing.")

async def handle(request):
    logger.info("Health check so'rovi keldi.")
    return web.Response(text="Bot is running")

async def start_health_check():
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Health check server {port}-portda ishga tushmoqda...")
    app = web.Application()
    app.router.add_get('/', handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()

async def main():
    logger.info("--- BOT ISHGA TUSHISHNI BOSHLADI ---")
    try:
        me = await bot.get_me()
        logger.info(f"Bot ma'lumotlari: @{me.username} (ID: {me.id})")
        
        # Webhookni o'chirish
        logger.info("Webhook o'chirilmoqda...")
        await bot.delete_webhook(drop_pending_updates=True)
        
        # Health check
        await start_health_check()
        
        # Polling
        logger.info("Polling boshlanmoqda...")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"BOT ISHGA TUSHISHDA XATO: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())
