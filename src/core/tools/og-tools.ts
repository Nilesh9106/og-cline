import { OgToolsService } from "../../services/og-tools/OgToolsService"

export class OgTools {
	constructor(private readonly apiKey: string) {}

	async fetchUserStories(projectName: string) {
		try {
			const stories = await OgToolsService.fetchUserStories(projectName, this.apiKey)
			return {
				success: true,
				data: stories,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch user stories",
			}
		}
	}
}
