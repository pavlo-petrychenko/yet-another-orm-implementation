import {
  EntityRepository,
  makeRepository,
  Repository,
} from "@iriskaik/yaoi";

import { Order } from "@/entities/Order";
import { OrderItem } from "@/entities/OrderItem";
import { Product } from "@/entities/Product";
import { DomainError } from "@/errors";

export interface PlaceOrderLine {
  productId: number;
  quantity: number;
}

@EntityRepository(Order)
export class OrderRepository extends Repository<Order> {
  public placeOrder(userId: number, lines: readonly PlaceOrderLine[]): Promise<Order> {
    if (lines.length === 0) {
      throw new DomainError("EMPTY_ORDER", "Order must contain at least one line item");
    }

    return this.dataSource.transaction(async () => {
      const products = makeRepository(Product);
      const items = makeRepository(OrderItem);

      const resolved: Array<PlaceOrderLine & { priceCents: number }> = [];
      let totalCents = 0;

      for (const line of lines) {
        if (line.quantity <= 0) {
          throw new DomainError("INVALID_QUANTITY", `quantity must be positive (got ${line.quantity})`);
        }

        const product = await products.findOneOrFail({ where: { id: line.productId } });

        if (!product.isActive) {
          throw new DomainError("PRODUCT_INACTIVE", `Product ${product.sku} is not active`);
        }
        if (product.stock < line.quantity) {
          throw new DomainError(
            "INSUFFICIENT_STOCK",
            `Product ${product.sku} has ${product.stock} in stock, requested ${line.quantity}`,
          );
        }

        await products.update({ id: product.id }, { stock: product.stock - line.quantity });

        totalCents += product.priceCents * line.quantity;
        resolved.push({ ...line, priceCents: product.priceCents });
      }

      const order = await this.insert({
        userId,
        status: "pending",
        totalCents,
      });

      for (const line of resolved) {
        await items.insert({
          orderId: order.id,
          productId: line.productId,
          quantity: line.quantity,
          priceAtPurchaseCents: line.priceCents,
        });
      }

      return order;
    });
  }

  public findRecentByUser(userId: number, take = 10): Promise<Order[]> {
    return this.find({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      take,
    });
  }
}
