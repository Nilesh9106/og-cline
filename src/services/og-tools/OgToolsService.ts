import axios from "axios"
import { OPENGIG_API_URL } from "../../shared/api"
import { Project, User, UserStory } from "./types"

export class OgToolsService {
	private static readonly baseUrl = OPENGIG_API_URL

	static async fetchUserStories(projectName: string, accessToken: string) {
		try {
			const response = await axios.get<UserStory[]>(
				`${this.baseUrl}/integrations/user-stories/${encodeURIComponent(projectName)}`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				},
			)
			return response.data
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`Failed to fetch user stories: ${error.response?.data?.message || error.message}`)
			}
			throw error
		}
	}
	static async getProjectByName(projectName: string, accessToken: string) {
		try {
			const response = await axios.get<{ data: Project }>(
				`${this.baseUrl}/projects/name/${encodeURIComponent(projectName)}`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				},
			)
			return response.data.data
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`Failed to fetch project details: ${error.response?.data?.message || error.message}`)
			}
			throw error
		}
	}
	static async getAccessTokenFromCode(code: string, state: string) {
		try {
			const response = await axios.post<string>(`${this.baseUrl}/auth/token`, {
				code,
				state,
			})
			return response.data
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`Failed to get access token: ${error.response?.data?.message || error.message}`)
			}
			throw error
		}
	}
	static async getCurrentUser(accessToken: string) {
		try {
			const response = await axios.get(`${this.baseUrl}/auth/me`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			})
			if (!response.data?.data.user) {
				throw new Error("User data not found.")
			}
			return {
				email: response.data.data.user.email,
				displayName: response.data.data.user.first_name + " " + response.data.data.user.last_name,
				photoURL: response.data.data.user.avatar_url,
			} as User
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`Failed to fetch user: ${error.response?.data?.message || error.message}`)
			}
			throw error
		}
	}
	static async getProjects(accessToken: string) {
		try {
			const response = await axios.get(`${this.baseUrl}/projects`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			})
			return response.data.data
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`Failed to fetch projects: ${error.response?.data?.message || error.message}`)
			}
			throw error
		}
	}
}
