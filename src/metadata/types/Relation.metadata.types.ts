
/**
 * Defines the type of relationship between entities.
 * - OneToOne: One entity has exactly one related entity.
 * - OneToMany: One entity has many related entities.
 * - ManyToOne: Many entities relate to one entity.
 * - ManyToMany: Many entities relate to many entities.
 */
export type RelationType = "OneToOne" | "OneToMany" | "ManyToOne" | "ManyToMany";
/**
 * Additional options for configuring a relation,
 * such as foreign key column name and referential integrity behavior.
 */
export interface RelationOptions {
    /**
     * Optional name of the foreign key column.
     */
    fkColumn?: string;
    /**
     * Action to take when the related record is deleted.
     */
    onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
    /**
     * Action to take when the related record is updated.
     */
    onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}
/**
 * Metadata describing a relationship between two entities.
 */
export interface RelationMetadata {
    /**
     * The type of relationship (e.g., OneToOne, ManyToOne).
     */
    type: RelationType;
    /**
     * The name of the property in the source entity that holds the relation.
     */
    propertyKey: string;
    /**
     * A function returning the constructor of the target entity class.
     */
    targetEntity: () => Function;
    /**
     * Optional name of the inverse property on the target entity.
     */
    inverseSide?: string;
    /**
     * Optional relation configuration options.
     */
    options?: RelationOptions;
}