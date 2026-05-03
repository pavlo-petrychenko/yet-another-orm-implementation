declare const RELATION_BRAND: unique symbol;

export type Relation<T> = T & { readonly [RELATION_BRAND]: T };

export type Unbrand<T> = T extends Relation<infer U> ? U : T;
