import { defineType, defineField, defineArrayMember } from "sanity";

export const sentimentAnalysis = defineType({
  title: "Sentiment Analysis",
  name: "sentimentAnalysis",
  type: "document",
  fields: [
    defineField({
      title: "User ID",
      name: "userId",
      type: "reference",
      to: [{ type: "users" }], // Reference to the 'users' schema
      description: "The user associated with this sentiment analysis.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Messages",
      name: "messages",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              title: "Role",
              name: "role",
              type: "string",
              options: {
                list: [
                  { title: "User", value: "user" },
                  { title: "Bot", value: "model" },
                ],
              },
            }),
            defineField({
              title: "Content",
              name: "content",
              type: "text",
            }),
          ],
        }),
      ],
      description: "The conversation messages analyzed.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Analysis",
      name: "analysis",
      type: "text",
      description: "The sentiment analysis result.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Timestamp",
      name: "timestamp",
      type: "datetime",
      description: "The timestamp of when the analysis was performed.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Tags",
      name: "tags",
      type: "array",
      description: "Tags associated with the sentiment analysis.",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
    }),
    defineField({
      title: "Emotional State",
      name: "emotionalState",
      type: "string",
      description: "The determined emotional state of the user.",
    }),
    defineField({
      title: "Key Topics",
      name: "keyTopics",
      type: "array",
      description: "Key topics discussed in the conversation.",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
    }),
    defineField({
      title: "Notable Patterns",
      name: "notablePatterns",
      type: "array",
      description: "Notable patterns observed in the conversation.",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
    }),
  ],
  initialValue: {
    timestamp: new Date().toISOString(),
  },
});
