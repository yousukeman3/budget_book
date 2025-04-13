// filepath: /app/src/modules/entry/infrastructure/prisma/entryRepository.ts
import { Prisma } from '@prisma/client';
import type { PrismaClient, Entry as PrismaEntry, EntryType as PrismaEntryType } from '@prisma/client';
import { Entry } from '../../domain/entry';
import type { EntryType } from '../../../../shared/types/entry.types';
import type { EntryRepository, EntrySearchOptions } from '../../domain/entryRepository';
import { NotFoundError, SystemError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { ResourceType, SystemErrorCode, BusinessRuleErrorCode } from '../../../../shared/errors/ErrorCodes';
import { Decimal, fromPrismaDecimal, toPrismaDecimal } from '../../../../shared/utils/decimal';

/**
 * PrismaによるEntryRepositoryの実装
 * 
 * 収支記録（Entry）のリポジトリインターフェースをPrismaを用いて実装したクラス。
 * データベースとドメインモデルの変換ロジックを担当し、エラーハンドリング戦略に基づく
 * 適切なエラー変換も行う。
 */
export class PrismaEntryRepository implements EntryRepository {
  /**
   * コンストラクタ
   * 
   * @param prisma - Prismaクライアントインスタンス
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * PrismaのEntryモデルをドメインモデルに変換する
   * 
   * @param prismaEntry - Prismaから取得したEntryモデル
   * @returns ドメイン層のEntryモデル
   */
  private toDomainModel(prismaEntry: PrismaEntry): Entry {
    return new Entry(
      prismaEntry.id,
      prismaEntry.type as EntryType,
      prismaEntry.date,
      fromPrismaDecimal(prismaEntry.amount), // Prisma Decimalからdecimal.jsのDecimalに変換
      prismaEntry.methodId,
      prismaEntry.categoryId ?? undefined,
      prismaEntry.purpose ?? undefined,
      prismaEntry.privatePurpose ?? undefined,
      prismaEntry.note ?? undefined,
      prismaEntry.evidenceNote ?? undefined,
      prismaEntry.debtId ?? undefined,
      prismaEntry.createdAt
    );
  }

  /**
   * Prismaエラーを適切なアプリケーションエラーに変換する
   * 
   * @param error - 発生したPrismaエラーまたはその他の例外
   * @param resourceId - 関連するリソースID（存在する場合）
   * @throws {@link NotFoundError} - リソースが見つからない場合
   * @throws {@link BusinessRuleError} - ビジネスルール違反の場合
   * @throws {@link SystemError} - システムエラーの場合
   */
  private handlePrismaError(error: unknown, resourceId?: string): never {
    // Prisma固有のエラー処理
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // レコードが見つからない場合
      if (error.code === 'P2025') {
        throw new NotFoundError(ResourceType.ENTRY, resourceId);
      }
      // 外部キー制約違反
      else if (error.code === 'P2003') {
        const target = (error.meta?.target as string) || '関連リソース';
        throw new BusinessRuleError(
          `関連する${target}が存在しません`,
          BusinessRuleErrorCode.INVALID_VALUE_COMBINATION,
          { resourceId, target, originalError: error }
        );
      }
      // 一意制約違反
      else if (error.code === 'P2002') {
        throw new BusinessRuleError(
          '同一の記録がすでに存在します',
          BusinessRuleErrorCode.DUPLICATE_ENTRY,
          { resourceId, originalError: error }
        );
      }
    }
    
    // その他のデータベースエラー
    throw new SystemError(
      'データベース操作中にエラーが発生しました',
      SystemErrorCode.DATABASE_ERROR,
      error
    );
  }

  /**
   * IDによるEntry検索
   * 
   * @param id - 検索対象のEntryのID
   * @returns 見つかったEntryオブジェクト、見つからない場合はundefined
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findById(id: string): Promise<Entry | undefined> {
    try {
      const entry = await this.prisma.entry.findUnique({
        where: { id }
      });

      return entry ? this.toDomainModel(entry) : undefined;
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * 検索オプションによるEntry検索
   * 
   * @param options - 検索条件（日付範囲、タイプ、支払い方法IDなど）
   * @returns 条件に合致するEntryオブジェクトの配列
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findByOptions(options: EntrySearchOptions): Promise<Entry[]> {
    try {
      // 検索条件の構築
      const where: Prisma.EntryWhereInput = {};

      // 日付範囲
      if (options.startDate || options.endDate) {
        where.date = {};
        if (options.startDate) {
          where.date.gte = options.startDate;
        }
        if (options.endDate) {
          where.date.lte = options.endDate;
        }
      }

      // タイプフィルタ
      if (options.types && options.types.length > 0) {
        where.type = {
          in: options.types as PrismaEntryType[]
        };
      }

      // 支払い方法フィルタ
      if (options.methodIds && options.methodIds.length > 0) {
        where.methodId = {
          in: options.methodIds
        };
      }

      // カテゴリフィルタ
      if (options.categoryIds && options.categoryIds.length > 0) {
        where.categoryId = {
          in: options.categoryIds
        };
      }

      // 貸借ID
      if (options.debtId) {
        where.debtId = options.debtId;
      }

      // プライベート目的含めるかどうか
      if (!options.includePrivate) {
        where.privatePurpose = null;
      }

      // ソート条件と制限
      const orderBy = options.sortBy 
        ? { [options.sortBy]: options.sortDirection || 'desc' }
        : { date: 'desc' as const };

      const entries = await this.prisma.entry.findMany({
        where,
        orderBy,
        skip: options.offset || 0,
        take: options.limit || 100,
      });

      return entries.map(entry => this.toDomainModel(entry));
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * 特定の支払い方法に関連するEntryを取得
   * 
   * @param methodId - 対象の支払い方法ID
   * @returns 関連するEntryオブジェクトの配列
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findByMethodId(methodId: string): Promise<Entry[]> {
    try {
      const entries = await this.prisma.entry.findMany({
        where: { methodId },
        orderBy: { date: 'desc' }
      });

      return entries.map(entry => this.toDomainModel(entry));
    } catch (error) {
      this.handlePrismaError(error, methodId);
    }
  }

  /**
   * 特定のカテゴリに関連するEntryを取得
   * 
   * @param categoryId - 対象のカテゴリID
   * @returns 関連するEntryオブジェクトの配列
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findByCategoryId(categoryId: string): Promise<Entry[]> {
    try {
      const entries = await this.prisma.entry.findMany({
        where: { categoryId },
        orderBy: { date: 'desc' }
      });

      return entries.map(entry => this.toDomainModel(entry));
    } catch (error) {
      this.handlePrismaError(error, categoryId);
    }
  }

  /**
   * 特定のDebtに関連するEntryを取得
   * 
   * @param debtId - 対象の借金/貸付ID
   * @returns 関連するEntryオブジェクトの配列（借入・貸付・返済など）
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findByDebtId(debtId: string): Promise<Entry[]> {
    try {
      const entries = await this.prisma.entry.findMany({
        where: { debtId },
        orderBy: { date: 'desc' }
      });

      return entries.map(entry => this.toDomainModel(entry));
    } catch (error) {
      this.handlePrismaError(error, debtId);
    }
  }

  /**
   * 新しいEntryを作成
   * 
   * @param entry - 作成するEntryオブジェクト
   * @returns 作成されたEntryオブジェクト（IDが割り当てられている）
   * @throws {@link BusinessRuleError} - 重複エントリの可能性がある場合
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async create(entry: Entry): Promise<Entry> {
    try {
      // 同じ日付・金額・目的の重複チェック（任意の実装）
      const possibleDuplicate = await this.prisma.entry.findFirst({
        where: {
          date: entry.date,
          amount: toPrismaDecimal(entry.amount), // decimal.jsのDecimalからPrisma Decimalに変換
          methodId: entry.methodId,
          purpose: entry.purpose,
          // 同じtypeの場合のみ重複とみなす
          type: entry.type as PrismaEntryType
        }
      });

      if (possibleDuplicate) {
        throw new BusinessRuleError(
          '同じ内容のエントリがすでに存在する可能性があります',
          BusinessRuleErrorCode.DUPLICATE_ENTRY,
          {
            existingEntryId: possibleDuplicate.id,
            date: entry.date,
            amount: entry.amount.toString()
          }
        );
      }

      const createdEntry = await this.prisma.entry.create({
        data: {
          id: entry.id, // IDを明示的に指定
          type: entry.type as PrismaEntryType,
          date: entry.date,
          amount: toPrismaDecimal(entry.amount), // decimal.jsのDecimalからPrisma Decimalに変換
          methodId: entry.methodId,
          categoryId: entry.categoryId,
          purpose: entry.purpose,
          privatePurpose: entry.privatePurpose,
          note: entry.note,
          evidenceNote: entry.evidenceNote,
          debtId: entry.debtId,
          createdAt: entry.createdAt
        }
      });

      return this.toDomainModel(createdEntry);
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        throw error; // BusinessRuleErrorはそのままスロー
      }
      this.handlePrismaError(error);
    }
  }

  /**
   * 既存のEntryを更新
   * 
   * @param entry - 更新するEntryオブジェクト
   * @returns 更新されたEntryオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのEntryが存在しない場合
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async update(entry: Entry): Promise<Entry> {
    try {
      // 対象のエントリが存在するか確認
      const existingEntry = await this.prisma.entry.findUnique({
        where: { id: entry.id }
      });
      
      if (!existingEntry) {
        throw new NotFoundError(ResourceType.ENTRY, entry.id);
      }

      const updatedEntry = await this.prisma.entry.update({
        where: { id: entry.id },
        data: {
          type: entry.type as PrismaEntryType,
          date: entry.date,
          amount: toPrismaDecimal(entry.amount), // decimal.jsのDecimalからPrisma Decimalに変換
          methodId: entry.methodId,
          categoryId: entry.categoryId,
          purpose: entry.purpose,
          privatePurpose: entry.privatePurpose,
          note: entry.note,
          evidenceNote: entry.evidenceNote,
          debtId: entry.debtId,
          // createdAtは更新不可
        }
      });

      return this.toDomainModel(updatedEntry);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error; // NotFoundErrorはそのままスロー
      }
      this.handlePrismaError(error, entry.id);
    }
  }

  /**
   * Entryを削除
   * 
   * @param id - 削除するEntryのID
   * @returns 削除が成功した場合はtrue、対象が存在しない場合はfalse
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async delete(id: string): Promise<boolean> {
    try {
      // 削除前にエントリが存在するか確認
      const existingEntry = await this.prisma.entry.findUnique({
        where: { id }
      });
      
      if (!existingEntry) {
        return false; // 存在しない場合はfalseを返す
      }

      await this.prisma.entry.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      // 特別な処理が必要なビジネスルールエラーがあれば、ここで処理
      this.handlePrismaError(error, id);
    }
  }

  /**
   * 日付範囲内のEntryの合計残高を計算
   * 
   * @param methodId - 対象の支払い方法ID
   * @param startDate - 開始日
   * @param endDate - 終了日
   * @returns 期間内のエントリによる残高への影響額合計
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async calculateBalance(methodId: string, startDate: Date, endDate: Date): Promise<Decimal> {
    try {
      // 対象期間内のすべてのエントリーを取得
      const entries = await this.prisma.entry.findMany({
        where: {
          methodId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // ドメインモデルに変換してからバランス計算
      return entries
        .map(entry => this.toDomainModel(entry))
        .reduce((balance, entry) => {
          return balance.plus(entry.getBalanceImpact());
        }, new Decimal(0));
    } catch (error) {
      this.handlePrismaError(error, methodId);
    }
  }
}