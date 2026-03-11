import { ISO8583AuthorizationRequest, ValidationResult, ValidationError } from '../models/AuthorizationRequest';
import { logger } from '../utils/logger';

export class ISO8583Validator {
  private static readonly REQUIRED_FIELDS = [
    'cardNumber',
    'processingCode',
    'amount',
    'transmissionDateTime',
    'stan',
    'localTime',
    'localDate',
    'expirationDate',
    'merchantType',
    'posEntryMode',
    'acquiringInstitutionId',
    'retrievalReferenceNumber',
    'terminalId',
    'merchantId',
    'currency',
  ];

  public static validate(request: Partial<ISO8583AuthorizationRequest>): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!request[field as keyof ISO8583AuthorizationRequest]) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          code: '30',
        });
      }
    }

    // If required fields are missing, return early
    if (errors.length > 0) {
      logger.warn('ISO 8583 validation failed - missing required fields', { errors });
      return { isValid: false, errors };
    }

    // Validate card number (PAN)
    const cardNumberError = this.validateCardNumber(request.cardNumber!);
    if (cardNumberError) {
      errors.push(cardNumberError);
    }

    // Validate processing code
    const processingCodeError = this.validateProcessingCode(request.processingCode!);
    if (processingCodeError) {
      errors.push(processingCodeError);
    }

    // Validate amount
    const amountError = this.validateAmount(request.amount!);
    if (amountError) {
      errors.push(amountError);
    }

    // Validate STAN (System Trace Audit Number)
    const stanError = this.validateSTAN(request.stan!);
    if (stanError) {
      errors.push(stanError);
    }

    // Validate expiration date
    const expirationError = this.validateExpirationDate(request.expirationDate!);
    if (expirationError) {
      errors.push(expirationError);
    }

    // Validate currency code
    const currencyError = this.validateCurrency(request.currency!);
    if (currencyError) {
      errors.push(currencyError);
    }

    // Validate merchant type
    const merchantTypeError = this.validateMerchantType(request.merchantType!);
    if (merchantTypeError) {
      errors.push(merchantTypeError);
    }

    // Validate POS entry mode
    const posEntryModeError = this.validatePOSEntryMode(request.posEntryMode!);
    if (posEntryModeError) {
      errors.push(posEntryModeError);
    }

    const isValid = errors.length === 0;
    
    if (!isValid) {
      logger.warn('ISO 8583 validation failed', { 
        errors,
        cardNumber: this.maskCardNumber(request.cardNumber || ''),
      });
    }

    return { isValid, errors };
  }

  private static validateCardNumber(cardNumber: string): ValidationError | null {
    // Card number should be 13-19 digits
    if (!/^\d{13,19}$/.test(cardNumber)) {
      return {
        field: 'cardNumber',
        message: 'Card number must be 13-19 digits',
        code: '30',
      };
    }

    // Luhn algorithm check
    if (!this.luhnCheck(cardNumber)) {
      return {
        field: 'cardNumber',
        message: 'Invalid card number (Luhn check failed)',
        code: '30',
      };
    }

    return null;
  }

  private static luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  private static validateProcessingCode(processingCode: string): ValidationError | null {
    // Processing code should be 6 digits
    if (!/^\d{6}$/.test(processingCode)) {
      return {
        field: 'processingCode',
        message: 'Processing code must be 6 digits',
        code: '30',
      };
    }
    return null;
  }

  private static validateAmount(amount: number): ValidationError | null {
    if (typeof amount !== 'number' || amount < 0) {
      return {
        field: 'amount',
        message: 'Amount must be a positive number',
        code: '30',
      };
    }

    // Amount should not exceed reasonable limits (e.g., 1 billion)
    if (amount > 1000000000) {
      return {
        field: 'amount',
        message: 'Amount exceeds maximum allowed value',
        code: '30',
      };
    }

    return null;
  }

  private static validateSTAN(stan: string): ValidationError | null {
    // STAN should be 6 digits
    if (!/^\d{6}$/.test(stan)) {
      return {
        field: 'stan',
        message: 'STAN must be 6 digits',
        code: '30',
      };
    }
    return null;
  }

  private static validateExpirationDate(expirationDate: string): ValidationError | null {
    // Expiration date should be YYMM format
    if (!/^\d{4}$/.test(expirationDate)) {
      return {
        field: 'expirationDate',
        message: 'Expiration date must be in YYMM format',
        code: '30',
      };
    }

    const year = parseInt(expirationDate.substring(0, 2), 10);
    const month = parseInt(expirationDate.substring(2, 4), 10);

    if (month < 1 || month > 12) {
      return {
        field: 'expirationDate',
        message: 'Invalid month in expiration date',
        code: '30',
      };
    }

    // Check if card is expired (simplified check)
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return {
        field: 'expirationDate',
        message: 'Card has expired',
        code: '54',
      };
    }

    return null;
  }

  private static validateCurrency(currency: string): ValidationError | null {
    // Currency should be 3-digit ISO 4217 code
    if (!/^\d{3}$/.test(currency)) {
      return {
        field: 'currency',
        message: 'Currency must be a 3-digit ISO 4217 code',
        code: '30',
      };
    }
    return null;
  }

  private static validateMerchantType(merchantType: string): ValidationError | null {
    // Merchant type should be 4 digits
    if (!/^\d{4}$/.test(merchantType)) {
      return {
        field: 'merchantType',
        message: 'Merchant type must be 4 digits',
        code: '30',
      };
    }
    return null;
  }

  private static validatePOSEntryMode(posEntryMode: string): ValidationError | null {
    // POS entry mode should be 3 digits
    if (!/^\d{3}$/.test(posEntryMode)) {
      return {
        field: 'posEntryMode',
        message: 'POS entry mode must be 3 digits',
        code: '30',
      };
    }
    return null;
  }

  private static maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 10) {
      return '****';
    }
    const first6 = cardNumber.substring(0, 6);
    const last4 = cardNumber.substring(cardNumber.length - 4);
    return `${first6}****${last4}`;
  }
}
