import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from './database.module';
import { PrismaService } from './prisma.service';

jest.mock('pg', () => ({ Pool: jest.fn().mockReturnValue({}) }));
jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: jest.fn().mockReturnValue({}) }));
jest.mock('@prisma/client', () => {
  class MockPrismaClient {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
    constructor(_opts?: unknown) {}
  }
  return { PrismaClient: MockPrismaClient };
});

describe('DatabaseModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should provide PrismaService', () => {
    const prisma = module.get<PrismaService>(PrismaService);
    expect(prisma).toBeDefined();
    expect(prisma).toBeInstanceOf(PrismaService);
  });

  it('should export PrismaService for use in other modules', () => {
    expect(() => module.get<PrismaService>(PrismaService)).not.toThrow();
  });
});
