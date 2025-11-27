import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReceiptData {
  merchant: string | null;
  amount: number | null;
  date: string | null;
  category: string | null;
  items: Array<{ name: string; price: number }>;
  confidence: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { imageBase64, filePath } = await req.json();

    if (!imageBase64 && !filePath) {
      throw new Error("Either imageBase64 or filePath is required");
    }

    let imageData = imageBase64;

    // If filePath provided, download from storage
    if (filePath && !imageBase64) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(filePath);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Convert blob to base64 (handle large files properly)
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Convert in chunks to avoid stack overflow on large files
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }

      imageData = btoa(binary);
    }

    // Perform OCR using Google Cloud Vision API
    const ocrText = await performBasicOCR(imageData);
    console.log("OCR extracted text length:", ocrText.length);

    if (ocrText.length === 0) {
      console.error("OCR returned empty text - Vision API likely failed");
      return new Response(
        JSON.stringify({
          success: false,
          error: "OCR extraction failed - no text detected. Please check Google Vision API configuration.",
          data: null,
          rawText: "",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("OCR text preview:", ocrText.substring(0, 200));

    const parsedData = parseReceiptText(ocrText);
    console.log("Parsed data:", JSON.stringify(parsedData));
    console.log("Fields found:", {
      hasMerchant: !!parsedData.merchant,
      hasAmount: !!parsedData.amount,
      hasDate: !!parsedData.date,
      confidence: parsedData.confidence
    });

    // OCR always succeeds even if some fields are missing
    // null values are acceptable - the receipt is saved with whatever data was found
    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        rawText: ocrText,
        fieldsDetected: {
          merchant: !!parsedData.merchant,
          amount: !!parsedData.amount,
          date: !!parsedData.date,
          category: !!parsedData.category,
        }
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("OCR processing error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process receipt",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

// Google Cloud Vision API OCR processing
async function performBasicOCR(imageBase64: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");

  if (!apiKey) {
    console.error("GOOGLE_VISION_API_KEY not found in environment");
    console.error("Available env vars:", Object.keys(Deno.env.toObject()).filter(k => k.includes('GOOGLE')));
    throw new Error("GOOGLE_VISION_API_KEY not configured");
  }

  console.log("Google Vision API key found, length:", apiKey.length);
  console.log("Image base64 length:", imageBase64.length);

  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requestBody = {
    requests: [{
      image: {
        content: imageBase64
      },
      features: [{
        type: "DOCUMENT_TEXT_DETECTION",
        maxResults: 1
      }]
    }]
  };

  console.log("Calling Vision API...");
  const response = await fetch(visionApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  console.log("Vision API response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vision API HTTP error:", response.status, errorText);
    throw new Error(`Vision API HTTP ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  console.log("Vision API response keys:", Object.keys(data));

  // Check for errors in response
  if (data.responses?.[0]?.error) {
    console.error("Vision API error in response:", JSON.stringify(data.responses[0].error));
    throw new Error(`Vision API error: ${data.responses[0].error.message || JSON.stringify(data.responses[0].error)}`);
  }

  // Extract full text annotation
  const fullText = data.responses?.[0]?.fullTextAnnotation?.text || "";

  console.log("OCR extracted text length:", fullText.length);

  return fullText;
}

// Parse receipt text to extract structured data
function parseReceiptText(text: string): ReceiptData {
  const result: ReceiptData = {
    merchant: null,
    amount: null,
    date: null,
    category: null,
    items: [],
    confidence: 0.5,
  };

  if (!text) return result;

  // Extract merchant name (usually first few lines)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Try to find merchant in first 5 lines
  const merchantPatterns = [
    /(WALMART|WAL-MART|WALMART SUPERCENTER)/i,
    /(TARGET|TARGET STORE)/i,
    /(COSTCO|COSTCO WHOLESALE)/i,
    /(AMAZON|AMAZON\.COM)/i,
    /(STARBUCKS|STARBUCKS COFFEE)/i,
    /(MCDONALDS|MCDONALD'S|MC DONALD'S)/i,
    /(BURGER KING)/i,
    /(SUBWAY|SUBWAY SANDWICHES)/i,
    /(WHOLE FOODS|WHOLE FOODS MARKET)/i,
    /(SAFEWAY|SAFEWAY STORE)/i,
    /(KROGER|KROGER STORE)/i,
    /(SHELL|SHELL OIL|SHELL GAS)/i,
    /(CHEVRON|CHEVRON GAS)/i,
    /(CVS|CVS PHARMACY)/i,
    /(WALGREENS|WALGREEN)/i,
    /^([A-Z][A-Z\s&']+)$/,
  ];

  // Check first 5 lines for merchant
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    for (const pattern of merchantPatterns) {
      const match = line.match(pattern);
      if (match) {
        result.merchant = match[1]?.trim() || match[0]?.trim();
        break;
      }
    }
    if (result.merchant) break;
  }

  // If no merchant found with patterns, use first line with 2+ capital words
  if (!result.merchant && lines.length > 0) {
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      // Check if line has at least 2 words and looks like a business name
      if (line.length > 2 && line.length < 50 && /[A-Z]/.test(line)) {
        result.merchant = line;
        break;
      }
    }
  }

  // Extract total amount - try multiple patterns
  const amountPatterns = [
    /TOTAL[\s:]*\$?\s*([0-9]+\.[0-9]{2})/i,
    /GRAND\s+TOTAL[\s:]*\$?\s*([0-9]+\.[0-9]{2})/i,
    /AMOUNT[\s:]*\$?\s*([0-9]+\.[0-9]{2})/i,
    /BALANCE[\s:]*\$?\s*([0-9]+\.[0-9]{2})/i,
    /TOTAL\s+DUE[\s:]*\$?\s*([0-9]+\.[0-9]{2})/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.amount = parseFloat(match[1]);
      break;
    }
  }

  // If no total found, try to find largest dollar amount (likely the total)
  if (!result.amount) {
    const allAmounts = text.match(/\$\s*([0-9]+\.[0-9]{2})/g) || [];
    if (allAmounts.length > 0) {
      const amounts = allAmounts.map(a => parseFloat(a.replace(/\$\s*/, '')));
      result.amount = Math.max(...amounts);
    }
  }

  // Extract date - try multiple formats
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{2}-\d{2}-\d{4})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.date = match[0];
      break;
    }
  }

  // Suggest category based on merchant
  if (result.merchant) {
    result.category = suggestCategory(result.merchant);
  }

  // Calculate confidence based on what we found
  let confidenceScore = 0;
  if (result.merchant) confidenceScore += 0.3;
  if (result.amount) confidenceScore += 0.4;
  if (result.date) confidenceScore += 0.2;
  if (result.category) confidenceScore += 0.1;

  result.confidence = Math.min(confidenceScore, 1.0);

  return result;
}

// Suggest category based on merchant name
function suggestCategory(merchant: string): string | null {
  const merchantLower = merchant.toLowerCase();

  const categoryMap: Record<string, string> = {
    walmart: "Shopping",
    target: "Shopping",
    costco: "Shopping",
    amazon: "Shopping",
    starbucks: "Dining",
    mcdonalds: "Dining",
    "burger king": "Dining",
    subway: "Dining",
    shell: "Transportation",
    chevron: "Transportation",
    exxon: "Transportation",
    "bp": "Transportation",
    netflix: "Entertainment",
    spotify: "Entertainment",
    hulu: "Entertainment",
    "whole foods": "Groceries",
    safeway: "Groceries",
    kroger: "Groceries",
    cvs: "Health",
    walgreens: "Health",
  };

  for (const [key, category] of Object.entries(categoryMap)) {
    if (merchantLower.includes(key)) {
      return category;
    }
  }

  return null;
}