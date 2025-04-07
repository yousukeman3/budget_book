'use server';

import { z } from 'zod';
import { validateWithSchema } from '@/shared/validation/validateWithSchema';
import { 
  BusinessRuleError, 
  NotFoundError, 
  SystemError 
} from '@/shared/errors/AppError';
import { BusinessRuleErrorCode, ResourceType, SystemErrorCode } from '@/shared/errors/errorCodes';

// Entryスキーマの仮定義（実際の実装ではzod/entrySchema.tsから読み込む）
const entrySchema = z.object({
  type: z.enum(['income', 'expense', 'borrow', 'lend', 'repayment', 'repay_received', 'transfer', 'initial_balance']),
  date: z.coerce.date(),
  amount: z.number().positive('金額は0より大きい値を入力してください'),
  methodId: z.string().uuid('無効なMethodIDです'),
  categoryId: z.string().uuid('無効なCategoryIDです').optional(),
  purpose: z.string().optional(),
  privatePurpose: z.string().optional(),
  note: z.string().optional(),
  evidenceNote: z.string().optional(),
  debtId: z.string().uuid('無効なDebtIDです').optional(),
});

// 新規エントリ作成のServer Action
export async function createEntry(formData: FormData | Record<string, unknown>) {
  try {
    // 1. バリデーション
    const data = validateWithSchema(entrySchema, formData instanceof FormData 
      ? Object.fromEntries(formData.entries()) 
      : formData);
    
    // 2. methodが存在して有効か確認（仮の実装）
    const methodExists = await checkMethodExists(data.methodId);
    
    if (!methodExists) {
      throw new NotFoundError(ResourceType.METHOD, data.methodId);
    }
    
    // 3. methodがアーカイブされていないか確認（仮の実装）
    const isMethodArchived = await isMethodArchived(data.methodId);
    
    if (isMethodArchived) {
      throw new BusinessRuleError(
        'この支払い方法は現在アーカイブされています。別の支払い方法を選択するか、設定から再有効化してください',
        BusinessRuleErrorCode.METHOD_ARCHIVED
      );
    }
    
    // 4. 重複チェック - 同日同額同目的（仮の実装）
    if (data.type !== 'transfer' && await isDuplicateEntry(data)) {
      throw new BusinessRuleError(
        '同じ日に同じ金額・目的の取引が既に登録されています。重複登録の可能性があります',
        BusinessRuleErrorCode.DUPLICATE_ENTRY
      );
    }
    
    // 5. ユースケース実行（実際はモジュール分離してドメインロジックとして実装）
    const result = await createEntryInDatabase(data);
    
    // 6. 成功レスポンス
    return { 
      success: true, 
      data: { 
        id: result.id,
        message: 'エントリが正常に作成されました'
      } 
    };
    
  } catch (error) {
    // 既知のビジネスエラーはそのまま上位に伝搬
    if (
      error instanceof BusinessRuleError ||
      error instanceof NotFoundError
    ) {
      return { 
        success: false, 
        error: {
          message: error.message,
          code: error.code
        } 
      };
    }
    
    // 未知のエラーはSystemErrorに変換し、詳細をログ出力
    console.error('Unexpected error in createEntry:', error);
    const systemError = new SystemError(
      'エントリーの登録中にエラーが発生しました。しばらく経ってからもう一度お試しください。',
      SystemErrorCode.DATABASE_ERROR,
      error
    );
    
    return { 
      success: false, 
      error: {
        message: systemError.message,
        code: systemError.code
      }
    };
  }
}

// 仮想の実装（実際にはリポジトリとインフラ層に分離）
async function checkMethodExists(methodId: string): Promise<boolean> {
  // 実際にはPrismaなどでDBクエリを実行
  return true; // 仮実装
}

async function isMethodArchived(methodId: string): Promise<boolean> {
  // 実際にはPrismaなどでDBクエリを実行
  return false; // 仮実装
}

async function isDuplicateEntry(data: z.infer<typeof entrySchema>): Promise<boolean> {
  // 実際にはPrismaなどでDBクエリを実行
  return false; // 仮実装
}

async function createEntryInDatabase(data: z.infer<typeof entrySchema>): Promise<{ id: string }> {
  // 実際にはPrismaなどでDBに保存
  return { id: crypto.randomUUID() }; // 仮実装
}