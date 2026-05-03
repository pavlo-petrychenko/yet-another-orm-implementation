import { expectTypeOf } from "expect-type";
import type { User } from "@/model/__integration__/fixtures/User.entity";
import type { Strict } from "@/model/types/Strict";

// Nested include: orders → user. Narrowed.
type Args = { narrow: true; include: { orders: { include: { user: true } } } };
type Result = Strict<User, Args>;

// orders is an array of narrowed Order with `user` populated.
type OrderItem = Result["orders"][number];

expectTypeOf<OrderItem["id"]>().toEqualTypeOf<number>();
expectTypeOf<OrderItem["total"]>().toEqualTypeOf<string>();
expectTypeOf<OrderItem["userId"]>().toEqualTypeOf<number>();

// nested user is a narrowed User (no relations) — id, email, etc.
expectTypeOf<OrderItem["user"]["id"]>().toEqualTypeOf<number>();
expectTypeOf<OrderItem["user"]["email"]>().toEqualTypeOf<string>();
