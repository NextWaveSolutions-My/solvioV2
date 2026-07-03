/**
 * Service Bookings — Server Actions
 *
 * Lets support/admin staff schedule a technician visit for a ticket (e.g.
 * a washing machine cleaning request), confirm it, and manage its status.
 * Confirming a booking sends the customer a WhatsApp confirmation through
 * the same n8n/WAHA bridge used by actions/messages.ts.
 */

"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { requirePermissionOrThrow } from "@/lib/auth-utils";
import {
  createServiceBookingSchema,
  updateServiceBookingSchema,
} from "@/lib/validations";
import { findRequestById, getRequestPaths } from "@/lib/request-utils";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import type {
  ApiResponse,
  ServiceBooking,
  ServiceBookingFormData,
  Ticket,
} from "@/types";

const STAFF_PERMISSIONS = ["panel.admin.access", "panel.support.access"] as const;

async function requireStaff() {
  return requirePermissionOrThrow([...STAFF_PERMISSIONS], {
    any: true,
    message: "Forbidden: Admin or support access required",
  });
}

type SerializedServiceBooking = Omit<
  ServiceBooking,
  "_id" | "scheduledAt" | "createdAt" | "updatedAt" | "confirmedAt" | "completedAt" | "cancelledAt"
> & {
  _id: string;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
};

function serializeBooking(booking: ServiceBooking): SerializedServiceBooking {
  return {
    ...booking,
    _id: booking._id.toString(),
    scheduledAt: booking.scheduledAt.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    confirmedAt: booking.confirmedAt ? booking.confirmedAt.toISOString() : undefined,
    completedAt: booking.completedAt ? booking.completedAt.toISOString() : undefined,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : undefined,
  };
}

async function revalidateTicketPaths(ticketId: string) {
  try {
    const { kind, request } = await findRequestById(ticketId);
    if (kind) {
      const paths = getRequestPaths(
        ticketId,
        kind,
        kind === "service" ? (request as Ticket).serviceSlug : undefined
      );
      revalidatePath(paths.adminDetail);
      revalidatePath(paths.supportDetail);
    }
  } catch (error) {
    console.error("Failed to revalidate ticket paths for booking:", error);
  }
}

async function sendBookingConfirmationWhatsApp(booking: ServiceBooking) {
  const formattedDate = booking.scheduledAt.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const message =
    `Hi ${booking.customerName}, your ${booking.serviceType} booking is confirmed.\n\n` +
    `Date & time: ${formattedDate}\n` +
    `Address: ${booking.address}`;

  await sendWhatsAppMessage(booking.phone, message);
}

/**
 * Create a booking for a ticket
 */
export async function createServiceBooking(
  ticketId: string,
  data: ServiceBookingFormData
): Promise<ApiResponse<SerializedServiceBooking>> {
  try {
    const session = await requireStaff();
    const userId = session.user.id;

    const validated = createServiceBookingSchema.parse(data);

    const { request } = await findRequestById(ticketId);
    if (!request) {
      return { success: false, error: "Ticket not found" };
    }

    const now = new Date();
    const booking: Omit<ServiceBooking, "_id"> = {
      ticketId,
      customerName: validated.customerName,
      phone: validated.phone,
      address: validated.address,
      serviceType: validated.serviceType,
      scheduledAt: validated.scheduledAt,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };

    const collection = await getCollection<ServiceBooking>("service_bookings");
    const result = await collection.insertOne(booking as ServiceBooking);

    await revalidateTicketPaths(ticketId);

    return {
      success: true,
      data: serializeBooking({ ...booking, _id: result.insertedId }),
      message: "Booking scheduled",
    };
  } catch (error) {
    console.error("Error creating service booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create booking",
    };
  }
}

/**
 * Get all bookings for a ticket
 */
export async function getTicketBookings(
  ticketId: string
): Promise<ApiResponse<SerializedServiceBooking[]>> {
  try {
    await requireStaff();

    const collection = await getCollection<ServiceBooking>("service_bookings");
    const bookings = await collection
      .find({ ticketId })
      .sort({ scheduledAt: -1 })
      .toArray();

    return {
      success: true,
      data: bookings.map(serializeBooking),
    };
  } catch (error) {
    console.error("Error fetching service bookings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch bookings",
    };
  }
}

/**
 * Update / reschedule a booking. Cannot be used to change status — use the
 * dedicated confirm/complete/cancel actions for that.
 */
export async function updateServiceBooking(
  bookingId: string,
  data: Partial<ServiceBookingFormData>
): Promise<ApiResponse<SerializedServiceBooking>> {
  try {
    await requireStaff();

    if (!ObjectId.isValid(bookingId)) {
      return { success: false, error: "Invalid booking id" };
    }

    const validated = updateServiceBookingSchema.parse(data);
    if (Object.keys(validated).length === 0) {
      return { success: false, error: "No changes to update" };
    }

    const collection = await getCollection<ServiceBooking>("service_bookings");
    const existing = await collection.findOne({ _id: new ObjectId(bookingId) });
    if (!existing) {
      return { success: false, error: "Booking not found" };
    }
    if (existing.status === "completed" || existing.status === "cancelled") {
      return {
        success: false,
        error: `Cannot edit a ${existing.status} booking`,
      };
    }

    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      { $set: { ...validated, updatedAt: now } },
      { returnDocument: "after" }
    );

    if (!result) {
      return { success: false, error: "Failed to update booking" };
    }

    await revalidateTicketPaths(existing.ticketId);

    return {
      success: true,
      data: serializeBooking(result),
      message: "Booking updated",
    };
  } catch (error) {
    console.error("Error updating service booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update booking",
    };
  }
}

/**
 * Mark a booking confirmed and notify the customer over WhatsApp
 */
export async function confirmServiceBooking(
  bookingId: string
): Promise<ApiResponse<SerializedServiceBooking>> {
  try {
    await requireStaff();

    if (!ObjectId.isValid(bookingId)) {
      return { success: false, error: "Invalid booking id" };
    }

    const collection = await getCollection<ServiceBooking>("service_bookings");
    const existing = await collection.findOne({ _id: new ObjectId(bookingId) });
    if (!existing) {
      return { success: false, error: "Booking not found" };
    }
    if (existing.status !== "pending") {
      return {
        success: false,
        error: `Cannot confirm a ${existing.status} booking`,
      };
    }

    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      { $set: { status: "confirmed", confirmedAt: now, updatedAt: now } },
      { returnDocument: "after" }
    );

    if (!result) {
      return { success: false, error: "Failed to confirm booking" };
    }

    await revalidateTicketPaths(result.ticketId);

    try {
      await sendBookingConfirmationWhatsApp(result);
    } catch (whatsappError) {
      console.error("Failed to send booking confirmation WhatsApp message:", whatsappError);
      // Don't fail the whole operation if the WhatsApp bridge is unreachable
    }

    return {
      success: true,
      data: serializeBooking(result),
      message: "Booking confirmed",
    };
  } catch (error) {
    console.error("Error confirming service booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to confirm booking",
    };
  }
}

/**
 * Mark a booking completed (technician visited)
 */
export async function completeServiceBooking(
  bookingId: string
): Promise<ApiResponse<SerializedServiceBooking>> {
  try {
    await requireStaff();

    if (!ObjectId.isValid(bookingId)) {
      return { success: false, error: "Invalid booking id" };
    }

    const collection = await getCollection<ServiceBooking>("service_bookings");
    const existing = await collection.findOne({ _id: new ObjectId(bookingId) });
    if (!existing) {
      return { success: false, error: "Booking not found" };
    }
    if (existing.status !== "confirmed") {
      return {
        success: false,
        error: "Only confirmed bookings can be marked completed",
      };
    }

    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      { $set: { status: "completed", completedAt: now, updatedAt: now } },
      { returnDocument: "after" }
    );

    if (!result) {
      return { success: false, error: "Failed to update booking" };
    }

    await revalidateTicketPaths(result.ticketId);

    return {
      success: true,
      data: serializeBooking(result),
      message: "Booking marked completed",
    };
  } catch (error) {
    console.error("Error completing service booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update booking",
    };
  }
}

/**
 * Cancel a booking
 */
export async function cancelServiceBooking(
  bookingId: string
): Promise<ApiResponse<SerializedServiceBooking>> {
  try {
    await requireStaff();

    if (!ObjectId.isValid(bookingId)) {
      return { success: false, error: "Invalid booking id" };
    }

    const collection = await getCollection<ServiceBooking>("service_bookings");
    const existing = await collection.findOne({ _id: new ObjectId(bookingId) });
    if (!existing) {
      return { success: false, error: "Booking not found" };
    }
    if (existing.status === "completed" || existing.status === "cancelled") {
      return {
        success: false,
        error: `Cannot cancel a ${existing.status} booking`,
      };
    }

    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } },
      { returnDocument: "after" }
    );

    if (!result) {
      return { success: false, error: "Failed to cancel booking" };
    }

    await revalidateTicketPaths(result.ticketId);

    return {
      success: true,
      data: serializeBooking(result),
      message: "Booking cancelled",
    };
  } catch (error) {
    console.error("Error cancelling service booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel booking",
    };
  }
}
