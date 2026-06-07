/**
 * DeviceLookupService
 *
 * Validates IMEI numbers and looks up device information.
 * Currently runs in stub mode — wire in a real provider by implementing
 * lookupViaApi() below and returning it when an API key is present.
 *
 * To add a real provider later:
 *   1. Save the API key via Settings → api.settings.update({ imei_lookup_api_key: '...' })
 *   2. Implement lookupViaApi(imei, apiKey, signal) that calls your chosen IMEI lookup service
 *   3. Uncomment the apiKey block in lookupImei()
 */

export interface DeviceLookupResult {
  brand?: string
  model?: string
  storage?: string
  color?: string
  serial_number?: string
  region?: string
  activation_status?: string
  found: boolean
  source: 'stub' | 'api'
  error?: 'timeout' | 'no_data' | 'api_error' | 'invalid_imei'
  errorMessage?: string
}

// ---------------------------------------------------------------------------
// Luhn algorithm — industry standard for IMEI validation
// ---------------------------------------------------------------------------
export function luhnCheck(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false
  let sum = 0
  for (let i = 0; i < 15; i++) {
    let d = parseInt(imei[i])
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return sum % 10 === 0
}

export function validateImei(raw: string): { valid: boolean; error?: string } {
  const imei = raw.trim()
  if (!imei) return { valid: false, error: 'أدخل الـ IMEI' }
  if (/[^0-9]/.test(imei)) return { valid: false, error: 'IMEI يجب أن يحتوي على أرقام فقط' }
  if (imei.length < 15) return { valid: false, error: `IMEI ناقص — ${imei.length}/15 رقم` }
  if (imei.length > 15) return { valid: false, error: `IMEI طويل جدًا — ${imei.length} رقم` }
  if (!luhnCheck(imei)) return { valid: false, error: 'IMEI غير صحيح — فشل Luhn Check' }
  return { valid: true }
}

// ---------------------------------------------------------------------------
// Stub — returns brand only until a real provider is wired in
// ---------------------------------------------------------------------------
async function stubLookup(_imei: string, signal?: AbortSignal): Promise<DeviceLookupResult> {
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, 600)
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('AbortError', 'AbortError')) })
  })
  return { found: false, source: 'stub', brand: 'Apple' }
}

// ---------------------------------------------------------------------------
// Future real-API hook (uncomment and implement when ready)
// ---------------------------------------------------------------------------
// async function lookupViaApi(
//   imei: string,
//   apiKey: string,
//   signal?: AbortSignal,
// ): Promise<DeviceLookupResult> {
//   const res = await fetch(`https://your-provider.com/check?imei=${imei}`, {
//     headers: { Authorization: `Bearer ${apiKey}` },
//     signal,
//   })
//   if (!res.ok) return { found: false, source: 'api', error: 'api_error' }
//   const data = await res.json()
//   return {
//     found: !!data.model,
//     source: 'api',
//     brand: data.brand ?? 'Apple',
//     model: data.model,
//     storage: data.storage,
//     color: data.color,
//     serial_number: data.serial,
//     region: data.region,
//     activation_status: data.status,
//   }
// }

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export async function lookupImei(
  imei: string,
  signal?: AbortSignal,
): Promise<DeviceLookupResult> {
  // const apiKey = '' // await api.settings.get('imei_lookup_api_key')
  // if (apiKey) return lookupViaApi(imei, apiKey, signal)
  return stubLookup(imei, signal)
}
