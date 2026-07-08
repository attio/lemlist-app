export const LEMLIST_API_BASE_URL = "https://api.lemlist.com/api"
const LEMLIST_APP_BASE_URL = "https://app.lemlist.com"

/**
 * Absolute URL builders for lemlist.
 *
 * - {@link endpoints.api} — REST API URLs under {@link LEMLIST_API_BASE_URL}.
 * - {@link endpoints.app} — deep links into the web app under {@link LEMLIST_APP_BASE_URL}.
 */
export const endpoints = {
    api: {
        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/contacts/upsert-contact
         */
        contacts: `${LEMLIST_API_BASE_URL}/contacts`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/contacts/get-contact
         */
        contact: (idOrEmail: string) => `${LEMLIST_API_BASE_URL}/contacts/${idOrEmail}`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/add-webhook
         */
        webhooks: `${LEMLIST_API_BASE_URL}/hooks`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/delete-webhook
         */
        webhook: (hookId: string) => `${LEMLIST_API_BASE_URL}/hooks/${hookId}`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/campaigns/get-many-campaigns
         */
        campaigns: `${LEMLIST_API_BASE_URL}/campaigns`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/leads/get-lead-by-email
         */
        leadByEmail: (email: string) => `${LEMLIST_API_BASE_URL}/leads/${email}`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/leads/create-lead-in-campaign
         */
        campaignLeads: (campaignId: string) =>
            `${LEMLIST_API_BASE_URL}/campaigns/${campaignId}/leads/`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/enrich/enrich-lead
         */
        enrichLead: (leadId: string) => `${LEMLIST_API_BASE_URL}/leads/${leadId}/enrich`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/enrich/enrich-data
         */
        enrich: `${LEMLIST_API_BASE_URL}/enrich`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/enrich/get-enrichment-result
         */
        enrichResult: (enrichId: string) => `${LEMLIST_API_BASE_URL}/enrich/${enrichId}`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/sequences/get-campaign-sequences
         */
        campaignSequences: (campaignId: string) =>
            `${LEMLIST_API_BASE_URL}/campaigns/${campaignId}/sequences`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/team/get-team
         */
        team: `${LEMLIST_API_BASE_URL}/team`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/users/get-user
         */
        user: (userId: string) => `${LEMLIST_API_BASE_URL}/users/${userId}`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/companies/get-many-companies
         */
        companies: `${LEMLIST_API_BASE_URL}/companies`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/tasks/create-task
         */
        tasks: `${LEMLIST_API_BASE_URL}/tasks`,

        /**
         * @see https://developer.lemlist.com/api-reference/endpoints/leads/pause-lead
         */
        pauseLead: (leadId: string) => `${LEMLIST_API_BASE_URL}/leads/pause/${leadId}`,
    },
    app: {
        /**
         * Verified route: resolves to the lemlist login/app shell (not a 404).
         */
        contact: (contactId: string) => `${LEMLIST_APP_BASE_URL}/contacts/${contactId}`,
    },
} as const
