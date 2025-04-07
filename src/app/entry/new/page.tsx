'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createEntry } from '../actions';
import { ValidationError } from '@/shared/errors/AppError';
import { formatValidationErrors } from '@/shared/validation/validateWithSchema';

// クライアント側のZodスキーマ（サーバー側のスキーマと統合することが望ましい）
const entrySchema = z.object({
  type: z.enum(['income', 'expense', 'borrow', 'lend', 'repayment', 'repay_received', 'transfer', 'initial_balance'], {
    required_error: '種別を選択してください',
  }),
  date: z.coerce.date({
    required_error: '日付を入力してください',
    invalid_type_error: '有効な日付を入力してください',
  }),
  amount: z.number({
    required_error: '金額を入力してください',
    invalid_type_error: '数値を入力してください',
  }).positive('金額は0より大きい値を入力してください'),
  methodId: z.string({
    required_error: '支払い方法を選択してください',
  }).uuid('無効なMethodIDです'),
  categoryId: z.string().uuid('無効なCategoryIDです').optional(),
  purpose: z.string().optional(),
  privatePurpose: z.string().optional(),
  note: z.string().optional(),
  evidenceNote: z.string().optional(),
  debtId: z.string().uuid('無効なDebtIDです').optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

export default function NewEntryPage() {
  // React Hook Form の設定
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setError,
    reset 
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      type: 'expense',
      date: new Date(),
      amount: undefined,
      methodId: '',
      purpose: '',
    }
  });

  // サーバーからのエラーやシステムメッセージを管理
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // フォーム送信ハンドラー
  const onSubmit = async (data: EntryFormData) => {
    try {
      setServerError(null);
      setIsSuccess(false);
      
      const result = await createEntry(data);
      
      if (result.success) {
        // 成功時の処理
        setIsSuccess(true);
        reset(); // フォームをリセット
      } else {
        // エラー処理
        if (result.error?.code === 'VALIDATION_ERROR') {
          // バリデーションエラーをフォームフィールドに設定
          // 実際の実装ではformatValidationErrorsを使用してエラーをフィールドに割り当て
          setError('root.serverError', { 
            type: 'manual', 
            message: result.error.message 
          });
        } else if (result.error?.code === 'METHOD_ARCHIVED') {
          // ビジネスルールエラー - Method関連
          setError('methodId', { 
            type: 'manual', 
            message: result.error.message 
          });
        } else if (result.error?.code === 'DUPLICATE_ENTRY') {
          // 重複エントリエラー - 警告表示
          setServerError(result.error.message);
        } else {
          // その他のエラー
          setServerError(result.error?.message || '予期しないエラーが発生しました');
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setServerError('エラーが発生しました。再度お試しください');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">新規エントリ登録</h1>
      
      {/* 成功メッセージ */}
      {isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          エントリが正常に登録されました
        </div>
      )}
      
      {/* サーバーエラーメッセージ */}
      {serverError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {serverError}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Type フィールド */}
        <div>
          <label className="block text-sm font-medium text-gray-700">種別</label>
          <select
            {...register('type')}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="income">収入</option>
            <option value="expense">支出</option>
            <option value="borrow">借入</option>
            <option value="lend">貸付</option>
            <option value="repayment">返済</option>
            <option value="repay_received">返済受取</option>
            <option value="transfer">振替</option>
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>
        
        {/* Date フィールド */}
        <div>
          <label className="block text-sm font-medium text-gray-700">日付</label>
          <input
            type="date"
            {...register('date')}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>
        
        {/* Amount フィールド */}
        <div>
          <label className="block text-sm font-medium text-gray-700">金額</label>
          <input
            type="number"
            {...register('amount', { valueAsNumber: true })}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>
        
        {/* MethodId フィールド - 実際にはサーバーから取得したMethodのリスト */}
        <div>
          <label className="block text-sm font-medium text-gray-700">支払い方法</label>
          <select
            {...register('methodId')}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">支払い方法を選択</option>
            <option value="12345678-1234-1234-1234-123456789012">現金</option>
            <option value="87654321-4321-4321-4321-210987654321">銀行口座</option>
          </select>
          {errors.methodId && (
            <p className="mt-1 text-sm text-red-600">{errors.methodId.message}</p>
          )}
        </div>
        
        {/* Purpose フィールド */}
        <div>
          <label className="block text-sm font-medium text-gray-700">目的</label>
          <input
            type="text"
            {...register('purpose')}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          />
          {errors.purpose && (
            <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
          )}
        </div>
        
        {/* PrivatePurpose フィールド */}
        <div>
          <label className="block text-sm font-medium text-gray-700">非公開目的（任意）</label>
          <input
            type="text"
            {...register('privatePurpose')}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          />
          {errors.privatePurpose && (
            <p className="mt-1 text-sm text-red-600">{errors.privatePurpose.message}</p>
          )}
        </div>
        
        {/* Note フィールド */}
        <div>
          <label className="block text-sm font-medium text-gray-700">メモ（任意）</label>
          <textarea
            {...register('note')}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          ></textarea>
          {errors.note && (
            <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
          )}
        </div>
        
        {/* Submit ボタン */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {isSubmitting ? '送信中...' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  );
}