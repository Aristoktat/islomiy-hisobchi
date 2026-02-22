"use client";

import { useState, useEffect } from 'react';
import { InheritanceEngine, HeirInput, InheritanceResult } from 'engine';

declare global {
    interface Window {
        Telegram: any;
    }
}

export default function InheritancePage() {
    const [estate, setEstate] = useState<string>("1000000");
    const [input, setInput] = useState<HeirInput>({
        husband: false,
        wifeCount: 0,
        mother: false,
        father: false,
        sonsCount: 0,
        daughtersCount: 0,
        siblingsCount: 0
    });
    const [result, setResult] = useState<InheritanceResult | null>(null);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
        }
    }, []);

    const handleCalculate = () => {
        const engine = new InheritanceEngine();
        const res = engine.calculate(BigInt(estate), input);
        setResult(res);

        if (window.Telegram?.WebApp?.MainButton) {
            const mainBtn = window.Telegram.WebApp.MainButton;
            mainBtn.text = "NATIJANI BOTGA YUBORISH";
            mainBtn.show();
            mainBtn.onClick(() => {
                // Send BigInt values as strings for JSON serialization
                const serializableResult = {
                    ...res,
                    type: 'inheritance',
                    netEstate: res.netEstate.toString(),
                    heirs: res.heirs.map(h => ({
                        ...h,
                        shareAmount: h.shareAmount.toString(),
                        shareFraction: { n: h.shareFraction.n.toString(), d: h.shareFraction.d.toString() }
                    }))
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
            <h1 className="text-2xl font-bold mb-6 text-center text-[var(--tg-theme-text-color)]">📜 Meros Taqsimoti</h1>

            <div className="bg-[var(--tg-theme-secondary-bg-color)] p-5 rounded-2xl shadow-sm space-y-4">
                <div>
                    <label className="block text-sm opacity-70 mb-1">Meros summasi (so'mda)</label>
                    <input
                        type="number"
                        className="input-field"
                        value={estate}
                        onChange={(e) => setEstate(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${input.husband ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <input type="checkbox" checked={input.husband} onChange={e => setInput({ ...input, husband: e.target.checked, wifeCount: 0 })} className="mr-2" />
                        Er
                    </label>
                    <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${input.mother ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <input type="checkbox" checked={input.mother} onChange={e => setInput({ ...input, mother: e.target.checked })} className="mr-2" />
                        Ona
                    </label>
                    <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${input.father ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <input type="checkbox" checked={input.father} onChange={e => setInput({ ...input, father: e.target.checked })} className="mr-2" />
                        Ota
                    </label>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-sm opacity-70">Xotinlar soni</label>
                        <input type="number" min="0" max="4" className="input-field" value={input.wifeCount} onChange={e => setInput({ ...input, wifeCount: parseInt(e.target.value) || 0, husband: false })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm opacity-70">O'g'illar</label>
                            <input type="number" className="input-field" value={input.sonsCount} onChange={e => setInput({ ...input, sonsCount: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <label className="text-sm opacity-70">Qizlar</label>
                            <input type="number" className="input-field" value={input.daughtersCount} onChange={e => setInput({ ...input, daughtersCount: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                </div>

                <button onClick={handleCalculate} className="primary-btn mt-4 active:scale-95 transition-transform">HISOBLASH</button>
            </div>

            {result && (
                <div className="mt-8 space-y-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-xl font-bold">Natija:</h2>
                    {result.heirs.map((h, i) => (
                        <div key={i} className="bg-[var(--tg-theme-bg-color)] p-4 rounded-xl border border-[var(--tg-theme-hint-color)] shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-lg">{h.type}</div>
                                    <div className="text-xs opacity-60 uppercase">{h.reason} ({h.ruleId})</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-blue-600">{h.sharePercent}%</div>
                                    <div className="text-xs opacity-60">{h.shareFraction.n.toString()}/{h.shareFraction.d.toString()}</div>
                                </div>
                            </div>
                            <div className="mt-2 text-xl font-mono bg-[var(--tg-theme-secondary-bg-color)] p-2 rounded text-center">
                                {formatMoney(h.shareAmount)}
                            </div>
                        </div>
                    ))}

                    {result.trace.length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-xl text-sm border border-yellow-100 text-yellow-800">
                            <h3 className="font-bold mb-2">Qabul qilingan qoidalar:</h3>
                            <ul className="list-disc ml-4 space-y-1">
                                {result.trace.map((t, i) => <li key={i}>{t}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <p className="text-center text-xs opacity-40 mt-10 italic">
                "Ilova maslahat beradi, fatvo emas. Abu Hanifa mazhabi qoidalari asosida."
            </p>
        </div>
    );
}
