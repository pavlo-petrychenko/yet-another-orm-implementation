import { expectTypeOf } from "expect-type";
import type { Order } from "@/model/__integration__/fixtures/Order.entity";
import type { User } from "@/model/__integration__/fixtures/User.entity";
import type { ColumnKeys } from "@/model/types/ColumnKeys";

type UserCols = ColumnKeys<User>;
expectTypeOf<UserCols>().toEqualTypeOf<
  "id" | "email" | "displayName" | "isActive" | "signupCount" | "lastLoginAt" | "createdAt"
>();

type OrderCols = ColumnKeys<Order>;
expectTypeOf<OrderCols>().toEqualTypeOf<"id" | "userId" | "total">();
