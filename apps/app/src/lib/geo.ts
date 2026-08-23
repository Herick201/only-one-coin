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
  /**
   * How a mobile number is written in that country, as digit-group sizes:
   * `[2, 5, 4]` is Brazil's `11 91234 5678`, `[3, 3, 3]` is Peru's
   * `951 220 447`.
   *
   * Presentation only. It groups what somebody typed and draws the hint in the
   * empty field — it does not validate anything, and a number that does not fit
   * the shape is shown as typed rather than rejected. Numbering plans have
   * exceptions per region and per operator, and a form that argues with a
   * working phone number is worse than one that prints it slightly oddly.
   */
  groups: number[]
}

/** Peru first, then the countries the students actually write in from. */
export const COUNTRIES: Country[] = [
  { code: 'PE', dial: '+51', groups: [3, 3, 3] },
  { code: 'AR', dial: '+54', groups: [2, 4, 4] },
  { code: 'BO', dial: '+591', groups: [4, 4] },
  { code: 'BR', dial: '+55', groups: [2, 5, 4] },
  { code: 'CL', dial: '+56', groups: [1, 4, 4] },
  { code: 'CO', dial: '+57', groups: [3, 3, 4] },
  { code: 'EC', dial: '+593', groups: [2, 3, 4] },
  { code: 'MX', dial: '+52', groups: [2, 4, 4] },
  { code: 'PY', dial: '+595', groups: [3, 3, 3] },
  { code: 'UY', dial: '+598', groups: [2, 3, 3] },
  { code: 'VE', dial: '+58', groups: [3, 3, 4] },
  { code: 'US', dial: '+1', groups: [3, 3, 4] },
  { code: 'CA', dial: '+1', groups: [3, 3, 4] },
  { code: 'ES', dial: '+34', groups: [3, 3, 3] },
  { code: 'IT', dial: '+39', groups: [3, 3, 4] },
  { code: 'PT', dial: '+351', groups: [3, 3, 3] },
  { code: 'FR', dial: '+33', groups: [1, 2, 2, 2, 2] },
  { code: 'DE', dial: '+49', groups: [3, 4, 4] },
  { code: 'GB', dial: '+44', groups: [4, 3, 3] },
  { code: 'CN', dial: '+86', groups: [3, 4, 4] },
  { code: 'JP', dial: '+81', groups: [2, 4, 4] },
  { code: 'KR', dial: '+82', groups: [2, 4, 4] },
  { code: 'AU', dial: '+61', groups: [3, 3, 3] },
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

function groupsOf(code: string): number[] {
  return COUNTRIES.find((c) => c.code === code)?.groups ?? []
}

/**
 * The country's shape, drawn in zeros — `00 00000 0000` for Brazil. A hint, not
 * a mask: nothing stops a longer or shorter number being typed over it, and
 * switching the dial code redraws it, which is the whole point. Digits rather
 * than a written example, because an example number that looks real is one
 * somebody eventually dials.
 */
export function phoneHint(code: string): string {
  return groupsOf(code)
    .map((size) => '0'.repeat(size))
    .join(' ')
}

/**
 * Regroup a national number for the country it belongs to. Everything that is
 * not a digit is dropped first, so a number pasted in one country's punctuation
 * comes out in another's. Digits past the last group ride along at the end
 * rather than being cut — losing a digit is worse than an odd-looking break.
 */
export function formatNationalNumber(code: string, number: string): string {
  const digits = number.replace(/\D/g, '')
  if (digits === '') return ''

  const parts: string[] = []
  let at = 0
  for (const size of groupsOf(code)) {
    if (at >= digits.length) break
    parts.push(digits.slice(at, at + size))
    at += size
  }
  if (at < digits.length) parts.push(digits.slice(at))
  return parts.join(' ')
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
