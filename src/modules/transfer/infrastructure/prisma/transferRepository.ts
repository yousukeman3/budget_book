import { Prisma } from '@prisma/client';
import type { PrismaClient, Transfer as PrismaTransfer } from '@prisma/client';
import { Transfer } from '../../domain/transfer';
import type { TransferRepository, TransferSearchOptions } from '../../domain/transferRepository';
import { NotFoundError, SystemError, BusinessRuleError } from '../../../../shared/errors/AppError';
import { ResourceType, SystemErrorCode, BusinessRuleErrorCode } from '../../../../shared/errors/ErrorCodes';

/**
 * PrismaによるTransferRepositoryの実装
 * 
 * 口座間振替（Transfer）のリポジトリインターフェースをPrismaを用いて実装したクラス。
 * データベースとドメインモデルの変換ロジックと、振替に関連するビジネスルールの検証を担当する。
 */
export class PrismaTransferRepository implements TransferRepository {
  /**
   * コンストラクタ
   * 
   * @param prisma - Prismaクライアントインスタンス
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * PrismaのTransferモデルをドメインモデルに変換する
   * 
   * @param prismaTransfer - Prismaから取得したTransferモデル
   * @returns ドメイン層のTransferモデル
   */
  private toDomainModel(prismaTransfer: PrismaTransfer): Transfer {
    return new Transfer(
      prismaTransfer.id,
      prismaTransfer.rootEntryId,
      prismaTransfer.fromMethodId,
      prismaTransfer.toMethodId,
      prismaTransfer.date,
      prismaTransfer.note ?? null
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
        throw new NotFoundError(ResourceType.TRANSFER, resourceId);
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
          '同一のRoot EntryIDを持つ振替がすでに存在します',
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
   * IDによるTransfer検索
   * 
   * @param id - 検索対象のTransferのID
   * @returns 見つかったTransferオブジェクト、見つからない場合はundefined
   */
  async findById(id: string): Promise<Transfer | undefined> {
    try {
      const transfer = await this.prisma.transfer.findUnique({
        where: { id }
      });

      return transfer ? this.toDomainModel(transfer) : undefined;
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * ルートエントリIDによるTransfer検索
   * 
   * @param rootEntryId - 対応するEntryのID
   * @returns 見つかったTransferオブジェクト、見つからない場合はundefined
   */
  async findByRootEntryId(rootEntryId: string): Promise<Transfer | undefined> {
    try {
      const transfer = await this.prisma.transfer.findUnique({
        where: { rootEntryId }
      });

      return transfer ? this.toDomainModel(transfer) : undefined;
    } catch (error) {
      this.handlePrismaError(error, rootEntryId);
    }
  }

  /**
   * 検索オプションによるTransfer検索
   * 
   * @param options - 検索条件オプション
   * @returns 条件に合致するTransferオブジェクトの配列
   */
  async findByOptions(options: TransferSearchOptions): Promise<Transfer[]> {
    try {
      // 検索条件の構築
      const where: Prisma.TransferWhereInput = {};

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

      // 特定の支払い方法からの振替
      if (options.fromMethodId) {
        where.fromMethodId = options.fromMethodId;
      }

      // 特定の支払い方法への振替
      if (options.toMethodId) {
        where.toMethodId = options.toMethodId;
      }

      // ソート条件と制限
      const orderBy = options.sortBy 
        ? { [options.sortBy]: options.sortDirection || 'desc' }
        : { date: 'desc' as const };

      const transfers = await this.prisma.transfer.findMany({
        where,
        orderBy,
        skip: options.offset || 0,
        take: options.limit || 100,
      });

      return transfers.map(transfer => this.toDomainModel(transfer));
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * 特定のMethod（fromMethodまたはtoMethod）に関連するTransferを検索
   * 
   * @param methodId - 検索対象のMethodのID
   * @returns 関連するTransferオブジェクトの配列
   */
  async findByMethodId(methodId: string): Promise<Transfer[]> {
    try {
      const transfers = await this.prisma.transfer.findMany({
        where: {
          OR: [
            { fromMethodId: methodId },
            { toMethodId: methodId }
          ]
        },
        orderBy: { date: 'desc' }
      });

      return transfers.map(transfer => this.toDomainModel(transfer));
    } catch (error) {
      this.handlePrismaError(error, methodId);
    }
  }

  /**
   * 新しいTransferを作成（Entryと一緒にトランザクション内で作成する必要あり）
   * 
   * @param transfer - 作成するTransferオブジェクト
   * @returns 作成されたTransferオブジェクト（IDが割り当てられている）
   * @throws {@link BusinessRuleError} - 同一口座間の振替など、ビジネスルール違反の場合
   */
  async create(transfer: Transfer): Promise<Transfer> {
    try {
      // 同じ支払い方法間の振替は禁止
      if (transfer.fromMethodId === transfer.toMethodId) {
        throw new BusinessRuleError(
          '同じ支払い方法間での振替はできません',
          BusinessRuleErrorCode.IDENTICAL_ACCOUNTS,
          { 
            fromMethodId: transfer.fromMethodId, 
            toMethodId: transfer.toMethodId 
          }
        );
      }
      
      // EntryとTransferは常に一緒に作成する必要がある
      // ここでは、Transferのみを作成するが、実際のアプリケーションレイヤーで
      // トランザクションを使用して両方を作成すること
      const createdTransfer = await this.prisma.transfer.create({
        data: {
          id: transfer.id,
          rootEntryId: transfer.rootEntryId,
          fromMethodId: transfer.fromMethodId,
          toMethodId: transfer.toMethodId,
          date: transfer.date,
          note: transfer.note
        }
      });

      return this.toDomainModel(createdTransfer);
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        throw error; // 既存のビジネスルールエラーはそのまま
      }
      this.handlePrismaError(error);
    }
  }

  /**
   * 既存のTransferを更新
   * 
   * @param transfer - 更新するTransferオブジェクト
   * @returns 更新されたTransferオブジェクト
   * @throws {@link NotFoundError} - 指定したIDのTransferが存在しない場合
   */
  async update(transfer: Transfer): Promise<Transfer> {
    try {
      // fromMethodId、toMethodIdの変更は禁止
      // これらを変更する場合は、削除して再作成する必要がある
      // rootEntryIdも変更不可
      const updatedTransfer = await this.prisma.transfer.update({
        where: { id: transfer.id },
        data: {
          date: transfer.date,
          note: transfer.note
        }
      });

      return this.toDomainModel(updatedTransfer);
    } catch (error) {
      this.handlePrismaError(error, transfer.id);
    }
  }

  /**
   * Transferを削除（関連するEntryも削除する必要あり）
   * 
   * @param id - 削除するTransferのID
   * @returns 削除が成功した場合はtrue
   * @throws {@link NotFoundError} - 指定したIDのTransferが存在しない場合
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Transfer削除前に存在確認
      const existingTransfer = await this.prisma.transfer.findUnique({
        where: { id },
        select: { id: true }
      });
      
      if (!existingTransfer) {
        throw new NotFoundError(ResourceType.TRANSFER, id);
      }

      // 注意：実際のアプリケーションレイヤーでは、
      // このTransferに関連するEntryも一緒にトランザクション内で削除する必要あり

      await this.prisma.transfer.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }
}