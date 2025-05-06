// import { BaseModel } from '../BaseModel'; // Adjust path if needed
//
// describe('BaseModel', () => {
//     let instance: BaseModel;
//
//     beforeEach(() => {
//         instance = new BaseModel();
//         jest.spyOn(console, 'log').mockImplementation(() => {});
//     });
//
//     afterEach(() => {
//         jest.restoreAllMocks();
//     });
//
//     describe('Instance methods', () => {
//         test('save() should log "Saving instance"', async () => {
//             await instance.save();
//             expect(console.log).toHaveBeenCalledWith('Saving instance');
//         });
//
//         test('delete() should log "Deleting instance"', async () => {
//             await instance.delete();
//             expect(console.log).toHaveBeenCalledWith('Deleting instance');
//         });
//
//         test('save() should handle errors', async () => {
//             jest.spyOn(instance, 'save').mockRejectedValue(new Error('Failed'));
//             await expect(instance.save()).rejects.toThrow('Failed');
//         });
//     });
//
//     describe('Static methods', () => {
//         test('find() should log "Finding all instances"', async () => {
//             await BaseModel.find();
//             expect(console.log).toHaveBeenCalledWith('Finding all instances');
//         });
//
//         test('findById() should log "Finding all instances"', async () => {
//             await BaseModel.findById();
//             expect(console.log).toHaveBeenCalledWith('Finding all instances');
//         });
//
//         test('select() should log "Finding all instances"', async () => {
//             await BaseModel.select();
//             expect(console.log).toHaveBeenCalledWith('Finding all instances');
//         });
//
//         test('update() should log "Finding all instances"', async () => {
//             await BaseModel.update();
//             expect(console.log).toHaveBeenCalledWith('Finding all instances');
//         });
//
//         test('delete() should log "Finding all instances"', async () => {
//             await BaseModel.delete();
//             expect(console.log).toHaveBeenCalledWith('Finding all instances');
//         });
//
//         test('insert() should log "Finding all instances"', async () => {
//             await BaseModel.insert();
//             expect(console.log).toHaveBeenCalledWith('Finding all instances');
//         });
//
//         test('find() should handle error', async () => {
//             jest.spyOn(BaseModel, 'find').mockRejectedValue(new Error('DB error'));
//             await expect(BaseModel.find()).rejects.toThrow('DB error');
//         });
//
//         test('delete() static should handle error', async () => {
//             jest.spyOn(BaseModel, 'delete').mockRejectedValue(new Error('Delete failed'));
//             await expect(BaseModel.delete()).rejects.toThrow('Delete failed');
//         });
//     });
// });
