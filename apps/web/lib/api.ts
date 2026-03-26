import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	body?: unknown
	headers?: Record<string, string>
}

const axiosClient: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
})

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
	const { method = 'GET', body, headers = {} } = options

	const cfg: AxiosRequestConfig = {
		url: endpoint,
		method,
		headers,
		data: body,
	}

	const res = await axiosClient.request<T>(cfg)
	return res.data
}

export const api = {
	get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
		request<T>(endpoint, { ...options, method: 'GET' }),
	post: <T>(
		endpoint: string,
		body?: unknown,
		options?: Omit<RequestOptions, 'method' | 'body'>
	) => request<T>(endpoint, { ...options, method: 'POST', body }),
	put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
		request<T>(endpoint, { ...options, method: 'PUT', body }),
	patch: <T>(
		endpoint: string,
		body?: unknown,
		options?: Omit<RequestOptions, 'method' | 'body'>
	) => request<T>(endpoint, { ...options, method: 'PATCH', body }),
	delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
		request<T>(endpoint, { ...options, method: 'DELETE' }),
}

export default api
