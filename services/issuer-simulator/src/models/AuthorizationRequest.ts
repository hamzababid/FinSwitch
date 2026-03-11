// ISO 8583 Authorization Request structure
export interface ISO8583AuthorizationRequest {
  // Primary Account Number (PAN) - Field 2
  cardNumber: string;
  
  // Processing Code - Field 3
  processingCode: string;
  
  // Transaction Amount - Field 4
  amount: number;
  
  // Transmission Date and Time - Field 7
  transmissionDateTime: string;
  
  // System Trace Audit Number - Field 11
  stan: string;
  
  // Local Transaction Time - Field 12
  localTime: string;
  
  // Local Transaction Date - Field 13
  localDate: string;
  
  // Card Expiration Date - Field 14
  expirationDate: string;
  
  // Merchant Type - Field 18
  merchantType: string;
  
  // Point of Service Entry Mode - Field 22
  posEntryMode: string;
  
  // Acquiring Institution ID - Field 32
  acquiringInstitutionId: string;
  
  // Retrieval Reference Number - Field 37
  retrievalReferenceNumber: string;
  
  // Card Acceptor Terminal ID - Field 41
  terminalId: string;
  
  // Card Acceptor ID - Field 42
  merchantId: string;
  
  // Currency Code - Field 49
  currency: string;
  
  // Additional Data - Field 48 (optional)
  additionalData?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
