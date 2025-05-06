// metadata-storage.ts


import {EntityMetadata} from "@/metadata/types/Entity.metadata.types";
import {RelationMetadata} from "@/metadata/types/Relation.metadata.types";

const entityStore = new Map<Function, EntityMetadata>();

export const MetadataStorage = {
    addEntity(target: Function, tableName: string) {
        const existing = entityStore.get(target);
        if (!existing) {
            entityStore.set(target, {
                tableName,
                columns: [],
                primaryKeys: []
            });
        } else {
            existing.tableName = tableName; // in case it was auto-created early
        }
    },

    addColumn(target: Object, propertyKey: string, options: any = {}) {
        const ctor = target.constructor;
        if (!entityStore.has(ctor)) {
            this.addEntity(ctor, ctor.name.toLowerCase()); // fallback auto-register
        }

        const entity = entityStore.get(ctor)!;
        entity.columns.push({ propertyKey, ...options });
    },

    addPrimaryKey(target: Object, propertyKey: string, options: any = {}) {
        const ctor = target.constructor;
        console.log('here')
        if (!entityStore.has(ctor)) {
            this.addEntity(ctor, ctor.name.toLowerCase());
        }

        const entity = entityStore.get(ctor)!;
        entity.primaryKeys.push(propertyKey);
        // this.addColumn(target, propertyKey, options);
    },

    getMetadata(target: Function): EntityMetadata | undefined {
        return entityStore.get(target);
    },

    addRelation(target: Object, propertyKey: string, relation: RelationMetadata) {
        const entity = entityStore.get(target.constructor);
        if (!entity) throw new Error(`Class ${target.constructor.name} is not marked with @Entity`);

        if (!("relations" in entity)) {
            (entity as any).relations = [];
        }

        (entity as any).relations.push(relation);

    }
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
