import {
  BaseModel,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  type Relation,
} from "@iriskaik/yaoi";

import { OrderItem } from "@/entities/OrderItem";
import { User } from "@/entities/User";

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

@Entity({ name: "orders" })
export class Order extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @Column({ type: "string" })
  public status!: OrderStatus;

  @Column({ type: "integer", name: "total_cents" })
  public totalCents!: number;

  @Column({ type: "timestamptz", name: "created_at" })
  public createdAt!: Date;

  @ManyToOne(() => User, { joinColumn: { name: "user_id" }, inverseSide: "orders" })
  public user!: Relation<User>;

  @OneToMany(() => OrderItem, { inverseSide: "order" })
  public items!: Relation<OrderItem[]>;
}
