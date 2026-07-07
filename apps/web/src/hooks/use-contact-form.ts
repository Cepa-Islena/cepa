"use client";

import { useCallback, useState, type FormEvent } from "react";
import { sendContactMessage, type ContactMessageInput } from "@/lib/storefront-api";

export type ContactState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function parseTopic(value: FormDataEntryValue | null): ContactMessageInput["topic"] {
  if (value === "events" || value === "outside-metro" || value === "general") return value;
  return "general";
}

export function useContactForm() {
  const [contactState, setContactState] = useState<ContactState>({
    status: "idle",
    message: "For events, delivery questions, and pueblos outside the first route.",
  });

  const submitContact = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setContactState({ status: "loading", message: "Sending..." });

    try {
      await sendContactMessage({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        topic: parseTopic(formData.get("topic")),
        message: String(formData.get("message") ?? ""),
      });

      form.reset();
      setContactState({ status: "success", message: "Message received. We will follow up soon." });
    } catch (error) {
      setContactState({
        status: "error",
        message: error instanceof Error ? error.message : "Message could not be sent.",
      });
    }
  }, []);

  return { contactState, submitContact };
}
