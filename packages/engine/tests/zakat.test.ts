import { describe, it, expect } from 'vitest';
import { ZakatEngine, ZakatInput } from '../src/zakat';

const engine = new ZakatEngine();

// Test yordamchi: standart narxlar
// Oltin narxi: 1,000,000 so'm/gram (= 1_000_000n tiyin)
// Kumush narxi:  12,000 so'm/gram  (=    12_000n tiyin)
const GOLD_PRICE = 1_000_000n; // tiyin/gram
const SILVER_PRICE = 12_000n; // tiyin/gram
// Oltin nisobi = 85g * 1_000_000 = 85_000_000n tiyin
// Kumush nisobi = 595g * 12_000 = 7_140_000n tiyin

function makeInput(overrides: Partial<ZakatInput> = {}): ZakatInput {
    return {
        cash: 0n,
        goldGrams: 0,
        silverGrams: 0,
        tradeGoods: 0n,
        receivables: 0n,
        debts: 0n,
        goldPricePerGram: GOLD_PRICE,
        silverPricePerGram: SILVER_PRICE,
        nisabByGold: true,
        ...overrides
    };
}

describe('Zakot Engine - Unit Testlar', () => {

    // Z01: Nisob yetmaydi — zakat yo'q
    it('Z01: Nisob yetmaydi → zakatDue = 0', () => {
        const res = engine.calculate(makeInput({ cash: 10_000_000n, nisabByGold: true }));
        // 10_000_000 tiyin < 85_000_000 nisob → zakot yo'q
        expect(res.nisabMet).toBe(false);
        expect(res.zakatDue).toBe(0n);
    });

    // Z02: Faqat naqd pul — nisob yetadi (oltin nisobi)
    it('Z02: Naqd pul nisob yetadi (oltin) → 2.5% zakot', () => {
        // 100_000_000 tiyin (100 mln) > 85_000_000 nisob
        const res = engine.calculate(makeInput({ cash: 100_000_000n, nisabByGold: true }));
        expect(res.nisabMet).toBe(true);
        // 100_000_000 * 2.5% = 2_500_000
        expect(res.zakatDue).toBe(2_500_000n);
    });

    // Z03: Oltin (gramm) qiymati hisoblash
    it('Z03: 100g oltin, narxi 1_000_000n/gram → qiymat 100_000_000n', () => {
        const res = engine.calculate(makeInput({ goldGrams: 100, nisabByGold: true }));
        expect(res.totalAssets).toBe(100_000_000n);
        expect(res.nisabMet).toBe(true);
        expect(res.zakatDue).toBe(2_500_000n);
    });

    // Z04: Kumush (gramm) qiymati hisoblash
    it('Z04: 1000g kumush, narxi 12_000/gram → qiymat 12_000_000n', () => {
        const res = engine.calculate(makeInput({ silverGrams: 1000, nisabByGold: false }));
        // 1000g * 12_000 = 12_000_000 tiyin
        // Kumush nisobi = 595 * 12_000 = 7_140_000
        // 12_000_000 > 7_140_000 → nisob yetdi
        expect(res.totalAssets).toBe(12_000_000n);
        expect(res.nisabMet).toBe(true);
        expect(res.zakatDue).toBe(300_000n); // 12_000_000 * 2.5%
    });

    // Z05: Qarz zakot bazasidan ayriladi
    it('Z05: Qarz (debts) zakot bazasidan ayriladi', () => {
        // 200_000_000 tiyin pul, 150_000_000 tiyin qarz
        // Zakot bazasi = 50_000_000 < 85_000_000 nisob → zakot yo'q
        const res = engine.calculate(makeInput({
            cash: 200_000_000n,
            debts: 150_000_000n,
            nisabByGold: true
        }));
        expect(res.zakatableAmount).toBe(50_000_000n);
        expect(res.nisabMet).toBe(false);
        expect(res.zakatDue).toBe(0n);
    });

    // Z06: Savdo mollari kiritiladi
    it('Z06: Savdo mollari (tradeGoods) zakot bazasiga qo\'shiladi', () => {
        const res = engine.calculate(makeInput({
            cash: 50_000_000n,
            tradeGoods: 50_000_000n,
            nisabByGold: true
        }));
        expect(res.totalAssets).toBe(100_000_000n);
        expect(res.nisabMet).toBe(true);
        expect(res.zakatDue).toBe(2_500_000n);
    });

    // Z07: Undiriladigan qarzlar (receivables) qo'shiladi
    it('Z07: Undiriladigan qarzlar (receivables) zakot bazasiga qo\'shiladi', () => {
        const res = engine.calculate(makeInput({
            cash: 0n,
            receivables: 100_000_000n,
            nisabByGold: true
        }));
        expect(res.totalAssets).toBe(100_000_000n);
        expect(res.nisabMet).toBe(true);
        expect(res.zakatDue).toBe(2_500_000n);
    });

    // Z08: Kumush nisobi — oltin nisobigarchi katta bo'lsa ham
    it('Z08: Kumush nisobi bilan tekshirish (nisabByGold=false)', () => {
        // 8_000_000 tiyin > kumush nisobi (7_140_000), lekin < oltin nisobi (85_000_000)
        const res = engine.calculate(makeInput({
            cash: 8_000_000n,
            nisabByGold: false
        }));
        expect(res.nisabMet).toBe(true); // kumush nisobiida yetadi
        expect(res.zakatDue).toBe(200_000n); // 8_000_000 * 2.5%

        // Oltin nisobida esa yetmaydi
        const res2 = engine.calculate(makeInput({
            cash: 8_000_000n,
            nisabByGold: true
        }));
        expect(res2.nisabMet).toBe(false);
        expect(res2.zakatDue).toBe(0n);
    });

    // Z09: Barcha assetlar birgalikda
    it('Z09: Naqd + oltin + kumush + savdo + qarz → to\'g\'ri hisob', () => {
        const res = engine.calculate(makeInput({
            cash: 50_000_000n,
            goldGrams: 50,     // 50 * 1_000_000 = 50_000_000
            silverGrams: 100,  // 100 * 12_000 = 1_200_000
            tradeGoods: 10_000_000n,
            receivables: 5_000_000n,
            debts: 20_000_000n,
            nisabByGold: true
        }));
        // totalAssets = 50M + 50M + 1.2M + 10M + 5M = 116_200_000
        expect(res.totalAssets).toBe(116_200_000n);
        // zakatableAmount = 116.2M - 20M = 96_200_000
        expect(res.zakatableAmount).toBe(96_200_000n);
        expect(res.nisabMet).toBe(true);
        // zakatDue = 96_200_000 * 25 / 1000 = 2_405_000
        expect(res.zakatDue).toBe(2_405_000n);
    });

    // Z10: Hamma narsa 0 — zakot 0
    it('Z10: Barcha 0 → zakot yo\'q', () => {
        const res = engine.calculate(makeInput());
        expect(res.totalAssets).toBe(0n);
        expect(res.nisabMet).toBe(false);
        expect(res.zakatDue).toBe(0n);
    });

    // Z11: Qarz aktivlardan ko'p bo'lsa — zakatableAmount manfiy bo'lmaydi
    it('Z11: Qarz aktivlardan ko\'proq bo\'lsa — zakot 0', () => {
        const res = engine.calculate(makeInput({
            cash: 10_000_000n,
            debts: 50_000_000n,
            nisabByGold: true
        }));
        // zakatableAmount = 10M - 50M = -40M → nisob yetmaydi (manfiy)
        expect(res.nisabMet).toBe(false);
        expect(res.zakatDue).toBe(0n);
    });

    // Z12: Aniq 2.5% tekshirish — 1000 tiyin
    it('Z12: Aniqlik tekshirish — 1000 tiyin zakot bazasida, 2.5% = 25 tiyin', () => {
        // Nisob uchun kichik narxlar ishlating
        const res = engine.calculate({
            cash: 1000n,
            goldGrams: 0,
            silverGrams: 0,
            tradeGoods: 0n,
            receivables: 0n,
            debts: 0n,
            goldPricePerGram: 1n, // Nisob = 85 tiyin
            silverPricePerGram: 1n,
            nisabByGold: false // Kumush nisobi = 595 tiyin; 1000 > 595 ✓
        });
        expect(res.nisabMet).toBe(true);
        expect(res.zakatDue).toBe(25n); // 1000 * 25 / 1000 = 25
    });

    // Z13: Determinizm — bir xil kirish bir xil natija
    it('Z13: Determinizm — bir xil kirish = bir xil natija', () => {
        const input = makeInput({ cash: 200_000_000n, goldGrams: 50, debts: 10_000_000n });
        const r1 = engine.calculate(input);
        const r2 = engine.calculate(input);
        expect(r1.zakatDue).toBe(r2.zakatDue);
        expect(r1.totalAssets).toBe(r2.totalAssets);
        expect(r1.nisabMet).toBe(r2.nisabMet);
    });

    // Z14: nisabValue to'g'ri hisoblanadi
    it('Z14: nisabValue — oltin nisobi = 85 * narx', () => {
        const res = engine.calculate(makeInput({ nisabByGold: true }));
        expect(res.nisabValue).toBe(85n * GOLD_PRICE);
    });

    it('Z14b: nisabValue — kumush nisobi = 595 * narx', () => {
        const res = engine.calculate(makeInput({ nisabByGold: false }));
        expect(res.nisabValue).toBe(595n * SILVER_PRICE);
    });

    // Z15: Gramm kasrlari to'g'ri yumiradi
    it('Z15: Oltin 85.5g → floor(85.5 * 100) = 8550, * narx / 100', () => {
        const res = engine.calculate(makeInput({
            goldGrams: 85.5,
            goldPricePerGram: 100n, // Soddaligi uchun
            nisabByGold: true
        }));
        // goldValue = floor(85.5 * 100) * 100 / 100 = 8550 * 100 / 100 = 8550
        expect(res.totalAssets).toBe(8550n);
    });

});

// Property-based testlar
describe('Zakot Engine - Property-based Testlar', () => {

    function seededRNG(seed: number) {
        let s = seed;
        return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
    }

    it('ZP01: 200 random senariy — zakatDue doim >= 0', () => {
        const rng = seededRNG(77);
        for (let i = 0; i < 200; i++) {
            const cash = BigInt(Math.floor(rng() * 1_000_000_000));
            const debts = BigInt(Math.floor(rng() * 500_000_000));
            const goldGrams = rng() * 200;
            const res = engine.calculate(makeInput({ cash, debts, goldGrams }));
            expect(res.zakatDue >= 0n).toBe(true);
            expect(res.totalAssets >= 0n).toBe(true);
        }
    });

    it('ZP02: Nisob yetsa — zakatDue = zakatableAmount * 25n / 1000n', () => {
        const rng = seededRNG(88);
        for (let i = 0; i < 100; i++) {
            // Katta qiymat — nisob doim yetadi
            const cash = BigInt(Math.floor(rng() * 1_000_000_000) + 85_001_000);
            const res = engine.calculate(makeInput({ cash, nisabByGold: true }));
            if (res.nisabMet) {
                const expected = res.zakatableAmount * 25n / 1000n;
                expect(res.zakatDue).toBe(expected);
            }
        }
    });

    it('ZP03: Nisob yetmasa — zakatDue har doim 0', () => {
        const rng = seededRNG(99);
        for (let i = 0; i < 100; i++) {
            // Juda kam qiymat
            const cash = BigInt(Math.floor(rng() * 1_000)); // max 1000 tiyin
            const res = engine.calculate(makeInput({ cash, nisabByGold: true }));
            // 1000 < 85_000_000 nisob
            if (!res.nisabMet) {
                expect(res.zakatDue).toBe(0n);
            }
        }
    });

});
