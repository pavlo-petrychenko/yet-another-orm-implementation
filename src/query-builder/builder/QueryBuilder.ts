import {SelectQueryBuilder} from "@/query-builder/builder/select/SelectQueryBuilder";
import {InsertQueryBuilder} from "@/query-builder/builder/insert/InsertQueryBuilder";
import {UpdateQueryBuilder} from "@/query-builder/builder/update/UpdateQueryBuilder";
import {DeleteQueryBuilder} from "@/query-builder/builder/delete/DeleteQueryBuilder";
import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";

/**
 * Facade for creating various SQL query builders (SELECT, INSERT, UPDATE, DELETE).
 * Provides convenience methods for common query operations.
 */
export class QueryBuilder {
    // Facade
    /**
     * Creates a SELECT query builder preconfigured to find a single row matching the given condition.
     * Adds a `LIMIT 1` clause to the query.
     *
     * @param condition - A function that configures the WHERE clause.
     * @returns A configured {@link SelectQueryBuilder} instance.
     */
    findOne(condition: (builder: WhereClauseBuilder) => void): SelectQueryBuilder {
        return new SelectQueryBuilder().select().where(condition).limit(1)
    }

    /**
     * Creates a SELECT query builder preconfigured to find a single row matching the given condition.
     * Adds a `LIMIT 1` clause to the query.
     *
     * @param condition - A function that configures the WHERE clause.
     * @returns A configured {@link SelectQueryBuilder} instance.
     */
    findAll(condition: (builder: WhereClauseBuilder) => void): SelectQueryBuilder {
        return new SelectQueryBuilder().select().where(condition)
    }

    /**
     * Creates a new SELECT query builder.
     *
     * @returns A new {@link SelectQueryBuilder} instance.
     */
    select(): SelectQueryBuilder {
        return new SelectQueryBuilder();
    }

    /**
     * Creates a new INSERT query builder.
     *
     * @returns A new {@link InsertQueryBuilder} instance.
     */
    insert(): InsertQueryBuilder {
        return new InsertQueryBuilder();
    }

    /**
     * Creates a new UPDATE query builder.
     *
     * @returns A new {@link UpdateQueryBuilder} instance.
     */
    update(): UpdateQueryBuilder {
        return new UpdateQueryBuilder();
    }

    /**
     * Creates a new DELETE query builder.
     *
     * @returns A new {@link DeleteQueryBuilder} instance.
     */
    delete(): DeleteQueryBuilder {
        return new DeleteQueryBuilder();
    }
}

