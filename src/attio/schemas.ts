import {z} from "zod"

const AttioRecordIdSchema = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string(),
})

const AttioPersonNameSchema = z.object({
    first_name: z.string(),
    last_name: z.string(),
    full_name: z.string(),
    attribute_type: z.literal("personal-name"),
})

const AttioEmailAddressSchema = z.object({
    email_address: z.string(),
    attribute_type: z.literal("email-address"),
})

const AttioTextValueSchema = z.object({
    value: z.string(),
    attribute_type: z.literal("text"),
})

const AttioPhoneNumberValueSchema = z.object({
    original_phone_number: z.string(),
    attribute_type: z.literal("phone-number"),
})

const AttioRecordReferenceValueSchema = z.object({
    target_object: z.string(),
    target_record_id: z.string(),
    attribute_type: z.literal("record-reference"),
})

const AttioDomainValueSchema = z.object({
    domain: z.string(),
    attribute_type: z.literal("domain"),
})

// Location components are flattened into a single string downstream, so we keep the value loose
// (passthrough) rather than enumerating every line/locality/region field.
const AttioLocationValueSchema = z
    .object({
        attribute_type: z.literal("location"),
    })
    .passthrough()

const AttioPersonSchema = z.object({
    id: AttioRecordIdSchema,
    created_at: z.string(),
    web_url: z.string(),
    values: z
        .object({
            name: z.array(AttioPersonNameSchema).optional(),
            email_addresses: z.array(AttioEmailAddressSchema).optional(),
            job_title: z.array(AttioTextValueSchema).optional(),
            linkedin: z.array(AttioTextValueSchema).optional(),
            avatar_url: z.array(AttioTextValueSchema).optional(),
            phone_numbers: z.array(AttioPhoneNumberValueSchema).optional(),
            company: z.array(AttioRecordReferenceValueSchema).optional(),
            description: z.array(AttioTextValueSchema).optional(),
            primary_location: z.array(AttioLocationValueSchema).optional(),
        })
        .passthrough(),
})

export const AttioGetPersonResponseSchema = z.object({
    data: AttioPersonSchema,
})

// The records query endpoint (POST .../records/query) returns an array of records.
export const AttioQueryPeopleResponseSchema = z.object({
    data: z.array(AttioPersonSchema),
})

export type AttioPerson = z.infer<typeof AttioPersonSchema>

// On the company object `name` is a text attribute, not a personal-name.
const AttioCompanySchema = z.object({
    // Needed to match companies back to the people that reference them when batch-fetching.
    id: AttioRecordIdSchema,
    values: z
        .object({
            name: z.array(AttioTextValueSchema).optional(),
            domains: z.array(AttioDomainValueSchema).optional(),
        })
        .passthrough(),
})

export const AttioGetCompanyResponseSchema = z.object({
    data: AttioCompanySchema,
})

export const AttioQueryCompaniesResponseSchema = z.object({
    data: z.array(AttioCompanySchema),
})

export type AttioCompany = z.infer<typeof AttioCompanySchema>
