import axios from "axios"

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token")

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes("/auth/login")

        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem("access_token")
            window.location.assign("/login?expired=1")
        }

        return Promise.reject(error)
    },
)