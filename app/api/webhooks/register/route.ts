import { Webhook } from "svix"
import { headers } from "next/headers"
import { WebhookEvent } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"


export async function POST(req: Request) {
    const webhook_secrect = process.env.WEBHOOK_SECRECT;

    if (!webhook_secrect) {
        throw new Error("please add webhook in env")
    }

    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id")
    const svix_timestamp = headerPayload.get("svix-timestamp")
    const svix_signature = headerPayload.get("svix-signature")

    if(!svix_id || !svix_timestamp || !svix_signature){
        return new Response("Error occurred - No Svix header");
    }
    
    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(webhook_secrect);

    let event: WebhookEvent;

    try {
        event = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp" : svix_timestamp,
            "svix-signature" : svix_signature
        }) as WebhookEvent; 
    } catch (error) {
        console.error("Error verifying webhook", error);
        return new Response("Error occurred", {status: 400});
    }

    const { id } = event.data
    const eventType = event.type

    // logs

    if(eventType === "user.created"){
        try {
            const {email_addresses, primary_email_address_id} = event.data
            console.log("email addresses",email_addresses, primary_email_address_id)

            
            //optional
            const primaryEmail = email_addresses.find(
                (email) => email.id === primary_email_address_id 
            )

            if(!primaryEmail){
                return new Response("NO Primary email found", {status: 400});
            }

            //create a user in neon(postgresql)

            const newUser = await prisma.user.create({
                data: {
                    id: event.data.id!,
                    email: primaryEmail.email_address,
                    isSubscribed: false
                }
            })
            console.log("New user created", newUser);
             
        } catch (error) {
            return new Response("Error creating user in database", {status: 400});
            
        }
    }

    return new Response("Webhook recived successfully", {status: 200});

}