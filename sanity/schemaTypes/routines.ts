// schemas/routines.ts
import { defineType, defineField, defineArrayMember } from "sanity";

export const routines = defineType({
  title: "User Routines",
  name: "routines",
  type: "document",
  fields: [
    // ... (user, routineDate, duration fields remain the same) ...
    defineField({
      title: "User",
      name: "user",
      type: "reference",
      to: [{ type: "users" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Routine Date",
      name: "routineDate",
      type: "date", // The START date of the routine
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Duration (Days)",
      name: "duration",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().positive().min(1),
    }),
    defineField({
      title: "Tasks",
      name: "tasks",
      type: "array",
      description:
        "The list of tasks for the routine, potentially spanning multiple days.",
      of: [
        defineArrayMember({
          type: "object",
          name: "taskItem",
          fields: [
            // --- NEW: Day Index Field ---
            defineField({
              name: "dayIndex",
              title: "Day Index",
              type: "number", // Day 1, Day 2, etc.
              description:
                "Which day within the routine duration this task belongs to (starting from 1).",
              validation: (Rule) => Rule.required().integer().positive().min(1),
            }),
            // --- End New Field ---
            defineField({
              title: "Task Description",
              name: "description",
              type: "string",
              validation: (Rule) => Rule.required().min(3),
            }),
            defineField({
              title: "Completed",
              name: "completed",
              type: "boolean",
              initialValue: false,
            }),
          ],
        }),
      ],
      validation: (Rule) =>
        Rule.required().min(1).error("At least one task is required."),
    }),
    // ... (insight, generatedAt fields remain the same) ...
    defineField({
      title: "AI Insight",
      name: "insight",
      type: "text",
    }),
    defineField({
      title: "Generated At",
      name: "generatedAt",
      type: "datetime",
      readOnly: true,
    }),
  ],
});
