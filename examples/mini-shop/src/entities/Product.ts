import {
  BaseModel,
  Column,
  Entity,
  OneToMany,
  PrimaryKey,
  type Relation,
} from "@iriskaik/yaoi";

import { OrderItem } from "@/entities/OrderItem";

@Entity({ name: "products" })
export class Product extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "string" })
  public sku!: string;

  @Column({ type: "string" })
  public name!: string;

  @Column({ type: "integer", name: "price_cents" })
  public priceCents!: number;

  @Column({ type: "integer" })
  public stock!: number;

  @Column({ type: "boolean", name: "is_active" })
  public isActive!: boolean;

  @Column({ type: "timestamptz", name: "created_at" })
  public createdAt!: Date;

  @OneToMany(() => OrderItem, { inverseSide: "product" })
  public orderItems!: Relation<OrderItem[]>;
}
