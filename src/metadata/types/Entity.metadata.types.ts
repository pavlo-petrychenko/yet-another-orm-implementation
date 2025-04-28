import {RelationMetadata} from "@/metadata/types/Relation.metadata.types";
import {ColumnMetadata} from "@/metadata/types/Column.metadata.types";

export interface EntityMetadata {
    tableName: string;
    columns: ColumnMetadata[];
    primaryKeys: string[];
    relations?: RelationMetadata[];
}
