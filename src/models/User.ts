import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IUser extends Document {
  address: string;
  nickname: string | null;
  avatarUrl: string | null;
  displayPreference: 'nickname' | 'address';
  nonce: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    address: { type: String, required: true, unique: true, lowercase: true, trim: true },
    nickname: { type: String, default: null, maxlength: 20, trim: true, sparse: true, unique: true },
    avatarUrl: { type: String, default: null },
    displayPreference: { type: String, enum: ['nickname', 'address'], default: 'address' },
    nonce: { type: String, required: true, default: () => crypto.randomBytes(16).toString('hex') },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema, 'users');