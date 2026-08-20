import axios from 'axios'
import type {
  Environment, EnvironmentRequest,
  AssetType, AssetTypeRequest,
  Ecosystem, EcosystemRequest,
  Asset, AssetRequest,
  SoftwareComponent, SoftwareComponentRequest,
  VulnerabilityAudit, VulnerabilityRequest, StatusUpdate,
  User, UserRequest,
  UserAssetAssignment, UserAssetAssignmentRequest,
  DeletedAsset,
  DashboardStats,
  SystemError,
  ScanReport,
  ScanComparison,
  SoftwareCatalogEntry,
  LoginResponse,
  InventorySummary,
  PageResponse,
  GhsaAdvisory,
} from '../types'

export const TOKEN_KEY = 'gef_token'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

// Interceptor: agrega el JWT (si hay sesión) a cada request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor: extrae el mensaje de error del backend, y ante un 401 que NO sea
// el propio login (contraseña incorrecta es un 401 "normal", no una sesión
// vencida) limpia la sesión y manda a /login.
http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('gef_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    // Los endpoints de /reports piden responseType 'blob' -- ante un error, el
    // body de la respuesta llega como Blob (no JSON parseado), asi que hay que
    // leerlo a mano para no perder el mensaje real del backend (ej: "no se
    // encontraron activos afectados por...").
    if (err.response?.data instanceof Blob && err.response.data.type.includes('json')) {
      try {
        const parsed = JSON.parse(await err.response.data.text())
        return Promise.reject(new Error(parsed.message || parsed.error || 'Error de red'))
      } catch {
        // sigue al mensaje genérico de abajo
      }
    }
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error  ||
      err.message                ||
      'Error de red'
    return Promise.reject(new Error(msg))
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    http.post<LoginResponse>('/auth/login', { username, password }),
}

// ── Environments ──────────────────────────────────────────────────────────────
export const environmentApi = {
  getAll:  ()                                    => http.get<Environment[]>('/environments'),
  getById: (id: number)                          => http.get<Environment>(`/environments/${id}`),
  create:  (data: EnvironmentRequest)            => http.post<Environment>('/environments', data),
  update:  (id: number, data: EnvironmentRequest) => http.put<Environment>(`/environments/${id}`, data),
  delete:  (id: number)                          => http.delete(`/environments/${id}`),
}

// ── Catálogos administrables (Config) ────────────────────────────────────────
export const assetTypeApi = {
  getAll: ()                              => http.get<AssetType[]>('/asset-types'),
  create: (data: AssetTypeRequest)        => http.post<AssetType>('/asset-types', data),
  update: (id: number, data: AssetTypeRequest) => http.put<AssetType>(`/asset-types/${id}`, data),
  delete: (id: number)                    => http.delete(`/asset-types/${id}`),
}

export const ecosystemApi = {
  getAll: ()                              => http.get<Ecosystem[]>('/ecosystems'),
  create: (data: EcosystemRequest)        => http.post<Ecosystem>('/ecosystems', data),
  update: (id: number, data: EcosystemRequest) => http.put<Ecosystem>(`/ecosystems/${id}`, data),
  delete: (id: number)                    => http.delete(`/ecosystems/${id}`),
}

// ── Assets (activo real: servidor, aplicación, VM, contenedor) ────────────────
export const assetApi = {
  getAll:     (search = '')                    => http.get<Asset[]>('/assets', { params: search ? { search } : {} }),
  getById:    (id: number)                     => http.get<Asset>(`/assets/${id}`),
  create:     (data: AssetRequest)             => http.post<Asset>('/assets', data),
  update:     (id: number, data: AssetRequest) => http.put<Asset>(`/assets/${id}`, data),
  delete:     (id: number)                     => http.delete(`/assets/${id}`),
  getDeleted: ()                               => http.get<DeletedAsset[]>('/assets/deleted'),
  restore:    (id: number)                     => http.post<void>(`/assets/${id}/restore`),
  injectTestData: ()                           => http.post<void>('/assets/inject-test-data'),
  triggerScan: (id: number)                    => http.post<void>(`/assets/${id}/scan`),
}

// ── Inventario (SBOM CycloneDX, ej. Syft) ─────────────────────────────────────
// Content-Type: undefined fuerza a axios a recalcularlo el mismo para FormData
// (multipart/form-data; boundary=...) -- si no, pisa el default 'application/json'
// de la instancia y Spring rechaza el request con "not a multipart request".
const multipartHeaders = { headers: { 'Content-Type': undefined } }

export const inventoryApi = {
  preview: (assetId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<InventorySummary>(`/assets/${assetId}/inventory/preview`, form, multipartHeaders)
  },
  import: (assetId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<InventorySummary>(`/assets/${assetId}/inventory/import`, form, multipartHeaders)
  },
}

// ── Software Components (paquete instalado, antes "Asset") ────────────────────
export const softwareComponentApi = {
  getAll:      (search = '')      => http.get<SoftwareComponent[]>('/software-components', { params: search ? { search } : {} }),
  getById:     (id: number)       => http.get<SoftwareComponent>(`/software-components/${id}`),
  create:      (data: SoftwareComponentRequest)          => http.post<SoftwareComponent>('/software-components', data),
  update:      (id: number, data: SoftwareComponentRequest) => http.put<SoftwareComponent>(`/software-components/${id}`, data),
  delete:      (id: number)       => http.delete(`/software-components/${id}`),
  triggerScan: (id: number)       => http.post<SoftwareComponent>(`/software-components/${id}/scan`),
}

// ── Software Catalog ─────────────────────────────────────────────────────────
export const softwareCatalogApi = {
  search: (query: string) =>
    http.get<SoftwareCatalogEntry[]>('/software-catalog', { params: { search: query } }),
}

// ── Vulnerabilities ───────────────────────────────────────────────────────────
export const vulnApi = {
  getAll:       (status = '')     => http.get<VulnerabilityAudit[]>('/vulnerabilities', { params: status ? { status } : {} }),
  getById:      (id: number)      => http.get<VulnerabilityAudit>(`/vulnerabilities/${id}`),
  create:       (data: VulnerabilityRequest) => http.post<VulnerabilityAudit>('/vulnerabilities', data),
  updateStatus: (id: number, data: StatusUpdate) => http.patch<VulnerabilityAudit>(`/vulnerabilities/${id}/status`, data),
  delete:       (id: number)      => http.delete(`/vulnerabilities/${id}`),
  scanResult:   (params: { since: string; assetId?: number; environmentId?: number; hostAssetId?: number }) =>
    http.get<VulnerabilityAudit[]>('/vulnerabilities/scan-result', { params }),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const userApi = {
  getAll:  ()                          => http.get<User[]>('/users'),
  getById: (id: number)                => http.get<User>(`/users/${id}`),
  create:  (data: UserRequest)         => http.post<User>('/users', data),
  update:  (id: number, data: UserRequest) => http.put<User>(`/users/${id}`, data),
  delete:  (id: number)                => http.delete(`/users/${id}`),
}

// ── Asset Assignments (scope de ASSET_OWNER) ───────────────────────────────────
export const assetAssignmentApi = {
  getByAsset: (assetId: number) => http.get<UserAssetAssignment[]>(`/assets/${assetId}/assignments`),
  assign:     (assetId: number, data: UserAssetAssignmentRequest) => http.post<UserAssetAssignment>(`/assets/${assetId}/assignments`, data),
  unassign:   (assetId: number, userId: number) => http.delete(`/assets/${assetId}/assignments/${userId}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => http.get<DashboardStats>('/dashboard/stats'),
}

// ── Scan (activo / entorno / global) ─────────────────────────────────────────
export const scanApi = {
  triggerEnvironment: (id: number) => http.post<void>(`/environments/${id}/scan`),
  triggerGlobal:      ()           => http.post<void>('/scan'),
  latestReport: (targetType: string, targetName: string) =>
    http.get<ScanReport>('/scan-reports/latest', {
      params: { targetType, targetName },
      validateStatus: s => s === 200 || s === 204,
    }),
  history: (params: { targetType?: string; targetName?: string; publicCode?: string; from?: string; to?: string; page?: number; size?: number }) =>
    http.get<PageResponse<ScanReport>>('/scan-reports', { params }),
  reportVulnerabilities: (id: number) =>
    http.get<VulnerabilityAudit[]>(`/scan-reports/${id}/vulnerabilities`),
  compare: (idA: number, idB: number) =>
    http.get<ScanComparison>(`/scan-reports/${idA}/compare/${idB}`),
}

// ── System Errors ─────────────────────────────────────────────────────────────
export const systemErrorApi = {
  getAll:  (page = 0, size = 20) => http.get<PageResponse<SystemError>>('/system-errors', { params: { page, size } }),
  delete:  (id: number) => http.delete(`/system-errors/${id}`),
}

// ── GHSA Advisories (descripción real de una vulnerabilidad, cacheada) ───────
export const ghsaAdvisoryApi = {
  get: (ghsaId: string) => http.get<GhsaAdvisory>(`/ghsa-advisories/${encodeURIComponent(ghsaId)}`),
}

// ── Informes (exportación de PDFs) ────────────────────────────────────────────
export const reportApi = {
  scan:       (scanId: number)                    => http.get<Blob>(`/reports/scan/${scanId}`, { responseType: 'blob' }),
  comparison: (scanAId: number, scanBId: number)   => http.get<Blob>('/reports/comparison', { params: { scanAId, scanBId }, responseType: 'blob' }),
  executive:  ()                                   => http.get<Blob>('/reports/executive', { responseType: 'blob' }),
  cve:        (identifier: string)                 => http.get<Blob>(`/reports/cve/${encodeURIComponent(identifier)}`, { responseType: 'blob' }),
}
