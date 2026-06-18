import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Laboratorio } from './entities/laboratorio.entity';
import { LaboratoriosService } from './laboratorios.service';
import {
  createMockRepository,
  MockRepository,
} from '../test-utils/mock-repository';

describe('LaboratoriosService', () => {
  let service: LaboratoriosService;
  let repository: MockRepository<Laboratorio>;

  const laboratorio: Laboratorio = {
    id: 'lab-1',
    nombre: 'Acme Labs',
    descripcion: 'Proveedor principal',
    rfc: 'ACM010101ABC',
    statusId: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoriosService,
        {
          provide: getRepositoryToken(Laboratorio),
          useValue: createMockRepository<Laboratorio>(),
        },
      ],
    }).compile();

    service = module.get(LaboratoriosService);
    repository = module.get(getRepositoryToken(Laboratorio));
  });

  it('creates a laboratorio when the name is available', async () => {
    repository.findOne?.mockResolvedValue(null);
    repository.create?.mockReturnValue(laboratorio);
    repository.save?.mockResolvedValue(laboratorio);

    await expect(
      service.create({ nombre: laboratorio.nombre, rfc: laboratorio.rfc }),
    ).resolves.toEqual(laboratorio);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { nombre: laboratorio.nombre },
    });
    expect(repository.save).toHaveBeenCalledWith(laboratorio);
  });

  it('rejects duplicate laboratorio names', async () => {
    repository.findOne?.mockResolvedValue(laboratorio);

    await expect(
      service.create({ nombre: laboratorio.nombre }),
    ).rejects.toThrow(ConflictException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('throws when a laboratorio does not exist', async () => {
    repository.findOne?.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates an existing laboratorio', async () => {
    repository.findOne?.mockResolvedValue({ ...laboratorio });
    repository.save?.mockImplementation((entity: Laboratorio) =>
      Promise.resolve(entity),
    );

    await expect(
      service.update(laboratorio.id, { descripcion: 'Nuevo texto' }),
    ).resolves.toMatchObject({
      id: laboratorio.id,
      descripcion: 'Nuevo texto',
    });
  });
});
