import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentCustomer } from "@/lib/auth";
import { CustomerAddress } from "@/models/CustomerAddress";
import { UpdateProfileSchema } from "@/lib/validations/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

// GET /api/auth/me — returns current authenticated customer profile
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

    // Also fetch their default address or recent addresses
    const defaultAddress = customer.defaultAddressId
      ? await CustomerAddress.findById(customer.defaultAddressId).lean()
      : await CustomerAddress.findOne({ customerId: customer._id, isDefault: true }).lean();

    return successResponse({
      customer: {
        id: customer._id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        isVerified: customer.isVerified,
        defaultAddressId: customer.defaultAddressId,
        defaultAddress,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/auth/me — update customer profile (name, email)
export async function PATCH(req: NextRequest) {
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
    const validatedData = UpdateProfileSchema.parse(body);

    if (validatedData.name !== undefined) customer.name = validatedData.name;
    if (validatedData.email !== undefined) customer.email = validatedData.email || undefined;

    await customer.save();

    return successResponse({
      customer: {
        id: customer._id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        isVerified: customer.isVerified,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

