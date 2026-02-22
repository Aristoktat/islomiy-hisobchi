import { describe, it, expect } from 'vitest';
import { WillEngine } from '../src/will';

const engine = new WillEngine();

describe('Vasiyat (Will) Engine - Unit Testlar', () => {

    // V01: Oddiy holat — vasiyat chegarasiga yetmaydi
    it('V01: 900_000n meros, so\'rov 200_000n → cap yo\'q', () => {
        const res = engine.calculate(900_000n, 0n, 0n, 200_000n);
        expect(res.tarika).toBe(900_000n);
        expect(res.maxWill).toBe(300_000n);        // 900_000 / 3
        expect(res.appliedWill).toBe(200_000n);    // cap yo'q
        expect(res.netEstate).toBe(700_000n);      // 900_000 - 200_000
        expect(res.isCapped).toBe(false);
    });

    // V02: Vasiyat 1/3 dan oshadi — cap qo'llanadi
    it('V02: 900_000n meros, so\'rov 500_000n → cap 300_000n', () => {
        const res = engine.calculate(900_000n, 0n, 0n, 500_000n);
        expect(res.tarika).toBe(900_000n);
        expect(res.maxWill).toBe(300_000n);        // 1/3
        expect(res.appliedWill).toBe(300_000n);    // maksimumga teng
        expect(res.netEstate).toBe(600_000n);      // 900_000 - 300_000
        expect(res.isCapped).toBe(true);
    });

    // V03: Qarz va dafn xarajatlari chegiriladi
    it('V03: 1_200_000n meros, 200_000n qarz, 50_000n dafn → tarika = 950_000n', () => {
        const res = engine.calculate(1_200_000n, 200_000n, 50_000n, 100_000n);
        expect(res.tarika).toBe(950_000n);         // 1.2M - 200k - 50k
        expect(res.maxWill).toBe(316_666n);        // 950_000 / 3 = 316666n (floor)
        expect(res.appliedWill).toBe(100_000n);    // cap yo'q
        expect(res.netEstate).toBe(850_000n);
        expect(res.isCapped).toBe(false);
    });

    // V04: Tarika 0 yoki manfiy — bo'sh natija
    it('V04: Qarz merosdan ko\'p → tarika = 0, barcha 0', () => {
        const res = engine.calculate(500_000n, 600_000n, 0n, 100_000n);
        expect(res.tarika).toBe(0n);
        expect(res.maxWill).toBe(0n);
        expect(res.appliedWill).toBe(0n);
        expect(res.netEstate).toBe(0n);
        expect(res.isCapped).toBe(false);
    });

    // V05: Vasiyat = 0 — hech narsa vasiyat qilinmagan
    it('V05: Vasiyat so\'rovi 0 → appliedWill = 0, netEstate = tarika', () => {
        const res = engine.calculate(900_000n, 0n, 0n, 0n);
        expect(res.appliedWill).toBe(0n);
        expect(res.netEstate).toBe(900_000n);
        expect(res.isCapped).toBe(false);
    });

    // V06: Aynan 1/3 qilingan — cap yo'q (maxWill = requestedWill)
    it('V06: Vasiyat aynan 1/3 dan = maxWill → isCapped = false', () => {
        const res = engine.calculate(900_000n, 0n, 0n, 300_000n);
        expect(res.maxWill).toBe(300_000n);
        expect(res.appliedWill).toBe(300_000n);
        expect(res.isCapped).toBe(false); // aynan 1/3 — cap emas
    });

    // V07: Katta qiymat — 10 mlrd tiyin
    it('V07: 10 mlrd tiyin meros, 1 mlrd vasiyat → to\'g\'ri hisob', () => {
        const res = engine.calculate(10_000_000_000n, 0n, 0n, 1_000_000_000n);
        expect(res.tarika).toBe(10_000_000_000n);
        expect(res.maxWill).toBe(3_333_333_333n); // floor(10M/3)
        expect(res.appliedWill).toBe(1_000_000_000n);
        expect(res.netEstate).toBe(9_000_000_000n);
        expect(res.isCapped).toBe(false);
    });

    // V08: Katta vasiyat so'rovi — cap
    it('V08: 10 mlrd tiyin meros, 5 mlrd vasiyat → cap = 3.33 mlrd', () => {
        const res = engine.calculate(10_000_000_000n, 0n, 0n, 5_000_000_000n);
        expect(res.appliedWill).toBe(3_333_333_333n);
        expect(res.isCapped).toBe(true);
        expect(res.netEstate).toBe(10_000_000_000n - 3_333_333_333n);
    });

    // V09: Dafn xarajatlari bilan to'liq holat
    it('V09: To\'liq holat — 1.5 mln meros, 100k qarz, 50k dafn, 200k vasiyat', () => {
        const res = engine.calculate(1_500_000n, 100_000n, 50_000n, 200_000n);
        // tarika = 1.5M - 100k - 50k = 1_350_000
        // maxWill = 1_350_000 / 3 = 450_000
        // appliedWill = 200_000 (cap yo'q)
        // netEstate = 1_350_000 - 200_000 = 1_150_000
        expect(res.tarika).toBe(1_350_000n);
        expect(res.maxWill).toBe(450_000n);
        expect(res.appliedWill).toBe(200_000n);
        expect(res.netEstate).toBe(1_150_000n);
        expect(res.isCapped).toBe(false);
    });

    // V10: Hammasi vasiyat qilinsa — 1/3 dan oshsa cap
    it('V10: "Hammasini vasiyat qilaman" → 1/3 ga cheklanadi', () => {
        const bigAmount = 6_000_000n;
        const res = engine.calculate(bigAmount, 0n, 0n, bigAmount);
        expect(res.appliedWill).toBe(2_000_000n); // max 1/3
        expect(res.isCapped).toBe(true);
        expect(res.netEstate).toBe(4_000_000n);
    });

    // V11: Invariant — netEstate = tarika - appliedWill
    it('V11: Invariant — netEstate har doim tarika - appliedWill', () => {
        const cases = [
            [1000n, 0n, 0n, 100n],
            [5000n, 500n, 200n, 2000n],
            [999n, 333n, 111n, 999n],  // tarika = 555, maxWill=185
        ] as const;
        for (const [estate, debts, funeral, requested] of cases) {
            const res = engine.calculate(estate, debts, funeral, requested);
            if (res.tarika > 0n) {
                expect(res.netEstate).toBe(res.tarika - res.appliedWill);
            }
        }
    });

    // V12: Determinizm
    it('V12: Determinizm — bir xil kirish bir xil natija', () => {
        const r1 = engine.calculate(500_000n, 50_000n, 25_000n, 100_000n);
        const r2 = engine.calculate(500_000n, 50_000n, 25_000n, 100_000n);
        expect(r1.tarika).toBe(r2.tarika);
        expect(r1.appliedWill).toBe(r2.appliedWill);
        expect(r1.netEstate).toBe(r2.netEstate);
    });

    // V13: netEstate hech qachon manfiy bo'lmaydi
    it('V13: netEstate >= 0 har doim', () => {
        const res = engine.calculate(300n, 0n, 0n, 300n);
        // maxWill = 100n, appliedWill = 100n (cap — 300 > 100)
        expect(res.netEstate >= 0n).toBe(true);
        expect(res.appliedWill).toBeLessThanOrEqual(res.tarika);
    });

    // V14: Maxill floor hisoblash (bigint division)
    it('V14: maxWill = tarika / 3n (floor — qisqa)', () => {
        // 10n / 3n = 3n (floor)
        const res = engine.calculate(10n, 0n, 0n, 0n);
        expect(res.maxWill).toBe(3n);
        expect(res.tarika).toBe(10n);
    });

    // V15: Dafn xarajati juda katta → tarika = 0
    it('V15: Dafn xarajati + qarz = barcha meros → tarika 0', () => {
        const res = engine.calculate(1000n, 500n, 500n, 100n);
        expect(res.tarika).toBe(0n);
        expect(res.maxWill).toBe(0n);
        expect(res.netEstate).toBe(0n);
    });

});

// Property-based testlar
describe('Vasiyat Engine - Property-based Testlar', () => {

    function seededRNG(seed: number) {
        let s = seed;
        return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
    }

    it('VP01: 300 random senariy — invariantlar har doim bajariladi', () => {
        const rng = seededRNG(55);
        for (let i = 0; i < 300; i++) {
            const estate = BigInt(Math.floor(rng() * 10_000_000) + 1);
            const debts = BigInt(Math.floor(rng() * 5_000_000));
            const funeral = BigInt(Math.floor(rng() * 100_000));
            const requested = BigInt(Math.floor(rng() * 10_000_000));
            const res = engine.calculate(estate, debts, funeral, requested);

            // netEstate manfiy bo'lmaydi
            expect(res.netEstate >= 0n).toBe(true);
            // appliedWill hech qachon maxWill dan oshmasin
            expect(res.appliedWill <= res.maxWill).toBe(true);
            // tarika > 0 bo'lsa invariant
            if (res.tarika > 0n) {
                expect(res.netEstate).toBe(res.tarika - res.appliedWill);
                expect(res.appliedWill <= res.tarika).toBe(true);
            }
            // isCapped to'g'ri
            if (res.isCapped) {
                expect(res.appliedWill).toBe(res.maxWill);
            }
        }
    });

    it('VP02: maxWill har doim tarika / 3 (floor)', () => {
        const rng = seededRNG(66);
        for (let i = 0; i < 100; i++) {
            const estate = BigInt(Math.floor(rng() * 1_000_000) + 100);
            const debts = BigInt(Math.floor(rng() * 100_000));
            const funeral = BigInt(Math.floor(rng() * 10_000));
            const res = engine.calculate(estate, debts, funeral, 0n);
            if (res.tarika > 0n) {
                expect(res.maxWill).toBe(res.tarika / 3n);
            }
        }
    });

});
