import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToMany } from "@/decorators/relations/ManyToMany.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { CascTag } from "@/model/__integration__/fixtures/cascade/CascTag.entity";

@Entity({ name: "casc_posts" })
export class CascPost extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "string" })
  public title!: string;

  @ManyToMany(() => CascTag, {
    joinTable: {
      name: "casc_post_tags",
      joinColumn: { name: "post_id" },
      inverseJoinColumn: { name: "tag_id" },
    },
    inverseSide: "posts",
    cascade: true,
  })
  public tags!: Relation<CascTag[]>;
}
