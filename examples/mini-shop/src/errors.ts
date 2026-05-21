export type DomainErrorCode =
  | "EMPTY_ORDER"
  | "INVALID_QUANTITY"
  | "PRODUCT_INACTIVE"
  | "INSUFFICIENT_STOCK";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;

  public constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
