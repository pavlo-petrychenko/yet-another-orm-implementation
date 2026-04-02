import {ColumnMetadata} from "@/metadata/types/Column.metadata.types";
import {RelationMetadata} from "@/metadata/types/Relation.metadata.types";

/**
 * Type representing an entity class constructor.
 */
export type EntityConstructor = new (...args: any[]) => any;

/**
 * Metadata describing an entity (i.e., a database table).
 *
 * This structure is used internally to store metadata about
 * entity definitions, such as table name, columns, primary keys, and relations.
 */
export interface EntityMetadata {
  /**
   * The name of the table in the database.
   */
  tableName: string;
  /**
   * An array of metadata for all columns in the entity.
   */
  columns: ColumnMetadata[];
  /**
   * A list of column names that serve as primary keys.
   */
  primaryKeys: string[];
  /**
   * Optional list of metadata describing relations to other entities.
   */
  relations: RelationMetadata[];
}
