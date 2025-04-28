import {MetadataStorage} from "@/metadata/metadata-storage";

type Constructor<T = {}> = new (...args: any[]) => T;

export function Entity(tableName?: string) {
    return function <T extends Constructor>(constructor: T): T {
        const name = tableName || constructor.name.toLowerCase();

        MetadataStorage.addEntity(constructor, name);

        return constructor;
    };
}