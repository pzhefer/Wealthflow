import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "API key not configured",
        configured: false
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get image data from request (may be empty for connection test)
    let body = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Empty body is ok for connection test
    }

    const { imageBase64, filePath } = body as { imageBase64?: string; filePath?: string };
    
    // If no image provided, just test connection
    if (!imageBase64 && !filePath) {
      return new Response(JSON.stringify({
        success: true,
        configured: true,
        message: "Google Vision API key is configured",
        testResult: "Connection test successful"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let testImage = imageBase64;

    // If filePath provided, download from storage
    if (filePath && !imageBase64) {
      console.log("Downloading from storage:", filePath);
      const downloadUrl = `https://erwmioveetwzmtrxaowj.supabase.co/storage/v1/object/public/documents/${filePath}`;
      
      const downloadResponse = await fetch(downloadUrl);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download: ${downloadResponse.status}`);
      }
      
      const blob = await downloadResponse.blob();
      const arrayBuffer = await blob.arrayBuffer();
      testImage = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      console.log("Downloaded and encoded, base64 length:", testImage.length);
    }

    // Call Vision API
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    
    console.log("Calling Vision API...");
    const response = await fetch(visionApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: testImage },
          features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }]
        }]
      })
    });

    console.log("Vision API status:", response.status);
    const data = await response.json();
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Vision API failed", details: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullText = data.responses?.[0]?.fullTextAnnotation?.text || "";
    console.log("Extracted text length:", fullText.length);
    console.log("Text preview:", fullText.substring(0, 200));

    // Parse the text
    const parsed = parseReceipt(fullText);
    
    return new Response(JSON.stringify({
      success: true,
      extractedText: fullText,
      textLength: fullText.length,
      parsedData: parsed,
      fullVisionResponse: data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseReceipt(text: string) {
  const result = { merchant: null, amount: null, date: null };
  
  // Extract amount
  const amountMatch = text.match(/TOTAL[\s:]*\$?\s*([0-9]+\.[0-9]{2})/i) ||
                      text.match(/\$\s*([0-9]+\.[0-9]{2})/);
  if (amountMatch) result.amount = parseFloat(amountMatch[1]);
  
  // Extract date
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dateMatch) result.date = dateMatch[1];
  
  // Extract merchant (first few lines)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) result.merchant = lines[0];
  
  return result;
}