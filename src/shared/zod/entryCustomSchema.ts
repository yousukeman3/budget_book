import { z } from 'zod'
import { EntryCreateInputObjectSchema } from './generated/schemas/objects/EntryCreateInput.schema'
import { Decimal } from '@prisma/client/runtime/library'

export const EntryCreateInputWithRules = EntryCreateInputObjectSchema.superRefine((data, ctx) => {
    // 金額が正の数か
    if (data.amount <= Decimal(0)) {
        ctx.addIssue({
            path: ['amount'],
            code: z.ZodIssueCode.custom,
            message: '金額は0より大きくなければなりません',
        })
    }


    const entryType = data.typeMeta?.create?.type
    // borrow / lend のときは debtId 必須
    if ((entryType === 'borrow' || entryType === 'lend') && !data.debt) {
        ctx.addIssue({
            path: ['debt'],
            code: z.ZodIssueCode.custom,
            message: '借入／貸付のときは起点となる debt が必要です',
        })
    }

    // EntryType と DebtType の整合性（ドメインルール）

    const debtType = data.debt?.create?.type
    if (data.typeMeta?.create?.type === 'borrow' && debtType !== 'borrow') {
        ctx.addIssue({
            path: ['debt', 'create', 'type'],
            code: z.ZodIssueCode.custom,
            message: 'Entryがborrowのとき、Debtもborrowでなければなりません',
        })
    }
    if (entryType === 'lend' && debtType !== 'lend') {
        ctx.addIssue({
            path: ['debt', 'create', 'type'],
            code: z.ZodIssueCode.custom,
            message: 'Entryがlendのとき、Debtもlendでなければなりません',
        })
    }

    if (entryType === 'repayment' && debtType !== 'borrow') {
        ctx.addIssue({
            path: ['debt', 'create', 'type'],
            code: z.ZodIssueCode.custom,
            message: 'Entryがrepaymentのとき、Debtはborrowでなければなりません',
        })
    }
    
    if  (entryType === 'repaymentReceive' && debtType !== 'lend') {
        ctx.addIssue({
            path: ['debt', 'create', 'type'],
            code: z.ZodIssueCode.custom,
            message: 'EntryがrepaymentReceiveのとき、Debtはlendでなければなりません',
        })
    }
})