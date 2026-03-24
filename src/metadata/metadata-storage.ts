// metadata-storage.ts

import pino from "pino";
import {EntityMetadata} from "@/metadata/types/Entity.metadata.types";
import {RelationMetadata} from "@/metadata/types/Relation.metadata.types";

type EntityConstructor = new (...args: any[]) => any;

/**
 * Internal store for entity metadata.
 * Maps class constructors to their metadata definitions.
 */
const entityStore = new Map<EntityConstructor, EntityMetadata>();

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

/**
 * MetadataStorage is a singleton-like utility object
 * that collects and stores metadata about entities, columns,
 * primary keys, and relations.
 */
export const MetadataStorage = {
        /**
     * Registers a new entity with a given table name.
     * If the entity already exists, updates its table name.
     *
     * @param target - The entity's constructor function.
     * @param tableName - The database table name for this entity.
     */
    addEntity(target: EntityConstructor, tableName: string) {

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

     /**
     * Adds a column to the entity's metadata.
     * Automatically registers the entity if it hasn't been added.
     *
     * @param target - The prototype of the class the column belongs to.
     * @param propertyKey - The property name of the column.
     * @param options - Optional column settings like name and type.
     */
  addColumn(target: object, propertyKey: string, options: any = {}) {
    // Validate inputs
    if (!target || typeof target.constructor !== "function") {
      logger.error({ target }, "Invalid target constructor");
      throw new Error("Invalid target provided");
    }
    if (!propertyKey || typeof propertyKey !== "string") {
      logger.error({ propertyKey }, "Invalid property key provided");
      throw new Error("Property key must be a non-empty string");
    }

    const ctor = target.constructor as EntityConstructor;
    if (!entityStore.has(ctor)) {
      this.addEntity(ctor, ctor.name.toLowerCase()); // fallback auto-register
    }

    const entity = entityStore.get(ctor)!;
    entity.columns.push({ propertyKey, ...options });
    logger.debug({ target, propertyKey, options }, "Column added successfully");
  },

          /**
     * Marks a column as a primary key and adds it to the entity's metadata.
     * Also ensures the column is registered.
     *
     * @param target - The prototype of the class the key belongs to.
     * @param propertyKey - The property name acting as primary key.
     * @param _options - Optional column options.
     */
    addPrimaryKey(target: object, propertyKey: string, _options: any = {}) {
        const ctor = target.constructor as EntityConstructor;
        console.log('here')
        if (!entityStore.has(ctor)) {
            this.addEntity(ctor, ctor.name.toLowerCase());
        }

        const entity = entityStore.get(ctor)!;
        entity.primaryKeys.push(propertyKey);
    },


      /**
     * Returns the metadata for the given entity constructor.
     *
     * @param target - The constructor of the entity class.
     * @returns The entity metadata, or undefined.
     */
    getMetadata(target: EntityConstructor): EntityMetadata | undefined {
      if (!entityStore.has(target)) {
      logger.error({ target }, "Metadata not found for the entity");
      throw new Error(`No metadata found for entity: ` + target.name);
    }
        return entityStore.get(target);
    },

      /**
     * Adds relation metadata to the target entity.
     * Throws an error if the entity was not registered beforehand.
     *
     * @param target - The prototype of the class.
     * @param propertyKey - The property name that defines the relation.
     * @param relation - Metadata describing the relation.
     */
  addRelation(target: object, propertyKey: string, relation: RelationMetadata) {
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

    const entity = entityStore.get(target.constructor as EntityConstructor);
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
