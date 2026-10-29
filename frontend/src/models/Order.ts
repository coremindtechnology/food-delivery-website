import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOrderItemSnapshot {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  image: string;
  isVeg: boolean;
  price: number;
  quantity: number;
  variant?: {
    id: string;
    name: string;
    price: number;
  };
  addons?: {
    id: string;
    name: string;
    price: number;
  }[];
  specialInstructions?: string;
  itemTotalPrice: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  restaurantSlug: "veg" | "non-veg";
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  items: IOrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  couponCode?: string;
  totalAmount: number;
  paymentMethod: "razorpay" | "cod";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus:
    | "placed"
    | "confirmed"
    | "preparing"
    | "ready_for_pickup"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  cancelledReason?: string;
  deliveryNotes?: string;
  placedAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSnapshotSchema = new Schema<IOrderItemSnapshot>({
  menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  isVeg: { type: Boolean, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  variant: {
    id: { type: String },
    name: { type: String },
    price: { type: Number },
  },
  addons: [
    {
      id: { type: String },
      name: { type: String },
      price: { type: Number },
    },
  ],
  specialInstructions: { type: String },
  itemTotalPrice: { type: Number, required: true, min: 0 },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    restaurantSlug: {
      type: String,
      required: true,
      enum: ["veg", "non-veg"],
      index: true,
    },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true, index: true },
    customerEmail: { type: String, trim: true, lowercase: true },
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: "State" },
      pincode: { type: String, required: true },
      landmark: { type: String },
    },
    items: [OrderItemSnapshotSchema],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 40, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod"],
      default: "razorpay",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
      index: true,
    },
    cancelledReason: { type: String },
    deliveryNotes: { type: String },
    placedAt: { type: Date, default: Date.now, index: true },
    deliveredAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

OrderSchema.index({ restaurantId: 1, orderStatus: 1, placedAt: -1 });
OrderSchema.index({ customerPhone: 1, placedAt: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

