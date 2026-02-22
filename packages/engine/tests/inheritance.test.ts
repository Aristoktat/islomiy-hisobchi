import { describe, it, expect } from 'vitest';
import { InheritanceEngine } from '../src/inheritance';
import { HeirInput } from '../src/types';

const engine = new InheritanceEngine();
function calc(estate: bigint, input: HeirInput) {
    return engine.calculate(estate, input);
}

describe('Hanafiy Meros Engine - Unit Testlar', () => {

    // T01: Faqat er → 1/2 farz, boshqa merosxo'r yo'q → Bayt ul-mol
    it('T01: Faqat er → ogohlantirish, heirs mavjud', () => {
        const res = calc(1000n, { husband: true });
        expect(res.heirs.length).toBeGreaterThan(0);
        expect(res.warnings.length).toBeGreaterThan(0);
        const sum = res.heirs.reduce((s, h) => s + h.shareAmount, 0n);
        expect(sum).toBeGreaterThan(0n);
        expect(sum).toBeLessThanOrEqual(1000n);
    });

    // T02: Er + o'g'il → er 1/4
    it('T02: Er + o\'g\'il → er 300 tiyin oladi', () => {
        const res = calc(1200n, { husband: true, sonsCount: 1 });
        const er = res.heirs.find(h => h.type === 'Er');
        expect(er?.shareAmount).toBe(300n);
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(1200n);
    });

    // T03: Faqat xotin → 1/4 farz, Bayt ul-mol uchun ogohlantirish
    it('T03: Faqat 1 xotin → ogohlantirish, heirs mavjud', () => {
        const res = calc(800n, { wifeCount: 1 });
        expect(res.heirs.length).toBeGreaterThan(0);
        expect(res.warnings.length).toBeGreaterThan(0);
        const sum = res.heirs.reduce((s, h) => s + h.shareAmount, 0n);
        expect(sum).toBeGreaterThan(0n);
        expect(sum).toBeLessThanOrEqual(800n);
    });

    // T04: Xotin + o'g'il → xotin 1/8
    it('T04: Xotin + o\'g\'il → xotin 100 tiyin', () => {
        const res = calc(800n, { wifeCount: 1, sonsCount: 1 });
        const xotin = res.heirs.find(h => h.type === 'Xotin(lar)');
        expect(xotin?.shareAmount).toBe(100n);
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(800n);
    });

    // T05: Faqat ona → Radd bilan hammasi
    it('T05: Faqat ona → 900 hammasini oladi (Radd)', () => {
        const res = calc(900n, { mother: true });
        const ona = res.heirs.find(h => h.type === 'Ona');
        expect(ona?.shareAmount).toBe(900n);
        expect(ona?.reason).toBe('radd');
    });

    // T06: Ona + o'g'il → ona 1/6
    it('T06: Ona + o\'g\'il → ona 100 tiyin (1/6)', () => {
        const res = calc(600n, { mother: true, sonsCount: 1 });
        const ona = res.heirs.find(h => h.type === 'Ona');
        expect(ona?.shareAmount).toBe(100n);
    });

    // T07: Ona + 2 aka-uka → Siblings Onani 1/6 ga tushiradi, lekin o'zi meros olmaydi
    // Natijada Ona 1/6 fixed, Radd bilan hammasi Onaga qaytadi
    it('T07: Ona + 2 aka-uka → siblings Onani 1/6 cheklaydi, Radd bilan Ona hammani oladi', () => {
        const res = calc(600n, { mother: true, siblingsCount: 2 });
        const ona = res.heirs.find(h => h.type === 'Ona');
        // Siblings faqat hajb (cheklash) qiladi, o'zi meros olmaydi
        // Ona 1/6 farz, so'ng Radd bilan = hammasi
        expect(ona?.shareAmount).toBe(600n);
        expect(res.errors.length).toBe(0);
    });

    // T08: Umariyyatayn - Er + Ona + Ota
    it('T08: Umariyyatayn - Er + Ona + Ota / 600 = 300+100+200', () => {
        const res = calc(600n, { husband: true, mother: true, father: true });
        const er = res.heirs.find(h => h.type === 'Er');
        const ona = res.heirs.find(h => h.type === 'Ona');
        expect(er?.shareAmount).toBe(300n);
        expect(ona?.shareAmount).toBe(100n);
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(600n);
    });

    // T09: Umariyyatayn - Xotin + Ona + Ota
    it('T09: Umariyyatayn - Xotin + Ona + Ota / 120', () => {
        const res = calc(120n, { wifeCount: 1, mother: true, father: true });
        const xotin = res.heirs.find(h => h.type === 'Xotin(lar)');
        expect(xotin?.shareAmount).toBe(30n);
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(120n);
    });

    // T10: Faqat 1 qiz → Radd bilan hammasi
    it('T10: Faqat 1 qiz → Radd, 1000 hammasini oladi', () => {
        const res = calc(1000n, { daughtersCount: 1 });
        const qiz = res.heirs.find(h => h.type === 'Qiz(lar)');
        expect(qiz?.shareAmount).toBe(1000n);
        expect(qiz?.reason).toBe('radd');
    });

    // T11: 2+ qiz → Radd bilan hammasi
    it('T11: 2 qiz → Radd, 900 hammasini oladi', () => {
        const res = calc(900n, { daughtersCount: 2 });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(900n);
    });

    // T12: Faqat o'g'il → hammasi asaba
    it('T12: Faqat 1 o\'g\'il → 1000 hammasini oladi', () => {
        const res = calc(1000n, { sonsCount: 1 });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(1000n);
        expect(res.errors.length).toBe(0);
    });

    // T13: O'g'il + qiz → 2:1 nisbat
    it('T13: 1 o\'g\'il + 1 qiz → 600 va 300', () => {
        const res = calc(900n, { sonsCount: 1, daughtersCount: 1 });
        const ogil = res.heirs.find(h => h.type === "O'g'il(lar)");
        const qiz = res.heirs.find(h => h.type === 'Qiz(lar)');
        expect(ogil?.shareAmount).toBe(600n);
        expect(qiz?.shareAmount).toBe(300n);
    });

    // T14: Ota + qiz (o'g'ilsiz) → ota asaba
    it('T14: Ota + 1 qiz → ikkalasi 300 tiyindan', () => {
        const res = calc(600n, { father: true, daughtersCount: 1 });
        const ota = res.heirs.find(h => h.type === 'Ota');
        const qiz = res.heirs.find(h => h.type === 'Qiz(lar)');
        expect(qiz?.shareAmount).toBe(300n);
        expect(ota?.shareAmount).toBe(300n);
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(600n);
    });

    // T15: Faqat ota → hammasi asaba
    it('T15: Faqat ota → 1000 hammasini oladi', () => {
        const res = calc(1000n, { father: true });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(1000n);
    });

    // T16: AUL holati
    // Xotin(1/4) + Ona(1/6) + 2Qiz(2/3) + Ota(1/6)
    // = 3/12 + 2/12 + 8/12 + 2/12 = 15/12 > 1 → AUL
    // (O'g'il yo'q: Ota 1/6 farz, Qiz 2/3 farz, Asaba yo'q!)
    it('T16: Aul - Xotin+Ona+Ota+2Qiz → 15/12 > 1, Aul qo\'llanadi', () => {
        const res = calc(1500n, { wifeCount: 1, mother: true, father: true, daughtersCount: 2 });
        // O'g'il yo'q → Ota 1/6 farz, Qiz 2/3 farz. Sum = 1/4+1/6+2/3+1/6 = 15/12 > 1
        expect(res.trace.some(t => t.toLowerCase().includes('aul'))).toBe(true);
        expect(res.heirs.some(h => h.reason === 'aul')).toBe(true);
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(1500n);
    });

    // T17: RADD - Faqat ona
    it('T17: Radd - Faqat ona → hammasi onaga', () => {
        const res = calc(900n, { mother: true });
        const ona = res.heirs.find(h => h.type === 'Ona');
        expect(ona?.shareAmount).toBe(900n);
        expect(ona?.reason).toBe('radd');
    });

    // T18: RADD - 1 xotin + 2 qiz
    it('T18: Radd - 1 xotin + 2 qiz → qiz radd oladi', () => {
        const res = calc(600n, { wifeCount: 1, daughtersCount: 2 });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(600n);
        const qiz = res.heirs.find(h => h.type === 'Qiz(lar)');
        expect(qiz?.reason).toBe('radd');
    });

    // T19: Validatsiya - Er + Xotin
    it('T19: Validatsiya - Er va Xotin birga → xato', () => {
        const res = calc(1000n, { husband: true, wifeCount: 1 });
        expect(res.errors.length).toBeGreaterThan(0);
    });

    // T20: Validatsiya - 5 xotin
    it('T20: Validatsiya - 5 xotin → xato', () => {
        const res = calc(1000n, { wifeCount: 5 });
        expect(res.errors.length).toBeGreaterThan(0);
    });

    // T21: Estate = 0
    it('T21: Estate = 0 → bo\'sh natija', () => {
        const res = calc(0n, { husband: true, sonsCount: 1 });
        expect(res.heirs.length).toBe(0);
        expect(res.errors.length).toBe(0);
    });

    // T22: 4 xotin + o'g'il
    it('T22: 4 xotin + 1 o\'g\'il → xotin 100 tiyin (1/8)', () => {
        const res = calc(800n, { wifeCount: 4, sonsCount: 1 });
        const xotin = res.heirs.find(h => h.type === 'Xotin(lar)');
        expect(xotin?.shareAmount).toBe(100n);
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(800n);
    });

    // T23: Er + Ota + O'g'il
    it('T23: Er + Ota + 1 o\'g\'il → summa 240', () => {
        const res = calc(240n, { husband: true, father: true, sonsCount: 1 });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(240n);
        expect(res.errors.length).toBe(0);
    });

    // T24: Xotin + Ona + Ota + O'g'il
    it('T24: Xotin + Ona + Ota + O\'g\'il → summa 480', () => {
        const res = calc(480n, { wifeCount: 1, mother: true, father: true, sonsCount: 1 });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(480n);
        expect(res.errors.length).toBe(0);
    });

    // T25: 2 o'g'il + 3 qiz
    it('T25: 2 o\'g\'il + 3 qiz → 400 va 300', () => {
        const res = calc(700n, { sonsCount: 2, daughtersCount: 3 });
        const ogil = res.heirs.find(h => h.type === "O'g'il(lar)");
        const qiz = res.heirs.find(h => h.type === 'Qiz(lar)');
        expect(ogil?.shareAmount).toBe(400n);
        expect(qiz?.shareAmount).toBe(300n);
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(700n);
    });

    // T26: Deterministik
    it('T26: Deterministik - bir xil kirish bir xil natija', () => {
        const input: HeirInput = { husband: true, mother: true, sonsCount: 2, daughtersCount: 1 };
        const r1 = calc(999999n, input);
        const r2 = calc(999999n, input);
        expect(r1.heirs.map(h => h.shareAmount.toString())).toEqual(r2.heirs.map(h => h.shareAmount.toString()));
    });

    // T27: 1 tiyin aniqlik
    it('T27: 1 tiyin aniqlik - 7 tiyin / Er + Ona + Ota', () => {
        const res = calc(7n, { husband: true, mother: true, father: true });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(7n);
    });

    // T28: Xotin + 1 qiz
    it('T28: Xotin + 1 qiz → summa 800', () => {
        const res = calc(800n, { wifeCount: 1, daughtersCount: 1 });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(800n);
    });

    // T29: Xotin + 2 qiz + Ona
    it('T29: Xotin + 2 qiz + Ona → summa 690', () => {
        const res = calc(690n, { wifeCount: 1, daughtersCount: 2, mother: true });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(690n);
    });

    // T30: Katta son
    it('T30: 10 mlrd tiyin - summa to\'g\'ri', () => {
        const res = calc(10_000_000_000n, { husband: true, mother: true, sonsCount: 3, daughtersCount: 2 });
        expect(res.heirs.reduce((s, h) => s + h.shareAmount, 0n)).toBe(10_000_000_000n);
        expect(res.errors.length).toBe(0);
    });

});

// ============================================================
// AUL TEST: Alohida (muhim holat)
// ============================================================
describe('Aul va Radd maxsus holatlari', () => {

    it('Aul: Ota Asaba olmasin deyilganda (faqat qiz bor, ota farz = 1/6 oladi)', () => {
        // Xotin(1/4) + Ona(1/6) + Ota(1/6) + 2Qiz(2/3) → Ota + Qiz asaba emas farz!
        // 3/12 + 2/12 + 2/12 + 8/12 = 15/12 > 1 → AUL
        const res = engine.calculate(1500n, { wifeCount: 1, mother: true, father: true, daughtersCount: 2 });
        expect(res.trace.some(t => t.toLowerCase().includes('aul'))).toBe(true);
        const sum = res.heirs.reduce((s, h) => s + h.shareAmount, 0n);
        expect(sum).toBe(1500n);
    });

});

// ============================================================
// PROPERTY-BASED TESTLAR
// ============================================================
describe('Property-based Testlar', () => {

    function seededRNG(seed: number) {
        let s = seed;
        return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
    }

    it('P01: 500 random senariy - summa har doim netEstate ga teng', () => {
        const rng = seededRNG(42);
        let passed = 0;
        for (let i = 0; i < 500; i++) {
            const estate = BigInt(Math.floor(rng() * 10_000_000) + 1);
            const hasHusband = rng() > 0.5;
            const wifeCount = hasHusband ? 0 : Math.floor(rng() * 3);
            const input: HeirInput = {
                husband: hasHusband, wifeCount,
                mother: rng() > 0.4, father: rng() > 0.4,
                sonsCount: Math.floor(rng() * 4),
                daughtersCount: Math.floor(rng() * 4),
                siblingsCount: Math.floor(rng() * 3)
            };
            const res = engine.calculate(estate, input);
            if (res.errors.length > 0) continue;
            // Bayt ul-mol holati (faqat er/xotin) — warnings chiqadi, sum < estate
            // Bu to'g'ri holat, o'tkazib yuboramiz
            if (res.warnings.length > 0) continue;
            const sum = res.heirs.reduce((s, h) => s + h.shareAmount, 0n);
            if (res.heirs.length > 0) {
                expect(sum).toBe(estate);
                res.heirs.forEach(h => expect(h.shareAmount >= 0n).toBe(true));
                passed++;
            }
        }
        expect(passed).toBeGreaterThan(200);
    });

    it('P02: Salbiy ulush bo\'lmasligi invarianti', () => {
        const rng = seededRNG(123);
        for (let i = 0; i < 100; i++) {
            const res = engine.calculate(BigInt(Math.floor(rng() * 100000) + 1), {
                husband: rng() > 0.6,
                sonsCount: Math.floor(rng() * 5),
                daughtersCount: Math.floor(rng() * 5),
                mother: rng() > 0.5,
                father: rng() > 0.5,
            });
            res.heirs.forEach(h => {
                expect(h.shareAmount >= 0n).toBe(true);
                expect(h.shareFraction.n >= 0n).toBe(true);
                expect(h.shareFraction.d > 0n).toBe(true);
            });
        }
    });
});
