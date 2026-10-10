import bcrypt from 'bcryptjs';
import { User, IUser } from '../../models/User.model.js';
import { ROLES } from '../../constants/roles.js';
import { AppError } from '../../utils/AppError.js';
import { signToken } from '../../utils/jwt.js';
import { SignupInput, LoginInput } from './auth.schema.js';

export const BCRYPT_ROUNDS = 10;

// Compared against when the email is unknown, so a failed login takes the same time
// whether or not the account exists (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

function toPublicUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function issueSession(user: IUser) {
  const token = signToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });
  return { user: toPublicUser(user), token };
}

export class AuthService {
  /** Public sign-up always creates a BORROWER; any `role` sent by the client is ignored. */
  static async registerBorrower(input: SignupInput) {
    if (await User.exists({ email: input.email })) {
      throw new AppError('An account with this email already exists', 409, undefined, 'DUPLICATE_EMAIL');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    // A concurrent sign-up with the same email hits the unique index → 409 via the error handler.
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: ROLES.BORROWER,
      isActive: true,
    });

    return issueSession(user);
  }

  static async login(input: LoginInput) {
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    const isMatch = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !isMatch || !user.isActive) {
      throw new AppError('Invalid email or password', 401, undefined, 'INVALID_CREDENTIALS');
    }

    return issueSession(user);
  }

  static async getCurrentUser(userId: string) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError('Account not found or inactive', 401, undefined, 'INVALID_TOKEN');
    }
    return toPublicUser(user);
  }
}
