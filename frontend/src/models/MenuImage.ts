import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMenuImage extends Document {
  restaurantId: mongoose.Types.ObjectId;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  data: Buffer;
  createdAt: Date;
}

const MenuImageSchema = new Schema<IMenuImage>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      required: true,
    },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MenuImage: Model<IMenuImage> =
  mongoose.models.MenuImage || mongoose.model<IMenuImage>("MenuImage", MenuImageSchema);
