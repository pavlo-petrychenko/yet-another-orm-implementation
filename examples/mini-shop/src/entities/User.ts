import {
  BaseModel,
  Column,
  Entity,
  OneToMany,
  PrimaryKey,
  type Relation,
} from "@iriskaik/yaoi";

import { Order } from "@/entities/Order";

@Entity({ name: "users" })
export class User extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "string" })
  public email!: string;

  @Column({ type: "string" })
  public name!: string;

  @Column({ type: "timestamptz", name: "created_at" })
  public createdAt!: Date;

  @OneToMany(() => Order, { inverseSide: "user" })
  public orders!: Relation<Order[]>;
}
