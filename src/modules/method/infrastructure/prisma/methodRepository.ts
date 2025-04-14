import { Prisma } from '@prisma/client';
import type { PrismaClient, Method as PrismaMethod } from '@prisma/client';
import { Method } from '../../domain/method';
import type { MethodRepository, MethodSearchOptions } from '../../domain/methodRepository';
import { NotFoundError, SystemError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { ResourceType, SystemErrorCode, BusinessRuleErrorCode } from '../../../../shared/errors/ErrorCodes';
import { fromPrismaDecimal, toPrismaDecimal } from '../../../../shared/utils/decimal';
import { ZodValidator } from '../../../../shared/validation/ZodValidator';
import { MethodSchema, MethodCreateSchema, ActiveMethodSchema } from '../../../../shared/zod/schema/MethodSchema';

/**
 * PrismaによるMethodRepositoryの実装
 * 
 * 支払い方法（Method）のリポジトリインターフェースをPrismaを用いて実装したクラス。
 * データベースとドメインモデル間の変換ロジックと、エラーハンドリングを担当する。
 */
export class PrismaMethodRepository implements MethodRepository {
  // Zodスキーマを使用したバリデータのインスタンス
  private methodValidator = new ZodValidator(MethodSchema);
  private methodCreateValidator = new ZodValidator(MethodCreateSchema);
  private activeMethodValidator = new ZodValidator(ActiveMethodSchema);
  
  /**
   * コンストラクタ
   * 
   * @param prisma - Prismaクライアントインスタンス
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * PrismaのMethodモデルをドメインモデルに変換する
   * 
   * @param prismaMethod - Prismaから取得したMethodモデル
   * @returns ドメイン層のMethodモデル
   */
  private toDomainModel(prismaMethod: PrismaMethod): Method {
    return new Method(
      prismaMethod.id,
      prismaMethod.name,
      prismaMethod.initialBalance != null ? fromPrismaDecimal(prismaMethod.initialBalance) : null,
      prismaMethod.archived ?? false,
      this.methodValidator // バリデータを注入
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
        throw new NotFoundError(ResourceType.METHOD, resourceId);
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
          '同一名称の支払い方法がすでに存在します',
          BusinessRuleErrorCode.DUPLICATE_ENTRY,
          { resourceId, originalError: error }
        );
      }
      // 削除制約違反
      else if (error.code === 'P2023') {
        throw new BusinessRuleError(
          'この支払い方法は使用中のため削除できません',
          BusinessRuleErrorCode.METHOD_IN_USE,
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
   * IDによるMethod検索
   * 
   * @param id - 検索対象のMethodのID
   * @returns 見つかったMethodオブジェクト、見つからない場合はundefined
   */
  async findById(id: string): Promise<Method | undefined> {
    try {
      const method = await this.prisma.method.findUnique({
        where: { id }
      });

      return method ? this.toDomainModel(method) : undefined;
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * すべてのMethodを取得する
   * 
   * @param includeArchived - アーカイブされたMethodも含めるかどうか
   * @returns Methodオブジェクトの配列
   */
  async findAll(includeArchived: boolean = false): Promise<Method[]> {
    try {
      const where: Prisma.MethodWhereInput = {};
      
      // アーカイブされたMethodを含めない場合
      if (!includeArchived) {
        where.archived = false;
      }

      const methods = await this.prisma.method.findMany({
        where,
        orderBy: { name: 'asc' }
      });

      return methods.map(method => this.toDomainModel(method));
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * 検索オプションによるMethod検索
   * 
   * @param options - 検索条件オプション
   * @returns 条件に合致するMethodオブジェクトの配列
   */
  async findByOptions(options: MethodSearchOptions): Promise<Method[]> {
    try {
      const where: Prisma.MethodWhereInput = {};
      
      // アーカイブされたMethodを含めない場合
      if (!options.includeArchived) {
        where.archived = false;
      }
      
      // 名前の部分一致検索
      if (options.nameContains) {
        where.name = {
          contains: options.nameContains,
          mode: 'insensitive' // 大文字小文字を区別しない
        };
      }

      // ソート条件と制限
      const orderBy = options.sortBy 
        ? { [options.sortBy]: options.sortDirection || 'asc' }
        : { name: 'asc' as const };

      const methods = await this.prisma.method.findMany({
        where,
        orderBy,
        skip: options.offset || 0,
        take: options.limit || 100,
      });

      return methods.map(method => this.toDomainModel(method));
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * 新しいMethodを作成
   * 
   * @param method - 作成するMethodオブジェクト
   * @returns 作成されたMethodオブジェクト（IDが割り当てられている）
   */
  async create(method: Method): Promise<Method> {
    try {
      const createdMethod = await this.prisma.method.create({
        data: {
          id: method.id,
          name: method.name,
          initialBalance: method.initialBalance ? toPrismaDecimal(method.initialBalance) : null,
          archived: method.archived
        }
      });

      return this.toDomainModel(createdMethod);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * 既存のMethodを更新
   * 
   * @param method - 更新するMethodオブジェクト
   * @returns 更新されたMethodオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのMethodが存在しない場合
   */
  async update(method: Method): Promise<Method> {
    try {
      const updatedMethod = await this.prisma.method.update({
        where: { id: method.id },
        data: {
          name: method.name,
          initialBalance: method.initialBalance ? toPrismaDecimal(method.initialBalance) : null,
          archived: method.archived
        }
      });

      return this.toDomainModel(updatedMethod);
    } catch (error) {
      this.handlePrismaError(error, method.id);
    }
  }

  /**
   * Methodをアーカイブまたは復元する
   * 
   * @param id - 対象のMethodのID
   * @param archived - アーカイブ状態にするかどうか
   * @returns 更新されたMethodオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのMethodが存在しない場合
   */
  async setArchiveStatus(id: string, archived: boolean): Promise<Method> {
    try {
      // 既存のMethodを取得
      const existingMethod = await this.findById(id);
      
      if (!existingMethod) {
        throw new NotFoundError(ResourceType.METHOD, id);
      }
      
      // ドメインロジックを使って状態を変更（バリデータを注入）
      const updatedDomainMethod = existingMethod.setArchived(archived, this.methodValidator);
      
      // DBを更新
      const updatedMethod = await this.prisma.method.update({
        where: { id },
        data: { archived }
      });

      return this.toDomainModel(updatedMethod);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError) {
        throw error;
      }
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Methodを削除する
   * 
   * @param id - 削除するMethodのID
   * @returns 削除が成功した場合はtrue
   * @throws {@link BusinessRuleError} - Methodが他のリソースから参照されている場合
   * @throws {@link NotFoundError} - 指定したIDのMethodが存在しない場合
   */
  async delete(id: string): Promise<boolean> {
    try {
      // 削除前に関連リソースが存在するかチェック
      const relatedEntries = await this.prisma.entry.count({
        where: { methodId: id }
      });

      const relatedTransfersFrom = await this.prisma.transfer.count({
        where: { fromMethodId: id }
      });

      const relatedTransfersTo = await this.prisma.transfer.count({
        where: { toMethodId: id }
      });

      if (relatedEntries > 0 || relatedTransfersFrom > 0 || relatedTransfersTo > 0) {
        throw new BusinessRuleError(
          'この支払い方法は使用中のため削除できません。アーカイブを検討してください。',
          BusinessRuleErrorCode.METHOD_IN_USE,
          { 
            id,
            relatedEntries,
            relatedTransfersFrom,
            relatedTransfersTo
          }
        );
      }

      await this.prisma.method.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        throw error;
      }
      this.handlePrismaError(error, id);
    }
  }
}