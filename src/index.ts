import {BaseModel} from "@/base-model/BaseModel";
import {Entity} from "@/decorators/entity/Entity.decorator";
import {PrimaryKey} from "@/decorators/column/PrimaryKey.decorator";
import {Column} from "@/decorators/column/Column.decorator";
import "reflect-metadata";

import {QueryBuilder} from "@/query-builder/builder/QueryBuilder";
import {PostgresDialect} from "@/drivers/postgres/dialect/PostgresDialect";

const qb = new QueryBuilder();

const result = qb.findAll(w =>
    w
        .where("age", ">", 18)
        .andWhere("age", "<", 90)
        .orWhere("name", "=", "oleg")
        .orWhere("name", "=", "liza")
        .whereIn("role", ["admin", "moderator"])
        .orWhereNotIn("status", ["banned", "inactive"])
        .group("AND", g =>
            g.where("city", "=", "Kyiv").orWhere("city", "=", "Lviv")
        )).from('user').limit(10).offset(5).orderBy('name').select('id', 'name')
    .innerJoin('location', b=>b.where('some', '=', 'some'))
    .build()

// const result = qb
//     .findAll(w => w.where("user.id", "=", 1))
//     .from('user')
//     .select('user.some', 'oleg')
//     .innerJoin('location', b=>b.where('location.some', '=', 'some'))
//     .build()


// const result = qb.update().table('users').set({
//     'some' : 123,
//     '12' : 'oleg'
// }).build()

// const result = qb.delete().from('users').build()


const pgd = new PostgresDialect()
const sql = pgd.buildQuery(result)
console.log(sql);


// @Entity("users")
// class User extends BaseModel {
//     @PrimaryKey()
//     id: string; // inferred type: uuid
//
//     @Column()
//     name: string; // inferred: varchar
//
//     @Column()
//     age: number; // inferred: int
//
//     @Column()
//     isAdmin: boolean; // inferred: boolean
// }
//

