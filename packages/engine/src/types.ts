export type Fraction = {
    n: bigint; // surat
    d: bigint; // maxraj
};

export type Money = bigint; // so'mda (bigint)

export interface HeirInput {
    husband?: boolean;
    wifeCount?: number;
    mother?: boolean;
    father?: boolean;
    sonsCount?: number;
    daughtersCount?: number;
    siblingsCount?: number;
}

export type RuleReason = 'farz' | 'asaba' | 'aul' | 'radd' | 'blocked';

export interface HeirResult {
    type: string;
    count: number;
    shareFraction: Fraction;
    sharePercent: number;
    shareAmount: Money;
    reason: RuleReason;
    ruleId: string;
}

export interface InheritanceResult {
    netEstate: Money;
    heirs: HeirResult[];
    warnings: string[];
    errors: string[];
    trace: string[];
}
