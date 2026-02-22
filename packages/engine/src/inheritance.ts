import { HeirInput, InheritanceResult, HeirResult, Fraction, Money } from './types';
import { Rational, distributeMoney } from './math';

interface CalcResult {
    heirs: HeirResult[];
    trace: string[];
    warnings: string[];
}

export class InheritanceEngine {
    calculate(netEstate: Money, input: HeirInput): InheritanceResult {
        const result: InheritanceResult = {
            netEstate,
            heirs: [],
            warnings: [],
            errors: [],
            trace: []
        };

        try {
            this.validate(input, result);
            if (result.errors.length > 0) return result;
            if (netEstate === 0n) return result;

            const calc = this.computeShares(input);
            result.trace = calc.trace;
            result.warnings = calc.warnings;

            if (calc.heirs.length === 0) {
                result.warnings.push("Hech qanday merosxo'r topilmadi.");
                return result;
            }

            const moneyDist = distributeMoney(netEstate, calc.heirs.map(s => s.shareFraction));
            result.heirs = calc.heirs.map((s, i) => ({
                ...s,
                sharePercent: Rational.toDecimal(s.shareFraction),
                shareAmount: moneyDist[i]
            }));
        } catch (e: any) {
            result.errors.push(`Kutilmagan xato: ${e.message}`);
        }
        return result;
    }

    private validate(input: HeirInput, result: InheritanceResult) {
        if (input.husband && (input.wifeCount ?? 0) > 0)
            result.errors.push("Ham er, ham xotin bir vaqtda bo'lishi mumkin emas.");
        if ((input.wifeCount ?? 0) > 4)
            result.errors.push("Xotinlar soni 4 tadan ko'p bo'lishi mumkin emas.");
        if ((input.sonsCount ?? 0) < 0 || (input.daughtersCount ?? 0) < 0 || (input.wifeCount ?? 0) < 0)
            result.errors.push("Salbiy son kiritib bo'lmaydi.");
    }

    private computeShares(input: HeirInput): CalcResult {
        const trace: string[] = [];
        const warnings: string[] = [];
        const hasDescendants = (input.sonsCount ?? 0) > 0 || (input.daughtersCount ?? 0) > 0;
        const hasSons = (input.sonsCount ?? 0) > 0;
        const hasDaughters = (input.daughtersCount ?? 0) > 0;

        // ── A) FIXED (Farz) ulushlar ────────────────────────────
        const fixed: HeirResult[] = [];

        if (input.husband) {
            fixed.push(this.h('Er', 1, 'S1', 'farz',
                hasDescendants ? { n: 1n, d: 4n } : { n: 1n, d: 2n }));
        }
        if ((input.wifeCount ?? 0) > 0) {
            fixed.push(this.h('Xotin(lar)', input.wifeCount!, 'S2', 'farz',
                hasDescendants ? { n: 1n, d: 8n } : { n: 1n, d: 4n }));
        }
        if (input.mother) {
            fixed.push(this.h('Ona', 1, 'M1', 'farz', this.motherShare(input, trace)));
        }
        if (input.father && hasDescendants) {
            fixed.push(this.h('Ota', 1, 'F1', 'farz', { n: 1n, d: 6n }));
        }
        if (!hasSons && hasDaughters) {
            const qizF = (input.daughtersCount ?? 0) === 1
                ? { n: 1n, d: 2n } : { n: 2n, d: 3n };
            fixed.push(this.h('Qiz(lar)', input.daughtersCount!, 'C1', 'farz', qizF));
        }

        // ── B) Yig'indi tekshiruv ──────────────────────────────
        const totalFixed = fixed.reduce((s, h) => Rational.add(s, h.shareFraction), { n: 0n, d: 1n });

        // AUL: jami > 1
        if (totalFixed.n > totalFixed.d) {
            trace.push("Aul holati: ulushlar yig'indisi 1 dan katta, proportsional kamaytirildi.");
            return {
                heirs: fixed.map(s => ({
                    ...s,
                    shareFraction: Rational.reduce(Rational.divide(s.shareFraction, totalFixed)),
                    reason: 'aul' as const
                })),
                trace,
                warnings
            };
        }

        // Qolganini hisoblash
        const rem = Rational.reduce({ n: totalFixed.d - totalFixed.n, d: totalFixed.d });
        if (rem.n === 0n) return { heirs: fixed, trace, warnings };

        // ── C) ASABA ──────────────────────────────────────────
        // 1: O'g'illar (va qizlar 2:1 bilan)
        if (hasSons) {
            trace.push("Asaba: o'g'il(lar) qolgan ulushni oladi (2:1 nisbat).");
            const sons = input.sonsCount!;
            const daughters = input.daughtersCount ?? 0;
            const units = BigInt(sons * 2 + daughters);
            const unitF = Rational.divide(rem, { n: units, d: 1n });
            const all = [...fixed];
            all.push(this.h("O'g'il(lar)", sons, 'A1', 'asaba',
                Rational.reduce({ n: unitF.n * BigInt(sons * 2), d: unitF.d })));
            if (daughters > 0) {
                all.push(this.h('Qiz(lar)', daughters, 'A2', 'asaba',
                    Rational.reduce({ n: unitF.n * BigInt(daughters), d: unitF.d })));
            }
            return { heirs: all, trace, warnings };
        }

        // 2: Ota asaba (farzandsiz)
        if (input.father && !hasDescendants) {
            trace.push("Asaba: ota (farzand yo'q) qolgan ulushni oladi.");
            return { heirs: [...fixed, this.h('Ota', 1, 'A3', 'asaba', rem)], trace, warnings };
        }

        // 3: Ota asaba (faqat qizlar bilan)
        if (input.father && !hasSons && hasDaughters) {
            trace.push("Asaba: ota qizlar bilan birga qolgan ulushni oladi.");
            const all = [...fixed];
            const idx = all.findIndex(h => h.type === 'Ota');
            if (idx >= 0) {
                all[idx] = {
                    ...all[idx],
                    shareFraction: Rational.reduce(Rational.add(all[idx].shareFraction, rem)),
                    reason: 'asaba'
                };
            } else {
                all.push(this.h('Ota', 1, 'A4', 'asaba', rem));
            }
            return { heirs: all, trace, warnings };
        }

        // ── D) RADD ────────────────────────────────────────────
        // Hanafiy: turmush o'rtoq Radd olmaydi
        const nonSpouse = fixed.filter(h => h.type !== 'Er' && h.type !== 'Xotin(lar)');

        if (nonSpouse.length === 0) {
            // Faqat er yoki xotin — qolgan Bayt ul-molga
            warnings.push("Boshqa merosxo'r yo'q. Qolgan ulush Bayt ul-molga (xazinaga) o'tadi.");
            return { heirs: fixed, trace, warnings };
        }

        trace.push("Radd holati: qolgan ulush er/xotindan tashqari merosxo'rlarga qaytarildi.");
        const nonSpouseTotal = nonSpouse.reduce((s, h) => Rational.add(s, h.shareFraction), { n: 0n, d: 1n });

        const raddHeirs = fixed.map(h => {
            if (h.type === 'Er' || h.type === 'Xotin(lar)') return h;
            const proportion = Rational.divide(h.shareFraction, nonSpouseTotal);
            const raddN = proportion.n * rem.n;
            const raddD = proportion.d * rem.d;
            const finalF = Rational.reduce({
                n: h.shareFraction.n * raddD + raddN * h.shareFraction.d,
                d: h.shareFraction.d * raddD
            });
            return { ...h, shareFraction: finalF, reason: 'radd' as const };
        });

        return { heirs: raddHeirs, trace, warnings };
    }

    private motherShare(input: HeirInput, trace: string[]): Fraction {
        const hasDescendants = (input.sonsCount ?? 0) > 0 || (input.daughtersCount ?? 0) > 0;
        if (hasDescendants) return { n: 1n, d: 6n };
        if ((input.siblingsCount ?? 0) >= 2) return { n: 1n, d: 6n };

        const hasSpouse = input.husband || (input.wifeCount ?? 0) > 0;
        if (hasSpouse && input.father) {
            trace.push("Umariyyatayn qoidasi qo'llandi.");
            const spouseF = input.husband ? { n: 1n, d: 2n } : { n: 1n, d: 4n };
            const remN = spouseF.d - spouseF.n;
            return Rational.reduce({ n: remN, d: spouseF.d * 3n });
        }
        return { n: 1n, d: 3n };
    }

    private h(type: string, count: number, ruleId: string, reason: HeirResult['reason'], f: Fraction): HeirResult {
        return { type, count, ruleId, reason, shareFraction: Rational.reduce(f), sharePercent: 0, shareAmount: 0n };
    }
}
