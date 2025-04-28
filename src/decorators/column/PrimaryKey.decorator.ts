import {MetadataStorage} from "@/metadata/metadata-storage";
import {ColumnOptions} from "@/metadata/types/Column.metadata.types";

export function PrimaryKey(): PropertyDecorator;
export function PrimaryKey(options: ColumnOptions): PropertyDecorator;
export function PrimaryKey(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        if(!options) MetadataStorage.addPrimaryKey(target, propertyKey.toString(), {name : propertyKey.toString(), type : "increment"});
    };
}