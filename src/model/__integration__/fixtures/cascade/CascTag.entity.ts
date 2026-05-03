import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToMany } from "@/decorators/relations/ManyToMany.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { CascPost } from "@/model/__integration__/fixtures/cascade/CascPost.entity";

@Entity({ name: "casc_tags" })
export class CascTag extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "string" })
  public label!: string;

  @ManyToMany(() => CascPost, { inverseSide: "tags" })
  public posts!: Relation<CascPost[]>;
}
