import { z } from 'zod';

// Phone number validation
export const phoneNumberSchema = z.string()
  .trim()
  .min(8, "Phone number must be at least 8 digits")
  .max(20, "Phone number must be less than 20 characters")
  .regex(/^\+?[0-9\s\-\(\)]+$/, "Phone number can only contain digits, spaces, +, -, (, )");

// Message content validation
export const messageContentSchema = z.string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(1600, "Message must be less than 1600 characters");

// Voice message validation
export const voiceMessageSchema = z.string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(5000, "Message must be less than 5000 characters");

// Name/Label validation
export const nameSchema = z.string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z0-9\s\-_À-ÿ]+$/, "Name can only contain letters, numbers, spaces, -, and _");

// Email validation
export const emailSchema = z.string()
  .trim()
  .email("Invalid email address")
  .max(255, "Email must be less than 255 characters");

// URL validation
export const urlSchema = z.string()
  .trim()
  .url("Invalid URL")
  .max(2048, "URL must be less than 2048 characters")
  .regex(/^https?:\/\//, "URL must start with http:// or https://");

// Provider validation
export const providerSchema = z.enum(['twilio', 'vonage'], {
  errorMap: () => ({ message: "Provider must be either 'twilio' or 'vonage'" })
});

// Language validation
export const languageSchema = z.string()
  .trim()
  .min(2, "Language code must be at least 2 characters")
  .max(10, "Language code must be less than 10 characters")
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid language code format");

// Voice label validation
export const voiceLabelSchema = z.string()
  .trim()
  .max(100, "Voice label must be less than 100 characters");

// SMS Send Schema
export const smsSendSchema = z.object({
  provider: providerSchema,
  from: phoneNumberSchema,
  to: phoneNumberSchema,
  message: messageContentSchema,
  credential_id: z.string().uuid("Invalid credential ID").optional(),
});

// Voice Call Send Schema
export const voiceCallSendSchema = z.object({
  provider: providerSchema,
  from: phoneNumberSchema,
  to: phoneNumberSchema,
  message: voiceMessageSchema,
  language: languageSchema,
  voice_label: voiceLabelSchema.optional(),
  style: z.number().int().min(0).max(10).optional(),
  premium: z.boolean().optional(),
  credential_id: z.string().uuid("Invalid credential ID").optional(),
});

// IVR Call Schema
export const ivrCallSchema = z.object({
  provider: providerSchema,
  from: phoneNumberSchema,
  to: phoneNumberSchema,
  language: languageSchema,
  voice_label: voiceLabelSchema.optional(),
  style: z.number().int().min(0).max(10).optional(),
  premium: z.boolean().optional(),
  credential_id: z.string().uuid("Invalid credential ID").optional(),
  ncco: z.array(z.record(z.any())).optional(),
  twiml: z.string().optional(),
});

// Contact Schema
export const contactSchema = z.object({
  name: nameSchema,
  phone_number: phoneNumberSchema,
  email: emailSchema.optional().or(z.literal('')),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  tags: z.array(z.string().max(50)).max(20, "Maximum 20 tags allowed").optional(),
});

// Group Schema
export const groupSchema = z.object({
  name: nameSchema,
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

// Phone Number Schema
export const phoneNumberCreateSchema = z.object({
  phone_number: phoneNumberSchema,
  provider: providerSchema,
  friendly_name: nameSchema.optional(),
  country_code: z.string().length(2, "Country code must be 2 characters").regex(/^[A-Z]{2}$/, "Country code must be uppercase"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  supports_sms: z.boolean().optional(),
  supports_voice: z.boolean().optional(),
  supports_mms: z.boolean().optional(),
});

// Credential Schema
export const credentialSchema = z.object({
  provider: providerSchema,
  credential_name: nameSchema,
  account_identifier: z.string().trim().min(1, "Account identifier cannot be empty").max(255),
  secret_key: z.string().trim().min(1, "Secret key cannot be empty").max(1000),
});

// Template Schema
export const templateSchema = z.object({
  name: nameSchema,
  type: z.enum(['sms', 'voice', 'ivr'], {
    errorMap: () => ({ message: "Type must be 'sms', 'voice', or 'ivr'" })
  }),
  content: z.string().trim().min(1, "Content cannot be empty").max(5000),
  category: z.string().max(50).optional(),
  voice_name: voiceLabelSchema.optional(),
  variables: z.array(z.string().max(50)).max(20).optional(),
});

// SIP User Schema
export const sipUserSchema = z.object({
  extension: z.string().trim().min(3).max(20).regex(/^[a-z0-9\-_]+$/, "Extension can only contain lowercase letters, numbers, -, and _"),
  display_name: nameSchema.optional(),
  sip_password: z.string().min(12, "Password must be at least 12 characters").max(100),
});

// SIP Route Schema
export const sipRouteSchema = z.object({
  name: nameSchema,
  route_type: z.enum(['inbound', 'outbound'], {
    errorMap: () => ({ message: "Route type must be 'inbound' or 'outbound'" })
  }),
  from_pattern: z.string().trim().min(1).max(100),
  to_pattern: z.string().trim().min(1).max(100),
  forward_to: z.string().trim().min(1).max(255),
  priority: z.number().int().min(0).max(100).optional(),
});

// Validate Phone Number Schema
export const validatePhoneSchema = z.object({
  phone_number: phoneNumberSchema,
  country_code: z.string().length(2).regex(/^[A-Z]{2}$/).optional(),
});

// Webhook validation
export const webhookUrlSchema = z.object({
  url: urlSchema,
  phone_number: phoneNumberSchema,
  provider: providerSchema,
});
