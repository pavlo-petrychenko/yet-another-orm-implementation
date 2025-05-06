import {MetadataStorage} from "@/metadata/metadata-storage";
import {ColumnOptions} from "@/metadata/types/Column.metadata.types";
/**
 * Property decorator that marks a class property as a database column.
 *
 * Can be used without arguments for default behavior or with options to customize mapping.
 *
 * @example
 * ```ts
 * @Column()
 * name: string;
 *
 * @Column({ type: "int", name: "user_age" })
 * age: number;
 * ```
 *
 * @param options - Optional column configuration (e.g., name, type).
 * @returns A property decorator function.
 */
export function Column(): PropertyDecorator;
export function Column(options: ColumnOptions): PropertyDecorator;
export function Column(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const type = Reflect.getMetadata("design:type", target, propertyKey);

        let inferredType = "varchar";
        switch (type?.name) {
            case "String":
                inferredType = "varchar";
                break;
            case "Number":
                inferredType = "int";
                break;
            case "Boolean":
                inferredType = "boolean";
                break;
            case "Date":
                inferredType = "timestamp";
                break;
            default:
                inferredType = "json";
        }

        MetadataStorage.addColumn(target, propertyKey.toString(), {
            ...(options ?? {}),
            type: options?.type ?? inferredType,
            name: options?.name ?? propertyKey.toString()
        });
    };
}