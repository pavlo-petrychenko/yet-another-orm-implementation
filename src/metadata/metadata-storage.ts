// metadata-storage.ts

import { EntityMetadata } from "@/metadata/types/Entity.metadata.types";
import { RelationMetadata } from "@/metadata/types/Relation.metadata.types";
import pino from "pino";

const entityStore = new Map<Function, EntityMetadata>();

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

export const MetadataStorage = {
  addEntity(target: Function, tableName: string) {
    // Validate inputs
    if (!target || typeof target !== "function") {
      logger.error({ target }, "Invalid entity target provided");
      throw new Error("Target must be a valid function");
    }
    if (!tableName || typeof tableName !== "string") {
      logger.error(
        { tableName },
        "metadata-storage: Invalid table name provided"
      );
      throw new Error("Table name must be a non-empty string");
    }

    const existing = entityStore.get(target);
    if (!existing) {
      entityStore.set(target, {
        tableName,
        columns: [],
        primaryKeys: [],
      });
      logger.debug({ target, tableName }, "Entity added successfully");
    } else {
      existing.tableName = tableName; // in case it was auto-created early
      logger.debug({ target, tableName }, "Entity table name updated");
    }
  },

  addColumn(target: Object, propertyKey: string, options: any = {}) {
    // Validate inputs
    if (!target || typeof target.constructor !== "function") {
      logger.error({ target }, "Invalid target constructor");
      throw new Error("Invalid target provided");
    }
    if (!propertyKey || typeof propertyKey !== "string") {
      logger.error({ propertyKey }, "Invalid property key provided");
      throw new Error("Property key must be a non-empty string");
    }

    const ctor = target.constructor;
    if (!entityStore.has(ctor)) {
      this.addEntity(ctor, ctor.name.toLowerCase()); // fallback auto-register
    }

    const entity = entityStore.get(ctor)!;
    entity.columns.push({ propertyKey, ...options });
    logger.debug({ target, propertyKey, options }, "Column added successfully");
  },

  addPrimaryKey(target: Object, propertyKey: string, options: any = {}) {
    // Validate inputs
    if (!target || typeof target.constructor !== "function") {
      logger.error({ target }, "Invalid target constructor");
      throw new Error("Invalid target provided");
    }
    if (!propertyKey || typeof propertyKey !== "string") {
      logger.error({ propertyKey }, "Invalid property key provided");
      throw new Error("Property key must be a non-empty string");
    }
    const ctor = target.constructor;
    if (!entityStore.has(ctor)) {
      this.addEntity(ctor, ctor.name.toLowerCase());
    }

    const entity = entityStore.get(ctor)!;
    entity.primaryKeys.push(propertyKey);

    this.addColumn(target, propertyKey, options);
    logger.debug(
      { target, propertyKey, options },
      "Primary key added successfully"
    );
  },

  getMetadata(target: Function): EntityMetadata | undefined {
    if (!entityStore.has(target)) {
      logger.error({ target }, "Metadata not found for the entity");
      throw new Error(`No metadata found for entity: ` + target.name);
    }
    return entityStore.get(target);
  },

  addRelation(target: Object, propertyKey: string, relation: RelationMetadata) {
    // Validate inputs
    if (!target || typeof target.constructor !== "function") {
      logger.error({ target }, "Invalid target constructor");
      throw new Error("Invalid target provided");
    }
    if (!propertyKey || typeof propertyKey !== "string") {
      logger.error({ propertyKey }, "Invalid property key provided");
      throw new Error("Property key must be a non-empty string");
    }
    if (!relation || typeof relation !== "object") {
      logger.error({ relation }, "Invalid relation metadata");
      throw new Error("Relation must be an object");
    }

    const entity = entityStore.get(target.constructor);
    if (!entity) {
      logger.error(
        { target: target.constructor.name },
        "Class is not marked with @Entity"
      );
      throw new Error(
        `Class ${target.constructor.name} is not marked with @Entity`
      );
    }

    if (!("relations" in entity)) {
      (entity as any).relations = [];
    }

    (entity as any).relations.push(relation);
    logger.debug(
      { target, propertyKey, relation },
      "Relation added successfully"
    );
  },
};

// import {Entity} from "@/decorators/entity/Entity.decorator";
// import {PrimaryKey} from "@/decorators/column/PrimaryKey.decorator";
// import {Column} from "@/decorators/column/Column.decorator";

// @Entity("users")
// class User {
//     @PrimaryKey({ type: "uuid" })
//     id: string;
//
//     @Column({ name: "user_name", type: "varchar" })
//     name: string;
//
//     @Column({ type: "int" })
//     age: number;
// }
//
// const userMetadata = MetadataStorage.getMetadata(User);
// console.log(JSON.stringify(userMetadata, null, 2));
