// filepath: /app/src/modules/entry/infrastructure/prisma/debtRepository.ts
import { PrismaClient, Debt as PrismaDebt, Prisma } from '@prisma/client';
import { Debt, DebtType } from '../../domain/entry';
import { DebtRepository, DebtSearchOptions } from '../../domain/debtRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';
import { ResourceType } from '../../../../shared/errors/ErrorCodes';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PrismaによるDebtRepositoryの実装
 */
export class PrismaDebtRepository implements DebtRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * PrismaのDebtモデルをドメインモデルに変換する
   */
  private toDomainModel(prismaDebt: PrismaDebt): Debt {
    return new Debt(
      prismaDebt.id,
      prismaDebt.type as DebtType,
      prismaDebt.rootEntryId,
      prismaDebt.date,
      prismaDebt.amount,
      prismaDebt.counterpart,
      prismaDebt.repaidAt ?? undefined,
      prismaDebt.memo ?? undefined
    );
  }

  /**
   * IDによるDebt検索
   */
  async findById(id: string): Promise<Debt | undefined> {
    const debt = await this.prisma.debt.findUnique({
      where: { id }
    });

    return debt ? this.toDomainModel(debt) : undefined;
  }

  /**
   * 検索オプションによるDebt検索
   */
  async findByOptions(options: DebtSearchOptions): Promise<Debt[]> {
    // 検索条件の構築
    const where: Prisma.DebtWhereInput = {};

    // タイプフィルタ
    if (options.type) {
      where.type = options.type as DebtType;
    }

    // 取引先フィルタ
    if (options.counterpart) {
      where.counterpart = {
        contains: options.counterpart
      };
    }

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

    // 返済状態フィルタ
    if (options.isRepaid !== undefined) {
      if (options.isRepaid) {
        where.repaidAt = { not: null };
      } else {
        where.repaidAt = null;
      }
    }

    // ソート条件と制限
    const orderBy = options.sortBy 
      ? { [options.sortBy]: options.sortDirection || 'desc' }
      : { date: 'desc' as const };

    const debts = await this.prisma.debt.findMany({
      where,
      orderBy,
      skip: options.offset || 0,
      take: options.limit || 100,
    });

    return debts.map(debt => this.toDomainModel(debt));
  }

  /**
   * 特定のルートエントリに関連するDebtを取得
   */
  async findByRootEntryId(rootEntryId: string): Promise<Debt | undefined> {
    const debt = await this.prisma.debt.findUnique({
      where: { rootEntryId }
    });

    return debt ? this.toDomainModel(debt) : undefined;
  }

  /**
   * 返済が完了していないDebtを検索
   */
  async findOutstandingDebts(type?: string): Promise<Debt[]> {
    const where: Prisma.DebtWhereInput = {
      repaidAt: null
    };

    if (type) {
      where.type = type as DebtType;
    }

    const debts = await this.prisma.debt.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    return debts.map(debt => this.toDomainModel(debt));
  }

  /**
   * 新しいDebtを作成
   */
  async create(debt: Debt): Promise<Debt> {
    const createdDebt = await this.prisma.debt.create({
      data: {
        type: debt.type,
        rootEntryId: debt.rootEntryId,
        date: debt.date,
        amount: debt.amount,
        counterpart: debt.counterpart,
        repaidAt: debt.repaidAt,
        memo: debt.memo
      }
    });

    return this.toDomainModel(createdDebt);
  }

  /**
   * 既存のDebtを更新
   */
  async update(debt: Debt): Promise<Debt> {
    try {
      const updatedDebt = await this.prisma.debt.update({
        where: { id: debt.id },
        data: {
          type: debt.type,
          rootEntryId: debt.rootEntryId,
          date: debt.date,
          amount: debt.amount,
          counterpart: debt.counterpart,
          repaidAt: debt.repaidAt,
          memo: debt.memo
        }
      });

      return this.toDomainModel(updatedDebt);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // レコードが見つからない場合のエラー
        throw new NotFoundError(ResourceType.DEBT, debt.id);
      }
      throw error;
    }
  }

  /**
   * Debtを完済状態に更新する
   */
  async markAsRepaid(id: string, repaidAt: Date): Promise<Debt> {
    try {
      const updatedDebt = await this.prisma.debt.update({
        where: { id },
        data: { repaidAt }
      });

      return this.toDomainModel(updatedDebt);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError(ResourceType.DEBT, id);
      }
      throw error;
    }
  }

  /**
   * Debtを削除
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.debt.delete({
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
}