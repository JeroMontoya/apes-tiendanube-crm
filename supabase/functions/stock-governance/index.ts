// supabase/functions/stock-governance/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: {
    variant_id: number
    risk_level: string
    [key: string]: any
  }
  old_record: {
    variant_id: number
    risk_level: string
    [key: string]: any
  }
}

const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN') || '';

async function applyBudgetPacing(adsetId: string, originalBudget: number, currentBudget: number, riskLevel: string, supabase: any, variantId: number) {
    let newBudget = originalBudget;
    let action = 'MAINTAINED';

    if (riskLevel === 'CRITICAL' || riskLevel === 'OUT_OF_STOCK') {
        newBudget = originalBudget * 0.2; // Reducir 80%
        action = 'REDUCED_80%';
    } else if (riskLevel === 'WARNING') {
        newBudget = originalBudget * 0.7; // Reducir 30%
        action = 'REDUCED_30%';
    } else if (riskLevel === 'HEALTHY' && originalBudget !== currentBudget) {
        newBudget = originalBudget; // Restaurar presupuesto
        action = 'RESTORED';
    }

    if (action !== 'MAINTAINED' && newBudget !== currentBudget) {
        try {
            const response = await fetch(`https://graph.facebook.com/v20.0/${adsetId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    daily_budget: Math.round(newBudget)
                })
            });

            const result = await response.json();
            
            if (result.error) {
                console.error('Error from Meta API:', result.error);
                return;
            }

            // Registrar en la tabla de gobernanza
            await supabase.from('ad_budget_governance').insert({
                variant_id: variantId,
                adset_id: adsetId,
                original_daily_budget: originalBudget,
                current_daily_budget: newBudget,
                action_taken: action,
                reason: `Risk level changed to ${riskLevel}`,
                executed_at: new Date().toISOString()
            });
            
            console.log(`Action ${action} applied to AdSet ${adsetId} for variant ${variantId}`);
        } catch (error) {
            console.error('Failed to update Meta budget:', error);
        }
    }
}

serve(async (req) => {
    try {
        const payload: WebhookPayload = await req.json()
        
        // Solo procesamos actualizaciones donde el risk_level haya cambiado
        if (payload.type === 'UPDATE' && payload.record.risk_level !== payload.old_record?.risk_level) {
            
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const variantId = payload.record.variant_id;
            const newRiskLevel = payload.record.risk_level;

            const { data: governances } = await supabase
                .from('ad_budget_governance')
                .select('adset_id, original_daily_budget, current_daily_budget')
                .eq('variant_id', variantId)
                .order('executed_at', { ascending: false })
                .limit(1);

            if (governances && governances.length > 0) {
                const gov = governances[0];
                await applyBudgetPacing(
                    gov.adset_id, 
                    gov.original_daily_budget, 
                    gov.current_daily_budget, 
                    newRiskLevel, 
                    supabase, 
                    variantId
                );
            }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }
})
