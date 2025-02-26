"use server";
import { z } from "zod";
import { auth } from "@/auth";
import type { Topic } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { revalidatePath } from "next/cache";
import paths from "@/path";

const createTopicSchema = z.object({
  // zod schema for topic creation
  name: z
    .string()
    .min(3)
    .regex(/^[a-z-]+$/, {
      message: "Only lowercase letters and dashes are allowed",
    }),
  description: z.string().min(10),
});

interface CreateTopicFormState {
  errors: {
    name?: string[];
    description?: string[];
    _form?: string[];
  };
}

export async function createTopic(
  formState: CreateTopicFormState,
  formData: FormData
): Promise<CreateTopicFormState> {
  // function to create topic
  const result = createTopicSchema.safeParse({
    // validate form data
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  const sessions = await auth();
  if (!sessions || !sessions.user) {
    return {
      errors: {
        _form: ["You must be logged in to create a topic"],
      },
    };
  }

  let topic: Topic;

  try {
    topic = await db.topic.create({
      data: {
        slug: result.data.name,
        description: result.data.description,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return {
        errors: {
          _form: [err.message],
        },
      };
    } else {
      return {
        errors: {
          _form: ["Something went wrong"],
        },
      };
    }
  }

  redirect(paths.topicShow(topic.slug));

  revalidatePath("/");
}
