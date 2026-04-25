interface SymbolWithMetadata {
  metadata?: symbol;
}

const symbolRef = Symbol as unknown as SymbolWithMetadata;
symbolRef.metadata ??= Symbol.for("Symbol.metadata");
