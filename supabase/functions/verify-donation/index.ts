import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const AMOY_RPC = "https://rpc-amoy.polygon.technology";

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(AMOY_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { donation_id } = await req.json();
    if (!donation_id || typeof donation_id !== "string") {
      return new Response(JSON.stringify({ error: "donation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: d, error: dErr } = await supabase
      .from("donations")
      .select("id, tx_hash, amount, donor_address, campaign_id, verified, campaigns!inner(wallet_address)")
      .eq("id", donation_id)
      .maybeSingle();
    if (dErr || !d) throw new Error("Donation not found");
    if (d.verified) return new Response(JSON.stringify({ verified: true, cached: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const tx = await rpc("eth_getTransactionByHash", [d.tx_hash]);
    const receipt = await rpc("eth_getTransactionReceipt", [d.tx_hash]);
    if (!tx || !receipt) {
      return new Response(JSON.stringify({ verified: false, reason: "tx_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (receipt.status !== "0x1") {
      return new Response(JSON.stringify({ verified: false, reason: "tx_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedTo = (d.campaigns as { wallet_address: string }).wallet_address.toLowerCase();
    const actualTo = (tx.to ?? "").toLowerCase();
    const actualFrom = (tx.from ?? "").toLowerCase();
    if (actualTo !== expectedTo) {
      return new Response(JSON.stringify({ verified: false, reason: "recipient_mismatch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (actualFrom !== d.donor_address.toLowerCase()) {
      return new Response(JSON.stringify({ verified: false, reason: "sender_mismatch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compare value: tx.value is hex wei. d.amount in MATIC. Convert to wei BigInt.
    const txWei = BigInt(tx.value);
    // d.amount may be like 0.01 → multiply by 1e18 carefully
    const amountStr = String(d.amount);
    const [whole, frac = ""] = amountStr.split(".");
    const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
    const expectedWei = BigInt(whole) * 10n ** 18n + BigInt(fracPadded || "0");
    if (txWei !== expectedWei) {
      return new Response(JSON.stringify({ verified: false, reason: "amount_mismatch", txWei: txWei.toString(), expectedWei: expectedWei.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("donations").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", d.id);

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});