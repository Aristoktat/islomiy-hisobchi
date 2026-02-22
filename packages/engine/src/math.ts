import { Fraction } from './types';

/**
 * Kasrlar ustida aniq amallar (Rational Math)
 */
export class Rational {
    static reduce(f: Fraction): Fraction {
        if (f.n === 0n) return { n: 0n, d: 1n };
        const common = this.gcd(f.n < 0n ? -f.n : f.n, f.d < 0n ? -f.d : f.d);
        return { n: f.n / common, d: f.d / common };
    }

    static gcd(a: bigint, b: bigint): bigint {
        return b === 0n ? a : this.gcd(b, a % b);
    }

    static add(a: Fraction, b: Fraction): Fraction {
        const n = a.n * b.d + b.n * a.d;
        const d = a.d * b.d;
        return this.reduce({ n, d });
    }

    static multiply(f: Fraction, scalar: bigint): Fraction {
        return this.reduce({ n: f.n * scalar, d: f.d });
    }

    static divide(a: Fraction, b: Fraction): Fraction {
        return this.reduce({ n: a.n * b.d, d: a.d * b.n });
    }

    static toDecimal(f: Fraction): number {
        if (f.d === 0n) return 0;
        return Number((f.n * 10000n) / f.d) / 100;
    }
}

/**
 * Pulni taqsimlash (Largest Remainder Method)
 *
 * Muhim: fractions yig'indisi 1 ga teng bo'lishi shart emas.
 * Har bir heir o'z fraksiyasiga mos miqdorni oladi:
 *   heir_i = floor(total * frac_i)
 * Qolgan tiyin (agar bo'lsa) eng katta fractional qoldig'i bo'lganlarga beriladi.
 * Faqat ko'p heir bo'lganda qoliq paydo bo'ladi (misol: 7 / 3 odam).
 */
export function distributeMoney(total: bigint, fractions: Fraction[]): bigint[] {
    if (fractions.length === 0) return [];
    if (total === 0n) return fractions.map(() => 0n);

    // Har bir heir uchun to'liq qism (floor)
    const amounts = fractions.map(f => (total * f.n) / f.d);

    // Fractions yig'indisi (decimal jihatdan 1 bo'lishi kerak, lekin rounding bor)
    // Haqiqiy taqsimlangan = amounts.sum
    // Qolgan = round-off qoliqlar (odatda 0-N tiyin, N = fractions.length)
    const totalAssigned = amounts.reduce((a, b) => a + b, 0n);

    // Fraksiyalar yig'indisiga mos KUTILGAN jami
    const expectedTotal = total;
    let roundingRemainder = expectedTotal - totalAssigned;

    if (roundingRemainder <= 0n) return amounts;

    // Agar roundingRemainder fractions.length dan katta bo'lsa,
    // bu fraksiyalar yig'indisi 1 emas (masalan faqat er 1/2).
    // Bunday holda faqat amounts sini qaytaramiz (qolgan Bayt ul-molga).
    if (roundingRemainder >= BigInt(fractions.length)) {
        // Largest remainder method o'rniga faqat floor amounts qaytaramiz
        return amounts;
    }

    // Kichik rounding qoliqlarini taqsimlash (fractional parts bo'yicha)
    const remainders = fractions.map((f, i) => ({
        idx: i,
        rem: (total * f.n) % f.d,
        denominator: f.d
    }));

    // Eng katta fractional part birinchi (desc)
    remainders.sort((a, b) => {
        const valA = a.rem * b.denominator;
        const valB = b.rem * a.denominator;
        return valA > valB ? -1 : valA < valB ? 1 : 0;
    });

    for (let i = 0; i < Number(roundingRemainder); i++) {
        if (i < remainders.length) {
            amounts[remainders[i].idx] += 1n;
        }
    }

    return amounts;
}
