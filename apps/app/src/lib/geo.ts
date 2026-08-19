/**
 * Country + Peruvian territory data for the address/phone fields.
 *
 * Only data lives here — no UI copy (CLAUDE.md §4). Country names are resolved
 * at render time with `Intl.DisplayNames` in the active locale, so a new
 * interface language needs no entry here. City and department names are proper
 * nouns: they read the same in the three languages, like `yape` or `bcp`.
 */

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string
  /** E.164 country calling code. */
  dial: string
}

/** Peru first, then the countries the students actually write in from. */
export const COUNTRIES: Country[] = [
  { code: 'PE', dial: '+51' },
  { code: 'AR', dial: '+54' },
  { code: 'BO', dial: '+591' },
  { code: 'BR', dial: '+55' },
  { code: 'CL', dial: '+56' },
  { code: 'CO', dial: '+57' },
  { code: 'EC', dial: '+593' },
  { code: 'MX', dial: '+52' },
  { code: 'PY', dial: '+595' },
  { code: 'UY', dial: '+598' },
  { code: 'VE', dial: '+58' },
  { code: 'US', dial: '+1' },
  { code: 'CA', dial: '+1' },
  { code: 'ES', dial: '+34' },
  { code: 'IT', dial: '+39' },
  { code: 'PT', dial: '+351' },
  { code: 'FR', dial: '+33' },
  { code: 'DE', dial: '+49' },
  { code: 'GB', dial: '+44' },
  { code: 'CN', dial: '+86' },
  { code: 'JP', dial: '+81' },
  { code: 'KR', dial: '+82' },
  { code: 'AU', dial: '+61' },
]

export const DEFAULT_COUNTRY = 'PE'

/** Regional-indicator pair, e.g. 'PE' → 🇵🇪. Falls back to the code on Windows. */
export function flagEmoji(code: string): string {
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1a5 + c.charCodeAt(0)),
  )
}

/** Localized country name — never a hardcoded string. */
export function countryName(code: string, locale: string): string {
  return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
}

export function dialOf(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.dial ?? ''
}

/**
 * Peru's departments and their main cities. Static public data — the form
 * cascades country → department → city without a round-trip.
 */
export const PERU_REGIONS: { region: string; cities: string[] }[] = [
  { region: 'Amazonas', cities: ['Chachapoyas', 'Bagua', 'Bagua Grande'] },
  { region: 'Áncash', cities: ['Huaraz', 'Chimbote', 'Casma', 'Huarmey'] },
  { region: 'Apurímac', cities: ['Abancay', 'Andahuaylas'] },
  { region: 'Arequipa', cities: ['Arequipa', 'Camaná', 'Mollendo'] },
  { region: 'Ayacucho', cities: ['Ayacucho', 'Huanta'] },
  { region: 'Cajamarca', cities: ['Cajamarca', 'Jaén', 'Chota', 'Cajabamba'] },
  { region: 'Callao', cities: ['Callao', 'Ventanilla'] },
  { region: 'Cusco', cities: ['Cusco', 'Sicuani', 'Quillabamba', 'Urubamba'] },
  { region: 'Huancavelica', cities: ['Huancavelica', 'Pampas'] },
  { region: 'Huánuco', cities: ['Huánuco', 'Tingo María'] },
  { region: 'Ica', cities: ['Ica', 'Chincha Alta', 'Pisco', 'Nasca'] },
  { region: 'Junín', cities: ['Huancayo', 'Jauja', 'Tarma', 'La Oroya', 'La Merced', 'Satipo'] },
  { region: 'La Libertad', cities: ['Trujillo', 'Chepén', 'Pacasmayo', 'Otuzco', 'Huamachuco'] },
  { region: 'Lambayeque', cities: ['Chiclayo', 'Lambayeque', 'Ferreñafe'] },
  { region: 'Lima', cities: ['Lima', 'Huacho', 'Barranca', 'Huaral', 'Cañete'] },
  { region: 'Loreto', cities: ['Iquitos', 'Yurimaguas', 'Nauta', 'Requena'] },
  { region: 'Madre de Dios', cities: ['Puerto Maldonado'] },
  { region: 'Moquegua', cities: ['Moquegua', 'Ilo'] },
  { region: 'Pasco', cities: ['Cerro de Pasco', 'Oxapampa'] },
  { region: 'Piura', cities: ['Piura', 'Sullana', 'Talara', 'Paita', 'Chulucanas', 'Sechura'] },
  { region: 'Puno', cities: ['Puno', 'Juliaca', 'Ilave', 'Ayaviri'] },
  { region: 'San Martín', cities: ['Moyobamba', 'Tarapoto', 'Juanjuí', 'Rioja'] },
  { region: 'Tacna', cities: ['Tacna'] },
  { region: 'Tumbes', cities: ['Tumbes', 'Zarumilla'] },
  { region: 'Ucayali', cities: ['Pucallpa', 'Atalaya'] },
]

export function citiesOf(region: string | null): string[] {
  return PERU_REGIONS.find((r) => r.region === region)?.cities ?? []
}

/** Split a stored E.164-ish phone into the country it belongs to and the rest. */
export function splitPhone(
  phone: string,
  fallback = DEFAULT_COUNTRY,
): { country: string; number: string } {
  const compact = phone.replace(/\s+/g, '')
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => compact.startsWith(c.dial))
  if (!match) return { country: fallback, number: phone.trim() }
  return { country: match.code, number: phone.trim().slice(match.dial.length).trim() }
}

/** Join back to the single string the domain stores. */
export function joinPhone(country: string, number: string): string {
  return `${dialOf(country)} ${number.trim()}`.trim()
}
