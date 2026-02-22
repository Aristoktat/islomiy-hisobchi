import { Money } from './types';

export interface ZakatInput {
    cash: Money;
    goldGrams: number;
    silverGrams: number;
    tradeGoods: Money;
    receivables: Money; // undirilishi kutilayotgan qarzlar
    debts: Money;       // to'lanishi kerak bo'lgan qarzlar
    goldPricePerGram: Money;
    silverPricePerGram: Money;
    nisabByGold: boolean; // true: oltin nisobi, false: kumush nisobi
}

export interface ZakatResult {
    totalAssets: Money;
    zakatableAmount: Money;
    nisabMet: boolean;
    zakatDue: Money;
    nisabValue: Money;
}

export class ZakatEngine {
    calculate(input: ZakatInput): ZakatResult {
        const goldValue = BigInt(Math.floor(input.goldGrams * 100)) * input.goldPricePerGram / 100n;
        const silverValue = BigInt(Math.floor(input.silverGrams * 100)) * input.silverPricePerGram / 100n;

        const totalAssets = input.cash + goldValue + silverValue + input.tradeGoods + input.receivables;
        const zakatableAmount = totalAssets - input.debts;

        const goldNisab = 85n * input.goldPricePerGram; // 85g gold
        const silverNisab = 595n * input.silverPricePerGram; // 595g silver
        const nisabValue = input.nisabByGold ? goldNisab : silverNisab;

        const nisabMet = zakatableAmount >= nisabValue;
        const zakatDue = nisabMet ? (zakatableAmount * 25n / 1000n) : 0n; // 2.5%

        return {
            totalAssets,
            zakatableAmount,
            nisabMet,
            zakatDue,
            nisabValue
        };
    }
}
