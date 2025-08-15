// schemas/quote.ts
import { defineType, defineField } from "sanity";
import { CommentIcon } from "@sanity/icons"; // Optional icon

export const quote = defineType({
  name: "quote",
  title: "Motivational Quotes",
  type: "document",
  icon: CommentIcon, // Optional
  fields: [
    defineField({
      name: "quoteText",
      title: "Quote Text",
      type: "text", // Use 'text' for longer quotes
      description: "The main content of the quote.",
      validation: (Rule) => [
        Rule.required().error("Quote text cannot be empty."),
        Rule.max(500).warning("Quote seems long. Consider shortening?"),
      ],
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "string",
      description: "The person or source attributed to the quote (optional).",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "Optional category to help organize quotes.",
      options: {
        list: [
          // Example categories
          { title: "Motivation", value: "motivation" },
          { title: "Mindfulness", value: "mindfulness" },
          { title: "Well-being", value: "well-being" },
          { title: "Resilience", value: "resilience" },
          { title: "Positivity", value: "positivity" },
        ],
        layout: "radio", // Optional: display as radio buttons in Studio
      },
    }),
  ],
  preview: {
    select: {
      title: "quoteText",
      subtitle: "author",
    },
    prepare({ title, subtitle }) {
      // Show first part of quote as title, author as subtitle
      const displayTitle = title
        ? title.length > 80
          ? title.slice(0, 80) + "..."
          : title
        : "No text";
      return {
        title: displayTitle,
        subtitle: subtitle ? `— ${subtitle}` : "Unknown Author",
      };
    },
  },
});
