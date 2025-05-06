import {MetadataStorage} from "@/metadata/metadata-storage";
import {ColumnOptions} from "@/metadata/types/Column.metadata.types";
/**
 * Property decorator that marks a class property as a primary key column.
 *
 * Can be used without arguments for default auto-incrementing keys, or with options to customize the column.
 *
 * @example
 * ```ts
 * @PrimaryKey()
 * id: number;
 *
 * @PrimaryKey({ type: "uuid", name: "user_id" })
 * userId: string;
 * ```
 *
 * @param options - Optional configuration for the primary key column (e.g., name, type).
 * @returns A property decorator function.
 */
export function PrimaryKey(): PropertyDecorator;
export function PrimaryKey(options: ColumnOptions): PropertyDecorator;
export function PrimaryKey(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        if(!options) MetadataStorage.addPrimaryKey(target, propertyKey.toString(), {name : propertyKey.toString(), type : "increment"});
    };
}