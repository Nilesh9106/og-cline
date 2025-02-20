export interface UserStory {
	id: string
	title: string
	description: string
	acceptance_criteria: string[]
	status: string
	priority: string
	created_at: string
	updated_at: string
}

export type Project = {
	id: string
	title: string
	category: string
	modelType: string
	logoUrl?: string
	projectContext?: string
	monitoringUrls?: string[]
	docsContext?: {
		[integration: string]: string
	}
	designTheme?: any
	clientRequirements: string
	thirdPartyIntegrations: string[]
	authenticationPreferences: string[]
	databasePreference: string
	uniqueName: string
	sprintDuration: number
	status: string
	ownerId: string
	owner: {
		id: string
		email: string
		first_name: string
		last_name: string
		avatar_url: string
	}
	createdAt: string
	updatedAt: string
}

export interface User {
	email?: string | null
	displayName?: string | null
	photoURL?: string | null
}
