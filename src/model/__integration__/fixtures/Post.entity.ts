import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToMany } from "@/decorators/relations/ManyToMany.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { Tag } from "@/model/__integration__/fixtures/Tag.entity";

@Entity({ name: "model_posts" })
export class Post extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "string" })
  public title!: string;

  @ManyToMany(() => Tag, {
    joinTable: {
      name: "model_post_tags",
      joinColumn: { name: "post_id" },
      inverseJoinColumn: { name: "tag_id" },
    },
    inverseSide: "posts",
  })
  public tags!: Relation<Tag[]>;
}
