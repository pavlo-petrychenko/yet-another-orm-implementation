export class CliUsageError extends Error {
  public readonly name = "CliUsageError";
}

export class ConfigNotFoundError extends Error {
  public readonly name = "ConfigNotFoundError";

  constructor(public readonly searchedIn: string, public readonly tried: readonly string[]) {
    super(
      `Could not find a yaoi config file in "${searchedIn}". `
        + `Tried: ${tried.join(", ")}.`,
    );
  }
}

export class ConfigShapeError extends Error {
  public readonly name = "ConfigShapeError";

  constructor(public readonly configPath: string, reason: string) {
    super(`Invalid config at "${configPath}": ${reason}`);
  }
}
