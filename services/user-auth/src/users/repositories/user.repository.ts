import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma, User } from 'generated/prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUniqueByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  findUniqueById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findUniqueByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  countByIds(ids: string[]): Promise<number> {
    return this.prisma.user.count({
      where: { id: { in: ids } },
    });
  }

  findManyByIds(ids: string[]): Promise<Pick<User, 'id' | 'username' | 'email' | 'fullname'>[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true, email: true, fullname: true },
    });
  }

  create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
