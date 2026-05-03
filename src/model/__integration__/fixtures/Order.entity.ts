import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToOne } from "@/decorators/relations/ManyToOne.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { User } from "@/model/__integration__/fixtures/User.entity";

@Entity({ name: "model_orders" })
export class Order extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  public total!: string;

  @ManyToOne(() => User, { joinColumn: { name: "user_id" }, inverseSide: "orders" })
  public user!: Relation<User>;
}
