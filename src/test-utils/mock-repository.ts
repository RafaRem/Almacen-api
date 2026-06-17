import { Repository } from 'typeorm';

export type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

export const createMockRepository = <
  T extends object = object,
>(): MockRepository<T> => ({
  create: jest.fn((entity: Partial<T>) => entity),
  createQueryBuilder: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  save: jest.fn((entity: T) => Promise.resolve(entity)),
});
