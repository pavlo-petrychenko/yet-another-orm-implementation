import {
  BaseModel,
  Column,
  Entity,
  ManyToOne,
  PrimaryKey,
  type Relation,
} from "@iriskaik/yaoi";

import { Order } from "@/entities/Order";
import { Product } from "@/entities/Product";

@Entity({ name: "order_items" })
export class OrderItem extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "integer", name: "order_id" })
  public orderId!: number;

  @Column({ type: "integer", name: "product_id" })
  public productId!: number;

  @Column({ type: "integer" })
  public quantity!: number;

  @Column({ type: "integer", name: "price_at_purchase_cents" })
  public priceAtPurchaseCents!: number;

  @ManyToOne(() => Order, { joinColumn: { name: "order_id" }, inverseSide: "items" })
  public order!: Relation<Order>;

  @ManyToOne(() => Product, { joinColumn: { name: "product_id" }, inverseSide: "orderItems" })
  public product!: Relation<Product>;
}
