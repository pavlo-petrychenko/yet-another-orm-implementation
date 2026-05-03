export type ModelErrorCode =
  | "NO_DATA_SOURCE"
  | "DATA_SOURCE_NOT_INITIALIZED"
  | "DATA_SOURCE_DESTROYED"
  | "DATA_SOURCE_ALREADY_INITIALIZED"
  | "ENTITY_NOT_REGISTERED"
  | "NO_PRIMARY_KEY"
  | "NOT_FOUND"
  | "EMPTY_UPDATE"
  | "DUPLICATE_REPOSITORY"
  | "UNKNOWN_PROPERTY"
  | "INVALID_ORDER_BY"
  | "UNKNOWN_RELATION"
  | "INCLUDE_DEPTH_EXCEEDED"
  | "MULTI_PK_NOT_SUPPORTED"
  | "INVERSE_SIDE_NOT_FOUND";

export class ModelError extends Error {
  public readonly code: ModelErrorCode;

  public constructor(code: ModelErrorCode, message: string) {
    super(message);
    this.name = "ModelError";
    this.code = code;
  }
}
