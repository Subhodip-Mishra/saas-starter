import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const webhook_secret = process.env.WEBHOOK_SECRET;

    if (!webhook_secret) {
        throw new Error("Please add WEBHOOK_SECRET in environment variables.");
    }

    const headerPayload = headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response("Error occurred - No Svix header", { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(webhook_secret);

    let event: WebhookEvent;

    try {
        event = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (error) {
        console.error("Error verifying webhook", error);
        return new Response("Error verifying webhook", { status: 400 });
    }

    const eventType = event.type;

    if (eventType === "user.created") {
        try {
            const { email_addresses, primary_email_address_id } = event.data;
            console.log("Email addresses:", email_addresses, "Primary Email ID:", primary_email_address_id);

            const primaryEmail = email_addresses.find(
                (email) => email.id === primary_email_address_id
            );

            if (!primaryEmail) {
                return new Response("No primary email found", { status: 400 });
            }

            const newUser = await prisma.user.create({
                data: {
                    id: event.data.id,
                    email: primaryEmail.email_address,
                    isSubscribed: false,
                },
            });

            console.log("New user created:", newUser);

        } catch (error) {
            console.error("Error creating user in database", error);
            return new Response("Error creating user in database", { status: 500 });
        }
    }

    return new Response("Webhook received successfully", { status: 200 });
}
