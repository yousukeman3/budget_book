// filepath: /app/src/modules/entry/infrastructure/prisma/entryRepository.ts
import { PrismaClient, Entry as PrismaEntry, Prisma } from '@prisma/client';
import { Entry, EntryType } from '../../domain/entry';
import { EntryRepository, EntrySearchOptions } from '../../domain/entryRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';
import { ResourceType } from '../../../../shared/errors/ErrorCodes';
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
   * IDによるEntry検索
   */
  async findById(id: string): Promise<Entry | undefined> {
    const entry = await this.prisma.entry.findUnique({
      where: { id }
    });

    return entry ? this.toDomainModel(entry) : undefined;
  }

  /**
   * 検索オプションによるEntry検索
   */
  async findByOptions(options: EntrySearchOptions): Promise<Entry[]> {
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
  }

  /**
   * 特定の支払い方法に関連するEntryを取得
   */
  async findByMethodId(methodId: string): Promise<Entry[]> {
    const entries = await this.prisma.entry.findMany({
      where: { methodId },
      orderBy: { date: 'desc' }
    });

    return entries.map(entry => this.toDomainModel(entry));
  }

  /**
   * 特定のカテゴリに関連するEntryを取得
   */
  async findByCategoryId(categoryId: string): Promise<Entry[]> {
    const entries = await this.prisma.entry.findMany({
      where: { categoryId },
      orderBy: { date: 'desc' }
    });

    return entries.map(entry => this.toDomainModel(entry));
  }

  /**
   * 特定のDebtに関連するEntryを取得
   */
  async findByDebtId(debtId: string): Promise<Entry[]> {
    const entries = await this.prisma.entry.findMany({
      where: { debtId },
      orderBy: { date: 'desc' }
    });

    return entries.map(entry => this.toDomainModel(entry));
  }

  /**
   * 新しいEntryを作成
   */
  async create(entry: Entry): Promise<Entry> {
    const createdEntry = await this.prisma.entry.create({
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
        // createdAtはDBのデフォルト値を使用
      }
    });

    return this.toDomainModel(createdEntry);
  }

  /**
   * 既存のEntryを更新
   */
  async update(entry: Entry): Promise<Entry> {
    try {
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // レコードが見つからない場合のエラー
        throw new NotFoundError(ResourceType.ENTRY, entry.id);
      }
      throw error;
    }
  }

  /**
   * Entryを削除
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.entry.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // レコードが見つからない場合はfalseを返す
        return false;
      }
      throw error;
    }
  }

  /**
   * 日付範囲内のEntryの合計を計算
   */
  async calculateBalance(methodId: string, startDate: Date, endDate: Date): Promise<Decimal> {
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
  }
}