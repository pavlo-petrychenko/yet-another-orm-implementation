import type { ColumnKeys } from "./ColumnKeys";
import type { Unbrand } from "./Relation";
import type { RelationKeys } from "./RelationKeys";
import type { SelectMap } from "./SelectMap";

export type IncludedRelations<T, I> = {
  [K in keyof I & RelationKeys<T>]: I[K] extends { include: infer NI }
    ? Unbrand<T[K]> extends ReadonlyArray<infer U>
      ? Array<Strict<U, { include: NI }>>
      : Strict<NonNullable<Unbrand<T[K]>>, { include: NI }>
    : Unbrand<T[K]>;
};

export type Strict<T, A> =
  & (A extends { select: infer S }
      ? S extends SelectMap<T>
        ? Pick<T, Extract<keyof S, ColumnKeys<T>>>
        : Omit<T, RelationKeys<T>>
      : Omit<T, RelationKeys<T>>)
  & (A extends { include: infer I }
      ? IncludedRelations<T, I>
      : unknown);
