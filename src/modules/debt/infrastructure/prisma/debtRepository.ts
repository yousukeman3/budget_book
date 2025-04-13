import { Prisma } from '@prisma/client';
import type { PrismaClient, Debt as PrismaDebt } from '@prisma/client';
import { Debt } from '../../domain/debt';
import type { DebtRepository, DebtSearchOptions } from '../../domain/debtRepository';
import type { DebtType } from '../../../../shared/types/debt.types';
import { fromPrismaDecimal, toPrismaDecimal } from '../../../../shared/utils/decimal';

/**
 * PrismaによるDebtRepositoryの実装
 * 
 * 貸借管理（Debt）のリポジトリインターフェースをPrismaを用いて実装したクラス。
 * データベースとドメインモデルの変換ロジックを担当する。
 */
export class PrismaDebtRepository implements DebtRepository {
  /**
   * コンストラクタ
   * 
   * @param prisma - Prismaクライアントインスタンス
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * PrismaのDebtモデルをドメインモデルに変換する
   * 
   * @param prismaDebt - Prismaから取得したDebtモデル
   * @returns ドメイン層のDebtモデル
   */
  private toDomainModel(prismaDebt: PrismaDebt): Debt {
    return new Debt(
      prismaDebt.id,
      prismaDebt.type as DebtType,
      prismaDebt.rootEntryId,
      prismaDebt.date,
      fromPrismaDecimal(prismaDebt.amount), // Prisma DecimalからDecimal.jsに変換
      prismaDebt.counterpart,
      prismaDebt.repaidAt ?? undefined,
      prismaDebt.memo ?? undefined
    );
  }

  /**
   * IDによるDebt検索
   * 
   * @param id - 検索対象のDebtのID
   * @returns 見つかったDebtオブジェクト、見つからない場合はundefined
   */
  async findById(id: string): Promise<Debt | undefined> {
    const debt = await this.prisma.debt.findUnique({
      where: { id }
    });

    return debt ? this.toDomainModel(debt) : undefined;
  }

  /**
   * 検索オプションによるDebt検索
   * 
   * @param options - 検索条件オプション
   * @returns 条件に合致するDebtオブジェクトの配列
   */
  async findByOptions(options: DebtSearchOptions): Promise<Debt[]> {
    // 検索条件の構築
    const where: Prisma.DebtWhereInput = {};

    // タイプフィルタ
    if (options.type) {
      where.type = options.type;
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
   * 
   * @param rootEntryId - 対象のEntryのID
   * @returns 関連するDebtオブジェクト、見つからない場合はundefined
   */
  async findByRootEntryId(rootEntryId: string): Promise<Debt | undefined> {
    const debt = await this.prisma.debt.findUnique({
      where: { rootEntryId }
    });

    return debt ? this.toDomainModel(debt) : undefined;
  }

  /**
   * 返済が完了していないDebtを検索
   * 
   * @param type - オプションで指定する貸借タイプ
   * @returns 返済未完了のDebtオブジェクトの配列
   */
  async findOutstandingDebts(type?: DebtType): Promise<Debt[]> {
    const where: Prisma.DebtWhereInput = {
      repaidAt: null
    };

    if (type) {
      where.type = type;
    }

    const debts = await this.prisma.debt.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    return debts.map(debt => this.toDomainModel(debt));
  }

  /**
   * 新しいDebtを作成
   * 
   * @param debt - 作成するDebtオブジェクト
   * @returns 作成されたDebtオブジェクト（IDが割り当てられている）
   */
  async create(debt: Debt): Promise<Debt> {
    const createdDebt = await this.prisma.debt.create({
      data: {
        type: debt.type,
        rootEntryId: debt.rootEntryId,
        date: debt.date,
        amount: toPrismaDecimal(debt.amount), // Decimal.jsからPrisma Decimalに変換
        counterpart: debt.counterpart,
        repaidAt: debt.repaidAt,
        memo: debt.memo
      }
    });

    return this.toDomainModel(createdDebt);
  }

  /**
   * 既存のDebtを更新
   * 
   * @param debt - 更新するDebtオブジェクト
   * @returns 更新されたDebtオブジェクト
   * @throws {@link Error} - 指定したIDのDebtが存在しない場合
   */
  async update(debt: Debt): Promise<Debt> {
    try {
      const updatedDebt = await this.prisma.debt.update({
        where: { id: debt.id },
        data: {
          type: debt.type,
          rootEntryId: debt.rootEntryId,
          date: debt.date,
          amount: toPrismaDecimal(debt.amount), // Decimal.jsからPrisma Decimalに変換
          counterpart: debt.counterpart,
          repaidAt: debt.repaidAt,
          memo: debt.memo
        }
      });

      return this.toDomainModel(updatedDebt);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error(`Debt with ID ${debt.id} not found.`);
      }
      throw error;
    }
  }

  /**
   * Debtを完済状態に更新する
   * 
   * @param id - 完済に設定するDebtのID
   * @param repaidAt - 返済完了日
   * @returns 更新されたDebtオブジェクト
   * @throws {@link Error} - 指定したIDのDebtが存在しない場合
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
        throw new Error(`Debt with ID ${id} not found.`);
      }
      throw error;
    }
  }

  /**
   * Debtを削除
   * 
   * @param id - 削除するDebtのID
   * @returns 削除が成功した場合はtrue
   * @throws {@link Error} - 指定したIDのDebtが存在しない場合
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.debt.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error(`Debt with ID ${id} not found.`);
      }
      throw error;
    }
  }
}