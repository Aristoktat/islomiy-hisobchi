"use client";
import { useState, useEffect } from 'react';
import { WillEngine } from 'engine';

declare global { interface Window { Telegram: any; } }

export default function WillPage() {
    const [form, setForm] = useState({ totalEstate: '', debts: '', funeral: '', requestedWill: '' });
    const [result, setResult] = useState<any>(null);

    useEffect(() => { window.Telegram?.WebApp?.ready(); }, []);
    const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleCalc = () => {
        const engine = new WillEngine();
        const res = engine.calculate(
            BigInt(form.totalEstate || '0'),
            BigInt(form.debts || '0'),
            BigInt(form.funeral || '0'),
            BigInt(form.requestedWill || '0')
        );
        setResult(res);

        if (window.Telegram?.WebApp?.MainButton) {
            const mainBtn = window.Telegram.WebApp.MainButton;
            mainBtn.text = "NATIJANI BOTGA YUBORISH";
            mainBtn.show();
            mainBtn.onClick(() => {
                const serializableResult = {
                    ...res,
                    type: 'will',
                    tarika: res.tarika.toString(),
                    maxWill: res.maxWill.toString(),
                    appliedWill: res.appliedWill.toString(),
                    netEstate: res.netEstate.toString()
                };
                window.Telegram.WebApp.sendData(JSON.stringify(serializableResult));
            });
        }
    };

    const formatMoney = (amount: bigint) => {
        return amount.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-center text-[var(--tg-theme-text-color)]">✍️ Vasiyat Kalkulyatori</h1>
            <div className="bg-[var(--tg-theme-secondary-bg-color)] p-5 rounded-2xl shadow-sm space-y-4">
                {[
                    ['Umumiy mulk (so\'mda)', 'totalEstate'],
                    ['Qarzlar (so\'mda)', 'debts'],
                    ['Dafn xarajatlari (so\'mda)', 'funeral'],
                    ['So\'ralgan vasiyat (so\'mda)', 'requestedWill']
                ].map(([label, key]) => (
                    <div key={key}>
                        <label className="text-sm opacity-70 mb-1 block">{label}</label>
                        <input type="number" className="input-field" value={(form as any)[key]} onChange={e => update(key, e.target.value)} />
                    </div>
                ))}
                <button onClick={handleCalc} className="primary-btn bg-purple-600 text-white rounded-xl p-4 font-bold w-full mt-2 active:scale-95 transition-transform">HISOBLASH</button>
            </div>

            {result && (
                <div className="mt-6 space-y-3 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[var(--tg-theme-bg-color)] p-4 rounded-xl border border-[var(--tg-theme-hint-color)] space-y-3 shadow-sm">
                        <div className="flex justify-between items-center text-sm">
                            <span className="opacity-60">Tarika (sof meros):</span>
                            <span className="font-bold font-mono">{formatMoney(result.tarika)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="opacity-60">Maksimal vasiyat (1/3):</span>
                            <span className="font-bold font-mono text-purple-600">{formatMoney(result.maxWill)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="opacity-60">Qo'llaniladigan vasiyat:</span>
                            <span className="font-bold font-mono">{formatMoney(result.appliedWill)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-dashed pt-3 mt-1">
                            <span className="font-bold">Meros uchun qolgan:</span>
                            <span className="font-bold font-mono text-green-600 text-lg">{formatMoney(result.netEstate)}</span>
                        </div>
                    </div>

                    {result.isCapped && (
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                            <p className="font-bold text-orange-700 flex items-center gap-1">
                                <span>⚠️</span> Ogohlantirish
                            </p>
                            <p className="text-sm text-orange-600 mt-1">
                                So'ralgan vasiyat 1/3 dan oshib ketdi. Islom huquqiga ko'ra faqat {formatMoney(result.maxWill)} qonuniy deb hisoblanadi.
                            </p>
                        </div>
                    )}
                </div>
            )}
            <p className="text-center text-xs opacity-40 mt-10 italic">"Vasiyat qiluvchining huquqi 1/3 bilan cheklangan. Abu Hanifa mazhabi qoidalari."</p>
        </div>
    );
}
