import axios, { AxiosError } from 'axios'
import type { FieldErrors } from '../types'
import { demoAdapter } from './demoApi'

/** GitHub Pages build: no backend, the API is simulated in the browser. */
export const IS_DEMO = import.meta.env.VITE_DEMO === 'true'

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // send the Sanctum session cookie
  withXSRFToken: true, // echo XSRF-TOKEN cookie as X-XSRF-TOKEN header
  headers: { Accept: 'application/json' },
  ...(IS_DEMO ? { adapter: demoAdapter } : {}),
})

/** Sanctum needs this once before the first state-changing request (login). */
export const fetchCsrfCookie = () => (IS_DEMO ? Promise.resolve() : axios.get('/sanctum/csrf-cookie', { withCredentials: true }))

export function apiStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined
}

export function apiFieldErrors(err: unknown): FieldErrors {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<{ errors?: FieldErrors }>).response?.data
    return data?.errors ?? {}
  }
  return {}
}

export function apiMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<{ message?: string }>).response?.data
    return data?.message ?? fallback
  }
  return fallback
}
