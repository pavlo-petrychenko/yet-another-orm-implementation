import {BaseModel} from "@/base-model/BaseModel";
import {Entity} from "@/decorators/entity/Entity.decorator";
import {PrimaryKey} from "@/decorators/column/PrimaryKey.decorator";
import {Column} from "@/decorators/column/Column.decorator";
import "reflect-metadata";
import {MetadataStorage} from "@/metadata/metadata-storage";
import {Connection} from "@/connection/Connection";
import {PostgresConfig} from "@/drivers/postgres/PostgresConfig";

const config : PostgresConfig ={
    host : "localhost",
    port : 3010,
    username : "postgres",
    password : "test",
    database : "yaoitest"
}

Connection.setup({
    type : 'postgres',
    config : config
}).then(()=>{
    console.log("Orm set up")
})


@Entity("users")
class User extends BaseModel<User>{
    @PrimaryKey()
    id: number;

    @Column()
    name: string;

    @Column()
    age: number;
}


// Select testing ---------------------

// const u = User.findAll().where(w=>{
//     w.where('id', '=', '1')
// }).select('name', 'id').execute()
//
// u.then((users)=>{
//     console.log(users)
// })

// const u2 = User.findAll().execute()
//
// u2.then((users)=>{
//     console.log(users)
// })

// Insert testing ---------------------

// User.insert({
//     name : 'Oleg',
//     age : 10,
// }).execute().then(()=>{
//     console.log("inserted")
// })

// Update testing ---------------------

// async function test(){
//     const u = (await User.findOne(w=>{
//         w.where('id', '=', 1)
//     }).execute())[0]
//
//     u.name = "NewOhFuck"
//     u.age = 101
//
//     await User.update(u).execute()
// }
//
// test().then(()=>{
//     console.log("test")
// })

// Delete testing ---------------------

// async function testDeletion(){
//     const u = (await User.findOne(w=>{
//         w.where('id', '=', 1)
//     }).execute())[0]
//
//     await User.delete(u).execute()
//
//     const users = (await User.findAll().execute())
//
//     await User.delete(users).execute()
//
//     await User.delete(w=>{
//         w.where('name', '=', 'Somebody')
//     }).execute()
// }
//
// testDeletion().then(()=>{
//     console.log('finished')
// })

