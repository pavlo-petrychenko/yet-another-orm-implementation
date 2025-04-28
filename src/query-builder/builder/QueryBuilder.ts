import {SelectQueryBuilder} from "@/query-builder/builder/select/SelectQueryBuilder";
import {InsertQueryBuilder} from "@/query-builder/builder/insert/InsertQueryBuilder";
import {UpdateQueryBuilder} from "@/query-builder/builder/update/UpdateQueryBuilder";
import {DeleteQueryBuilder} from "@/query-builder/builder/delete/DeleteQueryBuilder";
import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";

export class QueryBuilder {
    // Facade

    findOne(condition: (builder: WhereClauseBuilder) => void) : SelectQueryBuilder {
        return new SelectQueryBuilder().select().where(condition).limit(1)
    }

    findAll(condition: (builder: WhereClauseBuilder) => void) : SelectQueryBuilder {
        return new SelectQueryBuilder().select().where(condition)
    }

    select(): SelectQueryBuilder {
        return new SelectQueryBuilder();
    }

    insert(): InsertQueryBuilder {
        return new InsertQueryBuilder();
    }

    update(): UpdateQueryBuilder {
        return new UpdateQueryBuilder();
    }

    delete(): DeleteQueryBuilder {
        return new DeleteQueryBuilder();
    }
}

