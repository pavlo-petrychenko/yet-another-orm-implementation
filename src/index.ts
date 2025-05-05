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
    database : "dblab2"
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
    id: string;

    @Column({ name: "user_name", type: "varchar" })
    name: string;

    @Column({ type: "int" })
    age: number;
}


const u = User.findAll().where(w=>{
    w.where('id', '=', '1')
}).select('name', 'id').execute()

u.then((users)=>{
    console.log()
})
