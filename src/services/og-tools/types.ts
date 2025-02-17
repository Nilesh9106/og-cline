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

export interface User {
	email?: string | null
	displayName?: string | null
	photoURL?: string | null
}
