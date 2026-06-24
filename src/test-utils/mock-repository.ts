import { Repository } from 'typeorm';

type RepositoryKeys = Exclude<keyof Repository<any>, 'manager'>;

export type MockRepository<T extends object = object> = Partial<
  Record<RepositoryKeys, jest.Mock>
> & { manager: any };

export const createMockRepository = <
  T extends object = object,
>(): MockRepository<T> => {
  const managerQB = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
  };
  return {
    create: jest.fn((entity: Partial<T>) => entity),
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    save: jest.fn((entity: T) => Promise.resolve(entity)),
    manager: {
      ...managerQB,
      createQueryBuilder: jest.fn(() => ({ ...managerQB })),
    },
  };
};
