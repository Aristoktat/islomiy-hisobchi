import logging
import asyncio
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import aiohttp
from aiohttp import web

# Bot sozlamalari
TOKEN = os.environ.get("BOT_TOKEN", "8509459353:AAGxF8XmeE_eBeFK10qSQYIsYYYyndLpaU0")
raw_url = os.environ.get("WEBAPP_URL", "https://islomiy-hisobchi-web.onrender.com")

# URLning https ekanligini ta'minlash
if raw_url.startswith("http"):
    WEBAPP_URL = raw_url
else:
    WEBAPP_URL = f"https://{raw_url}"

# Loggingni sozlash
logging.basicConfig(level=logging.INFO)

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
            logging.error(f"Kurs olishda xato: {e}")
            return None

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
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


async def handle(request):
    return web.Response(text="Bot is running")

async def start_health_check():
    app = web.Application()
    app.router.add_get('/', handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', int(os.environ.get('PORT', 8080)))
    await site.start()

async def main():
    logging.info("Bot ishga tushmoqda...")
    # Avvalgi webhooklarni o'chirish (Conflict xatosini oldini olish uchun)
    await bot.delete_webhook(drop_pending_updates=True)
    # Health check serverni ishga tushirish
    await start_health_check()
    # Pollingni boshlash va kutib qolgan xabarlarni o'chirib yuborish
    await dp.start_polling(bot, skip_updates=True)

if __name__ == "__main__":
    asyncio.run(main())
