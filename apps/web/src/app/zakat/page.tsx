"use client";
import { useState, useEffect } from 'react';
import { ZakatEngine, ZakatInput } from 'engine';

declare global { interface Window { Telegram: any; } }

export default function ZakatPage() {
    const [form, setForm] = useState({ cash: '', goldGrams: '', silverGrams: '', tradeGoods: '', receivables: '', debts: '', nisabByGold: true });
    const [result, setResult] = useState<any>(null);
    const [loadingRates, setLoadingRates] = useState(false);
    const [usdRate, setUsdRate] = useState<number>(12500); // Default boshlang'ich qiymat

    useEffect(() => {
        window.Telegram?.WebApp?.ready();
        fetchRates();
    }, []);

    const fetchRates = async () => {
        setLoadingRates(true);
        try {
            const res = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
            const data = await res.json();
            const usd = data.find((c: any) => c.Ccy === 'USD');
            if (usd) setUsdRate(parseFloat(usd.Rate));
        } catch (e) {
            console.error("Kursni olishda xato:", e);
        } finally {
            setLoadingRates(false);
        }
    };

    const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const formatMoney = (amount: bigint) => {
        return amount.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
    };

    const handleCalc = () => {
        const engine = new ZakatEngine();
        // Oltin grammi dunyo bozorida ~$65-70 (dollarda)
        const GOLD_G_USD = 68;
        const SILVER_G_USD = 0.85;

        const calculatedGoldPrice = BigInt(Math.floor(GOLD_G_USD * usdRate));
        const calculatedSilverPrice = BigInt(Math.floor(SILVER_G_USD * usdRate));

        const input: ZakatInput = {
            cash: BigInt(form.cash || '0'),
            goldGrams: parseFloat(form.goldGrams || '0'),
            silverGrams: parseFloat(form.silverGrams || '0'),
            tradeGoods: BigInt(form.tradeGoods || '0'),
            receivables: BigInt(form.receivables || '0'),
            debts: BigInt(form.debts || '0'),
            goldPricePerGram: calculatedGoldPrice,
            silverPricePerGram: calculatedSilverPrice,
            nisabByGold: form.nisabByGold,
        };
        const res = engine.calculate(input);
        setResult(res);
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-center text-[var(--tg-theme-text-color)]">💰 Zakot Kalkulyatori</h1>

            <div className="mb-4 text-center">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">
                    <span>🏦 MB dollari kursi: <b>{usdRate.toLocaleString()} so'm</b></span>
                    {loadingRates && <span className="animate-pulse">●</span>}
                </div>
            </div>

            <div className="bg-[var(--tg-theme-secondary-bg-color)] p-5 rounded-2xl shadow-sm space-y-4">
                {[
                    ['Naqd pul (so\'mda)', 'cash'],
                    ['Oltin (gramm)', 'goldGrams'],
                    ['Kumush (gramm)', 'silverGrams'],
                    ['Savdo mollari (so\'mda)', 'tradeGoods'],
                    ['Qarzlar (olinishi kerak)', 'receivables'],
                    ['Majburiyatlar (to\'lanishi kerak)', 'debts']
                ].map(([label, key]) => (
                    <div key={key}>
                        <label className="text-sm opacity-70 mb-1 block">{label}</label>
                        <input type="number" className="input-field" value={(form as any)[key]} onChange={e => update(key, e.target.value)} />
                    </div>
                ))}

                <div className="flex gap-2 pt-2">
                    <button onClick={() => update('nisabByGold', true)} className={`flex-1 p-3 rounded-xl border text-sm transition-all ${form.nisabByGold ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-gray-200 opacity-60'}`}>Oltin nisobi</button>
                    <button onClick={() => update('nisabByGold', false)} className={`flex-1 p-3 rounded-xl border text-sm transition-all ${!form.nisabByGold ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-gray-200 opacity-60'}`}>Kumush nisobi</button>
                </div>

                <button onClick={handleCalc} className="primary-btn bg-green-600 text-white rounded-xl p-4 font-bold w-full mt-4 active:scale-95 transition-transform">HISOBLASH</button>
            </div>

            {result && (
                <div className="mt-6 space-y-3 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`p-4 rounded-xl border ${result.nisabMet ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                        <p className="font-bold text-lg">{result.nisabMet ? '✅ Zakot farz' : '❌ Nisob yetmadi'}</p>
                        <p className="text-sm opacity-70 italic">Nisob miqdori: {formatMoney(result.nisabValue)}</p>
                    </div>

                    <div className="bg-[var(--tg-theme-bg-color)] p-4 rounded-xl border border-[var(--tg-theme-hint-color)] shadow-sm">
                        <p className="opacity-60 text-sm">Zakot hisoblanadigan mulk</p>
                        <p className="text-2xl font-bold font-mono">{formatMoney(result.zakatableAmount)}</p>
                    </div>

                    {result.nisabMet && (
                        <div className="bg-green-600 text-white p-5 rounded-xl shadow-lg">
                            <p className="opacity-80 text-sm uppercase tracking-wider">To'lanadigan zakot (2.5%)</p>
                            <p className="text-3xl font-bold font-mono mt-1">{formatMoney(result.zakatDue)}</p>
                        </div>
                    )}
                </div>
            )}
            <p className="text-center text-xs opacity-40 mt-10 italic">"Zakot boylikni poklaydi. Abu Hanifa mazhabi qoidalari asosida."</p>
        </div>
    );
}
