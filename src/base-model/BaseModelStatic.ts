// import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
// import {QueryBuilder} from "@/query-builder/builder/QueryBuilder";
// import {SelectQueryBuilder} from "@/query-builder/builder/select/SelectQueryBuilder";
// import {UpdateQueryBuilder} from "@/query-builder/builder/update/UpdateQueryBuilder";
// import {DeleteQueryBuilder} from "@/query-builder/builder/delete/DeleteQueryBuilder";
// import {InsertQueryBuilder} from "@/query-builder/builder/insert/InsertQueryBuilder";
// import {MetadataStorage} from "@/metadata/metadata-storage";

// import {SelectQueryBuilder} from "query-builder/builder/select/SelectQueryBuilder";
// import {UpdateQueryBuilder} from "query-builder/builder/update/UpdateQueryBuilder";
// import {DeleteQueryBuilder} from "query-builder/builder/delete/DeleteQueryBuilder";
// import {InsertQueryBuilder} from "query-builder/builder/insert/InsertQueryBuilder";
// import {WhereClauseBuilder} from "query-builder/builder/common/WhereClauseBuilder";
// import {MetadataStorage} from "metadata/metadata-storage";
// import {QueryBuilder} from "query-builder/builder/QueryBuilder";

import {SelectQueryBuilder} from "../query-builder/builder/select/SelectQueryBuilder";
import {UpdateQueryBuilder} from "../query-builder/builder/update/UpdateQueryBuilder";
import {DeleteQueryBuilder} from "../query-builder/builder/delete/DeleteQueryBuilder";
import {InsertQueryBuilder} from "../query-builder/builder/insert/InsertQueryBuilder";
import {WhereClauseBuilder} from "../query-builder/builder/common/WhereClauseBuilder";
import {MetadataStorage} from "../metadata/metadata-storage";
import {QueryBuilder} from "../query-builder/builder/QueryBuilder";

export class BaseModelStatic<T extends BaseModelStatic<T>>{
    protected queryBuilder : SelectQueryBuilder | UpdateQueryBuilder | DeleteQueryBuilder | InsertQueryBuilder;

    public static findAll<T extends typeof BaseModelStatic>(this : T) : InstanceType<T>
    public static findAll<T extends typeof BaseModelStatic>(this : T, condition: (builder: WhereClauseBuilder) => void ) : InstanceType<T>
    public static findAll<T extends typeof BaseModelStatic>(this : T, condition? : (builder: WhereClauseBuilder) => void) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }


        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).select().from(metadata.tableName);
        if(condition){
            instance.queryBuilder.where(condition)
        }
        return instance as InstanceType<T>
    }

    public static findOne<T extends typeof BaseModelStatic>(this : T) : InstanceType<T>
    public static findOne<T extends typeof BaseModelStatic>(this : T, condition: (builder: WhereClauseBuilder) => void ) : InstanceType<T>
    public static findOne<T extends typeof BaseModelStatic>(this : T, condition? : (builder: WhereClauseBuilder) => void) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).select().from(metadata.tableName).limit(1);
        if(condition){
            instance.queryBuilder.where(condition)
        }
        return instance as InstanceType<T>
    }


    public static insert<T extends typeof BaseModelStatic>(this : T, record : Partial<InstanceType<T>>) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const fieldValueMap: Record<string, any> = {};

        for (const column of metadata.columns) {
            const columnName = column.name ?? column.propertyKey;
            const value = (record as any)[column.propertyKey];
            if(value){
                fieldValueMap[columnName] = value;
            }
        }

        console.log(fieldValueMap)

        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).insert().into(metadata.tableName).valuesList(fieldValueMap);

        return instance as InstanceType<T>
    }

    public static update<T extends typeof BaseModelStatic>(this : T, record : Partial<InstanceType<T>>) : InstanceType<T>
    public static update<T extends typeof BaseModelStatic>(this : T, record : Partial<InstanceType<T>>, condition : (builder: WhereClauseBuilder) => void) : InstanceType<T>
    public static update<T extends typeof BaseModelStatic>(this : T, record : Partial<InstanceType<T>>, condition? : (builder: WhereClauseBuilder) => void) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const fieldValueMap: Record<string, any> = {};

        for (const column of metadata.columns) {
            const columnName = column.name ?? column.propertyKey;
            const value = (record as any)[column.propertyKey];
            if(value){
                fieldValueMap[columnName] = value;
            }
        }

        const instance = new this()

        instance.queryBuilder = (new QueryBuilder()).update().table(metadata.tableName).set(fieldValueMap);
        if(condition){
            instance.queryBuilder.where(condition)
        }else{
            instance.queryBuilder.where(w=>{
                metadata.primaryKeys.forEach(pk => {
                    w.andWhere(pk, '=', (record as any)[pk])
                })
            })
        }

        return instance as InstanceType<T>
    }

    public static delete<T extends typeof BaseModelStatic>(this : T, condition : (builder: WhereClauseBuilder) => void) : InstanceType<T>
    public static delete<T extends typeof BaseModelStatic>(this : T, record : InstanceType<T>) : InstanceType<T>
    public static delete<T extends typeof BaseModelStatic>(this : T, records : InstanceType<T>[]) : InstanceType<T>
    public static delete<T extends typeof BaseModelStatic>(
        this : T,
        arg: ((builder: WhereClauseBuilder) => void) | InstanceType<T> | InstanceType<T>[]
    ) : InstanceType<T>{
        const metadata = MetadataStorage.getMetadata(this);
        if (!metadata) {
            throw new Error(`No metadata found for entity ${this.name}`);
        }

        const instance = new this()
        instance.queryBuilder = (new QueryBuilder()).delete().from(metadata.tableName);

        if(arg instanceof Function){
            instance.queryBuilder.where(arg)
        }else if(arg instanceof Array){
            instance.queryBuilder.where(w=>{
                metadata.primaryKeys.forEach(pk => {
                    w.andWhere(pk, 'IN', arg.map(r => (r as any)[pk]))
                })
            })
        }else{
            instance.queryBuilder.where(w=>{
                metadata.primaryKeys.forEach(pk => {
                    w.andWhere(pk, '=', (arg as any)[pk])
                })
            })
        }


        return instance as InstanceType<T>
    }
}