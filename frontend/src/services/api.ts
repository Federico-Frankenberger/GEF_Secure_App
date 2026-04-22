import axios from 'axios'
import type {
  Environment, EnvironmentRequest,
  Asset, AssetRequest,
  VulnerabilityAudit, VulnerabilityRequest, StatusUpdate,
  User, UserRequest,
  DashboardStats,
  SystemError,
} from '../types'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

// Interceptor: extrae el mensaje de error del backend
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error  ||
      err.message                ||
      'Error de red'
    return Promise.reject(new Error(msg))
  }
)

// ── Environments ──────────────────────────────────────────────────────────────
export const environmentApi = {
  getAll:  ()                                    => http.get<Environment[]>('/environments'),
  getById: (id: number)                          => http.get<Environment>(`/environments/${id}`),
  create:  (data: EnvironmentRequest)            => http.post<Environment>('/environments', data),
  update:  (id: number, data: EnvironmentRequest) => http.put<Environment>(`/environments/${id}`, data),
  delete:  (id: number)                          => http.delete(`/environments/${id}`),
}

// ── Assets ────────────────────────────────────────────────────────────────────
export const assetApi = {
  getAll:      (search = '')      => http.get<Asset[]>('/assets', { params: search ? { search } : {} }),
  getById:     (id: number)       => http.get<Asset>(`/assets/${id}`),
  create:      (data: AssetRequest)          => http.post<Asset>('/assets', data),
  update:      (id: number, data: AssetRequest) => http.put<Asset>(`/assets/${id}`, data),
  delete:      (id: number)       => http.delete(`/assets/${id}`),
  triggerScan: (id: number)       => http.post<Asset>(`/assets/${id}/scan`),
}

// ── Vulnerabilities ───────────────────────────────────────────────────────────
export const vulnApi = {
  getAll:       (status = '')     => http.get<VulnerabilityAudit[]>('/vulnerabilities', { params: status ? { status } : {} }),
  getById:      (id: number)      => http.get<VulnerabilityAudit>(`/vulnerabilities/${id}`),
  create:       (data: VulnerabilityRequest) => http.post<VulnerabilityAudit>('/vulnerabilities', data),
  updateStatus: (id: number, data: StatusUpdate) => http.patch<VulnerabilityAudit>(`/vulnerabilities/${id}/status`, data),
  delete:       (id: number)      => http.delete(`/vulnerabilities/${id}`),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const userApi = {
  getAll:  ()                          => http.get<User[]>('/users'),
  getById: (id: number)                => http.get<User>(`/users/${id}`),
  create:  (data: UserRequest)         => http.post<User>('/users', data),
  update:  (id: number, data: UserRequest) => http.put<User>(`/users/${id}`, data),
  delete:  (id: number)                => http.delete(`/users/${id}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => http.get<DashboardStats>('/dashboard/stats'),
}

// ── System Errors ─────────────────────────────────────────────────────────────
export const systemErrorApi = {
  getAll:  () => http.get<SystemError[]>('/system-errors'),
  delete:  (id: number) => http.delete(`/system-errors/${id}`),
}
