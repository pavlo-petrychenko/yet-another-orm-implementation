import {SelectQueryBuilder} from "@/query-builder/builder/select/SelectQueryBuilder";
import {ConditionClause} from "@/query-builder/queries/common/WhereClause";
import {QueryBuilder} from "@/query-builder/builder/QueryBuilder";
import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
import {MetadataStorage} from "@/metadata/metadata-storage";

export class BaseModel {
    private static queryBuilder = new QueryBuilder();

    static findAll(condition?: (builder: WhereClauseBuilder) => void): SelectQueryBuilder {
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const query = this.queryBuilder.findAll(condition || (() => {}));
        return query.from(metadata.tableName);
    }

    static findOne(condition?: (builder: WhereClauseBuilder) => void): SelectQueryBuilder {
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const query = this.queryBuilder.findOne(condition || (() => {}));
        return query.from(metadata.tableName);
    }

    static select(...columns: string[]): SelectQueryBuilder {
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const query = this.queryBuilder.select();
        return query.from(metadata.tableName).select(...columns);
    }



}
