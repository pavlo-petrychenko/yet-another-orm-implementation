import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
import {QueryBuilder} from "@/query-builder/builder/QueryBuilder";
import {SelectQueryBuilder} from "@/query-builder/builder/select/SelectQueryBuilder";
import {UpdateQueryBuilder} from "@/query-builder/builder/update/UpdateQueryBuilder";
import {DeleteQueryBuilder} from "@/query-builder/builder/delete/DeleteQueryBuilder";
import {InsertQueryBuilder} from "@/query-builder/builder/insert/InsertQueryBuilder";
import {MetadataStorage} from "@/metadata/metadata-storage";

export class BaseModelStatic<T extends BaseModelStatic<T>>{
    protected queryBuilder : SelectQueryBuilder | UpdateQueryBuilder | DeleteQueryBuilder | InsertQueryBuilder;

    public static findAll<T extends typeof BaseModelStatic>(this : T) : InstanceType<T>
    public static findAll<T extends typeof BaseModelStatic>(this : T, buildFn: (builder: WhereClauseBuilder) => void ) : InstanceType<T>
    public static findAll<T extends typeof BaseModelStatic>(this : T, buildFn? : (builder: WhereClauseBuilder) => void) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }


        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).select().from(metadata.tableName);
        if(buildFn){
            instance.queryBuilder.where(buildFn)
        }
        return instance as InstanceType<T>
    }

    public static findOne<T extends typeof BaseModelStatic>(this : T) : InstanceType<T>
    public static findOne<T extends typeof BaseModelStatic>(this : T, buildFn: (builder: WhereClauseBuilder) => void ) : InstanceType<T>
    public static findOne<T extends typeof BaseModelStatic>(this : T, buildFn? : (builder: WhereClauseBuilder) => void) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).select().from(metadata.tableName).limit(1);
        if(buildFn){
            instance.queryBuilder.where(buildFn)
        }
        return instance as InstanceType<T>
    }


    public static insert<T extends typeof BaseModelStatic>(this : T) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).insert().into(metadata.tableName);

        return instance as InstanceType<T>
    }

    public static update<T extends typeof BaseModelStatic>(this : T) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).update().table(metadata.tableName);

        return instance as InstanceType<T>
    }

    public static delete<T extends typeof BaseModelStatic>(this : T) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).delete().from(metadata.tableName);

        return instance as InstanceType<T>
    }
}