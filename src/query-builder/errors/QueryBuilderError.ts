export class QueryBuilderError extends Error {
  public readonly builderName: string;
  public readonly validationErrors: string[];

  constructor(builderName: string, errors: string[]) {
    const message = `${builderName}: query validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`;
    super(message);
    this.name = "QueryBuilderError";
    this.builderName = builderName;
    this.validationErrors = errors;
  }
}
