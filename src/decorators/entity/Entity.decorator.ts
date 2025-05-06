import {MetadataStorage} from "@/metadata/metadata-storage";

type Constructor<T = {}> = new (...args: any[]) => T;
/**
 * Marks a class as a database entity and registers its metadata.
 *
 * @param tableName - Optional name of the table. If not provided, the class name (in lowercase) will be used.
 *
 * @example
 * ```ts
 * @Entity("users")
 * class User {
 *     // ...
 * }
 * ```
 */
export function Entity(tableName?: string) {
    return function <T extends Constructor>(constructor: T): T {
        const name = tableName || constructor.name.toLowerCase();

        MetadataStorage.addEntity(constructor, name);

        return constructor;
    };
}