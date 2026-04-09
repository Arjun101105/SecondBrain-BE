import mongoose, { Schema, Document } from 'mongoose';

export interface IContent extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'LINK' | 'DOCUMENT' | 'IMAGE' | 'VOICE_NOTE' | 'VIDEO_LINK' | 'SOCIAL_POST' | 'CODE_SNIPPET' | 'RICH_NOTE';
  title: string;
  description?: string;
  contentUrl: string;
  metadata?: {
    fileSize?: number;
    mimeType?: string;
    duration?: string;
    fileType?: string;
    cloudinaryId?: string;
  };
  tags: string[];
  collectionIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const contentSchema = new Schema<IContent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['LINK', 'DOCUMENT', 'IMAGE', 'VOICE_NOTE', 'VIDEO_LINK', 'SOCIAL_POST', 'CODE_SNIPPET', 'RICH_NOTE'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    contentUrl: {
      type: String,
      required: true,
    },
    metadata: {
      fileSize: Number,
      mimeType: String,
      duration: String,
      fileType: String,
      cloudinaryId: String,
    },
    tags: [String],
    collectionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Collection',
      },
    ],
  },
  { timestamps: true }
);

contentSchema.index({ userId: 1, createdAt: -1 });
contentSchema.index({ userId: 1, type: 1 });
contentSchema.index({ userId: 1, tags: 1 });

export const Content = mongoose.models.Content || mongoose.model<IContent>('Content', contentSchema);
