import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from 'generated/prisma/client';
import { UserRepository } from './repositories/user.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  findOneByUsername(username: string): Promise<User | null> {
    return this.userRepository.findUniqueByUsername(username);
  }

  findOneById(id: string): Promise<User | null> {
    return this.userRepository.findUniqueById(id);
  }

  async validateUserIds(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return false;
    const count = await this.userRepository.countByIds(ids);
    return count === ids.length;
  }

  findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findUniqueByEmail(email);
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findUniqueById(userId);
    if (!user) return null;
    const { password: _, ...rest } = user;
    return rest;
  }

  async create(data: {
    username: string;
    email: string;
    fullname: string;
    password: string;
    position?: string;
  }): Promise<User> {
    return this.userRepository.create({
      username: data.username,
      email: data.email,
      fullname: data.fullname,
      password: data.password,
      ...(data.position !== undefined &&
        data.position !== '' && { position: data.position }),
    });
  }

  async updateProfile(
    userId: string,
    dto: {
      fullname?: string;
      position?: string;
      email?: string;
      newPassword?: string;
    },
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findUniqueById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findUniqueByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }
    const updateData: Parameters<UserRepository['update']>[1] = {};
    if (dto.fullname !== undefined) updateData.fullname = dto.fullname;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.newPassword !== undefined) {
      updateData.password = await bcrypt.hash(dto.newPassword, 10);
    }
    if (Object.keys(updateData).length === 0) {
      const { password: _, ...rest } = user;
      return rest;
    }
    const updated = await this.userRepository.update(userId, updateData);
    const { password: _, ...rest } = updated;
    return rest;
  }
}
