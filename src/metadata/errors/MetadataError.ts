export type MetadataErrorCode =
  | "DUPLICATE_ENTITY"
  | "DUPLICATE_COLUMN"
  | "DUPLICATE_RELATION"
  | "COLUMN_RELATION_CONFLICT"
  | "MISSING_COLUMN_TYPE";

export class MetadataError extends Error {
  public readonly code: MetadataErrorCode;

  public constructor(code: MetadataErrorCode, message: string) {
    super(message);
    this.name = "MetadataError";
    this.code = code;
  }
}
