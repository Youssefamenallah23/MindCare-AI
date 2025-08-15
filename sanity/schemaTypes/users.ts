import { defineType, defineField, defineArrayMember } from "sanity";

export const users = defineType({
  title: "Users",
  name: "users",
  type: "document",
  fields: [
    defineField({
      title: "Clerk ID",
      name: "clerkId",
      type: "string",
      description: "The unique ID from Clerk for this user.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Email",
      name: "email",
      type: "string",
      description: "The email address of the user.",
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      title: "Username",
      name: "username",
      type: "string",
      description: "The username of the user.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "First Name",
      name: "firstName",
      type: "string",
      description: "The first name of the user.",
    }),
    defineField({
      title: "Last Name",
      name: "lastName",
      type: "string",
      description: "The last name of the user.",
    }),
    defineField({
      title: "Role",
      name: "role",
      type: "string",
      description: "The role of the user (e.g., admin, user).",
      options: {
        list: [
          { title: "Admin", value: "admin" },
          { title: "User", value: "user" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Profile Image url",
      name: "profileImage",
      type: "url",
      description: "The profile image of the user.",
    }),
    defineField({
      title: "Created At",
      name: "createdAt",
      type: "datetime",
      description: "The date and time when the user was created.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      title: "Updated At",
      name: "updatedAt",
      type: "datetime",
      description: "The date and time when the user was last updated.",
    }),
    defineField({
      title: "Tags",
      name: "tags",
      type: "array",
      description: "Tags associated with the user.",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
    }),
  ],
  initialValue: {
    role: "user", // Default role
    createdAt: new Date().toISOString(), // Default creation date
  },
});
