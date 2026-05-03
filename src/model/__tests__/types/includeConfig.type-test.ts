import type { User } from "@/model/__integration__/fixtures/User.entity";
import type { IncludeConfig } from "@/model/types/IncludeConfig";

const ok1: IncludeConfig<User> = { orders: true };
const ok2: IncludeConfig<User> = { profile: true };
const ok3: IncludeConfig<User> = { orders: { include: { user: true } } };
const ok4: IncludeConfig<User> = { orders: true, profile: true };

const ok5: IncludeConfig<User> = {
  // @ts-expect-error 'email' is a column key, not a relation
  email: true,
};

const ok6: IncludeConfig<User> = {
  orders: {
    // @ts-expect-error 'total' is a column on Order, not a relation
    include: { total: true },
  },
};

void ok1; void ok2; void ok3; void ok4; void ok5; void ok6;
