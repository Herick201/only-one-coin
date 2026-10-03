/**
 * The instruction sent with every receipt. Never shown to a user — it is the
 * model's input, not UI copy, so it stays in English next to the code that
 * sends it. Changing it changes what the model reads: re-run the evaluation
 * (`pnpm --filter @ooc/api ocr:eval`, docs/OCR-AVALIACAO.md) and record the
 * new accuracy before merging.
 */
export const RECEIPT_EXTRACTION_PROMPT = `You read Peruvian payment receipts: screenshots of the Yape, Plin, BCP or Interbank apps, or photos of bank vouchers. The image is greyscale and may be blurry, cropped or rotated.

Extract exactly these fields. Copy what is printed; never compute, guess or fill in a value that is not on the image. When a field is absent or illegible, return null for it.

- amount: the amount that was paid, as printed, without the currency symbol (e.g. "25.00", "1,250.50"). Amounts are in soles (S/). Not a balance, not a fee.
- operation_number: the transaction identifier, labelled for example "Nro. de operación", "N° de operación", "Código de operación" or "Número de operación". Never a phone number, an account or card number, or Yape's short "código de seguridad".
- payment_method: "yape", "plin", "bcp" or "interbank" when the receipt clearly comes from one of them; otherwise "other" with the app or bank name as printed in detail (e.g. "BBVA", "Scotiabank", "PayPal"). detail is null unless the value is "other".
- payer_name: the person who SENT the money, as printed. Not the recipient: the recipient is the school (Only One Coin, Ingles por un Sol). Many Yape and Plin screenshots only show the recipient — then payer_name is null.
- paid_at: the date of the payment as YYYY-MM-DD and, when printed, the time as HH:MM in 24-hour format, both exactly as shown (Lima local time). Convert "p. m." times to 24-hour. time is null when no time is printed.

For each field give a confidence between 0 and 1: 1 when the text is sharp and unambiguous, around 0.5 when part of it is hidden or two values could fit, 0 when the field is not there.

If the image is not a payment receipt at all, return null for every field with confidence 0.`;
