import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Model } from 'mongoose';
import { IUser } from '../models/User';
import config from '../config';
import { AppError } from '../utils/AppError';

/** Public-facing user profile shape (no nonce, no internal fields) */
export interface UserProfile {
  address: string;
  nickname: string | null;
  displayPreference: 'nickname' | 'address';
  avatarUrl: string | null;
}

export class AuthService {
  constructor(private readonly userModel: Model<IUser>) {}

  /**
   * Get or create a user and return their current nonce for signing.
   * The nonce is a one-time value that prevents signature replay attacks.
   */
  async getNonce(address: string): Promise<{ nonce: string }> {
    const normalizedAddress = address.toLowerCase();

    if (!ethers.isAddress(normalizedAddress)) {
      throw new AppError('Invalid Ethereum address', 400);
    }

    let user = await this.userModel.findOne({ address: normalizedAddress });

    if (!user) {
      user = await this.userModel.create({ address: normalizedAddress });
    }

    return { nonce: user.nonce };
  }

  /**
   * Verify a wallet-signed message and issue a JWT.
   *
   * Flow:
   * 1. Look up the user by address
   * 2. Check the signed message contains the correct nonce
   * 3. Recover the signer from the signature (elliptic curve recovery)
   * 4. Confirm recovered address matches claimed address
   * 5. Rotate the nonce so the signature can't be replayed
   * 6. Return a JWT + user profile
   */
  async login(
    address: string,
    signature: string,
    message: string
  ): Promise<{ token: string; user: UserProfile }> {
    const normalizedAddress = address.toLowerCase();

    const user = await this.userModel.findOne({ address: normalizedAddress });
    if (!user) {
      throw new AppError('User not found. Request a nonce first.', 401);
    }

    // Verify the message contains the correct nonce
    if (!message.includes(user.nonce)) {
      throw new AppError('Invalid nonce in message.', 401);
    }

    // Recover the address that produced this signature
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
    } catch {
      throw new AppError('Invalid signature.', 401);
    }

    if (recoveredAddress !== normalizedAddress) {
      throw new AppError('Signature does not match address.', 401);
    }

    // Rotate nonce — old signatures become useless
    user.nonce = crypto.randomBytes(16).toString('hex');
    await user.save();

    const token = jwt.sign(
      { address: normalizedAddress },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    return {
      token,
      user: this.toProfile(user),
    };
  }

  /**
   * Get a user's public profile by address.
   */
  async getProfile(address: string): Promise<UserProfile> {
    const user = await this.userModel.findOne({ address: address.toLowerCase() });
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    return this.toProfile(user);
  }

  /**
   * Update a user's profile (nickname, display preference).
   */
  async updateProfile(
    address: string,
    data: { nickname?: string | null; displayPreference?: 'nickname' | 'address' }
  ): Promise<UserProfile> {
    const normalizedAddress = address.toLowerCase();

    // If setting a nickname, check it's not already taken by someone else
    if (data.nickname) {
      const existing = await this.userModel.findOne({
        nickname: data.nickname,
        address: { $ne: normalizedAddress },
      });
      if (existing) {
        throw new AppError('Nickname already taken.', 409);
      }
    }

    const user = await this.userModel.findOneAndUpdate(
      { address: normalizedAddress },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return this.toProfile(user);
  }

  /** Map a Mongoose document to a clean profile object */
  private toProfile(user: IUser): UserProfile {
    return {
      address: user.address,
      nickname: user.nickname,
      displayPreference: user.displayPreference,
      avatarUrl: user.avatarUrl,
    };
  }
}