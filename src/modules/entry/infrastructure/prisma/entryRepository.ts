// filepath: /app/src/modules/entry/infrastructure/prisma/entryRepository.ts
import { PrismaClient, Entry as PrismaEntry, Prisma } from '@prisma/client';
import { Entry } from '../../domain/entry';
import { EntryType } from '../../../../shared/types/entry.types';
import { EntryRepository, EntrySearchOptions } from '../../domain/entryRepository';
import { NotFoundError, SystemError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { ResourceType, SystemErrorCode, BusinessRuleErrorCode } from '../../../../shared/errors/ErrorCodes';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PrismaによるEntryRepositoryの実装
 */
export class PrismaEntryRepository implements EntryRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * PrismaのEntryモデルをドメインモデルに変換する
   */
  private toDomainModel(prismaEntry: PrismaEntry): Entry {
    return new Entry(
      prismaEntry.id,
      prismaEntry.type as EntryType,
      prismaEntry.date,
      prismaEntry.amount,
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
   */
  private handlePrismaError(error: any, resourceId?: string): never {
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
          in: options.types as EntryType[]
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
   */
  async create(entry: Entry): Promise<Entry> {
    try {
      // 同じ日付・金額・目的の重複チェック（任意の実装）
      const possibleDuplicate = await this.prisma.entry.findFirst({
        where: {
          date: entry.date,
          amount: entry.amount,
          methodId: entry.methodId,
          purpose: entry.purpose,
          // 同じtypeの場合のみ重複とみなす
          type: entry.type
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
          type: entry.type,
          date: entry.date,
          amount: entry.amount,
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
          type: entry.type,
          date: entry.date,
          amount: entry.amount,
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
   * 日付範囲内のEntryの合計を計算
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