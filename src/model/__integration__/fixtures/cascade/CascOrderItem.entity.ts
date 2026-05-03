import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToOne } from "@/decorators/relations/ManyToOne.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { CascOrder } from "@/model/__integration__/fixtures/cascade/CascOrder.entity";

@Entity({ name: "casc_order_items" })
export class CascOrderItem extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "integer", name: "order_id" })
  public orderId!: number;

  @Column({ type: "integer" })
  public qty!: number;

  @ManyToOne(() => CascOrder, { joinColumn: { name: "order_id" }, inverseSide: "items" })
  public order!: Relation<CascOrder>;
}
