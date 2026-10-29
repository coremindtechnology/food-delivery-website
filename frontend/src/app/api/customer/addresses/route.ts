import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentCustomer } from "@/lib/auth";
import { CustomerAddress } from "@/models/CustomerAddress";
import { CustomerAddressSchema } from "@/lib/validations/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

// GET /api/customer/addresses — list all addresses for the logged-in customer
export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const customer = await getCurrentCustomer();
    if (!customer) {
      return errorResponse("Not authenticated", 401);
    }

    const addresses = await CustomerAddress.find({ customerId: customer._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return successResponse(addresses);
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/customer/addresses — create a new address
export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const customer = await getCurrentCustomer();
    if (!customer) {
      return errorResponse("Not authenticated", 401);
    }

    const body = await req.json();
    const validatedData = CustomerAddressSchema.parse(body);

    // If marked as default or first address, unset previous defaults
    const addressCount = await CustomerAddress.countDocuments({ customerId: customer._id });
    const isFirstAddress = addressCount === 0;
    const shouldBeDefault = validatedData.isDefault || isFirstAddress;

    if (shouldBeDefault) {
      await CustomerAddress.updateMany(
        { customerId: customer._id },
        { $set: { isDefault: false } }
      );
    }

    const createdAddress = await CustomerAddress.create({
      customerId: customer._id,
      ...validatedData,
      isDefault: shouldBeDefault,
    });

    if (shouldBeDefault) {
      customer.defaultAddressId = createdAddress._id;
      await customer.save();
    }

    return successResponse(createdAddress, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

