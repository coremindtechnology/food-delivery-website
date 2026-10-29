import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentCustomer } from "@/lib/auth";
import { CustomerAddress } from "@/models/CustomerAddress";
import { CustomerAddressSchema } from "@/lib/validations/auth";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/customer/addresses/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsedId = ObjectIdSchema.safeParse(id);
    if (!parsedId.success) {
      return errorResponse("Invalid address ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const customer = await getCurrentCustomer();
    if (!customer) {
      return errorResponse("Not authenticated", 401);
    }

    const body = await req.json();
    const validatedData = CustomerAddressSchema.partial().parse(body);

    const address = await CustomerAddress.findOne({ _id: id, customerId: customer._id });
    if (!address) {
      return errorResponse("Address not found", 404);
    }

    if (validatedData.isDefault) {
      await CustomerAddress.updateMany(
        { customerId: customer._id },
        { $set: { isDefault: false } }
      );
      customer.defaultAddressId = address._id;
      await customer.save();
    }

    Object.assign(address, validatedData);
    await address.save();

    return successResponse(address);
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/customer/addresses/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsedId = ObjectIdSchema.safeParse(id);
    if (!parsedId.success) {
      return errorResponse("Invalid address ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const customer = await getCurrentCustomer();
    if (!customer) {
      return errorResponse("Not authenticated", 401);
    }

    const address = await CustomerAddress.findOneAndDelete({ _id: id, customerId: customer._id });
    if (!address) {
      return errorResponse("Address not found", 404);
    }

    // If deleted address was default, clear or pick another
    if (customer.defaultAddressId?.toString() === id) {
      const another = await CustomerAddress.findOne({ customerId: customer._id });
      if (another) {
        another.isDefault = true;
        await another.save();
        customer.defaultAddressId = another._id;
      } else {
        customer.defaultAddressId = undefined;
      }
      await customer.save();
    }

    return successResponse({ message: "Address deleted successfully", id });
  } catch (err) {
    return handleApiError(err);
  }
}

