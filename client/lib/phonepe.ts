import CryptoJS from "crypto-js";

interface PhonePeConfig {
  merchantId: string;
  saltKey: string;
  saltIndex: string;
  testMode: boolean;
}

interface PaymentRequest {
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number;
  redirectUrl: string;
  redirectMode: string;
  callbackUrl: string;
  mobileNumber?: string;
  paymentInstrument: {
    type: string;
    targetApp?: string;
  };
}

class PhonePeService {
  private config: PhonePeConfig | null = null;

  async loadConfig(): Promise<PhonePeConfig> {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch("/api/admin/settings/phonepe", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please login again.");
        } else if (response.status === 403) {
          throw new Error("Access denied. Admin privileges required.");
        }
        throw new Error(`Failed to load PhonePe config: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("PhonePe config response:", data);

      if (data.success && data.data.enabled) {
        // Validate required fields
        if (!data.data.merchantId || !data.data.saltKey || !data.data.saltIndex) {
          throw new Error("PhonePe configuration is incomplete. Please check merchantId, saltKey, and saltIndex in admin settings.");
        }

        this.config = data.data;
        console.log("PhonePe config loaded successfully:", {
          enabled: this.config.enabled,
          testMode: this.config.testMode,
          hasMerchantId: !!this.config.merchantId,
          hasSaltKey: !!this.config.saltKey
        });
        return this.config;
      } else {
        throw new Error("PhonePe is not enabled. Please enable it in admin settings.");
      }
    } catch (error) {
      console.error("Error loading PhonePe config:", error);
      throw error;
    }
  }

  generateTransactionId(): string {
    return `MT${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  generateChecksum(payload: string, endpoint: string): string {
    if (!this.config) {
      throw new Error("PhonePe config not loaded");
    }

    const data = payload + endpoint + this.config.saltKey;
    const hash = CryptoJS.SHA256(data).toString();
    return hash + "###" + this.config.saltIndex;
  }

  async initiatePayment(paymentData: {
    amount: number;
    packageId: string;
    propertyId?: string;
    userId: string;
    userPhone?: string;
  }): Promise<{
    success: boolean;
    data?: {
      instrumentResponse: {
        redirectInfo: {
          url: string;
          method: string;
        };
      };
    };
    error?: string;
  }> {
    try {
      if (!this.config) {
        await this.loadConfig();
      }

      if (!this.config) {
        throw new Error("PhonePe configuration not available. Please check admin settings.");
      }

      // Validate required config fields
      if (!this.config.merchantId || !this.config.saltKey || !this.config.saltIndex) {
        throw new Error("PhonePe configuration is incomplete. Please check merchantId, saltKey, and saltIndex in admin settings.");
      }

      const merchantTransactionId = this.generateTransactionId();
      const baseUrl = window.location.origin;

      const paymentRequest: PaymentRequest = {
        merchantTransactionId,
        merchantUserId: paymentData.userId,
        amount: paymentData.amount * 100, // Convert to paise
        redirectUrl: `${baseUrl}/payment-callback?packageId=${paymentData.packageId}&propertyId=${paymentData.propertyId || ""}&transactionId=${merchantTransactionId}`,
        redirectMode: "POST",
        callbackUrl: `${baseUrl}/api/payments/phonepe/callback`,
        mobileNumber: paymentData.userPhone,
        paymentInstrument: {
          type: "PAY_PAGE",
        },
      };

      // First, create transaction in our backend
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }

      console.log("🔄 Creating PhonePe transaction...");
      const createTxnResponse = await fetch("/api/payments/phonepe/transaction", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          packageId: paymentData.packageId,
          propertyId: paymentData.propertyId,
          paymentMethod: "phonepe",
          paymentDetails: {
            merchantTransactionId,
            amount: paymentData.amount
          }
        })
      });

      if (!createTxnResponse.ok) {
        const errorData = await createTxnResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create transaction: ${createTxnResponse.status}`);
      }

      const txnResult = await createTxnResponse.json();
      if (!txnResult.success) {
        throw new Error(txnResult.error || "Failed to create transaction");
      }

      console.log("✅ Transaction created successfully");

      // Convert to base64
      const payloadString = JSON.stringify(paymentRequest);
      const base64Payload = btoa(payloadString);

      // Generate checksum
      const endpoint = "/pg/v1/pay";
      const checksum = this.generateChecksum(base64Payload, endpoint);

      // API URL
      const apiUrl = this.config.testMode
        ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
        : "https://api.phonepe.com/apis/hermes";

      console.log("🔄 Initiating PhonePe payment...");

      // Make payment request to PhonePe
      const response = await fetch(`${apiUrl}/pg/v1/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": this.config.merchantId,
        },
        body: JSON.stringify({
          request: base64Payload,
        }),
      });

      console.log("PhonePe API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`PhonePe API error: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const responseData = await response.json();
      console.log("PhonePe API response:", responseData);

      if (responseData.success) {
        // Store transaction details locally
        localStorage.setItem(
          `phonepe_txn_${merchantTransactionId}`,
          JSON.stringify({
            packageId: paymentData.packageId,
            propertyId: paymentData.propertyId,
            amount: paymentData.amount,
            timestamp: Date.now(),
          }),
        );

        console.log("✅ PhonePe payment initiated successfully");
        return {
          success: true,
          data: responseData.data,
        };
      } else {
        const errorMsg = responseData.message || responseData.code || "Payment initiation failed";
        console.error("❌ PhonePe payment failed:", errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error: any) {
      console.error("❌ PhonePe payment error:", error);
      return {
        success: false,
        error: error.message || "Failed to initiate PhonePe payment",
      };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      if (!this.config) {
        await this.loadConfig();
      }

      if (!this.config) {
        throw new Error("PhonePe configuration not available");
      }

      const endpoint = `/pg/v1/status/${this.config.merchantId}/${transactionId}`;
      const checksum = this.generateChecksum("", endpoint);

      const apiUrl = this.config.testMode
        ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
        : "https://api.phonepe.com/apis/hermes";

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": this.config.merchantId,
        },
      });

      const responseData = await response.json();

      return {
        success: responseData.success,
        data: responseData.data,
        error: responseData.success ? undefined : responseData.message,
      };
    } catch (error: any) {
      console.error("PhonePe status check error:", error);
      return {
        success: false,
        error: error.message || "Failed to check payment status",
      };
    }
  }

  // For UPI deep linking (optional)
  generateUPILink(paymentData: {
    amount: number;
    transactionId: string;
    note: string;
  }): string {
    const { amount, transactionId, note } = paymentData;

    // This would need the merchant VPA from PhonePe
    const upiId = "merchant@phonepe"; // Replace with actual merchant UPI ID

    return `upi://pay?pa=${upiId}&pn=Ashish Property&am=${amount}&cu=INR&tn=${note}&tr=${transactionId}`;
  }
}

export const phonePeService = new PhonePeService();
export default PhonePeService;
