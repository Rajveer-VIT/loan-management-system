import bcrypt from 'bcryptjs';
import { User, IUser } from '../../models/User.model.js';
import { ROLES } from '../../constants/roles.js';
import { AppError } from '../../utils/AppError.js';
import { signToken } from '../../utils/jwt.js';
import { SignupInput, LoginInput } from './auth.schema.js';

export class AuthService {
  static async registerBorrower(input: SignupInput) {
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    // Force role to BORROWER for public signups (prevents privilege escalation)
    const newUser = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: ROLES.BORROWER,
      isActive: true,
    });

    const token = signToken({
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    });

    return {
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
      token,
    };
  }

  static async login(input: LoginInput) {
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async getCurrentUser(userId: string) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
