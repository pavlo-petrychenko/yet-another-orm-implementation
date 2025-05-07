
import 'reflect-metadata';
import {Column} from "../Column.decorator";
import {MetadataStorage} from "../../../metadata/metadata-storage";
// import {Column} from "decorators/column/Column.decorator";
// import {MetadataStorage} from "metadata/metadata-storage";
// import { Column } from "@/decorators/column/Column.decorator";
// import { MetadataStorage } from "@/metadata/metadata-storage";

jest.mock('@/metadata/metadata-storage', () => ({
    MetadataStorage: {
        addColumn: jest.fn(),
    },
}));

describe('Column Decorator', () => {
    const target: any = {};
    const propertyKey = 'testProp';

    const runDecorator = (type: Function, options?: any) => {
        Reflect.defineMetadata('design:type', type, target, propertyKey);
        const decorator = Column(options);
        decorator(target, propertyKey);
    };

    afterEach(() => {
        jest.clearAllMocks();
        Reflect.deleteMetadata('design:type', target, propertyKey);
    });

    it('should infer type as varchar for string property', () => {
        runDecorator(String);
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ type: 'varchar', name: propertyKey })
        );
    });

    it('should infer type as int for number property', () => {
        runDecorator(Number);
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ type: 'int' })
        );
    });

    it('should infer type as boolean for boolean property', () => {
        runDecorator(Boolean);
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ type: 'boolean' })
        );
    });

    it('should infer type as timestamp for date property', () => {
        runDecorator(Date);
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ type: 'timestamp' })
        );
    });

    it('should default to json for unknown types', () => {
        class Custom {}
        runDecorator(Custom);
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ type: 'json' })
        );
    });

    it('should override inferred type with provided options.type', () => {
        runDecorator(String, { type: 'text' });
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ type: 'text' })
        );
    });

    it('should override default name with provided options.name', () => {
        runDecorator(Number, { name: 'customName' });
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ name: 'customName' })
        );
    });

    it('should pass through additional column options', () => {
        runDecorator(String, { nullable: true, unique: true });
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ nullable: true, unique: true })
        );
    });

    it('should handle unexpected property types gracefully', () => {
        runDecorator(undefined as any);
        expect(MetadataStorage.addColumn).toHaveBeenCalledWith(
            target,
            propertyKey,
            expect.objectContaining({ type: 'json' })
        );
    });
});
