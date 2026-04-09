import mongoose, { Schema, Document } from 'mongoose';

export interface ICollection extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  contentIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    contentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Content',
      },
    ],
  },
  { timestamps: true }
);

collectionSchema.index({ userId: 1 });

export const Collection = mongoose.models.Collection || mongoose.model<ICollection>('Collection', collectionSchema);
