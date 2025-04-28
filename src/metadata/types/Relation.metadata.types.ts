export type RelationType = "OneToOne" | "OneToMany" | "ManyToOne" | "ManyToMany";

export interface RelationOptions {
    fkColumn?: string;
    onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
    onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

export interface RelationMetadata {
    type: RelationType;
    propertyKey: string;
    targetEntity: () => Function;
    inverseSide?: string;
    options?: RelationOptions;
}