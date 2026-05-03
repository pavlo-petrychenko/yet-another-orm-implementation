import { expectTypeOf } from "expect-type";
import type { Order } from "@/model/__integration__/fixtures/Order.entity";
import type { User } from "@/model/__integration__/fixtures/User.entity";
import type { RelationKeys } from "@/model/types/RelationKeys";
import type { Relation } from "@/model/types/Relation";

expectTypeOf<RelationKeys<User>>().toEqualTypeOf<"orders" | "profile">();
expectTypeOf<RelationKeys<Order>>().toEqualTypeOf<"user">();

declare const branded: Relation<Order[]>;
const plain: Order[] = branded;
void plain;
