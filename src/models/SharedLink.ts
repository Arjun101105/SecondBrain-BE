import mongoose, { Schema, Document } from 'mongoose';

export interface ISharedLink extends Document {
  hash: string;
  userId: mongoose.Types.ObjectId;
  permissions: 'view-only' | 'edit' | 'comment';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sharedLinkSchema = new Schema<ISharedLink>(
  {
    hash: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    permissions: {
      type: String,
      enum: ['view-only', 'edit', 'comment'],
      default: 'view-only',
    },
    expiresAt: Date,
  },
  { timestamps: true }
);

sharedLinkSchema.index({ hash: 1 });
sharedLinkSchema.index({ userId: 1 });

export const SharedLink = mongoose.models.SharedLink || mongoose.model<ISharedLink>('SharedLink', sharedLinkSchema);
