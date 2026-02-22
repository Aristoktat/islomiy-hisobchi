import { Money } from './types';

export interface WillResult {
    tarika: Money;
    maxWill: Money;
    appliedWill: Money;
    netEstate: Money;
    isCapped: boolean;
}

export class WillEngine {
    calculate(totalEstate: Money, debts: Money, funeral: Money, requestedWill: Money): WillResult {
        const tarika = totalEstate - debts - funeral;
        if (tarika <= 0n) {
            return { tarika: 0n, maxWill: 0n, appliedWill: 0n, netEstate: 0n, isCapped: false };
        }

        const maxWill = tarika / 3n;
        const isCapped = requestedWill > maxWill;
        const appliedWill = isCapped ? maxWill : requestedWill;
        const netEstate = tarika - appliedWill;

        return {
            tarika,
            maxWill,
            appliedWill,
            netEstate,
            isCapped
        };
    }
}
