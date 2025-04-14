import { Prisma } from '@prisma/client';
import type { PrismaClient, Debt as PrismaDebt } from '@prisma/client';
import { Debt } from '../../domain/debt';
import type { DebtRepository, DebtSearchOptions } from '../../domain/debtRepository';
import type { DebtType } from '../../../../shared/types/debt.types';
import { fromPrismaDecimal, toPrismaDecimal } from '../../../../shared/utils/decimal';
import { ZodValidator } from '../../../../shared/validation/ZodValidator';
import { DebtSchema, DebtRepaymentSchema } from '../../../../shared/zod/schema/DebtSchema';
import { NotFoundError, SystemError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { ResourceType, SystemErrorCode, BusinessRuleErrorCode } from '../../../../shared/errors/ErrorCodes';

/**
 * PrismaによるDebtRepositoryの実装
 * 
 * 貸借管理（Debt）のリポジトリインターフェースをPrismaを用いて実装したクラス。
 * データベースとドメインモデルの変換ロジックを担当し、エラーハンドリング戦略に基づく
 * 適切なエラー変換も行う。
 */
export class PrismaDebtRepository implements DebtRepository {
  // Zodスキーマを使用したバリデータのインスタンス
  private debtValidator = new ZodValidator(DebtSchema);
  private debtRepaymentValidator = new ZodValidator(DebtRepaymentSchema);
  
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
      prismaDebt.memo ?? undefined,
      this.debtValidator // バリデータを注入
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
        throw new NotFoundError(ResourceType.DEBT, resourceId);
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
          '同一のルートエントリIDを持つ貸借がすでに存在します',
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
   * IDによるDebt検索
   * 
   * @param id - 検索対象のDebtのID
   * @returns 見つかったDebtオブジェクト、見つからない場合はundefined
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findById(id: string): Promise<Debt | undefined> {
    try {
      const debt = await this.prisma.debt.findUnique({
        where: { id }
      });

      return debt ? this.toDomainModel(debt) : undefined;
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * 検索オプションによるDebt検索
   * 
   * @param options - 検索条件オプション
   * @returns 条件に合致するDebtオブジェクトの配列
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findByOptions(options: DebtSearchOptions): Promise<Debt[]> {
    try {
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
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * 特定のルートエントリに関連するDebtを取得
   * 
   * @param rootEntryId - 対象のEntryのID
   * @returns 関連するDebtオブジェクト、見つからない場合はundefined
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findByRootEntryId(rootEntryId: string): Promise<Debt | undefined> {
    try {
      const debt = await this.prisma.debt.findUnique({
        where: { rootEntryId }
      });

      return debt ? this.toDomainModel(debt) : undefined;
    } catch (error) {
      this.handlePrismaError(error, rootEntryId);
    }
  }

  /**
   * 返済が完了していないDebtを検索
   * 
   * @param type - オプションで指定する貸借タイプ
   * @returns 返済未完了のDebtオブジェクトの配列
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async findOutstandingDebts(type?: DebtType): Promise<Debt[]> {
    try {
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
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * 新しいDebtを作成
   * 
   * @param debt - 作成するDebtオブジェクト
   * @returns 作成されたDebtオブジェクト（IDが割り当てられている）
   * @throws {@link BusinessRuleError} - ビジネスルール違反がある場合
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async create(debt: Debt): Promise<Debt> {
    try {
      const createdDebt = await this.prisma.debt.create({
        data: {
          id: debt.id, // IDを明示的に指定
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
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        throw error; // BusinessRuleErrorはそのままスロー
      }
      this.handlePrismaError(error);
    }
  }

  /**
   * 既存のDebtを更新
   * 
   * @param debt - 更新するDebtオブジェクト
   * @returns 更新されたDebtオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのDebtが存在しない場合
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async update(debt: Debt): Promise<Debt> {
    try {
      // 対象のDebtが存在するか確認
      const existingDebt = await this.prisma.debt.findUnique({
        where: { id: debt.id }
      });
      
      if (!existingDebt) {
        throw new NotFoundError(ResourceType.DEBT, debt.id);
      }

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
      if (error instanceof NotFoundError) {
        throw error; // NotFoundErrorはそのままスロー
      }
      this.handlePrismaError(error, debt.id);
    }
  }

  /**
   * Debtを完済状態に更新する
   * 
   * @param id - 完済に設定するDebtのID
   * @param repaidAt - 返済完了日
   * @returns 更新されたDebtオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのDebtが存在しない場合
   * @throws {@link BusinessRuleError} - ビジネスルール違反がある場合
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async markAsRepaid(id: string, repaidAt: Date): Promise<Debt> {
    try {
      // まず既存のDebtを取得
      const existingDebt = await this.findById(id);
      
      if (!existingDebt) {
        throw new NotFoundError(ResourceType.DEBT, id);
      }
      
      // ドメインロジックを使って返済マーク（バリデータを注入）
      // 返済状態のバリデーションを実行するが、結果は直接DBに保存するため変数は不要
      existingDebt.markAsRepaid(repaidAt, this.debtRepaymentValidator);
      
      // 更新を実行
      const updatedDebt = await this.prisma.debt.update({
        where: { id },
        data: { repaidAt }
      });
      
      return this.toDomainModel(updatedDebt);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError) {
        throw error; // 既知のエラーはそのままスロー
      }
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Debtを削除
   * 
   * @param id - 削除するDebtのID
   * @returns 削除が成功した場合はtrue
   * @throws {@link NotFoundError} - 指定したIDのDebtが存在しない場合
   * @throws {@link SystemError} - データベースエラーが発生した場合
   */
  async delete(id: string): Promise<boolean> {
    try {
      // 削除前にDebtが存在するか確認
      const existingDebt = await this.prisma.debt.findUnique({
        where: { id }
      });
      
      if (!existingDebt) {
        return false; // 存在しない場合はfalseを返す
      }

      await this.prisma.debt.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }
}